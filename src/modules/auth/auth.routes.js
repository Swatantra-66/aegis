const { Router } = require('express');
const authController = require('./auth.controller');
const authValidator = require('./auth.validator');
const authenticate = require('../../middleware/authenticate');
const catchAsync = require('../../middleware/asyncWrapper');
const { authLimiter, passwordResetLimiter } = require('../../middleware/rateLimiter');

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "user@example.com" }
 *               password: { type: string, minLength: 8, example: "StrongP@ss1" }
 *               first_name: { type: string, example: "John" }
 *               last_name: { type: string, example: "Doe" }
 *     responses:
 *       201: { description: Registration successful }
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 *       429: { description: Rate limit exceeded }
 */
router.post(
  '/register',
  authLimiter,
  authValidator.validate(authValidator.register),
  catchAsync(authController.register)
);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Authenticate user and receive tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               mfa_code: { type: string, description: "6-digit TOTP code (if MFA enabled)" }
 *     responses:
 *       200: { description: Login successful or MFA required }
 *       401: { description: Invalid credentials }
 *       429: { description: Rate limit exceeded }
 */
router.post(
  '/login',
  authLimiter,
  authValidator.validate(authValidator.login),
  catchAsync(authController.login)
);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token: { type: string, format: uuid }
 *     responses:
 *       200: { description: Token refreshed }
 *       401: { description: Invalid refresh token }
 */
router.post(
  '/refresh',
  authValidator.validate(authValidator.refreshToken),
  catchAsync(authController.refresh)
);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout and revoke tokens
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token: { type: string, format: uuid }
 *     responses:
 *       200: { description: Logged out successfully }
 *       401: { description: Not authenticated }
 */
router.post(
  '/logout',
  authenticate,
  catchAsync(authController.logout)
);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Reset link sent (if account exists) }
 *       429: { description: Rate limit exceeded }
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  authValidator.validate(authValidator.forgotPassword),
  catchAsync(authController.forgotPassword)
);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password reset successful }
 *       400: { description: Invalid or expired token }
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  authValidator.validate(authValidator.resetPassword),
  catchAsync(authController.resetPassword)
);

module.exports = router;
