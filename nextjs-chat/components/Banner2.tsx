// nextjs-chat/components/Banner2.tsx

import React, { useState } from 'react';
import styles from '../styles/Login.module.css';

interface Banner2Props {
  onContinue: () => void;
}

export default function Banner2({ onContinue }: Banner2Props) {
  // Local state to track whether the user has checked the box
  const [isChecked, setIsChecked] = useState<boolean>(false);

  // Inline styles (copied from your .importantBanner rules)
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '35%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    height: '400px',
    width: '100%',
    backgroundColor: '#ffecb3', // pale yellow
    color: '#333333',           // dark text
    borderRadius: '8px',
    padding: '15px 20px',
    marginBottom: '20px',
    textAlign: 'left',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    boxSizing: 'border-box',
  };

  const strongStyle: React.CSSProperties = {
    fontWeight: 'bold',
  };

  const checkboxContainer: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginTop: '1rem',
    marginBottom: '1rem',
  };

  const labelStyle: React.CSSProperties = {
    marginLeft: '0.5rem',
    color: '#333333',
    fontSize: '0.9rem',
  };

  return (
    <div style={containerStyle}>
      {/* The “Important” text */}
      <p>
        <span style={strongStyle}>Important:</span> This mnemonic is your only way to recover
        or log in to your account. Please copy it to a safe place—e.g. a password
        manager or a piece of paper—before continuing. If you lose it, you will
        not be able to log in or recover your account.
      </p>
      <p>
        <span style={strongStyle}>Do not share this code with anyone</span>, as anyone who has
        access to this mnemonic will be able to log in, recover, and change
        your password.
      </p>

      {/* Checkbox: “I’ve saved my mnemonic” */}
      <div style={checkboxContainer}>
        <input
          type="checkbox"
          id="savedMnemonicCheckbox"
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
        />
        <label htmlFor="savedMnemonicCheckbox" style={labelStyle}>
          I’ve saved my mnemonic
        </label>
      </div>

      {/* CONTINUE button (disabled until checkbox is checked) */}
      <button
        type="button"
        className={styles.loginButton}
        onClick={onContinue}
        disabled={!isChecked}
        style={{
          opacity: !isChecked ? 0.6 : 1,      // visually show disabled state
          cursor: !isChecked ? 'not-allowed' : 'pointer',
        }}
      >
        CONTINUE
      </button>
    </div>
  );
}
