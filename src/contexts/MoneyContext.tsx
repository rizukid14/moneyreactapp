import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  dbGetAllAssets, dbPutAsset,
  dbGetAllTransactions, dbPutTransaction, dbDeleteTransaction,
  dbGetAllCategories, dbPutCategory, dbDeleteCategory,
  dbGetAllBudgets, dbPutBudget, dbDeleteBudget,
  dbGetAllDebts, dbPutDebt, dbDeleteDebt,
  dbGetSetting, dbPutSetting, dbDeleteSetting,
  dbExportAll, dbImportAll,
  migrateFromLocalStorage, migrateFromIndexedDBToFirebase,
  dbGetPendingSyncCount, dbSyncPendingItems, dbForceCloudSync,
} from '../lib/db';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { AuthScreen } from '../components/AuthScreen';
import SplashScreen from '../components/SplashScreen';
import { getLocalDate, getLocalTime } from '../lib/utils';

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

export interface Budget {
  id: string;
  categoryId: string | null;
  limit: number;
  period: 'monthly';
  month: number;
  year: number;
}

export interface Debt {
  id: string;
  type: 'hutang' | 'piutang';   // hutang=I owe, piutang=they owe me
  contact: string;               // person or institution name
  description: string;
  totalAmount: number;           // original loan amount
  dueDate?: string;              // YYYY-MM-DD
  isPaid: boolean;
  createdAt: string;
  // Installment fields
  isInstallment: boolean;
  installmentAmount?: number;    // monthly payment amount
  installmentDay?: number;       // day of month e.g. 25
  totalInstallments?: number;    // total number of monthly payments
  paidInstallments: number;      // how many paid so far
  // Asset fields — two-asset model for proper balance tracking
  liabilityAssetId?: string;     // HUTANG: asset where debt lives (e.g. ShopeePay Later)
  paymentAssetId?: string;       // HUTANG: asset to pay FROM (e.g. BCA) | PIUTANG: asset used to LEND FROM (e.g. Cash)
  receiveAssetId?: string;       // PIUTANG: asset to receive payment INTO (e.g. BCA)
  sourceAssetId?: string;        // DEPRECATED - prefer paymentAssetId for simplicity; added for schema compatibility if needed
}

export interface Transaction {
  id: string;
  type: 'pengeluaran' | 'pendapatan' | 'transfer';
  amount: number;
  category: string;
  subCategory?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  note: string;
  assetId?: string;
  fromAssetId?: string;
  toAssetId?: string;
  relatedId?: string; // Links to Debt.id, etc.
}

export interface RecurringTransaction {
  id: string;
  type: 'pengeluaran' | 'pendapatan' | 'transfer';
  amount: number;
  category: string;
  subCategory?: string;
  assetId?: string;
  fromAssetId?: string;
  toAssetId?: string;
  note: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;        // YYYY-MM-DD
  lastProcessedDate?: string; // YYYY-MM-DD
  endDate?: string;          // YYYY-MM-DD (Optional stop date)
  isActive: boolean;
}

// ─── Default seed data ───────────────────────────────────────────────────────
const DEFAULT_ASSET: Asset = { id: 'default-1', name: 'Dompet Tunai', type: 'Cash', initialBalance: 0 };

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Makanan', type: 'pengeluaran', subcategories: [{ id: 'sub-1', name: 'Makan Diluar' }, { id: 'sub-2', name: 'Groceries' }] },
  { id: 'cat-2', name: 'Transportasi', type: 'pengeluaran', subcategories: [{ id: 'sub-3', name: 'Bensin' }, { id: 'sub-4', name: 'Parkir' }] },
  { id: 'cat-3', name: 'Hiburan', type: 'pengeluaran', subcategories: [] },
  { id: 'cat-4', name: 'Belanja', type: 'pengeluaran', subcategories: [] },
  { id: 'cat-5', name: 'Tagihan', type: 'pengeluaran', subcategories: [] },
  { id: 'cat-6', name: 'Gaji', type: 'pendapatan', subcategories: [] },
  { id: 'cat-7', name: 'Bonus', type: 'pendapatan', subcategories: [] },
  { id: 'cat-8', name: 'Investasi', type: 'pendapatan', subcategories: [] },
];

const DEFAULT_USER: UserProfile = { name: 'Pengguna MoneyApp', email: 'pengguna@email.com' };

// ─── Context type ────────────────────────────────────────────────────────────
interface MoneyContextType {
  isReady: boolean;
  assets: Asset[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  debts: Debt[];
  recurringTransactions: RecurringTransaction[];
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
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, budget: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addDebt: (debt: Omit<Debt, 'id'>, initialMode?: 'none' | 'cash' | 'credit', categoryName?: string, subCategoryName?: string) => void;
  updateDebt: (id: string, debt: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addRecurringTransaction: (rt: Omit<RecurringTransaction, 'id'>) => void;
  updateRecurringTransaction: (id: string, rt: Partial<RecurringTransaction>) => void;
  deleteRecurringTransaction: (id: string) => void;
  payInstallment: (debtId: string) => void;
  settleDebt: (debtId: string, assetId?: string, date?: string, time?: string) => void;
  addDebtPayment: (debtId: string, amount: number, assetId: string, date: string, time: string, note: string) => void;
  addDebtPrincipal: (debtId: string, amount: number, assetId: string, date: string, time: string, note: string) => void;
  getAssetBalance: (assetId: string) => number;
  updateUser: (user: UserProfile) => void;
  setAppPin: (newPin: string | null) => void;
  unlockApp: (enteredPin: string) => boolean;
  lockApp: () => void;
  toggleTheme: () => void;
  isPrivateMode: boolean;
  togglePrivateMode: () => void;
  defaultAssetId: string | null;
  setDefaultAssetId: (id: string | null) => void;
  startOfMonthDay: number;
  setStartOfMonthDay: (day: number) => void;
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;
  defaultTransactionGrouping: 'date' | 'category';
  setDefaultTransactionGrouping: (grouping: 'date' | 'category') => void;
  assetCarouselCards: string[];
  setAssetCarouselCards: (cards: string[]) => void;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
  logOut: () => Promise<void>;
  pendingSyncCount: number;
  syncData: () => Promise<{ success: number; failed: number }>;
  pullFromCloud: () => Promise<{ total: number }>;
}

const MoneyContext = createContext<MoneyContextType | undefined>(undefined);

// Module-level dedup guard: prevents React StrictMode double-invoking the
// setDebts updater from generating 2 transactions for the same installment payment.
const _paidInstallmentKeys = new Set<string>();

// ─── Provider ────────────────────────────────────────────────────────────────
export const MoneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [pin, setPin] = useState<string | null>(null);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [defaultAssetId, setDefaultAssetIdState] = useState<string | null>(null);
  const [startOfMonthDay, setStartOfMonthDayState] = useState<number>(1);
  const [currencySymbol, setCurrencySymbolState] = useState<string>('Rp');
  const [defaultTransactionGrouping, setDefaultTransactionGroupingState] = useState<'date' | 'category'>('date');
  const [authUser, setAuthUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(!isFirebaseConfigured);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [assetCarouselCards, setAssetCarouselCardsState] = useState<string[]>(['net_worth']);

  // ─── Auth Listener ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthUser({}); // Mock user if not using firebase
      setAuthChecked(true);
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
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // ── Bootstrap: migrate if needed, then load from IndexedDB ──────────────
  useEffect(() => {
    if (!authUser) return; // Block loading until authenticated
    const bootstrap = async () => {
      // One-time migration from localStorage
      await migrateFromLocalStorage();

      // Load all data from IndexedDB
      const [dbAssets, dbTxs, dbCats, dbBudgets, dbDebts, dbRecurring] = await Promise.all([
        dbGetAllAssets(),
        dbGetAllTransactions(),
        dbGetAllCategories(),
        dbGetAllBudgets(),
        dbGetAllDebts(),
        import('../lib/db').then(m => m.dbGetAllRecurringTransactions())
      ]);
      setRecurringTransactions(dbRecurring);

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

      setBudgets(dbBudgets);
      setDebts(dbDebts as Debt[]);
      setTransactions(dbTxs);

      // Load settings
      let profile = await dbGetSetting('user') as UserProfile | undefined;
      const savedPin = await dbGetSetting('pin') as string | undefined;
      const savedTheme = await dbGetSetting('theme') as string | undefined;
      const savedPrivacy = await dbGetSetting('isPrivateMode') as boolean | undefined;
      const savedDefaultAssetId = await dbGetSetting('defaultAssetId') as string | undefined;
      const savedStartMonth = await dbGetSetting('startOfMonthDay') as number | undefined;
      const savedCurrency = await dbGetSetting('currencySymbol') as string | undefined;
      const savedGrouping = await dbGetSetting('defaultTransactionGrouping') as 'date' | 'category' | undefined;

      // Auto-fill profile from Firebase Auth if empty or default
      if (isFirebaseConfigured && auth.currentUser) {
        const u = auth.currentUser;
        if (!profile || profile.name === 'Pengguna MoneyApp' || profile.email === 'pengguna@email.com') {
          profile = {
            name: u.displayName || profile?.name || 'Pengguna MoneyApp',
            email: u.email || profile?.email || '',
            avatar: u.photoURL || profile?.avatar || ''
          };
          await dbPutSetting('user', profile);
        }
      }

      if (profile) setUser(profile);
      if (savedPin) { setPin(savedPin); setIsAppLocked(true); }
      if (savedTheme) {
        setTheme(savedTheme as 'light' | 'dark');
        try { localStorage.setItem('moneyapp-theme', savedTheme); } catch {}
      }
      if (savedPrivacy !== undefined) setIsPrivateMode(savedPrivacy);
      if (savedDefaultAssetId) setDefaultAssetIdState(savedDefaultAssetId);
      if (savedStartMonth) setStartOfMonthDayState(savedStartMonth);
      if (savedCurrency) setCurrencySymbolState(savedCurrency);
      if (savedGrouping) setDefaultTransactionGroupingState(savedGrouping);
      const savedCarousel = await dbGetSetting('assetCarouselCards') as string[] | undefined;
      if (savedCarousel && Array.isArray(savedCarousel) && savedCarousel.length > 0) setAssetCarouselCardsState(savedCarousel);

      // --- Migration: budgets collection -> settings/budgets ---
      if (isFirebaseConfigured && auth.currentUser) {
        const isMigrated = await dbGetSetting('budgets_migrated_to_settings');
        if (!isMigrated) {
          try {
            const oldCollection = collection(firestore, 'users', auth.currentUser.uid, 'budgets');
            const snapshot = await getDocs(oldCollection);
            if (!snapshot.empty) {
              const oldBudgets = snapshot.docs.map(d => d.data());
              await dbPutSetting('budgets', oldBudgets);
              // Clean up old collection
              const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
              await Promise.all(deletePromises);
            }
            await dbPutSetting('budgets_migrated_to_settings', true);
          } catch (e) { console.error('[Migration] Budgets failed:', e); }
        }
      }

      setIsReady(true);
    };
    bootstrap();
  }, [authUser]);

  // ─── Apply theme ────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ─── Sync Status ────────────────────────────────────────────────────────
  const refreshSyncCount = useCallback(async () => {
    const count = await dbGetPendingSyncCount();
    console.log('[MoneyContext] Updating pending sync count:', count);
    setPendingSyncCount(count);
  }, []);

  useEffect(() => {
    if (isReady) {
      refreshSyncCount();
      // Poll sync count every 10 seconds to catch background retry successes
      const interval = setInterval(refreshSyncCount, 10000);
      return () => clearInterval(interval);
    }
  }, [isReady, transactions, assets, debts, refreshSyncCount]);

  const syncData = useCallback(async () => {
    const results = await dbSyncPendingItems();
    if (results.success > 0) {
      // Reload data if anything was synced
      const [dbAssets, dbTxs, dbCats, dbBudgets, dbDebts] = await Promise.all([
        dbGetAllAssets(), dbGetAllTransactions(), dbGetAllCategories(), dbGetAllBudgets(), dbGetAllDebts(),
      ]);
      setAssets(dbAssets);
      setTransactions(dbTxs);
      setCategories(dbCats);
      setBudgets(dbBudgets);
      setDebts(dbDebts as Debt[]);
    }
    await refreshSyncCount();
    return results;
  }, [refreshSyncCount]);

  // ─── Assets ──────────────────────────────────────────────────────────────
  const addAsset = useCallback((assetReq: Omit<Asset, 'id'>) => {
    const newAsset: Asset = { ...assetReq, id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9) };
    setAssets(prev => [...prev, newAsset]);
    dbPutAsset(newAsset).then(refreshSyncCount);
  }, [refreshSyncCount]);

  const deleteAsset = useCallback((id: string) => {
    setAssets(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, isDeleted: true };
      dbPutAsset(updated).then(refreshSyncCount);
      return updated;
    }));
  }, []);

  const updateAsset = useCallback((id: string, updatedAsset: Partial<Asset>) => {
    setAssets(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, ...updatedAsset };
      dbPutAsset(updated).then(refreshSyncCount);
      return updated;
    }));
  }, []);

  // ─── Transactions ─────────────────────────────────────────────────────────
  const addTransaction = useCallback((txReq: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { 
      ...txReq, 
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
      time: txReq.time || getLocalTime()
    };
    setTransactions(prev => [newTx, ...prev]);
    dbPutTransaction(newTx).then(refreshSyncCount);
  }, [refreshSyncCount]);

  const deleteTransaction = useCallback((id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    setTransactions(prev => prev.filter(tx => tx.id !== id));
    dbDeleteTransaction(id).then(refreshSyncCount);

    if (txToDelete && txToDelete.relatedId) {
      setDebts(prev => prev.map(d => {
        if (d.id !== txToDelete.relatedId) return d;

        const isPrincipal = (txToDelete.note.includes('Penerimaan dana pinjaman') ||
          txToDelete.note.includes('Pemberian pinjaman') ||
          txToDelete.note.includes('Belanja via'));

        if (isPrincipal) return d;

        const nextPaid = Math.max(0, (d.paidInstallments || 0) - 1);
        const updated = {
          ...d,
          paidInstallments: d.isInstallment ? nextPaid : d.paidInstallments,
          isPaid: false
        };
        dbPutDebt(updated);
        return updated;
      }));
    }
  }, [transactions, refreshSyncCount]);

  const updateTransaction = useCallback((id: string, updatedTx: Partial<Transaction>) => {
    setTransactions(prev => prev.map(tx => {
      if (tx.id !== id) return tx;
      const updated = { ...tx, ...updatedTx } as Transaction;
      dbPutTransaction(updated).then(refreshSyncCount);
      return updated;
    }));
  }, []);

  // ─── Categories ───────────────────────────────────────────────────────────
  const addCategory = useCallback((catReq: Omit<Category, 'id'>) => {
    const newCat: Category = { ...catReq, id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9), subcategories: [] };
    setCategories(prev => [...prev, newCat]);
    dbPutCategory(newCat).then(refreshSyncCount);
  }, [refreshSyncCount]);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    dbDeleteCategory(id).then(refreshSyncCount);
  }, [refreshSyncCount]);

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

  // ─── Budgets ──────────────────────────────────────────────────────────────
  const addBudget = useCallback((budgetReq: Omit<Budget, 'id'>) => {
    const newBudget: Budget = { ...budgetReq, id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9) };
    setBudgets(prev => [...prev, newBudget]);
    dbPutBudget(newBudget).then(refreshSyncCount);
  }, [refreshSyncCount]);

  const updateBudget = useCallback((id: string, updatedBudget: Partial<Budget>) => {
    setBudgets(prev => prev.map(b => {
      if (b.id !== id) return b;
      const updated = { ...b, ...updatedBudget } as Budget;
      dbPutBudget(updated);
      return updated;
    }));
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    dbDeleteBudget(id);
  }, []);

  // ─── Debts ──────────────────────────────────────────────────────────────
  const addDebt = useCallback((debtReq: Omit<Debt, 'id'>, initialMode: 'none' | 'cash' | 'credit' = 'none', categoryName?: string, subCategoryName?: string) => {
    const newDebt: Debt = { ...debtReq, id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9) };

    // Generate initial transaction for the principal
    const today = getLocalDate();
    const time = getLocalTime();

    if (newDebt.type === 'piutang') {
      // Give loan: Account balance decreases (Expense)
      if (newDebt.paymentAssetId) {
        _createTx({
          type: 'pengeluaran',
          amount: newDebt.totalAmount,
          category: 'Pinjaman & Piutang',
          date: today,
          time,
          note: `Pemberian pinjaman (Piutang) kepada ${newDebt.contact}`,
          assetId: newDebt.paymentAssetId,
          relatedId: newDebt.id,
        });
      }
    } else {
      // Hutang (Saya Berhutang)
      if (initialMode === 'cash' && newDebt.liabilityAssetId) {
        // Receive loan principal: Account balance increases (Income)
        _createTx({
          type: 'pendapatan',
          amount: newDebt.totalAmount,
          category: 'Hutang / Pinjaman',
          date: today,
          time,
          note: `Penerimaan dana pinjaman dari ${newDebt.contact}`,
          assetId: newDebt.liabilityAssetId,
          relatedId: newDebt.id,
        });
      } else if (initialMode === 'credit' && newDebt.liabilityAssetId) {
        // Credit/Paylater purchase: Account balance decreases (Expense)
        _createTx({
          type: 'pengeluaran',
          amount: newDebt.totalAmount,
          category: categoryName || 'Lainnya',
          subCategory: subCategoryName,
          date: today,
          time,
          note: `Belanja via ${newDebt.contact}: ${newDebt.description || 'Hutang Kredit'}`,
          assetId: newDebt.liabilityAssetId,
          relatedId: newDebt.id,
        });
      }
    }

    setDebts(prev => [...prev, newDebt]);
    dbPutDebt(newDebt).then(refreshSyncCount);
  }, [refreshSyncCount]);

  const updateDebt = useCallback((id: string, updatedDebt: Partial<Debt>) => {
    setDebts(prev => prev.map(d => {
      if (d.id !== id) return d;
      const updated = { ...d, ...updatedDebt } as Debt;
      dbPutDebt(updated);
      return updated;
    }));
  }, []);

  const deleteDebt = useCallback((id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    dbDeleteDebt(id).then(refreshSyncCount);
  }, [refreshSyncCount]);

  /** Create a transaction record and push it to state + DB */
  const _createTx = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { 
      ...tx, 
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
      time: tx.time || getLocalTime()
    };
    setTransactions(prev => [newTx, ...prev]);
    dbPutTransaction(newTx);
  };

  // ─── Recurring Transactions ───────────────────────────────────────────────
  const addRecurringTransaction = useCallback((rtReq: Omit<RecurringTransaction, 'id'>) => {
    import('../lib/db').then(m => {
      const newRT: RecurringTransaction = { ...rtReq, id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9) };
      setRecurringTransactions(prev => [...prev, newRT]);
      m.dbPutRecurringTransaction(newRT);
    });
  }, []);

  const updateRecurringTransaction = useCallback((id: string, updated: Partial<RecurringTransaction>) => {
    import('../lib/db').then(m => {
      setRecurringTransactions(prev => prev.map(rt => {
        if (rt.id !== id) return rt;
        const next = { ...rt, ...updated };
        m.dbPutRecurringTransaction(next);
        return next;
      }));
    });
  }, []);

  const deleteRecurringTransaction = useCallback((id: string) => {
    import('../lib/db').then(m => {
      setRecurringTransactions(prev => prev.filter(rt => rt.id !== id));
      m.dbDeleteRecurringTransaction(id);
    });
  }, []);



  /**
   * Pay one installment. Generates the correct transaction type:
   * - HUTANG: Transfer from paymentAssetId (BCA) → liabilityAssetId (ShopeePay Later)
   * - PIUTANG: Pendapatan into receiveAssetId (BCA)
   */
  const payInstallment = useCallback((debtId: string) => {
    setDebts(prev => {
      const debt = prev.find(d => d.id === debtId);
      if (!debt || !debt.isInstallment) return prev;

      const nextPaid = (debt.paidInstallments || 0) + 1;
      const isPaid = debt.totalInstallments ? nextPaid >= debt.totalInstallments : false;
      const updated: Debt = { ...debt, paidInstallments: nextPaid, isPaid };
      dbPutDebt(updated);

      const txKey = `${debtId}-${nextPaid}`;
      if (!_paidInstallmentKeys.has(txKey)) {
        _paidInstallmentKeys.add(txKey);
        const today = getLocalDate();
        const time = getLocalTime();
        const amt = debt.installmentAmount || 0;
        const note = `Cicilan ${debt.contact} (${nextPaid}/${debt.totalInstallments || '?'})`;

        if (debt.type === 'hutang') {
          // Bayar hutang: Transfer dari paymentAssetId → liabilityAssetId
          _createTx({
            type: 'transfer',
            amount: amt,
            category: 'Transfer',
            date: today,
            time,
            note,
            fromAssetId: debt.paymentAssetId,
            toAssetId: debt.liabilityAssetId,
            relatedId: debtId,
          });
        } else {
          // Terima pembayaran piutang: Pendapatan masuk ke receiveAssetId
          _createTx({
            type: 'pendapatan',
            amount: amt,
            category: 'Pelunasan Piutang',
            date: today,
            time,
            note,
            assetId: debt.receiveAssetId,
            relatedId: debtId,
          });
        }
      }

      return prev.map(d => d.id === debtId ? updated : d);
    });
  }, []);

  const settleDebt = useCallback((debtId: string, overrideAssetId?: string, overrideDate?: string, overrideTime?: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt || debt.isPaid) return;

    const txKey = `settle-${debtId}`;
    if (!_paidInstallmentKeys.has(txKey)) {
      _paidInstallmentKeys.add(txKey);
      const today = overrideDate || getLocalDate();
      const time = overrideTime || getLocalTime();
      const paidSoFar = debt.isInstallment ? (debt.paidInstallments * (debt.installmentAmount || 0)) : 0;
      const remaining = Math.max(0, debt.totalAmount - paidSoFar);
      const note = `Pelunasan ${debt.type === 'hutang' ? 'hutang' : 'piutang'} - ${debt.contact}`;

      if (remaining > 0) {
        if (debt.type === 'hutang') {
          if (debt.liabilityAssetId) {
            _createTx({
              type: 'transfer',
              amount: remaining,
              category: 'Transfer',
              date: today,
              time,
              note,
              fromAssetId: overrideAssetId || debt.paymentAssetId,
              toAssetId: debt.liabilityAssetId,
              relatedId: debtId,
            });
          } else {
            _createTx({
              type: 'pengeluaran',
              amount: remaining,
              category: 'Bayar Hutang',
              date: today,
              time,
              note,
              assetId: overrideAssetId || debt.paymentAssetId,
              relatedId: debtId,
            });
          }
        } else {
          _createTx({
            type: 'pendapatan',
            amount: remaining,
            category: 'Pelunasan Piutang',
            date: today,
            time,
            note,
            assetId: overrideAssetId || debt.receiveAssetId,
            relatedId: debtId,
          });
        }
      }
    }

    const updated: Debt = {
      ...debt,
      isPaid: true,
      paidInstallments: debt.isInstallment && debt.totalInstallments ? debt.totalInstallments : debt.paidInstallments
    };
    dbPutDebt(updated);
    setDebts(prev => prev.map(d => d.id === debtId ? updated : d));
  }, [debts]);

  const addDebtPayment = useCallback((debtId: string, amount: number, assetId: string, date: string, time: string, note: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    if (debt.type === 'hutang') {
      if (debt.liabilityAssetId) {
        _createTx({
          type: 'transfer',
          amount,
          category: 'Transfer',
          date,
          time,
          note,
          fromAssetId: assetId,
          toAssetId: debt.liabilityAssetId,
          relatedId: debtId,
        });
      } else {
        _createTx({
          type: 'pengeluaran',
          amount,
          category: 'Bayar Hutang',
          date,
          time,
          note,
          assetId: assetId,
          relatedId: debtId,
        });
      }
    } else {
      _createTx({
        type: 'pendapatan',
        amount,
        category: 'Pelunasan Piutang',
        date,
        time,
        note,
        assetId,
        relatedId: debtId,
      });
    }

    const nextPaid = (debt.paidInstallments || 0) + 1;
    const isPaid = debt.isInstallment && debt.totalInstallments ? nextPaid >= debt.totalInstallments : false;

    const updatedDebt = {
      ...debt,
      paidInstallments: debt.isInstallment ? nextPaid : debt.paidInstallments,
      isPaid
    };

    dbPutDebt(updatedDebt);
    setDebts(prev => prev.map(d => d.id === debtId ? updatedDebt : d));
  }, [debts]);

  const addDebtPrincipal = useCallback((debtId: string, amount: number, assetId: string, date: string, time: string, note: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    if (debt.type === 'hutang') {
      _createTx({
        type: 'pendapatan',
        amount,
        category: 'Penerimaan dana pinjaman',
        date,
        time,
        note,
        assetId: assetId || undefined,
        relatedId: debtId,
      });
    } else {
      _createTx({
        type: 'pengeluaran',
        amount,
        category: 'Pemberian pinjaman',
        date,
        time,
        note,
        assetId: assetId || undefined,
        relatedId: debtId,
      });
    }

    const updatedDebt = {
      ...debt,
      totalAmount: debt.totalAmount + amount,
      isPaid: false
    };

    dbPutDebt(updatedDebt);
    setDebts(prev => prev.map(d => d.id === debtId ? updatedDebt : d));
  }, [debts]);


  // ─── Balance ──────────────────────────────────────────────────────────────
  const getAssetBalance = useCallback((assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return 0;
    let balance = asset.initialBalance;
    transactions.forEach(tx => {
      if (tx.type === 'pendapatan' && tx.assetId === assetId) balance += tx.amount;
      else if (tx.type === 'pengeluaran' && tx.assetId === assetId) balance -= tx.amount;
      else if (tx.type === 'transfer' && tx.fromAssetId === assetId) balance -= tx.amount;
      else if (tx.type === 'transfer' && tx.toAssetId === assetId) balance += tx.amount;
    });
    return balance;
  }, [assets, transactions]);

  // ─── User & Settings ─────────────────────────────────────────────────────
  const updateUser = useCallback((newUser: UserProfile) => {
    setUser(newUser);
    dbPutSetting('user', newUser).then(refreshSyncCount);
  }, [refreshSyncCount]);

  const setAppPin = useCallback((newPin: string | null) => {
    setPin(newPin);
    if (newPin) dbPutSetting('pin', newPin);
    else dbDeleteSetting('pin');
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
      try { localStorage.setItem('moneyapp-theme', next); } catch {}
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

  const setDefaultAssetId = useCallback((id: string | null) => {
    setDefaultAssetIdState(id);
    dbPutSetting('defaultAssetId', id);
  }, []);

  const setStartOfMonthDay = useCallback((day: number) => {
    setStartOfMonthDayState(day);
    dbPutSetting('startOfMonthDay', day);
  }, []);

  const setCurrencySymbol = useCallback((symbol: string) => {
    setCurrencySymbolState(symbol);
    dbPutSetting('currencySymbol', symbol);
  }, []);

  const setDefaultTransactionGrouping = useCallback((grouping: 'date' | 'category') => {
    setDefaultTransactionGroupingState(grouping);
    dbPutSetting('defaultTransactionGrouping', grouping);
  }, []);

  const setAssetCarouselCards = useCallback((cards: string[]) => {
    setAssetCarouselCardsState(cards);
    dbPutSetting('assetCarouselCards', cards);
  }, []);

  // ─── Export / Import ─────────────────────────────────────────────────────
  const exportData = useCallback(async () => {
    const data = await dbExportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneyapp-backup-${getLocalDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importData = useCallback(async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    await dbImportAll(data);
    // Reload all state from DB
    const [dbAssets, dbTxs, dbCats, dbBudgets] = await Promise.all([
      dbGetAllAssets(), dbGetAllTransactions(), dbGetAllCategories(), dbGetAllBudgets(),
    ]);
    setAssets(dbAssets);
    setTransactions(dbTxs);
    setCategories(dbCats);
    setBudgets(dbBudgets);
    const savedUser = await dbGetSetting('user') as UserProfile | undefined;
    const savedTheme = await dbGetSetting('theme') as string | undefined;
    if (savedUser) setUser(savedUser);
    if (savedTheme) setTheme(savedTheme as 'light' | 'dark');
  }, []);

  const logOut = useCallback(async () => {
    if (isFirebaseConfigured) {
      await signOut(auth);
    }
  }, []);

  /**
   * Pull all data from Firestore into IndexedDB, then reload state.
   * Use this as the "Sync from Cloud" / "Pull from Cloud" action.
   * Only needed when the user wants to see data added on another device.
   */
  const pullFromCloud = useCallback(async () => {
    const result = await dbForceCloudSync();
    if (result.total > 0) {
      // Reload all state from IDB (which now has the fresh cloud data)
      const [dbAssets, dbTxs, dbCats, dbBudgets, dbDebts, dbRec] = await Promise.all([
        dbGetAllAssets(), dbGetAllTransactions(), dbGetAllCategories(),
        dbGetAllBudgets(), dbGetAllDebts(),
        import('../lib/db').then(m => m.dbGetAllRecurringTransactions())
      ]);
      setAssets(dbAssets);
      setTransactions(dbTxs);
      setCategories(dbCats);
      setBudgets(dbBudgets);
      setDebts(dbDebts as Debt[]);
      setRecurringTransactions(dbRec);
      await refreshSyncCount();
    }
    return result;
  }, [refreshSyncCount]);

  // ─── Context value ────────────────────────────────────────────────────────
  const value = useMemo(() => ({
    isReady, assets, transactions, categories, budgets, debts,
    recurringTransactions, addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction,
    user, pin, isAppLocked, theme, isPrivateMode, defaultAssetId, setDefaultAssetId,
    startOfMonthDay, setStartOfMonthDay, currencySymbol, setCurrencySymbol, defaultTransactionGrouping, setDefaultTransactionGrouping,
    assetCarouselCards, setAssetCarouselCards,
    addAsset, deleteAsset, updateAsset,
    addTransaction, deleteTransaction, updateTransaction,
    addCategory, deleteCategory, addSubCategory, deleteSubCategory,
    addBudget, updateBudget, deleteBudget,
    addDebt, updateDebt, deleteDebt, payInstallment, settleDebt, addDebtPayment, addDebtPrincipal,
    getAssetBalance, updateUser, setAppPin, unlockApp, lockApp, toggleTheme, togglePrivateMode,
    exportData, importData, logOut, pendingSyncCount, syncData, pullFromCloud,
  }), [
    isReady, assets, transactions, categories, budgets, debts,
    recurringTransactions, addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction,
    user, pin, isAppLocked, theme, isPrivateMode, defaultAssetId, setDefaultAssetId,
    startOfMonthDay, setStartOfMonthDay, currencySymbol, setCurrencySymbol, defaultTransactionGrouping, setDefaultTransactionGrouping,
    assetCarouselCards, setAssetCarouselCards,
    addAsset, deleteAsset, updateAsset,
    addTransaction, deleteTransaction, updateTransaction,
    addCategory, deleteCategory, addSubCategory, deleteSubCategory,
    addBudget, updateBudget, deleteBudget,
    addDebt, updateDebt, deleteDebt, payInstallment, settleDebt, addDebtPayment, addDebtPrincipal,
    getAssetBalance, updateUser, setAppPin, unlockApp, lockApp, toggleTheme, togglePrivateMode,
    exportData, importData, logOut, pendingSyncCount, syncData, pullFromCloud,
  ]);

  // Show splash screen while checking auth state or loading data
  if (!authChecked || (authUser && !isReady)) {
    return <SplashScreen />;
  }

  if (isFirebaseConfigured && !authUser) {
    return <AuthScreen />;
  }

  return (
    <MoneyContext.Provider value={value}>
      {children}
    </MoneyContext.Provider>
  );
};

export const useMoney = () => {
  const context = useContext(MoneyContext);
  if (context === undefined) throw new Error('useMoney must be used within a MoneyProvider');
  return context;
};
