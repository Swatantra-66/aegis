const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/index');
const db = require('../../config/database');
const { hashToken } = require('../../utils/crypto');
const logger = require('../../utils/logger');

/**
 * Token Service — JWT issuance, refresh token rotation, and validation.
 */

/**
 * Generate a short-lived JWT access token.
 * @param {Object} user - User object with id, email
 * @param {string[]} roles - Array of role names
 * @param {string[]} permissions - Array of permission strings
 * @returns {{ token: string, jti: string }}
 */
const generateAccessToken = (user, roles = [], permissions = []) => {
  const jti = uuidv4();
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
      jti,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiry }
  );

  return { token, jti };
};

/**
 * Generate a long-lived refresh token and store its hash in the database.
 * Implements token family tracking for rotation detection.
 * @param {string} userId
 * @param {string|null} familyId - Existing family ID (for rotation) or null (new family)
 * @returns {Promise<{ token: string, familyId: string }>}
 */
const generateRefreshToken = async (userId, familyId = null) => {
  const token = uuidv4();
  const tokenHash = hashToken(token);
  const newFamilyId = familyId || uuidv4();

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, newFamilyId, expiresAt]
  );

  return { token, familyId: newFamilyId };
};

/**
 * Verify a JWT access token.
 * Does NOT check blacklist — that's handled by the authenticate middleware.
 * @param {string} token
 * @returns {Object} Decoded payload
 * @throws {jwt.JsonWebTokenError|jwt.TokenExpiredError}
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

/**
 * Validate and rotate a refresh token.
 * Implements token rotation with family-based reuse detection:
 * - If token is valid → revoke old, issue new
 * - If token was already used (reuse detected) → revoke ENTIRE family
 *
 * @param {string} token - Raw refresh token
 * @returns {Promise<{ userId: string, familyId: string } | null>}
 */
const rotateRefreshToken = async (token) => {
  const tokenHash = hashToken(token);

  // Find the token
  const result = await db.query(
    `SELECT id, user_id, family_id, revoked, expires_at
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null; // Token not found
  }

  const storedToken = result.rows[0];

  // Check if token was already revoked (REUSE DETECTED!)
  if (storedToken.revoked) {
    logger.warn('Refresh token reuse detected! Revoking entire family.', {
      familyId: storedToken.family_id,
      userId: storedToken.user_id,
    });

    // Revoke ALL tokens in this family
    await db.query(
      'UPDATE refresh_tokens SET revoked = true WHERE family_id = $1',
      [storedToken.family_id]
    );

    return null;
  }

  // Check expiry
  if (new Date(storedToken.expires_at) < new Date()) {
    return null; // Token expired
  }

  // Revoke the current token (it's been used)
  await db.query(
    'UPDATE refresh_tokens SET revoked = true WHERE id = $1',
    [storedToken.id]
  );

  return {
    userId: storedToken.user_id,
    familyId: storedToken.family_id,
  };
};

/**
 * Revoke all refresh tokens for a user (logout from all devices).
 * @param {string} userId
 */
const revokeAllUserTokens = async (userId) => {
  await db.query(
    'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false',
    [userId]
  );
};

/**
 * Revoke a specific refresh token by its raw value.
 * @param {string} token - Raw refresh token
 */
const revokeRefreshToken = async (token) => {
  const tokenHash = hashToken(token);
  await db.query(
    'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
    [tokenHash]
  );
};

/**
 * Clean up expired refresh tokens (housekeeping).
 */
const cleanupExpiredTokens = async () => {
  const result = await db.query(
    'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = true'
  );
  logger.info(`Cleaned up ${result.rowCount} expired/revoked refresh tokens`);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  rotateRefreshToken,
  revokeAllUserTokens,
  revokeRefreshToken,
  cleanupExpiredTokens,
};
