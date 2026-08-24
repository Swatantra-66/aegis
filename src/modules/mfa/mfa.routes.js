const { Router } = require('express');
const mfaController = require('./mfa.controller');
const authenticate = require('../../middleware/authenticate');
const catchAsync = require('../../middleware/asyncWrapper');

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
router.post('/setup', authenticate, catchAsync(mfaController.setup));

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
router.post('/verify', authenticate, catchAsync(mfaController.verify));

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
router.post('/validate', catchAsync(mfaController.validate));

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
router.delete('/disable', authenticate, catchAsync(mfaController.disable));

module.exports = router;
