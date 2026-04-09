import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type AssetType = 'Cash' | 'Bank Account' | 'Credit Card' | 'eWallet';

export interface UserProfile {
  name: string;
  email: string;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  initialBalance: number;
}

export interface Transaction {
  id: string;
  type: 'pengeluaran' | 'pendapatan' | 'transfer';
  amount: number;
  category: string;
  date: string;
  note: string;
  assetId?: string; // Untuk pendapatan/pengeluaran
  fromAssetId?: string; // Untuk transfer
  toAssetId?: string; // Untuk transfer
}

interface MoneyContextType {
  assets: Asset[];
  transactions: Transaction[];
  user: UserProfile;
  pin: string | null;
  isAppLocked: boolean;
  theme: 'light' | 'dark';
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  deleteAsset: (id: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  getAssetBalance: (assetId: string) => number;
  updateUser: (user: UserProfile) => void;
  setAppPin: (newPin: string | null) => void;
  unlockApp: (enteredPin: string) => boolean;
  lockApp: () => void;
  toggleTheme: () => void;
}

const MoneyContext = createContext<MoneyContextType | undefined>(undefined);

export const exportMoneyData = () => {
  return {
    assets: localStorage.getItem('moneyapp_assets_v2'),
    transactions: localStorage.getItem('moneyapp_transactions_v2'),
    user: localStorage.getItem('moneyapp_user'),
    pin: localStorage.getItem('moneyapp_pin'),
    theme: localStorage.getItem('moneyapp_theme')
  }
}

export const MoneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('moneyapp_assets_v2');
    if (saved) return JSON.parse(saved);
    const defaultAsset: Asset = { id: 'default-1', name: 'Dompet Tunai', type: 'Cash', initialBalance: 0 };
    return [defaultAsset];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('moneyapp_transactions_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('moneyapp_user');
    return saved ? JSON.parse(saved) : { name: 'Pengguna MoneyApp', email: 'pengguna@email.com' };
  });
  const [pin, setPin] = useState<string | null>(() => {
    return localStorage.getItem('moneyapp_pin');
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    return !!localStorage.getItem('moneyapp_pin');
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('moneyapp_theme') as 'light' | 'dark') || 'light';
  });

  // Load from local storage on mount (Cleaned up redundant setters)
  useEffect(() => {
    // Initial save of default asset if fresh
    if (!localStorage.getItem('moneyapp_assets_v2')) {
      localStorage.setItem('moneyapp_assets_v2', JSON.stringify(assets));
    }
  }, []);

  // Sync to local storage
  useEffect(() => {
    if (assets.length > 0) {
      localStorage.setItem('moneyapp_assets_v2', JSON.stringify(assets));
    }
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('moneyapp_transactions_v2', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('moneyapp_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (pin) localStorage.setItem('moneyapp_pin', pin);
    else localStorage.removeItem('moneyapp_pin');
  }, [pin]);

  useEffect(() => {
    localStorage.setItem('moneyapp_theme', theme);
  }, [theme]);

  const addAsset = (assetReq: Omit<Asset, 'id'>) => {
    const newAsset = { ...assetReq, id: Date.now().toString() };
    setAssets(prev => [...prev, newAsset]);
  };

  const deleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const addTransaction = (txReq: Omit<Transaction, 'id'>) => {
    const newTx = { ...txReq, id: Date.now().toString() };
    setTransactions(prev => [newTx, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const getAssetBalance = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return 0;

    let balance = asset.initialBalance;

    transactions.forEach(tx => {
      if (tx.type === 'pendapatan' && tx.assetId === assetId) {
        balance += tx.amount;
      } else if (tx.type === 'pengeluaran' && tx.assetId === assetId) {
        balance -= tx.amount;
      } else if (tx.type === 'transfer' && tx.fromAssetId === assetId) {
        balance -= tx.amount;
      } else if (tx.type === 'transfer' && tx.toAssetId === assetId) {
        balance += tx.amount;
      }
    });

    return balance;
  };

  const updateUser = (newUser: UserProfile) => setUser(newUser);
  
  const setAppPin = (newPin: string | null) => {
    setPin(newPin);
    if (!newPin) setIsAppLocked(false);
  };

  const unlockApp = (enteredPin: string) => {
    if (enteredPin === pin) {
      setIsAppLocked(false);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    if (pin) setIsAppLocked(true);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <MoneyContext.Provider value={{
      assets, transactions, user, pin, isAppLocked, theme,
      addAsset, deleteAsset, addTransaction, deleteTransaction, getAssetBalance,
      updateUser, setAppPin, unlockApp, lockApp, toggleTheme
    }}>
      {children}
    </MoneyContext.Provider>
  );
};

export const useMoney = () => {
  const context = useContext(MoneyContext);
  if (context === undefined) {
    throw new Error('useMoney must be used within a MoneyProvider');
  }
  return context;
};
