const Joi = require('joi');
const { validate } = require('../auth/auth.validator');

const createRole = Joi.object({
  name: Joi.string().max(100).trim().required().messages({
    'any.required': 'Role name is required',
  }),
  description: Joi.string().max(500).trim().optional(),
});

const updateRole = Joi.object({
  name: Joi.string().max(100).trim().optional(),
  description: Joi.string().max(500).trim().optional().allow(''),
}).min(1);

const assignPermissions = Joi.object({
  permission_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one permission ID is required',
      'any.required': 'permission_ids array is required',
    }),
});

const removePermissions = Joi.object({
  permission_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required(),
});

const roleId = Joi.object({
  id: Joi.string().uuid().required(),
});

const userRoleParams = Joi.object({
  userId: Joi.string().uuid().required(),
});

const userRoleBody = Joi.object({
  role_id: Joi.string().uuid().required(),
});

const removeUserRoleParams = Joi.object({
  userId: Joi.string().uuid().required(),
  roleId: Joi.string().uuid().required(),
});

module.exports = {
  createRole,
  updateRole,
  assignPermissions,
  removePermissions,
  roleId,
  userRoleParams,
  userRoleBody,
  removeUserRoleParams,
  validate,
};
