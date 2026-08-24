const { Router } = require('express');
const rolesController = require('./roles.controller');
const rolesValidator = require('./roles.validator');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const catchAsync = require('../../middleware/asyncWrapper');
const { validateParams } = require('../users/users.validator');

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/roles/permissions:
 *   get:
 *     tags: [RBAC]
 *     summary: List all available permissions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Permissions list }
 */
router.get(
  '/permissions',
  authorize('role:read'),
  catchAsync(rolesController.listPermissions)
);

/**
 * @openapi
 * /api/v1/roles:
 *   post:
 *     tags: [RBAC]
 *     summary: Create a new role
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "editor" }
 *               description: { type: string }
 *     responses:
 *       201: { description: Role created }
 *       409: { description: Role name already exists }
 */
router.post(
  '/',
  authorize('role:create'),
  rolesValidator.validate(rolesValidator.createRole),
  catchAsync(rolesController.createRole)
);

/**
 * @openapi
 * /api/v1/roles:
 *   get:
 *     tags: [RBAC]
 *     summary: List all roles with permissions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Roles list }
 */
router.get(
  '/',
  authorize('role:read'),
  catchAsync(rolesController.listRoles)
);

/**
 * @openapi
 * /api/v1/roles/{id}:
 *   get:
 *     tags: [RBAC]
 *     summary: Get role by ID
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/:id',
  authorize('role:read'),
  validateParams(rolesValidator.roleId),
  catchAsync(rolesController.getRoleById)
);

/**
 * @openapi
 * /api/v1/roles/{id}:
 *   patch:
 *     tags: [RBAC]
 *     summary: Update a role
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/:id',
  authorize('role:update'),
  validateParams(rolesValidator.roleId),
  rolesValidator.validate(rolesValidator.updateRole),
  catchAsync(rolesController.updateRole)
);

/**
 * @openapi
 * /api/v1/roles/{id}:
 *   delete:
 *     tags: [RBAC]
 *     summary: Delete a role (system roles protected)
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/:id',
  authorize('role:delete'),
  validateParams(rolesValidator.roleId),
  catchAsync(rolesController.deleteRole)
);

/**
 * @openapi
 * /api/v1/roles/{id}/permissions:
 *   post:
 *     tags: [RBAC]
 *     summary: Assign permissions to a role
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/:id/permissions',
  authorize('role:update'),
  validateParams(rolesValidator.roleId),
  rolesValidator.validate(rolesValidator.assignPermissions),
  catchAsync(rolesController.assignPermissions)
);

/**
 * @openapi
 * /api/v1/roles/{id}/permissions:
 *   delete:
 *     tags: [RBAC]
 *     summary: Remove permissions from a role
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/:id/permissions',
  authorize('role:update'),
  validateParams(rolesValidator.roleId),
  rolesValidator.validate(rolesValidator.removePermissions),
  catchAsync(rolesController.removePermissions)
);

/**
 * @openapi
 * /api/v1/users/{userId}/roles:
 *   post:
 *     tags: [RBAC]
 *     summary: Assign a role to a user
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/users/:userId/roles',
  authorize('role:update'),
  rolesValidator.validate(rolesValidator.userRoleBody),
  catchAsync(rolesController.assignRoleToUser)
);

/**
 * @openapi
 * /api/v1/users/{userId}/roles/{roleId}:
 *   delete:
 *     tags: [RBAC]
 *     summary: Remove a role from a user
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/users/:userId/roles/:roleId',
  authorize('role:update'),
  catchAsync(rolesController.removeRoleFromUser)
);

module.exports = router;
