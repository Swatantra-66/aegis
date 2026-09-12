const crypto = require('crypto');
const db = require('../../config/database');
const {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashToken,
} = require('../../utils/crypto');
const config = require('../../config/index');
const tokenService = require('../tokens/tokens.service');
const auditService = require('../audit/audit.service');
const mailerService = require('../../services/mailer.service');
const queueService = require('../../services/queue.service');
const securityPolicy = require('./securityPolicy');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { redis } = require('../../config/redis');
const {
  AUDIT_ACTIONS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  ACCOUNT_LOCK_DURATION_MINUTES,
  ROLES,
  REDIS_PREFIXES,
  EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
  SIGNUP_TOKEN_EXPIRY_HOURS,
  SIGNUP_TICKET_EXPIRY_MINUTES,
  PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
} = require('../../config/constants');

/**
 * Authentication Service — core business logic for auth operations.
 */

/**
 * Register a new user account.
 * @param {Object} userData - { email, password, first_name, last_name }
 * @param {Object} reqMeta - { ip, userAgent }
 * @returns {Promise<Object>} Created user (without password_hash)
 */
const register = async (userData, reqMeta = {}) => {
  const { email, password, first_name, last_name } = userData;

  // Check if email already exists
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw AppError.conflict('A user with this email already exists', 'EMAIL_ALREADY_EXISTS');
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Insert user
  const result = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, first_name, last_name, is_active, mfa_enabled, created_at`,
    [email, password_hash, first_name || null, last_name || null]
  );

  const user = result.rows[0];

  // Assign default 'user' role
  const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [ROLES.USER]);
  if (roleResult.rows.length > 0) {
    await db.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user.id, roleResult.rows[0].id]
    );
  }

  // Audit log
  await auditService.log({
    actorId: user.id,
    actorEmail: user.email,
    action: AUDIT_ACTIONS.USER_REGISTERED,
    resourceType: 'user',
    resourceId: user.id,
    newData: { email: user.email, first_name, last_name },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return user;
};

/**
 * Authenticate a user and issue tokens.
 * Handles: credential check, account lock, MFA requirement.
 *
 * @param {Object} credentials - { email, password, mfa_code }
 * @param {Object} reqMeta - { ip, userAgent }
 * @returns {Promise<Object>} { user, accessToken, refreshToken, mfaRequired }
 */
const login = async (credentials, reqMeta = {}) => {
  const { email, password, mfa_code, remember_me } = credentials;

  // Find user
  const result = await db.query(
    `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name,
            u.is_active, u.is_email_verified, u.mfa_enabled, u.mfa_secret,
            u.failed_login_attempts, u.locked_until
     FROM users u WHERE u.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    // Use generic message to prevent user enumeration
    throw AppError.unauthorized('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
  }

  const user = result.rows[0];

  // Check if account is active
  if (!user.is_active) {
    throw AppError.unauthorized('Account has been deactivated', 'AUTH_ACCOUNT_DEACTIVATED');
  }

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remainingMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw AppError.unauthorized(
      `Account is locked. Try again in ${remainingMinutes} minute(s)`,
      'AUTH_ACCOUNT_LOCKED'
    );
  }

  // Verify password
  const isValidPassword = await verifyPassword(user.password_hash, password);
  if (!isValidPassword) {
    // Increment failed attempts
    const newAttempts = (user.failed_login_attempts || 0) + 1;

    if (newAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      // Lock account
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + ACCOUNT_LOCK_DURATION_MINUTES);

      await db.query(
        `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
        [newAttempts, lockUntil, user.id]
      );

      await auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        action: AUDIT_ACTIONS.USER_LOCKED,
        resourceType: 'user',
        resourceId: user.id,
        newData: { locked_until: lockUntil, failed_attempts: newAttempts },
        ip: reqMeta.ip,
        userAgent: reqMeta.userAgent,
      });

      throw AppError.unauthorized(
        `Too many failed attempts. Account locked for ${ACCOUNT_LOCK_DURATION_MINUTES} minutes`,
        'AUTH_ACCOUNT_LOCKED'
      );
    }

    await db.query('UPDATE users SET failed_login_attempts = $1 WHERE id = $2', [
      newAttempts,
      user.id,
    ]);

    await auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      resourceType: 'user',
      resourceId: user.id,
      newData: { failed_attempts: newAttempts },
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });

    throw AppError.unauthorized('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
  }

  // Get user roles and permissions for policy evaluation
  const { roles, permissions } = await getUserRolesAndPermissions(user.id);

  // Evaluate Zero-Trust Security Policy
  const policyResult = securityPolicy.evaluateLoginPolicy({
    user,
    roles,
    mfaCode: mfa_code,
  });

  if (!policyResult.allowed) {
    if (policyResult.requirement === 'MFA_SETUP_REQUIRED') {
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        mfaSetupRequired: true,
        message: policyResult.message,
      };
    }
    if (policyResult.requirement === 'MFA_REQUIRED') {
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        mfaRequired: true,
        message: policyResult.message,
      };
    }
  }

  // If MFA enabled, validate TOTP code
  if (user.mfa_enabled) {
    const mfaService = require('../mfa/mfa.service');
    await mfaService.validate(user.id, mfa_code);
  }

  // Reset failed attempts on successful login
  await db.query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  const expiryDays = remember_me ? 7 : 1;

  // Generate tokens (Full authenticated session)
  const accessTokenData = tokenService.generateAccessToken(user, roles, permissions);
  const refreshTokenData = await tokenService.generateRefreshToken(user.id, null, expiryDays);

  // Audit log
  await auditService.log({
    actorId: user.id,
    actorEmail: user.email,
    action: AUDIT_ACTIONS.USER_LOGIN,
    resourceType: 'user',
    resourceId: user.id,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_email_verified: user.is_email_verified,
      mfa_enabled: user.mfa_enabled,
      roles,
    },
    accessToken: accessTokenData.token,
    refreshToken: refreshTokenData.token,
    mfaRequired: false,
  };
};

/**
 * Refresh an access token using a valid refresh token.
 * Implements token rotation with reuse detection.
 *
 * @param {string} refreshToken - Raw refresh token
 * @returns {Promise<Object>} { accessToken, refreshToken }
 */
const refresh = async (refreshToken) => {
  const rotationResult = await tokenService.rotateRefreshToken(refreshToken);

  if (!rotationResult) {
    throw AppError.unauthorized('Invalid or expired refresh token', 'AUTH_REFRESH_INVALID');
  }

  const { userId, familyId } = rotationResult;

  // Get user data
  const userResult = await db.query('SELECT id, email, is_active FROM users WHERE id = $1', [
    userId,
  ]);

  if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
    throw AppError.unauthorized('User not found or deactivated', 'AUTH_USER_NOT_FOUND');
  }

  const user = userResult.rows[0];

  // Get roles and permissions
  const { roles, permissions } = await getUserRolesAndPermissions(userId);

  // Issue new tokens
  const newAccessToken = tokenService.generateAccessToken(user, roles, permissions);
  const newRefreshToken = await tokenService.generateRefreshToken(userId, familyId);

  return {
    accessToken: newAccessToken.token,
    refreshToken: newRefreshToken.token,
  };
};

/**
 * Logout — revoke refresh token and blacklist access token.
 * @param {string} accessTokenJti - JTI of the access token
 * @param {string} refreshToken - Raw refresh token
 * @param {Object} reqMeta
 */
const logout = async (accessTokenJti, refreshToken, reqMeta = {}) => {
  const tokenBlacklist = require('../tokens/tokens.blacklist');

  // Blacklist the access token with exact remaining lifetime
  if (accessTokenJti) {
    const ttl = reqMeta.remainingTtl || 900;
    await tokenBlacklist.add(accessTokenJti, ttl);
  }

  // Revoke the refresh token
  if (refreshToken) {
    await tokenService.revokeRefreshToken(refreshToken);
  }

  if (reqMeta.userId) {
    await auditService.log({
      actorId: reqMeta.userId,
      actorEmail: reqMeta.userEmail,
      action: AUDIT_ACTIONS.USER_LOGOUT,
      resourceType: 'user',
      resourceId: reqMeta.userId,
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });
  }
};

/**
 * Durable worker for password reset dispatch.
 * Executes user lookup, token generation, Redis persistence, and email dispatch.
 * Delivery errors are not suppressed so that durable queue can retry upon failure.
 * Checkpoint prevents duplicate email delivery if subsequent audit step fails.
 *
 * @param {string} email
 * @param {Object} reqMeta
 * @param {Object} [job]
 */
const processForgotPasswordJob = async (email, reqMeta = {}, job = null) => {
  const result = await db.query(
    'SELECT id, email, first_name, last_name, password_hash FROM users WHERE email = $1',
    [email]
  );

  // Uniformly terminate if account does not exist (no email dispatched, no timing signal leaked)
  if (result.rows.length === 0) {
    return { status: 'ignored', reason: 'user_not_found' };
  }

  const user = result.rows[0];
  const idempotencyKey = job?.id ? `pwd_reset_${job.id}` : null;

  // Check structured delivery state: do NOT use bare checkpoint existence as proof of delivery
  let alreadyDelivered = false;
  if (job?.checkpoint && job.checkpoint.emailDelivered === true) {
    alreadyDelivered = true;
  } else if (job?.id) {
    try {
      const jobDataStr = await redis.get(`iam:jobs:${job.id}`);
      if (jobDataStr) {
        const jobData = JSON.parse(jobDataStr);
        if (jobData?.checkpoint?.emailDelivered === true) {
          alreadyDelivered = true;
        }
      }
    } catch {
      // Ignore cache check errors
    }
  }

  if (!alreadyDelivered) {
    const ttlSeconds = (PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || 15) * 60;

    // Dedicated secret, never the JWT signing key. Job id alone must not be sufficient.
    const resetSecret =
      config.passwordResetTokenSecret ||
      crypto
        .createHash('sha256')
        .update(`pwd-reset-secret:${config.mfa?.encryptionKey || 'aegis-fallback'}`)
        .digest('hex');

    const resetToken = job?.id
      ? crypto
          .createHmac('sha256', resetSecret)
          .update(`pwd-reset:${job.id}:${user.id}:${user.password_hash}`)
          .digest('hex')
      : generateRandomToken();

    const tokenHash = hashToken(resetToken);
    const redisKey = `${REDIS_PREFIXES.PASSWORD_RESET}${tokenHash}`;

    // Store reset token payload in ephemeral Redis store with non-reversible fencing token
    const fencingToken = crypto.createHash('sha256').update(user.password_hash).digest('hex');
    await redis.set(
      redisKey,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        fencingToken,
      }),
      'EX',
      ttlSeconds
    );

    const resetUrl = `${config.email.frontendUrl}/reset-password?token=${resetToken}`;
    const userName = user.first_name
      ? `${user.first_name} ${user.last_name || ''}`.trim()
      : user.email.split('@')[0];

    // Log only user identifier - NEVER log the raw bearer reset token or resetUrl
    logger.info(`Password reset dispatched for user ID [${user.id}]`);

    // Dispatch branded password reset email with single-source expiry minutes and durable idempotencyKey
    // Let retryable delivery failures throw so durable queue worker can retry
    await mailerService.sendPasswordResetEmail({
      toEmail: user.email,
      userName,
      resetUrl,
      expiryMinutes: PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
      idempotencyKey,
    });

    // Record delivery checkpoint strictly through queueService.checkpoint with claimToken fencing
    if (job?.id && typeof queueService.checkpoint === 'function') {
      await queueService.checkpoint(job.id, { emailDelivered: true }, job.claimToken);
    }
  }

  // Process audit log independently; failures are logged but do not retry email delivery
  try {
    await auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      resourceType: 'user',
      resourceId: user.id,
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });
  } catch (auditErr) {
    logger.error(
      `Audit logging failed for password reset request [${user.id}]: ${auditErr.message}`
    );
  }

  return { status: 'delivered', userId: user.id };
};

// Register worker with durable queue service
queueService.registerWorker('password-reset', async (payload, job) => {
  return await processForgotPasswordJob(payload.email, payload.reqMeta, job);
});

/**
 * Initiate password reset — enqueues an idempotent durable background job.
 * Submits work to durable Redis queue uniformly for all requests,
 * eliminating timing side channels while ensuring durability and retryability across server restarts.
 *
 * @param {string} email
 * @param {Object} reqMeta
 * @returns {Promise<void>}
 */
const forgotPassword = async (email, reqMeta = {}) => {
  await queueService.enqueue('password-reset', { email, reqMeta });
  return null;
};

/**
 * Complete password reset using an atomic claim-and-finalize protocol.
 * The token is claimed with a recoverable lease during password hashing and DB transaction.
 * Token is finalized (deleted) ONLY after all database operations succeed.
 *
 * @param {string} token - Reset token
 * @param {string} newPassword
 * @param {Object} reqMeta
 */
const resetPassword = async (token, newPassword, reqMeta = {}) => {
  const tokenHash = hashToken(token);
  const redisKey = `${REDIS_PREFIXES.PASSWORD_RESET}${tokenHash}`;
  const claimKey = `${redisKey}:claim`;
  const claimTtlSeconds = 60; // 60-second processing lease
  const claimId = generateRandomToken(16);

  // Phase 1: Atomic claim with unique claimId
  const tokenDataStr = await atomicClaimToken(redisKey, claimKey, claimId, claimTtlSeconds);

  if (!tokenDataStr) {
    throw AppError.badRequest('Invalid or expired reset token', 'AUTH_RESET_TOKEN_INVALID');
  }

  if (tokenDataStr === 'CLAIMED') {
    throw AppError.badRequest(
      'Password reset is currently being processed. Please retry shortly.',
      'AUTH_RESET_IN_PROGRESS'
    );
  }

  let tokenData;
  try {
    tokenData = JSON.parse(tokenDataStr);
  } catch {
    await atomicReleaseClaim(claimKey, claimId).catch(() => {});
    throw AppError.badRequest('Invalid reset token payload', 'AUTH_RESET_TOKEN_INVALID');
  }

  if (!tokenData || !tokenData.userId) {
    await atomicReleaseClaim(claimKey, claimId).catch(() => {});
    throw AppError.badRequest('Invalid reset token payload', 'AUTH_RESET_TOKEN_INVALID');
  }

  let claimLost = false;

  // Renew lease periodically while Argon2id hashing and DB transaction execute
  const renewInterval = setInterval(async () => {
    try {
      const renewed = await redis.eval(
        ATOMIC_RENEW_LEASE_LUA,
        1,
        claimKey,
        claimId,
        claimTtlSeconds
      );
      if (renewed !== 1) {
        claimLost = true;
      }
    } catch {
      claimLost = true;
    }
  }, 15000);

  if (typeof renewInterval.unref === 'function') {
    renewInterval.unref();
  }

  let isCommitted = false;

  // Phase 2: Operations with conditional recovery
  try {
    // Hash new password with Argon2id (Rule: Argon2id ONLY)
    const password_hash = await hashPassword(newPassword);

    // Atomic database operations in transaction: password update + session revocation
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Enforce claim ownership right before database commit
      if (claimLost) {
        throw AppError.conflict(
          'Password reset lease expired or was claimed by another session',
          'AUTH_CLAIM_LOST'
        );
      }

      const stillOwned = await atomicVerifyClaim(claimKey, claimId);
      if (stillOwned !== 1) {
        throw AppError.conflict(
          'Password reset claim ownership lost prior to commit',
          'AUTH_CLAIM_LOST'
        );
      }

      // Optimistic concurrency fencing: update only if user password_hash has not changed
      if (typeof tokenData.fencingToken !== 'string' || !tokenData.fencingToken) {
        throw AppError.badRequest('Invalid reset token payload', 'AUTH_RESET_TOKEN_INVALID');
      }

      const updateResult = await client.query(
        "UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $2 AND encode(digest(password_hash, 'sha256'), 'hex') = $3",
        [password_hash, tokenData.userId, tokenData.fencingToken]
      );

      if (updateResult.rowCount === 0) {
        throw AppError.conflict(
          'Password has already been modified by another session',
          'AUTH_PASSWORD_ALREADY_UPDATED'
        );
      }

      await client.query(
        'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false',
        [tokenData.userId]
      );

      await client.query('COMMIT');
      isCommitted = true;
    } catch (dbErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (opErr) {
    // Only release the claim if the database was NOT committed!
    // If commit succeeded, do NOT make the token retryable.
    if (!isCommitted) {
      await atomicReleaseClaim(claimKey, claimId).catch(() => {});
    }
    throw opErr;
  } finally {
    clearInterval(renewInterval);
  }

  // Phase 3: Finalize — permanently consume token and release claim upon full success
  try {
    await atomicFinalizeToken(redisKey, claimKey, claimId);
  } catch (finalizeErr) {
    logger.error(
      `Post-commit token finalization encountered Redis error for user [${tokenData.userId}]: ${finalizeErr.message}`
    );
  }

  try {
    await auditService.log({
      actorId: tokenData.userId,
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      resourceType: 'user',
      resourceId: tokenData.userId,
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });
  } catch (auditErr) {
    logger.error(
      `Audit logging failed for completed password reset [${tokenData.userId}]: ${auditErr.message}`
    );
  }
};

/**
 * Generate and dispatch an email verification token.
 * @param {string} userId
 * @param {Object} reqMeta
 * @returns {Promise<string>} Verification token
 */
const sendVerificationEmail = async (userId, reqMeta = {}) => {
  const result = await db.query(
    'SELECT id, email, first_name, last_name, is_email_verified FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  const user = result.rows[0];
  if (user.is_email_verified) {
    throw AppError.badRequest('Email is already verified', 'EMAIL_ALREADY_VERIFIED');
  }

  const verificationToken = generateRandomToken();
  const tokenHash = hashToken(verificationToken);
  const ttlSeconds = (EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS || 24) * 3600;
  const redisKey = `${REDIS_PREFIXES.EMAIL_VERIFICATION}${tokenHash}`;

  // Store verification token payload in ephemeral Redis store (24-hour TTL)
  await redis.set(
    redisKey,
    JSON.stringify({ userId: user.id, email: user.email }),
    'EX',
    ttlSeconds
  );

  const verificationUrl = `${config.email.frontendUrl}/verify-email?token=${verificationToken}`;
  const userName = user.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user.email.split('@')[0];

  await mailerService.sendVerificationEmail({
    toEmail: user.email,
    userName,
    verificationUrl,
  });

  await auditService.log({
    actorId: user.id,
    actorEmail: user.email,
    action: AUDIT_ACTIONS.EMAIL_VERIFICATION_REQUESTED,
    resourceType: 'user',
    resourceId: user.id,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return verificationToken;
};

/**
 * Server-side Lua script to atomically fetch and delete a key in a single Redis tick.
 * Guarantees zero race conditions even on Redis versions without native GETDEL support.
 */
const ATOMIC_GETDEL_LUA = `
  local val = redis.call('GET', KEYS[1])
  if val then
    redis.call('DEL', KEYS[1])
  end
  return val
`;

/**
 * Atomically retrieve and delete a Redis key (single-use token consumption).
 * @param {string} key
 * @returns {Promise<string|null>}
 */
const atomicGetDel = async (key) => {
  if (typeof redis.getdel === 'function') {
    try {
      return await redis.getdel(key);
    } catch {
      // Fallback to atomic Lua script if Redis server rejects GETDEL (e.g. Redis < 6.2)
      return await redis.eval(ATOMIC_GETDEL_LUA, 1, key);
    }
  }
  return await redis.eval(ATOMIC_GETDEL_LUA, 1, key);
};

/**
 * Server-side Lua script to atomically claim a reset token with a unique claim ownership identifier.
 * Verifies existence of the token key (KEYS[1]) and atomically acquires a leased claim lock (KEYS[2]).
 * ARGV[1] = claimId, ARGV[2] = claimTtlSeconds
 * Returns:
 * - nil: token does not exist or has expired
 * - 'CLAIMED': token is valid but currently claimed by another concurrent request
 * - string: token JSON payload upon successful claim
 */
const ATOMIC_CLAIM_TOKEN_LUA = `
  local val = redis.call('GET', KEYS[1])
  if not val then
    return nil
  end
  local acquired = redis.call('SET', KEYS[2], ARGV[1], 'NX', 'EX', ARGV[2])
  if not acquired then
    return 'CLAIMED'
  end
  return val
`;

/**
 * Server-side Lua script to renew a claim lease lock during processing.
 * Renews EXPIRE only if KEYS[1] is currently held by ARGV[1] (claimId).
 */
const ATOMIC_RENEW_LEASE_LUA = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('EXPIRE', KEYS[1], ARGV[2])
  else
    return 0
  end
`;

/**
 * Server-side Lua script to conditionally release a claim lock on transient pre-commit failure.
 * Deletes KEYS[1] (claimKey) ONLY if its value matches ARGV[1] (claimId).
 */
const ATOMIC_RELEASE_CLAIM_LUA = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
`;

/**
 * Server-side Lua script to finalize a reset token post-commit.
 * Deletes KEYS[1] (tokenKey) and KEYS[2] (claimKey) ONLY if KEYS[2] is held by ARGV[1] (claimId).
 */
const ATOMIC_FINALIZE_TOKEN_LUA = `
  if redis.call('GET', KEYS[2]) == ARGV[1] then
    redis.call('DEL', KEYS[1])
    redis.call('DEL', KEYS[2])
    return 1
  else
    return 0
  end
`;

/**
 * Server-side Lua script to verify claim ownership immediately before commit.
 * Returns 1 if KEYS[1] (claimKey) is currently owned by ARGV[1] (claimId), 0 otherwise.
 */
const ATOMIC_VERIFY_CLAIM_LUA = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return 1
  else
    return 0
  end
`;

/**
 * Atomically claim a token key in Redis with a leased lock to prevent concurrent consumption
 * while allowing recovery if downstream operations fail.
 * @param {string} key - Token Redis key
 * @param {string} claimKey - Lease lock Redis key
 * @param {string} claimId - Unique claim ownership identifier
 * @param {number} claimTtlSeconds - Lease TTL in seconds
 * @returns {Promise<string|null>}
 */
const atomicClaimToken = async (key, claimKey, claimId, claimTtlSeconds = 60) => {
  return await redis.eval(ATOMIC_CLAIM_TOKEN_LUA, 2, key, claimKey, claimId, claimTtlSeconds);
};

/**
 * Verify active claim ownership immediately before database commit.
 * @param {string} claimKey
 * @param {string} claimId
 * @returns {Promise<number>}
 */
const atomicVerifyClaim = async (claimKey, claimId) => {
  return await redis.eval(ATOMIC_VERIFY_CLAIM_LUA, 1, claimKey, claimId);
};

/**
 * Conditionally release a claim lock only if still owned by claimId.
 * @param {string} claimKey
 * @param {string} claimId
 * @returns {Promise<number>}
 */
const atomicReleaseClaim = async (claimKey, claimId) => {
  return await redis.eval(ATOMIC_RELEASE_CLAIM_LUA, 1, claimKey, claimId);
};

/**
 * Finalize token post-commit: deletes token key and conditionally releases claim.
 * @param {string} key
 * @param {string} claimKey
 * @param {string} claimId
 * @returns {Promise<number>}
 */
const atomicFinalizeToken = async (key, claimKey, claimId) => {
  return await redis.eval(ATOMIC_FINALIZE_TOKEN_LUA, 2, key, claimKey, claimId);
};

/**
 * Verify email token and activate verified status.
 * @param {string} token
 * @param {Object} reqMeta
 * @returns {Promise<{ user: Object }>}
 */
const verifyEmail = async (token, reqMeta = {}) => {
  const tokenHash = hashToken(token);
  const redisKey = `${REDIS_PREFIXES.EMAIL_VERIFICATION}${tokenHash}`;

  // Atomically retrieve and delete verification token (single-use consumption)
  const tokenDataStr = await atomicGetDel(redisKey);

  if (!tokenDataStr) {
    throw AppError.badRequest('Invalid or expired verification token', 'AUTH_VERIFY_TOKEN_INVALID');
  }

  let tokenData;
  try {
    tokenData = JSON.parse(tokenDataStr);
  } catch {
    throw AppError.badRequest('Invalid verification token payload', 'AUTH_VERIFY_TOKEN_INVALID');
  }

  // Update user as email verified
  await db.query('UPDATE users SET is_email_verified = true WHERE id = $1', [tokenData.userId]);

  const userResult = await db.query(
    'SELECT id, email, first_name, last_name, is_active, is_email_verified, mfa_enabled FROM users WHERE id = $1',
    [tokenData.userId]
  );

  if (userResult.rows.length === 0) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  const user = userResult.rows[0];

  await auditService.log({
    actorId: tokenData.userId,
    actorEmail: user.email,
    action: AUDIT_ACTIONS.EMAIL_VERIFIED,
    resourceType: 'user',
    resourceId: tokenData.userId,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { user };
};

/**
 * Initiate multi-step signup by verifying email is available and dispatching verification link.
 * @param {Object} params - { email }
 * @param {Object} reqMeta - { ip, userAgent }
 * @returns {Promise<{ email: string, dispatched: boolean }>}
 */
const initiateSignup = async ({ email }, reqMeta = {}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already registered
  const existing = await db.query('SELECT id, first_name FROM users WHERE email = $1', [
    normalizedEmail,
  ]);
  if (existing.rows.length > 0) {
    // Security & Anti-Enumeration: Return neutral response while informing legitimate account owner via email
    const existingUser = existing.rows[0];
    const safeName = existingUser.first_name || normalizedEmail.split('@')[0];
    const loginUrl = `${config.email.frontendUrl}/login`;
    const resetUrl = `${config.email.frontendUrl}/forgot-password`;

    try {
      if (typeof mailerService.sendAccountExistsEmail === 'function') {
        await mailerService.sendAccountExistsEmail({
          toEmail: normalizedEmail,
          userName: safeName,
          loginUrl,
          resetUrl,
        });
      }
    } catch (mailErr) {
      logger.error(
        `Failed to dispatch account exists notice to ${normalizedEmail}: ${mailErr.message}`
      );
    }

    await auditService.log({
      actorEmail: normalizedEmail,
      action: AUDIT_ACTIONS.EMAIL_VERIFICATION_REQUESTED,
      resourceType: 'signup',
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });

    return { email: normalizedEmail, dispatched: true };
  }

  // Generate cryptographic verification token
  const signupToken = generateRandomToken();
  const tokenHash = hashToken(signupToken);
  const ttlSeconds = (SIGNUP_TOKEN_EXPIRY_HOURS || 24) * 3600;
  const redisKey = `${REDIS_PREFIXES.SIGNUP_TOKEN}${tokenHash}`;

  // Store in Redis with TTL
  await redis.set(redisKey, JSON.stringify({ email: normalizedEmail }), 'EX', ttlSeconds);

  const verificationUrl = `${config.email.frontendUrl}/register?token=${signupToken}`;
  const safeName = normalizedEmail.split('@')[0];

  if (config.env === 'development') {
    logger.debug(`[SIGNUP DEV LINK] ${normalizedEmail} -> ${verificationUrl}`);
  }

  // Dispatch email with verification link.
  // Failures must not change the response shape, otherwise mail outages leak
  // whether the address is already registered.
  try {
    await mailerService.sendVerificationEmail({
      toEmail: normalizedEmail,
      userName: safeName,
      verificationUrl,
    });
  } catch (mailErr) {
    logger.error(`Failed to dispatch signup verification email: ${mailErr.message}`);
  }

  await auditService.log({
    actorEmail: normalizedEmail,
    action: AUDIT_ACTIONS.EMAIL_VERIFICATION_REQUESTED,
    resourceType: 'signup',
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { email: normalizedEmail, dispatched: true };
};

/**
 * Validate signup token from email link and generate a short-lived registration ticket.
 * @param {string} token
 * @returns {Promise<{ email: string, registrationTicket: string }>}
 */
const validateSignupToken = async (token) => {
  const tokenHash = hashToken(token);
  const redisKey = `${REDIS_PREFIXES.SIGNUP_TOKEN}${tokenHash}`;

  // Single-use atomic consumption of token
  const tokenDataStr = await atomicGetDel(redisKey);

  if (!tokenDataStr) {
    throw AppError.badRequest(
      'Invalid or expired verification link. Please request a new one.',
      'SIGNUP_TOKEN_INVALID'
    );
  }

  let tokenData;
  try {
    tokenData = JSON.parse(tokenDataStr);
  } catch {
    throw AppError.badRequest('Invalid verification token payload', 'SIGNUP_TOKEN_INVALID');
  }

  if (!tokenData || typeof tokenData.email !== 'string') {
    throw AppError.badRequest('Invalid verification token payload', 'SIGNUP_TOKEN_INVALID');
  }

  const { email } = tokenData;

  // Generate a registration ticket valid for 30 minutes to complete Step 3
  const registrationTicket = generateRandomToken();
  const ticketHash = hashToken(registrationTicket);
  const ticketTtl = (SIGNUP_TICKET_EXPIRY_MINUTES || 30) * 60;
  const ticketKey = `${REDIS_PREFIXES.SIGNUP_TICKET}${ticketHash}`;

  await redis.set(ticketKey, JSON.stringify({ email, verified: true }), 'EX', ticketTtl);

  return { email, registrationTicket };
};

/**
 * Complete signup (Step 3): create user with verified email and log them in.
 * @param {Object} params - { email, registrationTicket, name, password }
 * @param {Object} reqMeta - { ip, userAgent }
 * @returns {Promise<Object>} { user, accessToken, refreshToken }
 */
const completeSignup = async (payload, reqMeta = {}) => {
  const { email, name, password } = payload;
  const rawTicket = payload.registrationTicket || payload.registration_ticket;

  if (!rawTicket || typeof rawTicket !== 'string') {
    throw AppError.badRequest('Registration ticket is required', 'REGISTRATION_TICKET_INVALID');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const ticketHash = hashToken(rawTicket);
  const ticketKey = `${REDIS_PREFIXES.SIGNUP_TICKET}${ticketHash}`;

  // Single-use atomic consumption of registration ticket
  const ticketDataStr = await atomicGetDel(ticketKey);
  if (!ticketDataStr) {
    throw AppError.badRequest(
      'Registration session has expired or is invalid. Please start over by entering your email.',
      'REGISTRATION_TICKET_INVALID'
    );
  }

  let ticketData;
  try {
    ticketData = JSON.parse(ticketDataStr);
  } catch {
    throw AppError.badRequest(
      'Invalid registration session payload',
      'REGISTRATION_TICKET_INVALID'
    );
  }

  if (!ticketData || typeof ticketData.email !== 'string') {
    throw AppError.badRequest(
      'Invalid registration session payload',
      'REGISTRATION_TICKET_INVALID'
    );
  }

  if (ticketData.email.toLowerCase() !== normalizedEmail) {
    try {
      const ticketTtl = (SIGNUP_TICKET_EXPIRY_MINUTES || 30) * 60;
      await redis.set(ticketKey, ticketDataStr, 'EX', ticketTtl);
    } catch (_) {}
    throw AppError.badRequest('Email address does not match verified session', 'EMAIL_MISMATCH');
  }

  // Parse first and last name
  const parts = name.trim().split(/\s+/);
  const first_name = parts[0] || '';
  const last_name = parts.slice(1).join(' ') || '';

  let client;
  let user;

  try {
    // Hash password using Argon2id (Enterprise Standard)
    const password_hash = await hashPassword(password);

    if (typeof db.getClient === 'function') {
      client = await db.getClient();
      await client.query('BEGIN');
    }

    const executor = client || db;

    // Insert user directly with is_email_verified = true
    const result = await executor.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, is_email_verified)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, first_name, last_name, is_active, is_email_verified, mfa_enabled, created_at`,
      [normalizedEmail, password_hash, first_name || null, last_name || null]
    );

    user = result.rows[0];

    // Assign default 'user' role
    const roleResult = await executor.query('SELECT id FROM roles WHERE name = $1', [ROLES.USER]);
    if (roleResult.rows.length > 0) {
      await executor.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.id, roleResult.rows[0].id]
      );
    }

    if (client) {
      await client.query('COMMIT');
    }
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
    }

    // Preserve retryability if user creation failed before commit
    // (do not restore on permanent duplicate email constraint)
    if (err.code !== '23505') {
      try {
        const ticketTtl = (SIGNUP_TICKET_EXPIRY_MINUTES || 30) * 60;
        await redis.set(ticketKey, ticketDataStr, 'EX', ticketTtl);
      } catch (restoreErr) {
        logger.error('Failed to restore registration ticket state after failure:', restoreErr);
      }
    }

    if (err.code === '23505') {
      throw AppError.conflict('An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
    }
    throw err;
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }

  // Retrieve user roles and permissions
  const { roles, permissions } = await getUserRolesAndPermissions(user.id);

  // Issue session tokens (direct auto-login)
  const accessTokenData = tokenService.generateAccessToken(user, roles, permissions);
  const refreshTokenData = await tokenService.generateRefreshToken(user.id, null, 1);

  // Audit logs
  await auditService.log({
    actorId: user.id,
    actorEmail: user.email,
    action: AUDIT_ACTIONS.USER_REGISTERED,
    resourceType: 'user',
    resourceId: user.id,
    newData: { email: user.email, first_name, last_name, is_email_verified: true },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  await auditService.log({
    actorId: user.id,
    actorEmail: user.email,
    action: AUDIT_ACTIONS.EMAIL_VERIFIED,
    resourceType: 'user',
    resourceId: user.id,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_email_verified: user.is_email_verified,
      mfa_enabled: user.mfa_enabled,
      roles,
    },
    accessToken: accessTokenData.token,
    refreshToken: refreshTokenData.token,
    access_token: accessTokenData.token,
    refresh_token: refreshTokenData.token,
  };
};

// ── Helper Functions ────────────────────────────────

/**
 * Get user's roles and flattened permissions.
 * @param {string} userId
 * @returns {Promise<{ roles: string[], permissions: string[] }>}
 */
const getUserRolesAndPermissions = async (userId) => {
  const rolesResult = await db.query(
    `SELECT r.name FROM roles r
     INNER JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId]
  );

  const roles = rolesResult.rows.map((r) => r.name);

  const permsResult = await db.query(
    `SELECT DISTINCT p.name FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     INNER JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );

  const permissions = permsResult.rows.map((p) => p.name);

  return { roles, permissions };
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  processForgotPasswordJob,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  initiateSignup,
  validateSignupToken,
  completeSignup,
  getUserRolesAndPermissions,
};
