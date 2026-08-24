const { generateSecret, generateURI, verifySync } = require('otplib');
const db = require('../../config/database');
const config = require('../../config/index');
const { encrypt, decrypt, generateRandomToken } = require('../../utils/crypto');
const auditService = require('../audit/audit.service');
const AppError = require('../../utils/AppError');
const { AUDIT_ACTIONS } = require('../../config/constants');

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
const setup = async (userId) => {
  const userResult = await db.query(
    'SELECT id, email, mfa_enabled FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw AppError.notFound('User not found');
  }

  if (userResult.rows[0].mfa_enabled) {
    throw AppError.badRequest('MFA is already enabled', 'MFA_ALREADY_ENABLED');
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
  const encryptedBackupCodes = encrypt(
    JSON.stringify(backupCodes),
    config.mfa.encryptionKey
  );

  await db.query(
    'UPDATE users SET mfa_secret = $1, mfa_backup_codes = $2 WHERE id = $3',
    [encryptedSecret, encryptedBackupCodes, userId]
  );

  return { secret, otpauthUrl, backupCodes };
};

/**
 * Verify a TOTP code and activate MFA.
 * @param {string} userId
 * @param {string} code - 6-digit TOTP code
 * @param {Object} reqMeta
 * @returns {Promise<boolean>}
 */
const verify = async (userId, code, reqMeta = {}) => {
  const userResult = await db.query(
    'SELECT id, email, mfa_secret, mfa_enabled FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw AppError.notFound('User not found');
  }

  const user = userResult.rows[0];

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

  // Activate MFA
  if (!user.mfa_enabled) {
    await db.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId]);

    await auditService.log({
      actorId: userId,
      actorEmail: user.email,
      action: AUDIT_ACTIONS.MFA_ENABLED,
      resourceType: 'user',
      resourceId: userId,
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });
  }

  return true;
};

/**
 * Validate a TOTP code during login flow.
 * @param {string} userId
 * @param {string} code
 * @returns {Promise<boolean>}
 */
const validate = async (userId, code) => {
  const userResult = await db.query(
    'SELECT mfa_secret, mfa_enabled, mfa_backup_codes FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0 || !userResult.rows[0].mfa_enabled) {
    throw AppError.badRequest('MFA is not enabled', 'MFA_NOT_ENABLED');
  }

  const user = userResult.rows[0];
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
    const backupCodes = JSON.parse(
      decrypt(user.mfa_backup_codes, config.mfa.encryptionKey)
    );
    const codeIndex = backupCodes.indexOf(code.toUpperCase());

    if (codeIndex !== -1) {
      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      const encryptedBackupCodes = encrypt(
        JSON.stringify(backupCodes),
        config.mfa.encryptionKey
      );
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

module.exports = {
  setup,
  verify,
  validate,
  disable,
};
