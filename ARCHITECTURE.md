# Aegis IAM — System Architecture & Design

A deep-dive technical overview of Aegis IAM's architecture, security models, data flows, and state management.

---

## 1. High-Level Architecture

```mermaid
graph TD
    Client["Client SPA\n(React 19 · Vite · TanStack Query)"] -->|HTTPS / REST API| Nginx["Nginx Reverse Proxy\n(TLS Termination · Static Assets · Gzip)"]
    Nginx -->|Proxy Pass /api & /health| Gateway["API Gateway / Express Server\n(Helmet · CORS · Body Parser)"]
    
    subgraph "Aegis Core Backend Engine"
        Gateway --> MW["Auth & Security Middleware\n(JWT Verification · Rate Limiter · RBAC Guard)"]
        MW --> AuthMod["Auth & Tokens Module\n(Argon2id · RTR Token Families)"]
        MW --> UsersMod["Users Module\n(Identity CRUD · Profile)"]
        MW --> MfaMod["MFA Module\n(RFC 6238 TOTP · AES-256-GCM)"]
        MW --> RolesMod["Roles & RBAC Module\n(Dynamic Permission Matrix)"]
        MW --> AuditMod["Audit Ledger Module\n(SHA-256 Hash Chain)"]
        AuthMod --> QueueSvc["Async Queue & Mailer\n(Lua Atomicity · Leases · DLQ)"]
    end

    subgraph "Data & Cache Layer"
        MW -.->|Rate Limit Buckets| Redis[("Redis 7+ In-Memory\n• JTI Token Blacklist\n• Sliding Window Rate Limits\n• Queue State & Leases")]
        AuthMod -->|JTI Revocation| Redis
        QueueSvc -->|Worker Leases & Checkpoints| Redis

        UsersMod -->|Identity Records| Postgres[("PostgreSQL 16+ Persistent Store\n• Users & Encrypted MFA Secrets\n• Roles & Permissions\n• RTR Refresh Tokens\n• Tamper-Evident Audit Logs")]
        MfaMod -->|Encrypted TOTP Secrets| Postgres
        RolesMod -->|Role Junctions| Postgres
        AuditMod -->|Tamper-Evident Ledger| Postgres
    end
```

---

## 2. Authentication & Token Lifecycle

### Token Strategy
- **Access Tokens:** Signed with JWT (`HS256` or `RS256`), 15-minute lifespan. Stored securely in memory by the client.
- **Refresh Tokens:** Cryptographically random tokens stored in PostgreSQL with family-based rotation.
- **Token Invalidation:** Revoked tokens are immediately added to a Redis-backed blacklist with an automatic TTL matching the token's remaining lifetime.

### Refresh Token Rotation (RTR) Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Server as Aegis API
    participant DB as PostgreSQL
    participant Redis as Redis Cache

    Client->>Server: POST /api/v1/auth/refresh (RefreshToken_A)
    Server->>DB: Lookup RefreshToken_A
    alt Token already used (Reuse Detection)
        Server->>DB: Invalidate ALL tokens in Token Family
        Server->>Redis: Blacklist User Sessions
        Server-->>Client: 401 Unauthorized (Breach detected)
    else Token valid
        Server->>DB: Mark RefreshToken_A as REVOKED
        Server->>DB: Insert new RefreshToken_B
        Server-->>Client: 200 OK (New AccessToken + RefreshToken_B)
    end
```

---

## 3. Role-Based Access Control (RBAC)

Aegis implements granular permissions mapped to roles through a many-to-many junction schema.

### Permission Hierarchy

```
Super Admin  ───▶  System Administrator  ───▶  Security Auditor  ───▶  Standard User
   [Full]             [User & Role Admin]          [Read-Only Audit]         [Self Profile]
```

### Database Schema Relational Model
- `users`: User identity credentials, MFA configuration, account status.
- `roles`: Defined roles (`super_admin`, `admin`, `auditor`, `user`).
- `permissions`: Atomic actions (`users:read`, `users:write`, `roles:manage`, `audit:read`).
- `role_permissions`: Mapping between roles and permissions.
- `user_roles`: User role assignments.

---

## 4. Tamper-Evident Audit Logging

Audit logs guarantee integrity and non-repudiation using cryptographic hash chaining:

$$H_n = \text{SHA-256}(H_{n-1} \parallel \text{Timestamp} \parallel \text{ActorID} \parallel \text{Action} \parallel \text{Payload})$$

```mermaid
graph LR
    Log1["Log #1\n(Hash: 00...a1)"] -->|PrevHash: 00...a1| Log2["Log #2\n(Hash: b4...f2)"]
    Log2 -->|PrevHash: b4...f2| Log3["Log #3\n(Hash: 9e...c7)"]
```

- **Verification Endpoint:** `/api/v1/audit/verify` verifies the continuous SHA-256 chain from the genesis block to the latest entry to detect database tampering.

---

## 5. Security & Cryptographic Standards

| Mechanism | Implementation | Purpose |
| :--- | :--- | :--- |
| **Password Hashing** | Argon2id | Resistant to GPU/ASIC brute-force attacks |
| **MFA Secrets** | AES-256-GCM | Encrypted storage of TOTP seeds at rest |
| **Session Control** | Redis `SETEX` | Instant token revocation & rate limiting |
| **Tamper Detection** | SHA-256 Chaining | Verifiable, tamper-evident audit trails |
