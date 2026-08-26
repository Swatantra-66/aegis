import React from 'react';

const SECURITY_METRICS = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    label: "Zero-Trust Active",
    sub: "MFA & RBAC Enforced",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    label: "Argon2id Hashed",
    sub: "JWT Session Guard",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    ),
    label: "SHA-256 Audit Trail",
    sub: "Tamper-Evident Chain",
  },
];

const CARD_SHEEN =
  "radial-gradient(120% 100% at 0% 50%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%), linear-gradient(135deg, rgba(20, 20, 25, 0.7) 0%, rgba(10, 10, 15, 0.85) 100%)";

export const RecommendationCard = () => (
  <div
    className="section26-recom-card"
    style={{ backgroundImage: CARD_SHEEN }}
  >
    {/* Top Header Row */}
    <div className="section26-card-header">
      <div className="section26-card-icon-badge">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <div className="section26-card-title-group">
        <p className="section26-card-title">
          Security Posture
        </p>
        <span className="section26-card-status">
          <span className="section26-card-dot" />
          LIVE & ENFORCED
        </span>
      </div>
    </div>

    {/* Metric Items */}
    <ul className="section26-card-list">
      {SECURITY_METRICS.map((item, idx) => (
        <li key={idx} className="section26-card-item">
          <div className="section26-card-item-icon">{item.icon}</div>
          <div className="section26-card-item-text">
            <span className="section26-card-item-label">{item.label}</span>
            <span className="section26-card-item-sub">{item.sub}</span>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

export default RecommendationCard;
