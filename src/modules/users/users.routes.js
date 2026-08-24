const { Router } = require('express');
const usersController = require('./users.controller');
const usersValidator = require('./users.validator');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const catchAsync = require('../../middleware/asyncWrapper');
const { apiLimiter } = require('../../middleware/rateLimiter');

const router = Router();

// All user routes require authentication
router.use(authenticate);
router.use(apiLimiter);

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile retrieved }
 *       401: { description: Not authenticated }
 */
router.get('/me', catchAsync(usersController.getMe));

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Users list with pagination }
 *       403: { description: Insufficient permissions }
 */
router.get(
  '/',
  authorize('user:read'),
  usersValidator.validateQuery(usersValidator.listUsers),
  catchAsync(usersController.listUsers)
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User details }
 *       404: { description: User not found }
 */
router.get(
  '/:id',
  authorize('user:read'),
  usersValidator.validateParams(usersValidator.userId),
  catchAsync(usersController.getUserById)
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user profile
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               is_active: { type: boolean }
 *     responses:
 *       200: { description: User updated }
 *       404: { description: User not found }
 */
router.patch(
  '/:id',
  authorize('user:update'),
  usersValidator.validateParams(usersValidator.userId),
  usersValidator.validate(usersValidator.updateUser),
  catchAsync(usersController.updateUser)
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate user (soft delete)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User deactivated }
 *       404: { description: User not found }
 */
router.delete(
  '/:id',
  authorize('user:delete'),
  usersValidator.validateParams(usersValidator.userId),
  catchAsync(usersController.deleteUser)
);

module.exports = router;
