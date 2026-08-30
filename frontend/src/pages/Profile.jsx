import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';

const Profile = () => {
  const queryClient = useQueryClient();
  const { fetchUser } = useAuthStore();
  const containerRef = useRef(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

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
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.06,
        ease: 'power3.out',
        clearProps: 'all',
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
      setActionSuccess('Details saved successfully');
      setTimeout(() => setActionSuccess(''), 3000);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const [devVerifyToken, setDevVerifyToken] = useState('');

  const sendVerificationMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/send-verification-email');
      return data;
    },
    onSuccess: (data) => {
      setActionSuccess('Verification email dispatched!');
      if (data.data?.verification_token) {
        setDevVerifyToken(data.data.verification_token);
      }
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="sirnik-page">
        <div className="font-mono text-muted py-4">LOADING PROFILE...</div>
      </div>
    );
  }

  return (
    <div className="sirnik-page" ref={containerRef}>
      {actionSuccess && <div className="sirnik-toast">{actionSuccess}</div>}
      {actionError && <div className="sirnik-toast" style={{ background: '#ef4444', color: '#fff' }}>{actionError}</div>}

      <div className="sirnik-page-header sirnik-anim">
        <span className="sirnik-page-number">05 · IDENTITY GOVERNANCE PROFILE</span>
        <h1 className="sirnik-page-title">
          Security &<br />Profile.
        </h1>
        <p className="mt-md" style={{ maxWidth: '460px' }}>
          Personal credentials, TOTP authenticator status, and role permission grants.
        </p>
      </div>

      <div className="sirnik-grid-2 sirnik-anim">
        {/* Personal Details */}
        <div>
          <span className="sirnik-meta block mb-lg">PERSONAL DETAILS</span>
          <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate({ first_name: firstName, last_name: lastName }); }}>
            <div className="sirnik-input-group">
              <label className="sirnik-label">WORK EMAIL</label>
              <input type="email" className="sirnik-input text-muted" value={profileUser?.email || ''} disabled style={{ cursor: 'not-allowed' }} />
            </div>

            <div className="sirnik-input-group">
              <label className="sirnik-label">FIRST NAME</label>
              <input type="text" className="sirnik-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>

            <div className="sirnik-input-group">
              <label className="sirnik-label">LAST NAME</label>
              <input type="text" className="sirnik-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>

            <div className="flex justify-between items-center mt-xl pt-md" style={{ borderTop: '1px solid var(--line)' }}>
              <div>
                <span className="sirnik-meta block mb-xs">ROLES</span>
                <div className="flex gap-xs">
                  {profileUser?.roles?.map((r, i) => (
                    <span key={i} className="sirnik-tag">{r.name}</span>
                  ))}
                </div>
              </div>
              <button type="submit" className="sirnik-btn-solid">SAVE DETAILS</button>
            </div>
          </form>
        </div>

        {/* Security & Trust Management */}
        <div>
          {/* Email Verification Card */}
          <span className="sirnik-meta block mb-lg">IDENTITY VERIFICATION TIER</span>
          <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '1.75rem', marginBottom: '1.75rem' }}>
            <div className="flex justify-between items-center mb-sm">
              <h3>Email Verification</h3>
              <span
                className={`sirnik-tag ${profileUser?.is_email_verified ? 'sirnik-tag-success' : ''}`}
                style={!profileUser?.is_email_verified ? { background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' } : {}}
              >
                {profileUser?.is_email_verified ? 'VERIFIED' : 'UNVERIFIED'}
              </span>
            </div>
            <p className="mb-md text-sm text-muted" style={{ lineHeight: '1.55' }}>
              {profileUser?.is_email_verified
                ? 'Your email address is cryptographically verified with full audit provenance.'
                : 'Confirm your email address to unlock full zero-trust tier credentials and verified audit badges.'}
            </p>

            {!profileUser?.is_email_verified && (
              <div className="flex flex-col gap-sm">
                <button
                  type="button"
                  onClick={() => sendVerificationMutation.mutate()}
                  disabled={sendVerificationMutation.isPending}
                  className="sirnik-btn-solid"
                  style={{ width: 'fit-content', fontSize: '0.8rem', padding: '8px 18px' }}
                >
                  {sendVerificationMutation.isPending ? 'DISPATCHING...' : 'SEND VERIFICATION LINK'}
                </button>

                {devVerifyToken && (
                  <div className="mt-sm p-sm" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <div className="font-mono text-xs text-muted mb-xs">DEV VERIFICATION LINK:</div>
                    <a
                      href={`/verify-email?token=${devVerifyToken}`}
                      className="font-mono text-xs text-accent"
                      style={{ textDecoration: 'underline' }}
                    >
                      Click here to verify email now
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MFA Setup */}
          <span className="sirnik-meta block mb-lg">HARDWARE 2FA PROTECTION</span>
          <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '2rem' }}>
            <div className="flex justify-between items-center mb-md">
              <h3>TOTP Authenticator</h3>
              <span className={`sirnik-tag ${profileUser?.mfa_enabled ? 'sirnik-tag-success' : ''}`}>
                {profileUser?.mfa_enabled ? 'ACTIVATED' : 'NOT ENABLED'}
              </span>
            </div>
            <p className="mb-xl">
              Authenticators (Google Authenticator, Authy, 1Password) generate time-based codes. Secrets are encrypted at rest with AES-256-GCM.
            </p>

            {profileUser?.mfa_enabled ? (
              <Link to="/mfa-disable" className="sirnik-btn text-danger" style={{ padding: 0, textDecoration: 'none' }}>
                <span>DISABLE MFA →</span>
              </Link>
            ) : (
              <Link to="/mfa-setup" className="sirnik-btn-solid w-full text-center block" style={{ textDecoration: 'none' }}>
                SETUP MFA AUTHENTICATOR →
              </Link>
            )}
          </div>

          <div className="mt-xl">
            <span className="sirnik-meta block mb-md">ACTIVE PERMISSION GRANTS</span>
            <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
              {profileUser?.permissions?.map((p, i) => (
                <span key={i} className="sirnik-tag font-mono">{p.name || p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
