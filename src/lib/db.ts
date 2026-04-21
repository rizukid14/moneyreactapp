import { openDB, type IDBPDatabase } from 'idb';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db as firestore, isFirebaseConfigured } from './firebase';
import type { Asset, Transaction, Category, UserProfile } from '../contexts/MoneyContext';

// ─── DB Schema ────────────────────────────────────────────────────────────────
const DB_NAME = 'moneyapp_db';
const DB_VERSION = 3;

export interface MoneyAppDB {
  assets: { key: string; value: Asset };
  transactions: { key: string; value: Transaction };
  categories: { key: string; value: Category };
  budgets: { key: string; value: any };
  debts: { key: string; value: any };
  recurring_transactions: { key: string; value: any };
  settings: { key: string; value: string | number | boolean | UserProfile | null };
}

let dbPromise: Promise<IDBPDatabase<MoneyAppDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MoneyAppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('assets'))       db.createObjectStore('assets',       { keyPath: 'id' });
        if (!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('categories'))   db.createObjectStore('categories',   { keyPath: 'id' });
        if (!db.objectStoreNames.contains('budgets'))      db.createObjectStore('budgets',      { keyPath: 'id' });
        if (!db.objectStoreNames.contains('debts'))        db.createObjectStore('debts',        { keyPath: 'id' });
        if (!db.objectStoreNames.contains('recurring_transactions')) db.createObjectStore('recurring_transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings'))     db.createObjectStore('settings');
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

// ─── Assets ───────────────────────────────────────────────────────────────────
export const dbGetAllAssets = async (): Promise<Asset[]> => {
  if (!isFirebaseConfigured || !auth.currentUser) return localDbGetAllAssets();
  const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'assets'));
  return snapshot.docs.map(doc => doc.data() as Asset);
};
export const dbPutAsset = async (a: Asset) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).put('assets', a);
  await setDoc(doc(firestore, 'users', getUid(), 'assets', a.id), sanitizeForFirestore(a));
};
export const dbDeleteAsset = async (id: string) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).delete('assets', id);
  await deleteDoc(doc(firestore, 'users', getUid(), 'assets', id));
};
export const dbClearAssets = async () => { if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).clear('assets'); };

// ─── Transactions ─────────────────────────────────────────────────────────────
export const dbGetAllTransactions = async (): Promise<Transaction[]> => {
  if (!isFirebaseConfigured || !auth.currentUser) return localDbGetAllTransactions();
  const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'transactions'));
  return snapshot.docs.map(doc => doc.data() as Transaction);
};
export const dbPutTransaction = async (tx: Transaction) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).put('transactions', tx);
  await setDoc(doc(firestore, 'users', getUid(), 'transactions', tx.id), sanitizeForFirestore(tx));
};
export const dbDeleteTransaction = async (id: string) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).delete('transactions', id);
  await deleteDoc(doc(firestore, 'users', getUid(), 'transactions', id));
};
export const dbClearTransactions = async () => { if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).clear('transactions'); };

// ─── Categories ───────────────────────────────────────────────────────────────
export const dbGetAllCategories = async (): Promise<Category[]> => {
  if (!isFirebaseConfigured || !auth.currentUser) return localDbGetAllCategories();
  const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'categories'));
  return snapshot.docs.map(doc => doc.data() as Category);
};
export const dbPutCategory = async (c: Category) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).put('categories', c);
  await setDoc(doc(firestore, 'users', getUid(), 'categories', c.id), sanitizeForFirestore(c));
};
export const dbDeleteCategory = async (id: string) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).delete('categories', id);
  await deleteDoc(doc(firestore, 'users', getUid(), 'categories', id));
};
export const dbClearCategories = async () => { if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).clear('categories'); };

// ─── Budgets (Moved to Settings) ─────────────────────────────────────────────
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

// ─── Debts ────────────────────────────────────────────────────────────
export const localDbGetAllDebts = async (): Promise<any[]> => (await getDB()).getAll('debts');
export const dbGetAllDebts = async (): Promise<any[]> => {
  if (!isFirebaseConfigured || !auth.currentUser) return localDbGetAllDebts();
  const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'debts'));
  return snapshot.docs.map(d => d.data());
};
export const dbPutDebt = async (d: any) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).put('debts', d);
  await setDoc(doc(firestore, 'users', getUid(), 'debts', d.id), sanitizeForFirestore(d));
};
export const dbDeleteDebt = async (id: string) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).delete('debts', id);
  await deleteDoc(doc(firestore, 'users', getUid(), 'debts', id));
};

// ─── Recurring Transactions ──────────────────────────────────────────
export const dbGetAllRecurringTransactions = async (): Promise<any[]> => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).getAll('recurring_transactions');
  const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'recurring_transactions'));
  return snapshot.docs.map(d => d.data());
};
export const dbPutRecurringTransaction = async (rt: any) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).put('recurring_transactions', rt);
  await setDoc(doc(firestore, 'users', getUid(), 'recurring_transactions', rt.id), sanitizeForFirestore(rt));
};
export const dbDeleteRecurringTransaction = async (id: string) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).delete('recurring_transactions', id);
  await deleteDoc(doc(firestore, 'users', getUid(), 'recurring_transactions', id));
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const dbGetSetting = async (key: string) => {
  if (!isFirebaseConfigured || !auth.currentUser) return localDbGetSetting(key);
  try {
     const docSnap = await getDoc(doc(firestore, 'users', getUid(), 'settings', key));
     return docSnap.exists() ? docSnap.data().value : undefined;
  } catch(e) { return undefined; }
};
export const dbPutSetting = async (key: string, value: any) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).put('settings', value as any, key);
  if (value === undefined || value === null) await deleteDoc(doc(firestore, 'users', getUid(), 'settings', key));
  else await setDoc(doc(firestore, 'users', getUid(), 'settings', key), { value: sanitizeForFirestore(value) });
};
export const dbDeleteSetting = async (key: string) => {
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).delete('settings', key);
  await deleteDoc(doc(firestore, 'users', getUid(), 'settings', key));
};

// ─── Full Export (for JSON backup) ───────────────────────────────────────────
export const dbExportAll = async () => {
  const [assets, transactions, categories, budgets, recurring] = await Promise.all([
    dbGetAllAssets(),
    dbGetAllTransactions(),
    dbGetAllCategories(),
    dbGetAllBudgets(),
    dbGetAllRecurringTransactions(),
  ]);
  const user    = await dbGetSetting('user');
  const pin     = await dbGetSetting('pin');
  const theme   = await dbGetSetting('theme');
  return { assets, transactions, categories, budgets, recurring, user, pin, theme, exportedAt: new Date().toISOString() };
};

// ─── Full Import (from JSON backup) ──────────────────────────────────────────
export const dbImportAll = async (data: ReturnType<typeof dbExportAll> extends Promise<infer T> ? T : never) => {
  if (!isFirebaseConfigured || !auth.currentUser) {
    const db = await getDB();
    const tx1 = db.transaction(['assets', 'transactions', 'categories', 'settings'], 'readwrite');
    await tx1.objectStore('assets').clear();
    await tx1.objectStore('transactions').clear();
    await tx1.objectStore('categories').clear();
    
    for (const a of data.assets)       await tx1.objectStore('assets').put(a);
    for (const t of data.transactions) await tx1.objectStore('transactions').put(t);
    for (const c of data.categories)   await tx1.objectStore('categories').put(c);
    if (data.recurring) {
        for (const r of data.recurring) await tx1.objectStore('recurring_transactions').put(r);
    }
    if (data.budgets) {
        for (const b of data.budgets)  await tx1.objectStore('budgets').put(b);
    }
    if (data.user)  await tx1.objectStore('settings').put(data.user as any,  'user');
    if (data.pin)   await tx1.objectStore('settings').put(data.pin  as any,  'pin');
    if (data.theme) await tx1.objectStore('settings').put(data.theme as any, 'theme');
    await tx1.done;
  } else {
    for (const a of data.assets)       await dbPutAsset(a);
    for (const t of data.transactions) await dbPutTransaction(t);
    for (const c of data.categories)   await dbPutCategory(c);
    if (data.recurring) {
        for (const r of data.recurring) await dbPutRecurringTransaction(r);
    }
    if (data.budgets) {
        for (const b of data.budgets)  await dbPutBudget(b);
    }
    if (data.user)  await dbPutSetting('user', data.user);
    if (data.pin)   await dbPutSetting('pin', data.pin);
    if (data.theme) await dbPutSetting('theme', data.theme);
  }
};

// ─── Data Migration ──────────────────────────────────────────────────────────
export const migrateFromIndexedDBToFirebase = async (): Promise<boolean> => {
  if (!isFirebaseConfigured || !auth.currentUser) return false;
  try {
    const isMigrated = await dbGetSetting('idb_to_firebase_migrated');
    if (isMigrated) return false;

    console.log('[MoneyApp] Commencing IDB -> Firebase Migration...');
    const localAssets = await localDbGetAllAssets();
    const localTxs = await localDbGetAllTransactions();
    const localCats = await localDbGetAllCategories();
    const localBudgets = await localDbGetAllBudgets();
    
    const promises = [];
    localAssets.forEach(a => promises.push(dbPutAsset(a)));
    localTxs.forEach(t => promises.push(dbPutTransaction(t)));
    localCats.forEach(c => promises.push(dbPutCategory(c)));
    localBudgets.forEach(b => promises.push(dbPutBudget(b)));
    
    const u = await localDbGetSetting('user');   if (u) promises.push(dbPutSetting('user', u));
    const p = await localDbGetSetting('pin');    if (p) promises.push(dbPutSetting('pin', p));
    const t = await localDbGetSetting('theme');  if (t) promises.push(dbPutSetting('theme', t));
    
    await Promise.all(promises);
    await dbPutSetting('idb_to_firebase_migrated', true);
    
    console.log('[MoneyApp] Cloud Migration Complete!');
    return true;
  } catch(e) {
    console.error('Migration failed:', e);
    return false;
  }
};

export const migrateFromLocalStorage = async () => false;
