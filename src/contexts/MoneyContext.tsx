import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

export type AssetType = 'Cash' | 'Bank Account' | 'Credit Card' | 'eWallet' | 'Savings' | 'Investment' | 'Loan';

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

export interface SubCategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'pengeluaran' | 'pendapatan';
  subcategories?: SubCategory[];
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  initialBalance: number;
  isHidden?: boolean;
}

export interface Transaction {
  id: string;
  type: 'pengeluaran' | 'pendapatan' | 'transfer';
  amount: number;
  category: string;
  subCategory?: string;
  date: string;
  note: string;
  assetId?: string; // Untuk pendapatan/pengeluaran
  fromAssetId?: string; // Untuk transfer
  toAssetId?: string; // Untuk transfer
}

interface MoneyContextType {
  assets: Asset[];
  transactions: Transaction[];
  categories: Category[];
  user: UserProfile;
  pin: string | null;
  isAppLocked: boolean;
  theme: 'light' | 'dark';
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  deleteAsset: (id: string) => void;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  addCategory: (cat: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  addSubCategory: (categoryId: string, name: string) => void;
  deleteSubCategory: (categoryId: string, subId: string) => void;
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
    assets: JSON.parse(localStorage.getItem('moneyapp_assets_v2') || '[]'),
    transactions: JSON.parse(localStorage.getItem('moneyapp_transactions_v2') || '[]'),
    categories: JSON.parse(localStorage.getItem('moneyapp_categories_v1') || '[]'),
    user: JSON.parse(localStorage.getItem('moneyapp_user') || 'null'),
    pin: localStorage.getItem('moneyapp_pin'),
    theme: localStorage.getItem('moneyapp_theme') || 'light'
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
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('moneyapp_categories_v1');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'cat-1', name: 'Makanan', type: 'pengeluaran', subcategories: [{ id: 'sub-1', name: 'Makan Diluar' }, { id: 'sub-2', name: 'Groceries' }] },
      { id: 'cat-2', name: 'Transportasi', type: 'pengeluaran', subcategories: [{ id: 'sub-3', name: 'Bensin' }, { id: 'sub-4', name: 'Parkir' }] },
      { id: 'cat-3', name: 'Hiburan', type: 'pengeluaran', subcategories: [] },
      { id: 'cat-4', name: 'Belanja', type: 'pengeluaran', subcategories: [] },
      { id: 'cat-5', name: 'Tagihan', type: 'pengeluaran', subcategories: [] },
      { id: 'cat-6', name: 'Gaji', type: 'pendapatan', subcategories: [] },
      { id: 'cat-7', name: 'Bonus', type: 'pendapatan', subcategories: [] },
      { id: 'cat-8', name: 'Investasi', type: 'pendapatan', subcategories: [] }
    ];
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
    localStorage.setItem('moneyapp_categories_v1', JSON.stringify(categories));
  }, [categories]);

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

  const addAsset = useCallback((assetReq: Omit<Asset, 'id'>) => {
    const newAsset = { ...assetReq, id: Date.now().toString() };
    setAssets(prev => [...prev, newAsset]);
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  const updateAsset = useCallback((id: string, updatedAsset: Partial<Asset>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updatedAsset } : a));
  }, []);

  const addTransaction = useCallback((txReq: Omit<Transaction, 'id'>) => {
    const newTx = { ...txReq, id: Date.now().toString() };
    setTransactions(prev => [newTx, ...prev]);
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }, []);

  const updateTransaction = useCallback((id: string, updatedTx: Partial<Transaction>) => {
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updatedTx } as Transaction : tx));
  }, []);

  const addCategory = useCallback((catReq: Omit<Category, 'id'>) => {
    const newCat = { ...catReq, id: Date.now().toString(), subcategories: [] };
    setCategories(prev => [...prev, newCat]);
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  const addSubCategory = useCallback((categoryId: string, name: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subcategories: [...(c.subcategories || []), { id: Date.now().toString(), name }]
        };
      }
      return c;
    }));
  }, []);

  const deleteSubCategory = useCallback((categoryId: string, subId: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subcategories: (c.subcategories || []).filter(sub => sub.id !== subId)
        };
      }
      return c;
    }));
  }, []);

  const getAssetBalance = useCallback((assetId: string) => {
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
  }, [assets, transactions]);

  const updateUser = useCallback((newUser: UserProfile) => setUser(newUser), []);
  
  const setAppPin = useCallback((newPin: string | null) => {
    setPin(newPin);
    if (!newPin) setIsAppLocked(false);
  }, []);

  const unlockApp = useCallback((enteredPin: string) => {
    if (enteredPin === pin) {
      setIsAppLocked(false);
      return true;
    }
    return false;
  }, [pin]);

  const lockApp = useCallback(() => {
    if (pin) setIsAppLocked(true);
  }, [pin]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const value = useMemo(() => ({
    assets, transactions, categories, user, pin, isAppLocked, theme,
    addAsset, deleteAsset, updateAsset, addTransaction, deleteTransaction, updateTransaction, 
    addCategory, deleteCategory, addSubCategory, deleteSubCategory, getAssetBalance,
    updateUser, setAppPin, unlockApp, lockApp, toggleTheme
  }), [
    assets, transactions, categories, user, pin, isAppLocked, theme,
    addAsset, deleteAsset, updateAsset, addTransaction, deleteTransaction, updateTransaction, 
    addCategory, deleteCategory, addSubCategory, deleteSubCategory, getAssetBalance,
    updateUser, setAppPin, unlockApp, lockApp, toggleTheme
  ]);

  return (
    <MoneyContext.Provider value={value}>
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
