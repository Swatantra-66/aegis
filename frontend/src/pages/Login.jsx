import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import AegisAuthBanner from '../components/AegisAuthBanner';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError, mfaRequired } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (mfaRequired) navigate('/mfa', { replace: true });
  }, [mfaRequired, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="aegis-split-auth-wrapper">
      {/* Left Form Container (White Modern Form) */}
      <div className="aegis-auth-form-side">
        <div className="aegis-auth-form-card">
          <div className="aegis-form-header">
            <h1 className="aegis-auth-heading">Welcome Back</h1>
            <p className="aegis-auth-subheading">
              Enter your credentials to access your Aegis governed portal
            </p>
          </div>

          {error && (
            <div className="aegis-auth-alert-error" role="alert">
              <span className="aegis-alert-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="aegis-modern-form">
            {/* Email Address */}
            <div className="aegis-form-field">
              <label htmlFor="login-email" className="aegis-field-label">
                Email address
              </label>
              <div className="aegis-field-input-wrap">
                <input
                  id="login-email"
                  type="email"
                  className="aegis-field-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="aegis-form-field">
              <label htmlFor="login-password" className="aegis-field-label">
                Password
              </label>
              <div className="aegis-field-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="aegis-field-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            {/* Remember Me & Forgot Password Row */}
            <div className="aegis-auth-options-row">
              <label className="aegis-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="aegis-checkbox-custom"
                />
                <span>Remember for 30 days</span>
              </label>

              <Link to="/forgot-password" className="aegis-forgot-link">
                Forgot password?
              </Link>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              className="aegis-primary-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="aegis-btn-loading-content">
                  <span className="aegis-inline-spinner" />
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer Switch Link */}
          <div className="aegis-auth-bottom-row" style={{ marginTop: '2rem' }}>
            Don't have an account?{' '}
            <Link to="/register" className="aegis-auth-switch-link">
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      {/* Right Visual Banner Side (Aegis Signature Graphic) */}
      <AegisAuthBanner variant="login" />
    </div>
  );
};

export default Login;
