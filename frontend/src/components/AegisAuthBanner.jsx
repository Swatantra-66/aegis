import React from 'react';

const CONTENT = {
  login: {
    topLabel: 'Zero-Trust Identity',
    headline: <>Secure access<br />starts with<br />knowing who.</>,
    paragraph:
      'Aegis enforces cryptographic authentication with Argon2id hashing, short-lived JWT access tokens, and refresh token rotation — so every session is verified, not assumed.',
  },
  register: {
    topLabel: 'Enterprise Identity Governance',
    headline: <>Your identity,<br />governed with<br />precision.</>,
    paragraph:
      'Aegis provides granular RBAC, RFC 6238 TOTP MFA, tamper-evident SHA-256 audit chaining, and distributed Redis rate limiting across enterprise infrastructure.',
  },
  recovery: {
    topLabel: 'Cryptographic Credential Recovery',
    headline: <>Recover access<br />with verified<br />security.</>,
    paragraph:
      'Aegis issues cryptographically signed, single-use recovery tokens with strict expiry to ensure identity integrity and prevent unauthorized takeovers.',
  },
  mfa: {
    topLabel: 'Multi-Factor Verification',
    headline: <>Two-factor<br />hardware & TOTP<br />protection.</>,
    paragraph:
      'RFC 6238 time-based one-time password protocol safeguards your identity with continuous cryptographic multi-layer validation.',
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

      {/* Left side: Dramatic Large 3D Crystal Aegis Logo with Radial Halo */}
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
