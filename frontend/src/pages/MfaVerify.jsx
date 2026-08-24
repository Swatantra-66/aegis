import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import useAuthStore from '../stores/authStore';

const MfaVerify = () => {
  const navigate = useNavigate();
  const { loginWithMfa, mfaRequired, isLoading, error, clearError, cancelMfa } = useAuthStore();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const containerRef = useRef(null);

  // Redirect if not in MFA flow
  useEffect(() => {
    if (!mfaRequired) navigate('/login', { replace: true });
  }, [mfaRequired, navigate]);

  // GSAP entrance with context cleanup
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.mfa-anim-item', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'all',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

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
      navigate('/', { replace: true });
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
    <div className="auth-page">
      <div className="auth-container" ref={containerRef}>
        <div className="mfa-anim-item mb-md flex items-center gap-sm">
          <div className="status-dot status-dot-active status-dot-pulse" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent">
            Hardware / TOTP Security
          </span>
        </div>

        <div className="auth-header mfa-anim-item">
          <h1 className="auth-title">Two-Factor Authentication</h1>
          <p className="auth-subtitle">
            Enter the 6-digit TOTP verification code from your authenticator app
          </p>
        </div>

        {error && <div className="auth-error mfa-anim-item">{error}</div>}

        <div className="mfa-inputs mfa-anim-item" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="mfa-digit"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              autoFocus={index === 0}
              disabled={isLoading}
            />
          ))}
        </div>

        <button
          className="btn btn-primary btn-full btn-lg mfa-anim-item mt-md"
          onClick={() => handleSubmit()}
          disabled={isLoading || digits.some((d) => !d)}
        >
          {isLoading ? (
            <span className="flex items-center gap-sm">
              <span className="spinner spinner-sm" />
              Verifying Code...
            </span>
          ) : (
            'Verify & Sign In →'
          )}
        </button>

        <div className="auth-footer mfa-anim-item mt-xl">
          <button onClick={handleBack} className="btn-underline" style={{ color: 'var(--text-secondary)' }}>
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default MfaVerify;
