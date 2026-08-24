# Changelog

All notable changes to the **Aegis IAM** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
