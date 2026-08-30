import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import AegisAuthBanner from '../components/AegisAuthBanner';

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Clear errors when entering or leaving page
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const displayError = formError || error;

  // Auto-dismiss error after 6 seconds
  useEffect(() => {
    if (displayError) {
      const timer = setTimeout(() => {
        setFormError('');
        clearError();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [displayError, clearError]);

  const handleInputChange = (setter) => (e) => {
    if (displayError) {
      setFormError('');
      clearError();
    }
    setter(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    // Split name into first and last name cleanly
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    try {
      await register({
        email,
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch {
      // Error is set in store and displayed
    }
  };

  return (
    <div className="aegis-split-auth-wrapper">
      {/* Left Form Container (White Modern Form) */}
      <div className="aegis-auth-form-side">
        <div className="aegis-auth-form-card">
          <div className="aegis-form-header">
            <h1 className="aegis-auth-heading">Get Started Now</h1>
            <p className="aegis-auth-subheading">
              Create your account to access enterprise identity governance
            </p>
          </div>

          {displayError && (
            <div className="aegis-auth-alert-error" role="alert">
              <span className="aegis-alert-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="aegis-modern-form">
            {/* Full Name */}
            <div className="aegis-form-field">
              <label htmlFor="reg-name" className="aegis-field-label">
                Name
              </label>
              <div className="aegis-field-input-wrap">
                <input
                  id="reg-name"
                  type="text"
                  className="aegis-field-input"
                  placeholder="Enter your name"
                  value={name}
                  onChange={handleInputChange(setName)}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="aegis-form-field">
              <label htmlFor="reg-email" className="aegis-field-label">
                Email address
              </label>
              <div className="aegis-field-input-wrap">
                <input
                  id="reg-email"
                  type="email"
                  className="aegis-field-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleInputChange(setEmail)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="aegis-form-field">
              <label htmlFor="reg-password" className="aegis-field-label">
                Password
              </label>
              <div className="aegis-field-input-wrap">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="aegis-field-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={handleInputChange(setPassword)}
                  required
                  minLength={8}
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
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem', lineHeight: '1.4' }}>
                Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol (!@#$%^&*).
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              className="aegis-primary-btn"
              disabled={isLoading}
              style={{ marginTop: '0.6rem' }}
            >
              {isLoading ? (
                <span className="aegis-btn-loading-content">
                  <span className="aegis-inline-spinner" />
                  Creating Account...
                </span>
              ) : (
                'Signup'
              )}
            </button>
          </form>

          {/* Footer Switch Link */}
          <div className="aegis-auth-bottom-row" style={{ marginTop: '2rem' }}>
            Have an account?{' '}
            <Link to="/login" className="aegis-auth-switch-link">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Right Visual Banner Side (Aegis Signature Graphic) */}
      <AegisAuthBanner variant="register" />
    </div>
  );
};

export default Register;
