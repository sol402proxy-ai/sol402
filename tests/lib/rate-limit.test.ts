import { describe, expect, it } from 'vitest';
import { TokenBucketRateLimiter } from '../../src/lib/rate-limit.js';

describe('TokenBucketRateLimiter', () => {
  it('allows requests while tokens remain', () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 2,
      refillRate: 2,
      refillIntervalMs: 60_000,
    });

    expect(limiter.consume('key')).toBe(true);
    expect(limiter.consume('key')).toBe(true);
    expect(limiter.consume('key')).toBe(false);
  });

  it('refills tokens after interval', () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 1,
      refillRate: 1,
      refillIntervalMs: 25,
    });

    expect(limiter.consume('rate')).toBe(true);
    expect(limiter.consume('rate')).toBe(false);

    // Wait for refill
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(limiter.consume('rate')).toBe(true);
        resolve();
      }, 35);
    });
  });
});
