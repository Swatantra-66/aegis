const { rateLimit, MemoryStore } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redis } = require('../config/redis');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { RATE_LIMITS } = require('../config/constants');

/**
 * Resilient Redis Store for express-rate-limit.
 * Uses Redis (rate-limit-redis) when reachable for cross-instance synchronization,
 * and seamlessly falls back to MemoryStore when offline, during reconnection, or in tests.
 */
class ResilientRedisStore {
  /**
   * @param {string} prefix - Key prefix for Redis store namespace
   */
  constructor(prefix) {
    this.prefix = prefix;
    this.memoryStore = new MemoryStore();
    this.redisStore = null;
    this.initOptions = null;
  }

  init(options) {
    this.initOptions = options;
    this.memoryStore.init(options);
    this._tryInitRedisStore();

    // Dynamically wire RedisStore as soon as Redis connects or reconnects
    if (process.env.NODE_ENV !== 'test') {
      redis.on('ready', () => {
        this._tryInitRedisStore();
      });
    }
  }

  _tryInitRedisStore() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    if (redis.status !== 'ready') {
      return;
    }
    if (this.redisStore) {
      return;
    }

    try {
      this.redisStore = new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: `rl:${this.prefix}:`,
      });
      if (this.initOptions) {
        this.redisStore.init(this.initOptions);
      }
      logger.info(`Redis rate-limit store activated for [rl:${this.prefix}:]`);
    } catch (err) {
      logger.warn(`Failed to initialize RedisStore for [${this.prefix}]: ${err.message}`);
      this.redisStore = null;
    }
  }

  async increment(key) {
    if (this.redisStore && redis.status === 'ready') {
      try {
        return await this.redisStore.increment(key);
      } catch (err) {
        logger.warn(
          `Redis rate-limit increment error (${this.prefix}), falling back to memory: ${err.message}`
        );
        return this.memoryStore.increment(key);
      }
    }
    return this.memoryStore.increment(key);
  }

  async decrement(key) {
    if (this.redisStore && redis.status === 'ready') {
      try {
        return await this.redisStore.decrement(key);
      } catch {
        return this.memoryStore.decrement(key);
      }
    }
    return this.memoryStore.decrement(key);
  }

  async resetKey(key) {
    if (this.redisStore && redis.status === 'ready') {
      try {
        return await this.redisStore.resetKey(key);
      } catch {
        return this.memoryStore.resetKey(key);
      }
    }
    return this.memoryStore.resetKey(key);
  }

  async get(key) {
    if (this.redisStore && redis.status === 'ready') {
      try {
        return await this.redisStore.get(key);
      } catch {
        return this.memoryStore.get(key);
      }
    }
    return this.memoryStore.get(key);
  }
}

/**
 * Create a rate limiter middleware.
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per window
 * @param {string} [options.message] - Error message
 * @param {Function} [options.keyGenerator] - Custom key generator
 * @param {string} [options.prefix] - Redis key prefix
 * @returns {Function} Express middleware
 */
const createLimiter = ({ windowMs, max, message, keyGenerator, prefix = 'general' }) => {
  const options = {
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    passOnStoreError: true, // Fail-open on unexpected store error to guarantee zero 500s
    store: new ResilientRedisStore(prefix),
    validate: { keyGeneratorIpFallback: false },
    message: {
      success: false,
      statusCode: 429,
      message: message || 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    handler: (req, res, next, opts) => {
      next(AppError.tooManyRequests(opts.message.message || 'Too many requests'));
    },
  };

  if (keyGenerator) {
    options.keyGenerator = keyGenerator;
  }

  return rateLimit(options);
};

// Pre-configured limiters

/**
 * Auth endpoints (login/register): 5 req / 15 min per IP
 */
const authLimiter = createLimiter({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  message: 'Too many authentication attempts, please try again later',
  prefix: 'auth',
});

/**
 * Password reset: 3 req / hour per IP
 */
const passwordResetLimiter = createLimiter({
  windowMs: RATE_LIMITS.PASSWORD_RESET.windowMs,
  max: RATE_LIMITS.PASSWORD_RESET.max,
  message: 'Too many password reset attempts, please try again later',
  prefix: 'pw_reset',
});

/**
 * Authenticated API: 100 req / min per user
 */
const apiLimiter = createLimiter({
  windowMs: RATE_LIMITS.API_AUTHENTICATED.windowMs,
  max: RATE_LIMITS.API_AUTHENTICATED.max,
  keyGenerator: (req) => req.user?.id || req.ip,
  prefix: 'api',
});

/**
 * Admin API: 200 req / min per user
 */
const adminLimiter = createLimiter({
  windowMs: RATE_LIMITS.API_ADMIN.windowMs,
  max: RATE_LIMITS.API_ADMIN.max,
  keyGenerator: (req) => req.user?.id || req.ip,
  prefix: 'admin',
});

module.exports = {
  createLimiter,
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  adminLimiter,
};
