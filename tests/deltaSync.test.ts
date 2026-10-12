import { describe, it, expect, beforeEach } from 'vitest';
import {
  setDeltaLastSyncTimestamp,
  getDeltaLastSyncTimestamp,
} from '../src/lib/deltaSync';

describe('src/lib/deltaSync', () => {
  beforeEach(() => {
    // In-memory mock for localStorage in node environment
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
  });

  it('returns 0 when no prior sync timestamp exists', () => {
    expect(getDeltaLastSyncTimestamp(null)).toBe(0);
    expect(getDeltaLastSyncTimestamp('ws-123')).toBe(0);
  });

  it('correctly persists and isolates sync timestamps per workspace', () => {
    const timePersonal = 1773000001000;
    const timeWork = 1773000009000;

    setDeltaLastSyncTimestamp(null, timePersonal);
    setDeltaLastSyncTimestamp('ws-work', timeWork);

    expect(getDeltaLastSyncTimestamp(null)).toBe(timePersonal);
    expect(getDeltaLastSyncTimestamp('ws-work')).toBe(timeWork);
    expect(getDeltaLastSyncTimestamp('ws-other')).toBe(0);
  });
});
