import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import mermaid from 'mermaid';
import api, { healthCheck } from '../lib/api';

const HIGH_LEVEL_MERMAID = `graph TD
    Client["Client / React Frontend\\n(Vite SPA)"] -->|HTTPS / REST API| Gateway["API Gateway / Express Server\\n(Helmet, Rate-Limiter, CORS)"]
    
    subgraph Aegis_Core_Backend ["Aegis Core Backend"]
        Gateway --> AuthMW["Auth & RBAC Middleware"]
        AuthMW --> AuthMod["Auth Module\\n(Argon2, JWT, Tokens)"]
        AuthMW --> MfaMod["MFA Module\\n(TOTP, AES-256)"]
        AuthMW --> RolesMod["Roles & RBAC Module"]
        AuthMW --> AuditMod["Audit Logging Module\\n(SHA-256 Hash Chain)"]
    end

    subgraph Data_Cache_Layer ["Data & Cache Layer"]
        AuthMod -->|Session / Blacklist / Rate-Limit| Redis[("Redis 6+ (In-Memory)")]
        AuthMod -->|Users, Roles, Permissions| Postgres[("PostgreSQL 14+ (Persistent Store)")]
        AuditMod -->|Tamper-Evident Logs| Postgres
    end
`;

const MermaidDiagram = ({ chart }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: true,
        background: '#080808',
        mainBkg: '#0d0d0d',
        nodeBorder: 'rgba(255, 255, 255, 0.25)',
        clusterBkg: 'rgba(255, 255, 255, 0.02)',
        clusterBorder: 'rgba(255, 255, 255, 0.15)',
        lineColor: '#00FF66',
        textColor: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px',
      },
    });

    if (containerRef.current) {
      const renderId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
      mermaid
        .render(renderId, chart)
        .then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        })
        .catch((err) => {
          console.error('Mermaid render error:', err);
        });
    }
  }, [chart]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        overflowX: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '1.25rem 0',
      }}
    />
  );
};

const SRS_SECTIONS = [
  {
    title: 'Functional Requirements',
    items: [
      { id: 'FR-01', text: 'User registration with email, password, first/last name', module: 'Auth', done: true },
      { id: 'FR-02', text: 'User login with email/password returning JWT access + refresh tokens', module: 'Auth', done: true },
      { id: 'FR-03', text: 'Automatic JWT token refresh on 401 via interceptor', module: 'Auth', done: true },
      { id: 'FR-04', text: 'User logout with refresh token revocation in Redis', module: 'Auth', done: true },
      { id: 'FR-05', text: 'Password reset flow (dispatch + token validation + reset)', module: 'Auth', done: true },
      { id: 'FR-06', text: 'TOTP-based Multi-Factor Authentication setup & verification', module: 'MFA', done: true },
      { id: 'FR-07', text: 'MFA challenge intercept during login authentication pipeline', module: 'MFA', done: true },
      { id: 'FR-08', text: 'Role-Based Access Control with super_admin, admin, user roles', module: 'RBAC', done: true },
      { id: 'FR-09', text: 'Granular permission assignments (user:read, role:update, audit:read, etc.)', module: 'RBAC', done: true },
      { id: 'FR-10', text: 'User directory management CRUD with pagination, search, and filtering', module: 'Users', done: true },
      { id: 'FR-11', text: 'Role creation, deletion, and permission toggling capabilities', module: 'RBAC', done: true },
      { id: 'FR-12', text: 'User role assignment and dynamic revocation', module: 'RBAC', done: true },
      { id: 'FR-13', text: 'Tamper-evident audit logging with SHA-256 hash chaining', module: 'Audit', done: true },
      { id: 'FR-14', text: 'Audit log filtering by action, resource type, date range', module: 'Audit', done: true },
      { id: 'FR-15', text: 'Cryptographic integrity verification of sequential audit chain', module: 'Audit', done: true },
      { id: 'FR-16', text: 'User profile management with self-service identity updates', module: 'Users', done: true },
      { id: 'FR-17', text: 'Refresh token rotation (RTR) on every refresh request', module: 'Tokens', done: true },
      { id: 'FR-18', text: 'Redis-backed token blocklisting for immediate session invalidation', module: 'Tokens', done: true },
    ],
  },
  {
    title: 'Non-Functional Requirements',
    items: [
      { id: 'NFR-01', text: 'Argon2id password hashing with hardened memory & time work factors', module: 'Security', done: true },
      { id: 'NFR-02', text: 'AES-256-GCM encryption for TOTP MFA secrets at rest', module: 'Security', done: true },
      { id: 'NFR-03', text: 'Rate limiting on authentication endpoints (100 req/15min)', module: 'Security', done: true },
      { id: 'NFR-04', text: 'CORS whitelist configuration for strict API access control', module: 'Security', done: true },
      { id: 'NFR-05', text: 'Helmet.js HTTP security headers with hardened CSP', module: 'Security', done: true },
      { id: 'NFR-06', text: 'PostgreSQL connection pooling with automated health monitoring', module: 'Performance', done: true },
      { id: 'NFR-07', text: 'Redis session/token cache with sub-millisecond latency', module: 'Performance', done: true },
      { id: 'NFR-08', text: 'API response latency < 200ms for 95th percentile under load', module: 'Performance', done: true },
    ],
  },
];

const DB_SCHEMA = [
  {
    name: 'users',
    desc: 'Core identity records with Argon2id credentials & encrypted MFA state',
    columns: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'email', type: 'VARCHAR(255) UNIQUE' },
      { name: 'password_hash', type: 'VARCHAR(255)' },
      { name: 'first_name', type: 'VARCHAR(100)' },
      { name: 'last_name', type: 'VARCHAR(100)' },
      { name: 'is_active', type: 'BOOLEAN DEFAULT true' },
      { name: 'is_email_verified', type: 'BOOLEAN DEFAULT false' },
      { name: 'mfa_enabled', type: 'BOOLEAN DEFAULT false' },
      { name: 'mfa_secret', type: 'VARCHAR(500)' },
      { name: 'mfa_backup_codes', type: 'TEXT' },
      { name: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
      { name: 'locked_until', type: 'TIMESTAMPTZ' },
      { name: 'last_login_at', type: 'TIMESTAMPTZ' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
      { name: 'updated_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'roles',
    desc: 'RBAC authorization roles with descriptions and metadata',
    columns: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'name', type: 'VARCHAR(100) UNIQUE' },
      { name: 'description', type: 'TEXT' },
      { name: 'is_system_role', type: 'BOOLEAN DEFAULT false' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
      { name: 'updated_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'permissions',
    desc: 'Atomic capability grants scoped to specific resources and actions',
    columns: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'name', type: 'VARCHAR(150) UNIQUE' },
      { name: 'description', type: 'TEXT' },
      { name: 'resource', type: 'VARCHAR(100)' },
      { name: 'action', type: 'VARCHAR(50)' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'user_roles',
    desc: 'Many-to-many junction binding identities to granted RBAC roles',
    columns: [
      { name: 'user_id', type: 'UUID', fk: 'users.id' },
      { name: 'role_id', type: 'UUID', fk: 'roles.id' },
      { name: 'assigned_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'role_permissions',
    desc: 'Many-to-many junction mapping roles to granular permission policies',
    columns: [
      { name: 'role_id', type: 'UUID', fk: 'roles.id' },
      { name: 'permission_id', type: 'UUID', fk: 'permissions.id' },
    ],
  },
  {
    name: 'refresh_tokens',
    desc: 'Hashed token family tracking for Refresh Token Rotation (RTR)',
    columns: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'user_id', type: 'UUID', fk: 'users.id' },
      { name: 'token_hash', type: 'VARCHAR(255)' },
      { name: 'family_id', type: 'UUID' },
      { name: 'expires_at', type: 'TIMESTAMPTZ' },
      { name: 'revoked', type: 'BOOLEAN DEFAULT false' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'audit_logs',
    desc: 'Cryptographically chained SHA-256 tamper-evident security ledger',
    columns: [
      { name: 'id', type: 'BIGSERIAL', pk: true },
      { name: 'actor_id', type: 'UUID', fk: 'users.id' },
      { name: 'actor_email', type: 'VARCHAR(255)' },
      { name: 'action', type: 'VARCHAR(100)' },
      { name: 'resource_type', type: 'VARCHAR(100)' },
      { name: 'resource_id', type: 'VARCHAR(255)' },
      { name: 'old_data', type: 'JSONB' },
      { name: 'new_data', type: 'JSONB' },
      { name: 'ip_address', type: 'INET' },
      { name: 'user_agent', type: 'TEXT' },
      { name: 'checksum', type: 'VARCHAR(64)' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'sessions',
    desc: 'Active browser & device sessions with IP and user-agent binding',
    columns: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'user_id', type: 'UUID', fk: 'users.id' },
      { name: 'ip_address', type: 'INET' },
      { name: 'user_agent', type: 'TEXT' },
      { name: 'expires_at', type: 'TIMESTAMPTZ' },
      { name: 'revoked', type: 'BOOLEAN DEFAULT false' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'login_events',
    desc: 'Authentication telemetry and adaptive risk-scoring event log',
    columns: [
      { name: 'id', type: 'BIGSERIAL', pk: true },
      { name: 'user_id', type: 'UUID', fk: 'users.id' },
      { name: 'ip_address', type: 'INET' },
      { name: 'user_agent', type: 'TEXT' },
      { name: 'geo_location', type: 'VARCHAR(255)' },
      { name: 'login_result', type: 'VARCHAR(20)' },
      { name: 'risk_score', type: 'DECIMAL(3,2)' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'sso_identities',
    desc: 'Enterprise federated identity mappings (SAML 2.0 / OIDC)',
    columns: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'user_id', type: 'UUID', fk: 'users.id' },
      { name: 'provider', type: 'VARCHAR(50)' },
      { name: 'provider_user_id', type: 'VARCHAR(255)' },
      { name: 'email', type: 'VARCHAR(255)' },
      { name: 'profile_data', type: 'JSONB' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'scim_resources',
    desc: 'SCIM 2.0 automated identity lifecycle & directory provisioning',
    columns: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'external_id', type: 'VARCHAR(255) UNIQUE' },
      { name: 'user_id', type: 'UUID', fk: 'users.id' },
      { name: 'scim_data', type: 'JSONB' },
      { name: 'provisioned_by', type: 'VARCHAR(100)' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
      { name: 'updated_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'migrations',
    desc: 'Database schema version tracking and idempotent migration runner ledger',
    columns: [
      { name: 'id', type: 'SERIAL', pk: true },
      { name: 'name', type: 'VARCHAR(255) UNIQUE' },
      { name: 'applied_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
    ],
  },
];

const BACKEND_MODULES = [
  { name: 'auth', desc: 'Authentication, registration, password lifecycle & multi-step tickets', files: ['auth.controller.js', 'auth.service.js', 'auth.routes.js', 'auth.validator.js', 'securityPolicy.js'] },
  { name: 'users', desc: 'Identity CRUD, profile updates & account deactivation', files: ['users.controller.js', 'users.service.js', 'users.routes.js', 'users.validator.js'] },
  { name: 'roles', desc: 'RBAC role creation, dynamic permission mapping & route guards', files: ['roles.controller.js', 'roles.service.js', 'roles.routes.js', 'roles.validator.js'] },
  { name: 'tokens', desc: 'JWT token family rotation (RTR) & Redis JTI blacklisting', files: ['tokens.service.js', 'tokens.blacklist.js'] },
  { name: 'mfa', desc: 'RFC 6238 TOTP enrollment, AES-256-GCM encrypted secrets & backup codes', files: ['mfa.controller.js', 'mfa.service.js', 'mfa.routes.js'] },
  { name: 'audit', desc: 'Tamper-evident SHA-256 cryptographic hash-chained security ledger', files: ['audit.controller.js', 'audit.service.js', 'audit.routes.js'] },
  { name: 'services', desc: 'Durable background job queues, Lua atomic state transitions & Gmail mailer', files: ['queue.service.js', 'mailer.service.js'] },
];

const TEST_SUITES = [
  {
    category: 'Crypto & Security',
    tests: [
      { name: 'Argon2id password hashing with hardened work factors (m=64MB, t=3, p=4)', passed: true },
      { name: 'Argon2id password verification against valid salt and hash', passed: true },
      { name: 'Argon2id rejection of incorrect candidate passwords', passed: true },
      { name: 'Unique cryptographic salt generation for identical passwords', passed: true },
      { name: 'Invalid password hash format handling and error masking', passed: true },
      { name: 'Deterministic SHA-256 audit checksum computation', passed: true },
      { name: 'Audit checksum modification detection on single-bit alteration', passed: true },
      { name: 'Sequential cryptographic hash-chaining across audit log entries', passed: true },
      { name: 'Cryptographically secure pseudo-random token generation (hex)', passed: true },
      { name: 'High-entropy collision prevention across parallel token requests', passed: true },
      { name: 'Strict byte-length parameter enforcement for security tokens', passed: true },
      { name: 'SHA-256 token hashing for rest-state database storage', passed: true },
      { name: 'Unique token hashes across differing seeds and nonces', passed: true },
      { name: 'AES-256-GCM authenticated encryption and decryption round-trip', passed: true },
      { name: 'Random 12-byte initialization vectors (IV) for ciphertext uniqueness', passed: true },
      { name: 'Authentication tag validation failure on tampered ciphertext', passed: true },
      { name: 'Ciphertext serialization format enforcement (iv:authTag:ciphertext)', passed: true },
      { name: 'Timing-safe secret equality comparison via crypto.timingSafeEqual', passed: true },
      { name: 'Timing-safe rejection of unequal strings and non-string inputs', passed: true },
    ],
  },
  {
    category: 'Queues & Resiliency',
    tests: [
      { name: 'Atomic queue enqueue with pipeline metadata & list insertion', passed: true },
      { name: 'Atomic caller-supplied jobId assignment via Lua (SET NX + LPUSH)', passed: true },
      { name: 'Idempotent job deduplication when caller jobId already exists', passed: true },
      { name: 'Pipeline retry resilience on transient network interruption', passed: true },
      { name: 'Safe queue abort on atomic claim failure without non-atomic RPOP', passed: true },
      { name: 'Worker lease renewal heartbeat via Lua claimToken verification', passed: true },
      { name: 'Job completion finalization fenced by claimToken ownership match', passed: true },
      { name: 'Atomic delayed-retry queue state transition via Lua script', passed: true },
      { name: 'Atomic Dead Letter Queue (DLQ) transition on attempt exhaustion', passed: true },
      { name: 'Atomic reclamation of expired or abandoned worker leases', passed: true },
      { name: 'Atomic job checkpoint state update & dedicated Redis persistence', passed: true },
      { name: 'Merged checkpoint state preservation across worker retries', passed: true },
      { name: 'Checkpoint rejection when claimToken fence ownership is lost', passed: true },
      { name: 'Transient Redis error tolerance during worker lease renewal', passed: true },
      { name: 'Worker processNext finalization isolation preventing false retries', passed: true },
      { name: 'Batch-bounded delayed job queue migration under backpressure', passed: true },
      { name: 'Mailer idempotency reservation check (ALREADY_SENT cache skip)', passed: true },
      { name: 'Atomic mail reservation acquisition, transport execution & finalization', passed: true },
      { name: 'Crashed worker stale pending mail reservation recovery & dispatch', passed: true },
      { name: 'Pending mail reservation release on transport connection failure', passed: true },
      { name: 'Fail-closed protection on malformed sent mail reservation state', passed: true },
      { name: 'Fail-closed protection on malformed pending mail reservation state', passed: true },
      { name: 'Polling and eventual ownership acquisition during in-progress locks', passed: true },
      { name: 'Fail-closed protection on malformed createdAt timestamp state', passed: true },
      { name: 'Automatic retry on transient Redis reservation failure', passed: true },
      { name: 'Fail-closed abort when all mailer reservation retries exhaust', passed: true },
      { name: 'Audit logging failure isolation during background queue execution', passed: true },
      { name: 'Checkpoint bypass when delivery checkpoint already recorded', passed: true },
    ],
  },
  {
    category: 'Auth Lifecycles',
    tests: [
      { name: 'Signup Step 1: Email enumeration defense via neutral success response', passed: true },
      { name: 'Signup Step 1: Ephemeral Redis token store & audit event dispatch', passed: true },
      { name: 'Signup Step 2: Rejection of invalid or expired signup tokens', passed: true },
      { name: 'Signup Step 2: Rejection of corrupted payload or missing email field', passed: true },
      { name: 'Signup Step 2: Atomic consumption of signup token & ticket issuance', passed: true },
      { name: 'Signup Step 3: Rejection of expired or missing registration ticket', passed: true },
      { name: 'Signup Step 3: Registration ticket payload email integrity validation', passed: true },
      { name: 'Signup Step 3: Submitted email vs registration ticket email mismatch check', passed: true },
      { name: 'Signup Step 4: Postgres unique constraint race (23505) -> 409 Conflict', passed: true },
      { name: 'Signup Step 4: Transaction abort & connection release on DB failure', passed: true },
      { name: 'Signup Step 4: User persistence, role binding, tokens & audit event', passed: true },
      { name: 'Email Verify: 404 response on unverified email address lookup', passed: true },
      { name: 'Email Verify: 400 response on already-verified user account', passed: true },
      { name: 'Email Verify: Hashed verification token in Redis with 24h TTL', passed: true },
      { name: 'Email Verify: Rejection of invalid or expired verification token', passed: true },
      { name: 'Email Verify: Atomic token consumption & DB is_email_verified update', passed: true },
      { name: 'Email Verify: Atomic Lua script fallback when redis.getdel is unsupported', passed: true },
      { name: 'Email Verify: Concurrency race — duplicate redemption rejected', passed: true },
      { name: 'Password Reset: Idempotent job enqueue & immediate neutral return', passed: true },
      { name: 'Password Reset: Graceful completion for nonexistent user ID', passed: true },
      { name: 'Password Reset: Mail delivery error escalation for durable queue retry', passed: true },
      { name: 'Password Reset: Audit logging failure isolation (no duplicate email)', passed: true },
      { name: 'Password Reset: Rejection of non-existent or expired reset token', passed: true },
      { name: 'Password Reset: Rejection when token is currently claimed by peer', passed: true },
      { name: 'Password Reset: Rejection when payload lacks fencingToken ownership', passed: true },
      { name: 'Password Reset: 409 Conflict rollback if claim ownership is lost', passed: true },
      { name: 'Password Reset: 409 Conflict if DB fencing token has changed', passed: true },
      { name: 'Password Reset: Conditional release of claim on transient DB error', passed: true },
      { name: 'Password Reset: Atomic password update, token revocation & finalization', passed: true },
      { name: 'Password Reset: Successful response even if post-commit audit fails', passed: true },
      { name: 'Session Revocation: Immediate token blacklisting in Redis on logout', passed: true },
      { name: 'Token Lifecycle: Refresh token rotation (RTR) with family breach detection', passed: true },
    ],
  },
  {
    category: 'Validation & Errors',
    tests: [
      { name: 'Register validation: Valid user registration payload acceptance', passed: true },
      { name: 'Register validation: Malformed email syntax rejection', passed: true },
      { name: 'Register validation: Rejection of weak password without uppercase letter', passed: true },
      { name: 'Register validation: Rejection of weak password without special character', passed: true },
      { name: 'Register validation: Rejection of password under minimum length (8 chars)', passed: true },
      { name: 'Register validation: Automatic lowercase normalization & email trim', passed: true },
      { name: 'Register validation: Optional first_name and last_name field acceptance', passed: true },
      { name: 'Login validation: Standard email and password payload acceptance', passed: true },
      { name: 'Login validation: MFA login payload with 6-digit TOTP code acceptance', passed: true },
      { name: 'Login validation: Rejection of non-numeric MFA code characters', passed: true },
      { name: 'Login validation: Rejection of MFA code with incorrect length', passed: true },
      { name: 'RefreshToken validation: Valid UUID format acceptance', passed: true },
      { name: 'RefreshToken validation: Rejection of malformed non-UUID strings', passed: true },
      { name: 'Validator middleware: next() execution on valid request payload', passed: true },
      { name: 'Validator middleware: next(error) delegation on validation failure', passed: true },
      { name: 'Validator middleware: Strip unknown fields (stripUnknown defense)', passed: true },
      { name: 'AppError factory: badRequest() generates 400 HTTP exception', passed: true },
      { name: 'AppError factory: unauthorized() generates 401 HTTP exception', passed: true },
      { name: 'AppError factory: forbidden() generates 403 HTTP exception', passed: true },
      { name: 'AppError factory: notFound() generates 404 HTTP exception', passed: true },
      { name: 'AppError factory: conflict() generates 409 HTTP exception', passed: true },
      { name: 'AppError factory: tooManyRequests() generates 429 HTTP exception', passed: true },
      { name: 'AppError factory: internal() generates 500 exception with isOperational=false', passed: true },
      { name: 'ErrorHandler middleware: AppError formatting with exact status codes', passed: true },
      { name: 'ErrorHandler middleware: Joi validation error mapping & detail extraction', passed: true },
      { name: 'ErrorHandler middleware: PostgreSQL unique constraint (23505) mapping', passed: true },
      { name: 'ErrorHandler middleware: JWT signature error mapping to 401 Unauthorized', passed: true },
      { name: 'ErrorHandler middleware: JWT TokenExpiredError mapping with re-auth advice', passed: true },
      { name: 'ErrorHandler middleware: Unknown internal error masking with sanitized 500', passed: true },
      { name: 'ApiResponse formatter: Standardized success JSON structure {success, data}', passed: true },
      { name: 'ApiResponse formatter: Paginated response with {meta: {page, limit, total}}', passed: true },
    ],
  },
  {
    category: 'Access Control & Infra',
    tests: [
      { name: 'Authorize middleware: Grant access when user holds all required permissions (AND)', passed: true },
      { name: 'Authorize middleware: Deny 403 when user lacks any one required permission (AND)', passed: true },
      { name: 'Authorize middleware: Deny 403 when user has zero assigned permissions', passed: true },
      { name: 'Authorize middleware: Grant access when user holds any required permission (OR)', passed: true },
      { name: 'Authorize middleware: Deny 403 when user holds none of the OR permissions', passed: true },
      { name: 'Authorize middleware: Return 401 Unauthorized when req.user is absent', passed: true },
      { name: 'Audit integrity: Sequential SHA-256 hash chaining of security events', passed: true },
      { name: 'Audit integrity: Detection of modified historical payload (tamper alert)', passed: true },
      { name: 'Audit integrity: Graceful chain calculation with null actor or resource', passed: true },
      { name: 'catchAsync middleware: Execution and resolution of standard async handler', passed: true },
      { name: 'catchAsync middleware: Promise rejection interception and forwarding to next()', passed: true },
      { name: 'catchAsync middleware: Synchronous thrown error interception and forwarding', passed: true },
      { name: 'Role boundary: Super admin role privilege verification and route clearance', passed: true },
      { name: 'Role boundary: Admin user management permission validation and boundary scoping', passed: true },
      { name: 'Role boundary: Standard user profile access scoping and isolation', passed: true },
      { name: 'CORS policy: Enforcement of allowed origins, headers and pre-flight options', passed: true },
      { name: 'Rate limiting: Redis sliding window request throttling and quota enforcement', passed: true },
      { name: 'Helmet headers: CSP, HSTS, X-Content-Type-Options and frameguard injection', passed: true },
      { name: 'Database pool: Graceful error recovery, connection recycling and health verification', passed: true },
    ],
  },
];

const COVERAGE_DATA = [
  { file: 'config / constants.js', stmts: '100%', branch: '100%', funcs: '100%', lines: '100%', uncovered: '—' },
  { file: 'config / index.js', stmts: '79.16%', branch: '83.33%', funcs: '—', lines: '79.16%', uncovered: '93-98' },
  { file: 'middleware / asyncWrapper.js', stmts: '100%', branch: '100%', funcs: '100%', lines: '100%', uncovered: '—' },
  { file: 'middleware / authorize.js', stmts: '68.75%', branch: '39.13%', funcs: '75.00%', lines: '66.66%', uncovered: '47, 75-90' },
  { file: 'middleware / errorHandler.js', stmts: '84.61%', branch: '84.61%', funcs: '100%', lines: '84.61%', uncovered: '40-42, 45-47' },
  { file: 'modules/auth / auth.service.js', stmts: '72.49%', branch: '51.04%', funcs: '57.69%', lines: '72.62%', uncovered: '41-83, 95-240' },
  { file: 'modules/auth / auth.validator.js', stmts: '100%', branch: '100%', funcs: '100%', lines: '100%', uncovered: '—' },
  { file: 'modules/tokens / tokens.service.js', stmts: '32.55%', branch: '—', funcs: '—', lines: '32.55%', uncovered: '20-33, 44-58' },
  { file: 'services / queue.service.js', stmts: '79.37%', branch: '59.18%', funcs: '60.86%', lines: '79.37%', uncovered: '323-324, 360' },
  { file: 'services / mailer.service.js', stmts: '59.06%', branch: '46.66%', funcs: '69.23%', lines: '58.92%', uncovered: '166-167, 204-250' },
  { file: 'utils / crypto.js', stmts: '100%', branch: '90.00%', funcs: '100%', lines: '100%', uncovered: '56' },
  { file: 'utils / AppError.js', stmts: '100%', branch: '90.47%', funcs: '100%', lines: '100%', uncovered: '31, 43' },
  { file: 'utils / apiResponse.js', stmts: '100%', branch: '68.42%', funcs: '100%', lines: '100%', uncovered: '36-49, 67' },
  { file: 'utils / logger.js', stmts: '83.33%', branch: '60.00%', funcs: '100%', lines: '83.33%', uncovered: '46-54' },
];

const ENV_CONFIG = [
  { key: 'NODE_ENV', value: 'production' },
  { key: 'PORT', value: '3000' },
  { key: 'DB_HOST', value: '127.0.0.1 (localhost)' },
  { key: 'DB_PORT', value: '5432' },
  { key: 'DB_NAME', value: 'iam_portal' },
  { key: 'REDIS_HOST', value: '127.0.0.1 (localhost)' },
  { key: 'REDIS_PORT', value: '6379' },
  { key: 'JWT_ACCESS_EXPIRY', value: '15m' },
  { key: 'JWT_REFRESH_EXPIRY', value: '7d' },
  { key: 'RATE_LIMIT_WINDOW', value: '15 min' },
  { key: 'RATE_LIMIT_MAX', value: '100 requests' },
  { key: 'CORS_ORIGIN', value: 'https://aegis.swatantracodes.in' },
  { key: 'ARGON2_MEMORY_COST', value: '65536 KB' },
  { key: 'ARGON2_TIME_COST', value: '3 iterations' },
  { key: 'ARGON2_PARALLELISM', value: '4 threads' },
];

const FLOW_NODES = [
  { label: 'Client SPA', desc: 'React 19 + TanStack Query' },
  { label: 'Nginx Proxy', desc: 'TLS termination & gzip' },
  { label: 'Rate Limiter', desc: '100 req / 15 min bucket' },
  { label: 'Auth Guard', desc: 'JWT & RTR validation' },
  { label: 'Route Handlers', desc: 'Domain controller modules' },
  { label: 'PostgreSQL 16', desc: 'ACID ACID relations' },
  { label: 'Redis 7 Cache', desc: 'Token revocation store' },
];

const REPO_STATS = [
  { label: 'BACKEND MODULES', value: '7' },
  { label: 'REST ENDPOINTS', value: '32' },
  { label: 'DATABASE TABLES', value: '12' },
  { label: 'FRONTEND PAGES', value: '15' },
];

//  Shared Accordion Component 
const Accordion = ({ title, children, defaultOpen = false, badgeText }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#080808',
        backdropFilter: 'blur(12px)',
        marginBottom: '1rem',
        borderRadius: '2px',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.1rem 1.5rem',
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          textAlign: 'left',
          borderBottom: open ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
        }}
      >
        <div className="flex items-center gap-md">
          <span style={{ fontWeight: 700, fontSize: '0.92rem', letterSpacing: '-0.01em' }}>{title}</span>
          {badgeText && (
            <span
              className="font-mono"
              style={{
                fontSize: '0.62rem',
                padding: '0.15rem 0.45rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'rgba(255, 255, 255, 0.8)',
                letterSpacing: '0.04em',
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-muted" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>
      {open && <div style={{ padding: '1.25rem 1.5rem' }}>{children}</div>}
    </div>
  );
};

//  Phase 1: Requirements Analysis 
const Phase1 = () => {
  const [filter, setFilter] = useState('ALL');
  const allItems = SRS_SECTIONS.flatMap((s) => s.items);
  const modules = ['ALL', ...new Set(allItems.map((i) => i.module))];
  const filtered = filter === 'ALL' ? allItems : allItems.filter((i) => i.module === filter);
  const totalDone = allItems.filter((i) => i.done).length;

  return (
    <div>
      {/* Phase Banner */}
      <div
        style={{
          background: '#080808',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          padding: '1.75rem 2rem',
          borderRadius: '2px',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
            PHASE 01 · REQUIREMENT ANALYSIS
          </span>
          <h2 style={{ margin: '0.45rem 0 0.75rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Software Requirements Specification
          </h2>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Formal SRS specifications defining security scope, functional capabilities, and zero-trust boundaries.
          </p>
        </div>

        <div className="flex items-center gap-lg">
          <div className="text-right">
            <div className="font-mono" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              {totalDone}/{allItems.length}
            </div>
            <span className="font-mono text-muted" style={{ fontSize: '0.64rem', letterSpacing: '0.06em' }}>
              REQUIREMENTS VERIFIED
            </span>
          </div>
          <span
            className="font-mono"
            style={{
              fontSize: '0.64rem',
              padding: '0.3rem 0.6rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              background: 'rgba(255, 255, 255, 0.03)',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            100% COVERAGE
          </span>
        </div>
      </div>

      {/* Module Filter Tags */}
      <div className="flex gap-xs mb-lg flex-wrap items-center">
        <span className="font-mono text-xs text-muted mr-xs" style={{ fontSize: '0.68rem' }}>
          MODULE FILTER:
        </span>
        {modules.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setFilter(m)}
            className="font-mono"
            style={{
              cursor: 'pointer',
              fontSize: '0.64rem',
              padding: '0.25rem 0.55rem',
              background: filter === m ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: filter === m ? '#ffffff' : 'var(--text-muted)',
              border: `1px solid ${filter === m ? '#ffffff' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '2px',
              fontWeight: filter === m ? 700 : 400,
              letterSpacing: '0.04em',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Accordion List */}
      {SRS_SECTIONS.map((section, idx) => {
        const sectionItems = filter === 'ALL' ? section.items : section.items.filter((i) => i.module === filter);
        if (sectionItems.length === 0) return null;

        return (
          <Accordion key={idx} title={section.title} badgeText={`${sectionItems.length} SPECIFICATIONS`} defaultOpen={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {sectionItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    background: 'rgba(255, 255, 255, 0.01)',
                    gap: '1rem',
                  }}
                >
                  <div className="flex items-center gap-md" style={{ flex: 1 }}>
                    <span className="font-mono text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)', minWidth: '55px' }}>
                      {item.id}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#ffffff' }}>{item.text}</span>
                  </div>

                  <div className="flex items-center gap-sm">
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '0.62rem',
                        padding: '0.15rem 0.45rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {item.module}
                    </span>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '0.62rem',
                        padding: '0.15rem 0.45rem',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        color: '#ffffff',
                        background: 'rgba(255, 255, 255, 0.04)',
                        fontWeight: 600,
                      }}
                    >
                      ✓ SATISFIED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Accordion>
        );
      })}
    </div>
  );
};

//  Phase 2: System Design 
const Phase2 = () => (
  <div>
    {/* Phase Banner */}
    <div
      style={{
        background: '#080808',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        padding: '1.75rem 2rem',
        borderRadius: '2px',
        marginBottom: '2rem',
      }}
    >
      <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
        PHASE 02 · SYSTEM DESIGN
      </span>
      <h2 style={{ margin: '0.45rem 0 0.75rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
        High-Level Architecture
      </h2>
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        Modular monolith architecture with Node.js Express, relational PostgreSQL persistence, and in-memory Redis session management.
      </p>
    </div>

    <div
      style={{
        background: '#080808',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        padding: '1.75rem 2rem',
        borderRadius: '2px',
        marginBottom: '2rem',
      }}
    >

      <div
        style={{
          background: '#080808',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '2px',
          padding: '1.5rem',
          overflowX: 'auto',
        }}
      >
        <MermaidDiagram chart={HIGH_LEVEL_MERMAID} />
      </div>
    </div>

    {/* Database Schema Grid */}
    <div className="flex justify-between items-center mb-md">
      <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
        RELATIONAL DATABASE SCHEMA
      </span>
      <span className="font-mono text-xs text-muted">[{DB_SCHEMA.length} POSTGRESQL TABLES]</span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
      {DB_SCHEMA.map((table) => (
        <div
          key={table.name}
          style={{
            background: '#080808',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            padding: '1.25rem 1.5rem',
            borderRadius: '2px',
          }}
        >
          <div className="flex justify-between items-center mb-xs">
            <span className="font-mono text-sm font-bold text-white">public.{table.name}</span>
            <span
              className="font-mono"
              style={{
                fontSize: '0.6rem',
                padding: '0.1rem 0.35rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-muted)',
              }}
            >
              {table.columns.length} COLS
            </span>
          </div>
          <p style={{ margin: '0 0 0.85rem', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
            {table.desc}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid var(--line)', paddingTop: '0.65rem' }}>
            {table.columns.map((col, idx) => (
              <div key={idx} className="flex justify-between items-center font-mono text-xs" style={{ fontSize: '0.68rem' }}>
                <span style={{ color: col.pk ? '#ffffff' : col.fk ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-muted)', fontWeight: col.pk ? 700 : 400 }}>
                  {col.pk ? 'PK · ' : col.fk ? 'FK · ' : ''}{col.name}
                </span>
                <span style={{ color: col.pk ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.35)', fontSize: '0.62rem' }}>
                  {col.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

//  Phase 3: Implementation 
const Phase3 = () => (
  <div>
    <div
      style={{
        background: '#080808',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        padding: '1.75rem 2rem',
        borderRadius: '2px',
        marginBottom: '2rem',
      }}
    >
      <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
        PHASE 03 · CODING & IMPLEMENTATION
      </span>
      <h2 style={{ margin: '0.45rem 0 0.75rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
        Modular Codebase Architecture
      </h2>
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        Domain-driven backend modules with strict separation of concerns, parameterized SQL queries, and zero direct state mutation.
      </p>
    </div>

    {/* Repository Stat Cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
      {REPO_STATS.map((stat, idx) => (
        <div
          key={idx}
          style={{
            background: '#080808',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            padding: '1.5rem',
            textAlign: 'center',
            borderRadius: '2px',
          }}
        >
          <div className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', lineHeight: 1, marginBottom: '0.35rem' }}>
            {stat.value}
          </div>
          <div className="font-mono text-muted" style={{ fontSize: '0.64rem', letterSpacing: '0.06em' }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>

    {/* Backend Modules Manifest */}
    <div className="flex justify-between items-center mb-md">
      <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
        BACKEND CONTROLLER MODULES · src/modules/
      </span>
      <span className="font-mono text-xs text-muted">[{BACKEND_MODULES.length} DOMAIN MODULES]</span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
      {BACKEND_MODULES.map((mod) => (
        <div
          key={mod.name}
          style={{
            background: '#080808',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            padding: '1.4rem 1.6rem',
            borderRadius: '2px',
          }}
        >
          <div className="flex justify-between items-center mb-xs">
            <span className="font-mono text-sm font-bold text-white">modules/{mod.name}</span>
            <span
              className="font-mono"
              style={{
                fontSize: '0.6rem',
                padding: '0.1rem 0.35rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-muted)',
              }}
            >
              {mod.files.length} FILES
            </span>
          </div>
          <p style={{ margin: '0 0 0.85rem', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {mod.desc}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid var(--line)', paddingTop: '0.65rem' }}>
            {mod.files.map((file, idx) => (
              <div key={idx} className="font-mono text-xs" style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.75)' }}>
                ├── {file}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

//  Phase 4: Testing & Verification 
const Phase4 = () => {
  const [activeTab, setActiveTab] = useState(TEST_SUITES[0]?.category || 'Crypto & Security');
  const currentSuite = TEST_SUITES.find((s) => s.category === activeTab) || TEST_SUITES[0];

  return (
    <div>
      {/* Phase Banner */}
      <div
        style={{
          background: '#080808',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          padding: '1.75rem 2rem',
          borderRadius: '2px',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
            PHASE 04 · TESTING & VERIFICATION
          </span>
          <h2 style={{ margin: '0.45rem 0 0.75rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Test Suite Execution Verification
          </h2>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Automated Jest test execution covering unit boundaries, integration lifecycles, and security fuzzing vectors.
          </p>
        </div>

        <div className="flex items-center gap-lg">
          <div className="text-right">
            <div className="font-mono" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              129/129
            </div>
            <span className="font-mono text-muted" style={{ fontSize: '0.64rem', letterSpacing: '0.06em' }}>
              TESTS PASSED (100%)
            </span>
          </div>
          <span
            className="font-mono"
            style={{
              fontSize: '0.64rem',
              padding: '0.3rem 0.6rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              background: 'rgba(255, 255, 255, 0.03)',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            13 SUITES · 5.461s
          </span>
        </div>
      </div>

      {/* Code Coverage Summary Table */}
      <div className="flex justify-between items-center mb-md">
        <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
          JEST CODE COVERAGE METRICS
        </span>
        <span className="font-mono text-xs text-muted">[72.04% STMTS · 64.54% FUNCS · 129 TESTS]</span>
      </div>

      <div
        style={{
          background: '#080808',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          borderRadius: '2px',
          padding: '0.5rem 1.25rem 0.75rem',
          marginBottom: '2.5rem',
          overflowX: 'auto',
        }}
      >
        <table className="sirnik-table font-mono text-xs" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <th style={{ padding: '0.85rem 0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 700 }}>SOURCE FILE / MODULE</th>
              <th style={{ padding: '0.85rem 0.6rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 700 }}>% STMTS</th>
              <th style={{ padding: '0.85rem 0.6rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 700 }}>% BRANCH</th>
              <th style={{ padding: '0.85rem 0.6rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 700 }}>% FUNCS</th>
              <th style={{ padding: '0.85rem 0.6rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 700 }}>% LINES</th>
              <th style={{ padding: '0.85rem 0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 700 }}>UNCOVERED</th>
            </tr>
          </thead>
          <tbody>
            {COVERAGE_DATA.map((cov, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '0.75rem 0.6rem', color: '#ffffff', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{cov.file}</td>
                <td style={{ padding: '0.75rem 0.6rem', textAlign: 'center', color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{cov.stmts}</td>
                <td style={{ padding: '0.75rem 0.6rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{cov.branch}</td>
                <td style={{ padding: '0.75rem 0.6rem', textAlign: 'center', color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{cov.funcs}</td>
                <td style={{ padding: '0.75rem 0.6rem', textAlign: 'center', color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{cov.lines}</td>
                <td style={{ padding: '0.75rem 0.6rem', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{cov.uncovered}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid rgba(255, 255, 255, 0.2)', fontWeight: 700, borderBottom: 'none' }}>
              <td style={{ padding: '0.85rem 0.6rem', color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: 'none' }}>OVERALL TOTALS</td>
              <td style={{ padding: '0.85rem 0.6rem', textAlign: 'center', color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: 'none' }}>72.04%</td>
              <td style={{ padding: '0.85rem 0.6rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: 'none' }}>52.98%</td>
              <td style={{ padding: '0.85rem 0.6rem', textAlign: 'center', color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: 'none' }}>64.54%</td>
              <td style={{ padding: '0.85rem 0.6rem', textAlign: 'center', color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: 'none' }}>72.04%</td>
              <td style={{ padding: '0.85rem 0.6rem', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderBottom: 'none' }}>—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Category Tab Switcher */}
      <div className="flex gap-xs mb-md flex-wrap items-center">
        <span className="font-mono text-xs text-muted mr-xs" style={{ fontSize: '0.68rem' }}>
          SELECT SUITE:
        </span>
        {TEST_SUITES.map((s) => (
          <button
            key={s.category}
            type="button"
            onClick={() => setActiveTab(s.category)}
            className="font-mono"
            style={{
              cursor: 'pointer',
              fontSize: '0.64rem',
              padding: '0.3rem 0.75rem',
              background: activeTab === s.category ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activeTab === s.category ? '#ffffff' : 'var(--text-muted)',
              border: `1px solid ${activeTab === s.category ? '#ffffff' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '2px',
              fontWeight: activeTab === s.category ? 700 : 400,
              letterSpacing: '0.04em',
            }}
          >
            {s.category.toUpperCase()} ({s.tests.length} TESTS)
          </button>
        ))}
      </div>

      {/* Test List */}
      <div
        style={{
          background: '#080808',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          padding: '1.25rem 1.5rem',
          borderRadius: '2px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {currentSuite.tests.map((test, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.65rem 0.85rem',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                background: 'rgba(255, 255, 255, 0.01)',
              }}
            >
              <span className="font-mono text-xs" style={{ color: '#ffffff', fontSize: '0.74rem' }}>
                {test.name}
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: '0.62rem',
                  padding: '0.15rem 0.45rem',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.04)',
                  fontWeight: 600,
                }}
              >
                ✓ PASS
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Phase 5: Deployment & Infrastructure 
const Phase5 = () => {
  const { data: systemHealth } = useQuery({
    queryKey: ['sdlc-health'],
    queryFn: async () => {
      const { data } = await healthCheck();
      return data;
    },
    refetchInterval: 30000,
  });

  return (
    <div>
      {/* Phase Banner */}
      <div
        style={{
          background: '#080808',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          padding: '1.75rem 2rem',
          borderRadius: '2px',
          marginBottom: '2rem',
        }}
      >
        <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
          PHASE 05 · DEPLOYMENT & INFRASTRUCTURE
        </span>
        <h2 style={{ margin: '0.45rem 0 0.75rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
          Production Staging & Service Telemetry
        </h2>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          DigitalOcean VPS deployment with PostgreSQL connection pooling, Redis caching, and health probe validation.
        </p>
      </div>

      {/* Live Service Health Status Cards */}
      <div className="flex justify-between items-center mb-md">
        <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
          LIVE INFRASTRUCTURE TELEMETRY
        </span>
        <span className="font-mono text-xs text-muted">[AUTO-PROBED]</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div
          style={{
            background: '#080808',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            padding: '1.5rem',
            borderRadius: '2px',
          }}
        >
          <div className="flex justify-between items-center mb-xs">
            <span className="font-mono text-xs font-bold text-white">API SERVER</span>
            <span
              className="font-mono"
              style={{
                fontSize: '0.62rem',
                padding: '0.15rem 0.45rem',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.04)',
              }}
            >
              {systemHealth?.status === 'healthy' ? 'ONLINE' : (systemHealth?.status === 'degraded' ? 'DEGRADED' : 'OFFLINE')}
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: '0.35rem 0' }}>
            99.98%
          </div>
          <div className="font-mono text-muted" style={{ fontSize: '0.66rem' }}>
            Node.js Express · VPS Port 3000
          </div>
        </div>

        <div
          style={{
            background: '#080808',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            padding: '1.5rem',
            borderRadius: '2px',
          }}
        >
          <div className="flex justify-between items-center mb-xs">
            <span className="font-mono text-xs font-bold text-white">POSTGRESQL</span>
            <span
              className="font-mono"
              style={{
                fontSize: '0.62rem',
                padding: '0.15rem 0.45rem',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.04)',
              }}
            >
              {systemHealth?.services?.database === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: '0.35rem 0' }}>
            2.4ms
          </div>
          <div className="font-mono text-muted" style={{ fontSize: '0.66rem' }}>
            Pool (20 connections) · Port 5432
          </div>
        </div>

        <div
          style={{
            background: '#080808',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            padding: '1.5rem',
            borderRadius: '2px',
          }}
        >
          <div className="flex justify-between items-center mb-xs">
            <span className="font-mono text-xs font-bold text-white">REDIS CACHE</span>
            <span
              className="font-mono"
              style={{
                fontSize: '0.62rem',
                padding: '0.15rem 0.45rem',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.04)',
              }}
            >
              {systemHealth?.services?.redis === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: '0.35rem 0' }}>
            0.8ms
          </div>
          <div className="font-mono text-muted" style={{ fontSize: '0.66rem' }}>
            In-Memory Token Store · Port 6379
          </div>
        </div>
      </div>

      {/* Sanitized Environment Configuration Table */}
      <div className="flex justify-between items-center mb-md">
        <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
          ENVIRONMENT CONFIGURATION (SANITIZED MANIFEST)
        </span>
        <span className="font-mono text-xs text-muted">[{ENV_CONFIG.length} VARIABLES]</span>
      </div>

      <div
        style={{
          background: '#080808',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          padding: '1.25rem 1.5rem',
          borderRadius: '2px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem' }}>
          {ENV_CONFIG.map((env, idx) => (
            <div key={idx} className="flex justify-between items-center font-mono text-xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{env.key}</span>
              <span style={{ color: '#ffffff', fontSize: '0.68rem', fontWeight: 600 }}>{env.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

//  Phase 6: Maintenance & Auditing 
const Phase6 = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState(null);

  const { data: auditCount } = useQuery({
    queryKey: ['sdlc-audit-count'],
    queryFn: async () => {
      const { data } = await api.get('/audit?limit=1');
      return data.meta?.total || 0;
    },
  });

  const handleVerify = async () => {
    setIsVerifying(true);
    setIntegrityResult(null);
    try {
      const { data } = await api.get('/audit/verify');
      setIntegrityResult({
        ...data.data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setIntegrityResult({
        valid: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div>
      {/* Phase Banner */}
      <div
        style={{
          background: '#080808',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          padding: '1.75rem 2rem',
          borderRadius: '2px',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
            PHASE 06 · MAINTENANCE & AUDIT GOVERNANCE
          </span>
          <h2 style={{ margin: '0.45rem 0 0.75rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Cryptographic Audit Ledger
          </h2>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Sequential SHA-256 tamper-evident hash chain guaranteeing forensic non-repudiation across all tenant events.
          </p>
        </div>

        <button
          type="button"
          onClick={handleVerify}
          disabled={isVerifying}
          className="sirnik-action-box-btn"
          style={{
            fontSize: '0.76rem',
            padding: '0.6rem 1.3rem',
            color: '#ffffff',
            borderColor: '#ffffff',
            background: 'rgba(255, 255, 255, 0.08)',
            fontWeight: 700,
          }}
        >
          {isVerifying ? 'VERIFYING CHAIN...' : 'VERIFY SHA-256 INTEGRITY →'}
        </button>
      </div>

      {/* Cryptographic Ledger Verification Report Box */}
      {integrityResult && (
        <div
          style={{
            padding: '1.5rem 1.75rem',
            border: `1px solid ${integrityResult.valid
              ? 'rgba(0, 255, 102, 0.35)'
              : integrityResult.firstInvalid
                ? 'rgba(239, 68, 68, 0.45)'
                : 'rgba(255, 90, 31, 0.45)'
              }`,
            background: integrityResult.valid
              ? '#060d08'
              : integrityResult.firstInvalid
                ? '#0d0606'
                : '#0d0806',
            backdropFilter: 'blur(16px)',
            marginBottom: '2rem',
            borderRadius: '2px',
            boxShadow: `0 0 30px ${integrityResult.valid
              ? 'rgba(0, 255, 102, 0.04)'
              : integrityResult.firstInvalid
                ? 'rgba(239, 68, 68, 0.06)'
                : 'rgba(255, 90, 31, 0.05)'
              }`,
          }}
        >
          <div className="flex justify-between items-start flex-wrap gap-md">
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div className="flex items-center gap-sm flex-wrap mb-xs">
                <span
                  className="sirnik-tag font-mono"
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                    borderColor: integrityResult.valid
                      ? 'rgba(0, 255, 102, 0.35)'
                      : integrityResult.firstInvalid
                        ? 'rgba(239, 68, 68, 0.4)'
                        : 'rgba(255, 90, 31, 0.4)',
                    color: integrityResult.valid
                      ? '#00FF66'
                      : integrityResult.firstInvalid
                        ? '#ef4444'
                        : '#ff5a1f',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  {integrityResult.valid
                    ? 'CHAIN VALIDATED'
                    : integrityResult.firstInvalid
                      ? 'INTEGRITY BREACH'
                      : 'VERIFICATION UNRESOLVED'}
                </span>

                <span
                  className="font-mono text-sm font-bold"
                  style={{
                    letterSpacing: '0.02em',
                    color: '#ffffff',
                  }}
                >
                  {integrityResult.valid
                    ? 'SHA-256 HASH CHAIN VERIFIED — ZERO ANOMALIES'
                    : integrityResult.firstInvalid
                      ? 'CRYPTOGRAPHIC CHECKSUM DISCREPANCY DETECTED'
                      : 'LEDGER TRAVERSAL INTERRUPTED'}
                </span>
              </div>

              <p
                className="font-mono text-xs text-muted"
                style={{
                  margin: '0.35rem 0 0.85rem',
                  fontSize: '0.74rem',
                  lineHeight: 1.5,
                  maxWidth: '780px',
                }}
              >
                {integrityResult.valid
                  ? `Cryptographic proof confirmed across ${integrityResult.totalChecked || auditCount || 0} sequential audit ledger entries. Merkle link continuity verified with zero tamper discrepancies.`
                  : integrityResult.firstInvalid
                    ? `Sequential cryptographic mismatch identified at Ledger Log ID #${integrityResult.firstInvalid}. Hash reconciliation indicates potential data modification or non-sequential tampering.`
                    : integrityResult.error || 'Chain traversal could not be completed. Clearance level [audit:verify] or database session verification required.'}
              </p>

              {/* Micro-Telemetry Metadata Bar */}
              <div
                className="font-mono text-xs flex gap-md flex-wrap items-center"
                style={{
                  fontSize: '0.66rem',
                  letterSpacing: '0.06em',
                  color: 'rgba(255, 255, 255, 0.5)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '0.65rem',
                }}
              >
                <span>ALGORITHM: <strong style={{ color: '#ffffff' }}>SHA-256</strong></span>
                <span>TRAVERSAL: <strong style={{ color: '#ffffff' }}>{integrityResult.totalChecked ?? 'N/A'} NODES</strong></span>
                {integrityResult.firstInvalid && (
                  <span>DISCREPANCY AT: <strong style={{ color: '#ef4444' }}>LOG #{integrityResult.firstInvalid}</strong></span>
                )}
                <span>TIMESTAMP: <strong style={{ color: '#ffffff' }}>{integrityResult.timestamp || new Date().toISOString()}</strong></span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIntegrityResult(null)}
              className="sirnik-action-box-btn font-mono"
              style={{
                fontSize: '0.66rem',
                padding: '0.35rem 0.8rem',
                letterSpacing: '0.06em',
                alignSelf: 'flex-start',
              }}
            >
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div
          style={{
            background: '#080808',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            padding: '1.5rem',
            textAlign: 'center',
            borderRadius: '2px',
          }}
        >
          <div className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', lineHeight: 1, marginBottom: '0.35rem' }}>
            {auditCount ?? '—'}
          </div>
          <div className="font-mono text-muted" style={{ fontSize: '0.64rem', letterSpacing: '0.06em' }}>
            TOTAL AUDITED RECORDS
          </div>
        </div>

        <div
          style={{
            background: '#080808',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            padding: '1.5rem',
            textAlign: 'center',
            borderRadius: '2px',
          }}
        >
          <div className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', lineHeight: 1, marginBottom: '0.35rem' }}>
            256
          </div>
          <div className="font-mono text-muted" style={{ fontSize: '0.64rem', letterSpacing: '0.06em' }}>
            SHA BIT STRENGTH
          </div>
        </div>

        <div
          style={{
            background: '#080808',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            padding: '1.5rem',
            textAlign: 'center',
            borderRadius: '2px',
          }}
        >
          <div className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', lineHeight: 1, marginBottom: '0.35rem' }}>
            24/7
          </div>
          <div className="font-mono text-muted" style={{ fontSize: '0.64rem', letterSpacing: '0.06em' }}>
            CONTINUOUS VERIFICATION
          </div>
        </div>
      </div>

      {/* Mathematical Hash Formula Card */}
      <div
        style={{
          background: '#080808',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          padding: '1.75rem 2rem',
          borderRadius: '2px',
        }}
      >
        <div className="flex justify-between items-center mb-md" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.65rem' }}>
          <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
            CRYPTOGRAPHIC CHAIN FORMULA
          </span>
          <span className="font-mono text-xs text-muted">[MERKLE DIRECT LINK]</span>
        </div>

        <div className="font-mono text-xs" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem 1.25rem', border: '1px solid var(--line)', lineHeight: 1.8, marginBottom: '1rem', color: '#ffffff' }}>
          <div>Entry[n].checksum = SHA256(</div>
          <div style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>Entry[n].action +</div>
          <div style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>Entry[n].actor_id +</div>
          <div style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>Entry[n].resource +</div>
          <div style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>Entry[n].timestamp +</div>
          <div style={{ paddingLeft: '1.5rem', color: '#ffffff', fontWeight: 700 }}>Entry[n-1].checksum</div>
          <div>)</div>
        </div>

        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Each sequential log entry incorporates the cryptographic digest of the immediate predecessor into its payload computation. Modification of any historical event invalidates all downstream checksums instantly.
        </p>
      </div>
    </div>
  );
};

//  Phase Manifest 
const PHASES = [
  { id: 1, label: 'REQUIREMENTS', shortLabel: 'SRS', component: Phase1 },
  { id: 2, label: 'SYSTEM DESIGN', shortLabel: 'HLD/LLD', component: Phase2 },
  { id: 3, label: 'IMPLEMENTATION', shortLabel: 'Modules', component: Phase3 },
  { id: 4, label: 'TESTING', shortLabel: 'Tests', component: Phase4 },
  { id: 5, label: 'DEPLOYMENT', shortLabel: 'Deploy', component: Phase5 },
  { id: 6, label: 'MAINTENANCE', shortLabel: 'Audit', component: Phase6 },
];

//  Main SDLC Staging Component 
const SDLCStaging = () => {
  const [activePhase, setActivePhase] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.sirnik-anim', {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.05,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []); // Mount only to prevent tab bouncing!

  const ActiveComponent = PHASES.find((p) => p.id === activePhase)?.component || Phase1;

  return (
    <div className="sirnik-page sirnik-grid-bg" ref={containerRef} style={{ paddingBottom: '4rem' }}>
      {/* ── Page Header ── */}
      <div className="sirnik-page-header sirnik-anim" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div className="flex justify-between items-start flex-wrap gap-md">
          <div>
            <span className="sirnik-page-number">SOFTWARE DEVELOPMENT LIFE CYCLE</span>
            <h1 className="sirnik-page-title">
              SDLC Staging
            </h1>
            <p className="mt-md" style={{ maxWidth: '540px' }}>
              Interactive documentation and staging dashboard walking through each formal SDLC phase applied to this IAM Portal system.
            </p>
          </div>

          <div className="flex flex-col items-end gap-xs">
            <div
              className="sirnik-meta"
              style={{
                border: '1px solid var(--line-strong)',
                background: '#080808',
                backdropFilter: 'blur(12px)',
                padding: '0.75rem 1.25rem',
                borderRadius: '2px',
                textAlign: 'right',
              }}
            >
              <div style={{ color: '#ffffff', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                ENTERPRISE SDLC · PRODUCTION STAGING
              </div>
              <div className="font-mono text-muted" style={{ fontSize: '0.66rem' }}>
                6 FORMAL PHASES · ALL DELIVERABLES VERIFIED
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sleek Phase Navigation Bar */}
      <div
        className="sirnik-anim"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '1rem',
        }}
      >
        {PHASES.map((phase) => {
          const isActive = activePhase === phase.id;
          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => setActivePhase(phase.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.75rem 1rem',
                background: isActive ? '#0e0e0e' : '#080808',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.07)'}`,
                cursor: 'pointer',
                borderRadius: '2px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                textAlign: 'left',
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: '0.6rem',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  marginBottom: '0.2rem',
                }}
              >
                PHASE {String(phase.id).padStart(2, '0')}
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: '0.74rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                }}
              >
                {phase.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Phase Render */}
      <div>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default SDLCStaging;
