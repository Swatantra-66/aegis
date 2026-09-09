const db = require('../../../config/database');
const mailerService = require('../../../services/mailer.service');
const auditService = require('../../audit/audit.service');
const authService = require('../auth.service');
const { hashToken } = require('../../../utils/crypto');
const { AUDIT_ACTIONS } = require('../../../config/constants');

jest.mock('../../../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../services/mailer.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'test-reset-id' }),
}));

jest.mock('../../audit/audit.service', () => ({
  log: jest.fn().mockResolvedValue({}),
}));

describe('Email Verification Flow (Part 2)', () => {
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

    test('should store hashed token, call mailer service, and log audit', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'user-123',
              email: 'analyst@aegis.iam',
              first_name: 'Alex',
              last_name: 'Vance',
              is_email_verified: false,
            },
          ],
        }) // SELECT user
        .mockResolvedValueOnce({ rows: [] }); // INSERT refresh_tokens

      const token = await authService.sendVerificationEmail('user-123', {
        ip: '127.0.0.1',
        userAgent: 'JestTestRunner',
      });

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      // Verify DB insertion
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.arrayContaining([
          'user-123',
          hashToken(token),
          '11111111-1111-1111-1111-111111111111',
          expect.any(Date),
        ])
      );

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
    test('should throw 400 if token is not found or revoked', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.verifyEmail('invalid-token')).rejects.toMatchObject({
        statusCode: 400,
        code: 'AUTH_VERIFY_TOKEN_INVALID',
      });
    });

    test('should throw 400 if token is expired', async () => {
      const expiredDate = new Date(Date.now() - 3600000); // 1 hr ago
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'rt-1',
            user_id: 'user-123',
            expires_at: expiredDate,
            revoked: false,
          },
        ],
      });

      await expect(authService.verifyEmail('expired-token')).rejects.toMatchObject({
        statusCode: 400,
        code: 'AUTH_VERIFY_TOKEN_EXPIRED',
      });
    });

    test('should mark token revoked, update user is_email_verified to true, and log audit', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hr ahead
      db.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rt-valid',
              user_id: 'user-123',
              expires_at: futureDate,
              revoked: false,
            },
          ],
        }) // SELECT token
        .mockResolvedValueOnce({ rows: [] }) // UPDATE users SET is_email_verified = true
        .mockResolvedValueOnce({ rows: [] }) // UPDATE refresh_tokens SET revoked = true
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

      // Verify UPDATE queries
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET is_email_verified = true WHERE id = $1',
        ['user-123']
      );
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE refresh_tokens SET revoked = true WHERE id = $1',
        ['rt-valid']
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
  });
});
