import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import AegisAuthBanner from '../components/AegisAuthBanner';

const MfaVerify = () => {
  const navigate = useNavigate();
  const { loginWithMfa, mfaRequired, isLoading, error, clearError, cancelMfa } = useAuthStore();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

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
        <div className="aegis-auth-form-card">
          <div className="aegis-form-header">
            <h1 className="aegis-auth-heading">Two-Factor Authentication</h1>
            <p className="aegis-auth-subheading">
              Enter the 6-digit TOTP verification code from your authenticator app
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
              className="aegis-auth-switch-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontWeight: 500 }}
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>

      <AegisAuthBanner variant="mfa" />
    </div>
  );
};

export default MfaVerify;
