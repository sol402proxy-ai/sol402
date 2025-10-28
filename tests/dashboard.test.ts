import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function createTestApp() {
  const [{ createApp }, { createLinkStore }, { generateApiKey }] = await Promise.all([
    import('../src/app.js'),
    import('../src/lib/store.js'),
    import('../src/lib/keys.js'),
  ]);

  const store = createLinkStore();
  const wallet = '9x2ntrxwyz5WPA9mFeXUyAEiMNC3bZ9ZUXxYQ2dGVmPT';
  const { apiKey, hash, preview } = await generateApiKey({ prefix: 'sol402' });

  const link = await store.createLink({
    origin: 'https://example.com/dataset.csv',
    priceUsd: 0.02,
    merchantAddress: wallet,
    tier: 'growth',
    tierLabel: 'Growth',
    apiKeyHash: hash,
    apiKeyPreview: preview,
    dailyRequestCap: 500,
    maxActiveLinks: 10,
  });

  await store.recordLinkUsage(link.id, {
    paidCallsDelta: 5,
    freeCallsDelta: 2,
    revenueUsdDelta: 0.1,
    lastPaymentAt: new Date('2024-01-01T00:00:00Z'),
  });

  const app = createApp({ store });
  return { app, apiKey, wallet };
}

describe('dashboard routes', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto as Crypto);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('authenticates via POST /dashboard/session and returns link metadata', async () => {
    const { app, apiKey, wallet } = await createTestApp();
    const response = await app.request('http://localhost/dashboard/session', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.merchantAddress).toBe(wallet);
    expect(payload?.tier?.id).toBe('growth');
    expect(Array.isArray(payload.links)).toBe(true);
    expect(payload.links[0]?.usage?.totalPaidCalls).toBe(5);
    expect(payload.links[0]?.usage?.totalFreeCalls).toBe(2);
    expect(payload.stats?.totalRevenueUsd).toBeCloseTo(0.1);
  });

  it('exposes the same payload via GET /dashboard/links with bearer auth', async () => {
    const { app, apiKey } = await createTestApp();
    const response = await app.request('http://localhost/dashboard/links', {
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(Array.isArray(payload.links)).toBe(true);
    expect(payload.links).toHaveLength(1);
  });

  it('rejects unknown API keys', async () => {
    const { app } = await createTestApp();
    const response = await app.request('http://localhost/dashboard/session', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ apiKey: 'sol402-invalid-key' }),
    });

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error).toBe('invalid_credentials');
  });
});
