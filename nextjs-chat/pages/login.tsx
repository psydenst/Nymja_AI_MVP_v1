import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router'; // Import useRouter
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../styles/Login.module.css';
import { listConversations } from '../utils/utils';

export default function Login() {
  // State variables for username and password
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // State for handling loading and error messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const router = useRouter(); // Initialize router

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Prepare data to send
    const data = {
      username: username,
      password: password,
    };

    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include CSRF token if necessary
        },
        body: JSON.stringify(data),
        credentials: 'include', // Include this if you're using cookies
      });

      if (!res.ok) {
        // Handle HTTP errors
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const result = await res.json();
      // Handle successful login
      // For example, save the token and redirect
      // console.log('Login successful:', result);

      // Store the token if necessary
      localStorage.setItem('accessToken', result.access_token);
			localStorage.setItem('refreshToken', result.refresh_token);
      localStorage.setItem('username', result.username);
      try {
        const convos = await listConversations(result.access_token);
        if (convos.length > 0) {
          // pick the most recent
          localStorage.setItem('conversationId', convos[0].id);
        }
      } catch (e) {
        console.error('Error preloading conversationId:', e);
      }

      // Redirect to the chat page
      router.push('/');
    } catch (err) {
      // Handle errors
      console.error('Error during login:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>Login - Nymja.AI</title>
        <link rel="icon" href="/favicon_nym.svg" />
      </Head>

      <div className={styles.loginBox}>
        <h1 className={styles.title}>Login</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
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
          <div className="d-flex flex-column justify-content-between align-items-start">
            <div className="d-flex w-100 flex-row align-items-center justify-content-around">
              <a href="/change-credentials" className={styles.forgotPassword}>
                Forgot Password?
              </a>
              <a href="/register" className={styles.forgotPassword}>
                Sign up
              </a>
            </div>
          </div>
          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? 'Logging in...' : 'LOGIN'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
