const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');
const { RATE_LIMITS } = require('../config/constants');

/**
 * Rate limiter factory.
 * Creates Express rate limiters with configurable windows and limits.
 * Uses in-memory store (production should use rate-limit-redis).
 */

/**
 * Create a rate limiter middleware.
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per window
 * @param {string} [options.message] - Error message
 * @param {Function} [options.keyGenerator] - Custom key generator
 * @returns {Function} Express middleware
 */
const createLimiter = ({ windowMs, max, message, keyGenerator }) => {
  const options = {
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
    message: {
      success: false,
      statusCode: 429,
      message: message || 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    handler: (req, res, next, opts) => {
      next(
        AppError.tooManyRequests(
          opts.message.message || 'Too many requests'
        )
      );
    },
  };

  if (keyGenerator) {
    options.keyGenerator = keyGenerator;
  }

  return rateLimit(options);
};

// ── Pre-configured limiters ──────────────────────

/**
 * Auth endpoints (login/register): 5 req / 15 min per IP
 */
const authLimiter = createLimiter({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  message: 'Too many authentication attempts, please try again later',
});

/**
 * Password reset: 3 req / hour per IP
 */
const passwordResetLimiter = createLimiter({
  windowMs: RATE_LIMITS.PASSWORD_RESET.windowMs,
  max: RATE_LIMITS.PASSWORD_RESET.max,
  message: 'Too many password reset attempts, please try again later',
});

/**
 * Authenticated API: 100 req / min per user
 */
const apiLimiter = createLimiter({
  windowMs: RATE_LIMITS.API_AUTHENTICATED.windowMs,
  max: RATE_LIMITS.API_AUTHENTICATED.max,
  keyGenerator: (req) => req.user?.id || req.ip,
});

/**
 * Admin API: 200 req / min per user
 */
const adminLimiter = createLimiter({
  windowMs: RATE_LIMITS.API_ADMIN.windowMs,
  max: RATE_LIMITS.API_ADMIN.max,
  keyGenerator: (req) => req.user?.id || req.ip,
});

module.exports = {
  createLimiter,
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  adminLimiter,
};
