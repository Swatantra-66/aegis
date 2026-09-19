# Changelog

All notable changes to the **Aegis IAM** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-09-18

### Added
- **Zero-Trust Role Promotion & Demotion Lifecycle:**
  - Strict system role tiers: `super_admin` (Tier 3), `admin` (Tier 2), `user` (Tier 1).
  - Pessimistic row-level locking (`SELECT ... FOR UPDATE`) in PostgreSQL transactions to serialize concurrent role modifications per user identity.
  - Atomic single-transaction replacement of conflicting system-tier roles (`DELETE` conflicting + `INSERT` target in same transaction).
  - Transaction-bound session revocation (`tokenService.revokeAllUserTokens(userId, client)`). If token revocation fails, the entire transaction rolls back via `ROLLBACK`, guaranteeing zero silent privilege elevation.
  - Automatic purging of unconfirmed/pending MFA secrets on demotion to standard `user` (`mfa_secret = NULL, mfa_backup_codes = NULL WHERE mfa_enabled = false`).
  - Directional audit logging: dedicated `ROLE_PROMOTION_SESSION_REVOKED` on promotion and `TOKEN_REVOKED` on demotion.
- **Scoped MFA Enrollment Tokens:**
  - Scoped JWTs (`scope: 'mfa:enroll_only'`) issued to newly promoted administrators upon sign-in with 10-minute expiry (`MFA_ENROLLMENT_TOKEN_EXPIRY_MINUTES`).
  - Enforced isolation: standard endpoints reject enrollment tokens with `403 Forbidden` (`AUTH_TOKEN_SCOPE_RESTRICTED`), accepted only by `authenticateMfaEnrollment` on `/mfa/setup` and `/mfa/verify`.
  - Atomic one-time token consumption in Redis (`SET EX NX`) preventing token replay.
  - Row-locked verification requiring target user's role to still mandate MFA before granting elevated tokens.
- **Identity Lifecycle & Administrative Actions:**
  - Transactional user account restoration endpoint: `POST /api/v1/users/:id/activate`.
  - Transactional MFA reset endpoint: `POST /api/v1/users/:id/reset-mfa` with immediate session termination and audit logging.
- **Frontend Governance Enhancements:**
  - Role Assignment and Revocation modals with live policy impact notices (`PRIVILEGE ESCALATION - SESSION REVOCATION ENFORCED`).
  - Inline error preservation (`roleModalError` / `revokeModalError`) keeping dialogs open for operator remediation upon failure.
  - Single authoritative role tier display filter (`filterDisplayRoles`: `super_admin` > `admin` > `user`).
  - Automatic enrollment auto-eviction and redirect to `/login` if administrative role is revoked mid-setup (`AUTH_MFA_SETUP_NOT_REQUIRED`).

---

## [1.0.0] - 2026-08-25

### Added
- **Authentication & Security:**
  - JWT Access Token (15min) and Refresh Token generation with rotation and reuse detection.
  - Redis-backed token blacklisting for immediate session termination.
  - Argon2id password hashing with custom work factors.
  - Multi-Factor Authentication (MFA) via RFC 6238 TOTP with AES-256 encrypted secrets and emergency backup codes.
- **Access Control:**
  - Role-Based Access Control (RBAC) with granular permissions and middleware verification guards.
  - Pre-seeded default roles (`super_admin`, `admin`, `auditor`, `user`).
- **Telemetry & Auditing:**
  - Cryptographic tamper-evident audit logging with SHA-256 hash chaining.
  - Audit log integrity verification endpoint (`/api/v1/audit/verify`).
  - Winston structured logging and HTTP request loggers.
- **Protection & Performance:**
  - Tiered Redis rate limiters for auth, public APIs, and administrative endpoints.
  - Helmet HTTP security headers and CORS policies.
- **Frontend (Vite + React SPA):**
  - High-aesthetic dashboard with real-time security telemetry.
  - Landing page with animated kinetic emblems and design system.
  - Interactive user, role, and permission management interfaces.
  - Audit log explorer with integrity checksum verification visualizer.
  - SDLC staging workflow visualizer.
