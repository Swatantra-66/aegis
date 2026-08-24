const db = require('../../config/database');
const auditService = require('../audit/audit.service');
const AppError = require('../../utils/AppError');
const { AUDIT_ACTIONS, PAGINATION } = require('../../config/constants');

/**
 * User Management Service — CRUD operations for user profiles.
 */

/**
 * List users with pagination.
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {string} [options.search] - Search by email/name
 * @param {boolean} [options.isActive] - Filter by active status
 * @returns {Promise<{ users: Array, total: number }>}
 */
const listUsers = async ({ page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, search, isActive } = {}) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (isActive !== undefined) {
    conditions.push(`u.is_active = $${paramIndex++}`);
    params.push(isActive);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await db.query(
    `SELECT COUNT(*) FROM users u ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const usersResult = await db.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active,
            u.is_email_verified, u.mfa_enabled, u.last_login_at,
            u.created_at, u.updated_at,
            COALESCE(
              json_agg(json_build_object('name', r.name, 'id', r.id))
              FILTER (WHERE r.id IS NOT NULL), '[]'
            ) as roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     ${whereClause}
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return { users: usersResult.rows, total };
};

/**
 * Get a single user by ID with their roles and permissions.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getUserById = async (userId) => {
  const result = await db.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active,
            u.is_email_verified, u.mfa_enabled, u.last_login_at,
            u.created_at, u.updated_at
     FROM users u WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  const user = result.rows[0];

  // Get roles
  const rolesResult = await db.query(
    `SELECT r.id, r.name, r.description FROM roles r
     INNER JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId]
  );
  user.roles = rolesResult.rows;

  // Get permissions
  const permsResult = await db.query(
    `SELECT DISTINCT p.name, p.resource, p.action FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     INNER JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  user.permissions = permsResult.rows;

  return user;
};

/**
 * Update user profile.
 * @param {string} userId
 * @param {Object} updateData - { first_name, last_name, is_active }
 * @param {Object} reqMeta - { actorId, actorEmail, ip, userAgent }
 * @returns {Promise<Object>} Updated user
 */
const updateUser = async (userId, updateData, reqMeta = {}) => {
  // Get current data for audit
  const currentResult = await db.query(
    'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1',
    [userId]
  );

  if (currentResult.rows.length === 0) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  const currentUser = currentResult.rows[0];

  // Build dynamic update query
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (updateData.first_name !== undefined) {
    updates.push(`first_name = $${paramIndex++}`);
    values.push(updateData.first_name);
  }
  if (updateData.last_name !== undefined) {
    updates.push(`last_name = $${paramIndex++}`);
    values.push(updateData.last_name);
  }
  if (updateData.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(updateData.is_active);
  }

  if (updates.length === 0) {
    throw AppError.badRequest('No fields to update', 'NO_UPDATE_FIELDS');
  }

  values.push(userId);
  const result = await db.query(
    `UPDATE users SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, email, first_name, last_name, is_active, mfa_enabled, updated_at`,
    values
  );

  // Audit log
  await auditService.log({
    actorId: reqMeta.actorId,
    actorEmail: reqMeta.actorEmail,
    action: AUDIT_ACTIONS.USER_UPDATED,
    resourceType: 'user',
    resourceId: userId,
    oldData: { first_name: currentUser.first_name, last_name: currentUser.last_name, is_active: currentUser.is_active },
    newData: updateData,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return result.rows[0];
};

/**
 * Soft-delete (deactivate) a user.
 * @param {string} userId
 * @param {Object} reqMeta
 */
const deleteUser = async (userId, reqMeta = {}) => {
  const result = await db.query(
    'UPDATE users SET is_active = false WHERE id = $1 RETURNING id, email',
    [userId]
  );

  if (result.rows.length === 0) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  await auditService.log({
    actorId: reqMeta.actorId,
    actorEmail: reqMeta.actorEmail,
    action: AUDIT_ACTIONS.USER_DELETED,
    resourceType: 'user',
    resourceId: userId,
    oldData: { is_active: true },
    newData: { is_active: false },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return result.rows[0];
};

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
};
