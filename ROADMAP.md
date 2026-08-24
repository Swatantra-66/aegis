# Aegis IAM — Engineering Roadmap

This document outlines the strategic milestones, current development status, and future vision for the **Aegis IAM** platform.

---

## 🎯 Current Status: Phase 1 (Completed & Production-Ready)

| Milestone | Feature Area | Status | Key Deliverables |
| :--- | :--- | :---: | :--- |
| **1.1** | **Core Authentication** | ✅ Done | Argon2id password hashing, JWT Access & Refresh Token generation. |
| **1.2** | **Token Lifecycle** | ✅ Done | Family-based refresh token rotation (RTR) with reuse breach detection & Redis blacklist. |
| **1.3** | **Multi-Factor Auth (MFA)** | ✅ Done | RFC 6238 TOTP (Google Authenticator), AES-256-GCM encrypted secrets, emergency backup codes. |
| **1.4** | **RBAC Engine** | ✅ Done | Dynamic role-permission mapping, junction table schemas, and route-level authorization guards. |
| **1.5** | **Tamper-Evident Audit** | ✅ Done | SHA-256 cryptographic hash-chaining across audit logs with continuous verification API. |
| **1.6** | **Frontend Experience** | ✅ Done | High-aesthetic React SPA with real-time security dashboard and interactive SDLC workflow. |

---

## 🚀 Phase 2: Enterprise Protocols & Modern Auth (Q3 - Q4)

- [ ] **WebAuthn & Passkeys (FIDO2)**
  - Passwordless sign-in with biometric hardware keys (TouchID, FaceID, YubiKey).
- [ ] **SSO / OpenID Connect (OIDC) & SAML 2.0**
  - Enterprise federation with Google Workspace, Okta, Azure AD, and GitHub OAuth providers.
- [ ] **SCIM 2.0 Provisioning**
  - Automated identity lifecycle management (CRUD on users/groups synced from identity providers).
- [ ] **Fine-Grained Attribute-Based Access Control (ABAC)**
  - Context-aware policy evaluation engine based on IP, geolocation, device risk score, and time of access.

---

## 🔮 Phase 3: AI Telemetry & Distributed Scale (Next Horizon)

- [ ] **Adaptive / Anomaly-Based Risk Scoring**
  - Real-time login anomaly detection (impossible travel velocities, anomalous IP heuristics).
- [ ] **SIEM & Event Streaming Integration**
  - Native log ingestion connectors for Datadog, Splunk, Elastic, and AWS CloudWatch via Kafka/webhooks.
- [ ] **Multi-Tenant Organization Boundaries**
  - Row-level tenant partitioning, organization-specific SAML configurations, and custom domains.
- [ ] **Zero-Knowledge Recovery Protocols**
  - Social recovery and threshold cryptography for root system recovery without single-point compromise.

---

## 💡 Suggesting a Feature?
If you have ideas or feature requests that align with Aegis IAM's architecture, feel free to open a Feature Request Discussion or submit an RFC following [CONTRIBUTING.md](./CONTRIBUTING.md).
