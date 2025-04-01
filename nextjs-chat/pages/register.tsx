// register.tsx

import { useState, useEffect } from 'react';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../styles/Login.module.css';
import { useRouter } from 'next/router'; // Import useRouter

export default function Register() {
  // State variables for form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  // State variables for errors and success message
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Function to validate passwords
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

  // Run validation whenever passwords change
  useEffect(() => {
    validatePasswords();
  }, [password, confirmPassword]);

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission

    if (!passwordError) {
      try {
        const response = await fetch('http://localhost:8000/api/auth/register/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, email, password }),
        });
   
        if (response.ok) {
          setSuccessMessage('Registration successful! Redirecting to login...');
          // Reset form fields
          setUsername('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          // Optionally, redirect after a delay
          setTimeout(() => {
            // For example, using Next.js router
            router.push('/');
          }, 2000);
        } else {
          const data = await response.json();
          setPasswordError(data.message || 'Registration failed');
        }
      } catch (error) {
        setPasswordError('An error occurred. Please try again.');
      }
    } else {
      console.log('Form submission prevented due to validation errors');
    }
  };

  // Determine if the form is invalid
  const isFormInvalid =
    !!passwordError || !username || !email || !password || !confirmPassword;

  return (
    <div className={styles.page}>
      <Head>
        <title>Register - Nymja.AI</title>
        <link rel="icon" href="/favicon_nym.svg" />
      </Head>

      <div className={styles.loginBox}>
        <h1 className={styles.title}>Register</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Username Input */}
          <div className="form-group mb-3">
            <label htmlFor="username" className="visually-hidden">
              Username
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

          {/* Email Input */}
          <div className="form-group mb-3">
            <label htmlFor="email" className="visually-hidden">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              className={styles.inputField}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Input */}
          <div className="form-group mb-3">
            <label htmlFor="password" className="visually-hidden">
              Password
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
          <div className="form-group mb-3">
            <label htmlFor="confirmPassword" className="visually-hidden">
              Confirm Password
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

          {/* Display password error if any */}
          {passwordError && (
            <div className="mb-3" style={{ color: '#B33030' }}>
              {passwordError}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-3 text-success">{successMessage}</div>
          )}

          {/* Remember Me and Login Link */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center">
              <input type="checkbox" id="rememberMe" />
              <label htmlFor="rememberMe" className="ms-2">
                Remember me
              </label>
            </div>
            <a href="/login" className={styles.forgotPassword}>
              Login
            </a>
          </div>

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
