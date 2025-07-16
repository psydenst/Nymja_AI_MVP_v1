// nextjs-chat/pages/register-credentials.tsx

import { useState, useEffect } from 'react';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../styles/Login.module.css';
import { useRouter } from 'next/router';
import { useMnemonic } from '../contexts/MnemonicContext';

export default function RegisterStep2() {
  const router = useRouter();
  const { mnemonic } = useMnemonic();

  // helper: SHA-256 → hex
  async function hashPhrase(phrase: string): Promise<string> {
    const msg = new TextEncoder().encode(phrase);
    const buf = await crypto.subtle.digest('SHA-256', msg);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  //If mnemonic is missing (e.g. user navigated directly), redirect back to Step 1
   
  useEffect(() => {
    if (!mnemonic) {
      router.replace('/register');
    }
  }, [mnemonic, router]);

  // State for username / password / confirm password
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Validation errors & success message
  const [passwordError, setPasswordError] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Validate that password matches and has at least 8 chars
  const validatePasswords = () => {
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
  };

  useEffect(() => {
    validatePasswords();
  }, [password, confirmPassword]);

  // Submit { username, password, mnemonic_phrase } to POST /api/auth/register/
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // If there is already a validation error, do not proceed
    if (passwordError) return;

    // Ensure we still have a valid mnemonic
    if (!mnemonic) {
      setSubmitError('Mnemonic is missing. Please go back and generate a new one.');
      return;
    }

    try {
      const mnemonic_hash = await hashPhrase(mnemonic);
      const response = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          mnemonic_hash,
        }),
      });

      if (response.ok) {
        setSuccessMessage('Registration successful! Redirecting to login...');
        // Clear fields
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        // After 2 seconds, navigate to /login
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        const data = await response.json();
        // The backend might return { username: [...], mnemonic_phrase: [...] } or { detail: "..." }
        if (data.username) {
          setSubmitError(data.username.join(' '));
        } else if (data.mnemonic_phrase) {
          setSubmitError(data.mnemonic_phrase.join(' '));
        } else if (data.detail) {
          setSubmitError(data.detail);
        } else {
          setSubmitError('Registration failed');
        }
      }
    } catch (err) {
      setSubmitError('Network error. Please try again.');
    }
  };

  // Determine if form is invalid (missing fields or password error)
  const isFormInvalid =
    !mnemonic ||
    !username ||
    !password ||
    !confirmPassword ||
    !!passwordError;

  return (
    <div className={styles.page}>
      <Head>
        <title>Step 2: Username & Password – Register</title>
        <link rel="icon" href="/favicon_nym.svg" />
      </Head>

      <div className={styles.loginBox}>
        <h1 className={styles.title}>Step 2: Username & Password</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Username Input */}
          <div className="form-group mb-3">
            <label htmlFor="username" className="form-label">
            </label>
            <input
              id="username"
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
            <label htmlFor="password" className="form-label">
            </label>
            <input
              id="password"
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
            <label htmlFor="confirmPassword" className="form-label">
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              className={styles.inputField}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="text-end mb-2">
            <a href="/login" className={styles.forgotPassword}>
              Back to Login
            </a>
          </div>
          {/* Display password validation error, if any */}
          {passwordError && (
            <div className="mb-3" style={{ color: '#B33030' }}>
              {passwordError}
            </div>
          )}

          {/* Display submission error (e.g. username taken, mnemonic used) */}
          {submitError && (
            <div className="mb-3" style={{ color: '#B33030' }}>
              {submitError}
            </div>
          )}

          {/* Display success message if registration succeeded */}
          {successMessage && (
            <div className="mb-3 text-success">{successMessage}</div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={styles.loginButton}
            disabled={isFormInvalid}
          >
            REGISTER
          </button>
        </form>
      </div>
    </div>
  );
}
