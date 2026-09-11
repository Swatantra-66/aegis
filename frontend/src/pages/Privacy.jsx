import React from 'react';
import { Link } from 'react-router-dom';

const Privacy = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050507',
        color: '#ffffff',
        fontFamily: 'var(--font-sans, Inter, sans-serif)',
        padding: '3rem 1.5rem',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: '780px', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <Link
            to="/register"
            style={{
              color: '#9ca3af',
              textDecoration: 'none',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            ← Back to Registration
          </Link>
          <span style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'var(--font-mono, monospace)' }}>
            AEGIS-PRIVACY-PLEDGE-v2.6
          </span>
        </div>

        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem 0' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.92rem', margin: '0 0 2rem 0', lineHeight: 1.6 }}>
          Last updated: September 11, 2026. Learn how Aegis protects your identity data with zero third-party tracking.
        </p>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem',
            fontSize: '0.92rem',
            lineHeight: 1.65,
            color: '#d1d5db',
          }}
        >
          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
              1. Zero Third-Party Trackers
            </h2>
            <p style={{ margin: 0 }}>
              Aegis operates with an absolute zero-tracker pledge. We do not use third-party analytics scripts, marketing trackers, or cross-site tracking beacons. Your browsing activity and security interactions are never monetized or shared with third parties.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
              2. Cookie-Free Bearer Token Architecture
            </h2>
            <p style={{ margin: 0 }}>
              Authentication sessions rely exclusively on short-lived cryptographic JSON Web Tokens (JWT) stored in browser memory or local storage, refreshed via Redis-backed token rotation. We do not place tracking or persistent identifier cookies on your device.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
              3. Cryptographic Identity Validation
            </h2>
            <p style={{ margin: 0 }}>
              Your email address is verified out-of-band using single-use cryptographic tokens with 24-hour expiration stored in ephemeral Redis memory. Verification links are securely dispatched via Google Workspace REST API over TLS 1.3.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
              4. Complete Tenant Data Isolation
            </h2>
            <p style={{ margin: 0 }}>
              User identities, roles, and cryptographic audit logs are partitioned with strict foreign key constraints and parametrized queries to prevent data contamination across tenants.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
