const crypto = require('crypto');
const { generateSecret, generateURI, verifySync } = require('otplib');
const db = require('../../config/database');
const { redis } = require('../../config/redis');
const config = require('../../config/index');
const { encrypt, decrypt, generateRandomToken, timingSafeCompare } = require('../../utils/crypto');
const auditService = require('../audit/audit.service');
const AppError = require('../../utils/AppError');
const { AUDIT_ACTIONS, REDIS_PREFIXES } = require('../../config/constants');
const tokenService = require('../tokens/tokens.service');
const logger = require('../../utils/logger');

/**
 * MFA Service — TOTP-based Multi-Factor Authentication.
 * Uses otplib for TOTP generation/verification.
 * Encrypts secrets at rest using AES-256-GCM.
 */

/**
 * Generate a new TOTP secret and QR code URI for MFA setup.
 * @param {string} userId
 * @returns {Promise<{ secret: string, otpauthUrl: string, backupCodes: string[] }>}
 */
const setup = async (userId, reqMeta = {}) => {
  const userResult = await db.query(
    'SELECT id, email, is_active, mfa_enabled FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw AppError.notFound('User not found');
  }

  if (!userResult.rows[0].is_active) {
    throw AppError.unauthorized('Account has been deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
  }

  if (userResult.rows[0].mfa_enabled) {
    throw AppError.badRequest('MFA is already enabled', 'MFA_ALREADY_ENABLED');
  }

  // Zero-Trust: If this setup is initiated via an enrollment-only token, verify that
  // the user's role still requires mandatory MFA enrollment. If demoted, fail closed.
  if (reqMeta.isEnrollmentOnly) {
    const authService = require('../auth/auth.service');
    const securityPolicy = require('../auth/securityPolicy');
    const { roles } = await authService.getUserRolesAndPermissions(userId);
    const policy = securityPolicy.getEffectivePolicy(roles);
    if (!policy.mfaMandatory) {
      throw AppError.unauthorized(
        'MFA setup is no longer required for your account role. Please sign in.',
        'AUTH_MFA_SETUP_NOT_REQUIRED'
      );
    }
  }

  const secret = generateSecret();
  const email = userResult.rows[0].email;
  const otpauthUrl = generateURI({ label: email, issuer: config.app.name, secret });

  // Generate backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    generateRandomToken(4).substring(0, 8).toUpperCase()
  );

  // Encrypt and store temporarily (not activated yet)
  const encryptedSecret = encrypt(secret, config.mfa.encryptionKey);
  const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes), config.mfa.encryptionKey);

  await db.query('UPDATE users SET mfa_secret = $1, mfa_backup_codes = $2 WHERE id = $3', [
    encryptedSecret,
    encryptedBackupCodes,
    userId,
  ]);

  return { secret, otpauthUrl, backupCodes };
};

/**
 * Non-mutating MFA enrollment & configuration status check.
 * Used by client health/focus checks to detect role demotions without rotating TOTP secrets.
 * @param {string} userId
 * @param {Object} [reqMeta]
 * @returns {Promise<{ mfa_enabled: boolean, is_active: boolean, mfa_required: boolean }>}
 */
const getStatus = async (userId, reqMeta = {}) => {
  const userResult = await db.query(
    'SELECT id, email, is_active, mfa_enabled FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw AppError.notFound('User not found');
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw AppError.unauthorized('Account has been deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
  }

  let mfaRequired = false;
  if (reqMeta.isEnrollmentOnly) {
    const authService = require('../auth/auth.service');
    const securityPolicy = require('../auth/securityPolicy');
    const { roles } = await authService.getUserRolesAndPermissions(userId);
    const policy = securityPolicy.getEffectivePolicy(roles);
    mfaRequired = policy.mfaMandatory;
    if (!policy.mfaMandatory) {
      throw AppError.unauthorized(
        'MFA setup is no longer required for your account role. Please sign in.',
        'AUTH_MFA_SETUP_NOT_REQUIRED'
      );
    }
  }

  return {
    mfa_enabled: user.mfa_enabled,
    is_active: user.is_active,
    mfa_required: mfaRequired,
  };
};

/**
 * Verify a TOTP code and activate MFA.
 * @param {string} userId
 * @param {string} code - 6-digit TOTP code
 * @param {Object} reqMeta
 * @returns {Promise<{ verified: boolean, tokens?: Object, user?: Object }>}
 */
const verify = async (userId, code, reqMeta = {}) => {
  const client = typeof db.getClient === 'function' ? await db.getClient() : null;
  const runner = client || db;
  let inTransaction = false;

  let enrollmentClaimToken = null;
  let enrollmentConsumeKey = null;

  try {
    if (client) {
      await client.query('BEGIN');
      inTransaction = true;
    }

    // 1. Lock user row to serialize concurrent role modifications & demotions
    const userResult = await runner.query(
      client
        ? 'SELECT id, email, is_active, mfa_secret, mfa_enabled FROM users WHERE id = $1 FOR UPDATE'
        : 'SELECT id, email, is_active, mfa_secret, mfa_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw AppError.notFound('User not found');
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      throw AppError.unauthorized('Account has been deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
    }

    if (!user.mfa_secret) {
      throw AppError.badRequest('MFA setup not initiated. Call /mfa/setup first.', 'MFA_NOT_SETUP');
    }

    // Decrypt the secret
    const secret = decrypt(user.mfa_secret, config.mfa.encryptionKey);

    // Verify the TOTP code
    let isValid = false;
    try {
      const result = verifySync({ token: String(code).trim(), secret, window: 1 });
      isValid = !!result && (result.valid === true || result === true);
    } catch {
      isValid = false;
    }

    if (!isValid) {
      throw AppError.badRequest('Invalid MFA code', 'MFA_INVALID_CODE');
    }

    // Zero-Trust: If this verification is initiated via an enrollment-only token, verify that
    // the user's role still requires mandatory MFA enrollment under the locked user row.
    let enrollmentRoles = null;
    let enrollmentPerms = null;
    if (reqMeta.isEnrollmentOnly) {
      const authService = require('../auth/auth.service');
      const securityPolicy = require('../auth/securityPolicy');
      const userAccess = await authService.getUserRolesAndPermissions(userId, client);
      enrollmentRoles = userAccess.roles;
      enrollmentPerms = userAccess.permissions;
      const policy = securityPolicy.getEffectivePolicy(enrollmentRoles);
      if (!policy.mfaMandatory) {
        throw AppError.unauthorized(
          'MFA setup is no longer required for your account role. Please sign in.',
          'AUTH_MFA_SETUP_NOT_REQUIRED'
        );
      }
    }

    // If request was completed via an MFA enrollment token, claim token atomically BEFORE mutating account
    if (reqMeta.isEnrollmentOnly && reqMeta.jti) {
      enrollmentConsumeKey = `${REDIS_PREFIXES.MFA_ENROLLMENT}${reqMeta.jti}`;
      const ttl = Math.max(60, (reqMeta.exp || 0) - Math.floor(Date.now() / 1000));
      enrollmentClaimToken = crypto.randomUUID();
      const setOk = await redis.set(enrollmentConsumeKey, enrollmentClaimToken, 'EX', ttl, 'NX');
      if (!setOk) {
        throw AppError.unauthorized(
          'MFA enrollment token has already been consumed',
          'AUTH_TOKEN_REVOKED'
        );
      }
    }

    // Activate MFA
    if (!user.mfa_enabled) {
      await runner.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId]);

      await auditService.log(
        {
          actorId: userId,
          actorEmail: user.email,
          action: AUDIT_ACTIONS.MFA_ENABLED,
          resourceType: 'user',
          resourceId: userId,
          ip: reqMeta.ip,
          userAgent: reqMeta.userAgent,
        },
        client
      );
    }

    if (reqMeta.isEnrollmentOnly && reqMeta.jti) {
      const freshUserResult = await runner.query(
        'SELECT id, email, first_name, last_name, is_email_verified, is_active, mfa_enabled FROM users WHERE id = $1',
        [userId]
      );

      const accessTokenData = tokenService.generateAccessToken(
        freshUserResult.rows[0],
        enrollmentRoles,
        enrollmentPerms
      );
      const refreshTokenData = await tokenService.generateRefreshToken(userId, null, 1, client);

      if (client) {
        await client.query('COMMIT');
        inTransaction = false;
      }

      return {
        verified: true,
        tokens: {
          accessToken: accessTokenData.token,
          refreshToken: refreshTokenData.token,
        },
        user: freshUserResult.rows[0],
      };
    }

    if (client) {
      await client.query('COMMIT');
      inTransaction = false;
    }

    return { verified: true };
  } catch (err) {
    if (inTransaction && client) {
      await client.query('ROLLBACK');
      inTransaction = false;
    }

    if (enrollmentConsumeKey && enrollmentClaimToken) {
      // Safe release: only delete if the key still holds our specific claimToken
      const releaseScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      try {
        await redis.eval(releaseScript, 1, enrollmentConsumeKey, enrollmentClaimToken);
      } catch (releaseErr) {
        logger.error('Failed to release MFA enrollment token claim on activation failure:', {
          key: enrollmentConsumeKey,
          error: releaseErr.message,
        });
      }
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * Validate a TOTP code during login flow.
 * @param {string} userId
 * @param {string} code
 * @returns {Promise<boolean>}
 */
const validate = async (userId, code) => {
  const userResult = await db.query(
    'SELECT id, is_active, mfa_secret, mfa_enabled, mfa_backup_codes FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0 || !userResult.rows[0].mfa_enabled) {
    throw AppError.badRequest('MFA is not enabled', 'MFA_NOT_ENABLED');
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw AppError.unauthorized('Account has been deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
  }

  const secret = decrypt(user.mfa_secret, config.mfa.encryptionKey);

  // Check TOTP code first
  let isValid = false;
  try {
    const result = verifySync({ token: String(code).trim(), secret, window: 1 });
    isValid = !!result && (result.valid === true || result === true);
  } catch {
    isValid = false;
  }

  if (isValid) {
    return true;
  }

  // Check backup codes
  if (user.mfa_backup_codes) {
    const backupCodes = JSON.parse(decrypt(user.mfa_backup_codes, config.mfa.encryptionKey));
    let codeIndex = -1;
    const normalizedInput = String(code).trim().toUpperCase();

    for (let i = 0; i < backupCodes.length; i++) {
      if (timingSafeCompare(normalizedInput, backupCodes[i])) {
        codeIndex = i;
        break;
      }
    }

    if (codeIndex !== -1) {
      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes), config.mfa.encryptionKey);
      await db.query('UPDATE users SET mfa_backup_codes = $1 WHERE id = $2', [
        encryptedBackupCodes,
        userId,
      ]);
      return true;
    }
  }

  throw AppError.unauthorized('Invalid MFA code', 'MFA_INVALID_CODE');
};

/**
 * Disable MFA for a user.
 * @param {string} userId
 * @param {string} code - Current TOTP code (required for security)
 * @param {Object} reqMeta
 */
const disable = async (userId, code, reqMeta = {}) => {
  // Query user roles and enforce zero-trust security policy
  const rolesResult = await db.query(
    `SELECT r.name FROM roles r
     INNER JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId]
  );
  const roles = rolesResult.rows.map((r) => r.name);
  const securityPolicy = require('../auth/securityPolicy');
  if (!securityPolicy.canDisableMfa(roles)) {
    throw AppError.forbidden(
      'MFA is strictly mandatory for administrative accounts under AEGIS security policy and cannot be disabled.',
      'MFA_MANDATORY_ROLE'
    );
  }

  // Must verify current code before disabling
  await validate(userId, code);

  await db.query(
    'UPDATE users SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1',
    [userId]
  );

  const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);

  await auditService.log({
    actorId: userId,
    actorEmail: userResult.rows[0]?.email,
    action: AUDIT_ACTIONS.MFA_DISABLED,
    resourceType: 'user',
    resourceId: userId,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
};

const queueService = require('../../services/queue.service');

/**
 * Uniform response message for 2FA recovery requests to prevent account enumeration.
 */
const RESET_DISPATCH_MESSAGE =
  'Reset request received. If an eligible account is associated, AEGIS Security will review it.';

/**
 * Background worker processor for MFA reset requests.
 * Evaluates account eligibility, enforces rate limits, dispatches alert email, and logs audit record.
 * @param {string} email
 * @param {Object} reqMeta
 * @returns {Promise<void>}
 */
const processMfaResetJob = async (email, reqMeta = {}) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }

  const userResult = await db.query(
    'SELECT id, email, is_active, mfa_enabled FROM users WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );

  // Silently drop in-flight requests for non-existent, inactive, or non-MFA accounts
  if (
    userResult.rows.length === 0 ||
    !userResult.rows[0].mfa_enabled ||
    !userResult.rows[0].is_active
  ) {
    return;
  }

  const user = userResult.rows[0];

  // Rate limit: max 3 reset alerts per user per hour.
  // Silently suppress excess requests in worker to prevent alert storms (fail-closed security).
  if (redis) {
    try {
      const rlKey = `rl:mfa-reset-req:${user.id}`;
      const count = await redis.eval(
        `local current = redis.call('INCR', KEYS[1])
         if current == 1 then
           redis.call('EXPIRE', KEYS[1], ARGV[1])
         end
         return current`,
        1,
        rlKey,
        3600
      );
      if (count > 3) {
        return;
      }
    } catch (err) {
      logger.error('Failed to enforce MFA reset alert rate limit:', {
        userId: user.id,
        error: err.message,
      });
      return;
    }
  } else {
    logger.warn('Rate limiter unavailable for MFA reset alert, suppressing dispatch:', {
      userId: user.id,
    });
    return;
  }

  try {
    const mailerService = require('../../services/mailer.service');
    await mailerService.sendMfaResetRequestAlert({
      userEmail: user.email,
      ip: reqMeta.ip || 'Unknown',
      userAgent: reqMeta.userAgent || 'Unknown',
    });
  } catch (mailErr) {
    logger.error('Failed to dispatch MFA reset request alert email:', {
      userId: user.id,
      error: mailErr.message,
    });
  }

  try {
    await auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.MFA_RESET_REQUESTED || 'MFA_RESET_REQUESTED',
      resourceType: 'user',
      resourceId: user.id,
      newData: {
        requested_via: '2FA verification recovery prompt',
        target_support: 'aegisiamsecurity@gmail.com',
      },
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });
  } catch (auditErr) {
    logger.error('Failed to record MFA reset request audit log:', {
      userId: user.id,
      error: auditErr.message,
    });
  }
};

// Register worker with queue service
queueService.registerWorker('mfa-reset-request', async (payload) => {
  return await processMfaResetJob(payload.email, payload.reqMeta);
});

/**
 * Request 2FA reset assistance from AEGIS Security.
 * Enqueues work asynchronously to guarantee constant-time execution
 * and eliminate account-eligibility timing side-channels.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {Object} params.reqMeta
 * @returns {Promise<{ success: boolean, message: string }>}
 */
const requestMfaReset = async ({ email, reqMeta = {} }) => {
  if (!email || typeof email !== 'string') {
    throw AppError.badRequest('A valid email address is required', 'INVALID_EMAIL');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Enqueue job asynchronously to eliminate account-eligibility timing side channels.
  // Fails closed on queue infrastructure errors to prevent database pool exhaustion under flood attacks.
  try {
    await queueService.enqueue('mfa-reset-request', {
      email: normalizedEmail,
      reqMeta: {
        ip: reqMeta.ip || 'Unknown',
        userAgent: reqMeta.userAgent || 'Unknown',
      },
    });
  } catch (err) {
    logger.error('Failed to enqueue MFA reset request to background queue:', {
      error: err.message,
    });
  }

  return {
    success: true,
    message: RESET_DISPATCH_MESSAGE,
  };
};

module.exports = {
  setup,
  verify,
  validate,
  disable,
  requestMfaReset,
  processMfaResetJob,
  getStatus,
};
