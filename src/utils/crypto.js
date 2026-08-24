const argon2 = require('argon2');
const crypto = require('crypto');

/**
 * Crypto utilities for password hashing and tamper-evidence checksums.
 */

// ── Argon2 Password Hashing ────────────────────────

/**
 * Hash a plaintext password using Argon2id.
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} - Argon2 hash string
 */
const hashPassword = async (password) => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
};

/**
 * Verify a plaintext password against an Argon2 hash.
 * @param {string} hash - Stored Argon2 hash
 * @param {string} password - Plaintext password to verify
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (hash, password) => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

// ── SHA-256 Checksums (Audit Tamper-Evidence) ──────

/**
 * Generate a SHA-256 checksum for audit log tamper evidence.
 * Chains the current record with the previous checksum for integrity.
 * @param {Object} params
 * @param {string} params.action
 * @param {string|null} params.actorId
 * @param {string|null} params.resourceId
 * @param {string} params.timestamp
 * @param {string} params.previousChecksum - Previous record's checksum (empty string for first record)
 * @returns {string} - SHA-256 hex digest
 */
const generateAuditChecksum = ({ action, actorId, resourceId, timestamp, previousChecksum = '' }) => {
  const payload = `${action}|${actorId || ''}|${resourceId || ''}|${timestamp}|${previousChecksum}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

// ── Token Generation ────────────────────────────────

/**
 * Generate a cryptographically secure random token.
 * @param {number} [bytes=32] - Number of random bytes
 * @returns {string} - Hex-encoded token
 */
const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a token using SHA-256 for storage.
 * We never store raw tokens — only their hashes.
 * @param {string} token - Raw token
 * @returns {string} - SHA-256 hex digest
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ── MFA Secret Encryption ───────────────────────────

/**
 * Encrypt a TOTP secret for storage at rest.
 * Uses AES-256-GCM with a random IV.
 * @param {string} text - Plaintext secret
 * @param {string} key - Encryption key (32+ chars)
 * @returns {string} - Encrypted string in format: iv:authTag:ciphertext (all hex)
 */
const encrypt = (text, key) => {
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt an AES-256-GCM encrypted string.
 * @param {string} encryptedText - Format: iv:authTag:ciphertext (all hex)
 * @param {string} key - Encryption key (same key used to encrypt)
 * @returns {string} - Decrypted plaintext
 */
const decrypt = (encryptedText, key) => {
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  const [ivHex, authTagHex, ciphertext] = encryptedText.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateAuditChecksum,
  generateRandomToken,
  hashToken,
  encrypt,
  decrypt,
};
