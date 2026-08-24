import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
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
            <h1 className="auth-title">Password Updated</h1>
            <p className="auth-subtitle mt-md">
              Your credentials have been securely hashed and stored. All previous sessions have been revoked.
            </p>
          </div>
          <Link to="/login" className="btn btn-primary btn-full btn-lg mt-xl">
            Sign In with New Password →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="mb-md flex items-center gap-sm">
          <div className="status-dot status-dot-active status-dot-pulse" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent">
            Secure Password Reset
          </span>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Set New Password</h1>
          <p className="auth-subtitle">Must be at least 8 characters</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg mt-md" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-sm">
                <span className="spinner spinner-sm" />
                Updating Password...
              </span>
            ) : (
              'Save New Password →'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="btn-underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
