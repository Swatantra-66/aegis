import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const [cookieConsent, setCookieConsent] = useState(() => {
    return localStorage.getItem('aegis_cookie_consent') || null;
  });
  const [liveTime, setLiveTime] = useState('');
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isInCutScene, setIsInCutScene] = useState(false);
  const footerRef = useRef(null);
  const svgRef = useRef(null);

  // Live time counter (UTC + IST)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const istTime = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLiveTime(istTime);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer to trigger cinematic cut scene transition
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInCutScene(true);
        }
      },
      { threshold: 0.15 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Mouse move spotlight effect on the striped text
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const handleCookieAccept = () => {
    localStorage.setItem('aegis_cookie_consent', 'accepted');
    setCookieConsent('accepted');
  };

  const handleCookieDecline = () => {
    localStorage.setItem('aegis_cookie_consent', 'declined');
    setCookieConsent('declined');
  };

  return (
    <footer className="trionn-footer-root" ref={footerRef}>
      {/* ── Cinematic Cut Scene Transition Banner with Centered 3D Logo ── */}
      <div className={`cut-scene-transition-bar ${isInCutScene ? 'active' : ''}`}>
        <div className="cut-scene-line left-line"></div>
        <div className="cut-scene-logo-center">
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
        <div className="cut-scene-line right-line"></div>
      </div>

      {/* ── Atmospheric Ambient Smoke & Mist Background Canvas ── */}
      <div className="trionn-smoke-backdrop">
        <div className="smoke-cloud smoke-1"></div>
        <div className="smoke-cloud smoke-2"></div>
        <div className="smoke-cloud smoke-3"></div>
        <div className="smoke-vignette"></div>
      </div>

      <div className="trionn-footer-container">
        {/* ── Navigation Links & Reference Documentation Grid ── */}
        <div className="trionn-footer-nav-grid">
          <div className="trionn-nav-col">
            <div className="trionn-col-title">PORTAL MODULES</div>
            <ul className="trionn-links-list">
              <li><Link to="/dashboard">System Overview</Link></li>
              <li><Link to="/users">Identity Governance</Link></li>
              <li><Link to="/roles">RBAC Permissions Matrix</Link></li>
              <li><Link to="/audit">SHA-256 Audit Trails</Link></li>
              <li><Link to="/sdlc">SDLC Staging Pipeline</Link></li>
            </ul>
          </div>

          <div className="trionn-nav-col">
            <div className="trionn-col-title">SECURITY SPECIFICATIONS</div>
            <ul className="trionn-links-list">
              <li>
                <a href="https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html" target="_blank" rel="noopener noreferrer">
                  OWASP Auth Guidelines
                </a>
              </li>
              <li>
                <a href="https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" target="_blank" rel="noopener noreferrer">
                  Argon2id Storage Standard
                </a>
              </li>
              <li>
                <a href="https://datatracker.ietf.org/doc/html/rfc6238" target="_blank" rel="noopener noreferrer">
                  RFC 6238 (TOTP MFA)
                </a>
              </li>
              <li>
                <a href="https://jwt.io/introduction" target="_blank" rel="noopener noreferrer">
                  JWT Architecture Guide
                </a>
              </li>
              <li>
                <a href="https://owasp.org/www-project-application-security-verification-standard/" target="_blank" rel="noopener noreferrer">
                  OWASP ASVS v4.0
                </a>
              </li>
            </ul>
          </div>

          <div className="trionn-nav-col">
            <div className="trionn-col-title">STUDY & REFERENCES</div>
            <ul className="trionn-links-list">
              <li>
                <a href="https://www.cisa.gov/zero-trust-maturity-model" target="_blank" rel="noopener noreferrer">
                  CISA Zero Trust Model
                </a>
              </li>
              <li>
                <a href="https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest" target="_blank" rel="noopener noreferrer">
                  MDN Cryptographic Hash
                </a>
              </li>
              <li>
                <a href="https://auth0.com/docs/manage-users/access-control/rbac" target="_blank" rel="noopener noreferrer">
                  Enterprise RBAC Model
                </a>
              </li>
              <li>
                <a href="https://redis.io/docs/latest/operate/oss_and_stack/management/security/" target="_blank" rel="noopener noreferrer">
                  Redis Revocation Docs
                </a>
              </li>
              <li>
                <a href="https://github.com/P-H-C/phc-winner-argon2" target="_blank" rel="noopener noreferrer">
                  Argon2 Specification
                </a>
              </li>
            </ul>
          </div>

          <div className="trionn-nav-col">
            <div className="trionn-col-title">SYSTEM DEPLOYMENT</div>
            <div className="trionn-system-status-box">
              <div className="status-metric-row">
                <span className="status-metric-label">STATUS</span>
                <span className="status-metric-val text-success">ACTIVE</span>
              </div>
              <div className="status-metric-row">
                <span className="status-metric-label">IAAS</span>
                <span className="status-metric-val font-mono">DigitalOcean</span>
              </div>
              <div className="status-metric-row">
                <span className="status-metric-label">HOST</span>
                <span className="status-metric-val font-mono">mythos(VPS)</span>
              </div>
              <div className="status-metric-row">
                <span className="status-metric-label">REGION</span>
                <span className="status-metric-val">BLR1 (Bengaluru)</span>
              </div>
              <div className="status-metric-row">
                <span className="status-metric-label">OS</span>
                <span className="status-metric-val">Ubuntu 24.04 LTS</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Signature Trionn Horizontal Striped AEGIS Cut Scene Graphic ── */}
        <div
          className="trionn-giant-striped-wrap"
          onMouseMove={handleMouseMove}
          ref={svgRef}
        >
          {/* Sliced Scanline Horizontal SVG Logo */}
          <svg
            className="trionn-striped-svg"
            viewBox="0 0 1440 280"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Pattern of thin horizontal sliced lines (matches Trionn aesthetic) */}
              <pattern
                id="aegisScanlines"
                width="1440"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="2"
                  x2="1440"
                  y2="2"
                  stroke="rgba(255, 255, 255, 0.7)"
                  strokeWidth="1.5"
                />
              </pattern>

              {/* Text Mask for AEGIS */}
              <mask id="aegisMask">
                <rect width="1440" height="280" fill="black" />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="'Plus Jakarta Sans', -apple-system, sans-serif"
                  fontWeight="900"
                  fontSize="240"
                  letterSpacing="0.06em"
                  fill="white"
                >
                  AEGIS
                </text>
              </mask>

              {/* Laser highlight gradient */}
              <radialGradient
                id="mouseGlowGradient"
                cx={`${mousePos.x}%`}
                cy={`${mousePos.y}%`}
                r="30%"
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="60%" stopColor="#ffffff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Base Horizontal Striped Letters */}
            <rect
              width="1440"
              height="280"
              fill="url(#aegisScanlines)"
              mask="url(#aegisMask)"
              className="aegis-striped-base"
            />

            {/* Spotlight Glow over lines following cursor */}
            <rect
              width="1440"
              height="280"
              fill="url(#mouseGlowGradient)"
              mask="url(#aegisMask)"
              className="aegis-striped-glow"
            />
          </svg>

          {/* ── Exact Trionn Cookie Consent Pill Modal ── */}
          {cookieConsent === null && (
            <div className="trionn-cookie-pill">
              <span className="trionn-cookie-text">
                WE USE COOKIES TO ENHANCE YOUR EXPERIENCE.
              </span>
              <div className="trionn-cookie-actions">
                <button
                  onClick={handleCookieDecline}
                  className="trionn-cookie-btn"
                  type="button"
                >
                  DECLINE
                </button>
                <button
                  onClick={handleCookieAccept}
                  className="trionn-cookie-btn trionn-cookie-btn-active"
                  type="button"
                >
                  ACCEPT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Strip: Legal, Cryptographic Stamp & Back-to-Top ── */}
        <div className="trionn-footer-bottom-bar">
          <div className="trionn-bottom-left">
            <span className="trionn-legal-text">
              © {new Date().getFullYear()} AEGIS. ALL RIGHTS RESERVED.
            </span>
          </div>

          {/* 3D Gyroscopic Atom Orbital Sphere */}
          <div className="trionn-bottom-center">
            <div className="footer-hatom-orbit-sphere" aria-hidden="true">
              <div className="orbit-ring ring-1"></div>
              <div className="orbit-ring ring-1"></div>
              <div className="orbit-ring ring-2"></div>
              <div className="orbit-ring ring-2"></div>
              <div className="orbit-ring ring-2"></div>
              <div className="orbit-ring ring-3"></div>
              <div className="orbit-ring ring-3"></div>
              <div className="orbit-core"></div>
            </div>
          </div>

          <div className="trionn-bottom-right">
            <a
              href="https://github.com/Swatantra-66/aegis"
              target="_blank"
              rel="noopener noreferrer"
              className="trionn-github-link"
              aria-label="GitHub Repository"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span className="github-text">Github</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
