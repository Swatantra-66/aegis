import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';

const Privacy = () => {
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
            Privacy Policy · EFFECTIVE: SEP 11, 2026
          </span>
        </nav>

        {/* Document Header */}
        <header className="aegis-editorial-header editorial-stagger">
          <span className="aegis-editorial-overline">
            DATA SOVEREIGNTY & CRYPTOGRAPHIC PRIVACY
          </span>
          <h1 className="aegis-editorial-title">
            Privacy Policy
          </h1>
          <p className="aegis-editorial-lead">
            Aegis is engineered on the principle of minimal identity exposure and zero third-party behavioral tracking.
            We operate with zero commercial tracking cookies, utilize short-lived cryptographic bearer tokens, and
            strictly partition telemetry under sovereign enterprise governance standards.
          </p>

          {/* Telemetry Spec Strip (Clean Single-Line Rule, No Floating Cards) */}
          <div className="aegis-editorial-spec-strip" role="complementary" aria-label="Privacy Architecture Specifications">
            <div className="aegis-editorial-spec-item">
              TRACKER PLEDGE:<strong>Zero 3rd-Party Trackers</strong>
            </div>
            <div className="aegis-editorial-spec-item">
              SESSION ARCHITECTURE:<strong>Cookie-Free Bearer JWTs</strong>
            </div>
            <div className="aegis-editorial-spec-item">
              TRANSPORT LAYER:<strong>Strict TLS 1.3 & HSTS</strong>
            </div>
            <div className="aegis-editorial-spec-item">
              SOVEREIGNTY:<strong>Zero Data Commercialization</strong>
            </div>
          </div>

          {/* Quick-Jump Table of Contents */}
          <div className="aegis-editorial-toc" aria-label="Table of Contents">
            <a href="#sec-tracker" className="aegis-editorial-toc-link">01 · Zero-Tracker Architecture</a>
            <a href="#sec-session" className="aegis-editorial-toc-link">02 · Cookie-Free Sessions</a>
            <a href="#sec-telemetry" className="aegis-editorial-toc-link">03 · Telemetry & Audit Trails</a>
            <a href="#sec-mail" className="aegis-editorial-toc-link">04 · Transactional Mail</a>
            <a href="#sec-isolation" className="aegis-editorial-toc-link">05 · Encryption & Isolation</a>
            <a href="#sec-rights" className="aegis-editorial-toc-link">06 · User Rights & Retention</a>
          </div>
        </header>

        {/* Continuous Editorial Long-Form Sections */}
        <main>
          {/* Section 01 */}
          <section id="sec-tracker" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">01.</span>
              Zero-Tracker Infrastructure & Data Minimization
            </h2>
            <p className="aegis-editorial-p">
              Aegis does not deploy third-party advertising pixels, session replay scripts, cross-site telemetry
              beacons, or commercial analytics trackers. We believe enterprise identity portals should be completely
              isolated from commercial advertising surveillance.
            </p>
            <h3 className="aegis-editorial-subheading">1.1 Minimal Data Collection</h3>
            <p className="aegis-editorial-p">
              We collect and process only the minimal telemetry necessary to provide cryptographically verified
              authentication, enforce role-based access control (RBAC), and fulfill regulatory compliance audits.
              This consists exclusively of enterprise email addresses, user display names, hashed credentials, and
              immutable administrative audit logs.
            </p>
            <h3 className="aegis-editorial-subheading">1.2 Zero Data Commercialization</h3>
            <p className="aegis-editorial-p">
              Aegis will never monetize, lease, sublicense, or sell user credentials, identity claims, or access logs
              to third parties or data brokers. All data processed within the platform remains the sovereign asset of the
              originating tenant organization.
            </p>
          </section>

          {/* Section 02 */}
          <section id="sec-session" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">02.</span>
              Cookie-Free Bearer Sessions & Redis Revocation
            </h2>
            <p className="aegis-editorial-p">
              Unlike legacy web applications that rely on opaque tracking cookies vulnerable to Cross-Site Request
              Forgery (CSRF) and third-party sniffing, Aegis operates on a completely cookie-free architecture.
            </p>
            <h3 className="aegis-editorial-subheading">2.1 Cryptographic JWT Bearer Authorization</h3>
            <p className="aegis-editorial-p">
              Authenticated sessions are represented through cryptographically signed JSON Web Tokens (JWT) transmitted
              explicitly in standard <code>Authorization: Bearer &lt;token&gt;</code> HTTP headers. Access tokens carry
              a strictly bounded lifespan (15 minutes) and are verified statelessly against public verification keys.
            </p>
            <h3 className="aegis-editorial-subheading">2.2 Redis-Backed Blacklist Invalidation</h3>
            <p className="aegis-editorial-p">
              When a user signs out or a session is revoked, the token unique identifier (<code>jti</code>) is committed
              to a high-performance Redis revocation registry with a time-to-live matching the remaining lifespan of
              the token (<code>SETEX bl:&lt;jti&gt; &lt;ttl&gt; 1</code>), guaranteeing immediate revocation across all cluster nodes.
            </p>
          </section>

          {/* Section 03 */}
          <section id="sec-telemetry" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">03.</span>
              Telemetry Collection & SHA-256 Audit Immutability
            </h2>
            <p className="aegis-editorial-p">
              To guarantee non-repudiation and forensic traceability, operational interactions generate cryptographically
              chained audit records containing:
            </p>
            <ul className="aegis-editorial-list">
              <li className="aegis-editorial-list-item">
                <span className="dash">—</span>
                <div>
                  <strong>Actor Provenance:</strong> The authenticated user identifier and originating role claim.
                </div>
              </li>
              <li className="aegis-editorial-list-item">
                <span className="dash">—</span>
                <div>
                  <strong>Action Signature:</strong> Standardized security event tag (e.g. <code>USER_LOGIN</code>, <code>MFA_ENABLED</code>, <code>ROLE_ASSIGNED</code>).
                </div>
              </li>
              <li className="aegis-editorial-list-item">
                <span className="dash">—</span>
                <div>
                  <strong>Network Telemetry:</strong> Originating client IP address (sanitized for security anomaly detection) and user-agent string.
                </div>
              </li>
              <li className="aegis-editorial-list-item">
                <span className="dash">—</span>
                <div>
                  <strong>Cryptographic Linkage:</strong> SHA-256 hash chaining connecting each record irreversibly to the preceding event.
                </div>
              </li>
            </ul>
            <div className="aegis-editorial-callout">
              <strong>Audit Integrity Notice:</strong> Cryptographic audit chains cannot be altered or excised. When an
              account is decommissioned, personal identity fields are scrubbed or pseudonymized while retaining the mathematical
              continuity of the chain to satisfy statutory audit mandates.
            </div>
          </section>

          {/* Section 04 */}
          <section id="sec-mail" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">04.</span>
              Transactional Mail & Account Verification Security
            </h2>
            <p className="aegis-editorial-p">
              Email addresses provided during registration or recovery workflows are utilized strictly for account
              verification, security alerts, and privileged access notifications. Aegis never transmits marketing
              communications, newsletters, or promotional broadcasts.
            </p>
            <h3 className="aegis-editorial-subheading">4.1 Transport Security & API Dispatch</h3>
            <p className="aegis-editorial-p">
              Email dispatch is executed over dedicated Google Gmail REST API endpoints via encrypted HTTPS Port 443
              or authenticated TLS 1.3 SMTP connections. Plain-text and HTML alternatives are sanitized to prevent
              XSS injection and header smuggling vectors.
            </p>
            <h3 className="aegis-editorial-subheading">4.2 Anti-Enumeration & Token Lifecycles</h3>
            <p className="aegis-editorial-p">
              Verification links incorporate single-use, high-entropy cryptographic tokens bounded to a 15-minute
              expiration window. Verification and registration endpoints return uniform timing and response payloads
              to prevent account enumeration probes by adversarial actors.
            </p>
          </section>

          {/* Section 05 */}
          <section id="sec-isolation" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">05.</span>
              Cryptographic Encryption At Rest & Tenant Partitioning
            </h2>
            <p className="aegis-editorial-p">
              All persistent data within Aegis is protected through layered cryptographic defenses:
            </p>
            <ul className="aegis-editorial-list">
              <li className="aegis-editorial-list-item">
                <span className="dash">—</span>
                <div>
                  <strong>Argon2id Key Derivation:</strong> Password hashes are derived using 64 MiB memory allocations and 3 iterations to defeat ASIC/GPU attacks.
                </div>
              </li>
              <li className="aegis-editorial-list-item">
                <span className="dash">—</span>
                <div>
                  <strong>AES-256-GCM MFA Storage:</strong> TOTP secrets and recovery codes are encrypted at rest with random 12-byte initialization vectors and authentication tags.
                </div>
              </li>
              <li className="aegis-editorial-list-item">
                <span className="dash">—</span>
                <div>
                  <strong>Tenant Partitioning:</strong> Strictly scoped database queries prevent cross-organization data access, enforced via 100% parameterized SQL transactions.
                </div>
              </li>
            </ul>
          </section>

          {/* Section 06 */}
          <section id="sec-rights" className="aegis-editorial-section editorial-stagger">
            <h2 className="aegis-editorial-section-title">
              <span className="aegis-editorial-section-num">06.</span>
              Data Subject Rights, Retention & Global Compliance
            </h2>
            <p className="aegis-editorial-p">
              In accordance with global privacy frameworks (GDPR Article 15-22, California Consumer Privacy Act CCPA/CPRA),
              users hold comprehensive rights regarding their identity data:
            </p>
            <p className="aegis-editorial-p">
              <strong>Right to Access & Rectification:</strong> You may review, export, and update your personal identity profile,
              configured multi-factor credentials, and active sessions directly through the authenticated security portal.
            </p>
            <p className="aegis-editorial-p">
              <strong>Right to Erasure (De-provisioning):</strong> When an account is terminated by a tenant administrator,
              all active session tokens are revoked immediately in Redis, and identity records are marked for archival or
              irreversible cryptographic deletion in accordance with your organization's data retention agreement.
            </p>
            <p className="aegis-editorial-p">
              For security and regulatory inquiries regarding our cryptographic privacy architecture, contact the Aegis
              Security Governance team at <a href="mailto:aegisiamsecurity@gmail.com" style={{ color: '#ffffff', textDecoration: 'underline' }}><code>aegisiamsecurity@gmail.com</code></a>.
            </p>
          </section>
        </main>

        {/* Editorial Document Footer */}
        <footer className="aegis-editorial-footer editorial-stagger">
          <div>&copy; {new Date().getFullYear()} AEGIS IAM. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/register">Sign Up</Link>
            <Link to="/login">Sign In</Link>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Privacy;
