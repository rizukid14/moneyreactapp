export interface ServerSubcategory {
  id?: string;
  name?: string;
  isDeleted?: boolean;
}

export interface ServerCategory {
  id?: string;
  name?: string;
  type?: string;
  isDeleted?: boolean;
  subcategories?: (ServerSubcategory | string)[];
}

export interface ServerAsset {
  id?: string;
  name?: string;
  type?: string;
  balance?: number;
  isDeleted?: boolean;
}

export interface ServerTransaction {
  id?: string;
  date?: string;
  type?: string;
  amount?: number;
  categoryId?: string;
  category?: string;
  subCategoryId?: string;
  subCategory?: string;
  note?: string;
  assetId?: string;
  fromAssetId?: string;
  toAssetId?: string;
  isDeleted?: boolean;
  relatedId?: string;
}

export interface ServerContact {
  id?: string;
  name?: string;
}

export interface ServerRecurring {
  id?: string;
  note?: string;
  amount?: number;
  frequency?: string;
  categoryId?: string;
  category?: string;
  type?: string;
  startDate?: string;
  isActive?: boolean;
}

export interface ServerSubscription {
  id?: string;
  name?: string;
  amount?: number;
  billingCycle?: string;
  nextBillingDate?: string;
  isActive?: boolean;
}

export interface ServerBudget {
  categoryId?: string;
  month?: number;
  year?: number;
  limit?: number;
}

export interface ServerGoal {
  id?: string;
  name?: string;
  targetAmount?: number;
  targetDate?: string;
  isCompleted?: boolean;
}

export interface ServerUserHistoryItem {
  note?: string;
  category?: string;
  subCategory?: string;
}

export interface ServerChatMessage {
  role?: string;
  content?: string;
}

export interface ChatRequestBody {
  messages?: ServerChatMessage[];
  categories?: ServerCategory[];
  assets?: ServerAsset[];
  transactions?: ServerTransaction[];
  contacts?: ServerContact[];
  recurringTransactions?: ServerRecurring[];
  subscriptions?: ServerSubscription[];
  budgets?: ServerBudget[];
  goals?: ServerGoal[];
  budgetMode?: string;
  monthlyIncome?: number;
  zbbMode?: boolean | string;
  startOfMonthDay?: number;
  currentDate?: string;
  currentTime?: string;
}
