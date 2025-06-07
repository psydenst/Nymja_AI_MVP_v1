// nextjs-chat/pages/register.tsx

import { useState, useEffect } from 'react';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../styles/Login.module.css';
import { useRouter } from 'next/router';
import Banner from '../components/Banner';

// Note: drop Banner2—no longer needed

export default function RegisterStep1() {
  // ─── State ──────────────────────────────────────────────────────────────
  const [showBanner, setShowBanner] = useState<boolean>(true);
  const [mnemonic, setMnemonic] = useState<string>('');
  const [mnemonicError, setMnemonicError] = useState<string>('');
  const [hasSaved, setHasSaved] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const router = useRouter();

  // ─── Fetch a new mnemonic phrase ────────────────────────────────────────
  const handleGenerate = async () => {
    setMnemonicError('');
    try {
      const res = await fetch('/api/auth/mnemonic', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setMnemonic(data.mnemonic_phrase || data.mnemonic || '');
        setHasSaved(false);
      } else {
        const err = await res.json();
        setMnemonicError(err.detail || 'Failed to generate mnemonic');
      }
    } catch {
      setMnemonicError('Network error while generating mnemonic');
    }
  };

  // ─── Copy mnemonic to clipboard ──────────────────────────────────────────
  const handleCopy = () => {
    if (!mnemonic) return;
    navigator.clipboard.writeText(mnemonic).then(() => {
      setCopySuccess(true);
    });
  };
 
  useEffect(() => {
    if (copySuccess) {
      const tid = setTimeout(() => setCopySuccess(false), 3000);
      return () => clearTimeout(tid);
    }
  }, [copySuccess]);

  // ─── Navigate to credentials step ────────────────────────────────────────
  const handleContinueToCredentials = () => {
    if (!mnemonic) return;
    router.push({
      pathname: '/register-credentials',
      query: { mnemonic },
    });
  };

  // ─── Dismiss the initial overlay banner ─────────────────────────────────
  const dismissBanner = () => {
    setShowBanner(false);
  };

  // ─── Determine button label & disabled state ────────────────────────────
  // Before mnemonic: label = "GENERATE", enabled.
  // After mnemonic + !hasSaved: label = "GENERATE", disabled.
  // After mnemonic + hasSaved: label = "CONTINUE", enabled.
  const isFetched = mnemonic !== '';
  const buttonLabel = isFetched ? (hasSaved ? 'CONTINUE' : 'GENERATE') : 'GENERATE';
  const buttonDisabled = isFetched ? !hasSaved : false;
  const buttonAction = isFetched
    ? hasSaved
      ? handleContinueToCredentials
      : () => {}        // disabled no-op
    : handleGenerate;

  // ─── Smoothly animate label changes ────────────────────────────────────
  // We toggle a CSS class when label changes, to animate opacity:
  const [fadeClass, setFadeClass] = useState<string>(styles.fadeIn);

  useEffect(() => {
    // Whenever the buttonLabel changes, trigger a quick fade
    setFadeClass(styles.fadeOut);
    const tid = setTimeout(() => {
      setFadeClass(styles.fadeIn);
    }, 150); // match animation duration
    return () => clearTimeout(tid);
  }, [buttonLabel]);

  return (
    <div className={styles.page} style={{ position: 'relative' }}>
      <Head>
        <title>Register – Nymja.AI</title>
        <link rel="icon" href="/favicon_nym.svg" />
      </Head>

      {/* ── Initial Overlay Banner ──────────────────────────────────────────── */}
      {showBanner && <Banner onContinue={dismissBanner} />}

      {/* ── Underlying Registration Form ────────────────────────────────────── */}
      <div className={styles.loginBox} style={{ opacity: showBanner ? 0.3 : 1 }}>
        <h1 className={styles.title}>Step 1: Generate Your Mnemonic</h1>

        {/* ── Mnemonic Textarea ─────────────────────────────────────────────── */}
        <div className="form-group mb-1">
          <label htmlFor="mnemonic" className="form-label">
            Generate your 24-word login code
          </label>
          <textarea
            id="mnemonic"
            className={styles.inputField}
            placeholder="know hover border demand update earth merry day embrace rare price era senior bed grunt leisure blanket advice slight clump chunk shadow barrel"
            value={mnemonic}
            readOnly
            rows={6}
            style={{ resize: 'none' }}
          />
          {mnemonicError && (
            <div className="mt-1" style={{ color: '#B33030' }}>
              {mnemonicError}
            </div>
          )}
        </div>

        {/* ── Copy Icon (appears once mnemonic is non-empty) ──────────────── */}
        {mnemonic && (
          <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
            <button
              onClick={handleCopy}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
              title="Copy to clipboard"
            >
              <img
                src="/copy.png"
                alt="Copy"
                style={{ width: '24px', height: '24px', filter: 'invert(1)'}}
              />
            </button>
          </div>
        )}

        {/* ── “Copied to Clipboard” success alert ──────────────────────────── */}
        {copySuccess && (
          <div className={`alert alert-success ${styles.fadeAlert}`}
          role="alert">
            Copied to Clipboard
          </div>
        )}

        {/* ── Checkbox “I’ve saved my mnemonic” (only after mnemonic exists) ── */}
        {mnemonic && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <input
              type="checkbox"
              id="savedMnemonicCheckbox"
              checked={hasSaved}
              onChange={(e) => setHasSaved(e.target.checked)}
            />
            <label
              htmlFor="savedMnemonicCheckbox"
              style={{
                marginLeft: '0.5rem',
                color: '#ffffff',
                fontSize: '0.9rem',
              }}
            >
              I’ve saved my mnemonic
            </label>
          </div>
        )}

        {/* ── Single Button (Generate ↔ Continue) ───────────────────────────── */}
        <button
          type="button"
          className={styles.loginButton}
          onClick={buttonAction}
          disabled={buttonDisabled}
          style={{
            opacity: buttonDisabled ? 0.6 : 1,
            cursor: buttonDisabled ? 'not-allowed' : 'pointer',
            transition: 'opacity 150ms ease-in-out',
          }}
        >
          <span className={fadeClass}>{buttonLabel}</span>
        </button>
      </div>
    </div>
  );
}

