const db = require('../../../config/database');
const { redis } = require('../../../config/redis');
const mailerService = require('../../../services/mailer.service');
const auditService = require('../../audit/audit.service');
const authService = require('../auth.service');
const { hashToken } = require('../../../utils/crypto');
const { AUDIT_ACTIONS, REDIS_PREFIXES } = require('../../../config/constants');

jest.mock('../../../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../config/redis', () => ({
  redis: {
    set: jest.fn(),
    getdel: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../../../services/mailer.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'test-reset-id' }),
}));

jest.mock('../../audit/audit.service', () => ({
  log: jest.fn().mockResolvedValue({}),
}));

describe('Email Verification Flow (Part 2 - Redis Ephemeral Store)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    test('should throw 404 when user is not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.sendVerificationEmail('non-existent-id')).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });

    test('should throw 400 when user email is already verified', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'user-123', email: 'verified@aegis.iam', is_email_verified: true }],
      });

      await expect(authService.sendVerificationEmail('user-123')).rejects.toMatchObject({
        statusCode: 400,
        code: 'EMAIL_ALREADY_VERIFIED',
      });
    });

    test('should store hashed token in Redis with 24h TTL, call mailer service, and log audit', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            email: 'analyst@aegis.iam',
            first_name: 'Alex',
            last_name: 'Vance',
            is_email_verified: false,
          },
        ],
      }); // SELECT user

      redis.set.mockResolvedValueOnce('OK');

      const token = await authService.sendVerificationEmail('user-123', {
        ip: '127.0.0.1',
        userAgent: 'JestTestRunner',
      });

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      const expectedKey = `${REDIS_PREFIXES.EMAIL_VERIFICATION}${hashToken(token)}`;
      const expectedPayload = JSON.stringify({ userId: 'user-123', email: 'analyst@aegis.iam' });

      // Verify Redis storage with 24h TTL
      expect(redis.set).toHaveBeenCalledWith(expectedKey, expectedPayload, 'EX', 86400);

      // Verify Mailer call
      expect(mailerService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: 'analyst@aegis.iam',
          userName: 'Alex Vance',
          verificationUrl: expect.stringContaining(`/verify-email?token=${token}`),
        })
      );

      // Verify Audit call
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-123',
          actorEmail: 'analyst@aegis.iam',
          action: AUDIT_ACTIONS.EMAIL_VERIFICATION_REQUESTED,
        })
      );
    });
  });

  describe('verifyEmail', () => {
    test('should throw 400 if token is not found or expired in Redis', async () => {
      redis.getdel.mockResolvedValueOnce(null);

      await expect(authService.verifyEmail('invalid-token')).rejects.toMatchObject({
        statusCode: 400,
        code: 'AUTH_VERIFY_TOKEN_INVALID',
      });
    });

    test('should atomically consume token from Redis, update user is_email_verified in DB, and log audit', async () => {
      const payload = JSON.stringify({ userId: 'user-123', email: 'analyst@aegis.iam' });
      redis.getdel.mockResolvedValueOnce(payload);

      db.query
        .mockResolvedValueOnce({ rows: [] }) // UPDATE users SET is_email_verified = true
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-123',
              email: 'analyst@aegis.iam',
              is_email_verified: true,
            },
          ],
        }); // SELECT updated user

      const result = await authService.verifyEmail('valid-raw-token', {
        ip: '127.0.0.1',
        userAgent: 'JestTestRunner',
      });

      expect(result.user).toBeDefined();
      expect(result.user.is_email_verified).toBe(true);

      const expectedKey = `${REDIS_PREFIXES.EMAIL_VERIFICATION}${hashToken('valid-raw-token')}`;
      expect(redis.getdel).toHaveBeenCalledWith(expectedKey);

      // Verify Postgres update
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET is_email_verified = true WHERE id = $1',
        ['user-123']
      );

      // Verify Audit log
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-123',
          actorEmail: 'analyst@aegis.iam',
          action: AUDIT_ACTIONS.EMAIL_VERIFIED,
        })
      );
    });

    test('should fallback to GET + DEL if redis.getdel throws', async () => {
      const payload = JSON.stringify({ userId: 'user-123', email: 'analyst@aegis.iam' });
      redis.getdel.mockRejectedValueOnce(new Error('GETDEL not supported'));
      redis.get.mockResolvedValueOnce(payload);
      redis.del.mockResolvedValueOnce(1);

      db.query
        .mockResolvedValueOnce({ rows: [] }) // UPDATE users
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-123',
              email: 'analyst@aegis.iam',
              is_email_verified: true,
            },
          ],
        });

      const result = await authService.verifyEmail('fallback-token');
      expect(result.user.is_email_verified).toBe(true);
      expect(redis.get).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalled();
    });
  });
});
