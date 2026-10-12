import { describe, it, expect } from 'vitest';
import {
  convertToBaseIDR,
  getExchangeRate,
  formatCurrencyAmount,
  SUPPORTED_CURRENCIES,
} from '../src/lib/currency';

describe('src/lib/currency', () => {
  it('returns rate 1 for IDR or undefined', () => {
    expect(getExchangeRate('IDR')).toBe(1);
    expect(getExchangeRate(undefined)).toBe(1);
  });

  it('uses default fallback rate when live rates not loaded', () => {
    const usd = SUPPORTED_CURRENCIES.find(c => c.code === 'USD')!;
    expect(getExchangeRate('USD')).toBe(usd.defaultRateToIDR);
  });

  it('converts correctly to base IDR with custom and default rates', () => {
    expect(convertToBaseIDR(100_000, 'IDR')).toBe(100_000);
    expect(convertToBaseIDR(10, 'USD', 16_000)).toBe(160_000);
    // Rounds properly
    expect(convertToBaseIDR(10.5, 'USD', 100)).toBe(1050);
  });

  it('formats currency correctly for IDR and foreign currencies', () => {
    const formattedIdr = formatCurrencyAmount(50000, 'IDR');
    expect(formattedIdr).toContain('Rp');
    expect(formattedIdr).toContain('50.000');

    const formattedUsd = formatCurrencyAmount(25.5, 'USD');
    expect(formattedUsd).toContain('$');
    expect(formattedUsd).toContain('25.5');
  });
});
