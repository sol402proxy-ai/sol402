import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsMetricsService, WalletMetrics } from '../src/lib/analytics-metrics.js';

async function createTestApp(analyticsMetrics?: AnalyticsMetricsService) {
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

  const app = createApp({ store, analyticsMetrics });
  return { app, apiKey, wallet, linkId: link.id };
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

  it('returns analytics metrics snapshot for the dashboard', async () => {
    let linkIdRef = '';
    const generatedAt = new Date().toISOString();
    const analyticsStub = {
      getWalletMetrics: vi.fn(async (): Promise<WalletMetrics> => ({
        summary: {
          paidCallsTotal: 12,
          paidCalls24h: 5,
          paidCallsToday: 3,
          freeCallsTotal: 4,
          freeCalls24h: 2,
          freeCallsToday: 1,
          revenueUsdTotal: 0.48,
          revenueUsd24h: 0.2,
          revenueUsdToday: 0.12,
          lastPaymentAt: '2025-10-28T11:59:00.000Z',
        },
        timeseries: [
          { date: '2025-10-27', paidCalls: 2, freeCalls: 1, revenueUsd: 0.08 },
          { date: '2025-10-28', paidCalls: 3, freeCalls: 1, revenueUsd: 0.12 },
        ],
        linkStats: linkIdRef
          ? {
              [linkIdRef]: {
                paidCallsTotal: 10,
                paidCalls24h: 4,
                freeCallsTotal: 2,
                freeCalls24h: 1,
                revenueUsdTotal: 0.4,
                revenueUsd24h: 0.16,
                lastPaymentAt: '2025-10-28T11:59:00.000Z',
              },
            }
          : {},
        topReferrers: [{ host: 'sol402.app', paidCalls24h: 3 }],
        recentActivity: [
          {
            occurredAt: '2025-10-28T11:59:00.000Z',
            linkId: linkIdRef,
            type: 'paid',
            priceUsd: 0.04,
            reason: 'base-price',
            referrerHost: 'sol402.app',
            discountApplied: false,
            freeQuotaUsed: false,
          },
        ],
        generatedAt,
      })),
    } as unknown as AnalyticsMetricsService;

    const { app, apiKey, linkId } = await createTestApp(analyticsStub);
    linkIdRef = linkId;

    const response = await app.request('http://localhost/dashboard/metrics', {
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.summary.paidCallsTotal).toBe(12);
    expect(payload.summary.freeCallsRemaining).toBeGreaterThanOrEqual(0);
    expect(payload.links[0].stats.paidCalls24h).toBe(4);
    expect(payload.recentActivity).toHaveLength(1);
    expect(analyticsStub.getWalletMetrics).toHaveBeenCalledTimes(1);
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
