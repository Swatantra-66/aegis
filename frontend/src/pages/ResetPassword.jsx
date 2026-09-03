import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import AegisAuthBanner from '../components/AegisAuthBanner';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="aegis-split-auth-wrapper">
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

              <h1 className="aegis-auth-heading">Password Updated</h1>
              <p className="aegis-auth-subheading" style={{ marginTop: '0.75rem', lineHeight: '1.6' }}>
                Your credentials have been securely hashed with Argon2id. Previous sessions have been revoked.
              </p>

              <div style={{ marginTop: '2.5rem' }}>
                <Link to="/login" className="aegis-primary-btn" style={{ textDecoration: 'none' }}>
                  Sign In with New Password →
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="aegis-form-header">
                <h1 className="aegis-auth-heading">Set New Password</h1>
                <p className="aegis-auth-subheading">
                  Create a secure password with at least 8 characters
                </p>
              </div>

              {error && (
                <div className="aegis-auth-alert-error" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="aegis-modern-form">
                <div className="aegis-form-field">
                  <label htmlFor="new-password" className="aegis-field-label">
                    New Password
                  </label>
                  <div className="aegis-field-input-wrap">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      className="aegis-field-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="aegis-input-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="aegis-form-field">
                  <label htmlFor="confirm-new-password" className="aegis-field-label">
                    Confirm Password
                  </label>
                  <div className="aegis-field-input-wrap">
                    <input
                      id="confirm-new-password"
                      type={showPassword ? 'text' : 'password'}
                      className="aegis-field-input"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
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
                      Updating Password...
                    </span>
                  ) : (
                    'Save New Password'
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

export default ResetPassword;
