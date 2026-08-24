/**
 * Standardized API response formatter.
 * Every endpoint returns the same JSON shape for consistency.
 *
 * Success: { success: true, statusCode, message, data, meta }
 * Error:   { success: false, statusCode, message, errors }
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {Object} options
 * @param {number} [options.statusCode=200]
 * @param {string} [options.message='Success']
 * @param {*} [options.data=null]
 * @param {Object} [options.meta=null] - Pagination, etc.
 */
const success = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const response = {
    success: true,
    statusCode,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a created (201) response.
 */
const created = (res, { message = 'Created successfully', data = null } = {}) => {
  return success(res, { statusCode: 201, message, data });
};

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {Object} options
 * @param {number} [options.statusCode=500]
 * @param {string} [options.message='Internal server error']
 * @param {string} [options.code='INTERNAL_ERROR']
 * @param {Array} [options.errors=[]]
 */
const error = (res, { statusCode = 500, message = 'Internal server error', code = 'INTERNAL_ERROR', errors = [] } = {}) => {
  const response = {
    success: false,
    statusCode,
    message,
    code,
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a paginated response.
 */
const paginated = (res, { data, page, limit, total, message = 'Success' } = {}) => {
  return success(res, {
    message,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

module.exports = {
  success,
  created,
  error,
  paginated,
};
