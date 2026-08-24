const AppError = require('../utils/AppError');
const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Centralized error handling middleware.
 * All errors — thrown, rejected, or passed via next() — end up here.
 *
 * - Operational errors (AppError): return structured JSON to client
 * - Programming errors: log full stack, return generic 500
 * - Joi validation errors: extract messages, return 400
 * - PostgreSQL errors: map to appropriate HTTP status
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  let errors = err.errors || [];

  // ── Joi Validation Error ─────────────────────────
  if (err.isJoi || err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    errors = err.details
      ? err.details.map((d) => d.message.replace(/"/g, ''))
      : [err.message];
  }

  // ── PostgreSQL Errors ────────────────────────────
  if (err.code === '23505') {
    // Unique constraint violation
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'A resource with this value already exists';
  } else if (err.code === '23503') {
    // Foreign key violation
    statusCode = 400;
    code = 'FOREIGN_KEY_VIOLATION';
    message = 'Referenced resource does not exist';
  } else if (err.code === '23502') {
    // Not-null violation
    statusCode = 400;
    code = 'MISSING_REQUIRED_FIELD';
    message = 'A required field is missing';
  }

  // ── JWT Errors ───────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // ── Log the error ────────────────────────────────
  if (statusCode >= 500) {
    // Server errors get full stack trace logging
    logger.error(`${code}: ${message}`, {
      statusCode,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  } else {
    // Client errors get a warning log
    logger.warn(`${code}: ${message}`, {
      statusCode,
      url: req.originalUrl,
      method: req.method,
    });
  }

  // ── Send response ───────────────────────────────
  return apiResponse.error(res, {
    statusCode,
    message,
    code,
    errors,
  });
};

module.exports = errorHandler;
