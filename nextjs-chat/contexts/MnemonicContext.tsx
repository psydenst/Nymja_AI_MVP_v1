// contexts/MnemonicContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

// 1) Define context shape
interface MnemonicContextType {
  mnemonic: string;
  setMnemonic: (value: string) => void;
}

// 2) Create Context
const MnemonicContext = createContext<MnemonicContextType | undefined>(undefined);

// 3) Provider component
export const MnemonicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mnemonic, setMnemonic] = useState<string>('');
  return (
    <MnemonicContext.Provider value={{ mnemonic, setMnemonic }}>
      {children}
    </MnemonicContext.Provider>
  );
};

// 4) Hook to consume
export function useMnemonic(): MnemonicContextType {
  const context = useContext(MnemonicContext);
  if (!context) throw new Error('useMnemonic must be used within MnemonicProvider');
  return context;
}
