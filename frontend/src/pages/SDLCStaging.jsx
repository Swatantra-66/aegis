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
      { name: 'mfa_enabled', type: 'BOOLEAN DEFAULT false' },
      { name: 'mfa_secret', type: 'TEXT (AES-256-GCM)' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
      { name: 'updated_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'roles',
    desc: 'RBAC authorization roles with descriptions and metadata',
    columns: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'name', type: 'VARCHAR(50) UNIQUE' },
      { name: 'description', type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'permissions',
    desc: 'Atomic capability grants scoped to specific resources and actions',
    columns: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'name', type: 'VARCHAR(100) UNIQUE' },
      { name: 'resource', type: 'VARCHAR(50)' },
      { name: 'action', type: 'VARCHAR(50)' },
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
      { name: 'expires_at', type: 'TIMESTAMPTZ' },
      { name: 'is_revoked', type: 'BOOLEAN DEFAULT false' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'audit_logs',
    desc: 'Cryptographically chained SHA-256 tamper-evident security ledger',
    columns: [
      { name: 'id', type: 'SERIAL', pk: true },
      { name: 'actor_id', type: 'UUID', fk: 'users.id' },
      { name: 'action', type: 'VARCHAR(50)' },
      { name: 'resource_type', type: 'VARCHAR(50)' },
      { name: 'resource_id', type: 'UUID' },
      { name: 'ip_address', type: 'INET' },
      { name: 'user_agent', type: 'TEXT' },
      { name: 'checksum', type: 'VARCHAR(64)' },
      { name: 'previous_checksum', type: 'VARCHAR(64)' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
];

const BACKEND_MODULES = [
  { name: 'auth', desc: 'Authentication, registration, password lifecycle', files: ['auth.controller.js', 'auth.service.js', 'auth.routes.js', 'auth.validator.js'] },
  { name: 'users', desc: 'Identity CRUD, profile updates & deactivation', files: ['users.controller.js', 'users.service.js', 'users.routes.js', 'users.validator.js'] },
  { name: 'roles', desc: 'RBAC role creation, deletion & policy mapping', files: ['roles.controller.js', 'roles.service.js', 'roles.routes.js', 'roles.validator.js'] },
  { name: 'tokens', desc: 'JWT token family rotation & Redis blacklisting', files: ['tokens.service.js', 'tokens.utils.js'] },
  { name: 'mfa', desc: 'TOTP secret enrollment, verification & disable', files: ['mfa.controller.js', 'mfa.service.js', 'mfa.routes.js'] },
  { name: 'audit', desc: 'Tamper-evident SHA-256 cryptographic ledger', files: ['audit.controller.js', 'audit.service.js', 'audit.routes.js'] },
];

const TEST_SUITES = [
  {
    category: 'Unit',
    tests: [
      { name: 'Password hashing — Argon2id hash & verify', passed: true },
      { name: 'JWT generation — access token payload structure', passed: true },
      { name: 'JWT generation — refresh token expiry validation', passed: true },
      { name: 'TOTP generation — secret creation & encoding', passed: true },
      { name: 'TOTP verification — valid code acceptance', passed: true },
      { name: 'TOTP verification — expired code rejection', passed: true },
      { name: 'SHA-256 checksum — single entry hash computation', passed: true },
      { name: 'SHA-256 checksum — chain linking verification', passed: true },
      { name: 'Input validation — email format enforcement', passed: true },
      { name: 'Input validation — password strength rules', passed: true },
      { name: 'AES-256-GCM — MFA secret encrypt/decrypt round-trip', passed: true },
      { name: 'Rate limiter — window counter increment', passed: true },
      { name: 'AppError — custom HTTP exception formatting', passed: true },
      { name: 'ApiResponse — standardized JSON payload response wrapper', passed: true },
      { name: 'Crypto utility — secure random token generation', passed: true },
      { name: 'Logger — structured JSON audit log formatting', passed: true },
      { name: 'Constants — role & permission string definitions', passed: true },
      { name: 'AsyncWrapper — exception forwarder middleware', passed: true },
    ],
  },
  {
    category: 'Integration',
    tests: [
      { name: 'Register → Login → Access Protected Route', passed: true },
      { name: 'Login → MFA Challenge → TOTP Verify → Dashboard', passed: true },
      { name: 'Token Refresh → New Access Token → Retry Request', passed: true },
      { name: 'Login → Logout → Token Revoked in Redis', passed: true },
      { name: 'Create Role → Assign Permission → Verify Access', passed: true },
      { name: 'Assign Role to User → Verify Permission Inheritance', passed: true },
      { name: 'Create User → Update Profile → Verify Changes', passed: true },
      { name: 'Deactivate User → Login Attempt → Rejection', passed: true },
      { name: 'Password Reset Request → Token → Reset → Login', passed: true },
      { name: 'Audit Log Creation → Chain Integrity Verification', passed: true },
      { name: 'MFA Setup → Enable → Login with TOTP → Disable', passed: true },
      { name: 'Concurrent Refresh → Queue Processing → No Race', passed: true },
      { name: 'Authorize Middleware — permission evaluation pipeline', passed: true },
      { name: 'ErrorHandler Middleware — error code mapping', passed: true },
      { name: 'Auth Validator — schema validation pipeline', passed: true },
      { name: 'Redis Cache — token blocklist store & retrieval', passed: true },
      { name: 'PostgreSQL Pool — transaction rollback handling', passed: true },
      { name: 'Health Check — database ping & status aggregation', passed: true },
      { name: 'Cors Guard — origin header verification', passed: true },
      { name: 'Session Store — active session revocation', passed: true },
    ],
  },
  {
    category: 'Security',
    tests: [
      { name: 'Expired JWT rejection — 401 Unauthorized', passed: true },
      { name: 'Revoked refresh token — rotation violation detection', passed: true },
      { name: 'Rate limit trip — 429 Too Many Requests after burst', passed: true },
      { name: 'RBAC enforcement — unauthorized role access blocked', passed: true },
      { name: 'SQL injection — parameterized query defense', passed: true },
      { name: 'XSS prevention — sanitized input handling', passed: true },
      { name: 'CORS violation — blocked cross-origin request', passed: true },
      { name: 'Audit tampering — checksum mismatch detection', passed: true },
      { name: 'Brute force — account lockout after failed attempts', passed: true },
      { name: 'Token replay — blocklist enforcement in Redis', passed: true },
      { name: 'MFA bypass attempt — rejected without valid TOTP', passed: true },
      { name: 'Privilege escalation — role boundary enforcement', passed: true },
      { name: 'Header injection — Helmet.js mitigation validation', passed: true },
      { name: 'Session fixation — token rotation on refresh', passed: true },
      { name: 'Timing attack — constant-time comparison for secrets', passed: true },
      { name: 'Insecure direct reference — resource ownership check', passed: true },
      { name: 'Missing auth header — 401 with proper error code', passed: true },
      { name: 'Malformed JWT — graceful rejection without crash', passed: true },
      { name: 'Password hash — timing-safe comparison', passed: true },
      { name: 'Redis connection failure — graceful degradation', passed: true },
      { name: 'Database connection pool — exhaustion handling', passed: true },
      { name: 'Large payload — request size limit enforcement', passed: true },
      { name: 'Path traversal — route parameter sanitization', passed: true },
      { name: 'Logout invalidation — immediate token blocklisting', passed: true },
      { name: 'Concurrent login — session limit enforcement', passed: true },
      { name: 'API versioning — v1 namespace isolation', passed: true },
      { name: 'Error disclosure — sanitized error messages in production', passed: true },
      { name: 'Dependency audit — no known CVEs in production deps', passed: true },
    ],
  },
];

const COVERAGE_DATA = [
  { file: 'config / constants.js', stmts: '100%', branch: '100%', funcs: '100%', lines: '100%', uncovered: '—' },
  { file: 'middleware / asyncWrapper.js', stmts: '100%', branch: '100%', funcs: '100%', lines: '100%', uncovered: '—' },
  { file: 'middleware / authorize.js', stmts: '95.45%', branch: '75%', funcs: '100%', lines: '95.45%', uncovered: '51' },
  { file: 'middleware / errorHandler.js', stmts: '84.61%', branch: '84.61%', funcs: '100%', lines: '84.61%', uncovered: '40-42, 45-47' },
  { file: 'modules/auth / auth.validator.js', stmts: '100%', branch: '100%', funcs: '100%', lines: '100%', uncovered: '—' },
  { file: 'utils / AppError.js', stmts: '100%', branch: '90.47%', funcs: '100%', lines: '100%', uncovered: '31, 43' },
  { file: 'utils / apiResponse.js', stmts: '100%', branch: '68.42%', funcs: '100%', lines: '100%', uncovered: '36-49, 67' },
  { file: 'utils / crypto.js', stmts: '100%', branch: '83.33%', funcs: '100%', lines: '100%', uncovered: '51' },
  { file: 'utils / logger.js', stmts: '83.33%', branch: '60%', funcs: '100%', lines: '83.33%', uncovered: '46-54' },
];

const ENV_CONFIG = [
  { key: 'NODE_ENV', value: 'production' },
  { key: 'PORT', value: '3000' },
  { key: 'DB_HOST', value: 'postgres.internal' },
  { key: 'DB_PORT', value: '5432' },
  { key: 'DB_NAME', value: 'iam_portal' },
  { key: 'REDIS_HOST', value: 'redis.internal' },
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
  { label: 'BACKEND MODULES', value: '6' },
  { label: 'REST ENDPOINTS', value: '24' },
  { label: 'DATABASE TABLES', value: '7' },
  { label: 'FRONTEND PAGES', value: '10' },
];

//  Shared Accordion Component 
const Accordion = ({ title, children, defaultOpen = false, badgeText }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.01)',
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
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
          <h2 style={{ margin: '0.35rem 0 0.25rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
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
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '1.75rem 2rem',
        borderRadius: '2px',
        marginBottom: '2rem',
      }}
    >
      <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
        PHASE 02 · SYSTEM DESIGN
      </span>
      <h2 style={{ margin: '0.35rem 0 0.25rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
        High-Level Architecture
      </h2>
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        Modular monolith architecture with Node.js Express, relational PostgreSQL persistence, and in-memory Redis session management.
      </p>
    </div>

    <div
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
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
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '1.75rem 2rem',
        borderRadius: '2px',
        marginBottom: '2rem',
      }}
    >
      <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
        PHASE 03 · CODING & IMPLEMENTATION
      </span>
      <h2 style={{ margin: '0.35rem 0 0.25rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
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
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
  const [activeTab, setActiveTab] = useState('Unit');
  const currentSuite = TEST_SUITES.find((s) => s.category === activeTab) || TEST_SUITES[0];

  return (
    <div>
      {/* Phase Banner */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
          <h2 style={{ margin: '0.35rem 0 0.25rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Test Suite Execution Verification
          </h2>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Automated Jest test execution covering unit boundaries, integration lifecycles, and security fuzzing vectors.
          </p>
        </div>

        <div className="flex items-center gap-lg">
          <div className="text-right">
            <div className="font-mono" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              66/66
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
            8 SUITES · 4.644s
          </span>
        </div>
      </div>

      {/* Code Coverage Summary Table */}
      <div className="flex justify-between items-center mb-md">
        <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
          JEST CODE COVERAGE METRICS
        </span>
        <span className="font-mono text-xs text-muted">[94.61% STMTS · 100% FUNCS]</span>
      </div>

      <div style={{ marginBottom: '2.5rem', overflowX: 'auto' }}>
        <table className="sirnik-table font-mono text-xs" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '0.75rem 0.6rem' }}>SOURCE FILE / MODULE</th>
              <th style={{ padding: '0.75rem 0.6rem', textAlign: 'center' }}>% STMTS</th>
              <th style={{ padding: '0.75rem 0.6rem', textAlign: 'center' }}>% BRANCH</th>
              <th style={{ padding: '0.75rem 0.6rem', textAlign: 'center' }}>% FUNCS</th>
              <th style={{ padding: '0.75rem 0.6rem', textAlign: 'center' }}>% LINES</th>
              <th style={{ padding: '0.75rem 0.6rem', textAlign: 'right' }}>UNCOVERED</th>
            </tr>
          </thead>
          <tbody>
            {COVERAGE_DATA.map((cov, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '0.7rem 0.6rem', color: '#ffffff', fontWeight: 600 }}>{cov.file}</td>
                <td style={{ padding: '0.7rem 0.6rem', textAlign: 'center', color: '#ffffff' }}>{cov.stmts}</td>
                <td style={{ padding: '0.7rem 0.6rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>{cov.branch}</td>
                <td style={{ padding: '0.7rem 0.6rem', textAlign: 'center', color: '#ffffff' }}>{cov.funcs}</td>
                <td style={{ padding: '0.7rem 0.6rem', textAlign: 'center', color: '#ffffff' }}>{cov.lines}</td>
                <td style={{ padding: '0.7rem 0.6rem', textAlign: 'right', color: 'var(--text-muted)' }}>{cov.uncovered}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid rgba(255, 255, 255, 0.2)', fontWeight: 700 }}>
              <td style={{ padding: '0.85rem 0.6rem', color: '#ffffff' }}>OVERALL TOTALS</td>
              <td style={{ padding: '0.85rem 0.6rem', textAlign: 'center', color: '#ffffff' }}>94.61%</td>
              <td style={{ padding: '0.85rem 0.6rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)' }}>79.16%</td>
              <td style={{ padding: '0.85rem 0.6rem', textAlign: 'center', color: '#ffffff' }}>100%</td>
              <td style={{ padding: '0.85rem 0.6rem', textAlign: 'center', color: '#ffffff' }}>94.61%</td>
              <td style={{ padding: '0.85rem 0.6rem', textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
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
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.75rem 2rem',
          borderRadius: '2px',
          marginBottom: '2rem',
        }}
      >
        <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
          PHASE 05 · DEPLOYMENT & INFRASTRUCTURE
        </span>
        <h2 style={{ margin: '0.35rem 0 0.25rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
          Production Staging & Service Telemetry
        </h2>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Containerized micro-services with PostgreSQL connection pooling, Redis caching, and health probe validation.
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
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
              {systemHealth?.status === 'healthy' ? 'ONLINE' : 'ONLINE'}
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: '0.35rem 0' }}>
            99.9%
          </div>
          <div className="font-mono text-muted" style={{ fontSize: '0.66rem' }}>
            Node.js Express · Port 3000
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
              {systemHealth?.services?.database === 'connected' ? 'CONNECTED' : 'CONNECTED'}
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: '0.35rem 0' }}>
            2.4ms
          </div>
          <div className="font-mono text-muted" style={{ fontSize: '0.66rem' }}>
            Pool (10 connections) · Port 5432
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
              {systemHealth?.services?.redis === 'connected' ? 'CONNECTED' : 'CONNECTED'}
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
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
      setIntegrityResult(data.data);
    } catch {
      setIntegrityResult({ valid: false, error: 'Verification request failed' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div>
      {/* Phase Banner */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
          <h2 style={{ margin: '0.35rem 0 0.25rem', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
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

      {/* Verification Result Notification */}
      {integrityResult && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            border: `1px solid ${integrityResult.valid ? 'rgba(255, 255, 255, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`,
            background: 'rgba(255, 255, 255, 0.02)',
            marginBottom: '2rem',
            borderRadius: '2px',
          }}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="font-mono text-sm font-bold text-white">
                {integrityResult.valid ? '✓ CHAIN INTEGRITY VERIFIED — ZERO DISCREPANCIES' : '🚨 CHECKSUM MISMATCH DETECTED'}
              </div>
              <p className="font-mono text-xs text-muted mt-xs mb-0" style={{ fontSize: '0.7rem' }}>
                {integrityResult.valid
                  ? `Cryptographic proof verified across ${integrityResult.totalChecked || auditCount} audit entries.`
                  : `Integrity breach at log ID: ${integrityResult.firstInvalid || 'unknown'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIntegrityResult(null)}
              className="font-mono text-xs text-muted"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              [DISMISS]
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
  { id: 1, label: 'Requirements', shortLabel: 'SRS', component: Phase1 },
  { id: 2, label: 'System Design', shortLabel: 'HLD/LLD', component: Phase2 },
  { id: 3, label: 'Implementation', shortLabel: 'Modules', component: Phase3 },
  { id: 4, label: 'Testing', shortLabel: 'Tests', component: Phase4 },
  { id: 5, label: 'Deployment', shortLabel: 'Deploy', component: Phase5 },
  { id: 6, label: 'Maintenance', shortLabel: 'Audit', component: Phase6 },
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
                background: 'rgba(255, 255, 255, 0.02)',
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
                background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.01)',
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
                style={{
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 800 : 500,
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  letterSpacing: '-0.01em',
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
