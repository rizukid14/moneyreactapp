/**
 * Utility functions for local date and time formatting to avoid timezone issues.
 * Always returns local time strings regardless of UTC shifts.
 */

/**
 * Returns local date in YYYY-MM-DD format
 */
export const getLocalDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns local time in HH:mm format
 */
export const getLocalTime = (date: Date = new Date()): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Formats a number as currency with a given symbol prefix.
 * Falls back to IDR Intl formatting when no symbol is provided.
 */
export const formatCurrency = (amount: number, symbol?: string): string => {
  if (symbol) return `${symbol}${amount.toLocaleString('id-ID')}`;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Generates a unique ID using timestamp + random suffix.
 */
export const generateId = (): string =>
  Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);

/**
 * Returns true if a debt-related transaction is a principal (loan creation) tx,
 * not a payment. Used to exclude it when calculating how much has been paid.
 */
export const isPrincipalTx = (note: string, category?: string): boolean => {
  const n = note.toLowerCase();
  const c = category ? category.toLowerCase() : '';
  return n.includes('penerimaan dana pinjaman') ||
         n.includes('pemberian pinjaman') ||
         n.includes('belanja via') ||
         n.includes('penambahan') ||
         c === 'pinjaman & piutang' ||
         c === 'penerimaan dana pinjaman' ||
         c === 'pemberian pinjaman';
};
/**
 * Hashes a PIN string using SHA-256 via Web Crypto API.
 * Returns a hexadecimal string.
 */
export const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
