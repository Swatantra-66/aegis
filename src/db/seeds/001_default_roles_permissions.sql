-- ============================================
-- IAM Portal — Default Roles, Permissions & Admin User
-- ============================================

-- ── Default Roles ────────────────────────────────
INSERT INTO roles (name, description, is_system_role) VALUES
  ('super_admin', 'Full system access. Cannot be deleted.', true),
  ('admin', 'Administrative access with user and role management.', true),
  ('user', 'Standard user with basic access.', true)
ON CONFLICT (name) DO NOTHING;

-- ── Permissions ──────────────────────────────────
INSERT INTO permissions (name, description, resource, action) VALUES
  -- User permissions
  ('user:read',     'View user profiles',           'user',   'read'),
  ('user:create',   'Create new users',             'user',   'create'),
  ('user:update',   'Update user profiles',         'user',   'update'),
  ('user:delete',   'Delete/deactivate users',      'user',   'delete'),
  -- Role permissions
  ('role:read',     'View roles and permissions',    'role',   'read'),
  ('role:create',   'Create new roles',             'role',   'create'),
  ('role:update',   'Update existing roles',        'role',   'update'),
  ('role:delete',   'Delete roles',                 'role',   'delete'),
  -- Audit permissions
  ('audit:read',    'View audit logs',              'audit',  'read'),
  ('audit:verify',  'Verify audit log integrity',   'audit',  'verify'),
  -- MFA permissions
  ('mfa:manage',    'Manage MFA settings',          'mfa',    'manage')
ON CONFLICT (name) DO NOTHING;

-- ── Role ↔ Permission Assignments ────────────────

-- super_admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- admin gets user management + role reading + audit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.name IN ('user:read', 'user:create', 'user:update', 'user:delete',
                 'role:read', 'audit:read', 'mfa:manage')
ON CONFLICT DO NOTHING;

-- user gets basic read + own MFA
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user'
  AND p.name IN ('user:read', 'mfa:manage')
ON CONFLICT DO NOTHING;
