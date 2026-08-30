import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token was provided in the URL.');
      return;
    }

    const verify = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        if (isAuthenticated) {
          fetchUser();
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(getErrorMessage(err));
      }
    };

    verify();
  }, [token, isAuthenticated, fetchUser]);

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
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#28441f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <span className="aegis-inline-spinner" style={{ width: '22px', height: '22px', borderTopColor: '#28441f' }} />
              </div>
              <h1 className="aegis-auth-heading">Verifying Email...</h1>
              <p className="aegis-auth-subheading">
                Cryptographically validating your verification token.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="aegis-form-header">
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <h1 className="aegis-auth-heading">Email Verified!</h1>
              <p className="aegis-auth-subheading" style={{ marginTop: '0.75rem', lineHeight: '1.6' }}>
                Your email address has been cryptographically confirmed and your identity status is now <strong>Active & Verified</strong>.
              </p>

              <div style={{ marginTop: '2.5rem' }}>
                <Link
                  to={isAuthenticated ? '/profile' : '/login'}
                  className="aegis-primary-btn"
                  style={{ textDecoration: 'none' }}
                >
                  {isAuthenticated ? 'Go to Profile →' : 'Proceed to Sign In →'}
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
                  borderRadius: '14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>

              <h1 className="aegis-auth-heading">Verification Failed</h1>
              <p className="aegis-auth-subheading" style={{ marginTop: '0.75rem', color: '#b91c1c' }}>
                {errorMsg || 'The verification link is invalid or has expired.'}
              </p>

              <div style={{ marginTop: '2.5rem' }}>
                <Link
                  to={isAuthenticated ? '/profile' : '/login'}
                  className="aegis-primary-btn"
                  style={{ textDecoration: 'none' }}
                >
                  {isAuthenticated ? 'Return to Security Profile' : 'Back to Sign In'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Banner Side */}
      <AegisAuthBanner variant="login" />
    </div>
  );
};

export default VerifyEmail;
