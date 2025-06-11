// pages/change-credentials.tsx

import { useState, useEffect } from 'react';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../styles/Login.module.css';
import { useRouter } from 'next/router';

export default function ChangeCredentials() {
  const router = useRouter();

  // State for mnemonic, username, password & confirm
  const [mnemonic, setMnemonic] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Validation & feedback
  const [passwordError, setPasswordError] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Ensure passwords match & length ≥8
  useEffect(() => {
    if (password && confirmPassword) {
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
      } else if (password.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
      } else {
        setPasswordError('');
      }
    } else {
      setPasswordError('');
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordError) return;
    if (!mnemonic || !username || !password) {
      setSubmitError('All fields are required');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-credentials/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mnemonic_phrase: mnemonic,
          username,
          new_password: password,
        }),
      });

      if (res.ok) {
        setSuccessMessage('Credentials changed! Redirecting to login…');
        setSubmitError('');
        // clear fields
        setMnemonic('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        const data = await res.json();
        setSubmitError(data.detail || 'Change failed');
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    }
  };

  const isFormInvalid =
    !mnemonic ||
    !username ||
    !password ||
    !confirmPassword ||
    !!passwordError;

  return (
    <div className={styles.page}>
      <Head>
        <title>Change Credentials</title>
        <link rel="icon" href="/favicon_nym.svg" />
      </Head>

      <div className={styles.loginBox}>
        <h1 className={styles.title}>Change Credentials</h1>

        <form onSubmit={handleSubmit}>
          {/* Mnemonic Input */}
          <div className="form-group mb-3">
            <textarea
              id="mnemonic"
              className={styles.inputField}
              placeholder="Place your 24 word mnemonic"
              value={mnemonic}
              rows={4}
              onChange={(e) => setMnemonic(e.target.value)}
              required
              style={{ resize: 'none' }}
            />
          </div>

          {/* Username Input */}
          <div className="form-group mb-3">
            <input
              type="text"
              placeholder="Username"
              className={styles.inputField}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Password Input */}
          <div className="form-group mb-3">
            <input
              type="password"
              placeholder="Password"
              className={styles.inputField}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Confirm Password Input */}
          <div className="form-group mb-2">
            <input
              type="password"
              placeholder="Confirm Password"
              className={styles.inputField}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {/* Login redirect */}
          <div className="text-end mb-2">
            <a href="/login" className={styles.forgotPassword}>
              Back to Login
            </a>
          </div>
          {/* Validation & errors */}
          {passwordError && (
            <div className="mb-3" style={{ color: '#B33030' }}>
              {passwordError}
            </div>
          )}
          {submitError && (
            <div className="mb-3" style={{ color: '#B33030' }}>
              {submitError}
            </div>
          )}
          {successMessage && (
            <div className="mb-3 text-success">{successMessage}</div>
          )}

          <button
            type="submit"
            className={styles.loginButton}
            disabled={isFormInvalid}
          >
            CONFIRM
          </button>
        </form>
      </div>
    </div>
  );
}
