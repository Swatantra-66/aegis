import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const Landing = () => {
  const navigate = useNavigate();

  const marqueeKeywords = [
    'AEGIS',
    'AUTHENTICATION',
    'AUTHORIZATION',
    'RBAC',
    'OAUTH / JWT',
    'SESSION MANAGEMENT',
    'TOTP MFA',
    'TOKEN MANAGEMENT',
    'AUDIT LOGS',
    'RATE LIMITING',
    'SHA-256 CHECKSUM',
    'SDLC STAGING',
    'ZERO TRUST',
    'ACCESS GOVERNANCE',
  ];

  return (
    <div className="okaydev-landing">
      {/* Navbar with 3D Letter Pop AEGIS Logo */}
      <header className="okaydev-navbar">
        <div className="okaydev-nav-inner">
          <Link to="/" className="okaydev-brand">
            <span className="brand-char">A</span>
            <span className="brand-char">E</span>
            <span className="brand-char">G</span>
            <span className="brand-char">I</span>
            <span className="brand-char">S</span>
          </Link>

          <nav className="okaydev-nav-links">
            <Link to="/dashboard">OVERVIEW</Link>
            <Link to="/users">IDENTITY</Link>
            <Link to="/profile">SECURITY</Link>
            <Link to="/sdlc">SDLC STAGING</Link>
            <a href="#team">TEAM</a>
          </nav>

          <div className="okaydev-nav-auth">
            <Link to="/login" className="okaydev-link-login">
              LOGIN
            </Link>
            <Link to="/register" className="okaydev-btn-pill">
              SIGN UP →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section — Clean Organic Emerald Green Canvas */}
      <section className="okaydev-hero">
        <div className="okaydev-hero-grid">
          {/* Hero Content */}
          <div className="okaydev-hero-content">
            {/* 3D Kinetic Logo Emblem (Ref: sirnik.co) */}
            <div className="hero-emblem-container">
              <div className="hero-3d-emblem-disc">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/696127daab7a27ca1af08ea8_logo-comp-2_poster.0000000.jpg"
                >
                  <source src="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/696127daab7a27ca1af08ea8_logo-comp-2_mp4.mp4" type="video/mp4" />
                  <source src="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/696127daab7a27ca1af08ea8_logo-comp-2_webm.webm" type="video/webm" />
                </video>
              </div>
            </div>

            <div className="hero-subtitle-tag">
              ZERO-TRUST IDENTITY & ACCESS MANAGEMENT ENGINE
            </div>

            <h1 className="hero-giant-title">
              <div>Identity</div>
              <div>Access</div>
              <div className="hero-builders-badge">Governance</div>
            </h1>

            <p className="hero-desc">
              Enterprise IAM architecture powered by Argon2id password hashing, Granular RBAC, TOTP Multi-Factor Authentication, Redis Token Revocation, and Tamper-Evident SHA-256 Audit Chains.
            </p>

            <div className="hero-cta-wrap">
              <button
                onClick={() => navigate('/register')}
                className="hero-cta-btn"
              >
                CREATE AN ACCOUNT →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Banner Ticker Strip (Slim Compact Height) */}
      <div className="okaydev-bottom-ticker">
        <div className="ticker-track">
          {[0, 1].map((key) => (
            <div className="ticker-segment" key={key}>
              {marqueeKeywords.map((keyword, idx) => (
                <React.Fragment key={idx}>
                  <span>{keyword}</span>
                  <span className="ticker-clover-icon">
                    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="7" r="4.5" fill="#6B7280" />
                      <circle cx="16" cy="25" r="4.5" fill="#6B7280" />
                      <circle cx="7" cy="16" r="4.5" fill="#6B7280" />
                      <circle cx="25" cy="16" r="4.5" fill="#6B7280" />
                      <circle cx="16" cy="16" r="2.5" fill="#6B7280" />
                    </svg>
                  </span>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Team Made Visible Section (Ref: Exact sirnik.co Editorial Layout) */}
      <section className="aegis-team-section" id="team">
        {/* Background Watermark Characters */}
        <div className="team-watermark">AEGIS</div>

        <div className="aegis-team-inner">
          {/* Top Editorial Giant Heading */}
          <h2 className="team-giant-top">
            Team made<br />visible
          </h2>

          {/* Staggered Cards Stage with Staggered Overlap */}
          <div className="team-editorial-stage">
            {/* Philosophy Notes */}
            <div className="team-philosophy-center">
              Small team. Clear ideas. Expressed with cryptographic clarity and control.
            </div>

            <div className="team-philosophy-left">
              <div><strong>Observe</strong> how security takes form.</div>
              <div className="mt-sm"><strong>Touch</strong> the architecture behind the visuals.</div>
              <div className="mt-sm"><strong>See</strong> how thinking becomes interface.</div>
            </div>

            {/* Left Card: Swatantra Yadav */}
            <div className="team-editorial-card team-card-left">
              <div className="team-video-portrait">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e8951d5da3df551ad0a2_avatar-4_poster.0000000.jpg"
                >
                  <source src="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e8951d5da3df551ad0a2_avatar-4_mp4.mp4" type="video/mp4" />
                  <source src="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e8951d5da3df551ad0a2_avatar-4_webm.webm" type="video/webm" />
                </video>
              </div>
              <div className="sirnik-card-label">
                <div className="sirnik-label-name">Swatantra Yadav</div>
                <div className="sirnik-label-meta">
                  <span>India</span>
                  <span className="sirnik-label-role">Project Lead, Backend Engineer</span>
                </div>
              </div>
            </div>

            {/* Right Card: Vishek Tyagi */}
            <div className="team-editorial-card team-card-right">
              <div className="team-video-portrait">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e77b08248983a3a43fa3_avatar-3_poster.0000000.jpg"
                >
                  <source src="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e77b08248983a3a43fa3_avatar-3_mp4.mp4" type="video/mp4" />
                  <source src="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e77b08248983a3a43fa3_avatar-3_webm.webm" type="video/webm" />
                </video>
              </div>
              <div className="sirnik-card-label">
                <div className="sirnik-label-name">Vishek Tyagi</div>
                <div className="sirnik-label-meta">
                  <span>India</span>
                  <span className="sirnik-label-role">Co-Lead, IAM & UI Systems</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Editorial Section — Balanced Architectural Composition */}
          <div className="team-seal-wrap mt-3xl">
            <div className="team-bottom-editorial-grid">
              <h4 className="team-giant-bottom" style={{ margin: 0, textAlign: 'left' }}>
                security engineered<br />
                into identity
              </h4>

              <div className="team-editorial-meta-block">
                <div className="editorial-meta-lead">
                  Every transaction authenticated. Every permission verified. Every audit log cryptographically chained.
                </div>
                <div className="editorial-meta-pillars">
                  <div className="editorial-pillar-item">
                    <span className="pillar-index">01</span>
                    <div className="pillar-content">
                      <strong>Argon2id Key Derivation</strong>
                      <span>Memory-hard password hashing engineered for post-quantum threat resistance.</span>
                    </div>
                  </div>
                  <div className="editorial-pillar-item">
                    <span className="pillar-index">02</span>
                    <div className="pillar-content">
                      <strong>Deterministic RBAC Matrix</strong>
                      <span>Fine-grained permissions and instant Redis-backed token revocation.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cut Scene Transition to AEGIS Trionn-Style Striped Footer ── */}
      <Footer />
    </div>
  );
};

export default Landing;
