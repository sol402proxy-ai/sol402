import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsMetricsService, WalletMetrics } from '../src/lib/analytics-metrics.js';
import type { TokenPerksService } from '../src/lib/token.js';
import type { WebhookMetricsService, WebhookMetricsSnapshot } from '../src/lib/webhook-metrics.js';

interface CreateTestAppOptions {
  analyticsMetrics?: AnalyticsMetricsService;
  tokenService?: TokenPerksService;
  webhookMetrics?: WebhookMetricsService;
}

async function createTestApp(options: CreateTestAppOptions = {}) {
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

  const app = createApp({
    store,
    analyticsMetrics: options.analyticsMetrics,
    tokenService: options.tokenService,
    webhookMetrics: options.webhookMetrics,
  });
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

    const { app, apiKey, linkId } = await createTestApp({ analyticsMetrics: analyticsStub });
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

  it('returns token balance details for the merchant wallet', async () => {
    const refreshedAt = new Date('2025-11-02T10:00:00Z');
    const tokenServiceStub = {
      supportsBalanceChecks: vi.fn(() => true),
      getHolderBalanceDetails: vi.fn(async () => ({
        balance: 2_500_000n,
        decimals: 6,
        uiAmount: 2.5,
        uiAmountString: '2.5',
        refreshedAt,
      })),
    } as unknown as TokenPerksService;

    const { app, apiKey, wallet } = await createTestApp({ tokenService: tokenServiceStub });
    const response = await app.request('http://localhost/dashboard/balance', {
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.wallet).toBe(wallet);
    expect(payload.balance.atomic).toBe('2500000');
    expect(payload.balance.decimals).toBe(6);
    expect(payload.balance.uiAmount).toBeCloseTo(2.5);
    expect(payload.currentTier?.id).toBe('growth');
    expect(payload.nextTier?.id).toBe('premium');
    expect(payload.nextTier?.delta).toBe('2500000');
    expect(tokenServiceStub.getHolderBalanceDetails).toHaveBeenCalledWith(wallet, { fresh: false });
  });

  it('returns placeholder webhook data', async () => {
    const { app, apiKey } = await createTestApp();
    const response = await app.request('http://localhost/dashboard/webhooks', {
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.featureAvailable).toBe(false);
    expect(Array.isArray(payload.recentDeliveries)).toBe(true);
  });

  it('returns webhook metrics when service configured', async () => {
    const webhookSnapshot: WebhookMetricsSnapshot = {
      generatedAt: '2025-11-03T12:00:00.000Z',
      summary: {
        success24h: 6,
        failure24h: 2,
        failureRate24h: 0.25,
        lastSuccessAt: '2025-11-03T11:59:00.000Z',
        lastFailureAt: '2025-11-03T10:30:00.000Z',
      },
      recentDeliveries: [
        {
          occurredAt: '2025-11-03T11:59:00.000Z',
          status: 'success',
          linkId: 'link-1',
          webhookUrl: 'https://example.com/hook',
          attempts: 1,
          responseStatus: 200,
          latencyMs: 320,
          errorMessage: null,
        },
        {
          occurredAt: '2025-11-03T10:30:00.000Z',
          status: 'failure',
          linkId: 'link-1',
          webhookUrl: 'https://example.com/hook',
          attempts: 2,
          responseStatus: 500,
          latencyMs: 540,
          errorMessage: 'Internal Server Error',
        },
      ],
    };

    const webhookMetricsStub = {
      getWebhookMetrics: vi.fn(async () => webhookSnapshot),
    } as unknown as WebhookMetricsService;

    const { app, apiKey } = await createTestApp({
      webhookMetrics: webhookMetricsStub,
    });

    const response = await app.request('http://localhost/dashboard/webhooks', {
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.featureAvailable).toBe(true);
    expect(payload.summary.success24h).toBe(6);
    expect(payload.summary.failurePercent24h).toBeCloseTo(25);
    expect(payload.recentDeliveries).toHaveLength(2);
    expect(payload.recentDeliveries[0]?.status).toBe('success');
    expect(payload.recentDeliveries[1]?.errorMessage).toBe('Internal Server Error');
    expect(webhookMetricsStub.getWebhookMetrics).toHaveBeenCalledTimes(1);
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
