import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TokenPerksService } from '../src/lib/token.js';

async function createTestApp(tokenBalance: bigint) {
  const [{ createApp }, { createLinkStore }] = await Promise.all([
    import('../src/app.js'),
    import('../src/lib/store.js'),
  ]);

  const tokenServiceStub = {
    adjustPrice: vi.fn(async ({ basePriceAtomic }) => ({
      priceAtomic: basePriceAtomic,
      reason: 'base-price',
      discountApplied: false,
      freeQuotaUsed: false,
    })),
    supportsBalanceChecks: () => true,
    getHolderBalance: vi.fn(async () => tokenBalance),
  } as unknown as TokenPerksService;

  return createApp({
    tokenService: tokenServiceStub,
    store: createLinkStore(),
  });
}

describe('link request routes', () => {
  const wallet = '9x2ntrxwyz5WPA9mFeXUyAEiMNC3bZ9ZUXxYQ2dGVmPT';

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns tier metadata for eligible wallets', async () => {
    const app = await createTestApp(BigInt(5_500_000));
    const response = await app.request(`http://localhost/link/tiers/${wallet}`);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.eligible).toBe(true);
    expect(payload.tier.id).toBe('premium');
    expect(payload.discountEligible).toBe(true);
    expect(payload.freeCallsEligible).toBe(true);
  });

  it('returns ineligible tier summary when balance is too low', async () => {
    const app = await createTestApp(BigInt(100_000));
    const response = await app.request(`http://localhost/link/tiers/${wallet}`);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.eligible).toBe(false);
    expect(payload.tier).toBeNull();
    expect(payload.freeCallsEligible).toBe(false);
  });

  it('auto-provisions without a contact email', async () => {
    const app = await createTestApp(BigInt(2_500_000));
    const submission = await app.request('http://localhost/link/requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        origin: 'https://example.com/dataset.csv',
        priceUsd: 0.02,
        merchantAddress: wallet,
        notes: 'No email supplied',
      }),
    });
    expect(submission.status).toBe(201);
    const payload = await submission.json();
    expect(payload.status).toBe('approved');
    expect(payload.contactEmail).toBeUndefined();
    expect(payload.tier.id).toBe('growth');
  });
});
