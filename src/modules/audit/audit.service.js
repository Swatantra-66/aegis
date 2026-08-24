const db = require('../../config/database');
const { generateAuditChecksum } = require('../../utils/crypto');
const logger = require('../../utils/logger');

/**
 * Audit Service — tamper-evident audit logging.
 *
 * Every audit log entry includes a SHA-256 checksum chained to the previous
 * entry's checksum, creating a tamper-evident chain similar to a blockchain.
 */

/**
 * Create a new audit log entry.
 * @param {Object} event
 * @param {string|null} event.actorId - User who performed the action
 * @param {string} [event.actorEmail]
 * @param {string} event.action - Action identifier (from AUDIT_ACTIONS)
 * @param {string} [event.resourceType] - Type of resource affected
 * @param {string} [event.resourceId] - ID of resource affected
 * @param {Object} [event.oldData] - Previous state
 * @param {Object} [event.newData] - New state
 * @param {string} [event.ip] - Client IP
 * @param {string} [event.userAgent] - Client user agent
 */
const log = async (event) => {
  try {
    // Get the previous checksum for chain integrity
    const lastEntry = await db.query(
      'SELECT checksum FROM audit_logs ORDER BY id DESC LIMIT 1'
    );
    const previousChecksum = lastEntry.rows.length > 0 ? lastEntry.rows[0].checksum : '';

    const timestamp = new Date().toISOString();

    // Generate tamper-evident checksum
    const checksum = generateAuditChecksum({
      action: event.action,
      actorId: event.actorId,
      resourceId: event.resourceId,
      timestamp,
      previousChecksum,
    });

    await db.query(
      `INSERT INTO audit_logs
        (actor_id, actor_email, action, resource_type, resource_id,
         old_data, new_data, ip_address, user_agent, checksum, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        event.actorId || null,
        event.actorEmail || null,
        event.action,
        event.resourceType || null,
        event.resourceId || null,
        event.oldData ? JSON.stringify(event.oldData) : null,
        event.newData ? JSON.stringify(event.newData) : null,
        event.ip || null,
        event.userAgent || null,
        checksum,
        timestamp,
      ]
    );
  } catch (err) {
    // Audit logging should NEVER crash the app
    logger.error('Failed to write audit log:', {
      error: err.message,
      action: event.action,
    });
  }
};

/**
 * Query audit logs with filtering and pagination.
 * @param {Object} filters
 * @param {string} [filters.actorId]
 * @param {string} [filters.action]
 * @param {string} [filters.resourceType]
 * @param {string} [filters.resourceId]
 * @param {string} [filters.startDate]
 * @param {string} [filters.endDate]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @returns {Promise<{ logs: Array, total: number }>}
 */
const getAuditTrail = async (filters = {}) => {
  const {
    actorId,
    action,
    resourceType,
    resourceId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = filters;

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (actorId) {
    conditions.push(`actor_id = $${paramIndex++}`);
    params.push(actorId);
  }
  if (action) {
    conditions.push(`action = $${paramIndex++}`);
    params.push(action);
  }
  if (resourceType) {
    conditions.push(`resource_type = $${paramIndex++}`);
    params.push(resourceType);
  }
  if (resourceId) {
    conditions.push(`resource_id = $${paramIndex++}`);
    params.push(resourceId);
  }
  if (startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(startDate);
  }
  if (endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  // Count total
  const countResult = await db.query(
    `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Fetch paginated results
  const logsResult = await db.query(
    `SELECT * FROM audit_logs ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    logs: logsResult.rows,
    total,
  };
};

/**
 * Verify the integrity of the audit log chain.
 * Recomputes checksums and compares against stored values.
 *
 * @param {Object} [range]
 * @param {string} [range.startDate]
 * @param {string} [range.endDate]
 * @returns {Promise<{ valid: boolean, totalChecked: number, firstInvalid: number|null }>}
 */
const verifyIntegrity = async (range = {}) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (range.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(range.startDate);
  }
  if (range.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(range.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT id, actor_id, action, resource_id, created_at, checksum
     FROM audit_logs ${whereClause}
     ORDER BY id ASC`,
    params
  );

  let previousChecksum = '';
  let totalChecked = 0;

  // If we're checking a range that doesn't start from the beginning,
  // get the checksum of the record just before our range
  if (result.rows.length > 0) {
    const firstId = result.rows[0].id;
    const prevResult = await db.query(
      'SELECT checksum FROM audit_logs WHERE id < $1 ORDER BY id DESC LIMIT 1',
      [firstId]
    );
    if (prevResult.rows.length > 0) {
      previousChecksum = prevResult.rows[0].checksum;
    }
  }

  for (const row of result.rows) {
    totalChecked++;

    const expectedChecksum = generateAuditChecksum({
      action: row.action,
      actorId: row.actor_id,
      resourceId: row.resource_id,
      timestamp: new Date(row.created_at).toISOString(),
      previousChecksum,
    });

    if (expectedChecksum !== row.checksum) {
      return {
        valid: false,
        totalChecked,
        firstInvalid: row.id,
      };
    }

    previousChecksum = row.checksum;
  }

  return {
    valid: true,
    totalChecked,
    firstInvalid: null,
  };
};

module.exports = {
  log,
  getAuditTrail,
  verifyIntegrity,
};
