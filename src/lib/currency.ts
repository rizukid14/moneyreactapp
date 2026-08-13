export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  defaultRateToIDR: number; // Fallback rate to IDR
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'IDR', name: 'Rupiah Indonesia', symbol: 'Rp', defaultRateToIDR: 1 },
  { code: 'USD', name: 'US Dollar', symbol: '$', defaultRateToIDR: 17872.45 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', defaultRateToIDR: 13200 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', defaultRateToIDR: 115 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR', defaultRateToIDR: 4765 },
];

const STORAGE_KEY = 'moneyapp_live_exchange_rates';

let liveRatesCache: Record<string, number> = {};

// Load cache from localStorage on initialize
try {
  const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved) {
    liveRatesCache = JSON.parse(saved);
  }
} catch (e) {}

/**
 * Fetch live exchange rates from open.er-api.com
 */
export const fetchLiveExchangeRates = async (): Promise<Record<string, number>> => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('Network response failed');
    const data = await response.json();
    
    if (data && data.rates && data.rates.IDR) {
      const usdToIdr = data.rates.IDR;
      const rates: Record<string, number> = {
        IDR: 1,
        USD: usdToIdr,
      };

      if (data.rates.SGD) rates.SGD = usdToIdr / data.rates.SGD;
      if (data.rates.JPY) rates.JPY = usdToIdr / data.rates.JPY;
      if (data.rates.SAR) rates.SAR = usdToIdr / data.rates.SAR;

      liveRatesCache = rates;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
      } catch (e) {}
      return rates;
    }
  } catch (err) {
    console.warn('Using cached or fallback exchange rates:', err);
  }
  return liveRatesCache;
};

/**
 * Get exchange rate to IDR for a given currency code.
 */
export const getExchangeRate = (currencyCode?: string): number => {
  if (!currencyCode || currencyCode === 'IDR') return 1;
  if (liveRatesCache[currencyCode]) return liveRatesCache[currencyCode];
  const config = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return config ? config.defaultRateToIDR : 1;
};

/**
 * Convert an amount in any currency to IDR (Base currency).
 */
export const convertToBaseIDR = (amount: number, currencyCode?: string, customRate?: number): number => {
  const rate = customRate || getExchangeRate(currencyCode);
  return Math.round(amount * rate);
};

/**
 * Format currency string with symbol.
 */
export const formatCurrencyAmount = (amount: number, currencyCode: string = 'IDR'): string => {
  const config = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  if (currencyCode === 'IDR') {
    return `${config.symbol}${Math.round(amount).toLocaleString('id-ID')}`;
  }
  return `${config.symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};
