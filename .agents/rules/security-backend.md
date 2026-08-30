---
trigger: always_on
description: Backend security, zero-trust cryptographic requirements, and database hygiene rules for Aegis IAM.
---

# Aegis Backend Security & Cryptographic Rules

## 1. Cryptographic Standards
- **Password Hashing**: Argon2id ONLY (`timeCost: 3`, `memoryCost: 65536`, `parallelism: 4`). Never use bcrypt, MD5, or SHA for passwords.
- **MFA Secrets**: AES-256-GCM encryption at rest with random 12-byte IVs and authenticated tags.
- **Audit Logs**: Cryptographic SHA-256 hash chaining. `current_hash = SHA256(previous_hash + action + actor_id + resource + timestamp)`.
- **Timing Attacks**: Always use `crypto.timingSafeEqual` for secret and token comparisons.

## 2. Token Lifecycle & Session Rules
- **Refresh Token Rotation (RTR)**: Family-based tracking. If a revoked refresh token is presented, immediately revoke the ENTIRE token family (reuse breach detection).
- **Redis Blacklisting**: When access tokens are logged out, store their `jti` in Redis with exact TTL matching token remaining lifetime (`SETEX bl:<jti> <ttl> 1`).
- **Database Sanitization**: 100% parameterized SQL queries (`$1, $2, ...`). Zero raw string concatenation in SQL queries.
