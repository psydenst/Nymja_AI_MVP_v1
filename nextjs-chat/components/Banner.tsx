// components/Banner.tsx

import React from 'react';
import styles from '../styles/Login.module.css';

interface BannerProps {
  onContinue: () => void;
}

export default function Banner({ onContinue }: BannerProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '50vw',
        /* Fallback to 50vh, but use 50dvh if available */
        height: '50vh',
        /* Prevent it from exceeding, say, 80% of the dynamic viewport */
        maxHeight: '80dvh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          height: '100%',
          color: '#FFFFFF',
          padding: '1.5rem',
          overflowY: 'auto',
          borderRadius: '8px',
          backgroundColor: 'transparent',
        }}
      >
        <h2 style={{ marginBottom: '1rem' }}>Get Your Access Code</h2>
        <p style={{ lineHeight: 1.5, marginBottom: '1rem' }}>
          We take your privacy seriously, which means you don’t need to create an account
          to use our AI chat. You generate your own anonymous Access Code that you use to connect your devices.
        </p>
        <p style={{ lineHeight: 1.5, marginBottom: '1rem' }}>
          Securely generate your Access Code in your browser and save it somewhere secure.
        </p>
        <p style={{ lineHeight: 1.5, marginBottom: '1rem' }}>
          Unlike a normal password, there is no way to change or recover this Access Code if you lose it.
        </p>
        <p style={{ lineHeight: 1.5, marginBottom: '2rem' }}>
          Never share your Access Code—not even with us!
        </p>
        <button
          type="button"
          className={styles.loginButton}
          onClick={onContinue}
          style={{ display: 'block', margin: '0 auto' }}
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}
