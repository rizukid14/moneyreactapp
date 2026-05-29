import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  dbGetAllAssets, dbPutAsset,
  dbGetAllTransactions, dbPutTransaction, dbDeleteTransaction,
  dbGetAllCategories, dbPutCategory,
  dbGetAllBudgets, dbPutBudget, dbDeleteBudget,
  dbGetAllDebts, dbPutDebt, dbDeleteDebt,
  dbGetAllGoals, dbPutGoal, dbDeleteGoal,
  dbGetSetting, dbPutSetting, dbDeleteSetting,
  dbGetAllTrips, dbPutTrip, dbDeleteTrip,
  dbGetAllTripExpenses, dbPutTripExpense, dbDeleteTripExpense,
  dbGetAllMonthlyIncomes, dbPutMonthlyIncome, dbDeleteMonthlyIncome,
  dbGetAllBudgetReallocations, dbPutBudgetReallocation, dbDeleteBudgetReallocation,
  dbExportAll, dbImportAll,
  migrateFromLocalStorage, migrateFromIndexedDBToFirebase,
  dbGetPendingSyncCount, dbSyncPendingItems, dbForceCloudSync, localDbGetSetting, localDbPutSetting,
} from '../lib/db';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { AuthScreen } from '../components/AuthScreen';
import SplashScreen from '../components/SplashScreen';
import { getLocalDate, getLocalTime, generateId, isPrincipalTx, hashPin } from '../lib/utils';

export type AssetType = 'Cash' | 'Bank Account' | 'Credit Card' | 'eWallet' | 'Savings' | 'Investment' | 'Loan';
export type BudgetMode = 'regular' | 'zero-based';

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
  isDeleted?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'pengeluaran' | 'pendapatan';
  subcategories?: SubCategory[];
  isDeleted?: boolean;
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
  date: string;                  // Occurrence date (YYYY-MM-DD)
  createdAt: string;
  // Interest fields
  principalAmount?: number;      // Original loan amount without interest
  interestType?: 'fixed' | 'percentage';
  interestRate?: number;         // percentage value
  interestAmount?: number;       // calculated or fixed interest amount
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
  tripId?: string; // Link to trip
  relatedId?: string; // General link to related items (e.g. TripExpense)
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string; // YYYY-MM-DD
  createdAt: string;
  assetId?: string;
  isCompleted: boolean;
  recurringTransactionId?: string;
}

export interface TripMember {
  id: string;
  name: string;
}

export interface TripExpenseSplit {
  memberId: string;
  amount: number;
}

export interface TripExpenseItem {
  id: string;
  name: string;
  amount: number;
  assignments: string[]; // memberIds
}

export interface TripExpense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  payerId: string; // memberId
  splits: TripExpenseSplit[];
  items?: TripExpenseItem[];
  date: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  members: TripMember[];
  isSettled: boolean;
  settlementMode?: 'simple' | 'detailed';
  paidSettlements?: string[];
  settlementPaidAmounts?: Record<string, number>;
  createdAt: string;
}

export interface MonthlyIncome {
  id: string; // format: "YYYY-MM"
  month: number;
  year: number;
  amount: number;
  isLocked: boolean;
  createdAt: number;
}

export interface BudgetReallocation {
  id: string;
  month: number;
  year: number;
  fromCategoryId: string | 'unassigned';
  toCategoryId: string | 'unassigned';
  amount: number;
  date: string; // ISO String
}

export interface Transaction {
  id: string;
  type: 'pengeluaran' | 'pendapatan' | 'transfer' | 'piutang_keluar' | 'piutang_masuk' | 'hutang_masuk' | 'hutang_keluar';
  amount: number;
  category: string;
  subCategory?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  note: string;
  description?: string;
  assetId?: string;
  fromAssetId?: string;
  toAssetId?: string;
  relatedId?: string; // Links to Debt.id, etc.
  goalId?: string; // Links to Goal.id
}

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  note?: string;
}

export interface RecurringTransaction {
  id: string;
  type: Transaction['type'];
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
  goalId?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string; // YYYY-MM-DD
  category: string;
  icon?: string;
  assetId: string;
  isActive: boolean;
  note?: string;
  recurringTransactionId?: string;
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
  goals: Goal[];
  contacts: Contact[];
  recurringTransactions: RecurringTransaction[];
  subscriptions: Subscription[];
  trips: Trip[];
  tripExpenses: TripExpense[];
  user: UserProfile;
  pin: string | null;
  isAppLocked: boolean;
  setIsAppLocked: (v: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
  theme: 'light' | 'dark';
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  deleteAsset: (id: string) => void;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Transaction;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  addCategory: (cat: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  updateCategory: (id: string, name: string) => void;
  addSubCategory: (categoryId: string, name: string) => void;
  deleteSubCategory: (categoryId: string, subId: string) => void;
  updateSubCategory: (categoryId: string, subId: string, name: string) => void;
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, budget: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addDebt: (debt: Omit<Debt, 'id'>, initialMode?: 'none' | 'cash' | 'credit', categoryName?: string, subCategoryName?: string) => void;
  updateDebt: (id: string, debt: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  addContact: (contact: Omit<Contact, 'id'>) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  addRecurringTransaction: (rt: Omit<RecurringTransaction, 'id'>) => RecurringTransaction;
  updateRecurringTransaction: (id: string, rt: Partial<RecurringTransaction>) => void;
  deleteRecurringTransaction: (id: string) => void;
  addSubscription: (sub: Omit<Subscription, 'id'>) => Subscription;
  updateSubscription: (id: string, sub: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  addTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => Promise<void>;
  updateTrip: (id: string, trip: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  addTripExpense: (expense: Omit<TripExpense, 'id' | 'createdAt'>) => Promise<TripExpense>;
  updateTripExpense: (id: string, expense: Partial<TripExpense>) => Promise<void>;
  deleteTripExpense: (id: string) => Promise<void>;
  payInstallment: (debtId: string) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'isCompleted'>) => Goal;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  settleDebt: (debtId: string, assetId?: string, date?: string, time?: string, amount?: number) => void;
  addDebtPayment: (debtId: string, amount: number, assetId: string, date: string, time: string, note: string) => void;
  addDebtPrincipal: (debtId: string, amount: number, assetId: string, date: string, time: string, note: string) => void;
  offsetDebt: (contactName: string, customDate?: string) => void;
  getAssetBalance: (assetId: string) => number;
  updateUser: (user: UserProfile) => void;
  setAppPin: (newPin: string | null) => Promise<void>;
  unlockApp: (enteredPin: string) => Promise<boolean>;
  lockApp: () => void;
  toggleTheme: () => void;
  isPrivateMode: boolean;
  togglePrivateMode: () => void;
  defaultAssetId: string | null;
  setDefaultAssetId: (id: string | null) => void;
  startOfMonthDay: number;
  setStartOfMonthDay: (day: number) => void;
  showDebtInTransactions: boolean;
  setShowDebtInTransactions: (show: boolean) => void;
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;
  defaultTransactionGrouping: 'date' | 'category';
  setDefaultTransactionGrouping: (grouping: 'date' | 'category') => void;
  assetCarouselCards: string[];
  setAssetCarouselCards: (cards: string[]) => void;
  statsCarouselCards: string[];
  setStatsCarouselCards: (cards: string[]) => void;
  defaultStatsView: string;
  setDefaultStatsView: (viewId: string) => void;
  chartStyle: 'area' | 'line';
  setChartStyle: (style: 'area' | 'line') => void;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
  logOut: () => Promise<void>;
  pendingSyncCount: number;
  syncData: () => Promise<{ success: number; failed: number; error?: string }>;
  pullFromCloud: () => Promise<{ total: number }>;
  autoCloudSync: { status: 'idle' | 'pulling' | 'success' | 'error'; total?: number; message?: string };
  budgetMode: BudgetMode;
  setBudgetMode: (mode: BudgetMode) => void;
  zbbMode: 'flexible' | 'strict';
  setZbbMode: (mode: 'flexible' | 'strict') => void;
  monthlyIncome: number; // legacy global
  setMonthlyIncome: (income: number) => void;
  monthlyIncomes: MonthlyIncome[];
  setMonthIncome: (month: number, year: number, amount: number, isLocked: boolean) => void;
  deleteMonthIncome: (id: string) => void;
  budgetReallocations: BudgetReallocation[];
  addBudgetReallocation: (realloc: Omit<BudgetReallocation, 'id' | 'date'>) => void;
  deleteBudgetReallocation: (id: string) => void;
  moveBudgetMoney: (fromCategoryId: string | null, toCategoryId: string | null, amount: number, month: number, year: number) => void;
  validateTransactionBudget: (tx: Partial<Transaction>) => { isValid: boolean; deficitCategory: string | null; deficitAmount: number };
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripExpenses, setTripExpenses] = useState<TripExpense[]>([]);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [pin, setPin] = useState<string | null>(null);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [defaultAssetId, setDefaultAssetIdState] = useState<string | null>(null);
  const [startOfMonthDay, setStartOfMonthDayState] = useState<number>(1);
  const [showDebtInTransactions, setShowDebtInTransactionsState] = useState<boolean>(true);
  const [currencySymbol, setCurrencySymbolState] = useState<string>('Rp');
  const [defaultTransactionGrouping, setDefaultTransactionGroupingState] = useState<'date' | 'category'>('date');
  const [authUser, setAuthUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(!isFirebaseConfigured);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [autoCloudSync, setAutoCloudSync] = useState<{ status: 'idle' | 'pulling' | 'success' | 'error'; total?: number; message?: string }>({ status: 'idle' });
  const [assetCarouselCards, setAssetCarouselCardsState] = useState<string[]>(['net_worth']);
  const [statsCarouselCards, setStatsCarouselCardsState] = useState<string[]>(['all', 'cash_bank', 'health']);
  const [defaultStatsView, setDefaultStatsViewState] = useState<string>('all');
  const [chartStyle, setChartStyleState] = useState<'area' | 'line'>('area');
  const [budgetMode, setBudgetModeState] = useState<BudgetMode>('regular');
  const [zbbMode, setZbbModeState] = useState<'flexible' | 'strict'>('flexible');
  const [monthlyIncome, setMonthlyIncomeState] = useState<number>(0);
  const [monthlyIncomes, setMonthlyIncomes] = useState<MonthlyIncome[]>([]);
  const [budgetReallocations, setBudgetReallocations] = useState<BudgetReallocation[]>([]);
  const applySettingsToState = useCallback((s: Record<string, any>, options?: { lockAppOnPin?: boolean }) => {
    if (s.user) setUser(s.user);
    // PIN: hanya lock app jika dipanggil dari bootstrap (saat app baru buka)
    // Dari pullFromCloud, PIN disimpan ke IDB tapi app tidak langsung dikunci
    if (s.pin) {
      setPin(s.pin);
      if (options?.lockAppOnPin !== false) setIsAppLocked(true);
    }
    if (s.pin === null || s.pin === undefined) { setPin(null); }
    if (s.theme) {
      setTheme(s.theme as 'light' | 'dark');
      try { localStorage.setItem('moneyapp-theme', s.theme); } catch {}
    }
    if (s.isPrivateMode !== undefined) setIsPrivateMode(s.isPrivateMode);
    if (s.defaultAssetId !== undefined) setDefaultAssetIdState(s.defaultAssetId);
    if (s.startOfMonthDay) setStartOfMonthDayState(s.startOfMonthDay);
    if (s.showDebtInTransactions !== undefined) setShowDebtInTransactionsState(s.showDebtInTransactions);
    if (s.currencySymbol) setCurrencySymbolState(s.currencySymbol);
    if (s.defaultTransactionGrouping) setDefaultTransactionGroupingState(s.defaultTransactionGrouping);
    if (s.assetCarouselCards?.length) setAssetCarouselCardsState(s.assetCarouselCards);
    if (s.statsCarouselCards?.length) setStatsCarouselCardsState(s.statsCarouselCards);
    if (s.defaultStatsView) setDefaultStatsViewState(s.defaultStatsView);
    if (s.chartStyle) setChartStyleState(s.chartStyle as 'area' | 'line');
    if (s.budgetMode) setBudgetModeState(s.budgetMode);
    if (s.zbbMode) setZbbModeState(s.zbbMode);
    if (s.monthlyIncome !== undefined) setMonthlyIncomeState(s.monthlyIncome);
  }, []);

  // ─── Auth Listener ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthUser({}); // Mock user if not using firebase
      setAuthChecked(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setIsReady(false);
        setAuthUser(u);
        const lastUid = await localDbGetSetting('last_synced_uid');
        const sessionSyncedUid = sessionStorage.getItem('cloud_synced_uid');
        const shouldPullFirst = !sessionSyncedUid || sessionSyncedUid !== u.uid || !lastUid || lastUid !== u.uid;
        if (!shouldPullFirst) await migrateFromIndexedDBToFirebase();

        // Pull jika ini akun yang berbeda dari yang terakhir login di device ini.
        // Handles: (1) device lama dengan data stale, (2) logout → login akun berbeda.
        // Device baru (IDB kosong) → lastUid undefined → skip (handled by IDB-first fallback).
        if (shouldPullFirst) {
          // Akun berbeda → pull data Firestore akun baru ke IDB.
          // pullCollectionIntoIDB() otomatis membersihkan "zombies" (data akun lama
          // yang tidak ada di Firestore akun baru), tidak menimpa pending_sync items.
          setAutoCloudSync({ status: 'pulling' });
          try {
            const result = await dbForceCloudSync();
            setAutoCloudSync({ status: 'success', total: result.total });
            sessionStorage.setItem('cloud_synced_uid', u.uid);
          } catch (err: any) {
            setAutoCloudSync({ status: 'error', message: err?.message || 'Gagal sinkronisasi dari cloud' });
          }
        }
        if (!shouldPullFirst) setAutoCloudSync({ status: 'idle' });
        await localDbPutSetting('last_synced_uid', u.uid);
      } else {
        setAuthUser(null);
        setIsReady(false);
        setAutoCloudSync({ status: 'idle' });
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // ── Bootstrap: migrate if needed, then load from IndexedDB ──────────────
  useEffect(() => {
    if (!authChecked) return; // Wait for initial auth check
    if (isFirebaseConfigured && !authUser) return;
    const bootstrap = async () => {
      // One-time migration from localStorage
      await migrateFromLocalStorage();

      // Load all data from IndexedDB
      const [
        dbAssets, dbTxs, dbCats, dbBudgets, dbDebts, dbGoals, dbRecurring, dbContacts, dbSubs, dbTrips, dbTripExpenses, dbMonthlyIncomes, dbReallocations
      ] = await Promise.all([
        dbGetAllAssets(),
        dbGetAllTransactions(),
        dbGetAllCategories(),
        dbGetAllBudgets(),
        dbGetAllDebts(),
        dbGetAllGoals(),
        import('../lib/db').then(m => m.dbGetAllRecurringTransactions()),
        import('../lib/db').then(m => m.dbGetAllContacts()),
        import('../lib/db').then(m => m.dbGetAllSubscriptions()),
        dbGetAllTrips(),
        dbGetAllTripExpenses(),
        dbGetAllMonthlyIncomes(),
        dbGetAllBudgetReallocations(),
      ]);

      const hasMigratedV1_0_18 = localStorage.getItem('migrated_v1_0_18_debts');
      if (!hasMigratedV1_0_18 && dbTxs.length > 0) {
        let migratedCount = 0;
        const updatedTxs = dbTxs.map(tx => {
          let newType = tx.type;
          if (tx.type === 'pengeluaran') {
            if (tx.category === 'Pinjaman & Piutang' || tx.category === 'Tambah Piutang') newType = 'piutang_keluar';
            else if (tx.category === 'Bayar Hutang') newType = 'hutang_keluar';
          } else if (tx.type === 'pendapatan') {
            if (tx.category === 'Tambah Hutang' || (tx.note && tx.note.includes('Penerimaan dana pinjaman'))) newType = 'hutang_masuk';
            else if (tx.category === 'Pelunasan Piutang') newType = 'piutang_masuk';
          }
          
          if (newType !== tx.type) {
            migratedCount++;
            return { ...tx, type: newType as Transaction['type'] };
          }
          return tx;
        });

        if (migratedCount > 0) {
          const mDb = await import('../lib/db');
          await Promise.all(updatedTxs.filter((tx, i) => tx.type !== dbTxs[i].type).map(tx => mDb.dbPutTransaction(tx)));
          updatedTxs.forEach((tx, i) => { dbTxs[i] = tx; });
          console.log(`Migrated ${migratedCount} debt transactions to v1.0.18 types.`);
        }
        localStorage.setItem('migrated_v1_0_18_debts', 'true');
      }

      setGoals(dbGoals);
      setRecurringTransactions(dbRecurring);
      setContacts(dbContacts);
      setSubscriptions(dbSubs);


      // Seed defaults if DB is empty
      if (dbAssets.length === 0) {
        await dbPutAsset(DEFAULT_ASSET, { skipSync: true });
        setAssets([DEFAULT_ASSET]);
      } else {
        setAssets(dbAssets);
      }

      if (dbCats.length === 0) {
        for (const c of DEFAULT_CATEGORIES) await dbPutCategory(c, { skipSync: true });
        setCategories(DEFAULT_CATEGORIES);
      } else {
        setCategories(dbCats);
      }

      setBudgets(dbBudgets);
      setDebts(dbDebts as Debt[]);
      setGoals(dbGoals as Goal[]);
      setTransactions(dbTxs);
      setTrips(dbTrips as Trip[]);
      setTripExpenses(dbTripExpenses as TripExpense[]);
      setMonthlyIncomes(dbMonthlyIncomes as MonthlyIncome[]);
      setBudgetReallocations(dbReallocations as BudgetReallocation[]);

      // Load settings
      let profile = await dbGetSetting('user') as UserProfile | undefined;
      const savedPin = await dbGetSetting('pin') as string | undefined;
      const savedTheme = await dbGetSetting('theme') as string | undefined;
      const savedPrivacy = await dbGetSetting('isPrivateMode') as boolean | undefined;
      const savedDefaultAssetId = await dbGetSetting('defaultAssetId') as string | undefined;
      const savedStartMonth = await dbGetSetting('startOfMonthDay') as number | undefined;
      const savedShowDebtInTx = await dbGetSetting('showDebtInTransactions') as boolean | undefined;
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

      const settingsToApply: Record<string, any> = {};
      if (profile) settingsToApply.user = profile;
      if (savedPin) settingsToApply.pin = savedPin;
      if (savedTheme) settingsToApply.theme = savedTheme;
      if (savedPrivacy !== undefined) settingsToApply.isPrivateMode = savedPrivacy;
      if (savedDefaultAssetId) settingsToApply.defaultAssetId = savedDefaultAssetId;
      if (savedStartMonth) settingsToApply.startOfMonthDay = savedStartMonth;
      if (savedShowDebtInTx !== undefined) settingsToApply.showDebtInTransactions = savedShowDebtInTx;
      if (savedCurrency) settingsToApply.currencySymbol = savedCurrency;
      if (savedGrouping) settingsToApply.defaultTransactionGrouping = savedGrouping;
      
      const savedCarousel = await dbGetSetting('assetCarouselCards') as string[] | undefined;
      if (savedCarousel && Array.isArray(savedCarousel) && savedCarousel.length > 0) settingsToApply.assetCarouselCards = savedCarousel;
      
      const savedStatsCarousel = await dbGetSetting('statsCarouselCards') as string[] | undefined;
      if (savedStatsCarousel && Array.isArray(savedStatsCarousel) && savedStatsCarousel.length > 0) settingsToApply.statsCarouselCards = savedStatsCarousel;
      
      const savedDefaultStatsView = await dbGetSetting('defaultStatsView') as string | undefined;
      if (savedDefaultStatsView) settingsToApply.defaultStatsView = savedDefaultStatsView;
      
      const savedChartStyle = await dbGetSetting('chartStyle') as 'area' | 'line' | undefined;
      if (savedChartStyle) settingsToApply.chartStyle = savedChartStyle;

      const savedBudgetMode = await dbGetSetting('budgetMode') as BudgetMode | undefined;
      if (savedBudgetMode) settingsToApply.budgetMode = savedBudgetMode;
      
      const savedZbbMode = await dbGetSetting('zbbMode') as 'flexible' | 'strict' | undefined;
      if (savedZbbMode) settingsToApply.zbbMode = savedZbbMode;
      
      const savedMonthlyIncome = await dbGetSetting('monthlyIncome') as number | undefined;
      if (savedMonthlyIncome) settingsToApply.monthlyIncome = savedMonthlyIncome;

      applySettingsToState(settingsToApply);

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
  }, [authChecked, authUser?.uid]);

  // ─── Apply theme ────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ─── Sync Status ────────────────────────────────────────────────────────
  const refreshSyncCount = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setPendingSyncCount(0);
      return;
    }
    const count = await dbGetPendingSyncCount();
    console.log('[MoneyContext] Updating pending sync count:', count);
    setPendingSyncCount(count);
  }, []);

  useEffect(() => {
    if (isReady && isFirebaseConfigured) {
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
      const [dbAssets, dbTxs, dbCats, dbBudgets, dbDebts, dbGoals] = await Promise.all([
        dbGetAllAssets(), dbGetAllTransactions(), dbGetAllCategories(), dbGetAllBudgets(), dbGetAllDebts(), dbGetAllGoals(),
      ]);
      setAssets(dbAssets);
      setTransactions(dbTxs);
      setCategories(dbCats);
      setBudgets(dbBudgets);
      setDebts(dbDebts as Debt[]);
      setGoals(dbGoals as Goal[]);
    }
    await refreshSyncCount();
    return results;
  }, [refreshSyncCount]);

  // ─── Assets ──────────────────────────────────────────────────────────────
  const addAsset = useCallback((assetReq: Omit<Asset, 'id'>) => {
    const newAsset: Asset = { ...assetReq, id: generateId() };
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
      id: generateId(),
      time: txReq.time || getLocalTime()
    };
    setTransactions(prev => [newTx, ...prev]);
    dbPutTransaction(newTx).then(refreshSyncCount);
    return newTx;
  }, [refreshSyncCount]);

  /** Create a transaction record and push it to state + DB */
  const _createTx = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: generateId(),
      time: tx.time || getLocalTime()
    };
    setTransactions(prev => [newTx, ...prev]);
    dbPutTransaction(newTx);
  };

  const deleteTransaction = useCallback((id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;

    if (txToDelete.relatedId) {
      const isPrincipal = isPrincipalTx(txToDelete.note, txToDelete.category);

      if (isPrincipal) {
        const debtId = txToDelete.relatedId;
        const otherPrincipalTxs = transactions.filter(tx =>
          tx.relatedId === debtId &&
          tx.id !== id &&
          isPrincipalTx(tx.note, tx.category)
        );

        if (otherPrincipalTxs.length === 0) {
          // No principal left → cascade delete everything
          const relatedTxs = transactions.filter(tx => tx.relatedId === debtId && tx.id !== id);
          relatedTxs.forEach(tx => dbDeleteTransaction(tx.id));
          setTransactions(prev => prev.filter(tx => tx.id !== id && tx.relatedId !== debtId));
          dbDeleteTransaction(id).then(refreshSyncCount);
          setDebts(prev => prev.filter(d => d.id !== debtId));
          dbDeleteDebt(debtId);
        } else {
          // Just subtract this principal amount from total
          setTransactions(prev => prev.filter(tx => tx.id !== id));
          dbDeleteTransaction(id).then(refreshSyncCount);
          setDebts(prev => prev.map(d => {
            if (d.id !== debtId) return d;
            const newTotal = Math.max(0, Number(d.totalAmount || 0) - txToDelete.amount);

            // Recalculate if it's paid after total decreased
            const history = transactions.filter(t => t.relatedId === debtId && t.id !== id);
            const paidAmt = history.reduce((sum, tx) => {
              return isPrincipalTx(tx.note, tx.category) ? sum : sum + Number(tx.amount || 0);
            }, 0);
            const isPaid = newTotal > 0 && paidAmt >= newTotal;

            const updated = { ...d, totalAmount: newTotal, isPaid };
            dbPutDebt(updated);
            return updated;
          }));
        }
      } else {
        // Payment/installment tx deleted → recalculate debt status
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        dbDeleteTransaction(id).then(refreshSyncCount);

        const remainingPaymentCount = transactions.filter(t =>
          t.id !== id &&
          t.relatedId === txToDelete.relatedId &&
          !isPrincipalTx(t.note, t.category)
        ).length;

        setDebts(prev => prev.map(d => {
          if (d.id !== txToDelete.relatedId) return d;

          // Recalculate isPaid based on new transaction sum
          const history = transactions.filter(t => t.relatedId === d.id && t.id !== id);
          const paidAmt = history.reduce((sum, tx) => {
            return isPrincipalTx(tx.note, tx.category) ? sum : sum + Number(tx.amount || 0);
          }, 0);
          const isPaid = Number(d.totalAmount || 0) > 0 && paidAmt >= Number(d.totalAmount || 0);

          const updated = {
            ...d,
            paidInstallments: d.isInstallment ? remainingPaymentCount : d.paidInstallments,
            isPaid
          };
          dbPutDebt(updated);
          return updated;
        }));
      }
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      dbDeleteTransaction(id).then(refreshSyncCount);

      // --- Sync with Trip Expense & Related Debts ---
      if (txToDelete.category === 'Liburan & Perjalanan' && txToDelete.subCategory === 'Biaya Trip') {
        const expenseId = txToDelete.relatedId;
        if (expenseId) {
          // Delete Trip Expense
          setTripExpenses(prev => prev.filter(e => e.id !== expenseId));
          dbDeleteTripExpense(expenseId);
          
          // Delete Related Debts (including their TX payment history)
          setDebts(prev => {
            const relatedDebts = prev.filter(d => d.relatedId === expenseId);
            relatedDebts.forEach(d => {
              // Delete TX payment history for this debt
              const debtTxs = transactions.filter(tx => tx.relatedId === d.id);
              debtTxs.forEach(tx => dbDeleteTransaction(tx.id));
              dbDeleteDebt(d.id);
            });
            return prev.filter(d => d.relatedId !== expenseId);
          });
          // Also remove debt TX payment history from state
          setTransactions(prev => {
            const debtIds = new Set(
              transactions.filter(tx => tx.relatedId && debts.some(d => d.relatedId === expenseId && d.id === tx.relatedId)).map(tx => tx.id)
            );
            return prev.filter(tx => !debtIds.has(tx.id));
          });
        }
      }
    } else {
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      dbDeleteTransaction(id).then(refreshSyncCount);
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
    const newCat: Category = { ...catReq, id: generateId(), subcategories: catReq.subcategories || [] };
    setCategories(prev => [...prev, newCat]);
    dbPutCategory(newCat).then(refreshSyncCount);
  }, [refreshSyncCount]);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, isDeleted: true };
      dbPutCategory(updated).then(refreshSyncCount);
      return updated;
    }));
  }, [refreshSyncCount]);

  const addSubCategory = useCallback((categoryId: string, name: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      const updated = { ...c, subcategories: [...(c.subcategories || []), { id: generateId(), name }] };
      dbPutCategory(updated);
      return updated;
    }));
  }, []);

  const deleteSubCategory = useCallback((categoryId: string, subId: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      const updatedSubcategories = (c.subcategories || []).map(sub => {
        if (sub.id !== subId) return sub;
        return { ...sub, isDeleted: true };
      });
      const updated = { ...c, subcategories: updatedSubcategories };
      dbPutCategory(updated).then(refreshSyncCount);
      return updated;
    }));
  }, [refreshSyncCount]);

  const updateCategory = useCallback((id: string, name: string) => {
    let oldName = '';
    setCategories(prev => prev.map(c => {
      if (c.id !== id) return c;
      oldName = c.name;
      const updated = { ...c, name };
      dbPutCategory(updated).then(refreshSyncCount);
      return updated;
    }));

    if (oldName && oldName !== name) {
      setTransactions(prev => prev.map(tx => {
        if (tx.category === oldName) {
          const updated = { ...tx, category: name };
          dbPutTransaction(updated);
          return updated;
        }
        return tx;
      }));
    }
  }, [refreshSyncCount]);

  const updateSubCategory = useCallback((categoryId: string, subId: string, name: string) => {
    let oldSubName = '';
    let catName = '';
    setCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      catName = c.name;
      const updatedSubcategories = (c.subcategories || []).map(sub => {
        if (sub.id !== subId) return sub;
        oldSubName = sub.name;
        return { ...sub, name };
      });
      const updated = { ...c, subcategories: updatedSubcategories };
      dbPutCategory(updated).then(refreshSyncCount);
      return updated;
    }));

    if (oldSubName && oldSubName !== name && catName) {
      setTransactions(prev => prev.map(tx => {
        if (tx.category === catName && tx.subCategory === oldSubName) {
          const updated = { ...tx, subCategory: name };
          dbPutTransaction(updated);
          return updated;
        }
        return tx;
      }));
    }
  }, [refreshSyncCount]);

  // ─── Budgets ──────────────────────────────────────────────────────────────
  const addBudget = useCallback((budgetReq: Omit<Budget, 'id'>) => {
    const newBudget: Budget = { ...budgetReq, id: generateId() };
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

  // ─── Goals ──────────────────────────────────────────────────────────────
  const addGoal = useCallback((goalReq: Omit<Goal, 'id' | 'createdAt' | 'isCompleted'>) => {
    const newGoal: Goal = {
      ...goalReq,
      id: generateId(),
      createdAt: new Date().toISOString(),
      isCompleted: false
    };
    setGoals(prev => [...prev, newGoal]);
    dbPutGoal(newGoal).then(refreshSyncCount);
    return newGoal;
  }, [refreshSyncCount]);

  const updateGoal = useCallback((id: string, updatedGoal: Partial<Goal>) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== id) return g;
      const updated = { ...g, ...updatedGoal } as Goal;
      dbPutGoal(updated).then(refreshSyncCount);
      return updated;
    }));
  }, [refreshSyncCount]);

  const deleteGoal = useCallback((id: string) => {
    // Unlink transactions
    setTransactions(prev => prev.map(tx => {
      if (tx.goalId === id) {
        const updated = { ...tx, goalId: undefined };
        dbPutTransaction(updated);
        return updated;
      }
      return tx;
    }));
    
    setGoals(prev => {
      const goalToDelete = prev.find(g => g.id === id);
      if (goalToDelete?.recurringTransactionId) {
        setRecurringTransactions(rts => rts.filter(rt => rt.id !== goalToDelete.recurringTransactionId));
        import('../lib/db').then(m => m.dbDeleteRecurringTransaction(goalToDelete.recurringTransactionId!));
      }
      return prev.filter(g => g.id !== id);
    });
    dbDeleteGoal(id).then(refreshSyncCount);
  }, [refreshSyncCount]);

  // ─── Debts ──────────────────────────────────────────────────────────────
  const addDebt = useCallback((debtReq: Omit<Debt, 'id'>, initialMode: 'none' | 'cash' | 'credit' = 'none', categoryName?: string, subCategoryName?: string) => {
    // Check if an existing unpaid debt with the same contact and type exists
    const existingDebt = debts.find(d =>
      !d.isPaid &&
      d.contact.toLowerCase().trim() === debtReq.contact.toLowerCase().trim() &&
      d.type === debtReq.type
    );

    const debtId = existingDebt ? existingDebt.id : generateId();
    const newDebt: Debt = { ...debtReq, id: debtId };

    // Generate initial transaction for the principal
    const date = newDebt.date || new Date(newDebt.createdAt).toISOString().split('T')[0];
    const time = new Date(newDebt.createdAt).toTimeString().split(' ')[0].substring(0, 5);

    if (newDebt.type === 'piutang') {
      // Give loan: Account balance decreases (Expense-like but ignored in stats)
      if (newDebt.paymentAssetId) {
        _createTx({
          type: 'piutang_keluar',
          amount: newDebt.totalAmount,
          category: 'Pinjaman & Piutang',
          date,
          time,
          note: existingDebt
            ? `Penambahan Piutang: ${newDebt.contact} (${newDebt.description || 'Baru'})`
            : `Pemberian pinjaman (Piutang) kepada ${newDebt.contact}`,
          assetId: newDebt.paymentAssetId,
          relatedId: debtId,
        });
      }
    } else {
      // Hutang (Saya Berhutang)
      if (initialMode === 'cash' && newDebt.liabilityAssetId) {
        // Receive loan principal: Account balance increases (Income-like but ignored in stats)
        _createTx({
          type: 'hutang_masuk',
          amount: newDebt.totalAmount,
          category: categoryName || 'Lainnya',
          date,
          time,
          note: existingDebt
            ? `Penambahan Hutang: ${newDebt.contact} (${newDebt.description || 'Baru'})`
            : `Penerimaan dana pinjaman dari ${newDebt.contact}`,
          assetId: newDebt.liabilityAssetId,
          relatedId: debtId,
        });
      } else if (initialMode === 'credit' && newDebt.liabilityAssetId) {
        // Credit/Paylater purchase: Account balance decreases (Expense)
        _createTx({
          type: 'pengeluaran',
          amount: newDebt.totalAmount,
          category: categoryName || 'Lainnya',
          subCategory: subCategoryName,
          date,
          time,
          note: existingDebt
            ? `Penambahan Hutang (Kredit): ${newDebt.contact} (${newDebt.description || 'Baru'})`
            : `Belanja via ${newDebt.contact}: ${newDebt.description || 'Hutang Kredit'}`,
          assetId: newDebt.liabilityAssetId,
          relatedId: debtId,
        });
      }
    }

    if (existingDebt) {
      const updatedDebt = {
        ...existingDebt,
        totalAmount: Number(existingDebt.totalAmount || 0) + Number(newDebt.totalAmount || 0),
        // Keep the more recent due date if provided
        dueDate: newDebt.dueDate || existingDebt.dueDate,
        // Append description if different
        description: existingDebt.description && newDebt.description && existingDebt.description !== newDebt.description
          ? `${existingDebt.description}; ${newDebt.description}`
          : (newDebt.description || existingDebt.description)
      };
      setDebts(prev => prev.map(d => d.id === existingDebt.id ? updatedDebt : d));
      dbPutDebt(updatedDebt);
    } else {
      setDebts(prev => [...prev, newDebt]);
      dbPutDebt(newDebt).then(refreshSyncCount);
    }
  }, [debts, _createTx, refreshSyncCount]);

  const updateDebt = useCallback((id: string, updatedDebt: Partial<Debt>) => {
    setDebts(prev => prev.map(d => {
      if (d.id !== id) return d;

      // Bug #2: Sync principal transaction when totalAmount or contact changes
      if (updatedDebt.totalAmount !== undefined && updatedDebt.totalAmount !== d.totalAmount ||
        updatedDebt.contact !== undefined && updatedDebt.contact !== d.contact) {
        const principalTx = transactions.find(tx =>
          tx.relatedId === id &&
          isPrincipalTx(tx.note, tx.category)
        );
        if (principalTx) {
          const txUpdate: Partial<Transaction> = {};
          if (updatedDebt.totalAmount !== undefined && updatedDebt.totalAmount !== d.totalAmount) {
            txUpdate.amount = updatedDebt.totalAmount;
          }
          if (updatedDebt.contact !== undefined && updatedDebt.contact !== d.contact) {
            txUpdate.note = principalTx.note.replace(d.contact, updatedDebt.contact);
          }
          const updatedTx = { ...principalTx, ...txUpdate };
          setTransactions(prev => prev.map(tx => tx.id === principalTx.id ? updatedTx : tx));
          dbPutTransaction(updatedTx);
        }
      }

      const updated = { ...d, ...updatedDebt } as Debt;
      dbPutDebt(updated);
      return updated;
    }));
  }, [transactions]);

  const deleteDebt = useCallback((id: string) => {
    // Bug #1: Cascade delete all related transactions
    const relatedTxs = transactions.filter(tx => tx.relatedId === id);
    if (relatedTxs.length > 0) {
      relatedTxs.forEach(tx => dbDeleteTransaction(tx.id));
      setTransactions(prev => prev.filter(tx => tx.relatedId !== id));
    }
    setDebts(prev => prev.filter(d => d.id !== id));
    dbDeleteDebt(id).then(refreshSyncCount);
  }, [transactions, refreshSyncCount]);



  // ─── Recurring Transactions ───────────────────────────────────────────────
  const addRecurringTransaction = useCallback((rtReq: Omit<RecurringTransaction, 'id'>) => {
    const newRT: RecurringTransaction = { ...rtReq, id: generateId() };
    import('../lib/db').then(m => {
      setRecurringTransactions(prev => [...prev, newRT]);
      m.dbPutRecurringTransaction(newRT);
    });
    return newRT;
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

  // ─── Subscriptions ──────────────────────────────────────────────────────────
  const addSubscription = useCallback((subReq: Omit<Subscription, 'id'>) => {
    const newSub: Subscription = { ...subReq, id: generateId() };
    import('../lib/db').then(m => {
      setSubscriptions(prev => [...prev, newSub]);
      m.dbPutSubscription(newSub);
    });
    return newSub;
  }, []);

  const updateSubscription = useCallback((id: string, updated: Partial<Subscription>) => {
    import('../lib/db').then(m => {
      setSubscriptions(prev => prev.map(s => {
        if (s.id !== id) return s;
        const next = { ...s, ...updated };
        m.dbPutSubscription(next);
        return next;
      }));
    });
  }, []);

  const deleteSubscription = useCallback((id: string) => {
    import('../lib/db').then(m => {
      setSubscriptions(prev => {
        const subToDelete = prev.find(s => s.id === id);
        if (subToDelete?.recurringTransactionId) {
          setRecurringTransactions(rts => rts.filter(rt => rt.id !== subToDelete.recurringTransactionId));
          m.dbDeleteRecurringTransaction(subToDelete.recurringTransactionId);
        }
        return prev.filter(s => s.id !== id);
      });
      m.dbDeleteSubscription(id);
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
          // Terima pembayaran piutang: Saldo masuk ke receiveAssetId (Bukan pendapatan)
          _createTx({
            type: 'piutang_masuk',
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

  const settleDebt = useCallback((debtId: string, overrideAssetId?: string, overrideDate?: string, overrideTime?: string, overrideAmount?: number) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt || debt.isPaid) return;

    const txKey = `settle-${debtId}`;
    if (!_paidInstallmentKeys.has(txKey)) {
      _paidInstallmentKeys.add(txKey);
      const today = overrideDate || getLocalDate();
      const time = overrideTime || getLocalTime();

      const history = transactions.filter(t => t.relatedId === debtId);
      const paidAmt = history.reduce((sum, tx) => {
        return isPrincipalTx(tx.note, tx.category) ? sum : sum + Number(tx.amount || 0);
      }, 0);

      const remaining = Math.max(0, Number(debt.totalAmount || 0) - paidAmt);
      const amountToRecord = overrideAmount !== undefined ? overrideAmount : remaining;

      const note = amountToRecord > remaining
        ? `Pelunasan ${debt.type === 'hutang' ? 'hutang' : 'piutang'} (Kelebihan Bayar) - ${debt.contact}`
        : `Pelunasan ${debt.type === 'hutang' ? 'hutang' : 'piutang'} - ${debt.contact}`;

      if (amountToRecord > 0) {
        if (debt.type === 'hutang') {
          if (debt.liabilityAssetId) {
            _createTx({
              type: 'transfer',
              amount: amountToRecord,
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
              type: 'hutang_keluar',
              amount: amountToRecord,
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
            type: 'piutang_masuk',
            amount: amountToRecord,
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
          type: 'hutang_keluar',
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
        type: 'piutang_masuk',
        amount,
        category: 'Pelunasan Piutang',
        date,
        time,
        note,
        assetId,
        relatedId: debtId,
      });
    }

    const totalPaid = transactions
      .filter(t => t.relatedId === debtId)
      .reduce((sum, tx) => isPrincipalTx(tx.note, tx.category) ? sum : sum + Number(tx.amount || 0), 0) + amount;

    const nextPaid = (debt.paidInstallments || 0) + 1;
    const isPaid = debt.isInstallment && debt.totalInstallments
      ? nextPaid >= debt.totalInstallments
      : totalPaid >= Number(debt.totalAmount || 0);

    const updatedDebt = {
      ...debt,
      paidInstallments: debt.isInstallment ? nextPaid : debt.paidInstallments,
      isPaid
    };

    dbPutDebt(updatedDebt);
    setDebts(prev => prev.map(d => d.id === debtId ? updatedDebt : d));
  }, [debts, transactions]);

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

  const offsetDebt = useCallback((contactName: string, customDate?: string) => {
    const contactDebts = debts.filter(d => !d.isPaid && d.contact.toLowerCase() === contactName.toLowerCase());

    const debtsWithBal = contactDebts.map(d => {
      const history = transactions.filter(t => t.relatedId === d.id);
      const paidAmt = history.reduce((sum, tx) => {
        return isPrincipalTx(tx.note, tx.category) ? sum : sum + Number(tx.amount);
      }, 0);
      return { ...d, remaining: Math.max(0, d.totalAmount - paidAmt) };
    });

    const hutangs = debtsWithBal.filter(d => d.type === 'hutang' && d.remaining > 0);
    const piutangs = debtsWithBal.filter(d => d.type === 'piutang' && d.remaining > 0);

    const totalHutang = hutangs.reduce((s, d) => s + d.remaining, 0);
    const totalPiutang = piutangs.reduce((s, d) => s + d.remaining, 0);

    const offsetAmount = Math.min(totalHutang, totalPiutang);
    if (offsetAmount <= 0) return;

    const now = new Date();
    const date = customDate || now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].substring(0, 5);
    const note = `Potong Silang Utang/Piutang dengan ${contactName}`;
    const virtualAssetId = 'system-offset';

    let hAmountToOffset = offsetAmount;
    let pAmountToOffset = offsetAmount;

    const newTransactions: Transaction[] = [];
    const debtsToUpdate: Debt[] = [];

    // Process Hutang
    for (const h of hutangs) {
      if (hAmountToOffset <= 0) break;
      const payAmt = Math.min(hAmountToOffset, h.remaining);
      hAmountToOffset -= payAmt;

      const newTx: Transaction = {
        id: generateId(),
        type: 'hutang_keluar',
        amount: payAmt,
        category: 'Bayar Hutang',
        date,
        time,
        note,
        assetId: h.liabilityAssetId || virtualAssetId,
        relatedId: h.id,
      };
      newTransactions.push(newTx);
      dbPutTransaction(newTx);

      const original = debts.find(d => d.id === h.id)!;
      debtsToUpdate.push({
        ...original,
        isPaid: payAmt >= h.remaining,
        paidInstallments: original.isInstallment
          ? (original.paidInstallments || 0) + 1
          : original.paidInstallments
      });
    }

    // Process Piutang
    for (const p of piutangs) {
      if (pAmountToOffset <= 0) break;
      const payAmt = Math.min(pAmountToOffset, p.remaining);
      pAmountToOffset -= payAmt;

      const newTx: Transaction = {
        id: generateId(),
        type: 'piutang_masuk',
        amount: payAmt,
        category: 'Pelunasan Piutang',
        date,
        time,
        note,
        assetId: virtualAssetId, // Piutang doesn't have liability assets
        relatedId: p.id,
      };
      newTransactions.push(newTx);
      dbPutTransaction(newTx);

      const original = debts.find(d => d.id === p.id)!;
      debtsToUpdate.push({
        ...original,
        isPaid: payAmt >= p.remaining,
        paidInstallments: original.isInstallment
          ? (original.paidInstallments || 0) + 1
          : original.paidInstallments
      });
    }

    // Apply state updates atomically
    if (newTransactions.length > 0) {
      setTransactions(prev => [...newTransactions, ...prev]);
    }

    if (debtsToUpdate.length > 0) {
      debtsToUpdate.forEach(dbPutDebt);
      setDebts(prev => prev.map(d => {
        const updated = debtsToUpdate.find(u => u.id === d.id);
        return updated ? updated : d;
      }));
    }
  }, [debts, transactions]);


  // ─── Balance ──────────────────────────────────────────────────────────────
  const getAssetBalance = useCallback((assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return 0;
    let balance = asset.initialBalance;
    transactions.forEach(tx => {
      if ((tx.type === 'pendapatan' || tx.type === 'piutang_masuk' || tx.type === 'hutang_masuk') && tx.assetId === assetId) balance += tx.amount;
      else if ((tx.type === 'pengeluaran' || tx.type === 'piutang_keluar' || tx.type === 'hutang_keluar') && tx.assetId === assetId) balance -= tx.amount;
      else if (tx.type === 'transfer' && tx.fromAssetId === assetId) balance -= tx.amount;
      else if (tx.type === 'transfer' && tx.toAssetId === assetId) balance += tx.amount;
    });
    return balance;
  }, [assets, transactions]);

  // ─── Contacts ─────────────────────────────────────────────────────────────
  const addContact = useCallback((contactReq: Omit<Contact, 'id'>) => {
    const newContact: Contact = { ...contactReq, id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9) };
    setContacts(prev => [...prev, newContact]);
    import('../lib/db').then(m => m.dbPutContact(newContact).then(refreshSyncCount));
  }, [refreshSyncCount]);

  const updateContact = useCallback((id: string, updated: Partial<Contact>) => {
    setContacts(prev => prev.map(c => {
      if (c.id !== id) return c;
      const next = { ...c, ...updated };
      import('../lib/db').then(m => m.dbPutContact(next).then(refreshSyncCount));
      return next;
    }));
  }, [refreshSyncCount]);

  const deleteContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    import('../lib/db').then(m => m.dbDeleteContact(id).then(refreshSyncCount));
  }, [refreshSyncCount]);

  // ─── User & Settings ─────────────────────────────────────────────────────
  const updateUser = useCallback((newUser: UserProfile) => {
    setUser(newUser);
    dbPutSetting('user', newUser).then(refreshSyncCount);
  }, [refreshSyncCount]);

  const setAppPin = useCallback(async (newPin: string | null) => {
    let finalPin = newPin;
    if (newPin) {
      finalPin = await hashPin(newPin);
    }
    setPin(finalPin);
    if (finalPin) dbPutSetting('pin', finalPin);
    else dbDeleteSetting('pin');
    if (!finalPin) setIsAppLocked(false);
  }, []);

  const unlockApp = useCallback(async (enteredPin: string) => {
    if (!pin) return true;
    
    // Legacy support: if stored pin is 6 digits, it's likely plain text
    if (pin.length === 6 && /^\d+$/.test(pin)) {
      if (enteredPin === pin) {
        // Upgrade to hash automatically
        const hashed = await hashPin(enteredPin);
        setPin(hashed);
        dbPutSetting('pin', hashed);
        setIsAppLocked(false);
        return true;
      }
    }

    const hashedInput = await hashPin(enteredPin);
    if (hashedInput === pin) { 
      setIsAppLocked(false); 
      return true; 
    }
    return false;
  }, [pin]);

  const lockApp = useCallback(() => { if (pin) setIsAppLocked(true); }, [pin]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      dbPutSetting('theme', next);
      try { localStorage.setItem('moneyapp-theme', next); } catch { }
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

  // ─── Trips ───────────────────────────────────────────────────────────────
  const addTrip = useCallback(async (tripReq: Omit<Trip, 'id' | 'createdAt'>) => {
    const newTrip: Trip = { ...tripReq, id: generateId(), createdAt: new Date().toISOString() };
    setTrips(prev => [...prev, newTrip]);
    await dbPutTrip(newTrip);
    await refreshSyncCount();
  }, [refreshSyncCount]);

  const updateTrip = useCallback(async (id: string, updated: Partial<Trip>) => {
    let next: Trip | undefined;
    setTrips(prev => prev.map(t => {
      if (t.id !== id) return t;
      next = { ...t, ...updated };
      return next;
    }));
    if (next) {
      await dbPutTrip(next);
      await refreshSyncCount();
    }
  }, [refreshSyncCount]);

  const deleteTrip = useCallback(async (id: string) => {
    setTrips(prev => prev.filter(t => t.id !== id));
    setTripExpenses(prev => prev.filter(e => e.tripId !== id));
    await dbDeleteTrip(id);
    // Also delete all related expenses from DB
    const related = tripExpenses.filter(e => e.tripId === id);
    for (const e of related) {
      await dbDeleteTripExpense(e.id);
    }
    await refreshSyncCount();
  }, [refreshSyncCount, tripExpenses]);

  const addTripExpense = useCallback(async (expenseReq: Omit<TripExpense, 'id' | 'createdAt'>) => {
    const newExpense: TripExpense = { ...expenseReq, id: generateId(), createdAt: new Date().toISOString() };
    setTripExpenses(prev => [...prev, newExpense]);
    await dbPutTripExpense(newExpense);
    await refreshSyncCount();
    return newExpense;
  }, [refreshSyncCount]);

  const updateTripExpense = useCallback(async (id: string, updated: Partial<TripExpense>) => {
    let next: TripExpense | undefined;
    setTripExpenses(prev => prev.map(e => {
      if (e.id !== id) return e;
      next = { ...e, ...updated };
      return next;
    }));
    if (next) {
      await dbPutTripExpense(next);
      await refreshSyncCount();
    }
  }, [refreshSyncCount]);

  const deleteTripExpense = useCallback(async (id: string) => {
    const expenseToDelete = tripExpenses.find(e => e.id === id);
    setTripExpenses(prev => prev.filter(e => e.id !== id));
    await dbDeleteTripExpense(id);

    // Also delete linked transaction & related debts
    if (expenseToDelete) {
      // Deleting Transactions
      setTransactions(prev => {
        const tx = prev.find(t => t.relatedId === id);
        if (tx) {
          dbDeleteTransaction(tx.id);
          return prev.filter(t => t.id !== tx.id);
        }
        return prev;
      });

      // Deleting Related Debts (including their TX payment history)
      setDebts(prev => {
        const relatedDebts = prev.filter(d => d.relatedId === id);
        relatedDebts.forEach(d => {
          // Delete TX payment history for this debt
          const debtTxs = transactions.filter(tx => tx.relatedId === d.id);
          debtTxs.forEach(tx => dbDeleteTransaction(tx.id));
          dbDeleteDebt(d.id);
        });
        return prev.filter(d => d.relatedId !== id);
      });
      // Also remove debt TX payment history from state
      setTransactions(prev => {
        const relatedDebtIds = new Set(debts.filter(d => d.relatedId === id).map(d => d.id));
        return prev.filter(tx => !(tx.relatedId && relatedDebtIds.has(tx.relatedId)));
      });
    }

    await refreshSyncCount();
  }, [refreshSyncCount, tripExpenses]);

  const setDefaultAssetId = useCallback((id: string | null) => {
    setDefaultAssetIdState(id);
    dbPutSetting('defaultAssetId', id);
  }, []);

  const setStartOfMonthDay = useCallback((day: number) => {
    setStartOfMonthDayState(day);
    dbPutSetting('startOfMonthDay', day);
  }, []);

  const setShowDebtInTransactions = useCallback((show: boolean) => {
    setShowDebtInTransactionsState(show);
    dbPutSetting('showDebtInTransactions', show);
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

  const setStatsCarouselCards = useCallback((cards: string[]) => {
    setStatsCarouselCardsState(cards);
    dbPutSetting('statsCarouselCards', cards);
  }, []);

  const setChartStyle = useCallback((style: 'area' | 'line') => {
    setChartStyleState(style);
    dbPutSetting('chartStyle', style);
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
      sessionStorage.removeItem('cloud_synced_uid');
      setAutoCloudSync({ status: 'idle' });
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
      const [dbAssets, dbTxs, dbCats, dbBudgets, dbDebts, dbRec, dbContacts, dbSubs, dbTrips, dbTripEx] = await Promise.all([
        dbGetAllAssets(), dbGetAllTransactions(), dbGetAllCategories(),
        dbGetAllBudgets(), dbGetAllDebts(),
        import('../lib/db').then(m => m.dbGetAllRecurringTransactions()),
        import('../lib/db').then(m => m.dbGetAllContacts()),
        import('../lib/db').then(m => m.dbGetAllSubscriptions()),
        dbGetAllTrips(),
        dbGetAllTripExpenses()
      ]);
      setAssets(dbAssets);
      setTransactions(dbTxs);
      setCategories(dbCats);
      setBudgets(dbBudgets);
      setDebts(dbDebts as Debt[]);
      setRecurringTransactions(dbRec);
      setContacts(dbContacts);
      setSubscriptions(dbSubs);
      setTrips(dbTrips as Trip[]);
      setTripExpenses(dbTripEx as TripExpense[]);
      
      // TAMBAHAN: reload settings ke React state
      const { dbGetAllSettings } = await import('../lib/db');
      const freshSettings = await dbGetAllSettings();
      applySettingsToState(freshSettings, { lockAppOnPin: false });

      await refreshSyncCount();
    }
    return result;
  }, [refreshSyncCount, applySettingsToState]);

  const setBudgetMode = useCallback((mode: BudgetMode) => {
    setBudgetModeState(mode);
    dbPutSetting('budgetMode', mode);
  }, []);

  const setMonthlyIncome = useCallback((income: number) => {
    setMonthlyIncomeState(income);
    dbPutSetting('monthlyIncome', income);
  }, []);

  const setZbbMode = useCallback((mode: 'flexible' | 'strict') => {
    setZbbModeState(mode);
    dbPutSetting('zbbMode', mode);
  }, []);

  const setMonthIncome = useCallback((month: number, year: number, amount: number, isLocked: boolean) => {
    const id = `${year}-${month}`;
    const newIncome: MonthlyIncome = {
      id, month, year, amount, isLocked, createdAt: Date.now()
    };
    setMonthlyIncomes(prev => {
      const idx = prev.findIndex(m => m.id === id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = newIncome;
        return next;
      }
      return [...prev, newIncome];
    });
    dbPutMonthlyIncome(newIncome);
  }, []);

  const deleteMonthIncome = useCallback((id: string) => {
    setMonthlyIncomes(prev => prev.filter(m => m.id !== id));
    dbDeleteMonthlyIncome(id);
  }, []);

  const addBudgetReallocation = useCallback((realloc: Omit<BudgetReallocation, 'id' | 'date'>) => {
    const newRealloc: BudgetReallocation = {
      ...realloc,
      id: generateId(),
      date: new Date().toISOString()
    };
    setBudgetReallocations(prev => [...prev, newRealloc]);
    dbPutBudgetReallocation(newRealloc);
  }, []);

  const deleteBudgetReallocation = useCallback((id: string) => {
    setBudgetReallocations(prev => prev.filter(m => m.id !== id));
    dbDeleteBudgetReallocation(id);
  }, []);

  const validateTransactionBudget = useCallback((tx: Partial<Transaction>) => {
    if (budgetMode !== 'zero-based' || zbbMode !== 'strict') return { isValid: true, deficitCategory: null, deficitAmount: 0 };
    if (tx.type !== 'pengeluaran') return { isValid: true, deficitCategory: null, deficitAmount: 0 };
    
    const cat = categories.find(c => c.name === tx.category && c.type === 'pengeluaran' && !c.isDeleted) ||
                categories.find(c => c.name === tx.category && c.type === 'pengeluaran');
    if (!cat) return { isValid: true, deficitCategory: null, deficitAmount: 0 };

    const txDate = tx.date ? new Date(tx.date) : new Date();
    const m = txDate.getMonth() + 1;
    const y = txDate.getFullYear();

    const budget = budgets.find(b => b.categoryId === cat.id && b.month === m && b.year === y);
    if (!budget) {
      return { isValid: false, deficitCategory: cat.id, deficitAmount: tx.amount || 0 };
    }

    const monthIndex = m - 1;
    const periodStart = new Date(y, monthIndex - (startOfMonthDay > 1 ? 1 : 0), startOfMonthDay);
    const periodEnd = new Date(y, monthIndex + (startOfMonthDay > 1 ? 0 : 1), startOfMonthDay);
    
    let spent = 0;
    transactions.forEach(t => {
      if (t.id !== tx.id && t.type === 'pengeluaran' && t.category === tx.category) {
        const d = new Date(t.date);
        if (d >= periodStart && d < periodEnd) spent += t.amount;
      }
    });

    const proposedSpend = spent + (tx.amount || 0);
    if (proposedSpend > budget.limit) {
      return { isValid: false, deficitCategory: cat.id, deficitAmount: proposedSpend - budget.limit };
    }

    return { isValid: true, deficitCategory: null, deficitAmount: 0 };
  }, [budgetMode, zbbMode, categories, budgets, transactions, startOfMonthDay]);

  const moveBudgetMoney = useCallback((fromCategoryId: string | null, toCategoryId: string | null, amount: number, month: number, year: number) => {
    setBudgets(prev => {
      const next = [...prev];
      
      const updateLimit = (catId: string | null, delta: number) => {
        if (catId === 'unassigned') return;
        
        const idx = next.findIndex(b => b.categoryId === catId && b.month === month && b.year === year);
        if (idx !== -1) {
          const updated = { ...next[idx], limit: Math.max(0, next[idx].limit + delta) };
          next[idx] = updated;
          dbPutBudget(updated);
        } else if (delta > 0) {
          const newBudget: Budget = {
            id: generateId(),
            categoryId: catId,
            limit: delta,
            period: 'monthly',
            month,
            year
          };
          next.push(newBudget);
          dbPutBudget(newBudget);
        }
      };

      updateLimit(fromCategoryId, -amount);
      updateLimit(toCategoryId, amount);

      return next;
    });

    addBudgetReallocation({
      month, year,
      fromCategoryId: fromCategoryId || 'unassigned',
      toCategoryId: toCategoryId || 'unassigned',
      amount
    });
  }, [addBudgetReallocation]);

  // ─── Context value ────────────────────────────────────────────────────────
  const value = useMemo(() => ({
    isReady, assets, transactions, categories, budgets, debts, contacts, goals,
    recurringTransactions, addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction,
    subscriptions, addSubscription, updateSubscription, deleteSubscription,
    trips, addTrip, updateTrip, deleteTrip,
    tripExpenses, addTripExpense, updateTripExpense, deleteTripExpense,
    addContact, updateContact, deleteContact, addGoal, updateGoal, deleteGoal,
    user, pin, isAppLocked, setIsAppLocked, isChatOpen, setIsChatOpen, theme, isPrivateMode, defaultAssetId, setDefaultAssetId,
    startOfMonthDay, setStartOfMonthDay, showDebtInTransactions, setShowDebtInTransactions, currencySymbol, setCurrencySymbol, defaultTransactionGrouping, setDefaultTransactionGrouping,
    assetCarouselCards, setAssetCarouselCards,
    statsCarouselCards, setStatsCarouselCards,
    defaultStatsView,
    setDefaultStatsView: (viewId: string) => {
      setDefaultStatsViewState(viewId);
      dbPutSetting('defaultStatsView', viewId);
    },
    chartStyle, setChartStyle,
    addAsset, deleteAsset, updateAsset,
    addTransaction, deleteTransaction, updateTransaction,
    addCategory, deleteCategory, updateCategory, addSubCategory, deleteSubCategory, updateSubCategory,
    addBudget, updateBudget, deleteBudget,
    addDebt, updateDebt, deleteDebt, payInstallment, settleDebt, addDebtPayment, addDebtPrincipal, offsetDebt,
    getAssetBalance, updateUser, setAppPin, unlockApp, lockApp, toggleTheme, togglePrivateMode,
    exportData, importData, logOut, pendingSyncCount, syncData, pullFromCloud, autoCloudSync,
    budgetMode, setBudgetMode, zbbMode, setZbbMode, monthlyIncome, setMonthlyIncome,
    monthlyIncomes, setMonthIncome, deleteMonthIncome,
    budgetReallocations, addBudgetReallocation, deleteBudgetReallocation,
    moveBudgetMoney, validateTransactionBudget
  }), [
    isReady, assets, transactions, categories, budgets, debts, contacts, goals,
    recurringTransactions, addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction,
    subscriptions, addSubscription, updateSubscription, deleteSubscription,
    trips, addTrip, updateTrip, deleteTrip,
    tripExpenses, addTripExpense, updateTripExpense, deleteTripExpense,
    addContact, updateContact, deleteContact, addGoal, updateGoal, deleteGoal,
    user, pin, isAppLocked, setIsAppLocked, isChatOpen, setIsChatOpen, theme, isPrivateMode, defaultAssetId, setDefaultAssetId,
    startOfMonthDay, setStartOfMonthDay, showDebtInTransactions, setShowDebtInTransactions, currencySymbol, setCurrencySymbol, defaultTransactionGrouping, setDefaultTransactionGrouping,
    assetCarouselCards, setAssetCarouselCards, statsCarouselCards, setStatsCarouselCards, defaultStatsView, chartStyle, setChartStyle,
    addAsset, deleteAsset, updateAsset,
    addTransaction, deleteTransaction, updateTransaction,
    addCategory, deleteCategory, updateCategory, addSubCategory, deleteSubCategory, updateSubCategory,
    addBudget, updateBudget, deleteBudget,
    addDebt, updateDebt, deleteDebt, payInstallment, settleDebt, addDebtPayment, addDebtPrincipal, offsetDebt,
    getAssetBalance, updateUser, setAppPin, unlockApp, lockApp, toggleTheme, togglePrivateMode,
    exportData, importData, logOut, pendingSyncCount, syncData, pullFromCloud, autoCloudSync,
    budgetMode, setBudgetMode, zbbMode, setZbbMode, monthlyIncome, setMonthlyIncome,
    monthlyIncomes, setMonthIncome, deleteMonthIncome,
    budgetReallocations, addBudgetReallocation, deleteBudgetReallocation,
    moveBudgetMoney, validateTransactionBudget
  ]);

  // Show splash screen while checking auth state or loading data
  if (!authChecked || (authUser && !isReady)) {
    return <SplashScreen />;
  }

  const isPublicRoute = window.location.pathname.startsWith('/shared-split/') || window.location.pathname.startsWith('/shared-split-bill/');

  if (isFirebaseConfigured && !authUser && !isPublicRoute) {
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
