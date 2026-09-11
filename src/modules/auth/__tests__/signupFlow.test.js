const db = require('../../../config/database');
const { redis } = require('../../../config/redis');
const mailerService = require('../../../services/mailer.service');
const auditService = require('../../audit/audit.service');
const tokenService = require('../../tokens/tokens.service');
const authService = require('../auth.service');
const { AUDIT_ACTIONS, REDIS_PREFIXES } = require('../../../config/constants');

const clientQuery = jest.fn(async (text, params) => {
  if (typeof text === 'string' && ['BEGIN', 'COMMIT', 'ROLLBACK'].includes(text.trim())) {
    return { rows: [] };
  }
  return db.query(text, params);
});

const mockClient = {
  query: clientQuery,
  release: jest.fn(),
};

jest.mock('../../../config/database', () => {
  const queryFn = jest.fn();
  return {
    query: queryFn,
    getClient: jest.fn(),
  };
});

jest.mock('../../../config/redis', () => ({
  redis: {
    set: jest.fn(),
    getdel: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
  },
}));

jest.mock('../../../services/mailer.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ messageId: 'test-signup-msg-id' }),
  sendAccountExistsEmail: jest.fn().mockResolvedValue({ messageId: 'test-exists-msg-id' }),
}));

jest.mock('../../audit/audit.service', () => ({
  log: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../tokens/tokens.service', () => ({
  generateAccessToken: jest.fn().mockReturnValue({ token: 'mock-access-token' }),
  generateRefreshToken: jest.fn().mockResolvedValue({ token: 'mock-refresh-token' }),
}));

describe('Multi-Step Signup Flow (Pre-Verification & Credential Completion)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.getClient.mockResolvedValue(mockClient);
  });

  describe('initiateSignup (Step 1)', () => {
    test('should prevent email enumeration: return neutral success and send account notice if email is already registered', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'existing-user-id', first_name: 'Alex' }] });

      const result = await authService.initiateSignup({ email: 'taken@company.com' });

      expect(result).toEqual({ email: 'taken@company.com', dispatched: true });
      expect(mailerService.sendAccountExistsEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: 'taken@company.com',
          userName: 'Alex',
        })
      );
      // Ensure no signup token was created in Redis for an already-registered account
      expect(redis.set).not.toHaveBeenCalled();
    });

    test('should store token in Redis, dispatch email, and log audit event for new address', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // email not taken
      redis.set.mockResolvedValueOnce('OK');

      const result = await authService.initiateSignup(
        { email: 'newuser@company.com' },
        { ip: '127.0.0.1', userAgent: 'Jest-Agent' }
      );

      expect(result.email).toBe('newuser@company.com');
      expect(result.dispatched).toBe(true);

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining(REDIS_PREFIXES.SIGNUP_TOKEN),
        JSON.stringify({ email: 'newuser@company.com' }),
        'EX',
        expect.any(Number)
      );

      expect(mailerService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: 'newuser@company.com',
          verificationUrl: expect.stringContaining('/register?token='),
        })
      );

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.EMAIL_VERIFICATION_REQUESTED,
          actorEmail: 'newuser@company.com',
        })
      );
    });
  });

  describe('validateSignupToken (Step 2 - Email Link Click)', () => {
    test('should reject with 400 if token is invalid or expired', async () => {
      redis.getdel.mockResolvedValueOnce(null);

      await expect(
        authService.validateSignupToken('invalid-or-expired-token')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'SIGNUP_TOKEN_INVALID',
      });
    });

    test('should reject with 400 if token payload is corrupted or missing email', async () => {
      redis.getdel.mockResolvedValueOnce(JSON.stringify({ invalid: true }));

      await expect(authService.validateSignupToken('corrupted-token')).rejects.toMatchObject({
        statusCode: 400,
        code: 'SIGNUP_TOKEN_INVALID',
      });
    });

    test('should atomically consume signup token and issue registration ticket', async () => {
      const storedPayload = JSON.stringify({ email: 'verified@company.com' });
      redis.getdel.mockResolvedValueOnce(storedPayload);
      redis.set.mockResolvedValueOnce('OK');

      const result = await authService.validateSignupToken('valid-raw-token');

      expect(result.email).toBe('verified@company.com');
      expect(result.registrationTicket).toBeDefined();
      expect(typeof result.registrationTicket).toBe('string');

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining(REDIS_PREFIXES.SIGNUP_TICKET),
        JSON.stringify({ email: 'verified@company.com', verified: true }),
        'EX',
        1800 // 30 mins
      );
    });
  });

  describe('completeSignup (Step 3 & 4)', () => {
    test('should reject if registration ticket is expired or missing', async () => {
      redis.getdel.mockResolvedValueOnce(null);

      await expect(
        authService.completeSignup({
          email: 'user@company.com',
          registrationTicket: 'stale-ticket',
          name: 'Jane Doe',
          password: 'Password123!',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'REGISTRATION_TICKET_INVALID',
      });
    });

    test('should reject if ticket payload has no valid email string', async () => {
      redis.getdel.mockResolvedValueOnce(JSON.stringify({ verified: true }));

      await expect(
        authService.completeSignup({
          email: 'user@company.com',
          registrationTicket: 'valid-ticket',
          name: 'Jane Doe',
          password: 'Password123!',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'REGISTRATION_TICKET_INVALID',
      });
    });

    test('should reject if ticket email does not match submitted email', async () => {
      redis.getdel.mockResolvedValueOnce(
        JSON.stringify({ email: 'other@company.com', verified: true })
      );

      await expect(
        authService.completeSignup({
          email: 'attacker@company.com',
          registrationTicket: 'valid-ticket',
          name: 'Jane Doe',
          password: 'Password123!',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'EMAIL_MISMATCH',
      });
    });

    test('should catch Postgres unique constraint race (23505) and return 409 conflict', async () => {
      redis.getdel.mockResolvedValueOnce(
        JSON.stringify({ email: 'racing@company.com', verified: true })
      );

      db.query.mockImplementationOnce(() => {
        const err = new Error('duplicate key value violates unique constraint');
        err.code = '23505';
        throw err;
      });

      await expect(
        authService.completeSignup({
          email: 'racing@company.com',
          registrationTicket: 'valid-ticket',
          name: 'Racing User',
          password: 'StrongP@ssword123!',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'EMAIL_ALREADY_EXISTS',
      });
    });

    test('should fail fast and release client if transaction initialization fails', async () => {
      redis.getdel.mockResolvedValueOnce(
        JSON.stringify({ email: 'txfail@company.com', verified: true })
      );

      const failingClient = {
        query: jest.fn().mockRejectedValueOnce(new Error('Connection lost on BEGIN')),
        release: jest.fn(),
      };
      db.getClient.mockResolvedValueOnce(failingClient);

      await expect(
        authService.completeSignup({
          email: 'txfail@company.com',
          registrationTicket: 'valid-ticket',
          name: 'Tx User',
          password: 'StrongP@ssword123!',
        })
      ).rejects.toThrow('Connection lost on BEGIN');

      expect(failingClient.release).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining(REDIS_PREFIXES.SIGNUP_TICKET),
        expect.stringContaining('txfail@company.com'),
        'EX',
        expect.any(Number)
      );
    });

    test('should create verified user in DB, assign role, issue tokens, and log audit', async () => {
      redis.getdel.mockResolvedValueOnce(
        JSON.stringify({ email: 'swat@aegis.iam', verified: true })
      );

      db.query
        .mockResolvedValueOnce({
          // INSERT INTO users
          rows: [
            {
              id: 'user-uuid-999',
              email: 'swat@aegis.iam',
              first_name: 'Swatantra',
              last_name: 'Yadav',
              is_active: true,
              is_email_verified: true,
              mfa_enabled: false,
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'role-user-id' }] }) // SELECT id FROM roles
        .mockResolvedValueOnce({ rows: [] }) // INSERT INTO user_roles
        .mockResolvedValueOnce({ rows: [{ name: 'user' }] }) // getUserRolesAndPermissions roles
        .mockResolvedValueOnce({ rows: [] }); // getUserRolesAndPermissions perms

      const result = await authService.completeSignup(
        {
          email: 'swat@aegis.iam',
          registrationTicket: 'valid-ticket',
          name: 'Swatantra Yadav',
          password: 'StrongP@ssword123!',
        },
        { ip: '127.0.0.1', userAgent: 'Jest-Runner' }
      );

      expect(result.user.email).toBe('swat@aegis.iam');
      expect(result.user.is_email_verified).toBe(true);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');

      // Verify INSERT user included is_email_verified = true
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_email_verified'),
        expect.arrayContaining(['swat@aegis.iam', expect.any(String), 'Swatantra', 'Yadav'])
      );

      // Verify audit logs
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.USER_REGISTERED,
          actorId: 'user-uuid-999',
          actorEmail: 'swat@aegis.iam',
        })
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.EMAIL_VERIFIED,
          actorId: 'user-uuid-999',
          actorEmail: 'swat@aegis.iam',
        })
      );
    });
  });
});
