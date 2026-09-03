import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import AegisAuthBanner from '../components/AegisAuthBanner';

const MfaDisable = () => {
  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
      handleDisable(newDigits.join(''));
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
      handleDisable(pasted);
    }
  };

  const handleDisable = async (codeToVerify) => {
    const code = codeToVerify || digits.join('');
    if (code.length !== 6) return;

    setIsLoading(true);
    setError('');

    try {
      await api.delete('/mfa/disable', { data: { code } });
      await fetchUser();
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="aegis-split-auth-wrapper">
      {/* Left Form Side (Clean White Split Card) */}
      <div className="aegis-auth-form-side">
        <div className="aegis-auth-form-card" style={{ maxWidth: '440px' }}>
          {/* Header */}
          <div className="aegis-form-header" style={{ marginBottom: '1.25rem' }}>
            <h1 className="aegis-auth-heading">Disable 2FA Protection</h1>
            <p className="aegis-auth-subheading">
              Enter your current 6-digit authenticator code to confirm deactivation
            </p>
          </div>

          {error && (
            <div className="aegis-auth-alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}



          {/* 6 Digit OTP Inputs */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label className="aegis-field-label" style={{ textAlign: 'center', display: 'block', marginBottom: '0.65rem' }}>
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
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* Destructive Action Button */}
          <button
            type="button"
            className="aegis-primary-btn"
            style={{
              background: '#dc2626',
              borderColor: '#dc2626',
            }}
            onClick={() => handleDisable()}
            disabled={isLoading || digits.some((d) => !d)}
          >
            {isLoading ? (
              <span className="aegis-btn-loading-content">
                <span className="aegis-inline-spinner" />
                Deactivating 2FA...
              </span>
            ) : (
              'Confirm & Disable 2FA'
            )}
          </button>

          {/* Footer Back Link */}
          <div className="aegis-auth-bottom-row" style={{ marginTop: '1.75rem' }}>
            <Link to="/profile" className="aegis-auth-switch-link">
              Cancel and Return to Security Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Right Visual Banner Side */}
      <AegisAuthBanner variant="mfa-disable" />
    </div>
  );
};

export default MfaDisable;
