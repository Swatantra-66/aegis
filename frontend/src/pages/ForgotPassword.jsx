import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import api, { getErrorMessage } from '../lib/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.forgot-anim-item', {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1 className="auth-title">Check Your Inbox</h1>
            <p className="auth-subtitle mt-md">
              If an account with <span className="text-white font-semibold">{email}</span> exists in our directory, a password recovery link has been dispatched.
            </p>
          </div>
          <Link to="/login" className="btn btn-primary btn-full btn-lg mt-xl">
            ← Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container" ref={containerRef}>
        <div className="forgot-anim-item mb-md flex items-center gap-sm">
          <div className="status-dot status-dot-active status-dot-pulse" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent">
            Credential Recovery
          </span>
        </div>

        <div className="auth-header forgot-anim-item">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Enter your account email to receive a secure recovery token
          </p>
        </div>

        {error && <div className="auth-error forgot-anim-item">{error}</div>}

        <form className="auth-form forgot-anim-item" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">Work Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg mt-md" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-sm">
                <span className="spinner spinner-sm" />
                Dispatching Link...
              </span>
            ) : (
              'Send Recovery Link →'
            )}
          </button>
        </form>

        <div className="auth-footer forgot-anim-item">
          <Link to="/login" className="btn-underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
