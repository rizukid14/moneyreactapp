import { describe, it, expect } from 'vitest';
import { hashPinSecure, verifyPin } from '../src/lib/utils';

describe('src/lib/utils PIN security with 600,000 iterations', () => {
  it('hashes with 600k iterations and 4-part format', async () => {
    const pin = '123456';
    const hashed = await hashPinSecure(pin);

    expect(hashed.startsWith('pbkdf2$600000$')).toBe(true);
    const parts = hashed.split('$');
    expect(parts.length).toBe(4);
    expect(parts[1]).toBe('600000');
    expect(parts[2].length).toBe(32); // 16 bytes salt
    expect(parts[3].length).toBe(64); // 32 bytes derived key
  });

  it('verifies 600k iteration hash correctly', async () => {
    const pin = '654321';
    const hashed = await hashPinSecure(pin);

    expect(await verifyPin(pin, hashed)).toBe(true);
    expect(await verifyPin('000000', hashed)).toBe(false);
  });

  it('maintains backward compatibility with 3-part 100k iteration hashes', async () => {
    // Generate an artificial 100k hash
    const pin = '999999';
    const legacy100k = await hashPinSecure(pin, 100000);
    // Convert 4-part to 3-part: pbkdf2$<iterations>$<salt>$<hash> -> pbkdf2$<salt>$<hash>
    const parts = legacy100k.split('$');
    const threePartHash = `pbkdf2$${parts[2]}$${parts[3]}`;

    expect(await verifyPin(pin, threePartHash)).toBe(true);
    expect(await verifyPin('111111', threePartHash)).toBe(false);
  });
});
