/**
 * Async wrapper for Express route handlers.
 * Catches rejected promises and forwards them to the centralized error handler.
 *
 * Usage: router.get('/path', catchAsync(async (req, res) => { ... }));
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped handler that catches errors
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
