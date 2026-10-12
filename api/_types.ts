export interface ServerSubcategory {
  id?: string;
  name?: string;
  isDeleted?: boolean;
}

export interface ServerCategory {
  id?: string;
  name?: string;
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
  isActive?: boolean;
}

export interface ServerSubscription {
  id?: string;
  name?: string;
  amount?: number;
  billingCycle?: string;
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
