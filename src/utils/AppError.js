/**
 * Custom application error class.
 * Extends Error with HTTP status code, error code, and operational flag.
 *
 * Operational errors (isOperational=true) are expected errors like validation failures.
 * Programming errors (isOperational=false) are bugs that should be logged and investigated.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {Object} options
   * @param {string} [options.code] - Machine-readable error code (e.g., 'AUTH_INVALID_CREDENTIALS')
   * @param {boolean} [options.isOperational=true] - Whether this is an expected error
   * @param {Array} [options.errors] - Array of specific error details
   */
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = options.code || 'INTERNAL_ERROR';
    this.isOperational = options.isOperational !== undefined ? options.isOperational : true;
    this.errors = options.errors || [];

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Factory methods for common errors ────────────

  static badRequest(message, code = 'BAD_REQUEST', errors = []) {
    return new AppError(message, 400, { code, errors });
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, { code });
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(message, 403, { code });
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(message, 404, { code });
  }

  static conflict(message, code = 'CONFLICT') {
    return new AppError(message, 409, { code });
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMIT_EXCEEDED') {
    return new AppError(message, 429, { code });
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, { code, isOperational: false });
  }
}

module.exports = AppError;
