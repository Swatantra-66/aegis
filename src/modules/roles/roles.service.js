const db = require('../../config/database');
const auditService = require('../audit/audit.service');
const tokenService = require('../tokens/tokens.service');
const AppError = require('../../utils/AppError');
const { AUDIT_ACTIONS, ROLES } = require('../../config/constants');

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
 * Accepts an optional transaction client to prevent connection pool exhaustion deadlocks.
 */
const getRoleById = async (roleId, client = null) => {
  const runner = client && typeof client.query === 'function' ? client : db;

  const result = await runner.query(
    `SELECT r.id, r.name, r.description, r.is_system_role, r.created_at
     FROM roles r WHERE r.id = $1`,
    [roleId]
  );

  if (result.rows.length === 0) {
    throw AppError.notFound('Role not found', 'ROLE_NOT_FOUND');
  }

  const role = result.rows[0];

  const permsResult = await runner.query(
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

  await db.query('DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = ANY($2)', [
    roleId,
    permissionIds,
  ]);

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
 * Atomically replaces conflicting system-tier roles (user, admin, super_admin) in a single transaction.
 * Locks the user row via SELECT ... FOR UPDATE to serialize concurrent replacements per user.
 * Rolls back role assignment if session revocation fails to guarantee failure safety.
 */
const assignRoleToUser = async (userId, roleId, reqMeta = {}) => {
  if (typeof db.getClient !== 'function') {
    throw AppError.internal(
      'Transactional role assignment requires a pooled client',
      'DB_CLIENT_UNAVAILABLE'
    );
  }
  const client = await db.getClient();
  if (!client || typeof client.query !== 'function') {
    throw AppError.internal(
      'Transactional role assignment requires a pooled client',
      'DB_CLIENT_UNAVAILABLE'
    );
  }

  let inTransaction = false;
  let sessionsRevoked = false;

  try {
    await client.query('BEGIN');
    inTransaction = true;

    // 1. Lock user row to serialize concurrent role modifications for this user
    const userResult = await client.query('SELECT id, email FROM users WHERE id = $1 FOR UPDATE', [
      userId,
    ]);

    if (userResult.rows.length === 0) {
      throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

    const role = await getRoleById(roleId, client);
    const roleName = (role.name || '').toLowerCase();
    const isElevatedRole = roleName === ROLES.ADMIN || roleName === ROLES.SUPER_ADMIN;
    const isSystemTierRole =
      roleName === ROLES.SUPER_ADMIN || roleName === ROLES.ADMIN || roleName === ROLES.USER;

    let insertResult;
    let removedRoleIds = [];

    if (isSystemTierRole) {
      // 1. Split delete and insert so removed role IDs are always observable
      const removed = await client.query(
        `DELETE FROM user_roles
         WHERE user_id = $1
           AND role_id != $2
           AND role_id IN (SELECT id FROM roles WHERE name IN ('super_admin', 'admin', 'user'))
         RETURNING role_id`,
        [userId, roleId]
      );
      removedRoleIds = removed.rows.map((r) => r.role_id);

      insertResult = await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING RETURNING user_id',
        [userId, roleId]
      );
    } else {
      insertResult = await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_id',
        [userId, roleId]
      );
    }

    const ROLE_TIERS = {
      [ROLES.SUPER_ADMIN]: 3,
      [ROLES.ADMIN]: 2,
      [ROLES.USER]: 1,
    };

    const targetTier = ROLE_TIERS[roleName] || (isElevatedRole ? 2 : 1);
    let highestRemovedTier = 0;
    if (removedRoleIds.length > 0) {
      const removedDetails = await client.query('SELECT name FROM roles WHERE id = ANY($1)', [
        removedRoleIds,
      ]);
      for (const r of removedDetails.rows) {
        const n = (r.name || '').toLowerCase();
        const tier = ROLE_TIERS[n] || 0;
        if (tier > highestRemovedTier) {
          highestRemovedTier = tier;
        }
      }
    }

    const isPromotion =
      (highestRemovedTier > 0 && targetTier > highestRemovedTier) ||
      (highestRemovedTier === 0 && targetTier > 1);
    const isDemotion = highestRemovedTier > 0 && targetTier < highestRemovedTier;

    // If role was already assigned and no other system roles were replaced, return early
    if (insertResult.rows.length === 0 && removedRoleIds.length === 0) {
      await client.query('COMMIT');
      inTransaction = false;
      return {
        assigned: false,
        sessionsRevoked: false,
        roleId: role.id,
        roleName: role.name,
        message: `Role ${role.name} is already assigned to this user.`,
      };
    }

    // Zero-Trust Session Invalidation:
    // Execute session revocation inside the SAME transaction boundary.
    // If revocation fails, the entire transaction rolls back, reverting/compensating the role change!
    if (isPromotion || isDemotion) {
      await tokenService.revokeAllUserTokens(userId, client);
      sessionsRevoked = true;
    }

    if (isDemotion && roleName === ROLES.USER) {
      // Clear any pending/unconfirmed MFA secret initiated during elevated admin status
      await client.query(
        'UPDATE users SET mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1 AND mfa_enabled = false',
        [userId]
      );
    }

    // Transactional audit logging — runs before COMMIT using the transaction client
    await auditService.log(
      {
        actorId: reqMeta.actorId,
        actorEmail: reqMeta.actorEmail,
        action: AUDIT_ACTIONS.ROLE_ASSIGNED,
        resourceType: 'user',
        resourceId: userId,
        newData: { role_id: roleId, role_name: role.name },
        ip: reqMeta.ip,
        userAgent: reqMeta.userAgent,
      },
      client
    );

    if (isPromotion) {
      await auditService.log(
        {
          actorId: reqMeta.actorId,
          actorEmail: reqMeta.actorEmail,
          action: AUDIT_ACTIONS.ROLE_PROMOTION_SESSION_REVOKED,
          resourceType: 'user',
          resourceId: userId,
          newData: {
            role_name: role.name,
            reason: 'Zero-Trust privilege escalation policy enforcement',
          },
          ip: reqMeta.ip,
          userAgent: reqMeta.userAgent,
        },
        client
      );
    } else if (isDemotion) {
      await auditService.log(
        {
          actorId: reqMeta.actorId,
          actorEmail: reqMeta.actorEmail,
          action: AUDIT_ACTIONS.TOKEN_REVOKED,
          resourceType: 'user',
          resourceId: userId,
          newData: {
            role_name: role.name,
            reason: 'Zero-Trust privilege demotion session termination',
          },
          ip: reqMeta.ip,
          userAgent: reqMeta.userAgent,
        },
        client
      );
    }

    await client.query('COMMIT');
    inTransaction = false;

    return {
      assigned: true,
      sessionsRevoked,
      roleId: role.id,
      roleName: role.name,
    };
  } catch (err) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Suppress rollback error
      }
    }
    throw err;
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
};

/**
 * Remove a role from a user.
 */
const removeRoleFromUser = async (userId, roleId, reqMeta = {}) => {
  await db.query('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleId]);

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
