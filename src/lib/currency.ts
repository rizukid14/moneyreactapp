export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  defaultRateToIDR: number; // Fallback rate to IDR
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'IDR', name: 'Rupiah Indonesia', symbol: 'Rp', defaultRateToIDR: 1 },
  { code: 'USD', name: 'US Dollar', symbol: '$', defaultRateToIDR: 16200 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', defaultRateToIDR: 12000 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', defaultRateToIDR: 105 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR', defaultRateToIDR: 4320 },
];

/**
 * Get exchange rate to IDR for a given currency code.
 */
export const getExchangeRate = (currencyCode?: string): number => {
  if (!currencyCode || currencyCode === 'IDR') return 1;
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
