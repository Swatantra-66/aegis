const db = require('../../../config/database');
const { redis } = require('../../../config/redis');
const mailerService = require('../../../services/mailer.service');
const auditService = require('../../audit/audit.service');
const queueService = require('../../../services/queue.service');
const tokenService = require('../../tokens/tokens.service');
const authService = require('../auth.service');
const { hashToken } = require('../../../utils/crypto');
const {
  AUDIT_ACTIONS,
  REDIS_PREFIXES,
  PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
} = require('../../../config/constants');

jest.mock('../../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../../../config/redis', () => ({
  redis: {
    set: jest.fn(),
    getdel: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
    zrangebyscore: jest.fn(),
    lpush: jest.fn(),
    rpop: jest.fn(),
    pipeline: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      lpush: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([['OK'], [1]]),
    })),
  },
}));

jest.mock('../../../services/mailer.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'test-reset-id' }),
}));

jest.mock('../../../services/queue.service', () => ({
  enqueue: jest.fn().mockResolvedValue('test-job-id'),
  registerWorker: jest.fn(),
  checkpoint: jest.fn().mockResolvedValue(),
}));

jest.mock('../../audit/audit.service', () => ({
  log: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../tokens/tokens.service', () => ({
  revokeAllUserTokens: jest.fn().mockResolvedValue(),
}));

describe('Password Reset Flow (Durable Queue, Fencing & Delivery Checkpoints)', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');
    mockClient = {
      query: jest.fn().mockResolvedValue({ rowCount: 1, rows: [] }),
      release: jest.fn(),
    };
    db.getClient.mockResolvedValue(mockClient);
  });

  describe('forgotPassword & processForgotPasswordJob (Durable Queue & Checkpoints)', () => {
    test('forgotPassword enqueues an idempotent durable job and returns null', async () => {
      const result = await authService.forgotPassword('target@aegis.iam', { ip: '127.0.0.1' });

      expect(result).toBeNull();
      expect(queueService.enqueue).toHaveBeenCalledWith('password-reset', {
        email: 'target@aegis.iam',
        reqMeta: { ip: '127.0.0.1' },
      });
    });

    test('processForgotPasswordJob gracefully completes without sending mail for unknown user', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await authService.processForgotPasswordJob('unknown@aegis.iam');

      expect(res).toEqual({ status: 'ignored', reason: 'user_not_found' });
      expect(redis.set).not.toHaveBeenCalled();
      expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    test('processForgotPasswordJob lets mail delivery errors throw for durable queue retry', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'usr-100',
            email: 'admin@aegis.iam',
            first_name: 'Security',
            last_name: 'Lead',
            password_hash: 'initial-hash-123',
          },
        ],
      });
      redis.get.mockResolvedValueOnce(null); // No delivery checkpoint
      redis.set.mockResolvedValueOnce('OK');
      mailerService.sendPasswordResetEmail.mockRejectedValueOnce(
        new Error('SMTP connection timed out')
      );

      await expect(
        authService.processForgotPasswordJob('admin@aegis.iam', {}, { id: 'job-3' })
      ).rejects.toThrow('SMTP connection timed out');

      expect(auditService.log).not.toHaveBeenCalled();
    });

    test('processForgotPasswordJob does not retry email delivery if audit logging fails', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'usr-100',
            email: 'admin@aegis.iam',
            first_name: 'Security',
            last_name: 'Lead',
            password_hash: 'initial-hash-123',
          },
        ],
      });
      mailerService.sendPasswordResetEmail.mockResolvedValueOnce({ messageId: 'msg-1' });
      auditService.log.mockRejectedValueOnce(new Error('Audit DB insert failure'));

      // Must complete successfully instead of throwing, so the queue does NOT re-send email
      const res = await authService.processForgotPasswordJob(
        'admin@aegis.iam',
        {},
        { id: 'job-999', claimToken: 'claim-tok-123' }
      );

      expect(res).toEqual({ status: 'delivered', userId: 'usr-100' });
      expect(mailerService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      // Verify delivery checkpoint was recorded strictly through queueService.checkpoint with claimToken
      expect(queueService.checkpoint).toHaveBeenCalledWith(
        'job-999',
        { emailDelivered: true },
        'claim-tok-123'
      );
    });

    test('processForgotPasswordJob skips email dispatch if delivery checkpoint already exists', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'usr-100',
            email: 'admin@aegis.iam',
            first_name: 'Security',
            last_name: 'Lead',
            password_hash: 'initial-hash-123',
          },
        ],
      });

      // Structured checkpoint with emailDelivered = true
      const res = await authService.processForgotPasswordJob(
        'admin@aegis.iam',
        {},
        { id: 'job-999', checkpoint: { emailDelivered: true } }
      );

      expect(res).toEqual({ status: 'delivered', userId: 'usr-100' });
      expect(mailerService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    test('processForgotPasswordJob does NOT skip email dispatch if checkpoint is bare empty object', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'usr-100',
            email: 'admin@aegis.iam',
            first_name: 'Security',
            last_name: 'Lead',
            password_hash: 'initial-hash-123',
          },
        ],
      });
      mailerService.sendPasswordResetEmail.mockResolvedValueOnce({ messageId: 'msg-first-try' });

      // Bare empty checkpoint created at enqueue time
      const res = await authService.processForgotPasswordJob(
        'admin@aegis.iam',
        {},
        { id: 'job-fresh', checkpoint: {} }
      );

      expect(res).toEqual({ status: 'delivered', userId: 'usr-100' });
      expect(mailerService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword (Ownership Verification, Concurrency Fencing & Finalization)', () => {
    test('should throw 400 when reset token does not exist or has expired', async () => {
      redis.eval.mockResolvedValueOnce(null); // ATOMIC_CLAIM_TOKEN_LUA

      await expect(
        authService.resetPassword('invalid-or-expired-token', 'NewSecureP@ss123!')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'AUTH_RESET_TOKEN_INVALID',
      });
    });

    test('should throw 400 when reset token is currently claimed by another request', async () => {
      redis.eval.mockResolvedValueOnce('CLAIMED'); // ATOMIC_CLAIM_TOKEN_LUA

      await expect(
        authService.resetPassword('racing-token', 'NewSecureP@ss123!')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'AUTH_RESET_IN_PROGRESS',
      });
    });

    test('should throw 400 when reset token payload lacks fencingToken', async () => {
      redis.eval
        .mockResolvedValueOnce(
          JSON.stringify({ userId: 'usr-100', email: 'user@aegis.iam' }) // No fencingToken!
        )
        .mockResolvedValueOnce(1); // Pre-commit ownership check passes

      await expect(
        authService.resetPassword('legacy-token', 'NewSecureP@ss123!')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'AUTH_RESET_TOKEN_INVALID',
      });
    });

    test('should throw 409 conflict and rollback if claim ownership is lost before commit', async () => {
      const rawToken = 'stale-claim-token-123';
      const tokenHash = hashToken(rawToken);
      const redisKey = `${REDIS_PREFIXES.PASSWORD_RESET}${tokenHash}`;

      // Claim succeeds
      redis.eval.mockResolvedValueOnce(
        JSON.stringify({ userId: 'usr-100', email: 'user@aegis.iam', fencingToken: 'hash1' })
      );
      // Pre-commit ownership check (ATOMIC_VERIFY_CLAIM_LUA) returns 0 (ownership lost!)
      redis.eval.mockResolvedValueOnce(0);

      await expect(authService.resetPassword(rawToken, 'NewSecureP@ss123!')).rejects.toMatchObject({
        statusCode: 409,
        code: 'AUTH_CLAIM_LOST',
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should throw 409 conflict if database fencing token has already changed', async () => {
      const rawToken = 'fencing-token-123';

      // Claim succeeds
      redis.eval.mockResolvedValueOnce(
        JSON.stringify({ userId: 'usr-100', email: 'user@aegis.iam', fencingToken: 'hash1' })
      );
      // Pre-commit ownership check passes
      redis.eval.mockResolvedValueOnce(1);

      // Database update returns 0 rows updated (fencing violation: password already changed!)
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0 }); // UPDATE users returns 0

      await expect(authService.resetPassword(rawToken, 'NewSecureP@ss123!')).rejects.toMatchObject({
        statusCode: 409,
        code: 'AUTH_PASSWORD_ALREADY_UPDATED',
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should conditionally release claim ownership on transient database error before commit', async () => {
      const rawToken = 'recoverable-token-12345';
      const tokenHash = hashToken(rawToken);
      const redisKey = `${REDIS_PREFIXES.PASSWORD_RESET}${tokenHash}`;
      const claimKey = `${redisKey}:claim`;

      redis.eval.mockResolvedValueOnce(
        JSON.stringify({ userId: 'usr-100', email: 'user@aegis.iam', fencingToken: 'hash1' })
      );
      redis.eval.mockResolvedValue(1);

      // Simulate database error during transaction
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Connection terminated unexpectedly'));

      await expect(authService.resetPassword(rawToken, 'NewSecureP@ss123!')).rejects.toThrow(
        'Connection terminated unexpectedly'
      );

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();

      // Verify conditional claim release (eval with ATOMIC_RELEASE_CLAIM_LUA and claimKey)
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('DEL'),
        1,
        claimKey,
        expect.any(String) // claimId
      );
    });

    test('should finalize and consume token when password update and token revocation succeed', async () => {
      const rawToken = 'success-token-12345';
      const tokenHash = hashToken(rawToken);
      const redisKey = `${REDIS_PREFIXES.PASSWORD_RESET}${tokenHash}`;
      const claimKey = `${redisKey}:claim`;

      redis.eval.mockResolvedValueOnce(
        JSON.stringify({ userId: 'usr-100', email: 'user@aegis.iam', fencingToken: 'hash1' })
      );
      redis.eval.mockResolvedValue(1);

      await authService.resetPassword(rawToken, 'NewSecureP@ss123!', {
        ip: '192.168.1.1',
        userAgent: 'BrowserClient',
      });

      // Verify transaction executed
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password_hash = $1'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked = true'),
        ['usr-100']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      // Verify ATOMIC_FINALIZE_TOKEN_LUA called with redisKey, claimKey, and claimId
      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining('DEL'),
        2,
        redisKey,
        claimKey,
        expect.any(String)
      );

      // Verify audit log
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'usr-100',
          action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
        })
      );
    });

    test('should succeed even if post-commit audit logging fails', async () => {
      const rawToken = 'audit-fail-token';
      redis.eval.mockResolvedValueOnce(
        JSON.stringify({ userId: 'usr-200', email: 'user2@aegis.iam', fencingToken: 'hash2' })
      );
      redis.eval.mockResolvedValue(1);
      auditService.log.mockRejectedValueOnce(new Error('Audit DB offline'));

      await expect(authService.resetPassword(rawToken, 'NewSecureP@ss123!')).resolves.not.toThrow();

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
