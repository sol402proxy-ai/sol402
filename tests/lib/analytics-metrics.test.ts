import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AnalyticsMetricsService } from '../../src/lib/analytics-metrics.js';

function createClickHouseResponse(data: unknown) {
  return new Response(
    JSON.stringify({
      meta: [],
      data,
      rows: Array.isArray(data) ? data.length : data ? 1 : 0,
      statistics: {},
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    }
  );
}

describe('AnalyticsMetricsService', () => {
  const config = {
    url: 'https://clickhouse.example.com',
    table: 'analytics_events',
    database: 'sol402',
    authHeader: 'Basic test',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('aggregates wallet metrics from ClickHouse responses', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      createClickHouseResponse([
        {
          paidCallsTotal: 12,
          paidCalls24h: 5,
          paidCallsToday: 3,
          freeCallsTotal: 4,
          freeCalls24h: 2,
          freeCallsToday: 1,
          revenueUsdTotal: 0.48,
          revenueUsd24h: 0.2,
          revenueUsdToday: 0.12,
          lastPaymentAt: '2025-10-28 12:00:00',
        },
      ])
    );
    fetchMock.mockResolvedValueOnce(
      createClickHouseResponse([
        {
          bucketDate: '2025-10-27',
          paidCalls: 2,
          freeCalls: 1,
          revenueUsd: 0.08,
        },
        {
          bucketDate: '2025-10-28',
          paidCalls: 3,
          freeCalls: 1,
          revenueUsd: 0.12,
        },
      ])
    );
    fetchMock.mockResolvedValueOnce(
      createClickHouseResponse([
        {
          linkId: 'link-1',
          paidCallsTotal: 10,
          paidCalls24h: 4,
          freeCallsTotal: 2,
          freeCalls24h: 1,
          revenueUsdTotal: 0.4,
          revenueUsd24h: 0.16,
          lastPaymentAt: '2025-10-28 11:59:00',
        },
      ])
    );
    fetchMock.mockResolvedValueOnce(
      createClickHouseResponse([
        {
          referrerHost: 'sol402.app',
          paidCalls24h: 3,
        },
      ])
    );
    fetchMock.mockResolvedValueOnce(
      createClickHouseResponse([
        {
          occurredAt: '2025-10-28 11:59:00',
          name: 'link_paid_call',
          linkId: 'link-1',
          priceUsd: 0.04,
          reason: 'base-price',
          referrerHost: 'sol402.app',
          discountApplied: 0,
          freeQuotaUsed: 0,
        },
        {
          occurredAt: '2025-10-28 11:45:00',
          name: 'link_free_call',
          linkId: 'link-1',
          priceUsd: 0,
          reason: 'free-quota',
          referrerHost: 'sol402.app',
          discountApplied: 0,
          freeQuotaUsed: 1,
        },
      ])
    );

    const service = new AnalyticsMetricsService(config, {
      fetchFn: fetchMock,
      cacheTtlMs: 10_000,
    });

    const result = await service.getWalletMetrics('wallet-123');

    expect(fetchMock).toHaveBeenCalledTimes(5);
    const firstCallUrl = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(firstCallUrl.searchParams.get('param_wallet')).toBe('wallet-123');

    expect(result.summary.paidCallsTotal).toBe(12);
    expect(result.summary.revenueUsd24h).toBeCloseTo(0.2);
    expect(result.timeseries).toHaveLength(2);
    expect(result.linkStats['link-1']?.paidCalls24h).toBe(4);
    expect(result.topReferrers[0]).toEqual({ host: 'sol402.app', paidCalls24h: 3 });
    expect(result.recentActivity[0]?.type).toBe('paid');
  });

  it('returns cached metrics within the TTL', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createClickHouseResponse([])));
    const service = new AnalyticsMetricsService(config, {
      fetchFn: fetchMock,
      cacheTtlMs: 60_000,
    });

    await service.getWalletMetrics('wallet-abc');
    await service.getWalletMetrics('wallet-abc');

    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('loads global summary metrics and caches the result', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        createClickHouseResponse([
          {
            requestsTotal: 128,
            paidCallsTotal: 96,
            freeCallsTotal: 32,
            revenueUsdTotal: 4.82,
            paidCalls24h: 24,
            freeCalls24h: 8,
            revenueUsd24h: 1.25,
            discountApplied24h: 6,
            freeQuotaUsed24h: 5,
          },
        ])
      )
    );

    const service = new AnalyticsMetricsService(config, {
      fetchFn: fetchMock,
      cacheTtlMs: 10_000,
    });

    const summary = await service.getGlobalSummary();
    expect(summary.requestsTotal).toBe(128);
    expect(summary.revenueUsdTotal).toBeCloseTo(4.82);
    expect(summary.discountApplied24h).toBe(6);

    await service.getGlobalSummary();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
