const { Router } = require('express');
const auditController = require('./audit.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const catchAsync = require('../../middleware/asyncWrapper');

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/audit:
 *   get:
 *     tags: [Audit]
 *     summary: Query audit logs (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: actor_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: resource_type
 *         schema: { type: string }
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Audit logs with pagination }
 *       403: { description: Insufficient permissions }
 */
router.get(
  '/',
  authorize('audit:read'),
  catchAsync(auditController.getAuditLogs)
);

/**
 * @openapi
 * /api/v1/audit/verify:
 *   get:
 *     tags: [Audit]
 *     summary: Verify audit log integrity (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: end_date
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Integrity check result }
 */
router.get(
  '/verify',
  authorize('audit:verify'),
  catchAsync(auditController.verifyIntegrity)
);

module.exports = router;
