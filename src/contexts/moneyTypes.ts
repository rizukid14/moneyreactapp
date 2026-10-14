export type AssetType = 'Cash' | 'Bank Account' | 'Credit Card' | 'eWallet' | 'Savings' | 'Investment' | 'Loan';
export type BudgetMode = 'regular' | 'zero-based';
export type DebtTransactionRole = 'principal' | 'payment' | 'offset';

export interface SavingsChallenge {
  id: string;
  type: '52_week' | 'no_spend';
  title: string;
  targetAmount?: number;
  currentAmount?: number;
  currentWeek?: number;
  noSpendStreak?: number;
  lastNoSpendCheck?: string; // YYYY-MM-DD
  isCompleted?: boolean;
  updatedAt?: number;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  dailyReminder?: boolean;
  weeklyReport?: boolean;
  lastLoginDate?: string;
  loginStreak?: number;
  rewardPoints?: number;
  unlockedWorkspaceSlots?: number;
  emergencyFundMonthsTarget?: number; // Default 6 months
  savingsChallenges?: SavingsChallenge[];
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
  updatedAt?: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  initialBalance: number;
  isHidden?: boolean;
  isDeleted?: boolean;
  accountNumber?: string;
  currency?: string;            // 'IDR' | 'USD' | 'SGD' | 'JPY' | 'SAR'
  statementCutoffDay?: number;  // 1-31 (Billing Cut-off Day for Credit Cards)
  paymentDueDay?: number;       // 1-31 (Payment Due Day for Credit Cards)
  isEmergencyFund?: boolean;    // Emergency Fund Shield Flag
  updatedAt?: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface Budget {
  id: string;
  categoryId: string | null;
  limit: number;
  period: 'monthly';
  month: number;
  year: number;
  updatedAt?: number;
}

export interface AutoSettleOptions {
  mode: 'note_only' | 'with_tx';
  outAssetId?: string;
  inAssetId?: string;
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
  principalAmount?: number;
  interestType?: 'fixed' | 'percentage';
  interestRate?: number;
  interestAmount?: number;
  isInstallment: boolean;
  installmentAmount?: number;
  installmentDay?: number;
  totalInstallments?: number;
  paidInstallments: number;
  liabilityAssetId?: string;
  paymentAssetId?: string;
  receiveAssetId?: string;
  sourceAssetId?: string;
  tripId?: string;
  relatedId?: string;
  excludeAutoOffset?: boolean;
  sourceSplitId?: string;
  sourceSplitMember?: string;
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
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
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
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
  assignments: string[];
}

export interface TripExpense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  payerId: string;
  splits: TripExpenseSplit[];
  items?: TripExpenseItem[];
  date: string;
  createdAt: string;
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
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
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

export interface MonthlyIncome {
  id: string; // format: "YYYY-MM"
  month: number;
  year: number;
  amount: number;
  isLocked: boolean;
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

export interface BudgetReallocation {
  id: string;
  month: number;
  year: number;
  fromCategoryId: string | 'unassigned';
  toCategoryId: string | 'unassigned';
  amount: number;
  date: string;
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

export interface ItemizedDetail {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
  subCategoryId?: string;
}

export interface DebtAllocation {
  principalTxId: string;
  amount: number;
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
  relatedId?: string;
  sourceRecurringId?: string;
  debtRole?: DebtTransactionRole;
  debtAllocations?: DebtAllocation[];
  goalId?: string;
  currency?: string;
  exchangeRate?: number;
  itemizedDetails?: ItemizedDetail[];
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
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
  anchorDate?: string;
  startDate: string;
  lastProcessedDate?: string;
  endDate?: string;
  isActive: boolean;
  goalId?: string;
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  categoryId?: string;
  icon?: string;
  assetId: string;
  isActive: boolean;
  note?: string;
  recurringTransactionId?: string;
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  icon: string;
  color: 'success' | 'warning' | 'error' | 'info' | 'primary';
  createdAt: string;
  isRead: boolean;
  updatedAt?: number;
  isDeleted?: boolean;
  createdBy?: string;
  updatedBy?: string;
}

export interface ApplySettingsPayload {
  user?: UserProfile;
  pin?: string | null;
  theme?: 'light' | 'dark';
  isPrivateMode?: boolean;
  defaultAssetId?: string | null;
  startOfMonthDay?: number;
  showDebtInTransactions?: boolean;
  autoOffsetDebts?: boolean;
  currencySymbol?: string;
  defaultTransactionGrouping?: 'date' | 'categoryId';
  assetCarouselCards?: string[];
  statsCarouselCards?: string[];
  defaultStatsView?: string;
  chartStyle?: 'area' | 'line';
  budgetMode?: BudgetMode;
  zbbMode?: 'flexible' | 'strict';
  monthlyIncome?: number;
}

export const SYS_CAT = {
  ADMIN_FEE: 'sys-cat-admin-fee',
  BALANCE_ADJ: 'sys-cat-balance-adj',
  ROUNDING_DIFF: 'sys-cat-rounding-diff',
  DEBT_PAY: 'sys-cat-debt-pay',
  DEBT_RECEIVE: 'sys-cat-debt-receive',
  RECEIVABLE_PAY: 'sys-cat-receivable-pay',
  RECEIVABLE_RECEIVE: 'sys-cat-receivable-receive',
  TRIP: 'sys-cat-trip-expense',
  TRIP_SUB: 'sys-sub-trip'
} as const;

export const SYSTEM_CATEGORIES: Category[] = [
  { id: 'sys-cat-debt-pay', name: 'Bayar Hutang', type: 'hutang_keluar' },
  { id: 'sys-cat-debt-receive', name: 'Terima Pinjaman', type: 'hutang_masuk' },
  { id: 'sys-cat-receivable-pay', name: 'Memberi Pinjaman', type: 'piutang_keluar' },
  { id: 'sys-cat-receivable-receive', name: 'Pelunasan Piutang', type: 'piutang_masuk' },
  { id: 'sys-cat-admin-fee', name: 'Biaya Admin', type: 'pengeluaran' },
  { id: 'sys-cat-balance-adj', name: 'Koreksi Saldo', type: 'pengeluaran' },
  { id: 'sys-cat-rounding-diff', name: 'Pembulatan / Selisih Bayar', type: 'pengeluaran' },
  { id: 'sys-cat-trip-expense', name: 'Liburan & Perjalanan', type: 'pengeluaran', subcategories: [{ id: 'sys-sub-trip', name: 'Biaya Trip', isDeleted: false }] },
];

export const DEFAULT_ASSET: Asset = { id: 'default-1', name: 'Dompet Tunai', type: 'Cash', initialBalance: 0 };

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Makanan', type: 'pengeluaran', subcategories: [{ id: 'sub-1', name: 'Makan Diluar' }, { id: 'sub-2', name: 'Groceries' }] },
  { id: 'cat-2', name: 'Transportasi', type: 'pengeluaran', subcategories: [{ id: 'sub-3', name: 'Bensin' }, { id: 'sub-4', name: 'Parkir' }] },
  { id: 'cat-3', name: 'Hiburan', type: 'pengeluaran', subcategories: [] },
  { id: 'cat-4', name: 'Belanja', type: 'pengeluaran', subcategories: [{ id: 'sub-5', name: 'Laundry & Jasa' }, { id: 'sub-6', name: 'Pakaian & Kebutuhan' }] },
  { id: 'cat-5', name: 'Tagihan', type: 'pengeluaran', subcategories: [{ id: 'sub-7', name: 'Listrik & Utilitas' }, { id: 'sub-8', name: 'Pulsa & Internet' }] },
  { id: 'cat-6', name: 'Gaji', type: 'pendapatan', subcategories: [] },
  { id: 'cat-7', name: 'Bonus', type: 'pendapatan', subcategories: [] },
  { id: 'cat-8', name: 'Investasi', type: 'pendapatan', subcategories: [] },
];

export const DEFAULT_USER: UserProfile = { name: 'Pengguna Monetiq', email: 'pengguna@email.com', loginStreak: 0, rewardPoints: 0 };
