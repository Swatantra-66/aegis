import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import AegisAuthBanner from '../components/AegisAuthBanner';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="aegis-split-auth-wrapper">
      {/* Left Form Side */}
      <div className="aegis-auth-form-side">
        <div className="aegis-auth-form-card">
          {success ? (
            <div className="aegis-form-header" style={{ textAlign: 'left' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <h1 className="aegis-auth-heading">Check Your Inbox</h1>
              <p className="aegis-auth-subheading" style={{ marginTop: '0.75rem', lineHeight: '1.6' }}>
                If an account with <strong style={{ color: '#111827' }}>{email}</strong> exists in our directory, a cryptographically signed password recovery link has been dispatched to your inbox.
              </p>

              <div style={{ marginTop: '2.5rem' }}>
                <Link to="/login" className="aegis-primary-btn" style={{ textDecoration: 'none' }}>
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="aegis-form-header">
                <h1 className="aegis-auth-heading">Reset Password</h1>
                <p className="aegis-auth-subheading">
                  Enter your email address to receive a secure password recovery token
                </p>
              </div>

              {error && (
                <div className="aegis-auth-alert-error" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="aegis-modern-form">
                <div className="aegis-form-field">
                  <label htmlFor="recovery-email" className="aegis-field-label">
                    Email address
                  </label>
                  <div className="aegis-field-input-wrap">
                    <input
                      id="recovery-email"
                      type="email"
                      className="aegis-field-input"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="aegis-primary-btn"
                  disabled={isLoading}
                  style={{ marginTop: '0.75rem' }}
                >
                  {isLoading ? (
                    <span className="aegis-btn-loading-content">
                      <span className="aegis-inline-spinner" />
                      Dispatching Link...
                    </span>
                  ) : (
                    'Send Recovery Link'
                  )}
                </button>
              </form>

              <div className="aegis-auth-bottom-row" style={{ marginTop: '2.5rem' }}>
                <Link to="/login" className="aegis-auth-switch-link" style={{ color: '#4b5563', fontWeight: 500 }}>
                  ← Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Visual Banner Side */}
      <AegisAuthBanner variant="recovery" />
    </div>
  );
};

export default ForgotPassword;
