import { describe, it, expect } from 'vitest';
import { getQuotaKey, FREE_QUOTA_LIMITS } from '../shared/quota';

describe('shared/quota', () => {
  it('defines correct free quota limits', () => {
    expect(FREE_QUOTA_LIMITS).toEqual({
      chat: 5,
      scan: 3,
      bulk: 2,
    });
  });

  it('generates zero-padded monthly quota keys', () => {
    const marchDate = new Date(2026, 2, 15); // Month index 2 = March
    expect(getQuotaKey(marchDate)).toBe('quota_2026-03');

    const decDate = new Date(2025, 11, 31); // Month index 11 = December
    expect(getQuotaKey(decDate)).toBe('quota_2025-12');

    const janDate = new Date(2026, 0, 1);
    expect(getQuotaKey(janDate)).toBe('quota_2026-01');
  });

  it('defaults to current date if no argument passed', () => {
    const key = getQuotaKey();
    expect(key).toMatch(/^quota_\d{4}-\d{2}$/);
  });
});
