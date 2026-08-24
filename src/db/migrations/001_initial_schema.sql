-- ============================================
-- IAM Portal — Initial Schema Migration
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 VARCHAR(255) UNIQUE NOT NULL,
    password_hash         VARCHAR(255) NOT NULL,
    first_name            VARCHAR(100),
    last_name             VARCHAR(100),
    is_active             BOOLEAN DEFAULT true,
    is_email_verified     BOOLEAN DEFAULT false,
    mfa_enabled           BOOLEAN DEFAULT false,
    mfa_secret            VARCHAR(500),
    mfa_backup_codes      TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until          TIMESTAMPTZ,
    last_login_at         TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- 2. Roles
CREATE TABLE IF NOT EXISTS roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    is_system_role  BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) UNIQUE NOT NULL,
    description     TEXT,
    resource        VARCHAR(100) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Role ↔ Permission (junction)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id         UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. User ↔ Role (junction)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- 6. Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    family_id       UUID NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- 7. Audit Logs (append-only, tamper-evident)
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_id        UUID,
    actor_email     VARCHAR(255),
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(100),
    resource_id     VARCHAR(255),
    old_data        JSONB,
    new_data        JSONB,
    ip_address      INET,
    user_agent      TEXT,
    checksum        VARCHAR(64) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 8. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ============================================
-- Phase 2 Tables (created now to avoid future migrations breaking things)
-- ============================================

-- 9. SSO Identity Links
CREATE TABLE IF NOT EXISTS sso_identities (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
    provider          VARCHAR(50) NOT NULL,
    provider_user_id  VARCHAR(255) NOT NULL,
    email             VARCHAR(255),
    profile_data      JSONB,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- 10. SCIM Provisioning
CREATE TABLE IF NOT EXISTS scim_resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id     VARCHAR(255) UNIQUE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    scim_data       JSONB NOT NULL,
    provisioned_by  VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Login Events (for anomaly detection)
CREATE TABLE IF NOT EXISTS login_events (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address      INET NOT NULL,
    user_agent      TEXT,
    geo_location    VARCHAR(255),
    login_result    VARCHAR(20) NOT NULL,
    risk_score      DECIMAL(3,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_created ON login_events(created_at);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_scim_resources_updated_at
    BEFORE UPDATE ON scim_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
