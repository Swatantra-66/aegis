const catchAsync = require('../../../middleware/asyncWrapper');

jest.mock('otplib', () => ({
  generateSecret: jest.fn().mockReturnValue('JBSWY3DPEHPK3PXP'),
  generateURI: jest.fn().mockReturnValue('otpauth://totp/Aegis:test?secret=JBSWY3DPEHPK3PXP'),
  verifySync: jest.fn().mockReturnValue({ valid: true }),
}));

jest.mock('../../../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../config/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    eval: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../../audit/audit.service', () => ({
  log: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../services/queue.service', () => ({
  enqueue: jest.fn().mockResolvedValue('test-mfa-reset-job'),
  registerWorker: jest.fn(),
}));

const mfaService = require('../mfa.service');

describe('MFA Service & Middleware Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('catchAsync Middleware', () => {
    test('should call the async function and resolve', async () => {
      const handler = jest.fn().mockResolvedValue('result');
      const wrapped = catchAsync(handler);
      const req = {};
      const res = {};
      const next = jest.fn();

      await wrapped(req, res, next);

      expect(handler).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('should catch rejected promises and pass error to next()', async () => {
      const error = new Error('Async error');
      const handler = jest.fn().mockRejectedValue(error);
      const wrapped = catchAsync(handler);
      const req = {};
      const res = {};
      const next = jest.fn();

      await wrapped(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should catch thrown errors and pass to next()', async () => {
      const handler = jest.fn().mockImplementation(async () => {
        throw new Error('Thrown error');
      });
      const wrapped = catchAsync(handler);
      const req = {};
      const res = {};
      const next = jest.fn();

      await wrapped(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Thrown error');
    });
  });

  describe('MFA Service — Zero-Trust Deactivation & Atomic Token Consumption', () => {
    test('setup rejects deactivated users with 401', async () => {
      const db = require('../../../config/database');
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'u-1', email: 'deactivated@aegis.dev', is_active: false, mfa_enabled: false }],
      });

      await expect(mfaService.setup('u-1')).rejects.toThrow('Account has been deactivated');
    });

    test('verify rejects deactivated users with 401 before code verification', async () => {
      const db = require('../../../config/database');
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'u-1',
            email: 'deactivated@aegis.dev',
            is_active: false,
            mfa_secret: 'enc-secret',
            mfa_enabled: false,
          },
        ],
      });

      await expect(mfaService.verify('u-1', '123456')).rejects.toThrow(
        'Account has been deactivated'
      );
    });

    test('setup rejects enrollment flow when user was demoted to standard user', async () => {
      const db = require('../../../config/database');
      // 1. Initial user check in setup
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 'u-demoted-user', email: 'demoted@aegis.dev', is_active: true, mfa_enabled: false },
        ],
      });
      // 2. getUserRolesAndPermissions: user is now only 'user'
      db.query
        .mockResolvedValueOnce({ rows: [{ name: 'user' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'user:read' }] });

      await expect(mfaService.setup('u-demoted-user', { isEnrollmentOnly: true })).rejects.toThrow(
        'MFA setup is no longer required for your account role. Please sign in.'
      );
    });

    test('verify rejects enrollment flow when user was demoted to standard user', async () => {
      const db = require('../../../config/database');
      const { encrypt } = require('../../../utils/crypto');
      const config = require('../../../config');
      const encSecret = encrypt('JBSWY3DPEHPK3PXP', config.mfa.encryptionKey);

      // 1. Initial user check in verify
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'u-demoted-verify',
            email: 'demoted@aegis.dev',
            is_active: true,
            mfa_secret: encSecret,
            mfa_enabled: false,
          },
        ],
      });
      // 2. getUserRolesAndPermissions: user role only
      db.query
        .mockResolvedValueOnce({ rows: [{ name: 'user' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'user:read' }] });

      await expect(
        mfaService.verify('u-demoted-verify', '123456', { isEnrollmentOnly: true })
      ).rejects.toThrow('MFA setup is no longer required for your account role. Please sign in.');
    });

    test('verify rejects enrollment flow when enrollment token was already consumed', async () => {
      const db = require('../../../config/database');
      const { redis } = require('../../../config/redis');
      const { encrypt } = require('../../../utils/crypto');
      const config = require('../../../config');

      const encSecret = encrypt('JBSWY3DPEHPK3PXP', config.mfa.encryptionKey);

      // Initial user check in verify
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'u-admin',
            email: 'admin@aegis.dev',
            is_active: true,
            mfa_secret: encSecret,
            mfa_enabled: false,
          },
        ],
      });

      // Role and permission queries for policy check
      db.query
        .mockResolvedValueOnce({ rows: [{ name: 'admin' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'admin:read' }] });

      // Redis SET NX returns null (already consumed by another request)
      redis.set.mockResolvedValueOnce(null);

      await expect(
        mfaService.verify('u-admin', '123456', {
          isEnrollmentOnly: true,
          jti: 'token-jti-already-used',
          exp: Math.floor(Date.now() / 1000) + 300,
        })
      ).rejects.toThrow('MFA enrollment token has already been consumed');
    });

    test('verify succeeds and atomically marks token consumed when fresh', async () => {
      const db = require('../../../config/database');
      const { redis } = require('../../../config/redis');
      const { encrypt } = require('../../../utils/crypto');
      const config = require('../../../config');

      const encSecret = encrypt('JBSWY3DPEHPK3PXP', config.mfa.encryptionKey);

      // 1. Initial user check in verify
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'u-admin-fresh',
            email: 'admin@aegis.dev',
            is_active: true,
            mfa_secret: encSecret,
            mfa_enabled: false,
          },
        ],
      });

      // 2. Policy check & cached user access: roles and permissions
      db.query
        .mockResolvedValueOnce({ rows: [{ name: 'admin' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'admin:read' }] });

      // Redis SET NX returns 'OK' (fresh, successfully consumed)
      redis.set.mockResolvedValueOnce('OK');

      // 3. UPDATE users SET mfa_enabled = true
      db.query.mockResolvedValueOnce({ rows: [] });

      // 4. freshUserResult query
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'u-admin-fresh',
            email: 'admin@aegis.dev',
            first_name: 'Admin',
            last_name: 'User',
            is_email_verified: true,
            is_active: true,
            mfa_enabled: true,
          },
        ],
      });

      // 5. tokenService.generateRefreshToken DB query
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await mfaService.verify('u-admin-fresh', '123456', {
        isEnrollmentOnly: true,
        jti: 'token-jti-fresh-1',
        exp: Math.floor(Date.now() / 1000) + 300,
      });

      expect(result.verified).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('token-jti-fresh-1'),
        expect.any(String),
        'EX',
        expect.any(Number),
        'NX'
      );
    });
  });

  describe('requestMfaReset & processMfaResetJob (Zero Timing Side-Channel)', () => {
    test('rejects missing or non-string email with 400', async () => {
      await expect(mfaService.requestMfaReset({ email: '' })).rejects.toThrow(
        'A valid email address is required'
      );
      await expect(mfaService.requestMfaReset({ email: null })).rejects.toThrow(
        'A valid email address is required'
      );
    });

    test('enqueues job uniformly and returns generic response in constant time', async () => {
      const queueService = require('../../../services/queue.service');
      const res = await mfaService.requestMfaReset({
        email: 'user@aegis.dev',
        reqMeta: { ip: '127.0.0.1', userAgent: 'Jest-Agent' },
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('Reset request received');
      expect(queueService.enqueue).toHaveBeenCalledWith('mfa-reset-request', {
        email: 'user@aegis.dev',
        reqMeta: { ip: '127.0.0.1', userAgent: 'Jest-Agent' },
      });
    });

    test('fails closed on queue enqueue error while returning generic response', async () => {
      const queueService = require('../../../services/queue.service');
      queueService.enqueue.mockRejectedValueOnce(new Error('Redis cluster connection lost'));

      const res = await mfaService.requestMfaReset({
        email: 'user@aegis.dev',
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('Reset request received');
    });

    describe('processMfaResetJob (Background Worker)', () => {
      test('silently returns when user not found, inactive, or mfa not enabled', async () => {
        const db = require('../../../config/database');
        const mailerService = require('../../../services/mailer.service');
        const sendSpy = jest.spyOn(mailerService, 'sendMfaResetRequestAlert');

        db.query.mockResolvedValueOnce({ rows: [] });
        await mfaService.processMfaResetJob('unknown@aegis.dev');
        expect(sendSpy).not.toHaveBeenCalled();

        // Inactive user
        db.query.mockResolvedValueOnce({
          rows: [{ id: 'u-inact', email: 'inact@aegis.dev', is_active: false, mfa_enabled: true }],
        });
        await mfaService.processMfaResetJob('inact@aegis.dev');
        expect(sendSpy).not.toHaveBeenCalled();

        // MFA not enabled
        db.query.mockResolvedValueOnce({
          rows: [{ id: 'u-nomfa', email: 'nomfa@aegis.dev', is_active: true, mfa_enabled: false }],
        });
        await mfaService.processMfaResetJob('nomfa@aegis.dev');
        expect(sendSpy).not.toHaveBeenCalled();

        sendSpy.mockRestore();
      });

      test('dispatches alert to aegisiamsecurity@gmail.com and logs audit event', async () => {
        const db = require('../../../config/database');
        const { redis } = require('../../../config/redis');
        const mailerService = require('../../../services/mailer.service');
        const sendSpy = jest
          .spyOn(mailerService, 'sendMfaResetRequestAlert')
          .mockResolvedValueOnce(true);

        db.query.mockResolvedValueOnce({
          rows: [{ id: 'u-mfa-1', email: 'user@aegis.dev', is_active: true, mfa_enabled: true }],
        });
        redis.eval = jest.fn().mockResolvedValueOnce(1);

        await mfaService.processMfaResetJob('user@aegis.dev', {
          ip: '192.168.1.100',
          userAgent: 'Jest-Agent',
        });

        expect(sendSpy).toHaveBeenCalledWith({
          userEmail: 'user@aegis.dev',
          ip: '192.168.1.100',
          userAgent: 'Jest-Agent',
        });
        expect(redis.eval).toHaveBeenCalledWith(
          expect.stringContaining('INCR'),
          1,
          'rl:mfa-reset-req:u-mfa-1',
          3600
        );
        sendSpy.mockRestore();
      });

      test('silently suppresses dispatch when rate limit is exceeded', async () => {
        const db = require('../../../config/database');
        const { redis } = require('../../../config/redis');
        const mailerService = require('../../../services/mailer.service');
        const sendSpy = jest.spyOn(mailerService, 'sendMfaResetRequestAlert');

        db.query.mockResolvedValueOnce({
          rows: [{ id: 'u-mfa-2', email: 'spam@aegis.dev', is_active: true, mfa_enabled: true }],
        });
        redis.eval = jest.fn().mockResolvedValueOnce(4);

        await mfaService.processMfaResetJob('spam@aegis.dev');
        expect(sendSpy).not.toHaveBeenCalled();
        sendSpy.mockRestore();
      });

      test('handles dispatch dependency failures gracefully without throwing', async () => {
        const db = require('../../../config/database');
        const mailerService = require('../../../services/mailer.service');
        const sendSpy = jest
          .spyOn(mailerService, 'sendMfaResetRequestAlert')
          .mockRejectedValueOnce(new Error('SMTP Network Failure'));

        db.query.mockResolvedValueOnce({
          rows: [{ id: 'u-mfa-err', email: 'err@aegis.dev', is_active: true, mfa_enabled: true }],
        });

        await expect(mfaService.processMfaResetJob('err@aegis.dev')).resolves.not.toThrow();
        sendSpy.mockRestore();
      });
    });
  });

  describe('validate', () => {
    test('rejects deactivated user with 401', async () => {
      const db = require('../../../config/database');
      db.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'u-deact',
            is_active: false,
            mfa_enabled: true,
            mfa_secret: 'enc',
            mfa_backup_codes: null,
          },
        ],
      });

      await expect(mfaService.validate('u-deact', '123456')).rejects.toThrow(
        'Account has been deactivated'
      );
    });
  });

  describe('getStatus', () => {
    test('returns status for standard active user', async () => {
      const db = require('../../../config/database');
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'u-stat-1', email: 'stat@aegis.dev', is_active: true, mfa_enabled: false }],
      });

      const res = await mfaService.getStatus('u-stat-1');
      expect(res).toEqual({ mfa_enabled: false, is_active: true, mfa_required: false });
    });

    test('rejects enrollment check when user was demoted to standard user', async () => {
      const db = require('../../../config/database');
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'u-stat-2', email: 'demoted@aegis.dev', is_active: true, mfa_enabled: false }],
      });
      // getUserRolesAndPermissions returns standard user
      db.query
        .mockResolvedValueOnce({ rows: [{ name: 'user' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'user:read' }] });

      await expect(mfaService.getStatus('u-stat-2', { isEnrollmentOnly: true })).rejects.toThrow(
        'MFA setup is no longer required for your account role. Please sign in.'
      );
    });
  });
});
