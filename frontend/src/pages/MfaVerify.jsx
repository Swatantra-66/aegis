import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import AegisAuthBanner from '../components/AegisAuthBanner';

const HelpIcon = ({ size = 15 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

const GmailIcon = ({ size = 14 }) => (
  <img
    src="/gmail-icon.png"
    alt="Gmail"
    style={{
      width: `${size}px`,
      height: 'auto',
      display: 'inline-block',
      verticalAlign: 'middle',
      flexShrink: 0,
    }}
  />
);

const MfaVerify = () => {
  const navigate = useNavigate();
  const { loginWithMfa, mfaRequired, isLoading, error, clearError, cancelMfa, mfaPendingCredentials } = useAuthStore();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const inputRefs = useRef([]);
  const helpRef = useRef(null);

  // Close help popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) {
        setIsHelpOpen(false);
      }
    };
    if (isHelpOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHelpOpen]);

  // Redirect if not in MFA flow
  useEffect(() => {
    if (!mfaRequired) navigate('/login', { replace: true });
  }, [mfaRequired, navigate]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== '') && newDigits.join('').length === 6) {
      handleSubmit(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (code) => {
    clearError();
    try {
      await loginWithMfa(code || digits.join(''));
      navigate('/dashboard', { replace: true });
    } catch {
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleBack = () => {
    cancelMfa();
    navigate('/login');
  };

  return (
    <div className="aegis-split-auth-wrapper">
      {/* Left Form Side */}
      <div className="aegis-auth-form-side">
        {/* Top-Right Help Action */}
        <div ref={helpRef} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 30 }}>
          <button
            type="button"
            onClick={() => setIsHelpOpen((prev) => !prev)}
            aria-label="MFA Assistance"
            title="Need help with 2FA?"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '2px',
              border: `1px solid ${isHelpOpen ? '#111827' : '#e5e7eb'}`,
              background: isHelpOpen ? '#111827' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isHelpOpen ? '#ffffff' : '#4b5563',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            }}
          >
            <HelpIcon size={15} />
          </button>

          {isHelpOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '290px',
                background: '#090909',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '2px',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.8)',
                padding: '1.1rem 1.15rem',
                zIndex: 50,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
                  2FA Assistance
                </span>
                <button
                  type="button"
                  onClick={() => setIsHelpOpen(false)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                    padding: '2px',
                  }}
                  aria-label="Close help"
                >
                  ×
                </button>
              </div>

              <p style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4, margin: '0 0 0.65rem 0' }}>
                Lost your device or code? Request a reset from AEGIS Security.
              </p>

              {resetSent ? (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '2px',
                    padding: '0.65rem 0.75rem',
                    marginBottom: '0.65rem',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: '#ffffff', fontWeight: 600, marginBottom: '0.2rem' }}>
                    Request Sent
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.55)', lineHeight: 1.35 }}>
                    An administrator will review and reset your factor.
                  </div>
                </div>
              ) : (
                <>
                  {resetError && (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '2px',
                        padding: '0.5rem 0.7rem',
                        color: '#ef4444',
                        fontSize: '0.7rem',
                        marginBottom: '0.65rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {resetError}
                    </div>
                  )}

                  {mfaPendingCredentials?.email && (
                    <button
                      type="button"
                      disabled={isSendingReset}
                      onClick={async () => {
                        setIsSendingReset(true);
                        setResetError('');
                        try {
                          await api.post('/mfa/request-reset', { email: mfaPendingCredentials.email });
                          setResetSent(true);
                        } catch (err) {
                          setResetError(getErrorMessage(err));
                        } finally {
                          setIsSendingReset(false);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        borderRadius: '2px',
                        border: 'none',
                        cursor: isSendingReset ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        marginBottom: '0.75rem',
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      <GmailIcon size={14} />
                      {isSendingReset ? 'Sending...' : 'Request Reset'}
                    </button>
                  )}
                </>
              )}

              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '0.55rem',
                  textAlign: 'center',
                }}
              >
                <a
                  href="mailto:aegisiamsecurity@gmail.com?subject=Aegis%202FA%20Reset%20Assistance"
                  style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255, 255, 255, 0.55)',
                    textDecoration: 'none',
                    fontFamily: 'monospace',
                  }}
                >
                  aegisiamsecurity@gmail.com
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="aegis-auth-form-card">
          <div className="aegis-form-header">
            <h1 className="aegis-auth-heading">Two-Factor Authentication</h1>
            <p className="aegis-auth-subheading">
              Enter the 6-digit TOTP verification code from your authenticator app
            </p>
          </div>

          {error && (
            <div className="aegis-auth-alert-error" role="alert">
              {error}
            </div>
          )}

          <div className="aegis-mfa-digits-wrap" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="aegis-mfa-digit"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                autoFocus={index === 0}
                disabled={isLoading}
              />
            ))}
          </div>

          <button
            type="button"
            className="aegis-primary-btn"
            onClick={() => handleSubmit()}
            disabled={isLoading || digits.some((d) => !d)}
          >
            {isLoading ? (
              <span className="aegis-btn-loading-content">
                <span className="aegis-inline-spinner" />
                Verifying Code...
              </span>
            ) : (
              'Verify & Sign In'
            )}
          </button>

          <div className="aegis-auth-bottom-row" style={{ marginTop: '2.5rem' }}>
            <button
              type="button"
              onClick={handleBack}
              className="aegis-auth-back-link"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>

      <AegisAuthBanner variant="mfa" />
    </div>
  );
};

export default MfaVerify;
