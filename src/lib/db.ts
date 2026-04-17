import { openDB, type IDBPDatabase } from 'idb';
import type { Asset, Transaction, Category, UserProfile } from '../contexts/MoneyContext';

// ─── DB Schema ────────────────────────────────────────────────────────────────
const DB_NAME = 'moneyapp_db';
const DB_VERSION = 1;

export interface MoneyAppDB {
  assets: { key: string; value: Asset };
  transactions: { key: string; value: Transaction };
  categories: { key: string; value: Category };
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
        if (!db.objectStoreNames.contains('settings'))     db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
};

// ─── Assets ───────────────────────────────────────────────────────────────────
export const dbGetAllAssets = async (): Promise<Asset[]> => (await getDB()).getAll('assets');
export const dbPutAsset     = async (a: Asset)  => (await getDB()).put('assets', a);
export const dbDeleteAsset  = async (id: string) => (await getDB()).delete('assets', id);
export const dbClearAssets  = async () => (await getDB()).clear('assets');

// ─── Transactions ─────────────────────────────────────────────────────────────
export const dbGetAllTransactions = async (): Promise<Transaction[]> => (await getDB()).getAll('transactions');
export const dbPutTransaction     = async (tx: Transaction)  => (await getDB()).put('transactions', tx);
export const dbDeleteTransaction  = async (id: string) => (await getDB()).delete('transactions', id);
export const dbClearTransactions  = async () => (await getDB()).clear('transactions');

// ─── Categories ───────────────────────────────────────────────────────────────
export const dbGetAllCategories = async (): Promise<Category[]> => (await getDB()).getAll('categories');
export const dbPutCategory      = async (c: Category)  => (await getDB()).put('categories', c);
export const dbDeleteCategory   = async (id: string) => (await getDB()).delete('categories', id);
export const dbClearCategories  = async () => (await getDB()).clear('categories');

// ─── Settings ────────────────────────────────────────────────────────────────
export const dbGetSetting   = async (key: string) => (await getDB()).get('settings', key);
export const dbPutSetting   = async (key: string, value: string | number | boolean | UserProfile | null) => (await getDB()).put('settings', value as any, key);
export const dbDeleteSetting = async (key: string) => (await getDB()).delete('settings', key);

// ─── Full Export (for JSON backup) ───────────────────────────────────────────
export const dbExportAll = async () => {
  const [assets, transactions, categories] = await Promise.all([
    dbGetAllAssets(),
    dbGetAllTransactions(),
    dbGetAllCategories(),
  ]);
  const db = await getDB();
  const user    = await db.get('settings', 'user');
  const pin     = await db.get('settings', 'pin');
  const theme   = await db.get('settings', 'theme');
  return { assets, transactions, categories, user, pin, theme, exportedAt: new Date().toISOString() };
};

// ─── Full Import (from JSON backup) ──────────────────────────────────────────
export const dbImportAll = async (data: ReturnType<typeof dbExportAll> extends Promise<infer T> ? T : never) => {
  const db = await getDB();
  const tx1 = db.transaction(['assets', 'transactions', 'categories', 'settings'], 'readwrite');

  // Wipe + re-seed each store
  await tx1.objectStore('assets').clear();
  await tx1.objectStore('transactions').clear();
  await tx1.objectStore('categories').clear();

  for (const a of data.assets)       await tx1.objectStore('assets').put(a);
  for (const t of data.transactions) await tx1.objectStore('transactions').put(t);
  for (const c of data.categories)   await tx1.objectStore('categories').put(c);
  if (data.user)  await tx1.objectStore('settings').put(data.user as any,  'user');
  if (data.pin)   await tx1.objectStore('settings').put(data.pin  as any,  'pin');
  if (data.theme) await tx1.objectStore('settings').put(data.theme as any, 'theme');

  await tx1.done;
};

// ─── One-time Migration: localStorage → IndexedDB ───────────────────────────
export const migrateFromLocalStorage = async (): Promise<boolean> => {
  const migrationKey = 'moneyapp_idb_migrated';
  if (localStorage.getItem(migrationKey)) return false; // already done

  try {
    const rawAssets       = localStorage.getItem('moneyapp_assets_v2');
    const rawTransactions = localStorage.getItem('moneyapp_transactions_v2');
    const rawCategories   = localStorage.getItem('moneyapp_categories_v1');
    const rawUser         = localStorage.getItem('moneyapp_user');
    const rawPin          = localStorage.getItem('moneyapp_pin');
    const rawTheme        = localStorage.getItem('moneyapp_theme');

    if (rawAssets)       { const items: Asset[]       = JSON.parse(rawAssets);       for (const i of items) await dbPutAsset(i); }
    if (rawTransactions) { const items: Transaction[]  = JSON.parse(rawTransactions); for (const i of items) await dbPutTransaction(i); }
    if (rawCategories)   { const items: Category[]     = JSON.parse(rawCategories);   for (const i of items) await dbPutCategory(i); }
    if (rawUser)         await dbPutSetting('user',  JSON.parse(rawUser));
    if (rawPin)          await dbPutSetting('pin',   rawPin);
    if (rawTheme)        await dbPutSetting('theme', rawTheme);

    localStorage.setItem(migrationKey, '1');
    console.log('[MoneyApp] Migrated localStorage → IndexedDB ✅');
    return true;
  } catch (e) {
    console.error('[MoneyApp] Migration failed', e);
    return false;
  }
};
