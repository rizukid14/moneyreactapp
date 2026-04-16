import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  dbGetAllAssets, dbPutAsset,
  dbGetAllTransactions, dbPutTransaction, dbDeleteTransaction,
  dbGetAllCategories, dbPutCategory, dbDeleteCategory,
  dbGetSetting, dbPutSetting, dbDeleteSetting,
  dbExportAll, dbImportAll,
  migrateFromLocalStorage,
  migrateFromIndexedDBToFirebase
} from '../lib/db';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthScreen } from '../components/AuthScreen';

export type AssetType = 'Cash' | 'Bank Account' | 'Credit Card' | 'eWallet' | 'Savings' | 'Investment' | 'Loan';

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  dailyReminder?: boolean;
  weeklyReport?: boolean;
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
  isDeleted?: boolean;
}

export interface Transaction {
  id: string;
  type: 'pengeluaran' | 'pendapatan' | 'transfer';
  amount: number;
  category: string;
  subCategory?: string;
  date: string;
  note: string;
  assetId?: string;
  fromAssetId?: string;
  toAssetId?: string;
}

// ─── Default seed data ───────────────────────────────────────────────────────
const DEFAULT_ASSET: Asset = { id: 'default-1', name: 'Dompet Tunai', type: 'Cash', initialBalance: 0 };

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Makanan',      type: 'pengeluaran', subcategories: [{ id: 'sub-1', name: 'Makan Diluar' }, { id: 'sub-2', name: 'Groceries' }] },
  { id: 'cat-2', name: 'Transportasi', type: 'pengeluaran', subcategories: [{ id: 'sub-3', name: 'Bensin' },      { id: 'sub-4', name: 'Parkir'     }] },
  { id: 'cat-3', name: 'Hiburan',      type: 'pengeluaran', subcategories: [] },
  { id: 'cat-4', name: 'Belanja',      type: 'pengeluaran', subcategories: [] },
  { id: 'cat-5', name: 'Tagihan',      type: 'pengeluaran', subcategories: [] },
  { id: 'cat-6', name: 'Gaji',         type: 'pendapatan',  subcategories: [] },
  { id: 'cat-7', name: 'Bonus',        type: 'pendapatan',  subcategories: [] },
  { id: 'cat-8', name: 'Investasi',    type: 'pendapatan',  subcategories: [] },
];

const DEFAULT_USER: UserProfile = { name: 'Pengguna MoneyApp', email: 'pengguna@email.com' };

// ─── Context type ────────────────────────────────────────────────────────────
interface MoneyContextType {
  isReady: boolean;
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
  isPrivateMode: boolean;
  togglePrivateMode: () => void;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
}

const MoneyContext = createContext<MoneyContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export const MoneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [assets,       setAssets]       = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [user,         setUser]         = useState<UserProfile>(DEFAULT_USER);
  const [pin,          setPin]          = useState<string | null>(null);
  const [isAppLocked,  setIsAppLocked]  = useState(false);
  const [theme,        setTheme]        = useState<'light' | 'dark'>('light');
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);

  // ── Auth Listener ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthUser({}); // Mock user if not using firebase
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setAuthUser(u);
        await migrateFromIndexedDBToFirebase();
      } else {
        setAuthUser(null);
        setIsReady(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Bootstrap: migrate if needed, then load from DB ──────────────
  useEffect(() => {
    if (!authUser) return; // Block loading until authenticated
    const bootstrap = async () => {
      // One-time migration from localStorage
      await migrateFromLocalStorage();

      // Load all data from IndexedDB
      const [dbAssets, dbTxs, dbCats] = await Promise.all([
        dbGetAllAssets(),
        dbGetAllTransactions(),
        dbGetAllCategories(),
      ]);

      // Seed defaults if DB is empty
      if (dbAssets.length === 0) {
        await dbPutAsset(DEFAULT_ASSET);
        setAssets([DEFAULT_ASSET]);
      } else {
        setAssets(dbAssets);
      }

      if (dbCats.length === 0) {
        for (const c of DEFAULT_CATEGORIES) await dbPutCategory(c);
        setCategories(DEFAULT_CATEGORIES);
      } else {
        setCategories(dbCats);
      }

      setTransactions(dbTxs);

      // Load settings
      const savedUser  = await dbGetSetting('user')  as UserProfile | undefined;
      const savedPin   = await dbGetSetting('pin')   as string | undefined;
      const savedTheme = await dbGetSetting('theme') as string | undefined;
      const savedPrivacy = await dbGetSetting('isPrivateMode') as boolean | undefined;

      if (savedUser)  setUser(savedUser);
      if (savedPin)  { setPin(savedPin); setIsAppLocked(true); }
      if (savedTheme) setTheme(savedTheme as 'light' | 'dark');
      if (savedPrivacy !== undefined) setIsPrivateMode(savedPrivacy);

      setIsReady(true);
    };
    bootstrap();
  }, [authUser]);

  // ─── Apply theme ────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ─── Assets ──────────────────────────────────────────────────────────────
  const addAsset = useCallback((assetReq: Omit<Asset, 'id'>) => {
    const newAsset: Asset = { ...assetReq, id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9) };
    setAssets(prev => [...prev, newAsset]);
    dbPutAsset(newAsset);
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setAssets(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, isDeleted: true };
      dbPutAsset(updated);
      return updated;
    }));
  }, []);

  const updateAsset = useCallback((id: string, updatedAsset: Partial<Asset>) => {
    setAssets(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, ...updatedAsset };
      dbPutAsset(updated);
      return updated;
    }));
  }, []);

  // ─── Transactions ─────────────────────────────────────────────────────────
  const addTransaction = useCallback((txReq: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...txReq, id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9) };
    setTransactions(prev => [newTx, ...prev]);
    dbPutTransaction(newTx);
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
    dbDeleteTransaction(id);
  }, []);

  const updateTransaction = useCallback((id: string, updatedTx: Partial<Transaction>) => {
    setTransactions(prev => prev.map(tx => {
      if (tx.id !== id) return tx;
      const updated = { ...tx, ...updatedTx } as Transaction;
      dbPutTransaction(updated);
      return updated;
    }));
  }, []);

  // ─── Categories ───────────────────────────────────────────────────────────
  const addCategory = useCallback((catReq: Omit<Category, 'id'>) => {
    const newCat: Category = { ...catReq, id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9), subcategories: [] };
    setCategories(prev => [...prev, newCat]);
    dbPutCategory(newCat);
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    dbDeleteCategory(id);
  }, []);

  const addSubCategory = useCallback((categoryId: string, name: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      const updated = { ...c, subcategories: [...(c.subcategories || []), { id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9), name }] };
      dbPutCategory(updated);
      return updated;
    }));
  }, []);

  const deleteSubCategory = useCallback((categoryId: string, subId: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      const updated = { ...c, subcategories: (c.subcategories || []).filter(sub => sub.id !== subId) };
      dbPutCategory(updated);
      return updated;
    }));
  }, []);

  // ─── Balance ──────────────────────────────────────────────────────────────
  const getAssetBalance = useCallback((assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return 0;
    let balance = asset.initialBalance;
    transactions.forEach(tx => {
      if      (tx.type === 'pendapatan' && tx.assetId === assetId) balance += tx.amount;
      else if (tx.type === 'pengeluaran' && tx.assetId === assetId) balance -= tx.amount;
      else if (tx.type === 'transfer' && tx.fromAssetId === assetId) balance -= tx.amount;
      else if (tx.type === 'transfer' && tx.toAssetId === assetId)   balance += tx.amount;
    });
    return balance;
  }, [assets, transactions]);

  // ─── User & Settings ─────────────────────────────────────────────────────
  const updateUser = useCallback((newUser: UserProfile) => {
    setUser(newUser);
    dbPutSetting('user', newUser);
  }, []);

  const setAppPin = useCallback((newPin: string | null) => {
    setPin(newPin);
    if (newPin) dbPutSetting('pin', newPin);
    else         dbDeleteSetting('pin');
    if (!newPin) setIsAppLocked(false);
  }, []);

  const unlockApp = useCallback((enteredPin: string) => {
    if (enteredPin === pin) { setIsAppLocked(false); return true; }
    return false;
  }, [pin]);

  const lockApp = useCallback(() => { if (pin) setIsAppLocked(true); }, [pin]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      dbPutSetting('theme', next);
      return next;
    });
  }, []);

  const togglePrivateMode = useCallback(() => {
    setIsPrivateMode(prev => {
      const next = !prev;
      dbPutSetting('isPrivateMode', next);
      return next;
    });
  }, []);

  // ─── Export / Import ─────────────────────────────────────────────────────
  const exportData = useCallback(async () => {
    const data = await dbExportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneyapp-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importData = useCallback(async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    await dbImportAll(data);
    // Reload all state from DB
    const [dbAssets, dbTxs, dbCats] = await Promise.all([
      dbGetAllAssets(), dbGetAllTransactions(), dbGetAllCategories(),
    ]);
    setAssets(dbAssets);
    setTransactions(dbTxs);
    setCategories(dbCats);
    const savedUser  = await dbGetSetting('user')  as UserProfile | undefined;
    const savedTheme = await dbGetSetting('theme') as string | undefined;
    if (savedUser)  setUser(savedUser);
    if (savedTheme) setTheme(savedTheme as 'light' | 'dark');
  }, []);

  // ─── Context value ────────────────────────────────────────────────────────
  const value = useMemo(() => ({
    isReady, assets, transactions, categories, user, pin, isAppLocked, theme, isPrivateMode,
    addAsset, deleteAsset, updateAsset,
    addTransaction, deleteTransaction, updateTransaction,
    addCategory, deleteCategory, addSubCategory, deleteSubCategory,
    getAssetBalance, updateUser, setAppPin, unlockApp, lockApp, toggleTheme, togglePrivateMode,
    exportData, importData,
  }), [
    isReady, assets, transactions, categories, user, pin, isAppLocked, theme, isPrivateMode,
    addAsset, deleteAsset, updateAsset,
    addTransaction, deleteTransaction, updateTransaction,
    addCategory, deleteCategory, addSubCategory, deleteSubCategory,
    getAssetBalance, updateUser, setAppPin, unlockApp, lockApp, toggleTheme, togglePrivateMode,
    exportData, importData,
  ]);

  if (isFirebaseConfigured && !authUser) {
    return <AuthScreen />;
  }

  return (
    <MoneyContext.Provider value={value}>
      {isReady ? children : (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
          Memuat aplikasi...
        </div>
      )}
    </MoneyContext.Provider>
  );
};

export const useMoney = () => {
  const context = useContext(MoneyContext);
  if (context === undefined) throw new Error('useMoney must be used within a MoneyProvider');
  return context;
};
