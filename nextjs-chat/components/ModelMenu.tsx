import { useState } from 'react';
import styles from '../styles/ModelMenu.module.css';

export type Mode = 'proxy' | 'mixnet';

interface ModelMenuProps {
  models: string[];
  currentModel: string;
  onModelChange: (model: string) => void;
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function ModelMenu({
  models,
  currentModel,
  onModelChange,
  currentMode,
  onModeChange,
}: ModelMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.toggleButton}
        onClick={() => setOpen((o) => !o)}
      >
        {currentModel} <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.modeSwitch}>
            <button
              className={currentMode === 'proxy' ? styles.active : ''}
              onClick={() => onModeChange('proxy')}
            >
              Proxy
            </button>
            <button
              className={currentMode === 'mixnet' ? styles.active : ''}
              onClick={() => onModeChange('mixnet')}
            >
              Mixnet
            </button>
          </div>
          <ul className={styles.modelList}>
            {models.map((m) => (
              <li
                key={m}
                className={m === currentModel ? styles.active : ''}
                onClick={() => {
                  onModelChange(m);
                  setOpen(false);
                }}
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
