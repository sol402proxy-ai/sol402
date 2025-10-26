import { describe, expect, it } from 'vitest';
import { atomicToUsd, usdToAtomic } from '../../src/lib/pricing.js';

describe('pricing utilities', () => {
  it('converts USD to atomic units with configured decimals', () => {
    expect(usdToAtomic(0.005, 6)).toBe(5000n);
    expect(usdToAtomic(1.2345, 4)).toBe(12345n);
  });

  it('converts atomic amounts back to USD', () => {
    expect(atomicToUsd(5000n, 6)).toBeCloseTo(0.005, 6);
    expect(atomicToUsd(12345n, 4)).toBeCloseTo(1.2345, 4);
  });
});
