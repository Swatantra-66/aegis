import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import AegisAuthBanner from '../components/AegisAuthBanner';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(15);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res?.data?.data?.expiryMinutes) {
        setExpiryMinutes(res.data.data.expiryMinutes);
      }
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
            <div className="aegis-form-header" style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
              <img
                src="/gmail-icon.png"
                alt="Gmail"
                style={{
                  width: '44px',
                  height: 'auto',
                  display: 'block',
                  margin: '0 auto 1.25rem',
                }}
              />

              <h1 className="aegis-auth-heading">Check Your Inbox</h1>
              <p className="aegis-auth-subheading" style={{ marginTop: '0.6rem', lineHeight: '1.6' }}>
                We sent a password recovery link to <strong style={{ color: '#111827' }}>{email}</strong>. The link expires in <strong style={{ color: '#111827' }}>{expiryMinutes} minutes</strong>.
              </p>

              <div style={{ marginTop: '2rem' }}>
                <Link to="/login" className="aegis-primary-btn" style={{ textDecoration: 'none' }}>
                  Return to Sign In
                </Link>
              </div>

              <div className="aegis-auth-bottom-row" style={{ marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.84rem', color: '#6b7280' }}>
                  Didn't receive the email? Check spam or{' '}
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#28441f',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                      fontFamily: 'inherit',
                    }}
                  >
                    try another email
                  </button>
                </span>
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
                <Link to="/login" className="aegis-auth-back-link">
                  Back to Sign In
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
