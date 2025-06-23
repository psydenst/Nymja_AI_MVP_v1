// components/ModelMenu.tsx

import { useState, useEffect } from 'react'
import styles from '../styles/ModelMenu.module.css'

export type Mode = 'proxy' | 'mixnet'

export interface ModelOption {
  key: string
  label: string
}

interface ModelMenuProps {
  models: ModelOption[]              // now an array of { key, label }
  initialModel: string               // which key to start on
  onModelChange: (modelKey: string) => void
  currentMode: Mode
  onModeChange: (mode: Mode) => void
}

export default function ModelMenu({
  models,
  initialModel,
  onModelChange,
  currentMode,
  onModeChange,
}: ModelMenuProps) {
  const [open, setOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>(initialModel)

  // whenever we pick a new one, tell the parent
  useEffect(() => {
    onModelChange(selectedModel)
  }, [selectedModel, onModelChange])

  // helper to map key → label
  const currentLabel =
    models.find((m) => m.key === selectedModel)?.label ??
    selectedModel

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.toggleButton}
        onClick={() => setOpen((o) => !o)}
      >
        {currentLabel} <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
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
            {models.map(({ key, label }) => (
              <li
                key={key}
                className={key === selectedModel ? styles.active : ''}
                onClick={() => {
                  setSelectedModel(key)
                  setOpen(false)
                }}
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


