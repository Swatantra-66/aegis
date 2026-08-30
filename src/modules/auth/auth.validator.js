const Joi = require('joi');
const { PASSWORD_MIN_LENGTH } = require('../../config/constants');

/**
 * Validation schemas for authentication endpoints.
 * Using Joi for strict, declarative input validation.
 */

const register = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string()
    .min(PASSWORD_MIN_LENGTH)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
    .messages({
      'string.min': `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)',
      'any.required': 'Password is required',
    }),
  first_name: Joi.string().max(100).trim().optional(),
  last_name: Joi.string().max(100).trim().optional(),
});

const login = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
  mfa_code: Joi.string().length(6).pattern(/^\d+$/).optional().messages({
    'string.length': 'MFA code must be exactly 6 digits',
    'string.pattern.base': 'MFA code must contain only digits',
  }),
  remember_me: Joi.boolean().optional(),
});

const refreshToken = Joi.object({
  refresh_token: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid refresh token format',
    'any.required': 'Refresh token is required',
  }),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().required().lowercase().trim().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

const resetPassword = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  password: Joi.string()
    .min(PASSWORD_MIN_LENGTH)
    .max(128)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
    .messages({
      'string.min': `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)',
      'any.required': 'New password is required',
    }),
});

/**
 * Middleware factory: validate request body against a Joi schema.
 * @param {Joi.ObjectSchema} schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const err = new Error('Validation failed');
      err.isJoi = true;
      err.details = error.details;
      return next(err);
    }

    // Replace body with validated/sanitized values
    req.body = value;
    next();
  };
};

module.exports = {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  validate,
};
