import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import ShinyText from '../components/ShinyText';

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    try {
      await register({
        email,
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch {
      // Error handled by store
    }
  };

  const displayError = formError || error;

  return (
    <div className="okaydev-auth-container">
      {/* Top Navbar with AEGIS Branding */}
      <header className="okaydev-navbar">
        <div className="okaydev-nav-inner">
          <Link to="/" className="okaydev-brand" aria-label="AEGIS Home">
            <ShinyText
              text="AEGIS"
              fontSize={28}
              fontWeight={900}
              letterSpacing="0.06em"
              textColor="#000000"
              shadowColor="rgba(0, 0, 0, 0.28)"
              glareColor="rgba(255, 255, 255, 0.95)"
              glareSpeed={1.2}
              glareDirection="left-to-right"
            />
          </Link>

          <nav className="okaydev-nav-links">
            <Link to="/dashboard">OVERVIEW</Link>
            <Link to="/users">IDENTITY</Link>
            <Link to="/profile">SECURITY</Link>
            <Link to="/sdlc">SDLC STAGING</Link>
          </nav>

          <div className="okaydev-nav-auth">
            <Link to="/login" className="okaydev-link-login">
              LOGIN
            </Link>
            <Link to="/register" className="okaydev-btn-pill" style={{ background: '#e2e8f0' }}>
              SIGN UP →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Card */}
      <div className="okaydev-auth-card">
        <h1 className="okaydev-auth-title">SIGN UP</h1>
        <div className="okaydev-auth-subtitle">
          CREATING AN AEGIS ACCOUNT? <Link to="/login">SIGN IN HERE!</Link>
        </div>

        {displayError && (
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
            🚨 {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="okaydev-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="okaydev-input-group">
              <div className="okaydev-label-row">
                <label className="okaydev-label">
                  FIRST NAME <span className="asterisk">*</span>
                </label>
              </div>
              <div className="okaydev-input-wrapper">
                <input
                  type="text"
                  className="okaydev-input"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="okaydev-input-group">
              <div className="okaydev-label-row">
                <label className="okaydev-label">
                  LAST NAME <span className="asterisk">*</span>
                </label>
              </div>
              <div className="okaydev-input-wrapper">
                <input
                  type="text"
                  className="okaydev-input"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          </div>

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
                minLength={8}
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

          <div className="okaydev-input-group">
            <div className="okaydev-label-row">
              <label className="okaydev-label">
                CONFIRM PASSWORD <span className="asterisk">*</span>
              </label>
            </div>
            <div className="okaydev-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="okaydev-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="okaydev-submit-btn" disabled={isLoading}>
            {isLoading ? 'CREATING ACCOUNT...' : 'REGISTER ACCOUNT →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
