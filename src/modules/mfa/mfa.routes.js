const { Router } = require('express');
const mfaController = require('./mfa.controller');
const authenticate = require('../../middleware/authenticate');
const authenticateMfaEnrollment = require('../../middleware/authenticateMfaEnrollment');
const catchAsync = require('../../middleware/asyncWrapper');
const { mfaRateLimiter } = require('../../middleware/rateLimiter');

const router = Router();

/**
 * @openapi
 * /api/v1/mfa/setup:
 *   post:
 *     tags: [MFA]
 *     summary: Initiate MFA setup (generate TOTP secret)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: TOTP secret and QR code URI returned }
 *       400: { description: MFA already enabled }
 */
/**
 * @openapi
 * /api/v1/mfa/status:
 *   get:
 *     tags: [MFA]
 *     summary: Check MFA configuration and enrollment status (non-mutating)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current MFA status }
 *       401: { description: Token revoked or setup not required }
 */
router.get('/status', authenticateMfaEnrollment, catchAsync(mfaController.getStatus));

router.post('/setup', authenticateMfaEnrollment, catchAsync(mfaController.setup));

/**
 * @openapi
 * /api/v1/mfa/verify:
 *   post:
 *     tags: [MFA]
 *     summary: Verify TOTP code and activate MFA
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: MFA activated }
 *       400: { description: Invalid code }
 */
router.post('/verify', authenticateMfaEnrollment, mfaRateLimiter, catchAsync(mfaController.verify));

/**
 * @openapi
 * /api/v1/mfa/validate:
 *   post:
 *     tags: [MFA]
 *     summary: Validate TOTP code during login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, code]
 *             properties:
 *               user_id: { type: string, format: uuid }
 *               code: { type: string }
 *     responses:
 *       200: { description: Code valid }
 *       401: { description: Invalid code }
 */
router.post('/validate', mfaRateLimiter, catchAsync(mfaController.validate));

/**
 * @openapi
 * /api/v1/mfa/disable:
 *   delete:
 *     tags: [MFA]
 *     summary: Disable MFA (requires current TOTP code)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *     responses:
 *       200: { description: MFA disabled }
 */
router.delete('/disable', authenticate, mfaRateLimiter, catchAsync(mfaController.disable));

/**
 * @openapi
 * /api/v1/mfa/request-reset:
 *   post:
 *     tags: [MFA]
 *     summary: Request an emergency 2FA factor reset from AEGIS Security (aegisiamsecurity@gmail.com)
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
 *       200: { description: Reset request dispatched }
 *       429: { description: Rate limited }
 */
router.post('/request-reset', mfaRateLimiter, catchAsync(mfaController.requestMfaReset));

module.exports = router;
