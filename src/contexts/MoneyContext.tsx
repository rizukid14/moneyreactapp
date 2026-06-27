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
  dbGetAllNotifications, dbPutNotification, dbDeleteNotification, dbClearAllNotifications
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
  type: 'pengeluaran' | 'pendapatan' | 'hutang_keluar' | 'hutang_masuk' | 'piutang_keluar' | 'piutang_masuk';
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
  accountNumber?: string;
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
  categoryId?: string;
  subCategoryId?: string;
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
  categoryId?: string;
  subCategoryId?: string;
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
  categoryId?: string;
  icon?: string;
  assetId: string;
  isActive: boolean;
  note?: string;
  recurringTransactionId?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  icon: string;
  color: 'success' | 'warning' | 'error' | 'info' | 'primary';
  createdAt: string; // ISO string
  isRead: boolean;
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
  notifications: NotificationItem[];
  unreadNotifCount: number;
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
  addDebt: (debt: Omit<Debt, 'id'>, initialMode?: 'none' | 'cash' | 'credit', categoryIdName?: string, subCategoryIdName?: string) => void;
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
  markNotifAsRead: (id: string) => void;
  deleteNotif: (id: string) => void;
  clearAllNotifs: () => void;
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
  defaultTransactionGrouping: 'date' | 'categoryId';
  setDefaultTransactionGrouping: (grouping: 'date' | 'categoryId') => void;
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
  recoverUnknownCategories: () => Promise<{ success: boolean; recoveredCount: number; message: string }>;
}

const MoneyContext = createContext<MoneyContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export const SYSTEM_CATEGORIES: Category[] = [
  { id: 'sys-cat-debt-pay', name: 'Bayar Hutang', type: 'hutang_keluar' },
  { id: 'sys-cat-debt-receive', name: 'Terima Pinjaman', type: 'hutang_masuk' },
  { id: 'sys-cat-receivable-pay', name: 'Memberi Pinjaman', type: 'piutang_keluar' },
  { id: 'sys-cat-receivable-receive', name: 'Pelunasan Piutang', type: 'piutang_masuk' }
];

export const MoneyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Dedup guard: prevents React StrictMode double-invoking the setDebts updater
  const paidInstallmentKeysRef = React.useRef(new Set<string>());
  
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
  const [defaultTransactionGrouping, setDefaultTransactionGroupingState] = useState<'date' | 'categoryId'>('date');
  const [authUser, setAuthUser] = useState<any>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('test_bypass_auth') === 'true') {
        return { uid: 'test-user-uid', email: 'test@example.com' };
      }
    } catch (e) { }
    return null;
  });
  const [authChecked, setAuthChecked] = useState(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('test_bypass_auth') === 'true') {
        return true;
      }
    } catch (e) { }
    return !isFirebaseConfigured;
  });
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [autoCloudSync, setAutoCloudSync] = useState<{ status: 'idle' | 'pulling' | 'success' | 'error'; total?: number; message?: string }>({ status: 'idle' });
  const [assetCarouselCards, setAssetCarouselCardsState] = useState<string[]>(['net_worth']);
  const [statsCarouselCards, setStatsCarouselCardsState] = useState<string[]>(['all', 'cash_bank', 'detailed_analysis', 'health']);
  const [defaultStatsView, setDefaultStatsViewState] = useState<string>('all');
  const [chartStyle, setChartStyleState] = useState<'area' | 'line'>('area');
  const [budgetMode, setBudgetModeState] = useState<BudgetMode>('regular');
  const [zbbMode, setZbbModeState] = useState<'flexible' | 'strict'>('flexible');
  const [monthlyIncome, setMonthlyIncomeState] = useState<number>(0);
  const [monthlyIncomes, setMonthlyIncomes] = useState<MonthlyIncome[]>([]);
  const [budgetReallocations, setBudgetReallocations] = useState<BudgetReallocation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const unreadNotifCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

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
      try { localStorage.setItem('moneyapp-theme', s.theme); } catch { }
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
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('test_bypass_auth') === 'true') {
        setAuthUser({ uid: 'test-user-uid', email: 'test@example.com' });
        setAuthChecked(true);
        return;
      }
    } catch (e) { }
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
        
        // Block initial load ONLY if the user changed accounts on this device,
        // or if it's the very first time they log in (lastUid is null).
        const isNewUserOnDevice = !lastUid || lastUid !== u.uid;

        if (!isNewUserOnDevice) {
          await migrateFromIndexedDBToFirebase();
        }

        if (isNewUserOnDevice) {
          // Akun berbeda → pull data Firestore akun baru ke IDB secara sinkron.
          setAutoCloudSync({ status: 'pulling' });
          try {
            const result = await dbForceCloudSync();
            setAutoCloudSync({ status: 'success', total: result.total });
            sessionStorage.setItem('cloud_synced_uid', u.uid);
          } catch (err: any) {
            setAutoCloudSync({ status: 'error', message: err?.message || 'Gagal sinkronisasi dari cloud' });
          }
        } else {
          setAutoCloudSync({ status: 'idle' });
          // Lakukan background sync jika belum sync di sesi ini, tanpa memblokir SplashScreen!
          if (!sessionSyncedUid || sessionSyncedUid !== u.uid) {
            dbForceCloudSync().then(() => {
              sessionStorage.setItem('cloud_synced_uid', u.uid);
            }).catch(console.error);
          }
        }
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
    if (isFirebaseConfigured && !authUser && !(typeof window !== 'undefined' && localStorage.getItem('test_bypass_auth') === 'true')) return;
    const bootstrap = async () => {
      // One-time migration from localStorage
      await migrateFromLocalStorage();

      // Load all data from IndexedDB
      const [
        dbAssets, dbTxs, dbCats, dbBudgets, dbDebts, dbGoals, dbRecurring, dbContacts, dbSubs, dbTrips, dbTripExpenses, dbMonthlyIncomes, dbReallocations, dbNotifications
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
        dbGetAllNotifications(),
      ]);

      const hasMigratedV1_0_18 = localStorage.getItem('migrated_v1_0_18_debts');
      if (!hasMigratedV1_0_18 && dbTxs.length > 0) {
        let migratedCount = 0;
        const updatedTxs = dbTxs.map(tx => {
          let newType = tx.type;
          if (tx.type === 'pengeluaran') {
            if ((tx as any).categoryId === 'Pinjaman & Piutang' || (tx as any).categoryId === 'Tambah Piutang') newType = 'piutang_keluar';
            else if ((tx as any).categoryId === 'Bayar Hutang') newType = 'hutang_keluar';
          } else if (tx.type === 'pendapatan') {
            if ((tx as any).categoryId === 'Pelunasan Piutang') newType = 'piutang_masuk';
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

      // ─── Category ID Migration (Phase 1) ──────────────────────────────────
      const hasMigratedCatId = localStorage.getItem('migrated_categoryId_ids_v3');
      if (!hasMigratedCatId && (dbTxs.length > 0 || dbRecurring.length > 0 || dbSubs.length > 0)) {
        console.log('Running Category ID migration...');
        let needsMigration = false;
        
        // Helper to find or create categoryId shadow
        const getCatIds = (tx: any) => {
          const categoryName = tx.category || tx.categoryId;
          const subCategoryName = tx.subCategory || tx.subCategoryId;
          let cat = dbCats.find(c => c.name.toLowerCase() === categoryName?.toLowerCase() && c.type === tx.type);
          if (!cat && categoryName) {
            // Create shadow categoryId to prevent orphan transactions
            cat = {
              id: `cat-migrated-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: categoryName,
              type: tx.type as any,
              subcategories: [],
              isDeleted: true
            };
            dbCats.push(cat);
            import('../lib/db').then(m => m.dbPutCategory(cat!));
          }
          let subCatId = undefined;
          if (subCategoryName && cat) {
            const sub = cat.subcategories?.find(s => s.name.toLowerCase() === subCategoryName?.toLowerCase());
            if (sub) subCatId = sub.id;
          }
          return { categoryId: cat?.id || 'unknown', subCategoryId: subCatId };
        };

        const migrateArray = (arr: any[]) => {
          return arr.map(item => {
            if (item.category && !item.categoryId) {
              needsMigration = true;
              const { categoryId, subCategoryId } = getCatIds(item);
              // Remove old fields while mapping
              const { category, subCategory, ...rest } = item;
              return { ...rest, categoryId, subCategoryId };
            }
            return item;
          });
        };

        const migratedTxs = migrateArray(dbTxs) as Transaction[];
        const migratedRec = migrateArray(dbRecurring) as RecurringTransaction[];
        const migratedSubs = migrateArray(dbSubs) as Subscription[];

        if (needsMigration) {
          const mDb = await import('../lib/db');
          await Promise.all([
            ...migratedTxs.map(tx => mDb.dbPutTransaction(tx)),
            ...migratedRec.map(r => mDb.dbPutRecurringTransaction(r)),
            ...migratedSubs.map(s => mDb.dbPutSubscription(s))
          ]);
          migratedTxs.forEach((tx, i) => { dbTxs[i] = tx; });
          migratedRec.forEach((r, i) => { dbRecurring[i] = r; });
          migratedSubs.forEach((s, i) => { dbSubs[i] = s; });
          console.log('Category ID migration completed.');
        }
        localStorage.setItem('migrated_categoryId_ids_v3', 'true');
      }

      // ─── Recovery of "unknown" categories from Firestore ────────────────
      const hasRecoveredUnknown = authUser?.uid ? localStorage.getItem(`recovered_unknown_categories_${authUser.uid}_v2`) : null;
      const hasUnknownTxs = dbTxs.some(tx => tx.categoryId === 'unknown');
      if (!hasRecoveredUnknown && hasUnknownTxs && isFirebaseConfigured && authUser?.uid) {
        console.log('Attempting to recover unknown categories from Firestore...');
        try {
          const mDb = await import('../lib/db');
          const snapshot = await getDocs(collection(firestore, 'users', authUser.uid, 'transactions'));
          const cloudTxsMap = new Map<string, any>();
          snapshot.docs.forEach(doc => {
            cloudTxsMap.set(doc.id, doc.data());
          });

          let recoveredCount = 0;
          const updatedTxs = dbTxs.map(tx => {
            if (tx.categoryId === 'unknown') {
              const cloudTx = cloudTxsMap.get(tx.id);
              if (cloudTx && (cloudTx.category || (cloudTx.categoryId && cloudTx.categoryId !== 'unknown'))) {
                const categoryName = cloudTx.category || cloudTx.categoryId;
                const subCategoryName = cloudTx.subCategory || cloudTx.subCategoryId;
                
                let cat = dbCats.find(c => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === tx.type);
                if (!cat) {
                  // Create shadow category to prevent orphans
                  cat = {
                    id: `cat-migrated-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    name: categoryName,
                    type: tx.type as any,
                    subcategories: [],
                    isDeleted: true
                  };
                  dbCats.push(cat);
                  mDb.dbPutCategory(cat);
                }
                
                let subCatId = undefined;
                if (subCategoryName && cat) {
                  const sub = cat.subcategories?.find(s => s.name.toLowerCase() === subCategoryName.toLowerCase());
                  if (sub) subCatId = sub.id;
                }
                
                recoveredCount++;
                return { ...tx, categoryId: cat.id, subCategoryId: subCatId };
              }
            }
            return tx;
          });

          if (recoveredCount > 0) {
            await Promise.all(updatedTxs.filter((tx, i) => tx.categoryId !== dbTxs[i].categoryId).map(tx => mDb.dbPutTransaction(tx)));
            updatedTxs.forEach((tx, i) => { dbTxs[i] = tx; });
            console.log(`Successfully recovered ${recoveredCount} unknown transactions from Firestore.`);
          }
          localStorage.setItem(`recovered_unknown_categories_${authUser.uid}_v2`, 'true');
        } catch (err) {
          console.error('Failed to recover unknown categories:', err);
        }
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

      let finalCats = dbCats;
      if (dbCats.length === 0) {
        for (const c of DEFAULT_CATEGORIES) await dbPutCategory(c, { skipSync: true });
        finalCats = [...DEFAULT_CATEGORIES];
      }
      
      for (const sysCat of SYSTEM_CATEGORIES) {
        if (!finalCats.some(c => c.id === sysCat.id)) {
          finalCats.push(sysCat);
          await import('../lib/db').then(m => m.dbPutCategory(sysCat, { skipSync: true }));
        }
      }
      setCategories([...finalCats]);

      setBudgets(dbBudgets);
      setDebts(dbDebts as Debt[]);
      setGoals(dbGoals as Goal[]);
      setTransactions([...dbTxs]);
      setTrips(dbTrips as Trip[]);
      setTripExpenses(dbTripExpenses as TripExpense[]);
      setMonthlyIncomes(dbMonthlyIncomes as MonthlyIncome[]);
      setBudgetReallocations(dbReallocations as BudgetReallocation[]);
      setNotifications(dbNotifications as NotificationItem[]);

      // Load settings
      let profile = await dbGetSetting('user') as UserProfile | undefined;
      const savedPin = await dbGetSetting('pin') as string | undefined;
      const savedTheme = await dbGetSetting('theme') as string | undefined;
      const savedPrivacy = await dbGetSetting('isPrivateMode') as boolean | undefined;
      const savedDefaultAssetId = await dbGetSetting('defaultAssetId') as string | undefined;
      const savedStartMonth = await dbGetSetting('startOfMonthDay') as number | undefined;
      const savedShowDebtInTx = await dbGetSetting('showDebtInTransactions') as boolean | undefined;
      const savedCurrency = await dbGetSetting('currencySymbol') as string | undefined;
      const savedGrouping = await dbGetSetting('defaultTransactionGrouping') as 'date' | 'categoryId' | undefined;

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

      console.log('--- MONEYAPP DIAGNOSTICS ---');
      console.log('User UID:', authUser?.uid || 'Not Logged In');
      console.log('Firebase Configured:', isFirebaseConfigured);
      console.log('Local Transactions Count:', dbTxs.length);
      console.log('Local Categories Count:', dbCats.length);
      
      const unknownTxs = dbTxs.filter(tx => tx.categoryId === 'unknown');
      console.log('Unknown categoryId Txs:', unknownTxs.length);
      if (unknownTxs.length > 0) {
        console.log('First 5 Unknown Txs:', unknownTxs.slice(0, 5).map(tx => ({ id: tx.id, date: tx.date, note: tx.note, amount: tx.amount, type: tx.type })));
      }
      
      const undefinedCatTxs = dbTxs.filter(tx => !tx.categoryId);
      console.log('Undefined/empty categoryId Txs:', undefinedCatTxs.length);
      if (undefinedCatTxs.length > 0) {
        console.log('First 5 Undefined Cat Txs:', undefinedCatTxs.slice(0, 5).map(tx => ({ id: tx.id, date: tx.date, note: tx.note, amount: tx.amount, type: tx.type })));
      }
      
      const missingCatTxs = dbTxs.filter(tx => tx.categoryId && tx.categoryId !== 'unknown' && !dbCats.some(c => c.id === tx.categoryId));
      console.log('Txs with categoryId missing from dbCats:', missingCatTxs.length);
      if (missingCatTxs.length > 0) {
        console.log('First 5 Missing Cat Txs:', missingCatTxs.slice(0, 5).map(tx => ({ id: tx.id, categoryId: tx.categoryId, date: tx.date, note: tx.note })));
      }
      console.log('----------------------------');

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

  useEffect(() => {
    if (isReady && isFirebaseConfigured) {
      refreshSyncCount();
      // Poll sync count every 10 seconds and automatically sync if there's pending data
      const interval = setInterval(async () => {
        const count = await dbGetPendingSyncCount();
        if (count > 0) {
          syncData();
        } else {
          setPendingSyncCount(0);
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isReady, transactions, assets, debts, syncData, refreshSyncCount]);

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
      const isPrincipal = isPrincipalTx(txToDelete.note, txToDelete.categoryId, categories);

      if (isPrincipal) {
        const debtId = txToDelete.relatedId;
        const otherPrincipalTxs = transactions.filter(tx =>
          tx.relatedId === debtId &&
          tx.id !== id &&
          isPrincipalTx(tx.note, tx.categoryId, categories)
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
              return isPrincipalTx(tx.note, tx.categoryId, categories) ? sum : sum + Number(tx.amount || 0);
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
          !isPrincipalTx(t.note, t.categoryId, categories)
        ).length;

        setDebts(prev => prev.map(d => {
          if (d.id !== txToDelete.relatedId) return d;

          // Recalculate isPaid based on new transaction sum
          const history = transactions.filter(t => t.relatedId === d.id && t.id !== id);
          const paidAmt = history.reduce((sum, tx) => {
            return isPrincipalTx(tx.note, tx.categoryId, categories) ? sum : sum + Number(tx.amount || 0);
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
      const cat = categories.find(c => c.id === txToDelete.categoryId);
      const isTripExpense = cat?.name === 'Liburan & Perjalanan' &&
                            cat.subcategories?.find(s => s.id === txToDelete.subCategoryId)?.name === 'Biaya Trip';
      if (isTripExpense) {
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
      // Delete any orphan transactions (e.g. admin fees) related to this one
      const orphanIds = transactions.filter(t => t.relatedId === id).map(t => t.id);
      if (orphanIds.length > 0) {
        orphanIds.forEach(orphanId => dbDeleteTransaction(orphanId));
      }
      setTransactions(prev => prev.filter(tx => tx.id !== id && !orphanIds.includes(tx.id)));
      dbDeleteTransaction(id).then(refreshSyncCount);
    }
  }, [transactions, refreshSyncCount, categories, debts]);

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
    setCategories(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, name };
      dbPutCategory(updated).then(refreshSyncCount);
      return updated;
    }));
  }, [refreshSyncCount]);

  const updateSubCategory = useCallback((categoryId: string, subId: string, name: string) => {
    setCategories(prev => prev.map(c => {
      if (c.id !== categoryId) return c;
      const updatedSubcategories = (c.subcategories || []).map(sub => {
        if (sub.id !== subId) return sub;
        return { ...sub, name };
      });
      const updated = { ...c, subcategories: updatedSubcategories };
      dbPutCategory(updated).then(refreshSyncCount);
      return updated;
    }));
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
  const addDebt = useCallback((debtReq: Omit<Debt, 'id'>, initialMode: 'none' | 'cash' | 'credit' = 'none', categoryIdName?: string, subCategoryIdName?: string) => {
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
          amount: newDebt.principalAmount || newDebt.totalAmount,
          categoryId: 'sys-cat-receivable-pay',
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
      if (initialMode === 'cash' && newDebt.paymentAssetId) {
        // Receive loan principal: Account balance increases (Income-like but ignored in stats)
        _createTx({
          type: 'hutang_masuk',
          amount: newDebt.principalAmount || newDebt.totalAmount,
          categoryId: 'sys-cat-debt-receive',
          subCategoryId: subCategoryIdName,
          date,
          time,
          note: existingDebt
            ? `Penambahan Hutang: ${newDebt.contact} (${newDebt.description || 'Baru'})`
            : `Penerimaan dana pinjaman dari ${newDebt.contact}`,
          assetId: newDebt.paymentAssetId,
          relatedId: debtId,
        });
      } else if (initialMode === 'credit' && newDebt.liabilityAssetId) {
        // Credit/Paylater purchase: Account balance decreases (Expense)
        _createTx({
          type: 'pengeluaran',
          amount: newDebt.principalAmount || newDebt.totalAmount,
          categoryId: categoryIdName || categories.find(c => c.name === 'Lainnya')?.id || '',
          subCategoryId: subCategoryIdName,
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
          isPrincipalTx(tx.note, tx.categoryId, categories)
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
      if (!paidInstallmentKeysRef.current.has(txKey)) {
        paidInstallmentKeysRef.current.add(txKey);
        const today = getLocalDate();
        const time = getLocalTime();
        const amt = debt.installmentAmount || 0;
        const note = `Cicilan ${debt.contact} (${nextPaid}/${debt.totalInstallments || '?'})`;

        if (debt.type === 'hutang') {
          // Bayar hutang: Transfer dari paymentAssetId → liabilityAssetId
          _createTx({
            type: 'transfer',
            amount: amt,
            categoryId: 'Transfer',
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
            categoryId: 'sys-cat-receivable-receive',
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
    if (!paidInstallmentKeysRef.current.has(txKey)) {
      paidInstallmentKeysRef.current.add(txKey);
      const today = overrideDate || getLocalDate();
      const time = overrideTime || getLocalTime();

      const history = transactions.filter(t => t.relatedId === debtId);
      const paidAmt = history.reduce((sum, tx) => {
        return isPrincipalTx(tx.note, tx.categoryId, categories) ? sum : sum + Number(tx.amount || 0);
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
              categoryId: 'Transfer',
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
              categoryId: 'sys-cat-debt-pay',
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
            categoryId: 'sys-cat-receivable-receive',
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
  }, [debts, transactions, categories]);

  const addDebtPayment = useCallback((debtId: string, amount: number, assetId: string, date: string, time: string, note: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    if (debt.type === 'hutang') {
      if (debt.liabilityAssetId) {
        _createTx({
          type: 'transfer',
          amount,
          categoryId: 'Transfer',
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
          categoryId: 'sys-cat-debt-pay',
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
        categoryId: 'sys-cat-receivable-receive',
        date,
        time,
        note,
        assetId,
        relatedId: debtId,
      });
    }

    const totalPaid = transactions
      .filter(t => t.relatedId === debtId)
      .reduce((sum, tx) => isPrincipalTx(tx.note, tx.categoryId, categories) ? sum : sum + Number(tx.amount || 0), 0) + amount;

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
        type: 'hutang_masuk',
        amount,
        categoryId: 'sys-cat-debt-receive',
        date,
        time,
        note,
        assetId: assetId || undefined,
        relatedId: debtId,
      });
    } else {
      _createTx({
        type: 'piutang_keluar',
        amount,
        categoryId: 'sys-cat-receivable-pay',
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
        return isPrincipalTx(tx.note, tx.categoryId, categories) ? sum : sum + Number(tx.amount);
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
        categoryId: 'Bayar Hutang',
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
        categoryId: 'Pelunasan Piutang',
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
    let balance = Number(asset.initialBalance) || 0;
    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if ((tx.type === 'pendapatan' || tx.type === 'piutang_masuk' || tx.type === 'hutang_masuk') && tx.assetId === assetId) balance += amt;
      else if ((tx.type === 'pengeluaran' || tx.type === 'piutang_keluar' || tx.type === 'hutang_keluar') && tx.assetId === assetId) balance -= amt;
      else if (tx.type === 'transfer' && tx.fromAssetId === assetId) balance -= amt;
      else if (tx.type === 'transfer' && tx.toAssetId === assetId) balance += amt;
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

  const setDefaultTransactionGrouping = useCallback((grouping: 'date' | 'categoryId') => {
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

  const recoverUnknownCategories = useCallback(async () => {
    if (!isFirebaseConfigured || !authUser?.uid) {
      return { success: false, recoveredCount: 0, message: 'Firebase tidak dikonfigurasi atau Anda belum masuk.' };
    }
    try {
      const mDb = await import('../lib/db');
      const { collection, getDocs } = await import('firebase/firestore');
      const snapshot = await getDocs(collection(firestore, 'users', authUser.uid, 'transactions'));
      const cloudTxsMap = new Map<string, any>();
      snapshot.docs.forEach(doc => {
        cloudTxsMap.set(doc.id, doc.data());
      });

      let recoveredCount = 0;
      const dbTxs = await mDb.dbGetAllTransactions();
      const dbCats = await mDb.dbGetAllCategories();

      const updatedTxs = dbTxs.map(tx => {
        if (tx.categoryId === 'unknown') {
          const cloudTx = cloudTxsMap.get(tx.id);
          if (cloudTx && (cloudTx.category || (cloudTx.categoryId && cloudTx.categoryId !== 'unknown'))) {
            const categoryName = cloudTx.category || cloudTx.categoryId;
            const subCategoryName = cloudTx.subCategory || cloudTx.subCategoryId;
            
            let cat = dbCats.find(c => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === tx.type);
            if (!cat) {
              cat = {
                id: `cat-migrated-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                name: categoryName,
                type: tx.type as any,
                subcategories: [],
                isDeleted: true
              };
              dbCats.push(cat);
              mDb.dbPutCategory(cat);
            }
            
            let subCatId = undefined;
            if (subCategoryName && cat) {
              const sub = cat.subcategories?.find(s => s.name.toLowerCase() === subCategoryName.toLowerCase());
              if (sub) subCatId = sub.id;
            }
            
            recoveredCount++;
            return { ...tx, categoryId: cat.id, subCategoryId: subCatId };
          }
        }
        return tx;
      });

      if (recoveredCount > 0) {
        await Promise.all(updatedTxs.filter((tx, i) => tx.categoryId !== dbTxs[i].categoryId).map(tx => mDb.dbPutTransaction(tx)));
        setTransactions(updatedTxs);
        // Force refresh categories to register any new shadows
        const freshCats = await mDb.dbGetAllCategories();
        setCategories(freshCats);
        
        // Reset recovery flag for uid so it doesn't prevent future recoveries
        localStorage.setItem(`recovered_unknown_categories_${authUser.uid}_v2`, 'true');

        return { success: true, recoveredCount, message: `Berhasil memulihkan ${recoveredCount} transaksi!` };
      }
      return { success: true, recoveredCount: 0, message: 'Tidak ada transaksi dengan kategori "unknown" yang dapat dipulihkan di server.' };
    } catch (err: any) {
      console.error('Manual recovery failed:', err);
      return { success: false, recoveredCount: 0, message: `Gagal memproses pemulihan: ${err?.message || err}` };
    }
  }, [authUser?.uid]);

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
    setBudgetReallocations(prev => prev.filter(r => r.id !== id));
    dbDeleteBudgetReallocation(id);
  }, []);

  const markNotifAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id) {
        const updated = { ...n, isRead: true };
        dbPutNotification(updated);
        return updated;
      }
      return n;
    }));
  }, []);

  const deleteNotif = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    dbDeleteNotification(id);
    
    try {
      const dismissed = JSON.parse(localStorage.getItem('dismissedNotifIds') || '[]');
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        if (dismissed.length > 500) dismissed.shift();
        localStorage.setItem('dismissedNotifIds', JSON.stringify(dismissed));
      }
    } catch (e) {}
  }, []);

  const clearAllNotifs = useCallback(() => {
    setNotifications(prev => {
      try {
        const dismissed = JSON.parse(localStorage.getItem('dismissedNotifIds') || '[]');
        prev.forEach(n => {
          if (!dismissed.includes(n.id)) dismissed.push(n.id);
        });
        const recentDismissed = dismissed.slice(-500);
        localStorage.setItem('dismissedNotifIds', JSON.stringify(recentDismissed));
      } catch (e) {}
      return [];
    });
    dbClearAllNotifications();
  }, []);
  // ─── Automated Notification Generator ─────────────────────────────────────
  useEffect(() => {
    if (!isReady || !user) return;

    const timer = setTimeout(() => {
      let newNotifs: Omit<NotificationItem, 'isRead'>[] = [];
      const now = new Date();
      const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
      
      const addNotif = (notif: Omit<NotificationItem, 'isRead'>) => {
        try {
          const dismissedIds = JSON.parse(localStorage.getItem('dismissedNotifIds') || '[]');
          if (!notifications.some(n => n.id === notif.id) && !dismissedIds.includes(notif.id)) {
            newNotifs.push(notif);
          }
        } catch (e) {
          if (!notifications.some(n => n.id === notif.id)) {
            newNotifs.push(notif);
          }
        }
      };

      // 1. Budget Warning
      budgets.forEach(b => {
        const m = b.month;
        const y = b.year;
        if (m !== now.getMonth() + 1 || y !== now.getFullYear()) return;

        let spent = 0;
        transactions.forEach(t => {
          if (t.type === 'pengeluaran' && t.categoryId === b.categoryId) {
            const txDate = new Date(t.date);
            if (txDate.getMonth() + 1 === m && txDate.getFullYear() === y) spent += t.amount;
          }
        });

        const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
        if (pct >= 75) {
          const cat = categories.find(c => c.id === b.categoryId);
          if (cat) {
            addNotif({
              id: `budget-warning-${cat.id}-${y}-${m}`,
              title: 'Anggaran Hampir Habis',
              message: `Kategori ${cat.name} sudah memakai ${Math.round(pct)}% dari anggaran bulan ini.`,
              icon: 'trending_up',
              color: 'warning',
              createdAt: now.toISOString()
            });
          }
        }
      });

      // 2. Large Expense (>= 500,000)
      transactions.forEach(tx => {
        if (tx.type === 'pengeluaran' && tx.amount >= 500000) {
          const cat = categories.find(c => c.id === tx.categoryId);
          addNotif({
            id: `large-expense-${tx.id}`,
            title: 'Pengeluaran Besar Terdeteksi',
            message: `Kamu mencatat pengeluaran sebesar ${fmt(tx.amount)} untuk kategori ${cat?.name || 'Lainnya'}.`,
            icon: 'warning',
            color: 'error',
            createdAt: new Date(tx.date).toISOString()
          });
        }
      });

      // 3. Subscriptions
      subscriptions.filter(s => s.isActive).forEach(sub => {
        if (!sub.nextBillingDate) return;
        const bDate = new Date(sub.nextBillingDate);
        const diffDays = Math.ceil((bDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const cycleId = sub.nextBillingDate;

        if (diffDays < 0) {
          addNotif({
            id: `sub-overdue-${sub.id}-${cycleId}`,
            title: `Langganan ${sub.name} Jatuh Tempo`,
            message: `Tagihan ${fmt(sub.amount)} untuk ${sub.name} sudah lewat ${Math.abs(diffDays)} hari.`,
            icon: 'credit_card_off',
            color: 'error',
            createdAt: bDate.toISOString()
          });
        } else if (diffDays <= 7) {
          addNotif({
            id: `sub-soon-${sub.id}-${cycleId}`,
            title: `Langganan ${sub.name} Mendekat`,
            message: `Tagihan ${fmt(sub.amount)} akan ditagih dalam ${diffDays === 0 ? 'hari ini' : diffDays + ' hari'}.`,
            icon: 'credit_card',
            color: 'warning',
            createdAt: now.toISOString()
          });
        }
      });

      // 4. Debts
      debts.filter(d => !d.isPaid).forEach(d => {
        if (!d.dueDate) return;
        const dDate = new Date(d.dueDate);
        const diffDays = Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isHutang = d.type === 'hutang';
        const label = isHutang ? 'Hutang' : 'Piutang';
        
        const history = transactions.filter(t => t.relatedId === d.id);
        const paidAmt = history.reduce((sum, tx) => isPrincipalTx(tx.note, tx.categoryId, categories) ? sum : sum + Number(tx.amount || 0), 0);
        const remaining = Math.max(0, Number(d.totalAmount || 0) - paidAmt);

        if (remaining <= 0) return;

        if (diffDays < 0) {
          addNotif({
            id: `debt-overdue-${d.id}`,
            title: `${label} ke ${d.contact} Jatuh Tempo`,
            message: `${label} sebesar ${fmt(remaining)} sudah lewat dari tanggal jatuh tempo.`,
            icon: isHutang ? 'trending_down' : 'trending_up',
            color: 'error',
            createdAt: dDate.toISOString()
          });
        } else if (diffDays <= 7) {
          addNotif({
            id: `debt-soon-${d.id}`,
            title: `${label} ${d.contact} Segera Jatuh Tempo`,
            message: `${label} sebesar ${fmt(remaining)} akan jatuh tempo dalam ${diffDays === 0 ? 'hari ini' : diffDays + ' hari'}.`,
            icon: isHutang ? 'trending_down' : 'trending_up',
            color: 'warning',
            createdAt: now.toISOString()
          });
        }
      });

      // 5. Goals Achieved
      goals.forEach(g => {
        const linkedTxs = transactions.filter(tx => tx.goalId === g.id);
        const total = linkedTxs.reduce((sum, tx) => {
          if (tx.type === 'pendapatan') return sum + tx.amount;
          if (tx.type === 'transfer') return sum + tx.amount;
          if (tx.type === 'pengeluaran') return sum - tx.amount;
          return sum;
        }, 0);
        const currentAmount = Math.max(0, total);

        if (currentAmount >= g.targetAmount) {
          addNotif({
            id: `goal-achieved-${g.id}`,
            title: 'Target Tabungan Tercapai!',
            message: `Selamat! Target "${g.name}" sudah terkumpul 100%.`,
            icon: 'emoji_events',
            color: 'success',
            createdAt: now.toISOString()
          });
        }
      });

      // 6. AI Insight
      if (transactions.length >= 10) {
        const weekStr = `${now.getFullYear()}-W${Math.floor(now.getDate() / 7)}`;
        addNotif({
          id: `ai-insight-${weekStr}`,
          title: 'Insight AI Mingguan Tersedia',
          message: 'AI telah menganalisis pengeluaran terbarumu. Lihat insight di halaman Home.',
          icon: 'auto_awesome',
          color: 'primary',
          createdAt: now.toISOString()
        });
      }

      if (newNotifs.length > 0) {
        const toSave = newNotifs.map(n => ({ ...n, isRead: false }));
        setNotifications(prev => {
          const combined = [...toSave, ...prev];
          // Sort descending by createdAt
          combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return combined;
        });
        toSave.forEach(n => dbPutNotification(n));
      }

    }, 3000);

    return () => clearTimeout(timer);
  }, [isReady, transactions, budgets, debts, subscriptions, goals, categories, notifications]);

  const validateTransactionBudget = useCallback((tx: Partial<Transaction>) => {
    if (budgetMode !== 'zero-based' || zbbMode !== 'strict') return { isValid: true, deficitCategory: null, deficitAmount: 0 };
    if (tx.type !== 'pengeluaran') return { isValid: true, deficitCategory: null, deficitAmount: 0 };

    const cat = categories.find(c => c.id === tx.categoryId && c.type === 'pengeluaran' && !c.isDeleted) ||
      categories.find(c => c.id === tx.categoryId && c.type === 'pengeluaran');
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
      if (t.id !== tx.id && t.type === 'pengeluaran' && t.categoryId === tx.categoryId) {
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
    moveBudgetMoney, validateTransactionBudget, recoverUnknownCategories,
    notifications, unreadNotifCount, markNotifAsRead, deleteNotif, clearAllNotifs
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
    moveBudgetMoney, validateTransactionBudget, recoverUnknownCategories,
    notifications, unreadNotifCount, markNotifAsRead, deleteNotif, clearAllNotifs
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
