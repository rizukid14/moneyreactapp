import { openDB, type IDBPDatabase } from 'idb';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db as firestore, isFirebaseConfigured } from './firebase';
import type { Asset, Transaction, Category, UserProfile } from '../contexts/MoneyContext';

// ─── DB Schema ────────────────────────────────────────────────────────────────
const DB_NAME = 'moneyapp_db';
const DB_VERSION = 4;

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
  settings: { key: string; value: string | number | boolean | UserProfile | null };
  pending_sync: { key: string; value: SyncItem };
}

let dbPromise: Promise<IDBPDatabase<MoneyAppDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MoneyAppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('budgets')) db.createObjectStore('budgets', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('debts')) db.createObjectStore('debts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('recurring_transactions')) db.createObjectStore('recurring_transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
        if (!db.objectStoreNames.contains('pending_sync')) db.createObjectStore('pending_sync', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};

export const localDbGetAllAssets = async (): Promise<Asset[]> => (await getDB()).getAll('assets');
export const localDbGetAllTransactions = async (): Promise<Transaction[]> => (await getDB()).getAll('transactions');
export const localDbGetAllCategories = async (): Promise<Category[]> => (await getDB()).getAll('categories');
export const localDbGetAllBudgets = async (): Promise<any[]> => (await getDB()).getAll('budgets');
export const localDbGetSetting = async (key: string) => (await getDB()).get('settings', key);

// ─── FIRESTORE (Cloud Sync) ──────────────────────────────────────────────────
const getUid = () => {
  if (!auth.currentUser) throw new Error("User not authenticated.");
  return auth.currentUser.uid;
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
  const snapshot = await withTimeout(getDocs(collection(firestore, 'users', getUid(), colName)), 10000);
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
  const db = await getDB();
  const store = idbStoreName || colName;
  
  // 1. Put all valid items from cloud into IDB
  for (const item of items) {
    await (db as any).put(store as any, item);
  }

  // 2. Clean up "zombies" (Items deleted on other devices)
  // If an item exists in local IDB but NOT in Firestore, it means it was deleted elsewhere.
  const cloudKeys = new Set(items.map(i => i.id));
  const localKeys = await (db as any).getAllKeys(store);

  for (const key of localKeys) {
    if (!cloudKeys.has(key as string)) {
      // It's locally present but missing from cloud.
      // Make sure it's not a newly created offline item waiting to be pushed.
      const pending = await db.get('pending_sync', key as string);
      if (!pending || pending.operation !== 'PUT') {
        // Safe to delete: It's a zombie!
        await (db as any).delete(store, key as string);
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
  try {
    // Collections
    const collections: Array<[string, string]> = [
      ['assets', 'assets'],
      ['transactions', 'transactions'],
      ['categories', 'categories'],
      ['debts', 'debts'],
      ['recurring_transactions', 'recurring_transactions'],
    ];

    for (const [fsCol, idbStore] of collections) {
      const items = await pullCollectionIntoIDB(fsCol, idbStore);
      total += items.length;
    }
    // Settings: pull all setting docs from the settings sub-collection
    const settingsSnap = await withTimeout(getDocs(collection(firestore, 'users', getUid(), 'settings')), 10000);
    for (const d of settingsSnap.docs) {
      const val = d.data().value;
      if (val !== undefined) {
        await db.put('settings', val, d.id);
        total++;
      }
    }
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
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, 'users', getUid(), 'assets')));
    const cloud = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
    // Populate IDB so next open costs 0 reads
    const db = await getDB();
    for (const item of cloud) await db.put('assets', item);
    return cloud;
  } catch (e) { return local; }
};

export const dbPutAsset = async (asset: Asset) => {
  await (await getDB()).put('assets', asset);
  await recordPendingSync({ id: asset.id, collection: 'assets', operation: 'PUT', data: asset });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  // Background attempt
  setDoc(doc(firestore, 'users', getUid(), 'assets', asset.id), sanitizeForFirestore(asset))
    .then(() => removePendingSync(asset.id))
    .catch(() => { });
};

export const dbDeleteAsset = async (id: string) => {
  await (await getDB()).delete('assets', id);
  await recordPendingSync({ id, collection: 'assets', operation: 'DELETE' });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  // Background attempt
  deleteDoc(doc(firestore, 'users', getUid(), 'assets', id))
    .then(() => removePendingSync(id))
    .catch(() => { });
};

export const dbClearAssets = async () => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).clear('assets');
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const dbGetAllTransactions = async (): Promise<Transaction[]> => {
  const local = await localDbGetAllTransactions();
  // IDB-first: transactions are the most expensive collection — never re-read from cloud unnecessarily
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, 'users', getUid(), 'transactions')), 10000);
    const cloud = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    const db = await getDB();
    for (const item of cloud) await db.put('transactions', item);
    return cloud;
  } catch (e) { return local; }
};

export const dbPutTransaction = async (tx: Transaction) => {
  await (await getDB()).put('transactions', tx);
  await recordPendingSync({ id: tx.id, collection: 'transactions', operation: 'PUT', data: tx });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  // Background attempt
  setDoc(doc(firestore, 'users', getUid(), 'transactions', tx.id), sanitizeForFirestore(tx))
    .then(() => removePendingSync(tx.id))
    .catch(() => { });
};

export const dbDeleteTransaction = async (id: string) => {
  await (await getDB()).delete('transactions', id);
  await recordPendingSync({ id, collection: 'transactions', operation: 'DELETE' });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  // Background attempt
  deleteDoc(doc(firestore, 'users', getUid(), 'transactions', id))
    .then(() => removePendingSync(id))
    .catch(() => { });
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const dbGetAllCategories = async (): Promise<Category[]> => {
  const local = await localDbGetAllCategories();
  // IDB-first
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, 'users', getUid(), 'categories')));
    const cloud = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    const db = await getDB();
    for (const item of cloud) await db.put('categories', item);
    return cloud;
  } catch (e) { return local; }
};

export const dbPutCategory = async (cat: Category) => {
  await (await getDB()).put('categories', cat);
  await recordPendingSync({ id: cat.id, collection: 'categories', operation: 'PUT', data: cat });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  setDoc(doc(firestore, 'users', getUid(), 'categories', cat.id), sanitizeForFirestore(cat))
    .then(() => removePendingSync(cat.id))
    .catch(() => { });
};

export const dbDeleteCategory = async (id: string) => {
  await (await getDB()).delete('categories', id);
  await recordPendingSync({ id, collection: 'categories', operation: 'DELETE' });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  deleteDoc(doc(firestore, 'users', getUid(), 'categories', id))
    .then(() => removePendingSync(id))
    .catch(() => { });
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
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, 'users', getUid(), 'debts')));
    const cloud = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const db = await getDB();
    for (const item of cloud) await db.put('debts', item);
    return cloud;
  } catch (e) { return local; }
};

export const dbPutDebt = async (d: any) => {
  await (await getDB()).put('debts', d);
  await recordPendingSync({ id: d.id, collection: 'debts', operation: 'PUT', data: d });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  setDoc(doc(firestore, 'users', getUid(), 'debts', d.id), sanitizeForFirestore(d))
    .then(() => removePendingSync(d.id))
    .catch(() => { });
};

export const dbDeleteDebt = async (id: string) => {
  await (await getDB()).delete('debts', id);
  await recordPendingSync({ id, collection: 'debts', operation: 'DELETE' });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  deleteDoc(doc(firestore, 'users', getUid(), 'debts', id))
    .then(() => removePendingSync(id))
    .catch(() => { });
};

// ─── Recurring Transactions ──────────────────────────────────────────────────
export const dbGetAllRecurringTransactions = async (): Promise<any[]> => {
  const local = await (await getDB()).getAll('recurring_transactions');
  // IDB-first
  if (local.length > 0 || !isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const snapshot = await withTimeout(getDocs(collection(firestore, 'users', getUid(), 'recurring_transactions')));
    const cloud = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const db = await getDB();
    for (const item of cloud) await db.put('recurring_transactions', item);
    return cloud;
  } catch (e) { return local; }
};

export const dbPutRecurringTransaction = async (rt: any) => {
  await (await getDB()).put('recurring_transactions', rt);
  await recordPendingSync({ id: rt.id, collection: 'recurring_transactions', operation: 'PUT', data: rt });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  setDoc(doc(firestore, 'users', getUid(), 'recurring_transactions', rt.id), sanitizeForFirestore(rt))
    .then(() => removePendingSync(rt.id))
    .catch(() => { });
};

export const dbDeleteRecurringTransaction = async (id: string) => {
  await (await getDB()).delete('recurring_transactions', id);
  await recordPendingSync({ id, collection: 'recurring_transactions', operation: 'DELETE' });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  deleteDoc(doc(firestore, 'users', getUid(), 'recurring_transactions', id))
    .then(() => removePendingSync(id))
    .catch(() => { });
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const dbGetSetting = async (key: string) => {
  const local = await localDbGetSetting(key);
  // IDB-first: only fetch from Firestore if we have no local value
  // (covers new device / first login scenario)
  if (local !== undefined || !isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const docSnap = await withTimeout(getDoc(doc(firestore, 'users', getUid(), 'settings', key)));
    const cloud = docSnap.exists() ? docSnap.data().value : undefined;
    // Cache into IDB so next read costs nothing
    if (cloud !== undefined) await (await getDB()).put('settings', cloud, key);
    return cloud;
  } catch (e) { return local; }
};

export const dbPutSetting = async (key: string, value: any) => {
  await (await getDB()).put('settings', value, key);
  await recordPendingSync({ id: `setting-${key}`, collection: 'settings', operation: 'PUT', data: { key, value } });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  setDoc(doc(firestore, 'users', getUid(), 'settings', key), { value: sanitizeForFirestore(value) })
    .then(() => removePendingSync(`setting-${key}`))
    .catch(() => { });
};

export const dbDeleteSetting = async (key: string) => {
  await (await getDB()).delete('settings', key);
  await recordPendingSync({ id: `setting-${key}`, collection: 'settings', operation: 'DELETE' });

  if (!isFirebaseConfigured || !auth.currentUser) return;
  deleteDoc(doc(firestore, 'users', getUid(), 'settings', key))
    .then(() => removePendingSync(`setting-${key}`))
    .catch(() => { });
};

// ─── Export/Import ───────────────────────────────────────────────────────────
export const dbExportAll = async () => {
  const [assets, transactions, categories, budgets, recurring, debts] = await Promise.all([
    dbGetAllAssets(), dbGetAllTransactions(), dbGetAllCategories(),
    dbGetAllBudgets(), dbGetAllRecurringTransactions(), dbGetAllDebts()
  ]);
  const user = await dbGetSetting('user');
  const pin = await dbGetSetting('pin');
  const theme = await dbGetSetting('theme');
  return { assets, transactions, categories, budgets, recurring, debts, user, pin, theme, exportedAt: new Date().toISOString() };
};

export const dbImportAll = async (data: any) => {
  if (data.assets) for (const a of data.assets) await dbPutAsset(a);
  if (data.transactions) for (const t of data.transactions) await dbPutTransaction(t);
  if (data.categories) for (const c of data.categories) await dbPutCategory(c);
  if (data.debts) for (const d of data.debts) await dbPutDebt(d);
  if (data.recurring) for (const r of data.recurring) await dbPutRecurringTransaction(r);
  if (data.budgets) for (const b of data.budgets) await dbPutBudget(b);
  if (data.user) await dbPutSetting('user', data.user);
  if (data.pin) await dbPutSetting('pin', data.pin);
};

// ─── Sync Logic ──────────────────────────────────────────────────────────────
export const dbSyncPendingItems = async (): Promise<{ success: number; failed: number }> => {
  if (!isFirebaseConfigured || !auth.currentUser) return { success: 0, failed: 0 };
  const db = await getDB();
  const pending = await db.getAll('pending_sync');
  let success = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      if (item.operation === 'PUT') {
        const path = item.collection === 'settings' ? ['settings', item.id.replace('setting-', '')] : [item.collection, item.id];
        const data = item.collection === 'settings' ? { value: item.data?.value !== undefined ? item.data.value : item.data } : item.data;
        await withTimeout(setDoc(doc(firestore, 'users', getUid(), path[0], path[1]), sanitizeForFirestore(data)));
      } else if (item.operation === 'DELETE') {
        const path = item.collection === 'settings' ? ['settings', item.id.replace('setting-', '')] : [item.collection, item.id];
        await withTimeout(deleteDoc(doc(firestore, 'users', getUid(), path[0], path[1])));
      }
      await db.delete('pending_sync', item.id);
      success++;
    } catch (e) {
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
    const [assets, txs, cats, budgets, debts, recurring] = await Promise.all([
      localDbGetAllAssets(), localDbGetAllTransactions(), localDbGetAllCategories(),
      localDbGetAllBudgets(), localDbGetAllDebts(), (await getDB()).getAll('recurring_transactions')
    ]);
    const promises: Promise<any>[] = [];
    assets.forEach(a => promises.push(dbPutAsset(a)));
    txs.forEach(t => promises.push(dbPutTransaction(t)));
    cats.forEach(c => promises.push(dbPutCategory(c)));
    budgets.forEach(b => promises.push(dbPutBudget(b)));
    debts.forEach(d => promises.push(dbPutDebt(d)));
    recurring.forEach(r => promises.push(dbPutRecurringTransaction(r)));
    await Promise.all(promises);
    await dbPutSetting('idb_to_firebase_migrated', true);
    return true;
  } catch (e) { return false; }
};

export const migrateFromLocalStorage = async () => false;
