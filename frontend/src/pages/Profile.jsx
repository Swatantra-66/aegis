import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';

// SVG Padlock Icon
const LockIcon = ({ size = 11, color = 'var(--text-muted)' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.35rem' }}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// SVG Shield Check Icon
const ShieldCheckIcon = ({ size = 13, color = '#ffffff' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.4rem' }}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const Profile = () => {
  const queryClient = useQueryClient();
  const { fetchUser } = useAuthStore();
  const containerRef = useRef(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [devVerifyToken, setDevVerifyToken] = useState('');

  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data.data.user;
    },
  });

  useEffect(() => {
    if (profileUser) {
      setFirstName(profileUser.first_name || '');
      setLastName(profileUser.last_name || '');
    }
  }, [profileUser]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.sirnik-anim', {
        y: 24,
        opacity: 0,
        duration: 0.7,
        stagger: 0.05,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });
    }, containerRef);

    return () => ctx.revert();
  }, [profileUser]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updateData) => {
      const { data } = await api.patch(`/users/${profileUser.id}`, updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      fetchUser();
      setIsEditing(false);
      setActionSuccess('Identity profile attributes saved');
      setTimeout(() => setActionSuccess(''), 3500);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const sendVerificationMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/send-verification-email');
      return data;
    },
    onSuccess: (data) => {
      setActionSuccess('Verification link dispatched to email');
      if (data.data?.verification_token) {
        setDevVerifyToken(data.data.verification_token);
      }
      setTimeout(() => setActionSuccess(''), 4500);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const primaryRole = useMemo(() => {
    if (!profileUser?.roles || profileUser.roles.length === 0) return 'USER';
    const roleNames = profileUser.roles.map((r) => (typeof r === 'string' ? r : r.name || '')).filter(Boolean);
    if (roleNames.some((r) => r.toLowerCase().includes('super_admin') || r.toLowerCase().includes('superadmin'))) {
      return 'SUPER_ADMIN';
    }
    if (roleNames.some((r) => r.toLowerCase().includes('admin'))) {
      return 'ADMIN';
    }
    return roleNames[0]?.toUpperCase() || 'USER';
  }, [profileUser]);

  if (isLoading) {
    return (
      <div className="sirnik-page sirnik-grid-bg">
        <div className="font-mono text-muted py-6 text-xs text-center">LOADING IDENTITY PROFILE</div>
      </div>
    );
  }

  return (
    <div className="sirnik-page sirnik-grid-bg" ref={containerRef}>
      {actionSuccess && <div className="sirnik-toast">{actionSuccess}</div>}
      {actionError && <div className="sirnik-toast" style={{ background: '#ef4444', color: '#fff' }}>{actionError}</div>}

      {/* ── Page Header & Security Telemetry Status ── */}
      <div className="sirnik-page-header sirnik-anim" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div className="flex justify-between items-start flex-wrap gap-md">
          <div>
            <span className="sirnik-page-number">IDENTITY GOVERNANCE PROFILE</span>
            <h1 className="sirnik-page-title">
              Profile & Security
            </h1>
            <p className="mt-md" style={{ maxWidth: '480px' }}>
              Personal identity credentials, TOTP multi-factor authentication status, and active RBAC authorization scopes.
            </p>
          </div>

          {/* Right Side: Identity Security Telemetry Box */}
          <div className="flex flex-col items-end gap-md">
            <div
              className="sirnik-meta"
              style={{
                border: '1px solid var(--line-strong)',
                background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(12px)',
                padding: '0.85rem 1.4rem',
                borderRadius: '2px',
                minWidth: '240px',
              }}
            >
              <div style={{ color: '#ffffff', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                SECURITY POSTURE
              </div>
              <div className="font-mono text-xs" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>IDENTITY TIER:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>{primaryRole}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ENCRYPTION:</span>
                  <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>AES-256-GCM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>2FA AUTHENTICATOR:</span>
                  <span style={{ color: profileUser?.mfa_enabled ? 'var(--text-white)' : 'var(--text-muted)', fontWeight: 600 }}>
                    {profileUser?.mfa_enabled ? 'ACTIVATED' : 'NOT ENABLED'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>EMAIL AUDIT:</span>
                  <span style={{ color: profileUser?.is_email_verified ? 'var(--text-white)' : '#eab308', fontWeight: 600 }}>
                    {profileUser?.is_email_verified ? 'VERIFIED' : 'UNVERIFIED'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Symmetrical Two-Column Layout ── */}
      <div
        className="sirnik-anim"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* ── Left Column: Identity Attributes & Cryptographic Posture ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Card 1: Identity Attributes */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.75rem 2rem',
              borderRadius: '2px',
            }}
          >
            <div className="flex justify-between items-center mb-lg" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.65rem' }}>
              <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
                IDENTITY ATTRIBUTES
              </span>
              <span className="font-mono text-xs" style={{ color: isEditing ? 'var(--text-white)' : 'var(--text-muted)' }}>
                {isEditing ? '[WRITE ACTIVE]' : '[READ ONLY]'}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isEditing) {
                  updateProfileMutation.mutate({
                    first_name: firstName,
                    last_name: lastName,
                  });
                }
              }}
            >
              {/* Primary Work Email */}
              <div className="sirnik-input-group mb-md">
                <div className="flex justify-between items-center mb-xs">
                  <label className="sirnik-label" style={{ fontSize: '0.66rem', letterSpacing: '0.06em', margin: 0 }}>
                    PRIMARY WORK EMAIL
                  </label>
                  <span className="font-mono text-muted" style={{ fontSize: '0.62rem' }}>
                    <LockIcon size={10} /> AUDIT BOUND
                  </span>
                </div>
                <input
                  type="email"
                  className="sirnik-input font-mono"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--line-strong)',
                    background: 'rgba(255, 255, 255, 0.015)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    cursor: 'not-allowed',
                  }}
                  value={profileUser?.email || ''}
                  disabled
                />
              </div>

              {/* First Name & Last Name (Side by Side 2-Column Grid) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="mb-lg">
                <div className="sirnik-input-group">
                  <label className="sirnik-label" style={{ fontSize: '0.66rem', letterSpacing: '0.06em' }}>
                    FIRST NAME
                  </label>
                  <input
                    type="text"
                    className="sirnik-input"
                    disabled={!isEditing}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: `1px solid ${isEditing ? '#ffffff' : 'var(--line-strong)'}`,
                      background: isEditing ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.015)',
                      fontSize: '0.8rem',
                      color: isEditing ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                      cursor: isEditing ? 'text' : 'not-allowed',
                    }}
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <div className="sirnik-input-group">
                  <label className="sirnik-label" style={{ fontSize: '0.66rem', letterSpacing: '0.06em' }}>
                    LAST NAME
                  </label>
                  <input
                    type="text"
                    className="sirnik-input"
                    disabled={!isEditing}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: `1px solid ${isEditing ? '#ffffff' : 'var(--line-strong)'}`,
                      background: isEditing ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.015)',
                      fontSize: '0.8rem',
                      color: isEditing ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                      cursor: isEditing ? 'text' : 'not-allowed',
                    }}
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Roles & Save Action Footer */}
              <div className="flex justify-between items-center pt-md flex-wrap gap-md" style={{ borderTop: '1px solid var(--line)' }}>
                <div>
                  <span className="sirnik-label" style={{ fontSize: '0.64rem', marginBottom: '0.35rem', display: 'block' }}>
                    ASSIGNED RBAC ROLES
                  </span>
                  <div className="flex gap-xs flex-wrap">
                    {profileUser?.roles?.map((r, i) => (
                      <span
                        key={i}
                        className="sirnik-tag font-mono"
                        style={{
                          fontSize: '0.62rem',
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          background: 'rgba(255, 255, 255, 0.03)',
                        }}
                      >
                        {typeof r === 'string' ? r : r.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Edit / Save Action Switch */}
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="sirnik-action-box-btn"
                    style={{
                      fontSize: '0.74rem',
                      padding: '0.5rem 1.1rem',
                      color: '#ffffff',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      fontWeight: 700,
                    }}
                  >
                    EDIT DETAILS
                  </button>
                ) : (
                  <div className="flex gap-sm items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setFirstName(profileUser?.first_name || '');
                        setLastName(profileUser?.last_name || '');
                        setIsEditing(false);
                      }}
                      className="sirnik-action-box-btn"
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.5rem 0.85rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="sirnik-action-box-btn"
                      style={{
                        fontSize: '0.74rem',
                        padding: '0.5rem 1.1rem',
                        color: '#ffffff',
                        borderColor: '#ffffff',
                        background: 'rgba(255, 255, 255, 0.1)',
                        fontWeight: 700,
                      }}
                    >
                      {updateProfileMutation.isPending ? 'SAVING' : 'SAVE DETAILS'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Card 2: Cryptographic Posture */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.75rem 2rem',
              borderRadius: '2px',
            }}
          >
            <div className="flex justify-between items-center mb-md" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.65rem' }}>
              <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
                ZERO-TRUST CRYPTOGRAPHIC POSTURE
              </span>
              <span className="font-mono text-xs text-muted">[SECURITY STACK]</span>
            </div>

            <div className="font-mono text-xs" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.45rem' }}>
                <span>PASSWORD HASHING:</span>
                <span
                  style={{
                    fontSize: '0.64rem',
                    padding: '0.2rem 0.45rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.015)',
                    color: 'rgba(255, 255, 255, 0.85)',
                    letterSpacing: '0.04em',
                  }}
                >
                  ARGON2ID (M:64MB, T:3, P:4)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.45rem' }}>
                <span>MFA SECRETS AT REST:</span>
                <span
                  style={{
                    fontSize: '0.64rem',
                    padding: '0.2rem 0.45rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.015)',
                    color: 'rgba(255, 255, 255, 0.85)',
                    letterSpacing: '0.04em',
                  }}
                >
                  AES-256-GCM (12-BYTE IVS)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.45rem' }}>
                <span>SESSION ROTATION:</span>
                <span
                  style={{
                    fontSize: '0.64rem',
                    padding: '0.2rem 0.45rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.015)',
                    color: 'rgba(255, 255, 255, 0.85)',
                    letterSpacing: '0.04em',
                  }}
                >
                  FAMILY RTR + REDIS BLACKLIST
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>AUDIT CHAIN PROVENANCE:</span>
                <span
                  style={{
                    fontSize: '0.64rem',
                    padding: '0.2rem 0.45rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.015)',
                    color: 'rgba(255, 255, 255, 0.85)',
                    letterSpacing: '0.04em',
                  }}
                >
                  SHA-256 MERKLE LEDGER
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Multi-Factor Hardening & Authorization Grants ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Card 3: Security & 2FA Protection */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.75rem 2rem',
              borderRadius: '2px',
            }}
          >
            {/* Section A: Email Verification */}
            <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="flex justify-between items-center mb-xs">
                <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.66rem' }}>
                  IDENTITY VERIFICATION TIER
                </span>
                <span
                  className="sirnik-tag"
                  style={{
                    fontSize: '0.62rem',
                    borderColor: profileUser?.is_email_verified ? 'rgba(255, 255, 255, 0.3)' : 'rgba(234, 179, 8, 0.4)',
                    color: profileUser?.is_email_verified ? '#ffffff' : '#eab308',
                    background: profileUser?.is_email_verified ? 'rgba(255, 255, 255, 0.04)' : 'rgba(234, 179, 8, 0.08)',
                  }}
                >
                  {profileUser?.is_email_verified ? 'VERIFIED' : 'UNVERIFIED'}
                </span>
              </div>

              <h3 style={{ margin: '0.2rem 0 0.35rem', fontWeight: 800, fontSize: '1.1rem', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Email Verification
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {profileUser?.is_email_verified
                  ? 'Your email address is cryptographically verified with full audit provenance.'
                  : 'Confirm your email address to unlock full zero-trust tier credentials and verified audit badges.'}
              </p>

              {!profileUser?.is_email_verified && (
                <div>
                  <button
                    type="button"
                    onClick={() => sendVerificationMutation.mutate()}
                    disabled={sendVerificationMutation.isPending}
                    className="sirnik-action-box-btn"
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.45rem 1rem',
                      color: '#ffffff',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      fontWeight: 700,
                    }}
                  >
                    {sendVerificationMutation.isPending ? 'DISPATCHING...' : 'SEND VERIFICATION LINK'}
                  </button>

                  {devVerifyToken && (
                    <div
                      className="mt-sm p-sm"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '2px',
                        border: '1px solid var(--line-strong)',
                      }}
                    >
                      <div className="font-mono text-xs text-muted mb-xs" style={{ fontSize: '0.64rem' }}>
                        DEV VERIFICATION LINK:
                      </div>
                      <a
                        href={`/verify-email?token=${devVerifyToken}`}
                        className="font-mono text-xs"
                        style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Click here to verify email now
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section B: TOTP Authenticator 2FA */}
            <div>
              <div className="flex justify-between items-center mb-xs">
                <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.66rem' }}>
                  2FA PROTECTION
                </span>
                <span
                  className="sirnik-tag"
                  style={{
                    fontSize: '0.62rem',
                    borderColor: profileUser?.mfa_enabled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    color: profileUser?.mfa_enabled ? '#ffffff' : 'var(--text-muted)',
                    background: profileUser?.mfa_enabled ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                  }}
                >
                  {profileUser?.mfa_enabled ? 'ACTIVATED' : 'NOT ENABLED'}
                </span>
              </div>

              <h3 style={{ margin: '0.2rem 0 0.35rem', fontWeight: 800, fontSize: '1.1rem', color: '#ffffff', letterSpacing: '-0.01em' }}>
                TOTP Authenticator
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Authenticators generate time-based one-time codes. TOTP secret keys are encrypted at rest with AES-256-GCM.
              </p>

              {profileUser?.mfa_enabled ? (
                <Link
                  to="/mfa-disable"
                  className="sirnik-action-box-btn inline-block text-center"
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.45rem 1rem',
                    color: 'var(--danger)',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    background: 'rgba(239, 68, 68, 0.04)',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  DISABLE 2FA AUTHENTICATOR
                </Link>
              ) : (
                <Link
                  to="/mfa-setup"
                  className="sirnik-action-box-btn inline-block text-center"
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.45rem 1rem',
                    color: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  CONFIGURE TOTP 2FA
                </Link>
              )}
            </div>
          </div>

          {/* Card 4: Active Authorization Scopes */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.75rem 2rem',
              borderRadius: '2px',
            }}
          >
            <div className="flex justify-between items-center mb-md" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0.65rem' }}>
              <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.68rem' }}>
                ACTIVE PERMISSION SCOPES
              </span>
              <span className="font-mono text-xs text-muted">[{profileUser?.permissions?.length || 0} CAPABILITIES]</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.45rem' }}>
              {profileUser?.permissions?.map((p, i) => {
                const permName = typeof p === 'string' ? p : p.name || 'capability';
                return (
                  <div
                    key={i}
                    className="font-mono text-xs"
                    style={{
                      fontSize: '0.64rem',
                      padding: '0.35rem 0.55rem',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'rgba(255, 255, 255, 0.015)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={permName}
                  >
                    {permName}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
