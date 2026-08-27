# Security Policy

## Supported Versions

The following versions of Aegis IAM currently receive security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

We take the security of **Aegis IAM** seriously. If you discover a security vulnerability, please report it responsibly rather than opening a public issue.

### How to Report

1. **Email:** Send details to [aegis.swatantracodes.in](mailto:maverickswatantra@gmail.com) with the subject `[SECURITY VULNERABILITY] Aegis IAM`.
2. **Details to Include:**
   - A clear description of the vulnerability.
   - Steps to reproduce or a Proof of Concept (PoC).
   - Potential impact and affected components (e.g., Auth, MFA, RBAC, Redis Blacklist, Cryptographic Verification).
   - Any suggested remediations or mitigations.

### Response Timelines

- **Initial Acknowledgement:** Within 24-48 hours.
- **Triage & Impact Assessment:** Within 3-5 business days.
- **Patch Release:** Coordinated disclosure and fix deployment within 14 days for high/critical vulnerabilities.

---

## Security Architecture & Best Practices

Aegis IAM implements multiple layers of defense:

1. **Password Hashing:**
   - Standard: **Argon2id** (memory cost: 65536 KB, time cost: 3 iterations, parallelism: 4).
   - Passwords are never stored in plaintext or logged.

2. **Token Security & Rotation:**
   - Access tokens: Short-lived JWTs (15 minutes).
   - Refresh tokens: Cryptographically secure UUIDs/hashes rotated on each use with reuse detection.
   - Revocation: Redis-backed token blacklist (`EXPIRE` synchronized with token TTL).

3. **Multi-Factor Authentication (MFA):**
   - RFC 6238 TOTP (Time-Based One-Time Password) algorithm compatible with Google Authenticator and Authy.
   - MFA shared secrets are encrypted at rest using **AES-256-GCM**.
   - Single-use hashed backup codes for emergency recovery.

4. **Tamper-Evident Audit Trails:**
   - Audit records are cryptographically chained using SHA-256 (`hash = SHA256(prev_hash + log_payload)`).
   - Database trigger checks prevent unauthorized tampering of immutable audit rows.

5. **Transport & Network Hardening:**
   - HTTP Security Headers enforced via **Helmet**.
   - Strict Cross-Origin Resource Sharing (**CORS**) policies.
   - Tiered rate-limiting backed by Redis store to prevent brute-force attacks.
