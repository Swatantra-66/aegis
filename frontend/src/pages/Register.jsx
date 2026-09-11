import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import AegisAuthBanner from '../components/AegisAuthBanner';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const { isAuthenticated, setSession } = useAuthStore();

  // Multi-step signup flow: 1: Enter email -> 2: Check email -> 3: Complete details
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registrationTicket, setRegistrationTicket] = useState('');

  // UI status states
  const [isLoading, setIsLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  const validatedTokenRef = useRef(null);

  // If already authenticated, route directly to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle Token in URL: When user clicks the link in their verification email
  useEffect(() => {
    if (!tokenFromUrl || registrationTicket) return;
    if (validatedTokenRef.current === tokenFromUrl) return;
    validatedTokenRef.current = tokenFromUrl;

    const validateToken = async () => {
      setValidatingToken(true);
      setErrorMsg('');
      try {
        const { data } = await api.post('/auth/signup/validate-token', {
          token: tokenFromUrl,
        });

        const verifiedEmail = data.data.email;
        const ticket = data.data.registrationTicket;

        setEmail(verifiedEmail);
        setRegistrationTicket(ticket);
        setStep(3);

        // Remove token from query string so page reloads don't re-trigger verification
        navigate('/register', { replace: true });
      } catch (err) {
        setErrorMsg(
          getErrorMessage(err) ||
          'This verification link is invalid or has expired. Please enter your email to receive a new one.'
        );
        setStep(1);
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [tokenFromUrl, registrationTicket, navigate]);

  // Auto-dismiss error badge after 8 seconds
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  // Step 1: Submit Company Email
  const handleInitiateSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/signup/initiate', { email: trimmedEmail });
      setEmail(trimmedEmail);
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      const serverMsg = err.response?.data?.message || '';
      if (err.response?.status === 409 || serverMsg.toLowerCase().includes('already exists')) {
        setErrorMsg('An account with this email address already exists. Please sign in instead.');
      } else {
        setErrorMsg(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Resend Verification Email
  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setErrorMsg('');
    setIsLoading(true);
    setResendSuccess(false);

    try {
      await api.post('/auth/signup/initiate', { email });
      setResendSuccess(true);
      setResendCooldown(60);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete Account Setup (Full name & Password)
  const handleCompleteSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/signup/complete', {
        email,
        registrationTicket,
        registration_ticket: registrationTicket,
        name: name.trim(),
        password,
      });

      const { user, accessToken, refreshToken } = data.data;

      // Automatically store session in Zustand and localStorage
      setSession({
        user,
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Step 4: Account created -> redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
      setIsLoading(false);

      const code = err.response?.data?.code;
      if (code === 'REGISTRATION_TICKET_INVALID' || code === 'EMAIL_MISMATCH') {
        setRegistrationTicket('');
        validatedTokenRef.current = null;
        setStep(1);
      }
    }
  };

  // Map step to banner variant
  const bannerVariant = step === 2 ? 'verify' : 'register';

  return (
    <div className="aegis-split-auth-wrapper">
      {/* Left Form Side (White Modern Form matching Sign In) */}
      <div className="aegis-auth-form-side">
        <div className="aegis-auth-form-card">
          {/* Validating URL Token Loading State */}
          {validatingToken ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div
                className="aegis-inline-spinner"
                style={{
                  width: '32px',
                  height: '32px',
                  borderTopColor: '#28441f',
                  borderColor: 'rgba(40, 68, 31, 0.15)',
                  margin: '0 auto 1.25rem',
                }}
              />
              <h2 className="aegis-auth-heading" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                Validating Verification Token
              </h2>
              <p className="aegis-auth-subheading">
                Verifying token signature against the cryptographic ledger...
              </p>
            </div>
          ) : (
            <>
              {/* Global Error Banner */}
              {errorMsg && (
                <div className="aegis-auth-alert-error" role="alert">
                  {errorMsg}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 1: Email Address Input (matching Sign In)
                  ───────────────────────────────────────────────────────────── */}
              {step === 1 && (
                <div>
                  <div className="aegis-form-header">
                    <h1 className="aegis-auth-heading">Get Started</h1>
                    <p className="aegis-auth-subheading">
                      Enter your email to verify and access your Aegis portal
                    </p>
                  </div>

                  <form onSubmit={handleInitiateSignup} className="aegis-modern-form">
                    {/* Email address */}
                    <div className="aegis-form-field">
                      <label htmlFor="signup-email" className="aegis-field-label">
                        Email address
                      </label>
                      <div className="aegis-field-input-wrap">
                        <input
                          id="signup-email"
                          type="email"
                          className="aegis-field-input"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => {
                            setErrorMsg('');
                            setEmail(e.target.value);
                          }}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="aegis-primary-btn"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="aegis-btn-loading-content">
                          <span className="aegis-inline-spinner" />
                          Submitting...
                        </span>
                      ) : (
                        'Submit'
                      )}
                    </button>

                    {/* Terms and Privacy Footer */}
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: '0.82rem',
                        color: '#6b7280',
                        lineHeight: 1.55,
                        marginTop: '0.5rem',
                      }}
                    >
                      By continuing, you agree to our{' '}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aegis-terms-link"
                      >
                        terms and conditions
                      </a>
                      .
                      <br />
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aegis-terms-link"
                      >
                        Privacy policy
                      </a>
                      .
                    </div>
                  </form>

                  {/* Sign In Switch */}
                  <div className="aegis-auth-bottom-row" style={{ marginTop: '2.5rem' }}>
                    Already have an account?{' '}
                    <Link to="/login" className="aegis-auth-switch-link">
                      Sign In
                    </Link>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 2: Check Your Email (Clean & Professional)
                  ───────────────────────────────────────────────────────────── */}
              {step === 2 && (
                <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
                  {/* Official Gmail Logo */}
                  <img
                    src="/gmail-icon.png"
                    alt="Gmail"
                    style={{
                      width: '42px',
                      height: 'auto',
                      display: 'block',
                      margin: '0 auto 1.25rem',
                    }}
                  />

                  <h1 className="aegis-auth-heading" style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>
                    Check your email
                  </h1>

                  <p className="aegis-auth-subheading" style={{ fontSize: '0.95rem', color: '#6b7280', margin: '0 0 0.35rem' }}>
                    Click on the verification link sent to
                  </p>

                  <div
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#111827',
                      wordBreak: 'break-all',
                      marginBottom: '2rem',
                    }}
                  >
                    {email}
                  </div>

                  {resendSuccess && (
                    <div
                      style={{
                        padding: '0.65rem 1rem',
                        borderRadius: '8px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        marginBottom: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Verification link re-dispatched to your inbox!
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                    {resendCooldown > 0 ? (
                      <button
                        type="button"
                        disabled
                        className="aegis-countdown-btn"
                        style={{
                          width: 'auto',
                          minWidth: '290px',
                          padding: '0.82rem 2rem',
                          background: '#f3f4f6',
                          borderColor: '#e5e7eb',
                          color: '#6b7280',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Resend link in {resendCooldown}s
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={isLoading}
                        className="aegis-primary-btn"
                        style={{
                          width: 'auto',
                          minWidth: '290px',
                          padding: '0.82rem 2.25rem',
                        }}
                      >
                        {isLoading ? (
                          <span className="aegis-btn-loading-content">
                            <span className="aegis-inline-spinner" />
                            Dispatching link...
                          </span>
                        ) : (
                          'Resend verification link'
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setErrorMsg('');
                      }}
                      className="aegis-ghost-btn"
                    >
                      Use a different email address
                    </button>
                  </div>

                  <div className="aegis-auth-bottom-row" style={{ marginTop: '2.5rem' }}>
                    Already verified?{' '}
                    <Link to="/login" className="aegis-auth-switch-link">
                      Sign In
                    </Link>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 3: Finish Creating Your Account
                  ───────────────────────────────────────────────────────────── */}
              {step === 3 && (
                <div>
                  <div className="aegis-form-header" style={{ marginBottom: '2.25rem' }}>
                    <h1 className="aegis-auth-heading" style={{ fontSize: '1.85rem', marginBottom: '1.5rem' }}>
                      Finish creating your account
                    </h1>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        fontSize: '0.9rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#111827' }}>{email}</span>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          fontFamily: 'var(--font-mono, monospace)',
                          textTransform: 'uppercase',
                          color: '#0f172a',
                          background: '#f8fafc',
                          border: '1.5px solid #0f172a',
                          borderRadius: '3px',
                          lineHeight: 1.35,
                        }}
                      >
                        VERIFIED
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleCompleteSignup} className="aegis-modern-form">
                    {/* Full Name */}
                    <div className="aegis-form-field">
                      <label htmlFor="signup-fullname" className="aegis-field-label">
                        Full name
                      </label>
                      <div className="aegis-field-input-wrap">
                        <input
                          id="signup-fullname"
                          type="text"
                          className="aegis-field-input"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => {
                            setErrorMsg('');
                            setName(e.target.value);
                          }}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="aegis-form-field">
                      <label htmlFor="signup-password" className="aegis-field-label">
                        Password
                      </label>
                      <div className="aegis-field-input-wrap">
                        <input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          className="aegis-field-input"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setErrorMsg('');
                            setPassword(e.target.value);
                          }}
                          required
                          minLength={8}
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
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem', lineHeight: 1.4 }}>
                        Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="aegis-primary-btn"
                      disabled={isLoading}
                      style={{ marginTop: '0.5rem' }}
                    >
                      {isLoading ? (
                        <span className="aegis-btn-loading-content">
                          <span className="aegis-inline-spinner" />
                          Creating Account...
                        </span>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </form>

                  {/* Sign In Switch */}
                  <div className="aegis-auth-bottom-row" style={{ marginTop: '2.5rem' }}>
                    Already have an account?{' '}
                    <Link to="/login" className="aegis-auth-switch-link">
                      Sign In
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Visual Banner Side (Aegis Signature Graphic) */}
      <AegisAuthBanner variant={bannerVariant} />
    </div>
  );
};

export default Register;
