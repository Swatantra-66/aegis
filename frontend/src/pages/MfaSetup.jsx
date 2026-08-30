import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import AegisAuthBanner from '../components/AegisAuthBanner';

const MfaSetup = () => {
  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();

  const [setupData, setSetupData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    const initSetup = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await api.post('/mfa/setup');
        setSetupData(data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    initSetup();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    setError('');

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== '') && newDigits.join('').length === 6) {
      handleVerify(newDigits.join(''));
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
      handleVerify(pasted);
    }
  };

  const handleVerify = async (codeToVerify) => {
    const code = codeToVerify || digits.join('');
    if (code.length !== 6) return;

    setIsVerifying(true);
    setError('');

    try {
      await api.post('/mfa/verify', { code });
      await fetchUser();
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="aegis-split-auth-wrapper">
      {/* Left Setup Form Side */}
      <div className="aegis-auth-form-side" style={{ padding: '2rem 2.5rem' }}>
        <div className="aegis-auth-form-card" style={{ maxWidth: '440px' }}>
          {/* Header */}
          <div className="aegis-form-header" style={{ marginBottom: '1.25rem' }}>
            <h1 className="aegis-auth-heading">Two-Factor Authentication</h1>
            <p className="aegis-auth-subheading">
              Scan the QR code with your authenticator app to enable 2FA protection
            </p>
          </div>

          {error && (
            <div className="aegis-auth-alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
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

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6b7280' }}>
              <span className="aegis-inline-spinner" style={{ width: '28px', height: '28px', borderTopColor: '#28441f', marginBottom: '0.75rem' }} />
              <div>Generating authenticator key...</div>
            </div>
          ) : setupData ? (
            <div>
              {/* QR Code Presentation */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    padding: '12px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
                    lineHeight: 0,
                  }}
                >
                  <QRCodeSVG value={setupData.otpauth_url} size={150} />
                </div>

                {/* Secret Key Toggle / Copy Bar */}
                <div style={{ marginTop: '0.85rem', textAlign: 'center', width: '100%' }}>
                  {!showSecret ? (
                    <button
                      type="button"
                      onClick={() => setShowSecret(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                    >
                      <span>Can't scan QR? View manual key</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  ) : (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        maxWidth: '100%',
                      }}
                    >
                      <code
                        style={{
                          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          letterSpacing: '0.04em',
                          userSelect: 'all',
                        }}
                      >
                        {setupData.secret}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        style={{
                          background: copied ? '#28441f' : '#ffffff',
                          color: copied ? '#ffffff' : '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {copied ? 'Copied! ✓' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 6-Digit OTP Input Box */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="aegis-field-label" style={{ textAlign: 'center', display: 'block', marginBottom: '0.6rem', fontSize: '0.82rem' }}>
                  Verification Code
                </label>
                <div className="aegis-mfa-digits-wrap" onPaste={handlePaste} style={{ margin: '0', justifyContent: 'center', gap: '8px' }}>
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
                      disabled={isVerifying}
                    />
                  ))}
                </div>
              </div>

              {/* Activate Button */}
              <button
                type="button"
                className="aegis-primary-btn"
                onClick={() => handleVerify()}
                disabled={isVerifying || digits.some((d) => !d)}
              >
                {isVerifying ? (
                  <span className="aegis-btn-loading-content">
                    <span className="aegis-inline-spinner" />
                    Activating 2FA...
                  </span>
                ) : (
                  'Activate 2FA Protection'
                )}
              </button>
            </div>
          ) : null}

          {/* Footer Back Link */}
          <div className="aegis-auth-bottom-row" style={{ marginTop: '1.75rem' }}>
            <Link to="/profile" className="aegis-auth-switch-link">
              Return to Security Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Right Visual Banner Side */}
      <AegisAuthBanner variant="mfa-setup" />
    </div>
  );
};

export default MfaSetup;
