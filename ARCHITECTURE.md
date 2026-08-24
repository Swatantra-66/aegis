# Aegis IAM — System Architecture & Design

A deep-dive technical overview of Aegis IAM's architecture, security models, data flows, and state management.

---

## 1. High-Level Architecture

```mermaid
graph TD
    Client["Client / React Frontend\n(Vite SPA)"] -->|HTTPS / REST API| Gateway["API Gateway / Express Server\n(Helmet, Rate-Limiter, CORS)"]
    
    subgraph "Aegis Core Backend"
        Gateway --> AuthMW["Auth & RBAC Middleware"]
        AuthMW --> AuthMod["Auth Module\n(Argon2, JWT, Tokens)"]
        AuthMW --> MfaMod["MFA Module\n(TOTP, AES-256)"]
        AuthMW --> RolesMod["Roles & RBAC Module"]
        AuthMW --> AuditMod["Audit Logging Module\n(SHA-256 Hash Chain)"]
    end

    subgraph "Data & Cache Layer"
        AuthMod -->|Session / Blacklist / Rate-Limit| Redis[("Redis 6+ (In-Memory)")]
        AuthMod -->|Users, Roles, Permissions| Postgres[("PostgreSQL 14+ (Persistent Store)")]
        AuditMod -->|Tamper-Evident Logs| Postgres
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
