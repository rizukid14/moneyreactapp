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
        if (!db.objectStoreNames.contains('assets'))       db.createObjectStore('assets',       { keyPath: 'id' });
        if (!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('categories'))   db.createObjectStore('categories',   { keyPath: 'id' });
        if (!db.objectStoreNames.contains('budgets'))      db.createObjectStore('budgets',      { keyPath: 'id' });
        if (!db.objectStoreNames.contains('debts'))        db.createObjectStore('debts',        { keyPath: 'id' });
        if (!db.objectStoreNames.contains('recurring_transactions')) db.createObjectStore('recurring_transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings'))     db.createObjectStore('settings');
        if (!db.objectStoreNames.contains('pending_sync'))  db.createObjectStore('pending_sync',  { keyPath: 'id' });
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

const isQuotaError = (e: any) => {
  const code = e?.code;
  const msg = e?.message?.toLowerCase() || '';
  console.log('[db] Firestore error intercepted:', { code, msg });
  
  const isQuota = 
    code === 'resource-exhausted' || 
    code === 'functions/resource-exhausted' ||
    msg.includes('quota') || 
    msg.includes('limit exceeded') ||
    msg.includes('limit reached') ||
    code === 'permission-denied'; // Sometimes returns this when quota is hit in certain regions

  if (isQuota) console.warn('[db] Quota detected! Redirecting to local fallback.');
  return isQuota;
};

const recordPendingSync = async (item: Omit<SyncItem, 'timestamp'>) => {
  const db = await getDB();
  const existing = await db.get('pending_sync', item.id);
  
  // LOGIKA PEMBATALAN: 
  // Jika kita mau merekam DELETE tapi data tersebut sudah ada di antrean sebagai PUT (belum masuk cloud),
  // maka kita cukup hapus antrean PUT tersebut dan tidak perlu merekam DELETE (karena cloud belum punya datanya).
  if (item.operation === 'DELETE' && existing && (existing.operation === 'PUT' || existing.operation === 'UPDATE')) {
    await db.delete('pending_sync', item.id);
    console.log('[db] Pending PUT cancelled by DELETE for:', item.id);
    return;
  }

  console.log('[db] Recording pending sync:', item);
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

const mergeData = <T extends { id?: string | number }>(cloud: T[], local: T[]): T[] => {
    const map = new Map<string | number, T>();
    cloud.forEach(item => { if (item.id) map.set(item.id, item); });
    local.forEach(item => { if (item.id) map.set(item.id, item); });
    return Array.from(map.values());
};

// ─── Assets ───────────────────────────────────────────────────────────────────
export const dbGetAllAssets = async (): Promise<Asset[]> => {
  const local = await localDbGetAllAssets();
  if (!isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'assets'));
    const cloud = snapshot.docs.map(doc => doc.data() as Asset);
    return mergeData(cloud, local);
  } catch (e) {
    console.error('[db] Failed to fetch assets from cloud:', e);
    return local;
  }
};

export const dbPutAsset = async (a: Asset) => {
  // Always save locally first for offline support & fallback
  await (await getDB()).put('assets', a);
  
  if (!isFirebaseConfigured || !auth.currentUser) return;

  try {
    await setDoc(doc(firestore, 'users', getUid(), 'assets', a.id), sanitizeForFirestore(a));
    await removePendingSync(a.id); // Clear if it was pending
  } catch (e) {
    if (isQuotaError(e)) {
      console.warn('[db] Quota exceeded, asset saved locally only. Will sync later.');
      await recordPendingSync({ id: a.id, collection: 'assets', operation: 'PUT', data: a });
    } else {
      throw e;
    }
  }
};

export const dbDeleteAsset = async (id: string) => {
  await (await getDB()).delete('assets', id);
  
  if (!isFirebaseConfigured || !auth.currentUser) return;

  try {
    await deleteDoc(doc(firestore, 'users', getUid(), 'assets', id));
    await removePendingSync(id);
  } catch (e) {
     if (isQuotaError(e)) {
       await recordPendingSync({ id, collection: 'assets', operation: 'DELETE' });
     } else {
       throw e;
     }
  }
};

export const dbClearAssets = async () => { 
  if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).clear('assets'); 
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const dbGetAllTransactions = async (): Promise<Transaction[]> => {
  const local = await localDbGetAllTransactions();
  if (!isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'transactions'));
    const cloud = snapshot.docs.map(doc => doc.data() as Transaction);
    return mergeData(cloud, local);
  } catch (e) {
    console.error('[db] Failed to fetch transactions:', e);
    return local;
  }
};

export const dbPutTransaction = async (tx: Transaction) => {
  // 1. Simpan di IDB Lokal & Tandai sebagai Pending
  await (await getDB()).put('transactions', tx);
  await recordPendingSync({ id: tx.id, collection: 'transactions', operation: 'PUT', data: tx });
  
  // 2. Jika tidak ada Firebase, biarkan tetap pending
  if (!isFirebaseConfigured || !auth.currentUser) return;

  try {
    // 3. Coba upload ke Firestore dengan timeout 10 detik
    await withTimeout(setDoc(doc(firestore, 'users', getUid(), 'transactions', tx.id), sanitizeForFirestore(tx)));
    
    // 4. Jika berhasil, hapus dari pending
    await removePendingSync(tx.id);
    console.log('[db] Cloud upload successful, pending record cleared.');
  } catch (e) {
    // 5. Jika gagal karena kuota atau timeout, biarkan tetap di pending
  }
};

export const dbDeleteTransaction = async (id: string) => {
  console.log('[db] Initializing transaction delete:', id);
  
  // 1. Hapus lokal
  await (await getDB()).delete('transactions', id);
  
  // 2. Tandai sebagai DELETE di pending sync (ini akan memicu logika pembatalan jika sebelumnya ada PUT)
  await recordPendingSync({ id, collection: 'transactions', operation: 'DELETE' });
  
  if (!isFirebaseConfigured || !auth.currentUser) return;

  try {
    // 3. Coba hapus di Cloud
    await withTimeout(deleteDoc(doc(firestore, 'users', getUid(), 'transactions', id)));
    
    // 4. Jika berhasil, hapus catatan pending (baik itu PUT maupun DELETE sudah bersih sekarang)
    await removePendingSync(id);
    console.log('[db] Cloud deletion successful.');
  } catch (e) {
    // Jika gagal, biarkan statusnya tetap DELETE di pending sync
    console.warn('[db] Cloud deletion deferred:', e);
  }
};

export const dbClearTransactions = async () => { if (!isFirebaseConfigured || !auth.currentUser) return (await getDB()).clear('transactions'); };

// ─── Categories ───────────────────────────────────────────────────────────────
export const dbGetAllCategories = async (): Promise<Category[]> => {
  const local = await localDbGetAllCategories();
  if (!isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'categories'));
    const cloud = snapshot.docs.map(doc => doc.data() as Category);
    return mergeData(cloud, local);
  } catch (e) {
    console.error('[db] Failed to fetch categories:', e);
    return local;
  }
};

export const dbPutCategory = async (c: Category) => {
  await (await getDB()).put('categories', c);
  if (!isFirebaseConfigured || !auth.currentUser) return;
  try {
    await setDoc(doc(firestore, 'users', getUid(), 'categories', c.id), sanitizeForFirestore(c));
    await removePendingSync(c.id);
  } catch (e) {
    if (isQuotaError(e)) {
      await recordPendingSync({ id: c.id, collection: 'categories', operation: 'PUT', data: c });
    } else { throw e; }
  }
};

export const dbDeleteCategory = async (id: string) => {
  await (await getDB()).delete('categories', id);
  if (!isFirebaseConfigured || !auth.currentUser) return;
  try {
    await deleteDoc(doc(firestore, 'users', getUid(), 'categories', id));
    await removePendingSync(id);
  } catch (e) {
    if (isQuotaError(e)) {
      await recordPendingSync({ id, collection: 'categories', operation: 'DELETE' });
    } else { throw e; }
  }
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
  const local = await localDbGetAllDebts();
  if (!isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'debts'));
    const cloud = snapshot.docs.map(d => d.data());
    return mergeData(cloud, local);
  } catch (e) {
    console.error('[db] Failed to fetch debts:', e);
    return local;
  }
};

export const dbPutDebt = async (d: any) => {
  await (await getDB()).put('debts', d);
  if (!isFirebaseConfigured || !auth.currentUser) return;
  try {
    await setDoc(doc(firestore, 'users', getUid(), 'debts', d.id), sanitizeForFirestore(d));
    await removePendingSync(d.id);
  } catch (e) {
    if (isQuotaError(e)) {
      await recordPendingSync({ id: d.id, collection: 'debts', operation: 'PUT', data: d });
    } else { throw e; }
  }
};

export const dbDeleteDebt = async (id: string) => {
  await (await getDB()).delete('debts', id);
  if (!isFirebaseConfigured || !auth.currentUser) return;
  try {
    await deleteDoc(doc(firestore, 'users', getUid(), 'debts', id));
    await removePendingSync(id);
  } catch (e) {
    if (isQuotaError(e)) {
      await recordPendingSync({ id, collection: 'debts', operation: 'DELETE' });
    } else { throw e; }
  }
};

// ─── Recurring Transactions ──────────────────────────────────────────
export const dbGetAllRecurringTransactions = async (): Promise<any[]> => {
  const local = await (await getDB()).getAll('recurring_transactions');
  if (!isFirebaseConfigured || !auth.currentUser) return local;
  try {
    const snapshot = await getDocs(collection(firestore, 'users', getUid(), 'recurring_transactions'));
    const cloud = snapshot.docs.map(d => d.data());
    return mergeData(cloud, local);
  } catch (e) {
    console.error('[db] Failed to fetch recurring txs:', e);
    return local;
  }
};

export const dbPutRecurringTransaction = async (rt: any) => {
  await (await getDB()).put('recurring_transactions', rt);
  if (!isFirebaseConfigured || !auth.currentUser) return;
  try {
    await setDoc(doc(firestore, 'users', getUid(), 'recurring_transactions', rt.id), sanitizeForFirestore(rt));
    await removePendingSync(rt.id);
  } catch (e) {
    if (isQuotaError(e)) {
      await recordPendingSync({ id: rt.id, collection: 'recurring_transactions', operation: 'PUT', data: rt });
    } else { throw e; }
  }
};

export const dbDeleteRecurringTransaction = async (id: string) => {
  await (await getDB()).delete('recurring_transactions', id);
  if (!isFirebaseConfigured || !auth.currentUser) return;
  try {
    await deleteDoc(doc(firestore, 'users', getUid(), 'recurring_transactions', id));
    await removePendingSync(id);
  } catch (e) {
    if (isQuotaError(e)) {
      await recordPendingSync({ id, collection: 'recurring_transactions', operation: 'DELETE' });
    } else { throw e; }
  }
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const dbGetSetting = async (key: string) => {
  const local = await localDbGetSetting(key);
  if (!isFirebaseConfigured || !auth.currentUser) return local;
  try {
     const docSnap = await getDoc(doc(firestore, 'users', getUid(), 'settings', key));
     const cloud = docSnap.exists() ? docSnap.data().value : undefined;
     
     // Special merge for array settings like 'budgets'
     if (Array.isArray(cloud) && Array.isArray(local)) {
         return mergeData(cloud, local);
     }
     return cloud !== undefined ? cloud : local;
  } catch(e) { return local; }
};

export const dbPutSetting = async (key: string, value: any) => {
  await (await getDB()).put('settings', value, key);
  if (!isFirebaseConfigured || !auth.currentUser) return;
  
  if (value === undefined || value === null) {
      await dbDeleteSetting(key);
      return;
  }

  try {
    await setDoc(doc(firestore, 'users', getUid(), 'settings', key), { value: sanitizeForFirestore(value) });
    await removePendingSync(`setting-${key}`);
  } catch (e) {
    if (isQuotaError(e)) {
      await recordPendingSync({ id: `setting-${key}`, collection: 'settings', operation: 'PUT', data: { key, value } });
    } else { throw e; }
  }
};

export const dbDeleteSetting = async (key: string) => {
  await (await getDB()).delete('settings', key);
  if (!isFirebaseConfigured || !auth.currentUser) return;
  try {
    await deleteDoc(doc(firestore, 'users', getUid(), 'settings', key));
    await removePendingSync(`setting-${key}`);
  } catch (e) {
    if (isQuotaError(e)) {
      await recordPendingSync({ id: `setting-${key}`, collection: 'settings', operation: 'DELETE', data: { key } });
    } else { throw e; }
  }
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
export const dbSyncPendingItems = async (): Promise<{ success: number; failed: number }> => {
  if (!isFirebaseConfigured || !auth.currentUser) return { success: 0, failed: 0 };
  
  const db = await getDB();
  let pending = await db.getAll('pending_sync');
  
  // MEMBERSIHKAN ANTREAN:
  // Jika ada operasi DELETE untuk data yang datanya (item.data) kosong/undefined, 
  // dan kita tahu data itu belum pernah masuk cloud (karena gagal di awal), 
  // kita sebenarnya bisa abaikan. Namun cara termudah adalah:
  // Jika ada DELETE, tapi ID tersebut tidak punya data PUT sebelumnya yang sukses, kita coba saja.
  // Tapi untuk user ini, mari kita bantu hapus DELETE yang "nyangkut" untuk data lokal.
  
  let success = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      if (item.operation === 'PUT') {
        if (item.collection === 'settings') {
          const settingData = item.data?.value !== undefined ? item.data : { value: item.data };
          await withTimeout(setDoc(doc(firestore, 'users', getUid(), 'settings', item.id.replace('setting-', '')), sanitizeForFirestore(settingData)));
        } else {
          await withTimeout(setDoc(doc(firestore, 'users', getUid(), item.collection, item.id), sanitizeForFirestore(item.data)));
        }
      } else if (item.operation === 'DELETE') {
        if (item.collection === 'settings') {
          await withTimeout(deleteDoc(doc(firestore, 'users', getUid(), 'settings', item.id.replace('setting-', ''))));
        } else {
          await withTimeout(deleteDoc(doc(firestore, 'users', getUid(), item.collection, item.id)));
        }
      }
      await db.delete('pending_sync', item.id);
      success++;
    } catch (e) {
      console.error(`[db] Sync failed or timed out for ${item.collection}/${item.id}:`, e);
      failed++;
      // Stop loop IMMEDIATELY if we hit a timeout or quota
      // No point in waiting for the rest one by one
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

    console.log('[MoneyApp] Commencing IDB -> Firebase Migration...');
    const [assets, txs, cats, budgets, debts, recurring] = await Promise.all([
      localDbGetAllAssets(),
      localDbGetAllTransactions(),
      localDbGetAllCategories(),
      localDbGetAllBudgets(),
      localDbGetAllDebts(),
      (await getDB()).getAll('recurring_transactions')
    ]);

    const promises: Promise<any>[] = [];
    assets.forEach(a => promises.push(dbPutAsset(a)));
    txs.forEach(t => promises.push(dbPutTransaction(t)));
    cats.forEach(c => promises.push(dbPutCategory(c)));
    budgets.forEach(b => promises.push(dbPutBudget(b)));
    debts.forEach(d => promises.push(dbPutDebt(d)));
    recurring.forEach(r => promises.push(dbPutRecurringTransaction(r)));

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
