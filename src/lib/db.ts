import { openDB, type IDBPDatabase } from 'idb';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db as firestore, isFirebaseConfigured } from './firebase';
import type { Asset, Transaction, Category, UserProfile, Contact, Goal } from '../contexts/MoneyContext';
import { query, where, orderBy } from 'firebase/firestore';
import { generateId } from './utils';
import { getDeltaLastSyncTimestamp, setDeltaLastSyncTimestamp } from './deltaSync';

// ─── DB Schema ────────────────────────────────────────────────────────────────
const DB_VERSION = 11;

let activeWorkspaceId: string | null = null;

export const setSyncWorkspace = async (workspaceId: string | null) => {
  if (activeWorkspaceId === workspaceId) return;
  activeWorkspaceId = workspaceId;
  
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
};

export const getSyncWorkspace = () => activeWorkspaceId;

const enrichWithMetadata = (data: any) => {
  const currentWorkspaceId = activeWorkspaceId;
  const meta: any = {
    updatedAt: Date.now(),
  };
  
  if (currentWorkspaceId && auth.currentUser) {
    meta.updatedBy = auth.currentUser.uid;
    if (!data.createdBy) {
      meta.createdBy = auth.currentUser.uid;
    }
  }
  
  return { ...data, ...meta };
};

const putEntity = async (storeName: string, item: any, options?: { skipSync?: boolean }) => {
  const enriched = enrichWithMetadata(item);
  await (await getDB()).put(storeName as any, enriched);
  if (options?.skipSync) return enriched;

  await recordPendingSync({ id: item.id, collection: storeName, operation: 'PUT', data: enriched });

  if (!isFirebaseConfigured || !auth.currentUser) return enriched;
  setDoc(doc(collection(firestore, getWorkspacePath(storeName)), item.id), sanitizeForFirestore(enriched))
    .then(() => removePendingSync(item.id))
    .catch(() => { });
  return enriched;
};

const softDeleteEntity = async (storeName: string, id: string) => {
  const db = await getDB();
  const existing = await db.get(storeName as any, id);
  if (existing) {
    const tombstone = enrichWithMetadata({ ...existing, isDeleted: true });
    await db.put(storeName as any, tombstone);
    await recordPendingSync({ id, collection: storeName, operation: 'PUT', data: tombstone });

    if (!isFirebaseConfigured || !auth.currentUser) return;
    setDoc(doc(collection(firestore, getWorkspacePath(storeName)), id), sanitizeForFirestore(tombstone))
      .then(() => removePendingSync(id))
      .catch(() => { });
  } else {
    await db.delete(storeName as any, id);
    await recordPendingSync({ id, collection: storeName, operation: 'DELETE' });

    if (!isFirebaseConfigured || !auth.currentUser) return;
    deleteDoc(doc(collection(firestore, getWorkspacePath(storeName)), id))
      .then(() => removePendingSync(id))
      .catch(() => { });
  }
};


const getDbName = () => activeWorkspaceId ? `moneyapp_db_family_${activeWorkspaceId}` : 'moneyapp_db';

export interface SyncItem {
  id: string;
  collection: string;
  operation: 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
}

export interface MoneyAppDB {
  assets: { key: string; value: Asset };
  transactions: { key: string; value: Transaction };
  categories: { key: string; value: Category };
  budgets: { key: string; value: any };
  debts: { key: string; value: any };
  recurring_transactions: { key: string; value: any };
  contacts: { key: string; value: Contact };
  goals: { key: string; value: Goal };
  subscriptions: { key: string; value: any };
  settings: { key: string; value: string | number | boolean | UserProfile | null };
  pending_sync: { key: string; value: SyncItem };
  trips: { key: string; value: any };
  trip_expenses: { key: string; value: any };
  monthly_incomes: { key: string; value: any };
  budget_reallocations: { key: string; value: any };
  notifications: { key: string; value: any };
}

let dbPromise: Promise<IDBPDatabase<MoneyAppDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MoneyAppDB>(getDbName(), DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('budgets')) db.createObjectStore('budgets', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('debts')) db.createObjectStore('debts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('recurring_transactions')) db.createObjectStore('recurring_transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('contacts')) db.createObjectStore('contacts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('goals')) db.createObjectStore('goals', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('subscriptions')) db.createObjectStore('subscriptions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
        if (!db.objectStoreNames.contains('pending_sync')) db.createObjectStore('pending_sync', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('trips')) db.createObjectStore('trips', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('trip_expenses')) db.createObjectStore('trip_expenses', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('monthly_incomes')) db.createObjectStore('monthly_incomes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('budget_reallocations')) db.createObjectStore('budget_reallocations', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};

if (typeof window !== 'undefined') {
  (window as any).__dbHelper = {
    clearAll: async () => {
      const db = await getDB();
      const stores = Array.from(db.objectStoreNames);
      const tx = db.transaction(stores, 'readwrite');
      for (const storeName of stores) {
        tx.objectStore(storeName as any).clear();
      }
      await tx.done;
    },
    put: async (storeName: string, records: any[]) => {
      const db = await getDB();
      const tx = db.transaction(storeName as any, 'readwrite');
      const store = tx.objectStore(storeName as any);
      for (const rec of records) {
        store.put(rec);
      }
      await tx.done;
    }
  };
}

export const localDbGetAllAssets = async (): Promise<Asset[]> => (await getDB()).getAll('assets');
export const localDbGetAllTransactions = async (): Promise<Transaction[]> => (await getDB()).getAll('transactions');
export const localDbGetAllCategories = async (): Promise<Category[]> => (await getDB()).getAll('categories');
export const localDbGetAllBudgets = async (): Promise<any[]> => (await getDB()).getAll('budgets');
export const localDbGetAllGoals = async (): Promise<Goal[]> => (await getDB()).getAll('goals');
export const localDbGetSetting = async (key: string) => (await getDB()).get('settings', key);
export const localDbPutSetting = async (key: string, value: any) => (await getDB()).put('settings', value, key);
export const localDbGetAllNotifications = async (): Promise<any[]> => (await getDB()).getAll('notifications');

// ─── FIRESTORE (Cloud Sync) ──────────────────────────────────────────────────
const getUid = () => {
  if (!auth.currentUser) throw new Error("User not authenticated.");
  return auth.currentUser.uid;
};

export const getWorkspacePath = (collectionName: string) => {
  if (activeWorkspaceId) {
    return `families/${activeWorkspaceId}/${collectionName}`;
  }
  return `users/${getUid()}/${collectionName}`;
};

const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const newObj: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      newObj[key] = sanitizeForFirestore(obj[key]);
    }
  }
  return newObj;
};

// ─── Core Sync Logic ──────────────────────────────────────────────────────────
const recordPendingSync = async (item: Omit<SyncItem, 'timestamp'>) => {
  const db = await getDB();
  const existing = await db.get('pending_sync', item.id);

  if (item.operation === 'DELETE' && existing && (existing.operation === 'PUT' || existing.operation === 'UPDATE')) {
    await db.delete('pending_sync', item.id);
    return;
  }

  await db.put('pending_sync', { ...item, timestamp: Date.now() });
};

const removePendingSync = async (id: string) => {
  const db = await getDB();
  await db.delete('pending_sync', id);
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs))
  ]);
};

export const dbGetPendingSyncCount = async () => {
  return (await (await getDB()).getAll('pending_sync')).length;
};

export const mergeData = <T extends { id?: string | number }>(cloud: T[], local: T[]): T[] => {
  const map = new Map<string | number, T>();
  cloud.forEach(item => { if (item.id) map.set(item.id, item); });
  local.forEach(item => { if (item.id) map.set(item.id, item); });
  return Array.from(map.values());
};

// ─── Cloud Sync Helpers ───────────────────────────────────────────────────────
/**
 * Pulls a full collection from Firestore and writes every document into IDB.
 */
export const pullCollectionIntoIDB = async <T extends { id?: string }>(colName: string, idbStoreName?: string): Promise<T[]> => {
  const workspaceId = activeWorkspaceId;
  const lastSync = getDeltaLastSyncTimestamp(workspaceId);
  const colRef = collection(firestore, getWorkspacePath(colName));
  const sinceTime = Math.max(0, lastSync - 5000);

  const q = sinceTime > 0
    ? query(colRef, where('updatedAt', '>', sinceTime))
    : colRef;

  const snapshot = await withTimeout(getDocs(q), 10000);
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
  const db = await getDB();
  const store = idbStoreName || colName;

  // 1. Put items from cloud into IDB, but only if they don't have pending local changes
  for (const item of items) {
    const pending = await db.get('pending_sync', item.id as string);
    if (pending) continue; // Don't overwrite local changes (PUT or DELETE) with cloud data
    await (db as any).put(store as any, item);
  }

  // 2. Zombie cleanup only during first full sync (sinceTime === 0)
  if (sinceTime === 0) {
    const cloudKeys = new Set(items.map(i => i.id));
    const localKeys = await (db as any).getAllKeys(store);

    for (const key of localKeys) {
      if (!cloudKeys.has(key as string)) {
        const pending = await db.get('pending_sync', key as string);
        if (!pending || pending.operation !== 'PUT') {
          await (db as any).delete(store, key as string);
        }
      }
    }
  }

  return items;
};

/**
 * Force a full pull from Firestore → IDB for all collections.
 * Call this when the user explicitly wants to sync (e.g. "Pull from Cloud" button).
 * Returns the number of documents synced.
 */
export const dbForceCloudSync = async (): Promise<{ total: number }> => {
  if (!isFirebaseConfigured || !auth.currentUser) return { total: 0 };
  const db = await getDB();
  let total = 0;
  const workspaceId = activeWorkspaceId;
  const sinceTime = Math.max(0, getDeltaLastSyncTimestamp(workspaceId) - 5000);
  
  try {
    // Collections
    const collections: Array<[string, string]> = [
      ['assets', 'assets'],
      ['transactions', 'transactions'],
      ['categories', 'categories'],
      ['debts', 'debts'],
      ['recurring_transactions', 'recurring_transactions'],
      ['contacts', 'contacts'],
      ['subscriptions', 'subscriptions'],
      ['goals', 'goals'],
      ['trips', 'trips'],
      ['trip_expenses', 'trip_expenses'],
      ['monthly_incomes', 'monthly_incomes'],
      ['budget_reallocations', 'budget_reallocations'],
      ['notifications', 'notifications'],
    ];

    for (const [fsCol, idbStore] of collections) {
      const items = await pullCollectionIntoIDB(fsCol, idbStore);
      total += items.length;
    }
    // Settings: pull all setting docs from the settings sub-collection (Delta fetch)
    const settingsCol = collection(firestore, getWorkspacePath('settings'));
    const settingsQuery = sinceTime > 0
      ? query(settingsCol, where('updatedAt', '>', sinceTime))
      : settingsCol;
      
    const settingsSnap = await withTimeout(getDocs(settingsQuery), 10000);
    for (const d of settingsSnap.docs) {
      const val = d.data().value;
      if (val !== undefined) {
        await db.put('settings', val, d.id);
        total++;
      }
    }
    
    // Update sync threshold
    setDeltaLastSyncTimestamp(workspaceId, Date.now());
    return { total };
  } catch (e) {
    console.error('[dbForceCloudSync] Failed:', e);
    return { total };
  }
};

// ─── Assets ───────────────────────────────────────────────────────────────────
export const dbGetAllAssets = async (): Promise<Asset[]> => {
  const local = await localDbGetAllAssets();
  // IDB-first: only hit Firestore when IDB is empty (new device / first login)
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local.filter(a => !a.isDeleted);
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, getWorkspacePath('assets'))));
    const cloud = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
    // Populate IDB so next open costs 0 reads
    const db = await getDB();
    for (const item of cloud) await db.put('assets', item);
    return cloud.filter(a => !a.isDeleted);
  } catch (e) { return local.filter(a => !a.isDeleted); }
};

export const dbPutAsset = async (asset: Asset, options?: { skipSync?: boolean }) => {
  await putEntity('assets', asset, options);
};

export const dbDeleteAsset = async (id: string) => {
  await softDeleteEntity('assets', id);
};

export const dbClearAssets = async () => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).clear('assets');
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const dbGetAllTransactions = async (): Promise<Transaction[]> => {
  const local = await localDbGetAllTransactions();
  // IDB-first: transactions are the most expensive collection — never re-read from cloud unnecessarily
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local.filter(t => !t.isDeleted);
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, getWorkspacePath('transactions'))), 10000);
    const cloud = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    const db = await getDB();
    for (const item of cloud) await db.put('transactions', item);
    return cloud.filter(t => !t.isDeleted);
  } catch (e) { return local.filter(t => !t.isDeleted); }
};

export const dbPutTransaction = async (tx: Transaction) => {
  await putEntity('transactions', tx);
};

export const dbDeleteTransaction = async (id: string) => {
  await softDeleteEntity('transactions', id);
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const dbGetAllCategories = async (): Promise<Category[]> => {
  const local = await localDbGetAllCategories();
  // IDB-first
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local.filter(c => !c.isDeleted);
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, getWorkspacePath('categories'))));
    const cloud = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    const db = await getDB();
    for (const item of cloud) await db.put('categories', item);
    return cloud.filter(c => !c.isDeleted);
  } catch (e) { return local.filter(c => !c.isDeleted); }
};

export const dbPutCategory = async (cat: Category, options?: { skipSync?: boolean }) => {
  await putEntity('categories', cat, options);
};

export const dbDeleteCategory = async (id: string) => {
  await softDeleteEntity('categories', id);
};

// ─── Budgets ─────────────────────────────────────────────────────────────────
export const dbGetAllBudgets = async (): Promise<any[]> => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).getAll('budgets');
  const budgets = await dbGetSetting('budgets');
  return Array.isArray(budgets) ? budgets : [];
};

export const dbPutBudget = async (b: any) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).put('budgets', b);
  const budgets = await dbGetAllBudgets();
  const idx = budgets.findIndex((item: any) => item.id === b.id);
  if (idx > -1) budgets[idx] = b;
  else budgets.push(b);
  await dbPutSetting('budgets', budgets);
};

export const dbDeleteBudget = async (id: string) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).delete('budgets', id);
  const budgets = await dbGetAllBudgets();
  const filtered = budgets.filter((item: any) => item.id !== id);
  await dbPutSetting('budgets', filtered);
};

// ─── Debts ────────────────────────────────────────────────────────────────────
export const localDbGetAllDebts = async (): Promise<any[]> => (await getDB()).getAll('debts');

export const dbGetAllDebts = async (): Promise<any[]> => {
  const local = await localDbGetAllDebts();
  // IDB-first
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local.filter(d => !d.isDeleted);
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, getWorkspacePath('debts'))));
    const cloud = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const db = await getDB();
    for (const item of cloud) await db.put('debts', item);
    return cloud.filter(d => !d.isDeleted);
  } catch (e) { return local.filter(d => !d.isDeleted); }
};

export const dbPutDebt = async (d: any) => {
  await putEntity('debts', d);
};

export const dbDeleteDebt = async (id: string) => {
  await softDeleteEntity('debts', id);
};

// ─── Recurring Transactions ──────────────────────────────────────────────────
export const dbGetAllRecurringTransactions = async (): Promise<any[]> => {
  const local = await (await getDB()).getAll('recurring_transactions');
  // IDB-first
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local.filter(r => !r.isDeleted);
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, getWorkspacePath('recurring_transactions'))));
    const cloud = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const db = await getDB();
    for (const item of cloud) await db.put('recurring_transactions', item);
    return cloud.filter(r => !r.isDeleted);
  } catch (e) { return local.filter(r => !r.isDeleted); }
};

export const dbPutRecurringTransaction = async (rt: any) => {
  await putEntity('recurring_transactions', rt);
};

export const dbDeleteRecurringTransaction = async (id: string) => {
  await softDeleteEntity('recurring_transactions', id);
};

// ─── Contacts ─────────────────────────────────────────────────────────────────
export const dbGetAllContacts = async (): Promise<Contact[]> => {
  const local = await (await getDB()).getAll('contacts');
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local.filter(c => !c.isDeleted);
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, getWorkspacePath('contacts'))));
    const cloud = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contact));
    const db = await getDB();
    for (const item of cloud) await db.put('contacts', item);
    return cloud.filter(c => !c.isDeleted);
  } catch (e) { return local.filter(c => !c.isDeleted); }
};

export const dbPutContact = async (contact: Contact) => {
  await putEntity('contacts', contact);
};

export const dbDeleteContact = async (id: string) => {
  await softDeleteEntity('contacts', id);
};

// ─── Subscriptions ───────────────────────────────────────────────────────────
export const dbGetAllSubscriptions = async (): Promise<any[]> => {
  const local = await (await getDB()).getAll('subscriptions');
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local.filter(s => !s.isDeleted);
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, getWorkspacePath('subscriptions'))));
    const cloud = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const db = await getDB();
    for (const item of cloud) await db.put('subscriptions', item);
    return cloud.filter(s => !s.isDeleted);
  } catch (e) { return local.filter(s => !s.isDeleted); }
};

export const dbPutSubscription = async (sub: any) => {
  await putEntity('subscriptions', sub);
};

export const dbDeleteSubscription = async (id: string) => {
  await softDeleteEntity('subscriptions', id);
};

// ─── Goals ────────────────────────────────────────────────────────────────────
export const dbGetAllGoals = async (): Promise<Goal[]> => {
  const local = await localDbGetAllGoals();
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local.filter(g => !g.isDeleted);
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, getWorkspacePath('goals'))));
    const cloud = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
    const db = await getDB();
    for (const item of cloud) await db.put('goals', item);
    return cloud.filter(g => !g.isDeleted);
  } catch (e) { return local.filter(g => !g.isDeleted); }
};

export const dbPutGoal = async (goal: Goal) => {
  await putEntity('goals', goal);
};

export const dbDeleteGoal = async (id: string) => {
  await softDeleteEntity('goals', id);
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const dbGetAllSettings = async (): Promise<Record<string, any>> => {
  const db = await getDB();
  const keys = await db.getAllKeys('settings');
  const result: Record<string, any> = {};
  for (const key of keys) {
    result[key as string] = await db.get('settings', key as string);
  }
  return result;
};

export const dbGetSetting = async (key: string) => {
  const local = await localDbGetSetting(key);
  // IDB-first: only fetch from Firestore if we have no local value
  // (covers new device / first login scenario)
  if (local !== undefined || !isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const docSnap = await withTimeout(getDoc(doc(collection(firestore, getWorkspacePath('settings')), key)));
    const cloud = docSnap.exists() ? docSnap.data().value : undefined;
    // Cache into IDB so next read costs nothing
    if (cloud !== undefined) await (await getDB()).put('settings', cloud, key);
    return cloud;
  } catch (e) { return local; }
};

export const dbPutSetting = async (key: string, value: any) => {
  await (await getDB()).put('settings', value, key);
  
  const currentWorkspaceId = activeWorkspaceId;
  const meta: any = {
    key,
    value: sanitizeForFirestore(value),
    updatedAt: Date.now()
  };
  if (currentWorkspaceId && auth.currentUser) {
    meta.updatedBy = auth.currentUser.uid;
  }

  await recordPendingSync({ id: `setting-${key}`, collection: 'settings', operation: 'PUT', data: meta });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  setDoc(doc(collection(firestore, getWorkspacePath('settings')), key), sanitizeForFirestore({
    value,
    updatedAt: meta.updatedAt,
    updatedBy: meta.updatedBy
  }))
    .then(() => removePendingSync(`setting-${key}`))
    .catch(() => { });
};

export const dbDeleteSetting = async (key: string) => {
  await (await getDB()).delete('settings', key);
  await recordPendingSync({ id: `setting-${key}`, collection: 'settings', operation: 'DELETE' });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  deleteDoc(doc(collection(firestore, getWorkspacePath('settings')), key))
    .then(() => removePendingSync(`setting-${key}`))
    .catch(() => { });
};

// ─── Export/Import ───────────────────────────────────────────────────────────
export const dbExportAll = async () => {
  const [assets, transactions, categories, budgets, recurring, debts, subscriptions, goals] = await Promise.all([
    dbGetAllAssets(), dbGetAllTransactions(), dbGetAllCategories(),
    dbGetAllBudgets(), dbGetAllRecurringTransactions(), dbGetAllDebts(), dbGetAllSubscriptions(), dbGetAllGoals()
  ]);
  const user = await dbGetSetting('user');
  const pin = await dbGetSetting('pin');
  const theme = await dbGetSetting('theme');
  return { assets, transactions, categories, budgets, recurring, debts, subscriptions, goals, user, pin, theme, exportedAt: new Date().toISOString() };
};

export const dbImportAll = async (data: any) => {
  if (data.assets) for (const a of data.assets) await dbPutAsset(a);
  if (data.transactions) for (const t of data.transactions) await dbPutTransaction(t);
  if (data.categories) for (const c of data.categories) await dbPutCategory(c);
  if (data.debts) for (const d of data.debts) await dbPutDebt(d);
  if (data.recurring) for (const r of data.recurring) await dbPutRecurringTransaction(r);
  if (data.subscriptions) for (const s of data.subscriptions) await dbPutSubscription(s);
  if (data.budgets) for (const b of data.budgets) await dbPutBudget(b);
  if (data.goals) for (const g of data.goals) await dbPutGoal(g);
  if (data.user) await dbPutSetting('user', data.user);
  if (data.pin) await dbPutSetting('pin', data.pin);
};

// ─── Sync Logic ──────────────────────────────────────────────────────────────
export const dbSyncPendingItems = async (): Promise<{ success: number; failed: number; error?: string }> => {
  if (!isFirebaseConfigured) return { success: 0, failed: 0, error: 'NO_FIREBASE' };
  if (!auth.currentUser) return { success: 0, failed: 0, error: 'NOT_LOGGED_IN' };
  const db = await getDB();
  const pending = await db.getAll('pending_sync');
  let success = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      if (item.operation === 'PUT') {
        const path = item.collection === 'settings' ? ['settings', item.id.replace('setting-', '')] : [item.collection, item.id];
        const data = item.collection === 'settings' 
          ? { 
              value: item.data?.value !== undefined ? item.data.value : item.data,
              updatedAt: item.data?.updatedAt || Date.now(),
              updatedBy: item.data?.updatedBy
            } 
          : item.data;
        await withTimeout(setDoc(doc(collection(firestore, getWorkspacePath(path[0])), path[1]), sanitizeForFirestore(data)));
      } else if (item.operation === 'DELETE') {
        const path = item.collection === 'settings' ? ['settings', item.id.replace('setting-', '')] : [item.collection, item.id];
        await withTimeout(deleteDoc(doc(collection(firestore, getWorkspacePath(path[0])), path[1])));
      }
      await db.delete('pending_sync', item.id);
      success++;
    } catch (e) {
      console.error('[Sync Error] Failed to sync item:', item, e);
      failed++;
      break;
    }
  }
  return { success, failed };
};

export const migrateFromIndexedDBToFirebase = async (): Promise<boolean> => {
  if (!isFirebaseConfigured || !auth.currentUser) return false;
  try {
    const isMigrated = await dbGetSetting('idb_to_firebase_migrated');
    if (isMigrated) return false;
    const [assets, txs, cats, budgets, debts, recurring, subscriptions, goals] = await Promise.all([
      localDbGetAllAssets(), localDbGetAllTransactions(), localDbGetAllCategories(),
      localDbGetAllBudgets(), localDbGetAllDebts(), (await getDB()).getAll('recurring_transactions'), (await getDB()).getAll('subscriptions'),
      localDbGetAllGoals()
    ]);
    const promises: Promise<any>[] = [];
    assets.forEach(a => promises.push(dbPutAsset(a)));
    txs.forEach(t => promises.push(dbPutTransaction(t)));
    cats.forEach(c => promises.push(dbPutCategory(c)));
    budgets.forEach(b => promises.push(dbPutBudget(b)));
    debts.forEach(d => promises.push(dbPutDebt(d)));
    recurring.forEach(r => promises.push(dbPutRecurringTransaction(r)));
    subscriptions.forEach(s => promises.push(dbPutSubscription(s)));
    goals.forEach(g => promises.push(dbPutGoal(g)));
    await Promise.all(promises);
    await dbPutSetting('idb_to_firebase_migrated', true);
    return true;
  } catch (e) { return false; }
};

// ─── Shared Split Bills & Trips ──────────────────────────────────────────────
export interface SharedSplit {
  id: string;
  creatorId: string;
  type?: 'split' | 'trip'; // Distinguish between normal split and trip
  merchantName: string;   // For trip: used as Trip Name
  date: string;           // For trip: used as Start Date
  endDate?: string;       // For trip
  totalAmount: number;
  currencySymbol: string;
  splits: any[];
  secondarySplits?: any[]; // Store the other mode's data
  settlementMode?: 'simple' | 'detailed'; // Current active mode
  lineItems?: any[];      // For normal split
  itemAssignments?: Record<number, string[]>; // For normal split
  tripExpenses?: any[];   // For trip
  members?: any[];        // For trip
  sourceId?: string;      // ID of the original trip or split to prevent duplicates
  createdAt: number;
  paymentDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
}

export const dbSaveSharedSplit = async (data: Omit<SharedSplit, 'id' | 'creatorId' | 'createdAt'>): Promise<string> => {
  if (!isFirebaseConfigured || !auth.currentUser) throw new Error("Cloud sync required to share.");

  let id = generateId();
  
  // Check if a link for this source already exists to prevent duplicates
  if (data.sourceId) {
    const q = query(
      collection(firestore, 'shared_splits'),
      where('creatorId', '==', getUid()),
      where('sourceId', '==', data.sourceId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      id = snap.docs[0].id;
    }
  }

  const sharedSplit: SharedSplit = {
    ...data,
    id,
    creatorId: getUid(),
    createdAt: Date.now(),
  };

  await setDoc(doc(firestore, 'shared_splits', id), sanitizeForFirestore(sharedSplit));
  return id;
};

export const dbGetSharedSplit = async (id: string): Promise<SharedSplit | null> => {
  if (!isFirebaseConfigured) return null;
  try {
    const docSnap = await getDoc(doc(firestore, 'shared_splits', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SharedSplit;
    }
  } catch (e) {
    console.error('Failed to fetch shared split:', e);
  }
  return null;
};

export const dbDeleteSharedSplit = async (id: string) => {
  if (!isFirebaseConfigured || !auth.currentUser) return;
  await deleteDoc(doc(firestore, 'shared_splits', id));
};

export const dbGetMySharedSplits = async (): Promise<SharedSplit[]> => {
  if (!isFirebaseConfigured || !auth.currentUser) return [];
  try {
    const q = query(
      collection(firestore, 'shared_splits'),
      where('creatorId', '==', getUid()),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SharedSplit));
  } catch (e) {
    console.error('Failed to fetch my shared splits:', e);
    return [];
  }
};

export const migrateFromLocalStorage = async () => false;

// ─── Trips ────────────────────────────────────────────────────────────────────
export const dbGetAllTrips = async (): Promise<any[]> => {
  const db = await getDB();
  const local = await db.getAll('trips');
  return local.filter(t => !t.isDeleted);
};

export const dbPutTrip = async (trip: any) => {
  await putEntity('trips', trip);
};

export const dbDeleteTrip = async (id: string) => {
  await softDeleteEntity('trips', id);
};

// ─── Trip Expenses ────────────────────────────────────────────────────────────
export const dbGetAllTripExpenses = async (): Promise<any[]> => {
  const db = await getDB();
  const local = await db.getAll('trip_expenses');
  return local.filter(te => !te.isDeleted);
};

export const dbPutTripExpense = async (expense: any) => {
  await putEntity('trip_expenses', expense);
};

export const dbDeleteTripExpense = async (id: string) => {
  await softDeleteEntity('trip_expenses', id);
};

// ─── Monthly Incomes ──────────────────────────────────────────────────────────
export const dbGetAllMonthlyIncomes = async (): Promise<any[]> => {
  const db = await getDB();
  const local = await db.getAll('monthly_incomes');
  return local.filter(mi => !mi.isDeleted);
};

export const dbPutMonthlyIncome = async (item: any) => {
  await putEntity('monthly_incomes', item);
};

export const dbDeleteMonthlyIncome = async (id: string) => {
  await softDeleteEntity('monthly_incomes', id);
};

// ─── Budget Reallocations ─────────────────────────────────────────────────────
export const dbGetAllBudgetReallocations = async (): Promise<any[]> => {
  const db = await getDB();
  const local = await db.getAll('budget_reallocations');
  return local.filter(br => !br.isDeleted);
};

export const dbPutBudgetReallocation = async (item: any) => {
  await putEntity('budget_reallocations', item);
};

export const dbDeleteBudgetReallocation = async (id: string) => {
  await softDeleteEntity('budget_reallocations', id);
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const dbGetAllNotifications = async (): Promise<any[]> => {
  const db = await getDB();
  const local = await db.getAll('notifications');
  return local.filter(n => !n.isDeleted);
};

export const dbPutNotification = async (item: any) => {
  await putEntity('notifications', item);
};

export const dbDeleteNotification = async (id: string) => {
  await softDeleteEntity('notifications', id);
};

export const dbClearAllNotifications = async () => {
  const db = await getDB();
  const all = await db.getAllKeys('notifications');
  for (const id of all) {
    await dbDeleteNotification(id as string);
  }
};
