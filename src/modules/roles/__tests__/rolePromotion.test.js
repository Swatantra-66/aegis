const tokenService = require('../../tokens/tokens.service');
const rolesService = require('../roles.service');
const db = require('../../../config/database');
const auditService = require('../../audit/audit.service');
const { ROLES, AUDIT_ACTIONS } = require('../../../config/constants');
const authenticate = require('../../../middleware/authenticate');
const authenticateMfaEnrollment = require('../../../middleware/authenticateMfaEnrollment');
const AppError = require('../../../utils/AppError');

jest.mock('../../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../../audit/audit.service', () => ({
  log: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../tokens/tokens.blacklist', () => ({
  isBlacklisted: jest.fn().mockResolvedValue(false),
}));

describe('Zero-Trust Role Promotion Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Service — Scoped MFA Enrollment Tokens', () => {
    test('generateAccessToken issues valid token with user claims', () => {
      const user = { id: 'u-123', email: 'test@aegis.dev' };
      const { token } = tokenService.generateAccessToken(user, ['user'], ['user:read']);
      const decoded = tokenService.verifyAccessToken(token);

      expect(decoded.sub).toBe('u-123');
      expect(decoded.roles).toEqual(['user']);
      expect(decoded.permissions).toEqual(['user:read']);
    });

    test('generateMfaEnrollmentToken issues scoped token with mfa:enroll_only', () => {
      const user = { id: 'u-admin-1', email: 'promoted@aegis.dev' };
      const { token } = tokenService.generateMfaEnrollmentToken(user);
      const decoded = tokenService.verifyMfaEnrollmentToken(token);

      expect(decoded.sub).toBe('u-admin-1');
      expect(decoded.email).toBe('promoted@aegis.dev');
      expect(decoded.scope).toBe('mfa:enroll_only');
    });

    test('verifyMfaEnrollmentToken rejects standard access tokens without mfa:enroll_only scope', () => {
      const user = { id: 'u-standard', email: 'std@aegis.dev' };
      const { token } = tokenService.generateAccessToken(user);

      expect(() => {
        tokenService.verifyMfaEnrollmentToken(token);
      }).toThrow('Invalid token scope');
    });
  });

  describe('Roles Service — Privilege Escalation Session Invalidation', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      db.getClient.mockResolvedValue(mockClient);
    });

    test('assigning standard role does not revoke all user tokens', async () => {
      const userId = 'u-user-1';
      const roleId = 'r-user-id';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: userId, email: 'user@aegis.dev' }] }) // user check FOR UPDATE
        .mockResolvedValueOnce({
          rows: [{ id: roleId, name: ROLES.USER, description: 'Standard' }],
        }) // getRoleById
        .mockResolvedValueOnce({ rows: [] }) // getRoleById permissions
        .mockResolvedValueOnce({ rows: [] }) // DELETE user_roles RETURNING role_id
        .mockResolvedValueOnce({ rows: [{ user_id: userId }] }) // INSERT user_roles RETURNING user_id
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await rolesService.assignRoleToUser(userId, roleId, {
        actorId: 'admin-1',
        actorEmail: 'admin@aegis.dev',
      });

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.ROLE_ASSIGNED,
          resourceId: userId,
        }),
        mockClient
      );
      expect(auditService.log).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.ROLE_PROMOTION_SESSION_REVOKED,
        }),
        expect.anything()
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('assigning ADMIN role revokes all refresh token families and logs promotion audit', async () => {
      const userId = 'u-promoted-admin';
      const roleId = 'r-admin-id';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: userId, email: 'candidate@aegis.dev' }] }) // user check FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ id: roleId, name: ROLES.ADMIN, description: 'Admin' }] }) // getRoleById
        .mockResolvedValueOnce({ rows: [] }) // getRoleById permissions
        .mockResolvedValueOnce({ rows: [] }) // DELETE user_roles RETURNING role_id
        .mockResolvedValueOnce({ rows: [{ user_id: userId }] }) // INSERT user_roles RETURNING user_id
        .mockResolvedValueOnce({ rows: [] }) // revokeAllUserTokens (UPDATE refresh_tokens SET revoked = true)
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await rolesService.assignRoleToUser(userId, roleId, {
        actorId: 'super-1',
        actorEmail: 'super@aegis.dev',
      });

      // Verify all refresh tokens revoked in DB
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false',
        [userId]
      );

      // Verify dedicated audit event logged
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.ROLE_PROMOTION_SESSION_REVOKED,
          resourceId: userId,
          newData: expect.objectContaining({
            role_name: ROLES.ADMIN,
            reason: 'Zero-Trust privilege escalation policy enforcement',
          }),
        }),
        mockClient
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('reassigning already assigned ADMIN role does not revoke sessions or log audit', async () => {
      const userId = 'u-existing-admin';
      const roleId = 'r-admin-id';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: userId, email: 'admin@aegis.dev' }] }) // user check FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ id: roleId, name: ROLES.ADMIN, description: 'Admin' }] }) // getRoleById
        .mockResolvedValueOnce({ rows: [] }) // getRoleById permissions
        .mockResolvedValueOnce({ rows: [] }) // DELETE user_roles RETURNING role_id
        .mockResolvedValueOnce({ rows: [] }) // ON CONFLICT DO NOTHING returns 0 rows
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await rolesService.assignRoleToUser(userId, roleId, {
        actorId: 'super-1',
        actorEmail: 'super@aegis.dev',
      });

      expect(result).toEqual({
        assigned: false,
        sessionsRevoked: false,
        roleId,
        roleName: ROLES.ADMIN,
        message: `Role ${ROLES.ADMIN} is already assigned to this user.`,
      });

      // Neither role assigned nor promotion session revoked should be logged
      expect(auditService.log).not.toHaveBeenCalled();
      // Revoke tokens query should NOT have been called
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked = true'),
        expect.anything()
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('demoting an ADMIN to USER atomically replaces role and revokes sessions', async () => {
      const userId = 'u-demoted-admin';
      const userRoleId = 'r-user-id';
      const oldAdminRoleId = 'r-admin-id';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: userId, email: 'admin@aegis.dev' }] }) // user check FOR UPDATE
        .mockResolvedValueOnce({
          rows: [{ id: userRoleId, name: ROLES.USER, description: 'Standard' }],
        }) // getRoleById
        .mockResolvedValueOnce({ rows: [] }) // getRoleById permissions
        .mockResolvedValueOnce({ rows: [{ role_id: oldAdminRoleId }] }) // DELETE removes old admin role
        .mockResolvedValueOnce({ rows: [{ user_id: userId }] }) // INSERT user role
        .mockResolvedValueOnce({ rows: [{ name: ROLES.ADMIN }] }) // removedDetails check
        .mockResolvedValueOnce({ rows: [] }) // tokenService.revokeAllUserTokens
        .mockResolvedValueOnce({ rows: [] }) // clean pending mfa_secret
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await rolesService.assignRoleToUser(userId, userRoleId, {
        actorId: 'super-1',
        actorEmail: 'super@aegis.dev',
      });

      expect(result).toEqual({
        assigned: true,
        sessionsRevoked: true,
        roleId: userRoleId,
        roleName: ROLES.USER,
      });

      // Verify tokens were revoked
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false',
        [userId]
      );

      // Verify pending MFA cleanup
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1 AND mfa_enabled = false',
        [userId]
      );

      // Verify demotion audit log
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.TOKEN_REVOKED,
          resourceId: userId,
          newData: expect.objectContaining({
            reason: 'Zero-Trust privilege demotion session termination',
          }),
        }),
        mockClient
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('detects and enforces demotion session revocation even when user already held USER role', async () => {
      const userId = 'u-dual-role-user';
      const userRoleId = 'r-user-id';
      const oldAdminRoleId = 'r-admin-id';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: userId, email: 'dual@aegis.dev' }] }) // user check FOR UPDATE
        .mockResolvedValueOnce({
          rows: [{ id: userRoleId, name: ROLES.USER, description: 'Standard' }],
        }) // getRoleById
        .mockResolvedValueOnce({ rows: [] }) // getRoleById permissions
        .mockResolvedValueOnce({ rows: [{ role_id: oldAdminRoleId }] }) // DELETE removes conflicting admin role
        .mockResolvedValueOnce({ rows: [] }) // INSERT hits ON CONFLICT DO NOTHING (user role already held)
        .mockResolvedValueOnce({ rows: [{ name: ROLES.ADMIN }] }) // removedDetails check
        .mockResolvedValueOnce({ rows: [] }) // tokenService.revokeAllUserTokens
        .mockResolvedValueOnce({ rows: [] }) // clean pending mfa_secret
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await rolesService.assignRoleToUser(userId, userRoleId, {
        actorId: 'super-1',
        actorEmail: 'super@aegis.dev',
      });

      // Crucial: Must NOT early-return; must revoke elevated sessions and record demotion
      expect(result).toEqual({
        assigned: true,
        sessionsRevoked: true,
        roleId: userRoleId,
        roleName: ROLES.USER,
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false',
        [userId]
      );

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.TOKEN_REVOKED,
          resourceId: userId,
        }),
        mockClient
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('demoting super_admin to admin revokes sessions and records demotion audit log without promotion event', async () => {
      const userId = 'u-super-to-admin';
      const adminRoleId = 'r-admin-id';
      const oldSuperRoleId = 'r-super-admin-id';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: userId, email: 'super@aegis.dev' }] }) // user check FOR UPDATE
        .mockResolvedValueOnce({
          rows: [{ id: adminRoleId, name: ROLES.ADMIN, description: 'Admin' }],
        }) // getRoleById
        .mockResolvedValueOnce({ rows: [] }) // getRoleById permissions
        .mockResolvedValueOnce({ rows: [{ role_id: oldSuperRoleId }] }) // DELETE removes super_admin
        .mockResolvedValueOnce({ rows: [{ user_id: userId }] }) // INSERT admin
        .mockResolvedValueOnce({ rows: [{ name: ROLES.SUPER_ADMIN }] }) // removedDetails check
        .mockResolvedValueOnce({ rows: [] }) // revokeAllUserTokens
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await rolesService.assignRoleToUser(userId, adminRoleId, {
        actorId: 'super-root',
        actorEmail: 'root@aegis.dev',
      });

      expect(result).toEqual({
        assigned: true,
        sessionsRevoked: true,
        roleId: adminRoleId,
        roleName: ROLES.ADMIN,
      });

      // Crucial: Must log TOKEN_REVOKED with demotion reason, NOT ROLE_PROMOTION_SESSION_REVOKED
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.TOKEN_REVOKED,
          resourceId: userId,
          newData: expect.objectContaining({
            reason: 'Zero-Trust privilege demotion session termination',
          }),
        }),
        mockClient
      );

      expect(auditService.log).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.ROLE_PROMOTION_SESSION_REVOKED,
        }),
        expect.anything()
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('rolls back transaction and does not commit role assignment if session revocation fails', async () => {
      const userId = 'u-demoted-fail';
      const userRoleId = 'r-user-id';
      const oldAdminRoleId = 'r-admin-id';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: userId, email: 'admin@aegis.dev' }] }) // user check FOR UPDATE
        .mockResolvedValueOnce({
          rows: [{ id: userRoleId, name: ROLES.USER, description: 'Standard' }],
        }) // getRoleById
        .mockResolvedValueOnce({ rows: [] }) // getRoleById permissions
        .mockResolvedValueOnce({ rows: [{ role_id: oldAdminRoleId }] }) // DELETE removes old admin role
        .mockResolvedValueOnce({ rows: [{ user_id: userId }] }) // INSERT user role
        .mockResolvedValueOnce({ rows: [{ name: ROLES.ADMIN }] }) // removedDetails check
        .mockRejectedValueOnce(new Error('Database connectivity lost during token revocation')) // revokeAllUserTokens fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        rolesService.assignRoleToUser(userId, userRoleId, {
          actorId: 'super-1',
          actorEmail: 'super@aegis.dev',
        })
      ).rejects.toThrow('Database connectivity lost during token revocation');

      // Verify ROLLBACK was called on client
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      // Verify audit was NOT logged because transaction failed
      expect(auditService.log).not.toHaveBeenCalled();
    });
  });

  describe('Authenticate Middleware — Scope Restriction', () => {
    test('rejects token with mfa:enroll_only scope on standard endpoints with 403', async () => {
      const user = { id: 'u-enroll', email: 'enroll@aegis.dev' };
      const { token } = tokenService.generateMfaEnrollmentToken(user);

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('AUTH_TOKEN_SCOPE_RESTRICTED');
    });

    test('allows valid access token on standard endpoints', async () => {
      const user = { id: 'u-valid', email: 'valid@aegis.dev' };
      const { token } = tokenService.generateAccessToken(user);

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user.id).toBe('u-valid');
      expect(req.user.email).toBe('valid@aegis.dev');
    });
  });

  describe('AuthenticateMfaEnrollment Middleware', () => {
    test('authenticates scoped enrollment token and flags req.user.isEnrollmentOnly with jti and exp', async () => {
      const user = { id: 'u-enrolling-admin', email: 'newadmin@aegis.dev' };
      const { token } = tokenService.generateMfaEnrollmentToken(user);

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      await authenticateMfaEnrollment(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user.id).toBe('u-enrolling-admin');
      expect(req.user.isEnrollmentOnly).toBe(true);
      expect(req.user.scope).toBe('mfa:enroll_only');
      expect(req.user.jti).toBeDefined();
      expect(req.user.exp).toBeDefined();
    });

    test('also accepts regular access token for standard users setting up MFA', async () => {
      const user = { id: 'u-standard-mfa', email: 'stdmfa@aegis.dev' };
      const { token } = tokenService.generateAccessToken(user);

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      await authenticateMfaEnrollment(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user.id).toBe('u-standard-mfa');
      expect(req.user.isEnrollmentOnly).toBe(false);
      expect(req.user.jti).toBeDefined();
      expect(req.user.exp).toBeDefined();
    });
  });
});
