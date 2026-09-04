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
 * Parses YYYY-MM-DD string into a local Date at 00:00:00 local time,
 * avoiding any UTC parsing quirks.
 */
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length < 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Advances a date safely based on recurrence frequency,
 * handling month-end overflows (e.g., 31st) and leap years (Feb 29).
 * If originalDay is provided, monthly/yearly recalculates against originalDay.
 */
export const getNextDateSafe = (
  date: Date,
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly' | string,
  originalDay?: number
): Date => {
  const next = new Date(date);
  if (freq === 'daily') {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (freq === 'weekly') {
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (freq === 'monthly') {
    const targetDay = originalDay ?? next.getDate();
    let year = next.getFullYear();
    let month = next.getMonth() + 1;
    if (month > 11) {
      year += Math.floor(month / 12);
      month = month % 12;
    }
    const maxDays = new Date(year, month + 1, 0).getDate();
    const day = Math.min(targetDay, maxDays);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  if (freq === 'yearly') {
    const targetDay = originalDay ?? next.getDate();
    const month = next.getMonth();
    const year = next.getFullYear() + 1;
    const maxDays = new Date(year, month + 1, 0).getDate();
    const day = Math.min(targetDay, maxDays);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  return next;
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
export const isPrincipalTx = (note: string, categoryIdOrName?: string, categories?: { id: string; name: string }[]): boolean => {
  const n = note.toLowerCase();
  let c = categoryIdOrName ? categoryIdOrName.toLowerCase() : '';
  if (categories && categoryIdOrName) {
    const found = categories.find(cat => cat.id === categoryIdOrName);
    if (found) c = found.name.toLowerCase();
  }
  return n.includes('penerimaan dana pinjaman') ||
         n.includes('pemberian pinjaman') ||
         n.includes('belanja via') ||
         n.includes('penambahan') ||
         c === 'pinjaman & piutang' ||
         c === 'penerimaan dana pinjaman' ||
         c === 'pemberian pinjaman' ||
         c === 'sys-cat-debt-receive' ||
         c === 'sys-cat-receivable-pay' ||
         categoryIdOrName === 'sys-cat-debt-receive' ||
         categoryIdOrName === 'sys-cat-receivable-pay';
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

/**
 * Triggers a subtle device vibration if supported.
 * Mode 'light' is a short 15ms tap, 'medium' is 30ms, 'heavy' is 50ms.
 */
export const triggerHapticFeedback = (mode: 'light' | 'medium' | 'heavy' = 'light'): void => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const duration = mode === 'light' ? 15 : mode === 'medium' ? 30 : 50;
    navigator.vibrate(duration);
  }
};

