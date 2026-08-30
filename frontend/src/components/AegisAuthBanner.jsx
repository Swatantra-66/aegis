import React from 'react';

const CONTENT = {
  login: {
    topLabel: 'Zero-Trust Architecture',
    headline: <>Continuous<br />verification for<br />modern systems.</>,
    paragraph:
      'Aegis verifies every transaction using Argon2id key derivation, short-lived cryptographic access tokens, and automatic token rotation to eliminate stale session vulnerabilities.',
  },
  register: {
    topLabel: 'Identity Provisioning',
    headline: <>Fine-grained<br />access control<br />by design.</>,
    paragraph:
      'Define least-privilege permission sets, bind custom roles, and maintain complete tenant isolation across distributed enterprise services and microservice boundaries.',
  },
  recovery: {
    topLabel: 'Credential Recovery',
    headline: <>Secure account<br />restoration &<br />blast radius control.</>,
    paragraph:
      'Time-gated entropy tokens ensure identity recovery cannot be intercepted or replayed, automatically revoking compromised sessions across all active endpoints.',
  },
  verify: {
    topLabel: 'Cryptographic Provenance',
    headline: <>Authentic identities,<br />verified at<br />the origin.</>,
    paragraph:
      'End-to-end email validation attaches verifiable cryptographic proof to user identities, unlocking higher trust tiers and tamper-proof audit trails.',
  },
  mfa: {
    topLabel: 'Multi-Factor Shield',
    headline: <>Out-of-band<br />protection for<br />critical operations.</>,
    paragraph:
      'Challenge-response verification guarantees that even compromised credentials cannot grant access without secondary hardware-derived authenticator consent.',
  },
  'mfa-setup': {
    topLabel: 'Authenticator Enrollment',
    headline: <>Pair your device<br />with encrypted<br />seed vaults.</>,
    paragraph:
      'Generates synchronized time-based shared secrets stored at rest with AES-256-GCM encryption, compatible with Google Authenticator, 1Password, and Authy.',
  },
  'mfa-disable': {
    topLabel: 'Access Governance',
    headline: <>Step-down<br />verification &<br />audit chaining.</>,
    paragraph:
      'Modifications to security tiers require active second-factor confirmation, generating an immutable SHA-256 event logged directly to the distributed audit stream.',
  },
};

const AegisAuthBanner = ({ variant = 'login' }) => {
  const { topLabel, headline, paragraph } = CONTENT[variant] ?? CONTENT.login;

  return (
    <div className="aegis-auth-banner-side" aria-hidden="true">
      {/* Subtle ambient lighting */}
      <div className="aegis-banner-bg-ambient" />

      {/* Subtle AEGIS Watermark (low opacity) */}
      <div className="aegis-banner-watermark">
        AEGIS
      </div>

      {/* Left side: Large 3D Crystal Aegis Logo with Radial Halo */}
      <div className="aegis-banner-logo-panel">
        <div className="aegis-logo-refraction-halo" />
        <img
          src="/aegis-logo-new.png"
          alt="Aegis IAM Logo"
          className="aegis-banner-3d-logo"
        />
        {/* Subtle glass reflection blur underneath */}
        <div className="aegis-logo-pedestal-reflection" />
      </div>

      {/* Right side: Editorial text content */}
      <div className="aegis-banner-content">
        <div className="aegis-banner-top-label">
          {topLabel}
        </div>

        <h2 className="aegis-banner-headline">
          {headline}
        </h2>

        <div className="aegis-banner-paragraph-box">
          <p className="aegis-banner-paragraph">
            {paragraph}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AegisAuthBanner;
