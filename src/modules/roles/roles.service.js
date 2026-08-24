const db = require('../../config/database');
const auditService = require('../audit/audit.service');
const AppError = require('../../utils/AppError');
const { AUDIT_ACTIONS } = require('../../config/constants');

/**
 * Roles Service — RBAC role and permission management.
 */

/**
 * Create a new role.
 */
const createRole = async (roleData, reqMeta = {}) => {
  const { name, description } = roleData;

  const result = await db.query(
    `INSERT INTO roles (name, description) VALUES ($1, $2)
     RETURNING id, name, description, is_system_role, created_at`,
    [name, description || null]
  );

  await auditService.log({
    actorId: reqMeta.actorId,
    actorEmail: reqMeta.actorEmail,
    action: AUDIT_ACTIONS.ROLE_CREATED,
    resourceType: 'role',
    resourceId: result.rows[0].id,
    newData: { name, description },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return result.rows[0];
};

/**
 * List all roles.
 */
const listRoles = async () => {
  const result = await db.query(
    `SELECT r.id, r.name, r.description, r.is_system_role, r.created_at,
            COALESCE(
              json_agg(json_build_object('id', p.id, 'name', p.name, 'resource', p.resource, 'action', p.action))
              FILTER (WHERE p.id IS NOT NULL), '[]'
            ) as permissions
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     GROUP BY r.id
     ORDER BY r.created_at ASC`
  );

  return result.rows;
};

/**
 * Get a role by ID with its permissions.
 */
const getRoleById = async (roleId) => {
  const result = await db.query(
    `SELECT r.id, r.name, r.description, r.is_system_role, r.created_at
     FROM roles r WHERE r.id = $1`,
    [roleId]
  );

  if (result.rows.length === 0) {
    throw AppError.notFound('Role not found', 'ROLE_NOT_FOUND');
  }

  const role = result.rows[0];

  const permsResult = await db.query(
    `SELECT p.id, p.name, p.description, p.resource, p.action
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = $1`,
    [roleId]
  );

  role.permissions = permsResult.rows;
  return role;
};

/**
 * Update a role.
 */
const updateRole = async (roleId, updateData, reqMeta = {}) => {
  const current = await getRoleById(roleId);

  const result = await db.query(
    `UPDATE roles SET name = COALESCE($1, name), description = COALESCE($2, description)
     WHERE id = $3
     RETURNING id, name, description, is_system_role, updated_at`,
    [updateData.name || null, updateData.description || null, roleId]
  );

  await auditService.log({
    actorId: reqMeta.actorId,
    actorEmail: reqMeta.actorEmail,
    action: AUDIT_ACTIONS.ROLE_UPDATED,
    resourceType: 'role',
    resourceId: roleId,
    oldData: { name: current.name, description: current.description },
    newData: updateData,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return result.rows[0];
};

/**
 * Delete a role (prevents system role deletion).
 */
const deleteRole = async (roleId, reqMeta = {}) => {
  const role = await getRoleById(roleId);

  if (role.is_system_role) {
    throw AppError.forbidden('System roles cannot be deleted', 'SYSTEM_ROLE_PROTECTED');
  }

  await db.query('DELETE FROM roles WHERE id = $1', [roleId]);

  await auditService.log({
    actorId: reqMeta.actorId,
    actorEmail: reqMeta.actorEmail,
    action: AUDIT_ACTIONS.ROLE_DELETED,
    resourceType: 'role',
    resourceId: roleId,
    oldData: { name: role.name },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
};

/**
 * Assign permissions to a role.
 */
const assignPermissions = async (roleId, permissionIds, reqMeta = {}) => {
  await getRoleById(roleId); // Validate role exists

  for (const permId of permissionIds) {
    await db.query(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [roleId, permId]
    );
  }

  await auditService.log({
    actorId: reqMeta.actorId,
    actorEmail: reqMeta.actorEmail,
    action: AUDIT_ACTIONS.PERMISSION_ASSIGNED,
    resourceType: 'role',
    resourceId: roleId,
    newData: { permission_ids: permissionIds },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return getRoleById(roleId);
};

/**
 * Remove permissions from a role.
 */
const removePermissions = async (roleId, permissionIds, reqMeta = {}) => {
  await getRoleById(roleId);

  await db.query(
    'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = ANY($2)',
    [roleId, permissionIds]
  );

  await auditService.log({
    actorId: reqMeta.actorId,
    actorEmail: reqMeta.actorEmail,
    action: AUDIT_ACTIONS.PERMISSION_REMOVED,
    resourceType: 'role',
    resourceId: roleId,
    oldData: { permission_ids: permissionIds },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return getRoleById(roleId);
};

/**
 * Assign a role to a user.
 */
const assignRoleToUser = async (userId, roleId, reqMeta = {}) => {
  // Validate both exist
  const userResult = await db.query('SELECT id, email FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  await getRoleById(roleId);

  await db.query(
    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, roleId]
  );

  await auditService.log({
    actorId: reqMeta.actorId,
    actorEmail: reqMeta.actorEmail,
    action: AUDIT_ACTIONS.ROLE_ASSIGNED,
    resourceType: 'user',
    resourceId: userId,
    newData: { role_id: roleId },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
};

/**
 * Remove a role from a user.
 */
const removeRoleFromUser = async (userId, roleId, reqMeta = {}) => {
  await db.query(
    'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
    [userId, roleId]
  );

  await auditService.log({
    actorId: reqMeta.actorId,
    actorEmail: reqMeta.actorEmail,
    action: AUDIT_ACTIONS.ROLE_REMOVED,
    resourceType: 'user',
    resourceId: userId,
    oldData: { role_id: roleId },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });
};

/**
 * List all permissions.
 */
const listPermissions = async () => {
  const result = await db.query(
    'SELECT id, name, description, resource, action FROM permissions ORDER BY resource, action'
  );
  return result.rows;
};

module.exports = {
  createRole,
  listRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignPermissions,
  removePermissions,
  assignRoleToUser,
  removeRoleFromUser,
  listPermissions,
};
