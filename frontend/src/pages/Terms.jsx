import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';

const Terms = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.editorial-stagger',
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.05, ease: 'power3.out' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="aegis-editorial-root" ref={containerRef}>
      <div className="aegis-editorial-container">
        {/* Top Minimal Navigation */}
        <nav className="aegis-editorial-nav editorial-stagger" aria-label="Document Navigation">
          <Link to="/register" className="aegis-editorial-back-link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Sign Up
          </Link>

          <span className="aegis-editorial-doc-meta">
            Terms of Service · EFFECTIVE: SEP 11, 2026
          </span>
        </nav>

        {/* Document Header */}
        <header className="aegis-editorial-header editorial-stagger">
          <span className="aegis-editorial-overline">
            ENTERPRISE IDENTITY GOVERNANCE
          </span>
          <h1 className="aegis-editorial-title">
            Terms of Service
          </h1>
          <p className="aegis-editorial-lead">
            These Terms govern access to and usage of the Aegis Identity & Access Management Platform.
            By provisioning an enterprise credential or accessing governed tenant resources, you enter into a
            binding operational agreement under these cryptographic boundaries and zero-trust standards.
          </p>

          {/* Telemetry Spec Strip (Clean Single-Line Rule, No Floating Cards) */}
          <div className="aegis-editorial-spec-strip" role="complementary" aria-label="Security Specifications">
            <div className="aegis-editorial-spec-item">
              DERIVATION:<strong>Argon2id (RFC 9106)</strong>
            </div>
            <div className="aegis-editorial-spec-item">
              AUDIT CHAIN:<strong>SHA-256 Merkle Lineage</strong>
            </div>
            <div className="aegis-editorial-spec-item">
              AVAILABILITY:<strong>99.98% High Availability</strong>
            </div>
            <div className="aegis-editorial-spec-item">
              REVOCATION:<strong>Redis Token Lineage Kill</strong>
            </div>
          </div>

          {/* Quick-Jump Table of Contents */}
          <div className="aegis-editorial-toc" aria-label="Table of Contents">
            <a href="#sec-governance" className="aegis-editorial-toc-link">01 · Governance & Scope</a>
            <a href="#sec-credentials" className="aegis-editorial-toc-link">02 · Credentials & MFA</a>
            <a href="#sec-audit" className="aegis-editorial-toc-link">03 · Audit Immutability</a>
            <a href="#sec-sla" className="aegis-editorial-toc-link">04 · SLA & Availability</a>
            <a href="#sec-prohibitions" className="aegis-editorial-toc-link">05 · Prohibitions & RTR</a>
            <a href="#sec-liability" className="aegis-editorial-toc-link">06 · Liability & Remedies</a>
          </div>
        </header>

        {/* Continuous Editorial Long-Form Sections */}
        <main>
          {/* Section 01 */}
          <section id="sec-governance" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">01.</span>
              Zero-Trust Identity Governance & Access Boundaries
            </h2>
            <p className="aegis-editorial-p">
              Access to the Aegis Identity and Access Management Platform is provisioned under the principle of
              strict least-privilege role-based access control (RBAC). Every incoming request to governed API
              endpoints and dashboard utilities must present a valid, cryptographically signed JSON Web Token (JWT)
              originating from an authorized session handshake.
            </p>
            <h3 className="aegis-editorial-subheading">1.1 Role-Based Permission Boundaries</h3>
            <p className="aegis-editorial-p">
              Permissions are bound strictly to assigned organizational roles (Super Admin, Security Admin, Auditor,
              Member). Users must not attempt to execute administrative operations, mutate tenant directory objects, or
              inspect audit logs outside their granted operational matrix. Any attempt to forge authorization headers,
              tamper with signature payloads, or manipulate claims will trigger automated session revocation.
            </p>
            <h3 className="aegis-editorial-subheading">1.2 Tenant Isolation & Boundary Integrity</h3>
            <p className="aegis-editorial-p">
              All directory objects, credential pools, and permission grants are partitioned under strict tenant
              isolation policies. You must not attempt horizontal privilege traversal or cross-tenant query injection.
              Database transactions are 100% parameterized at the data persistence layer to prevent data boundary leakage.
            </p>
          </section>

          {/* Section 02 */}
          <section id="sec-credentials" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">02.</span>
              Cryptographic Credentials, Password Derivation & MFA
            </h2>
            <p className="aegis-editorial-p">
              Aegis does not store plaintext passwords under any circumstances. Password verification is executed
              exclusively using memory-hard Argon2id key derivation functions configured with high computational
              resistance (memoryCost: 65,536 KiB, timeCost: 3 iterations, parallelism: 4 threads).
            </p>
            <h3 className="aegis-editorial-subheading">2.1 Multi-Factor Authentication (TOTP RFC 6238)</h3>
            <p className="aegis-editorial-p">
              Accounts configured with multi-factor authentication mandate the presentation of a valid 6-digit Time-based
              One-Time Password (TOTP) generated via an RFC 6238 compliant authenticator application. Shared secrets are
              encrypted at rest using AES-256-GCM authenticated encryption with unique 12-byte initialization vectors.
            </p>
            <div className="aegis-editorial-callout">
              <strong>Compromise Protocol:</strong> If you suspect that your credentials, recovery codes, or TOTP authenticator
              have been intercepted, you must initiate global session invalidation immediately through your security profile or
              notify the platform incident response team.
            </div>
          </section>

          {/* Section 03 */}
          <section id="sec-audit" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">03.</span>
              Tamper-Evident SHA-256 Audit Logging & Non-Repudiation
            </h2>
            <p className="aegis-editorial-p">
              Every administrative mutation, privilege escalation, credential lifecycle event, and authentication
              attempt is committed to an immutable, cryptographically chained audit ledger. Each log record is bound
              to its immediate predecessor via SHA-256 Merkle hashing:
            </p>
            <div className="aegis-editorial-callout" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
              current_hash = SHA256(previous_hash + action + actor_id + resource + timestamp)
            </div>
            <p className="aegis-editorial-p">
              You acknowledge and agree that audit records cannot be retroactively modified, reordered, truncated, or
              expunged by any actor, including enterprise administrators. Audit log immutability provides definitive
              non-repudiation for regulatory compliance (SOC 2 Type II, ISO 27001, and HIPAA).
            </p>
          </section>

          {/* Section 04 */}
          <section id="sec-sla" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">04.</span>
              Service Availability, Enterprise SLA & Resiliency
            </h2>
            <p className="aegis-editorial-p">
              The Aegis infrastructure is engineered for mission-critical enterprise workloads with a targeted uptime
              commitment of <strong>99.98%</strong> across all core authentication and authorization endpoints.
            </p>
            <ul className="aegis-editorial-list">
              <li className="aegis-editorial-list-item">
                <span className="dash">—</span>
                <div>
                  <strong>Automated Health Probes:</strong> High-frequency synthetic liveness and readiness probing across all cluster nodes with sub-second failover.
                </div>
              </li>
              <li className="aegis-editorial-list-item">
                <span className="dash">—</span>
                <div>
                  <strong>Adaptive Rate Limiting:</strong> Tiered token-bucket throttling against abusive brute-force attempts and distributed credential stuffing vectors.
                </div>
              </li>
              <li className="aegis-editorial-list-item">
                <span className="dash">—</span>
                <div>
                  <strong>Maintenance Windows:</strong> Scheduled infrastructure maintenance is published in advance via platform telemetry streams. Urgent zero-day security mitigations may be applied asynchronously.
                </div>
              </li>
            </ul>
          </section>

          {/* Section 05 */}
          <section id="sec-prohibitions" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">05.</span>
              Security Prohibitions & Refresh Token Lineage Invalidation
            </h2>
            <p className="aegis-editorial-p">
              Any intentional deployment of automated scanners, fuzzers, directory harvesters, or reverse-engineering
              tooling against non-staging infrastructure without prior cryptographic authorization is strictly prohibited
              and grounds for immediate account suspension.
            </p>
            <h3 className="aegis-editorial-subheading">5.1 Refresh Token Rotation (RTR) & Family Revocation</h3>
            <p className="aegis-editorial-p">
              Aegis enforces strict family-based Refresh Token Rotation. Each token refresh generates a single-use
              replacement and invalidates the previous token. If an already-consumed refresh token is presented at the
              authentication boundary, the system identifies an active token reuse breach and instantaneously revokes
              the <em>entire token lineage family</em> in Redis, forcing re-authentication across all active devices.
            </p>
          </section>

          {/* Section 06 */}
          <section id="sec-liability" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">06.</span>
              Enterprise Limitation of Liability & Cryptographic Finality
            </h2>
            <p className="aegis-editorial-p">
              To the maximum extent permitted by applicable law, Aegis provides identity governance services on an
              "as-is" and "as-available" basis. In no event shall Aegis or its infrastructure maintainers be liable for
              indirect, incidental, special, consequential, or punitive damages arising from compromised client endpoints,
              lost recovery seeds, or third-party DNS tampering outside platform ingress boundaries.
            </p>
            <p className="aegis-editorial-p">
              These Terms are governed by and construed under international cryptographic standards and applicable
              enterprise identity governance jurisdictions.
            </p>
          </section>
        </main>

        {/* Editorial Document Footer */}
        <footer className="aegis-editorial-footer editorial-stagger">
          <div>&copy; {new Date().getFullYear()} AEGIS IAM. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/register">Sign Up</Link>
            <Link to="/login">Sign In</Link>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Terms;
