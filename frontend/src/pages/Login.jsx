import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError, mfaRequired } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
      // Error handled by authStore
    }
  };

  return (
    <div className="okaydev-auth-container">
      {/* Top Navbar with AEGIS Branding */}
      <header className="okaydev-navbar">
        <div className="okaydev-nav-inner">
          <Link to="/" className="okaydev-brand">
            <span className="brand-char">A</span>
            <span className="brand-char">E</span>
            <span className="brand-char">G</span>
            <span className="brand-char">I</span>
            <span className="brand-char">S</span>
          </Link>

          <nav className="okaydev-nav-links">
            <Link to="/dashboard">OVERVIEW</Link>
            <Link to="/users">IDENTITY</Link>
            <Link to="/profile">SECURITY</Link>
            <Link to="/sdlc">SDLC STAGING</Link>
          </nav>

          <div className="okaydev-nav-auth">
            <Link to="/login" className="okaydev-link-login" style={{ opacity: 1, textDecoration: 'underline' }}>
              LOGIN
            </Link>
            <Link to="/register" className="okaydev-btn-pill">
              SIGN UP →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Card */}
      <div className="okaydev-auth-card">
        <h1 className="okaydev-auth-title">SIGN IN</h1>
        <div className="okaydev-auth-subtitle">
          ACCESS YOUR AEGIS GOVERNED IDENTITY PORTAL · <Link to="/register">NEED AN ACCOUNT?</Link>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
              marginBottom: '1.5rem',
              textAlign: 'left',
            }}
          >
            🚨 {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="okaydev-form">
          <div className="okaydev-input-group">
            <div className="okaydev-label-row">
              <label className="okaydev-label">
                EMAIL <span className="asterisk">*</span>
              </label>
            </div>
            <div className="okaydev-input-wrapper">
              <input
                type="email"
                className="okaydev-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="okaydev-input-group">
            <div className="okaydev-label-row">
              <label className="okaydev-label">
                PASSWORD <span className="asterisk">*</span>
              </label>
              <span className="okaydev-help-icon" title="Min 8 characters">?</span>
            </div>
            <div className="okaydev-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="okaydev-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="okaydev-input-icon"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-md" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <Link to="/forgot-password" style={{ color: 'rgba(255, 255, 255, 0.6)', textDecoration: 'underline' }}>
              FORGOT PASSWORD?
            </Link>
          </div>

          <button type="submit" className="okaydev-submit-btn" disabled={isLoading}>
            {isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
