import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebhookMetricsService } from '../../src/lib/webhook-metrics.js';

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

describe('WebhookMetricsService', () => {
  const config = {
    url: 'https://clickhouse.example.com',
    database: 'sol402',
    table: 'analytics_events',
    authHeader: 'Basic test',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('aggregates webhook metrics from ClickHouse responses', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      createClickHouseResponse([
        {
          success24h: 6,
          failure24h: 2,
          lastSuccessAt: '2025-11-03 11:59:00',
          lastFailureAt: '2025-11-03 10:30:00',
        },
      ])
    );
    fetchMock.mockResolvedValueOnce(
      createClickHouseResponse([
        {
          occurredAt: '2025-11-03 11:59:00',
          name: 'webhook_delivery_success',
          linkId: 'link-1',
          webhookUrl: 'https://example.com/hook',
          attempts: 1,
          responseStatus: 200,
          latencyMs: 320,
          errorMessage: null,
        },
        {
          occurredAt: '2025-11-03 10:30:00',
          name: 'webhook_delivery_failure',
          linkId: 'link-1',
          webhookUrl: 'https://example.com/hook',
          attempts: 2,
          responseStatus: 500,
          latencyMs: 540,
          errorMessage: 'Internal Server Error',
        },
      ])
    );

    const service = new WebhookMetricsService(config, {
      fetchFn: fetchMock,
      cacheTtlMs: 10_000,
    });

    const snapshot = await service.getWebhookMetrics('wallet-123');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstUrl = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(firstUrl.searchParams.get('param_wallet')).toBe('wallet-123');
    expect(snapshot.summary.success24h).toBe(6);
    expect(snapshot.summary.failure24h).toBe(2);
    expect(snapshot.summary.failureRate24h).toBeCloseTo(0.25);
    expect(snapshot.recentDeliveries).toHaveLength(2);
    expect(snapshot.recentDeliveries[0]?.status).toBe('success');
    expect(snapshot.recentDeliveries[1]?.status).toBe('failure');
  });

  it('caches responses within the TTL', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createClickHouseResponse([])));
    const service = new WebhookMetricsService(config, {
      fetchFn: fetchMock,
      cacheTtlMs: 60_000,
    });

    await service.getWebhookMetrics('wallet-abc');
    await service.getWebhookMetrics('wallet-abc');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
