const Joi = require('joi');
const { PAGINATION } = require('../../config/constants');
const { validate } = require('../auth/auth.validator');

const listUsers = Joi.object({
  page: Joi.number().integer().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: Joi.number().integer().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  search: Joi.string().max(100).trim().optional(),
  is_active: Joi.boolean().optional(),
  mfa_enabled: Joi.boolean().optional(),
});

const updateUser = Joi.object({
  first_name: Joi.string().max(100).trim().optional(),
  last_name: Joi.string().max(100).trim().allow('', null).optional(),
  is_active: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

const userId = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid user ID format',
    'any.required': 'User ID is required',
  }),
});

/**
 * Middleware: validate query params.
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const err = new Error('Validation failed');
      err.isJoi = true;
      err.details = error.details;
      return next(err);
    }
    req.query = value;
    next();
  };
};

/**
 * Middleware: validate route params.
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const err = new Error('Validation failed');
      err.isJoi = true;
      err.details = error.details;
      return next(err);
    }
    req.params = value;
    next();
  };
};

module.exports = {
  listUsers,
  updateUser,
  userId,
  validate,
  validateQuery,
  validateParams,
};
