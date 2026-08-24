const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

/**
 * Redis client with retry strategy and error handling.
 * Used for token blacklisting, rate limiting, and session caching.
 */
const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    logger.warn(`Redis reconnecting... attempt ${times}, delay ${delay}ms`);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconnect on READONLY errors (failover)
    }
    return false;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis error:', err.message);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

/**
 * Health check — verifies Redis is reachable.
 * @returns {Promise<boolean>}
 */
const healthCheck = async () => {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
};

/**
 * Gracefully close the Redis connection.
 */
const close = async () => {
  await redis.quit();
  logger.info('Redis connection closed');
};

module.exports = {
  redis,
  healthCheck,
  close,
};
