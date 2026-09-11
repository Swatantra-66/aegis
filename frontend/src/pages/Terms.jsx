import React from 'react';
import { Link } from 'react-router-dom';

const Terms = () => {
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
            AEGIS-LEGAL-TERMS-v2.6
          </span>
        </div>

        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.75rem 0' }}>
          Terms and Conditions
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.92rem', margin: '0 0 2rem 0', lineHeight: 1.6 }}>
          Last updated: September 11, 2026. These Terms govern your access to and use of the Aegis Identity & Access Management Platform.
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
              1. Zero-Trust Identity Governance
            </h2>
            <p style={{ margin: 0 }}>
              By creating an account on Aegis, you agree to access governed enterprise services strictly within assigned role-based permissions and cryptographic boundaries. Any attempt to bypass tenant isolation or manipulate cryptographic tokens constitutes a violation of these terms.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
              2. Account Security & Credential Integrity
            </h2>
            <p style={{ margin: 0 }}>
              You are responsible for maintaining the confidentiality of your credentials. Passwords are protected using Argon2id key derivation, and multi-factor authentication (TOTP) is enforced on administrative tiers. Compromised credentials must be reported immediately to trigger global session invalidation.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
              3. Immutable Audit Logging
            </h2>
            <p style={{ margin: 0 }}>
              All authentication requests, identity provisioning actions, and authorization checks generate tamper-evident SHA-256 chained audit entries. You acknowledge that administrative actions cannot be retroactively expunged from the distributed audit stream.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
              4. Service Availability & SLA
            </h2>
            <p style={{ margin: 0 }}>
              Aegis is engineered for continuous enterprise operation with an automated 99.98% uptime SLA, redundant database clustering, and automated health probing.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
