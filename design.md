# IAM Portal Frontend Design Specification (`design.md`)

## 1. Executive Summary & Design Vision

This document outlines the architectural blueprint, design system, component specifications, and SDLC staging implementation for the **IAM Portal (Identity & Access Management)** frontend application.

The IAM Portal is engineered as a enterprise-grade, high-security dashboard and staging environment built for a Software Engineering academic capstone / project demonstration. It combines strict security workflows (JWT auth with auto-refresh, TOTP MFA, granular RBAC, Redis token revocation, SHA-256 tamper-evident audit trails) with an interactive **SDLC Project Staging** workspace that visualizes every software engineering phase.

---

## 2. Visual Design System & Aesthetics (Inspired by References)

The visual design language synthesizes high-contrast Neo-Brutalism, dark obsidian cyber-aesthetics, and technical grid layouts, taking direct visual inspiration from **clayboan.com** and **okaydev.co**.

```
+-----------------------------------------------------------------------------------+
|  [AEGIS]  SOCIAL   GALLERY   DIRECTORY   [LOGIN]  [SIGN UP ->]   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|    ❖ (SDLC PHASE 1: REQUIREMENT ANALYSIS & SPECIFICATION) ❖                       |
|    ██████████████████████████████████████████████████████████████████             |
|    █                                                              █             |
|    █   REQUIREMENT & SYSTEM SPECIFICATION                         █             |
|    █   [ SRS DOCUMENT VIEWER ]   [ FUNCTIONAL CHECKLIST 18/18 ]   █             |
|    █                                                              █             |
|    ████████████████████████████████████████████████████████████████             |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|  ❖ AUTHENTICATION •  AUTHORIZATION  •  RBAC  •  OAUTH / JWT  • Rate Limiting • TOTP MFA • SECURITY AUDIT PASSED ❖  |
+-----------------------------------------------------------------------------------+
```

### 2.1 Color Palette & Theme Tokens
* **Background Primary**: `#0A0A0C` (Deep Obsidian Dark)
* **Card & Surface Primary**: `#111216` (Elevated Obsidian Glass)
* **Surface Border**: `#22242C` (Low-contrast geometric grid line)
* **Accent Electric Green**: `#00FF66` (Neon verification / Active status accent)
* **Accent Cyber Violet**: `#A855F7` (Primary brand callouts / Role tags)
* **Accent Amber Alert**: `#F59E0B` (Revoked / MFA state warnings)
* **Text High-Contrast**: `#F9FAFB` (Headers & primary inputs)
* **Text Muted Monospace**: `#9CA3AF` (Labels, metadata, code blocks)

### 2.2 Typography Pairings
* **Display & Banner Headers**: `Space Grotesk` / `Syne` (Bold retro-futuristic uppercase styling with letter-spacing `-0.04em`).
* **UI Controls & Navigation**: `Inter` / `System UI` (Clean legibility for dense tabular data and forms).
* **Code, Logs, Checksums & Statuses**: `JetBrains Mono` / `Consolas` (Strict monospace for SHA-256 hashes, JSON schemas, and live test execution output).

### 2.3 Key Visual Motifs & Components
1. **Dark Blueprint Grid Overlay**: Subtle CSS background grid overlay (`linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)`) across all dashboard backgrounds, matching reference screenshot 2 & 3.
2. **Bold Uppercase Header Badges**: Retro section tags enclosed in parentheses `(SDLC PHASE STAGING)` and `(MULTIDISCIPLINARY IAM ENGINE)` as seen in clayboan.com.
3. **Marquee Ticker Banner**: Continuous CSS keyframe marquee strip at the viewport bottom displaying live system status (`❖ REDIS LATENCY: 1.2ms ❖ TEST SUITES: 64/64 PASSED ❖ AUDIT CHAIN: VERIFIED ❖`), matching screenshot 3.
4. **Pill Action Controls**: Buttons with `border-radius: 9999px`, glowing hover shadows, and arrow indicators (`SIGN UP →`, `VERIFY INTEGRITY ⚡`).

---

## 3. Dedicated Section: SDLC Project Staging (`/dashboard/sdlc-staging`)

This interactive staging dashboard serves as the central showcase for the Software Development Life Cycle (SDLC) applied to this project, providing live interactive evidence of design, implementation, verification, and deployment.

```
       +-------------------------------------------------------------+
       |             SDLC STAGING INTERACTIVE NAVIGATION             |
       +----------+----------+----------+----------+----------+------+
       | Phase 1  | Phase 2  | Phase 3  | Phase 4  | Phase 5  |Phase6|
       | SRS View | HLD/LLD  | Modules  | Tests    | Deploy   |Audit |
       +----------+----------+----------+----------+----------+------+
```

### 3.1 Phase Breakdown & Deliverables

#### Phase 1: Requirement Analysis & Specification
* **Objective**: Define system scope, identify end-user roles (`super_admin`, `admin`, `user`), eliminate requirement ambiguities, and establish security constraints.
* **Artifact**: Software Requirements Specification (SRS) summarizing authentication rules, token revocation in Redis, rate limiting algorithms, and the RBAC permission matrix.
* **UI Implementation Details**:
  * **Expandable SRS Document Viewer**: Accordion-style structured markdown and interactive JSON viewer displaying sectioned requirements (Functional vs Non-Functional, Security SLAs).
  * **Functional Requirements Checklist**: Live interactive checklist with real-time completion indicators (e.g. `18/18 Requirements Satisfied - 100% Coverage`). Filterable by module (`Auth`, `RBAC`, `Audit`).

#### Phase 2: System Design (HLD & LLD)
* **High-Level Design (HLD)**: Modular monolith architecture overview, technology stack selection rationale (Express.js, PostgreSQL, Redis, React + Vite), and system topology diagrams.
* **Low-Level Design (LLD)**: Relational database table schemas (Foreign Keys, Indexes, Cascades), Argon2id password hashing parameters, API endpoint contracts (`/api/v1/*`), and standard error-handling pipeline models.
* **UI Implementation Details**:
  * **Interactive DB Schema Viewer**: Dynamic ERD visualization component highlighting entities (`Users`, `Roles`, `Permissions`, `UserRoles`, `RolePermissions`, `RefreshTokens`, `AuditLogs`) with hoverable foreign key paths and column data types.
  * **System Architecture Flow Diagram**: Interactive SVG diagram showing request flows from Client -> Nginx -> Express API Middleware (Rate Limiter, Auth Guard) -> PostgreSQL / Redis Cache.

#### Phase 3: Coding & Implementation
* **Objective**: Translate design specifications into modular program units adhering to domain-driven design principles.
* **Execution**: Domain-driven modules (`auth`, `users`, `roles`, `tokens`, `mfa`, `audit`).
* **UI Implementation Details**:
  * **Codebase Module Dependency Tree**: Interactive file tree visualization mapping cross-module dependencies and import boundaries.
  * **Repository Statistics & Commit Tracking Summary**: Live metric cards displaying total commits, lines of code, branch coverage, and last deployment tag timestamp (`v1.4.0-release`).

#### Phase 4: Testing & Verification
* **Objective**: Execute isolated unit tests, module integration tests, security assertions, and RBAC matrix verification.
* **Verification Gate**: Mandatory 100% test pass rate across all suites before release sign-off.
* **UI Implementation Details**:
  * **Live Test Runner Status Panel**: Real-time test suite execution status panel showing pass rates (e.g., `64/64 tests passed (100%)`).
  * **Test Breakdown Matrix**: Categorized view splitting tests into:
    * *Unit Tests* (Password validation, Argon2 hash verification, TOTP generation)
    * *Integration Tests* (Login workflow, MFA challenge, Token Refresh rotation)
    * *Security Tests* (Token revocation assertion, Rate limit trip enforcement, Audit chain tampering detection)

#### Phase 5: Deployment
* **Objective**: Package application services and deploy to production host environment.
* **Target Environment**: Linux VPS running containerized services (Express API, PostgreSQL database, Redis store, Nginx reverse proxy with SSL termination).
* **UI Implementation Details**:
  * **Service Health Checks Panel**: Real-time status cards monitoring:
    * API Uptime (`99.98%`)
    * PostgreSQL Connection Pool (`12/20 active connections`, response `2.4ms`)
    * Redis Cache Latency (`0.8ms`, Memory usage `14MB`)
  * **Environment Configuration Summary**: Sanitized read-only viewer displaying active environment variables, CORS whitelist configurations, and rate-limiting limits.

#### Phase 6: Maintenance & Auditing
* **Objective**: Support operational bug fixing, ongoing vulnerability scanning, application upgrades, and tamper-evident logging.
* **UI Implementation Details**:
  * **Cryptographic Checksum Verification Widget**: Interactive cryptographic verification tool that re-calculates SHA-256 hashes for audit log chains to guarantee non-repudiation.
  * **System Event Counter & Session Monitor**: Live counters tracking total system events, active WebSocket connections, concurrent authenticated sessions, and blocked IP addresses.

---

## 4. Core Application Functional Views

### 4.1 Authentication (`/login`, `/mfa-challenge`, `/register`)

```
+-----------------------------------------------------------------------+
|  AEGIS                                [LOGIN]  [SIGN UP]   |
+-----------------------------------------------------------------------+
|                                                                       |
|                          S I G N   I N                                |
|             ACCESS YOUR SECURE IAM MANAGEMENT PORTAL                  |
|                                                                       |
|   EMAIL ADDRESS *                                                     |
|   [ admin@iam-portal.io                                             ] |
|                                                                       |
|   PASSWORD *                                                          |
|   [ •••••••••••••••••                                            (👁) ] |
|                                                                       |
|   [               AUTHENTICATE TO PORTAL  →                         ] |
|                                                                       |
+-----------------------------------------------------------------------+
```

* **`/login` Interface**:
  * Form styled with dark blueprint grid lines, monospace field labels with red required asterisks (`EMAIL *`, `PASSWORD *`), and rounded dark inputs (`bg-[#111216] border-[#22242C]`).
  * Includes password visibility toggles (`👁`) and field validation hints.
  * **Auth Flow Interception**:
    1. Sends POST to `/api/v1/auth/login`.
    2. If response payload returns `mfa_required: true` and temporary `mfa_token`, user is instantly routed to `/mfa-challenge`.
    3. If authentication is complete, stores access token in memory/Zustand state, sets auto-refresh timer, and redirects to `/dashboard/overview`.
* **`/mfa-challenge` Interface**:
  * 6-digit auto-advancing TOTP code input boxes with numerical keyboard focus.
  * Countdown timer for TOTP window validity and fallback code modal option.

---

### 4.2 Security Dashboard (`/dashboard/overview`)

```
+-----------------------------------------------------------------------+
| TOTAL USERS | ACTIVE SESSIONS | REDIS BLOCKLIST | TOTAL AUDIT RECORDS |
|    1,420    |       184       |       42        |       89,410        |
+-----------------------------------------------------------------------+
|  AUTHENTICATION ACTIVITY TIME-SERIES (RECHARTS)                       |
|  [Green Line: Successful Logins]   [Red Line: Failed Attempts]        |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |
+-----------------------------------------------------------------------+
```

* **Metrics Grid**: 4 glowing glassmorphic statistic cards displaying:
  1. *Total Active Users* (with role distribution pill preview).
  2. *Active Sessions* (tracked via non-revoked refresh tokens).
  3. *Blocklisted Tokens in Redis* (revoked/invalidated tokens).
  4. *Total Audit Records* (cryptographically chained log entries).
* **Recharts Visualization**:
  * Dual-line time-series visualizer showing 24-hour / 7-day authentication activity trends.
  * Custom dark-themed tooltips highlighting peak authentication bursts and anomalous failed attempt spikes.

---

### 4.3 User Management (`/dashboard/users`)

* **Data Table Specs**:
  * Paginated, sortable data table displaying: `email`, `first_name`, `last_name`, `is_active` (badge switch), `mfa_enabled` (shield icon), and assigned roles (`super_admin`, `admin`, `user`).
  * Filter controls by Role, Status (Active/Inactive), and Search by Name/Email.
* **Action Drawer & Modals**:
  * **User Role Assignment Drawer**: Side drawer to attach/detach system roles.
  * **Deactivate/Reactivate Action**: Instant toggle action calling `/api/v1/users/:id/status` with confirmation modal and optimistic UI updates.

---

### 4.4 Roles & Permissions Matrix (`/dashboard/roles`)

```
+-----------------------------------------------------------------------+
| ROLE           | USER:READ | USER:CREATE | ROLE:UPDATE | AUDIT:READ   |
+----------------+-----------+-------------+-------------+--------------+
| super_admin    |    [X]    |     [X]     |     [X]     |     [X]      |
| admin          |    [X]    |     [X]     |     [ ]     |     [X]      |
| user           |    [X]    |     [ ]     |     [ ]     |     [ ]      |
+-----------------------------------------------------------------------+
```

* **Role Definition Panel**: Overview of system roles (`super_admin`, `admin`, `user`) with user counts and scope descriptions.
* **Permission Grid Matrix**:
  * Matrix table mapping granular system permissions (`user:read`, `user:create`, `user:update`, `user:delete`, `role:read`, `role:update`, `audit:read`, `sdlc:read`) across roles.
  * Checkbox matrix controls with batch "Save Changes" triggers calling `/api/v1/roles/:id/permissions`.

---

### 4.5 Audit Log Explorer (`/dashboard/audit`)

* **Audit Table**:
  * Filterable log stream containing: `Actor Email`, `Action Type` (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `USER_CREATED`, `ROLE_UPDATED`, `TOKEN_REVOKED`), `IP Address`, `User Agent`, `Timestamp`.
* **Verify Integrity Feature**:
  * Prominent **"Verify Integrity"** pill button with neon green lighting effect (`⚡`).
  * Triggers API GET request to `/api/v1/audit/verify`.
  * Computes client-side SHA-256 validation or renders server-verified cryptographic checksum status badge:
    * `[✓ INTEGRITY VERIFIED - CHAIN INTACT (SHA-256)]` (Neon Green)
    * `[WARNING - CHECKSUM MISMATCH DETECTED]` (Amber/Red)

---

## 5. Technology Stack & Directory Structure

### 5.1 Tech Stack
* **Core Framework**: React 19 + Vite 8
* **Routing**: React Router v7 (`react-router-dom`)
* **State & Data Fetching**: Zustand (Auth state, UI state) + TanStack React Query v5 (Server state caching & mutations)
* **HTTP Client**: Axios (with Request/Response Interceptors for Bearer Token injection & Auto-Refresh)
* **Data Visualization**: Recharts v3
* **Animations**: GSAP v3 + CSS Animations (Marquee, Grid pulse)
* **Icons & QR**: `qrcode.react` (MFA setup), Custom SVG retro icons

### 5.2 Frontend Directory Structure

```
frontend/
├── src/
│   ├── assets/              # Branding SVGs, grid background patterns
│   ├── components/
│   │   ├── Common/          # Buttons, Cards, Inputs, Marquee, Badges
│   │   ├── Layout/          # AppLayout, Sidebar, TopNav, ProtectedRoute
│   │   ├── SDLC/            # SRSViewer, SchemaViewer, TestRunnerPanel, HealthChecks
│   │   ├── Audit/           # IntegrityVerifierWidget, AuditTable
│   │   └── Users/           # UserDrawer, RoleMatrixGrid
│   ├── hooks/               # useAuth, usePermissions, useSDLCData
│   ├── lib/                 # axiosInstance, cryptoUtils, chartHelpers
│   ├── pages/
│   │   ├── Login.jsx        # Login & MFA routing entry
│   │   ├── MfaVerify.jsx    # 6-digit TOTP challenge view
│   │   ├── Dashboard.jsx    # Overview metrics & Recharts graphs
│   │   ├── Users.jsx        # User table & role management
│   │   ├── Roles.jsx        # RBAC matrix configuration
│   │   ├── AuditLogs.jsx    # Audit explorer with SHA-256 verification
│   │   └── SDLCStaging.jsx  # Complete 6-phase SDLC staging dashboard
│   ├── stores/              # authStore, sdlcStore, uiStore
│   ├── styles/              # Design tokens, grid overlay CSS, typography
│   ├── App.jsx              # Main routes & permissions guard setup
│   └── main.jsx             # React DOM entry point
```

---

## 6. Implementation Strategy & Verification Plan

### 6.1 Step-by-Step Implementation Steps
1. **Design System Integration**: Enhance `index.css` with CSS variables for dark grid patterns, neon accent colors, monospace code fonts, marquee keyframes, and pill button styles.
2. **SDLC Staging Dashboard (`/dashboard/sdlc-staging`)**: Build modular components for all 6 SDLC phases:
   - Phase 1: SRS Markdown & Functional Checklist
   - Phase 2: Interactive ERD Database Schema Viewer & System Flow Diagram
   - Phase 3: Module Tree & Repository Metrics
   - Phase 4: Live Test Suite Runner Widget (64/64 tests)
   - Phase 5: VPS Infrastructure Health Check Panel
   - Phase 6: SHA-256 Cryptographic Audit Verifier Widget
3. **Core Functional Views Enhancements**:
   - Refine `/login` and `/mfa` screens with okaydev dark form aesthetic.
   - Upgrade `/dashboard/overview` with Recharts authentication activity graphs.
   - Enhance `/dashboard/audit` with live SHA-256 verification API feedback.
4. **Navigation & Routing Integration**: Register `/dashboard/sdlc-staging` in `App.jsx` and add navigation item in `AppLayout` sidebar.

### 6.2 Verification & Quality Assurance Gate
- **Visual Compliance**: Verify dark grid, retro uppercase tags, pill buttons, marquee, and neon status badges match screenshots.
- **Routing & Auth Integrity**: Validate `/login` -> `/mfa` -> `/dashboard` redirection flow and JWT token auto-refresh execution.
- **SDLC Staging Functional Audit**: Verify interactive widgets for all 6 SDLC phases render correctly with zero console errors.
- **Audit Verification Test**: Confirm "Verify Integrity" button calls `/api/v1/audit/verify` and updates visual cryptographic badge.
