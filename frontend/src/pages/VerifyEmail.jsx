import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import AegisAuthBanner from '../components/AegisAuthBanner';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { fetchUser, isAuthenticated } = useAuthStore();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No cryptographic verification token was provided in the URL.');
      return;
    }

    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    const verify = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');

        if (isAuthenticated) {
          try {
            await fetchUser();
          } catch (_) {
            // ignore fetch user error
          }
          // Seamless auto-redirect directly to Security Profile
          navigate('/profile?verified=true', { replace: true });
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(getErrorMessage(err));
      }
    };

    verify();
  }, [token, isAuthenticated, fetchUser, navigate]);

  return (
    <div className="aegis-split-auth-wrapper">
      {/* Left Content Side */}
      <div className="aegis-auth-form-side">
        <div className="aegis-auth-form-card" style={{ textAlign: 'left' }}>
          {status === 'verifying' && (
            <div className="aegis-form-header">
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '2px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <span
                  className="aegis-inline-spinner"
                  style={{ width: '20px', height: '20px', borderTopColor: '#00FF66' }}
                />
              </div>
              <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.66rem' }}>
                CRYPTOGRAPHIC VERIFICATION
              </span>
              <h1 className="aegis-auth-heading" style={{ marginTop: '0.25rem' }}>
                Validating Token...
              </h1>
              <p className="aegis-auth-subheading" style={{ color: 'var(--text-muted)' }}>
                Verifying token provenance against SHA-256 hash ledger.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="aegis-form-header">
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '2px',
                  background: 'rgba(0, 255, 102, 0.06)',
                  border: '1px solid rgba(0, 255, 102, 0.3)',
                  color: '#00FF66',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.66rem', color: '#00FF66' }}>
                IDENTITY BADGE UPGRADED
              </span>
              <h1 className="aegis-auth-heading" style={{ marginTop: '0.25rem' }}>
                Email Verified
              </h1>
              <p
                className="aegis-auth-subheading"
                style={{ marginTop: '0.75rem', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.8)' }}
              >
                Your email address has been cryptographically confirmed. Your status is now{' '}
                <strong style={{ color: '#00FF66' }}>Active & Verified</strong>. Redirecting...
              </p>

              <div style={{ marginTop: '2.5rem' }}>
                <Link
                  to={isAuthenticated ? '/profile' : '/login'}
                  className="sirnik-action-box-btn inline-block text-center"
                  style={{
                    textDecoration: 'none',
                    padding: '0.75rem 1.5rem',
                    color: '#000000',
                    background: '#00FF66',
                    border: '1px solid #00FF66',
                    fontWeight: 700,
                  }}
                >
                  {isAuthenticated ? 'Go to Security Profile →' : 'Proceed to Sign In →'}
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="aegis-form-header">
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '2px',
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>

              <span className="sirnik-page-number" style={{ margin: 0, fontSize: '0.66rem', color: '#ef4444' }}>
                TOKEN VALIDATION FAILED
              </span>
              <h1 className="aegis-auth-heading" style={{ marginTop: '0.25rem' }}>
                Verification Error
              </h1>
              <p
                className="aegis-auth-subheading"
                style={{ marginTop: '0.75rem', color: 'rgba(239, 68, 68, 0.9)' }}
              >
                {errorMsg || 'The verification link is invalid or has expired.'}
              </p>

              <div style={{ marginTop: '2.5rem' }}>
                <Link
                  to={isAuthenticated ? '/profile' : '/login'}
                  className="sirnik-action-box-btn inline-block text-center"
                  style={{
                    textDecoration: 'none',
                    padding: '0.75rem 1.5rem',
                    color: '#ffffff',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontWeight: 600,
                  }}
                >
                  {isAuthenticated ? 'Return to Security Profile' : 'Back to Sign In'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Banner Side */}
      <AegisAuthBanner variant="verify" />
    </div>
  );
};

export default VerifyEmail;
