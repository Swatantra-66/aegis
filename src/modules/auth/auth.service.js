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

  // Blacklist the access token (TTL = 15 min max)
  if (accessTokenJti) {
    await tokenBlacklist.add(accessTokenJti, 900); // 15 minutes
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
 * Initiate password reset — generate token and store in database.
 * Always returns success to prevent user enumeration.
 *
 * @param {string} email
 * @param {Object} reqMeta
 * @returns {Promise<string>} Reset token (in dev only; in prod would email)
 */
const forgotPassword = async (email, reqMeta = {}) => {
  const result = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);

  // Always return success (prevent user enumeration)
  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  const resetToken = generateRandomToken();
  const tokenHash = hashToken(resetToken);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15-minute lifetime

  // Store reset token in refresh_tokens table under dedicated family UUID
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [user.id, tokenHash, '00000000-0000-0000-0000-000000000000', expiresAt]
  );

  await auditService.log({
    actorId: user.id,
    actorEmail: user.email,
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    resourceType: 'user',
    resourceId: user.id,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return resetToken; // In production, this would be emailed, not returned
};

/**
 * Complete password reset.
 * @param {string} token - Reset token
 * @param {string} newPassword
 * @param {Object} reqMeta
 */
const resetPassword = async (token, newPassword, reqMeta = {}) => {
  const tokenHash = hashToken(token);

  const result = await db.query(
    `SELECT id, user_id, expires_at, revoked FROM refresh_tokens
     WHERE token_hash = $1 AND family_id = '00000000-0000-0000-0000-000000000000'`,
    [tokenHash]
  );

  if (result.rows.length === 0 || result.rows[0].revoked) {
    throw AppError.badRequest('Invalid or expired reset token', 'AUTH_RESET_TOKEN_INVALID');
  }

  const tokenRecord = result.rows[0];

  if (new Date(tokenRecord.expires_at) < new Date()) {
    throw AppError.badRequest('Reset token has expired', 'AUTH_RESET_TOKEN_EXPIRED');
  }

  // Hash new password and update
  const password_hash = await hashPassword(newPassword);
  await db.query(
    'UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2',
    [password_hash, tokenRecord.user_id]
  );

  // Revoke the reset token
  await db.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [tokenRecord.id]);

  // Revoke all existing refresh tokens (force re-login everywhere)
  await tokenService.revokeAllUserTokens(tokenRecord.user_id);

  await auditService.log({
    actorId: tokenRecord.user_id,
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    resourceType: 'user',
    resourceId: tokenRecord.user_id,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
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

  // Dispatch email with verification link
  await mailerService.sendVerificationEmail({
    toEmail: normalizedEmail,
    userName: safeName,
    verificationUrl,
  });

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
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  initiateSignup,
  validateSignupToken,
  completeSignup,
  getUserRolesAndPermissions,
};
