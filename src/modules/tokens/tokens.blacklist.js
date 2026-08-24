const { redis } = require('../../config/redis');
const { REDIS_PREFIXES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * Redis-backed token blacklist.
 * When an access token is revoked (e.g., logout), its JTI is stored
 * in Redis with a TTL matching the token's remaining lifetime.
 *
 * The authenticate middleware checks this blacklist on every request.
 */

/**
 * Add a token's JTI to the blacklist.
 * @param {string} jti - JWT ID from the access token
 * @param {number} expiresInSeconds - Remaining lifetime in seconds
 */
const add = async (jti, expiresInSeconds) => {
  const key = `${REDIS_PREFIXES.TOKEN_BLACKLIST}${jti}`;
  await redis.setex(key, expiresInSeconds, '1');
  logger.debug(`Token blacklisted: ${jti} (expires in ${expiresInSeconds}s)`);
};

/**
 * Check if a token's JTI is blacklisted.
 * @param {string} jti - JWT ID to check
 * @returns {Promise<boolean>} - true if blacklisted
 */
const isBlacklisted = async (jti) => {
  const key = `${REDIS_PREFIXES.TOKEN_BLACKLIST}${jti}`;
  const result = await redis.get(key);
  return result !== null;
};

/**
 * Remove a JTI from the blacklist (rarely needed).
 * @param {string} jti
 */
const remove = async (jti) => {
  const key = `${REDIS_PREFIXES.TOKEN_BLACKLIST}${jti}`;
  await redis.del(key);
};

module.exports = {
  add,
  isBlacklisted,
  remove,
};
