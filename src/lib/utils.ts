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
 * Pure, deterministic recurring-occurrence generator (R1).
 * Returns every occurrence date of a rule (derived from `anchorDateStr` + frequency)
 * that falls within [fromDateStr, toDateStr] inclusive. Dates are 'YYYY-MM-DD'.
 */
export const computeOccurrenceDates = (
  anchorDateStr: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  fromDateStr: string,
  toDateStr: string
): string[] => {
  const anchor = parseLocalDate(anchorDateStr);
  const originalDay = anchor.getDate();
  const from = parseLocalDate(fromDateStr);
  const to = parseLocalDate(toDateStr);
  const result: string[] = [];

  let current = anchor;
  let guard = 0;
  while (current < from && guard < 10000) {
    const next = getNextDateSafe(current, frequency, originalDay);
    if (next.getTime() === current.getTime()) return result; // invalid frequency
    current = next;
    guard++;
  }

  guard = 0;
  while (current <= to && guard < 10000) {
    result.push(getLocalDate(current));
    const next = getNextDateSafe(current, frequency, originalDay);
    if (next.getTime() === current.getTime()) break; // invalid frequency
    current = next;
    guard++;
  }

  return result;
};

/**
 * Builds a ready-to-copy share message containing the link and (optional) token.
 */
export const buildShareText = (opts: { url: string; token?: string | null; title?: string; subtitle?: string }): string => {
  const lines: string[] = [];
  if (opts.title) lines.push(opts.title);
  if (opts.subtitle) lines.push(opts.subtitle);
  if (lines.length > 0) lines.push('');
  lines.push(`Link: ${opts.url}`);
  if (opts.token) lines.push(`Token: ${opts.token}`);
  return lines.join('\n');
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
 * @deprecated Legacy unsalted hash — kept only for verifying existing stored PINs.
 */
export const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const PBKDF2_ITERATIONS = 600000;
const LEGACY_PBKDF2_ITERATIONS = 100000;

const bytesToHex = (buf: ArrayBuffer | Uint8Array): string => {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

const hexToBytes = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
};

/**
 * Hashes a PIN using PBKDF2-SHA256 with 600,000 iterations (OWASP recommendation).
 * Format: `pbkdf2$<iterations>$<saltHex>$<hashHex>`.
 */
export const hashPinSecure = async (pin: string, iterations: number = PBKDF2_ITERATIONS): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `pbkdf2$${iterations}$${bytesToHex(salt)}$${bytesToHex(bits)}`;
};

/**
 * Verifies a PIN against a stored hash. Supports:
 * 1. New 4-part PBKDF2 format: `pbkdf2$<iterations>$<saltHex>$<hashHex>`
 * 2. Intermediate 3-part PBKDF2 format: `pbkdf2$<saltHex>$<hashHex>` (100k iterations)
 * 3. Legacy unsalted SHA-256 hex
 */
export const verifyPin = async (pin: string, stored: string): Promise<boolean> => {
  if (!stored) return false;
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    let iterations = PBKDF2_ITERATIONS;
    let saltHex = '';
    let expectedHash = '';

    if (parts.length === 4) {
      // pbkdf2$<iterations>$<saltHex>$<hashHex>
      iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
      saltHex = parts[2];
      expectedHash = parts[3];
    } else if (parts.length === 3) {
      // pbkdf2$<saltHex>$<hashHex> (legacy 100k)
      iterations = LEGACY_PBKDF2_ITERATIONS;
      saltHex = parts[1];
      expectedHash = parts[2];
    } else {
      return false;
    }

    const salt = hexToBytes(saltHex);
    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    const computed = bytesToHex(bits);
    if (computed.length !== expectedHash.length) return false;
    // constant-time comparison
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    return diff === 0;
  }
  // Legacy unsalted SHA-256
  const legacy = await hashPin(pin);
  return legacy === stored;
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

