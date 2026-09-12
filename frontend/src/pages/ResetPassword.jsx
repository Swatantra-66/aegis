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

  // Real-time password complexity checks
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-+=~/`\\[\]]/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const isPasswordValid = hasMinLength && hasNumber && hasSymbol && hasMixedCase;
  const isConfirmValid = Boolean(confirmPassword) && password === confirmPassword;
  const canSubmit = isPasswordValid && isConfirmValid && !isLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!hasMinLength) {
        setError('Password must be at least 8 characters long');
      } else if (!hasNumber && !hasSymbol) {
        setError('Password must contain numbers and special symbols (!@#$%^&*) along with letters');
      } else if (!hasNumber) {
        setError('Password must contain at least one number (0-9)');
      } else if (!hasSymbol) {
        setError('Password must contain at least one special symbol (!@#$%^&*)');
      } else if (!hasMixedCase) {
        setError('Password must contain both uppercase and lowercase letters');
      } else if (!isConfirmValid) {
        setError('Passwords do not match.');
      }
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
              <img
                src="/aegis-logo-new.png"
                alt="Aegis"
                style={{
                  width: '38px',
                  height: 'auto',
                  display: 'block',
                  marginBottom: '1.25rem',
                }}
              />

              <h1 className="aegis-auth-heading">Password Updated</h1>
              <p className="aegis-auth-subheading" style={{ marginTop: '0.6rem', lineHeight: '1.6', color: '#4b5563' }}>
                Your credentials have been securely updated with Argon2id and previous sessions have been revoked. If Two-Factor Authentication is enabled, you will enter your TOTP code upon signing in.
              </p>

              <div style={{ marginTop: '2rem' }}>
                <Link to="/login" className="aegis-primary-btn" style={{ textDecoration: 'none' }}>
                  Sign In with New Password
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="aegis-form-header">
                <h1 className="aegis-auth-heading">Set New Password</h1>
                <p className="aegis-auth-subheading">
                  Create a secure password with numbers, symbols, and at least 8 characters
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
                      onChange={(e) => {
                        setError('');
                        setPassword(e.target.value);
                      }}
                      required
                      minLength={8}
                      autoFocus
                      aria-describedby={password.length > 0 ? 'password-criteria' : undefined}
                    />
                    <button
                      type="button"
                      className="aegis-input-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Real-time Complexity Requirements Grid */}
                  {password.length > 0 && (
                    <div id="password-criteria" className="aegis-pwd-criteria-grid" aria-live="polite">
                      <div className={`aegis-pwd-criterion ${hasMinLength ? 'met' : ''}`}>
                        <span className="aegis-pwd-criterion-icon" aria-hidden="true">
                          {hasMinLength ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="7" />
                            </svg>
                          )}
                        </span>
                        <span>8+ characters</span>
                        <span className="sr-only"> ({hasMinLength ? 'met' : 'not met'})</span>
                      </div>

                      <div className={`aegis-pwd-criterion ${hasNumber ? 'met' : ''}`}>
                        <span className="aegis-pwd-criterion-icon" aria-hidden="true">
                          {hasNumber ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="7" />
                            </svg>
                          )}
                        </span>
                        <span>At least 1 number</span>
                        <span className="sr-only"> ({hasNumber ? 'met' : 'not met'})</span>
                      </div>

                      <div className={`aegis-pwd-criterion ${hasSymbol ? 'met' : ''}`}>
                        <span className="aegis-pwd-criterion-icon" aria-hidden="true">
                          {hasSymbol ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="7" />
                            </svg>
                          )}
                        </span>
                        <span>Special symbol (!@#$)</span>
                        <span className="sr-only"> ({hasSymbol ? 'met' : 'not met'})</span>
                      </div>

                      <div className={`aegis-pwd-criterion ${hasMixedCase ? 'met' : ''}`}>
                        <span className="aegis-pwd-criterion-icon" aria-hidden="true">
                          {hasMixedCase ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="7" />
                            </svg>
                          )}
                        </span>
                        <span>Upper & lowercase</span>
                        <span className="sr-only"> ({hasMixedCase ? 'met' : 'not met'})</span>
                      </div>
                    </div>
                  )}
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
                      onChange={(e) => {
                        setError('');
                        setConfirmPassword(e.target.value);
                      }}
                      required
                      minLength={8}
                    />
                  </div>
                  {confirmPassword.length > 0 && (
                    confirmPassword !== password ? (
                      <div className="aegis-match-indicator mismatch">
                        <span>Passwords do not match</span>
                      </div>
                    ) : (
                      <div className="aegis-match-indicator match">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Passwords match</span>
                      </div>
                    )
                  )}
                </div>

                <button
                  type="submit"
                  className="aegis-primary-btn"
                  disabled={!canSubmit}
                  style={{ marginTop: '0.75rem' }}
                >
                  {isLoading ? (
                    <span className="aegis-btn-loading-content">
                      <span className="aegis-inline-spinner" />
                      Resetting Password...
                    </span>
                  ) : (
                    'Reset Password'
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

export default ResetPassword;
