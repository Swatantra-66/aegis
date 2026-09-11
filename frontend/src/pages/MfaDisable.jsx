import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import useAuthStore from '../stores/authStore';
import AegisAuthBanner from '../components/AegisAuthBanner';

const MfaDisable = () => {
  const navigate = useNavigate();
  const { fetchUser, roles, user } = useAuthStore();

  const userRoles = [
    ...(roles || []),
    ...(user?.roles?.map((r) => (typeof r === 'string' ? r : r.name)) || []),
    ...(user?.role ? [user.role] : []),
  ];

  const isAdmin = userRoles.some((r) => {
    const name = (typeof r === 'string' ? r : r.name || '').toLowerCase();
    return name === 'admin' || name === 'super_admin';
  });

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
              {isAdmin
                ? 'Multi-factor authentication (TOTP) is mandatory for administrative accounts under Aegis security policy.'
                : 'Enter your current 6-digit authenticator code to confirm deactivation'}
            </p>
          </div>

          {error && (
            <div className="aegis-auth-alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          {isAdmin ? (
            <div style={{ marginBottom: '1.75rem' }}>
              <div
                className="aegis-auth-alert-error"
                role="alert"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.75rem',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                  lineHeight: '1.5',
                }}
              >
                Super Admin and Admin are required to maintain active 2FA. Deactivation is strictly prohibited.
              </div>

              <Link
                to="/profile"
                className="aegis-primary-btn"
                style={{
                  textDecoration: 'none',
                  textAlign: 'center',
                  display: 'block',
                  width: '100%',
                }}
              >
                Return to Security Profile
              </Link>
            </div>
          ) : (
            <>
              {/* 6 Digit OTP Inputs */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label className="aegis-field-label" style={{ textAlign: 'center', display: 'block', marginBottom: '0.65rem' }}>
                  Verification Code
                </label>
                <div
                  className="aegis-mfa-digits-wrap"
                  onPaste={handlePaste}
                  style={{
                    margin: '0 auto',
                    maxWidth: '388px',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
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

              {/* Action Buttons: 4 columns for Disable, 2 columns for Cancel — perfectly parallel to 6 OTP inputs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '8px',
                  maxWidth: '388px',
                  margin: '0.4rem auto 0 auto',
                  width: '100%',
                }}
              >
                <button
                  type="button"
                  className="aegis-primary-btn"
                  style={{
                    gridColumn: 'span 4',
                    width: '100%',
                    marginTop: 0,
                    padding: '0.85rem 0.6rem',
                    fontSize: '0.91rem',
                    background: '#dc2626',
                    borderColor: '#dc2626',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => handleDisable()}
                  disabled={isLoading || digits.some((d) => !d)}
                >
                  {isLoading ? (
                    <span className="aegis-btn-loading-content">
                      <span className="aegis-inline-spinner" />
                      Deactivating...
                    </span>
                  ) : (
                    'Confirm & Disable 2FA'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  disabled={isLoading}
                  className="aegis-cancel-btn"
                  style={{
                    gridColumn: 'span 2',
                    width: '100%',
                    marginTop: 0,
                    padding: '0.85rem 0.6rem',
                    fontSize: '0.91rem',
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Visual Banner Side */}
      <AegisAuthBanner variant="mfa-disable" />
    </div>
  );
};

export default MfaDisable;
