# Software Requirements Specification (SRS)
## Aegis IAM — Enterprise Identity & Access Management Infrastructure

**Document Identifier:** `SRS-AEGIS-IAM-V1.0`  
**Standard:** IEEE Std 830-1998 Compliant  
**Project Name:** Aegis IAM (Identity & Access Management Portal)  
**Status:** Approved / Release Ready (`v1.4.0`)  
**Date of Submission:** 2026-08-25  
**Author / Team:** Swatantra & Vishek

---

## Table of Contents
1. [Introduction](#1-introduction)
   - 1.1 Purpose
   - 1.2 Document Conventions
   - 1.3 Intended Audience & Reading Suggestions
   - 1.4 Project Scope
   - 1.5 Definitions, Acronyms, and Abbreviations
   - 1.6 References
2. [Overall Description](#2-overall-description)
   - 2.1 Product Perspective & Context
   - 2.2 Product Core Functions
   - 2.3 User Classes and Role Personas
   - 2.4 Operating Environment
   - 2.5 Design & Implementation Constraints
   - 2.6 Assumptions and Dependencies
3. [External Interface Requirements](#3-external-interface-requirements)
   - 3.1 User Interfaces (UI)
   - 3.2 Hardware Interfaces
   - 3.3 Software Interfaces
   - 3.4 Communications & Network Interfaces
4. [System Features & Functional Requirements](#4-system-features--functional-requirements)
   - 4.1 Module 1: User Identity & Registration (`FR-01`, `FR-05`, `FR-16`)
   - 4.2 Module 2: Authentication & Token Lifecycle (`FR-02`, `FR-03`, `FR-04`, `FR-17`, `FR-18`)
   - 4.3 Module 3: Multi-Factor Authentication (MFA / TOTP) (`FR-06`, `FR-07`)
   - 4.4 Module 4: Role-Based Access Control (RBAC) (`FR-08`, `FR-09`, `FR-11`, `FR-12`)
   - 4.5 Module 5: User Administration & Directory (`FR-10`)
   - 4.6 Module 6: Tamper-Evident Audit Logging (`FR-13`, `FR-14`, `FR-15`)
   - 4.7 Module 7: SDLC Staging & Health Diagnostics Panel
5. [Non-Functional Requirements (NFRs)](#5-non-functional-requirements-nfrs)
   - 5.1 Security Requirements (`NFR-01` to `NFR-05`)
   - 5.2 Performance & SLA Requirements (`NFR-06` to `NFR-08`)
   - 5.3 Reliability, Availability & Fault Tolerance
   - 5.4 Maintainability, Portability & Testability
6. [Data Models & Schema Architecture](#6-data-models--schema-architecture)
   - 6.1 Entity-Relationship Model (ERD)
   - 6.2 Relational Data Dictionary
   - 6.3 Cryptographic Hash-Chain Log Model
7. [Verification & Requirements Traceability Matrix (RTM)](#7-verification--requirements-traceability-matrix-rtm)
   - 7.1 Traceability Matrix
   - 7.2 Acceptance & Validation Criteria

---

# 1. Introduction

### 1.1 Purpose
The purpose of this Software Requirements Specification (SRS) document is to provide a complete, formal, and unambiguous description of the functional, non-functional, interface, architectural, and security requirements for **Aegis IAM (Identity & Access Management Portal)**. This document serves as the formal baseline for system verification, testing, academic evaluation, and production deployment.

### 1.2 Document Conventions
This specification conforms to the IEEE Std 830-1998 recommendations for Software Requirements Specifications.
- **Requirement Identifiers:** Functional requirements are designated with `FR-XX` (e.g., `FR-01`), and non-functional requirements are designated with `NFR-XX` (e.g., `NFR-01`).
- **Priority Classifications:**
  - **High (Mandatory):** Core features essential for zero-trust security and authentication.
  - **Medium (Desirable):** Administrative and analytical management workflows.
  - **Low (Optional/Future):** Federation extensions (SCIM 2.0, OpenID Connect SSO).
- **Standards:** RFC 6238 (TOTP), RFC 7519 (JSON Web Tokens), RFC 6749 (OAuth 2.0 Authorization Framework), OWASP ASVS v4.0.

### 1.3 Intended Audience & Reading Suggestions
- **Evaluators / Academic Supervisors:** Read Section 1, 2, 4, 5, and 7 to review software engineering rigor, requirement coverage, and verification.
- **Software Engineers & Developers:** Refer to Section 3, 4, and 6 for API contracts, database schema definitions, and cryptographic workflows.
- **Security Auditors & DevSecOps:** Focus on Section 4.2, 4.3, 4.6, 5.1, and 6.3 to evaluate zero-trust security mechanisms, Argon2id hashing, and tamper-evident SHA-256 audit chaining.

### 1.4 Project Scope
**Aegis IAM** is an enterprise-grade, zero-trust Identity and Access Management platform engineered with a micro-modular backend architecture and a high-performance Single Page Application (SPA) frontend.
The platform provides:
1. Cryptographically secure identity lifecycle management (Registration, Password Reset, Profile self-service).
2. Multi-tier authentication pipeline using Dual-Token JWT with automatic Refresh Token Rotation (RTR) and Redis blocklisting.
3. Multi-Factor Authentication (MFA) adhering to RFC 6238 TOTP with AES-256-GCM encrypted secret storage.
4. Granular, bitmask/matrix-driven Role-Based Access Control (RBAC).
5. Append-only, tamper-evident cryptographic audit logging using sequential SHA-256 block-hash chaining.
6. Interactive Software Development Life Cycle (SDLC) Staging Dashboard visualizing all phases from requirements to deployment diagnostics.

### 1.5 Definitions, Acronyms, and Abbreviations
| Term | Definition |
| :--- | :--- |
| **IAM** | Identity and Access Management |
| **SRS** | Software Requirements Specification |
| **RBAC** | Role-Based Access Control |
| **JWT** | JSON Web Token (RFC 7519) |
| **RTR** | Refresh Token Rotation |
| **TOTP** | Time-based One-Time Password (RFC 6238) |
| **AES-256-GCM** | Advanced Encryption Standard with 256-bit key in Galois/Counter Mode |
| **Argon2id** | Memory-hard password hashing function (Winner of Password Hashing Competition) |
| **SHA-256** | Secure Hash Algorithm 256-bit |
| **CORS** | Cross-Origin Resource Sharing |
| **SPA** | Single Page Application |
| **SDLC** | Software Development Life Cycle |
| **RTM** | Requirements Traceability Matrix |

### 1.6 References
1. IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications*.
2. RFC 6238, *TOTP: Time-Based One-Time Password Algorithm*, IETF.
3. RFC 7519, *JSON Web Token (JWT)*, IETF.
4. NIST Special Publication 800-63B, *Digital Identity Guidelines: Authentication and Lifecycle Management*.
5. OWASP Foundation, *OWASP Application Security Verification Standard (ASVS) 4.0*.

---

# 2. Overall Description

### 2.1 Product Perspective & Context
Aegis IAM operates as a centralized security broker and administrative gateway for modern enterprise services and academic software engineering demonstrations. It decouples identity management from downstream microservices, ensuring standardized authentication, zero-trust authorization enforcement, and non-repudiation logging across all client interactions.

```
+-------------------------------------------------------------------------------+
|                                 CLIENT TIER                                   |
|       React 18 + Vite SPA (Obsidian Neo-Brutalist Theme / GSAP / Recharts)    |
+-------------------------------------------------------------------------------+
                                      │ HTTPS / JSON API
                                      ▼
+-------------------------------------------------------------------------------+
|                       AEGIS API GATEWAY & MIDDLEWARE                          |
|   Helmet.js Security Headers | Redis Rate Limiter | CORS Guard | JWT Validator|
+-------------------------------------------------------------------------------+
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
+───────────────+              +───────────────+              +────────────────+
|  Auth Module  |              |  RBAC Module  |              |  Audit Module  |
| • Argon2id    |              | • Role Matrix |              | • SHA-256 Hash |
| • JWT & RTR   |              | • Permissions |              |   Chain        |
| • TOTP MFA    |              | • User Roles  |              | • Verifier     |
+───────────────+              +───────────────+              +────────────────+
       │                              │                              │
       └──────────────────────────────┼──────────────────────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        +─────────────────────+               +─────────────────────+
        |  PostgreSQL 14+     |               |  Redis 6+           |
        |  ACID Persistent    |               |  In-Memory Token    |
        |  Relational Storage |               |  Blacklist & Cache  |
        +─────────────────────+               +─────────────────────+
```

### 2.2 Product Core Functions
1. **Zero-Trust Identity Lifecycle:** Automated registration, email verification stubbing, password complexity enforcement, Argon2id hashing, and self-service profile update.
2. **Dual-Token Lifecycle Engine:** Issuance of ephemeral 15-minute access tokens and long-lived refresh tokens with token family lineage tracking, single-use invalidation, and automated breach containment.
3. **Multi-Factor Authentication (MFA):** Real-time QR code provisioning, RFC 6238 TOTP verification, encrypted seed storage, and emergency backup codes.
4. **Hierarchical RBAC Engine:** Strict separation of privileges across predefined system roles and custom user-defined roles with atomic permission mappings.
5. **Tamper-Evident Audit Logging:** Cryptographically chained log records where every audit event embeds the hash of the preceding event, preventing retroactive modification or deletion.
6. **Live SDLC Staging Workspace:** In-app inspection suite showcasing requirements traceability, live database ERD, module trees, test suite executions (66+ unit/integration tests), and runtime service health.

### 2.3 User Classes and Role Personas

| Role Persona | Hierarchy Level | Key Permissions & Responsibilities |
| :--- | :--- | :--- |
| **Super Admin (`super_admin`)** | Level 1 (Full Access) | Complete system governance: assign/revoke administrative privileges, modify system roles, trigger full cryptographic audit verification, override security policies. |
| **System Administrator (`admin`)** | Level 2 (Management) | User lifecycle management (view, create, update, activate/deactivate accounts), assign user roles, inspect audit event telemetry. |
| **Security Auditor (`auditor`)** | Level 3 (Read-Only Compliance) | Read-only access to audit logs, cryptographic checksum verification panel, and compliance reports. Forbidden from modifying user records or roles. |
| **Standard User (`user`)** | Level 4 (Self-Service) | Manage personal profile, change password, enroll in/disable MFA, view own active session details. |

### 2.4 Operating Environment
- **Server Runtime:** Node.js v18.0.0+ (LTS) on Linux / macOS / Windows Server.
- **Backend Framework:** Express.js 4.19+ with modular route separation.
- **Database Management System:** PostgreSQL 14.0+ with `pgcrypto` extension for UUID generation.
- **In-Memory Cache & Session Broker:** Redis 6.2+ with persistent AOF/RDB configuration.
- **Client Web Browsers:** Modern evergreen web browsers (Chromium 110+, Firefox 110+, Safari 16+, Edge 110+).
- **Containerization:** Docker 20.10+ and Docker Compose v2.0+.

### 2.5 Design & Implementation Constraints
1. **Stateless Access Verification:** The API Gateway must verify incoming Access Tokens statelessly using public/symmetric cryptographic signatures without database query overhead on every request.
2. **Cryptographic Standard:** Argon2id must be used exclusively for user passwords; SHA-256 for audit hash chaining; AES-256-GCM for MFA secrets.
3. **Zero In-Memory Secret Leakage:** Refresh tokens must never be logged in cleartext; tokens in database must be hashed with SHA-256.
4. **Sub-second Token Revocation:** Redis blacklist checks must execute in $< 2\text{ms}$ during middleware evaluation.
5. **Design System Aesthetics:** High-contrast Neo-Brutalist Obsidian dark aesthetic (`#0A0A0C`), clean geometric borders (`#22242C`), electric green verification accents (`#00FF66`), and monospace telemetry typography.

### 2.6 Assumptions and Dependencies
- **System Time Synchronization:** Server host systems and MFA authenticating client devices must maintain clock synchronization via Network Time Protocol (NTP) with drift $< \pm 30$ seconds.
- **Database Availability:** PostgreSQL must provide ACID transactional guarantees for user registration, token rotation, and audit logging.
- **Cache Persistence:** Redis must remain operational for instant token revocation and distributed rate limiting.

---

# 3. External Interface Requirements

### 3.1 User Interfaces (UI)
The frontend is built with React 18, Vite, Lucide Icons, GSAP micro-animations, and Tailwind/Vanilla CSS styling tokens. Key UI views include:
1. **Public Landing Page (`/`):** Hero showcase with dynamic marquee ticker, security badges, live system status indicators, and quick links to authentication and SDLC documentation.
2. **Authentication Portal (`/login`, `/register`, `/forgot-password`, `/reset-password`):** Secure forms featuring client-side format validation, password strength indicators, toggleable visibility, and smooth error toasts.
3. **MFA Challenge View (`/mfa-challenge`):** 6-digit auto-advancing TOTP input field with timer progress indicator and backup code fallback modal.
4. **Security Overview Dashboard (`/dashboard/overview`):** 4 metric cards (Active Users, Active Sessions, Redis Blocklist Size, Audit Records) and Recharts dual-axis authentication time-series chart.
5. **User Management Directory (`/dashboard/users`):** Paginated data table with real-time search, role filter badges, active/inactive switches, and role assignment drawer.
6. **Roles & Permissions Matrix (`/dashboard/roles`):** Matrix grid mapping roles to atomic permissions with interactive toggle switches.
7. **Tamper-Evident Audit Log Viewer (`/dashboard/audit`):** Log stream with cryptographic checksum pill displays, filter controls, and interactive *“Verify Chain Integrity”* modal.
8. **Interactive SDLC Staging Workspace (`/dashboard/sdlc-staging`):** Tabbed interface covering all 6 SDLC phases (SRS Document Viewer, Interactive DB Schema ERD, Module Tree, Live Test Suite Runner, Deployment Health Checks, and Hash Checksum Verifier).

### 3.2 Hardware Interfaces
- **Minimum Server Specifications:** 2 vCPU, 2 GB RAM, 20 GB SSD storage.
- **Recommended Server Specifications:** 4 vCPU, 8 GB RAM, 50 GB NVMe SSD (capable of $> 5,000\text{ req/sec}$).
- **Client Devices:** Any computing device capable of running a modern web browser with JavaScript enabled.

### 3.3 Software Interfaces
- **PostgreSQL 14+:** Connected over TCP/IP via `pg` connection pool with parameterized queries to prevent SQL injection.
- **Redis 6+:** Connected via `ioredis` client for distributed key-value storage with TTL-based expiration.
- **TOTP Authenticator Apps:** Compatible with Google Authenticator, Microsoft Authenticator, Authy, 1Password via standard `otpauth://` URI schemes.
- **Swagger / OpenAPI 3.0:** Live interactive API documentation hosted at `/api-docs`.

### 3.4 Communications & Network Interfaces
- **Protocol:** HTTPS (TLS 1.3 / 1.2 required in production).
- **Data Exchange Format:** `application/json` for all API payloads and responses.
- **Header Protocols:**
  - `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  - Standard CORS configuration restricting pre-flight `OPTIONS` requests to authorized domain origins.

---

# 4. System Features & Functional Requirements

```
                                  AEGIS FUNCTIONAL MODULE MAP
  ┌─────────────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                         │
  │  [ Module 1: Auth & User Identity ] ──────────► [ Module 2: Token Lifecycle & RTR ]      │
  │        (FR-01, FR-02, FR-04, FR-05)                   (FR-03, FR-17, FR-18)             │
  │                        │                                        │                       │
  │                        ▼                                        ▼                       │
  │  [ Module 3: MFA (RFC 6238 TOTP) ] ───────────► [ Module 4: Granular RBAC Matrix ]      │
  │             (FR-06, FR-07)                            (FR-08, FR-09, FR-11, FR-12)      │
  │                        │                                        │                       │
  │                        ▼                                        ▼                       │
  │  [ Module 5: User Administration ] ───────────► [ Module 6: Tamper-Evident Audit Logs ] │
  │             (FR-10, FR-16)                            (FR-13, FR-14, FR-15)             │
  │                                                                                         │
  └─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Module 1: User Identity & Registration
- **`FR-01` [High Priority] User Registration:**
  - *Description:* The system shall allow new users to register by providing email, password, first name, and last name.
  - *Inputs:* `email` (valid email syntax), `password` (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char), `first_name`, `last_name`.
  - *Processing:* Check for email uniqueness in PostgreSQL; hash password using Argon2id ($m=65536, t=3, p=4$); create user record; assign default `user` role in `user_roles`; create audit entry.
  - *Outputs:* HTTP 201 Created with sanitized user object (excluding password hash).
- **`FR-05` [Medium Priority] Password Reset Flow:**
  - *Description:* The system shall allow users to request a password reset token sent to their registered email and execute a password reset with a valid token.
  - *Inputs:* `email` (initiation) and `token`, `new_password` (completion).
  - *Processing:* Validate token expiration (1 hour), update password with new Argon2id hash, invalidate existing refresh tokens.
  - *Outputs:* HTTP 200 OK password reset confirmation.
- **`FR-16` [Medium Priority] Self-Service Profile Management:**
  - *Description:* Authenticated users shall be able to view and update their profile details (`first_name`, `last_name`) and view account creation timestamps.

### 4.2 Module 2: Authentication & Token Lifecycle
- **`FR-02` [High Priority] User Authentication (Login):**
  - *Description:* The system shall authenticate users against stored Argon2id password hashes.
  - *Inputs:* `email`, `password`.
  - *Processing:* Verify credentials. If account is locked due to $\ge 5$ failed attempts, return 423 Locked. If MFA is enabled, return 200 with `mfa_required: true` and temporary `mfa_token`. If MFA is disabled/satisfied, issue 15-minute JWT Access Token and 7-day Refresh Token.
  - *Outputs:* HTTP 200 OK with `access_token`, `refresh_token`, and user role payload.
- **`FR-03` & `FR-17` [High Priority] Automatic Refresh Token Rotation (RTR):**
  - *Description:* The system shall exchange a valid refresh token for a new pair of access and refresh tokens while invalidating the old refresh token.
  - *Inputs:* `refresh_token`.
  - *Processing:* Look up token by SHA-256 hash in `refresh_tokens`. If token was already revoked (*Reuse Attack Detection*), instantly revoke all tokens belonging to the same `family_id`, blacklist active sessions in Redis, and return 401 Unauthorized. If valid, mark current token revoked, generate new `refresh_token` in same family, and issue new `access_token`.
  - *Outputs:* HTTP 200 OK with new `access_token` and new `refresh_token`.
- **`FR-04` & `FR-18` [High Priority] Logout & Instant Token Revocation:**
  - *Description:* The system shall support secure logout by revoking the refresh token in PostgreSQL and storing the active access token in Redis blacklist until its natural TTL expires.
  - *Inputs:* `Authorization` header, `refresh_token`.
  - *Processing:* Mark refresh token as revoked; insert access token `jti` into Redis via `SETEX token_blacklist:<jti> <ttl> 1`.
  - *Outputs:* HTTP 200 OK with session termination confirmation.

### 4.3 Module 3: Multi-Factor Authentication (MFA / TOTP)
- **`FR-06` [High Priority] TOTP MFA Setup & Enrollment:**
  - *Description:* The system shall allow authenticated users to initiate MFA enrollment by generating an RFC 6238 TOTP secret, encrypting the secret at rest with AES-256-GCM, generating a QR code data URI, and returning 10 emergency one-time backup codes.
  - *Inputs:* Authenticated user session.
  - *Processing:* Generate base32 secret; encrypt with AES-256-GCM; produce `otpauth://totp/Aegis:...` URI; generate backup codes.
  - *Outputs:* HTTP 200 OK with QR code URI, plaintext secret for manual entry, and backup codes.
- **`FR-07` [High Priority] MFA Verification & Challenge Intercept:**
  - *Description:* The system shall verify a 6-digit TOTP code during initial enrollment confirmation and subsequent login challenges.
  - *Inputs:* `mfa_token` (or session token) and 6-digit `code` or single-use `backup_code`.
  - *Processing:* Decrypt stored secret; verify TOTP code within $\pm 1$ time step window (30 seconds); activate MFA for user if in setup phase; issue full access tokens if in login phase.
  - *Outputs:* HTTP 200 OK with token pair upon success, or HTTP 400 Bad Request on invalid code.

### 4.4 Module 4: Role-Based Access Control (RBAC)
- **`FR-08` [High Priority] Role Definition & Hierarchy:**
  - *Description:* The system shall enforce role-based access for system-defined roles (`super_admin`, `admin`, `auditor`, `user`) and custom roles.
- **`FR-09` [High Priority] Atomic Permission Evaluation:**
  - *Description:* The system shall evaluate route-level permissions (`users:read`, `users:create`, `users:update`, `users:delete`, `roles:manage`, `audit:read`, `audit:verify`) via an Express middleware guard (`authorize(['permission_name'])`).
- **`FR-11` [Medium Priority] Role Lifecycle Management:**
  - *Description:* Super Admins shall be able to create new custom roles, update role descriptions, delete non-system roles, and associate/disassociate specific permissions.
- **`FR-12` [High Priority] User Role Assignment:**
  - *Description:* Administrators shall be able to assign or revoke roles for any user account with immediate authorization enforcement.

### 4.5 Module 5: User Administration & Directory
- **`FR-10` [High Priority] User CRUD & Search Directory:**
  - *Description:* Administrators shall be able to query a paginated directory of registered users with search filters by email, name, role, and active status.
  - *Processing:* Support SQL pagination (`LIMIT`, `OFFSET`), dynamic filtering, sorting, and account status toggling (`is_active: true/false`).

### 4.6 Module 6: Tamper-Evident Audit Logging
- **`FR-13` [High Priority] Append-Only Chained Audit Logging:**
  - *Description:* The system shall record every sensitive event (login, failure, role change, token revocation, user deactivation) into an immutable, append-only table `audit_logs`.
  - *Processing:* Compute a cryptographic SHA-256 hash for each entry chaining the previous record's hash:
    $$\text{Checksum}_n = \text{SHA-256}(\text{Checksum}_{n-1} \parallel \text{Timestamp} \parallel \text{ActorID} \parallel \text{Action} \parallel \text{Payload})$$
- **`FR-14` [Medium Priority] Filterable Audit Queries:**
  - *Description:* Auditors and admins shall be able to query audit records filtered by actor ID, action type, resource type, and date range.
- **`FR-15` [High Priority] Cryptographic Integrity Verification:**
  - *Description:* The system shall provide an endpoint (`GET /api/v1/audit/verify`) that iterates from the genesis audit record to the latest record, re-calculating the SHA-256 hash chain to verify that no log entries have been inserted, updated, or deleted.

### 4.7 Module 7: SDLC Staging & Health Diagnostics Panel
- **Description:** Provide an embedded, interactive developer and evaluator workspace within the frontend portal visualizing requirements traceability, database schema ERDs, component trees, live Jest test suite executions, and real-time backend/cache service health checks.

---

# 5. Non-Functional Requirements (NFRs)

### 5.1 Security Requirements

```
+─────────────────────────────────────────────────────────────────────────────+
|                          AEGIS ZERO-TRUST SECURITY STACK                    |
+─────────────────────────────────────────────────────────────────────────────+
| Password Hashing     │ Argon2id (Memory: 64MB, Time: 3 iterations, 4 lanes)  |
| MFA Secrets at Rest  │ AES-256-GCM authenticated encryption with unique IV  |
| Token Signatures     │ JWT with HMAC-SHA256 / RSA-256 & 15-minute lifespan  |
| Token Revocation     │ Instant Redis Blacklist Check (Sub-millisecond)      |
| Audit Integrity      │ Sequential SHA-256 Cryptographic Hash Chaining       |
| API Protection       │ Tiered Redis Rate Limiter + Helmet.js CSP Headers    |
+─────────────────────────────────────────────────────────────────────────────+
```

- **`NFR-01` [Security - Password Hashing]:** All user passwords shall be hashed using the **Argon2id** algorithm with parameters configured to at least $64\text{ MB}$ memory cost, $3$ iterations, and $4$ parallelism lanes to resist GPU and ASIC brute-force attacks.
- **`NFR-02` [Security - Cryptographic Storage at Rest]:** MFA TOTP secret keys and backup codes stored in the database must be encrypted using **AES-256-GCM** authenticated encryption with an initialization vector (IV) and authentication tag.
- **`NFR-03` [Security - Rate Limiting & DoS Mitigation]:**
  - Authentication endpoints (`/api/v1/auth/login`, `/register`) shall enforce a strict rate limit of **5 requests per 15 minutes** per IP address.
  - General API endpoints shall enforce **100 requests per 15 minutes** per IP address.
  - Rate limiting counters must be stored in Redis to support distributed cluster scaling.
- **`NFR-04` [Security - HTTP Protection & CORS]:** The API server shall employ Helmet.js to enforce secure HTTP headers (Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Content-Security-Policy) and restrict CORS origins to authorized frontend URLs.
- **`NFR-05` [Security - Account Lockout]:** Accounts must be automatically locked for 15 minutes upon 5 consecutive failed login attempts to prevent online dictionary attacks.

### 5.2 Performance & SLA Requirements
- **`NFR-06` [Performance - Database Connection Pooling]:** PostgreSQL connections shall be managed through an optimized connection pool (10-20 active connections) with query execution latency $< 50\text{ms}$ for 99th percentile operations.
- **`NFR-07` [Performance - Cache Latency]:** Redis cache read/write latency for session validation and token revocation lookup must remain $< 2\text{ms}$.
- **`NFR-08` [Performance - API Response SLA]:** 95% of standard API requests (authentication, user profile, role verification) must complete in $< 200\text{ms}$ under a standard load of 1,000 concurrent active users.

### 5.3 Reliability, Availability & Fault Tolerance
- **System Uptime:** The IAM service shall target $99.9\%$ uptime during standard operation.
- **Health Check Probes:** Provide a `/health` endpoint performing active connection diagnostics for both PostgreSQL and Redis, returning `200 OK` (healthy) or `503 Service Unavailable` (degraded).
- **Graceful Shutdown:** The server must intercept `SIGTERM` and `SIGINT` signals, stop accepting new requests, complete active in-flight requests, and cleanly close database and Redis pools.

### 5.4 Maintainability, Portability & Testability
- **Code Modularity:** Follow Domain-Driven Design (DDD) organizing code into distinct feature modules (`auth`, `users`, `roles`, `mfa`, `tokens`, `audit`).
- **Automated Test Coverage:** Maintain a comprehensive suite of $\ge 60$ automated unit and integration tests using Jest and Supertest with $> 85\%$ line coverage.
- **Container Portability:** Provide a standard `docker-compose.yml` defining reproducible environments for the API server, PostgreSQL database, and Redis cache.

---

# 6. Data Models & Schema Architecture

### 6.1 Entity-Relationship Model (ERD)

```
        ┌────────────────────────────────────────────────────────┐
        │                         users                          │
        ├────────────────────────────────────────────────────────┤
        │ PK id                    UUID                          │
        │    email                 VARCHAR(255) [UNIQUE]         │
        │    password_hash         VARCHAR(255)                  │
        │    first_name            VARCHAR(100)                  │
        │    last_name             VARCHAR(100)                  │
        │    is_active             BOOLEAN                       │
        │    mfa_enabled           BOOLEAN                       │
        │    mfa_secret            VARCHAR(500) (AES-256 Enc)    │
        │    failed_login_attempts INTEGER                       │
        │    locked_until          TIMESTAMPTZ                   │
        │    created_at            TIMESTAMPTZ                   │
        └────────────────────────────────────────────────────────┘
                 │ 1                       │ 1               │ 1
                 │                         │                 │
                 │ N                       │ N               │ N
                 ▼                         ▼                 ▼
     ┌───────────────────────┐ ┌───────────────────────┐ ┌────────────────────────┐
     │      user_roles       │ │    refresh_tokens     │ │       audit_logs       │
     ├───────────────────────┤ ├───────────────────────┤ ├────────────────────────┤
     │ PK,FK user_id  (UUID) │ │ PK id          (UUID) │ │ PK id       (BIGSERIAL)│
     │ PK,FK role_id  (UUID) │ │ FK user_id     (UUID) │ │ FK actor_id (UUID)     │
     │       assigned_at     │ │    token_hash  (STR)  │ │    action   (VARCHAR)  │
     └───────────────────────┘ │    family_id   (UUID) │ │    old_data (JSONB)    │
                 ▲ N           │    expires_at  (TIME) │ │    new_data (JSONB)    │
                 │             │    revoked     (BOOL) │ │    checksum (SHA-256)  │
                 │ 1           └───────────────────────┘ └────────────────────────┘
        ┌────────────────┐
        │     roles      │
        ├────────────────┤
        │ PK id   (UUID) │
        │    name (STR)  │
        └────────────────┘
                 │ 1
                 │ N
                 ▼
     ┌───────────────────────┐             ┌────────────────────────┐
     │   role_permissions    │             │      permissions       │
     ├───────────────────────┤             ├────────────────────────┤
     │ PK,FK role_id  (UUID) │ N         1 │ PK id       (UUID)     │
     │ PK,FK perm_id  (UUID) │────────────►│    name     (VARCHAR)  │
     └───────────────────────┘             │    resource (VARCHAR)  │
                                           │    action   (VARCHAR)  │
                                           └────────────────────────┘
```

### 6.2 Relational Data Dictionary

#### 1. `users` Table
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Unique identifier for the user account. |
| `email` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL`, Indexed | Primary login credential and contact email. |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Argon2id cryptographically hashed password. |
| `first_name` | `VARCHAR(100)` | `NULL` | User's given name. |
| `last_name` | `VARCHAR(100)` | `NULL` | User's family name. |
| `is_active` | `BOOLEAN` | Default `true`, Indexed | Account operational state (active/suspended). |
| `mfa_enabled` | `BOOLEAN` | Default `false` | Indicates whether TOTP MFA is active. |
| `mfa_secret` | `VARCHAR(500)` | `NULL` | AES-256-GCM encrypted TOTP seed key. |
| `mfa_backup_codes` | `TEXT` | `NULL` | Encrypted JSON array of one-time backup codes. |
| `failed_login_attempts` | `INTEGER` | Default `0` | Consecutive failed authentication counter. |
| `locked_until` | `TIMESTAMPTZ` | `NULL` | Timestamp until which account login is locked. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Timestamp of account registration. |

#### 2. `roles` Table
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Unique role identifier. |
| `name` | `VARCHAR(100)` | `UNIQUE`, `NOT NULL` | Unique machine name (`super_admin`, `admin`, `user`). |
| `description` | `TEXT` | `NULL` | Human-readable explanation of role responsibilities. |
| `is_system_role` | `BOOLEAN` | Default `false` | Protected flag preventing deletion of default roles. |

#### 3. `permissions` Table
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Unique permission identifier. |
| `name` | `VARCHAR(150)` | `UNIQUE`, `NOT NULL` | Unique permission string (e.g. `users:read`). |
| `resource` | `VARCHAR(100)` | `NOT NULL` | Target domain entity (`users`, `roles`, `audit`). |
| `action` | `VARCHAR(50)` | `NOT NULL` | Action verb (`read`, `create`, `update`, `delete`, `verify`). |

#### 4. `refresh_tokens` Table
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Token record identifier. |
| `user_id` | `UUID` | `REFERENCES users(id) ON DELETE CASCADE` | Associated user identity. |
| `token_hash` | `VARCHAR(255)` | `NOT NULL`, Indexed | SHA-256 hash of issued refresh token. |
| `family_id` | `UUID` | `NOT NULL`, Indexed | Lineage ID tracking token rotation ancestry. |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Hard expiration deadline for token validity. |
| `revoked` | `BOOLEAN` | Default `false` | Revocation status flag. |

#### 5. `audit_logs` Table (Tamper-Evident)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Sequential monotonic log index. |
| `actor_id` | `UUID` | `NULL`, Indexed | User ID triggering the event (null for system/anon). |
| `actor_email` | `VARCHAR(255)` | `NULL` | Snapshot email of actor at event time. |
| `action` | `VARCHAR(100)` | `NOT NULL`, Indexed | Event type (e.g. `AUTH_LOGIN`, `USER_UPDATE`). |
| `resource_type` | `VARCHAR(100)` | `NULL` | Affected domain entity. |
| `resource_id` | `VARCHAR(255)` | `NULL` | Identifier of affected entity. |
| `old_data` | `JSONB` | `NULL` | Pre-mutation entity state snapshot. |
| `new_data` | `JSONB` | `NULL` | Post-mutation entity state snapshot. |
| `ip_address` | `INET` | `NULL` | Originating client IP address. |
| `checksum` | `VARCHAR(64)` | `NOT NULL` | Cryptographic SHA-256 hash chaining previous row. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`, Indexed | Canonical UTC timestamp of event. |

### 6.3 Cryptographic Hash-Chain Log Model
To guarantee non-repudiation and prevent stealth log tampering by malicious actors or compromised database administrators, `audit_logs` implements block-hash chaining:
```
[Genesis Block: Checksum_0 = SHA-256("GENESIS")]
                    │
                    ▼
[Audit Record 1]: Checksum_1 = SHA-256(Checksum_0 || Timestamp_1 || Actor_1 || Action_1 || Payload_1)
                    │
                    ▼
[Audit Record 2]: Checksum_2 = SHA-256(Checksum_1 || Timestamp_2 || Actor_2 || Action_2 || Payload_2)
                    │
                    ▼
[Audit Record n]: Checksum_n = SHA-256(Checksum_{n-1} || Timestamp_n || Actor_n || Action_n || Payload_n)
```
If an adversary mutates any field in Record 1, all subsequent checksums ($\text{Checksum}_2 \dots \text{Checksum}_n$) become invalid upon audit verification, exposing the exact record altered.

---

# 7. Verification & Requirements Traceability Matrix (RTM)

### 7.1 Traceability Matrix

| Req ID | Requirement Summary | Target Module | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :---: |
| **`FR-01`** | User Registration & Argon2id Hashing | `src/modules/auth` | `tests/auth.test.js` | **PASS (100%)** |
| **`FR-02`** | User Login & Dual Token Issuance | `src/modules/auth` | `tests/auth.test.js` | **PASS (100%)** |
| **`FR-03`** | Auto Token Refresh Interceptor | `frontend/src/lib` | `tests/tokens.test.js` | **PASS (100%)** |
| **`FR-04`** | Logout & Token Invalidation | `src/modules/auth` | `tests/auth.test.js` | **PASS (100%)** |
| **`FR-05`** | Password Reset with Token | `src/modules/auth` | `tests/auth.test.js` | **PASS (100%)** |
| **`FR-06`** | TOTP MFA Setup & AES-256 Secrets | `src/modules/mfa` | `tests/mfa.test.js` | **PASS (100%)** |
| **`FR-07`** | MFA Login Challenge Intercept | `src/modules/mfa` | `tests/mfa.test.js` | **PASS (100%)** |
| **`FR-08`** | Role Hierarchy (`super_admin`, `admin`, `user`) | `src/modules/roles` | `tests/roles.test.js` | **PASS (100%)** |
| **`FR-09`** | Granular Permission Guard Middleware | `src/middleware` | `tests/rbac.test.js` | **PASS (100%)** |
| **`FR-10`** | User Management CRUD & Pagination | `src/modules/users` | `tests/users.test.js` | **PASS (100%)** |
| **`FR-11`** | Role Creation & Permission Assignment | `src/modules/roles` | `tests/roles.test.js` | **PASS (100%)** |
| **`FR-12`** | User Role Attachment / Detachment | `src/modules/roles` | `tests/roles.test.js` | **PASS (100%)** |
| **`FR-13`** | Tamper-Evident SHA-256 Audit Logging | `src/modules/audit` | `tests/audit.test.js` | **PASS (100%)** |
| **`FR-14`** | Filterable Audit Queries | `src/modules/audit` | `tests/audit.test.js` | **PASS (100%)** |
| **`FR-15`** | Audit Hash-Chain Integrity Verification | `src/modules/audit` | `tests/audit.test.js` | **PASS (100%)** |
| **`FR-16`** | Self-Service User Profile Update | `src/modules/users` | `tests/users.test.js` | **PASS (100%)** |
| **`FR-17`** | Refresh Token Rotation & Family Lineage | `src/modules/tokens` | `tests/tokens.test.js` | **PASS (100%)** |
| **`FR-18`** | Redis Token Revocation Blocklist | `src/modules/tokens` | `tests/tokens.test.js` | **PASS (100%)** |
| **`NFR-01`** | Argon2id Parameter Configuration | `src/utils/crypto` | `tests/crypto.test.js` | **PASS (100%)** |
| **`NFR-02`** | AES-256-GCM Encrypted MFA Storage | `src/utils/crypto` | `tests/crypto.test.js` | **PASS (100%)** |
| **`NFR-03`** | Tiered Redis Rate Limiting | `src/middleware` | `tests/rateLimiter.test.js` | **PASS (100%)** |
| **`NFR-04`** | Helmet Headers & CORS Policy | `src/app.js` | `tests/security.test.js` | **PASS (100%)** |
| **`NFR-06`** | Connection Pool Health Checks | `src/config/db` | `tests/health.test.js` | **PASS (100%)** |
| **`NFR-07`** | Redis Latency SLA ($< 2\text{ms}$) | `src/config/redis` | `tests/health.test.js` | **PASS (100%)** |

### 7.2 Acceptance & Validation Criteria
1. **100% Passing Test Gate:** All 66+ test cases across auth, MFA, RBAC, tokens, audit, and security suites must pass without regressions.
2. **Zero Plaintext Credentials:** No unhashed passwords or unencrypted MFA secrets shall exist in database records or server logs.
3. **Tamper Detection Demonstration:** Modifying any historical row in `audit_logs` must immediately flag `/api/v1/audit/verify` as compromised (`is_valid: false`).
4. **Token Family Breach Invalidation:** Presenting a revoked refresh token must immediately revoke all sibling tokens in its family and terminate active Redis sessions.

---

**Document Approval & Sign-Off:**

| Role | Name | Signature / Status | Date |
| :--- | :--- | :--- | :--- |
| **Project Lead & Author** | Swatantra | *Approved* | 2026-08-25 |
| **System Architect** | Antigravity AI | *Verified & Formatted* | 2026-08-25 |
| **Security Reviewer** | DevSecOps Lead | *Compliant with OWASP ASVS v4* | 2026-08-25 |
