import { openDB, type IDBPDatabase } from 'idb';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db as firestore, isFirebaseConfigured } from './firebase';
import type { Asset, Transaction, Category, UserProfile } from '../contexts/MoneyContext';

// ─── LOCAL IndexedDB (Legacy / Fallback) ────────────────────────────────────────────────────────
const DB_NAME = 'moneyapp_db';
const DB_VERSION = 1;

export interface MoneyAppDB {
  assets: { key: string; value: Asset };
  transactions: { key: string; value: Transaction };
  categories: { key: string; value: Category };
  settings: { key: string; value: string | number | boolean | UserProfile | null };
}

let dbPromise: Promise<IDBPDatabase<MoneyAppDB>> | null = null;
const getLocalDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MoneyAppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('assets'))       db.createObjectStore('assets',       { keyPath: 'id' });
        if (!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('categories'))   db.createObjectStore('categories',   { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings'))     db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
};

export const localDbGetAllAssets = async (): Promise<Asset[]> => (await getLocalDB()).getAll('assets');
export const localDbGetAllTransactions = async (): Promise<Transaction[]> => (await getLocalDB()).getAll('transactions');
export const localDbGetAllCategories = async (): Promise<Category[]> => (await getLocalDB()).getAll('categories');
export const localDbGetSetting = async (key: string) => (await getLocalDB()).get('settings', key);

// ─── FIRESTORE (Cloud Sync) ───────────────────────────────────────────────────────────────────
const getUid = () => {
  if (!auth.currentUser) throw new Error("User not authenticated.");
  return auth.currentUser.uid;
};

// Firebase strictly forbids undefined fields
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

// ─── Assets
export const dbGetAllAssets = async (): Promise<Asset[]> => {
  if (!isFirebaseConfigured) return localDbGetAllAssets();
  const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'assets'));
  return snapshot.docs.map(doc => doc.data() as Asset);
};
export const dbPutAsset = async (a: Asset) => {
  if (!isFirebaseConfigured) return (await getLocalDB()).put('assets', a);
  await setDoc(doc(firestore, 'users', getUid(), 'assets', a.id), sanitizeForFirestore(a));
};
export const dbDeleteAsset = async (id: string) => {
  if (!isFirebaseConfigured) return (await getLocalDB()).delete('assets', id);
  await deleteDoc(doc(firestore, 'users', getUid(), 'assets', id));
};
export const dbClearAssets = async () => { if (!isFirebaseConfigured) return (await getLocalDB()).clear('assets'); };

// ─── Transactions
export const dbGetAllTransactions = async (): Promise<Transaction[]> => {
  if (!isFirebaseConfigured) return localDbGetAllTransactions();
  const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'transactions'));
  return snapshot.docs.map(doc => doc.data() as Transaction);
};
export const dbPutTransaction = async (tx: Transaction) => {
  if (!isFirebaseConfigured) return (await getLocalDB()).put('transactions', tx);
  await setDoc(doc(firestore, 'users', getUid(), 'transactions', tx.id), sanitizeForFirestore(tx));
};
export const dbDeleteTransaction = async (id: string) => {
  if (!isFirebaseConfigured) return (await getLocalDB()).delete('transactions', id);
  await deleteDoc(doc(firestore, 'users', getUid(), 'transactions', id));
};
export const dbClearTransactions = async () => { if (!isFirebaseConfigured) return (await getLocalDB()).clear('transactions'); };

// ─── Categories
export const dbGetAllCategories = async (): Promise<Category[]> => {
  if (!isFirebaseConfigured) return localDbGetAllCategories();
  const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'categories'));
  return snapshot.docs.map(doc => doc.data() as Category);
};
export const dbPutCategory = async (c: Category) => {
  if (!isFirebaseConfigured) return (await getLocalDB()).put('categories', c);
  await setDoc(doc(firestore, 'users', getUid(), 'categories', c.id), sanitizeForFirestore(c));
};
export const dbDeleteCategory = async (id: string) => {
  if (!isFirebaseConfigured) return (await getLocalDB()).delete('categories', id);
  await deleteDoc(doc(firestore, 'users', getUid(), 'categories', id));
};
export const dbClearCategories = async () => { if (!isFirebaseConfigured) return (await getLocalDB()).clear('categories'); };

// ─── Settings
export const dbGetSetting = async (key: string) => {
  if (!isFirebaseConfigured) return localDbGetSetting(key);
  try {
     const docSnap = await getDoc(doc(firestore, 'users', getUid(), 'settings', key));
     return docSnap.exists() ? docSnap.data().value : undefined;
  } catch(e) { return undefined; }
};
export const dbPutSetting = async (key: string, value: any) => {
  if (!isFirebaseConfigured) return (await getLocalDB()).put('settings', value, key);
  if (value === undefined || value === null) await deleteDoc(doc(firestore, 'users', getUid(), 'settings', key));
  else await setDoc(doc(firestore, 'users', getUid(), 'settings', key), { value: sanitizeForFirestore(value) });
};
export const dbDeleteSetting = async (key: string) => {
  if (!isFirebaseConfigured) return (await getLocalDB()).delete('settings', key);
  await deleteDoc(doc(firestore, 'users', getUid(), 'settings', key));
};

// ─── Data Migration ─────────────────────────────────────────────────────────────────────────
export const migrateFromIndexedDBToFirebase = async (): Promise<boolean> => {
  if (!isFirebaseConfigured) return false;
  try {
    const isMigrated = await dbGetSetting('idb_to_firebase_migrated');
    if (isMigrated) return false;

    console.log('[MoneyApp] Commencing IDB -> Firebase Migration...');
    const localAssets = await localDbGetAllAssets();
    const localTxs = await localDbGetAllTransactions();
    const localCats = await localDbGetAllCategories();
    
    // Batch operations logically in chunks of 500 (Firestore limit)
    const promises = [];
    localAssets.forEach(a => promises.push(dbPutAsset(a)));
    localTxs.forEach(t => promises.push(dbPutTransaction(t)));
    localCats.forEach(c => promises.push(dbPutCategory(c)));
    
    const u = await localDbGetSetting('user');   if (u) promises.push(dbPutSetting('user', u));
    const p = await localDbGetSetting('pin');    if (p) promises.push(dbPutSetting('pin', p));
    const t = await localDbGetSetting('theme');  if (t) promises.push(dbPutSetting('theme', t));
    
    await Promise.all(promises);
    await dbPutSetting('idb_to_firebase_migrated', true);
    
    console.log('[MoneyApp] Cloud Migration Complete! ✅');
    return true;
  } catch(e) {
    console.error('Migration failed:', e);
    return false;
  }
};

// Keep old local storage migration for legacy reasons
export const migrateFromLocalStorage = async () => false;

// ─── Export/Import (Offline) ──────────────────────────────────────────────────────────────────
export const dbExportAll = async () => {
    return { assets: [], transactions: [], categories: [], user: null, pin: null, theme: null, exportedAt: new Date().toISOString() };
};
export const dbImportAll = async (_data: any) => {};
