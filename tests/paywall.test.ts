import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/config.js';
import type { AnalyticsStore, AnalyticsEventRecord } from '../src/lib/analytics-store.js';
import { createLinkStore, type LinkStore } from '../src/lib/store.js';
import {
  createEncodedPaymentHeader,
  createFacilitatorFetchHandler,
  FACILITATOR_URL,
} from './helpers/facilitator.js';

const ADMIN_KEY = 'dev-admin-key';

const baseConfig: AppConfig = {
  adminApiKey: ADMIN_KEY,
  defaultPriceUsd: 0.005,
  priceDecimals: 6,
  facilitatorUrl: FACILITATOR_URL,
  merchantAddress: 'merchant-test',
  network: 'solana',
  usdcMint: 'mint-test',
  tokenMint: 'TokenMint11111111111111111111111111111111',
  tokenHolderThreshold: 2_000_000n,
  premiumTokenThreshold: 5_000_000n,
  holderDiscountBps: 2_500,
  freeCallsPerWalletPerDay: 5,
  freeCallTokenThreshold: 0n,
  solanaRpcUrl: undefined,
  rpcMetricsUrl: undefined,
  rpcMetricsAuthHeader: undefined,
  analyticsSinkUrl: undefined,
  analyticsSinkAuthHeader: undefined,
  analyticsSinkDatabase: undefined,
  analyticsSinkTable: undefined,
};

async function bootstrapApp(
  configOverride?: Partial<AppConfig>,
  storeOverride?: LinkStore,
  analyticsOverride?: AnalyticsStore
) {
  const module = await import('../src/server.js');
  return module.createApp({
    config: { ...baseConfig, ...configOverride },
    store: storeOverride,
    analyticsStore: analyticsOverride,
  });
}

describe('paywall route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function createLink(
    app: Awaited<ReturnType<typeof bootstrapApp>>,
    overrides?: { origin?: string; priceUsd?: number; webhookUrl?: string; webhookSecret?: string }
  ): Promise<string> {
    const response = await app.request('http://localhost/admin/links', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': ADMIN_KEY,
      },
      body: JSON.stringify({
        origin: overrides?.origin ?? 'https://example.com/resource',
        priceUsd: overrides?.priceUsd ?? 0.005,
        webhookUrl: overrides?.webhookUrl,
        webhookSecret: overrides?.webhookSecret,
      }),
    });

    const payload = await response.json();
    return payload.id as string;
  }

  it('responds with 402 challenge when payment header missing', async () => {
    const app = await bootstrapApp();
    const linkId = await createLink(app);

    const fetchMock = vi.fn(createFacilitatorFetchHandler());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.stubGlobal('fetch', fetchMock as any);

    const response = await app.request(`http://localhost/p/${linkId}`);

    expect(response.status).toBe(402);
    const payload: unknown = await response.json();

    if (
      !payload ||
      typeof payload !== 'object' ||
      !('challenge' in payload) ||
      typeof (payload as { challenge?: unknown }).challenge !== 'object'
    ) {
      throw new Error('Unexpected challenge payload shape');
    }

    const challenge = (
      payload as {
        challenge: { accepts?: unknown };
      }
    ).challenge;

    if (!Array.isArray(challenge.accepts)) {
      throw new Error('Challenge payload missing accepts array');
    }

    expect(challenge.accepts[0]).toMatchObject({
      scheme: 'exact',
      network: 'solana',
      discountApplied: false,
      freeQuotaUsed: false,
    });

    expect(fetchMock).toHaveBeenCalled();
  });

  it('proxies origin response when payment header present', async () => {
    const app = await bootstrapApp();
    const linkId = await createLink(app);

    const mockResponseHeaders = new Headers({
      'content-type': 'application/json',
      'set-cookie': 'skip=me',
      'cache-control': 'max-age=60',
    });

    const mockResponseBody = JSON.stringify({ hello: 'world' });

    const fetchMock = vi.fn(
      createFacilitatorFetchHandler({
        originResponse: () =>
          new Response(mockResponseBody, {
            status: 200,
            headers: mockResponseHeaders,
          }),
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.stubGlobal('fetch', fetchMock as any);

    const paymentHeader = createEncodedPaymentHeader();

    const response = await app.request(`http://localhost/p/${linkId}`, {
      headers: {
        'x-payment': paymentHeader,
      },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('cache-control')).toBe('max-age=60');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('x-payment-response')).toBe(paymentHeader);

    const body = await response.json();
    expect(body).toEqual({ hello: 'world' });
  });

  it('records analytics event after a paid request is proxied', async () => {
    const analyticsRecord = vi.fn(
      async (
        event: Parameters<AnalyticsStore['record']>[0]
      ): Promise<AnalyticsEventRecord> => ({
        ...event,
        id: 'evt-1',
        receivedAt: new Date(),
      })
    );
    const analyticsStore: AnalyticsStore = {
      record: analyticsRecord,
    };

    const app = await bootstrapApp(undefined, undefined, analyticsStore);
    const linkId = await createLink(app);

    const fetchMock = vi.fn(
      createFacilitatorFetchHandler({
        originResponse: () =>
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          }),
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.stubGlobal('fetch', fetchMock as any);

    const paymentHeader = createEncodedPaymentHeader();

    const response = await app.request(`http://localhost/p/${linkId}`, {
      headers: {
        'x-payment': paymentHeader,
      },
    });

    expect(response.status).toBe(200);
    expect(analyticsRecord).toHaveBeenCalledTimes(1);
    const payload = analyticsRecord.mock.calls[0]?.[0];
    expect(payload?.name).toBe('link_paid_call');
    expect(payload?.props?.linkId).toBe(linkId);
  });

  it('dispatches webhook and records delivery success analytics', async () => {
    const analyticsRecord = vi.fn(
      async (
        event: Parameters<AnalyticsStore['record']>[0]
      ): Promise<AnalyticsEventRecord> => ({
        ...event,
        id: `evt-${Date.now()}`,
        receivedAt: new Date(),
      })
    );
    const analyticsStore: AnalyticsStore = {
      record: analyticsRecord,
    };

    const app = await bootstrapApp(undefined, undefined, analyticsStore);
    const webhookUrl = 'https://hooks.sol402.app/notify';
    const webhookSecret = 'whsec_test_secret';
    const linkId = await createLink(app, {
      webhookUrl,
      webhookSecret,
    });

    const facilitatorHandler = createFacilitatorFetchHandler({
      originResponse: () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
    });

    const webhookCalls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
          : (input as { url?: string } | undefined)?.url ?? '';

      if (url === webhookUrl) {
        webhookCalls.push({ url, init });
        return new Response(JSON.stringify({ delivered: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      return facilitatorHandler(input, init);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.stubGlobal('fetch', fetchMock as any);

    const paymentHeader = createEncodedPaymentHeader();

    const response = await app.request(`http://localhost/p/${linkId}`, {
      headers: {
        'x-payment': paymentHeader,
      },
    });

    expect(response.status).toBe(200);
    expect(webhookCalls).toHaveLength(1);
    const call = webhookCalls[0];
    expect(call.url).toBe(webhookUrl);
    const headers = new Headers(call.init?.headers);
    expect(headers.get('authorization')).toBe(`Bearer ${webhookSecret}`);
    expect(headers.get('content-type')).toBe('application/json');
    const bodyRaw = call.init?.body;
    expect(typeof bodyRaw).toBe('string');
    const body = JSON.parse(bodyRaw as string) as Record<string, unknown>;
    expect(body.event).toBe('sol402.link.settled');
    expect(body.request).toMatchObject({
      method: 'GET',
      path: `/p/${linkId}`,
    });
    expect(body.payment).toMatchObject({
      status: 'paid',
    });
    expect(body.pricing).toMatchObject({
      paid: true,
    });

    const recordedEvents = analyticsRecord.mock.calls.map((callArgs) => callArgs[0]);
    const eventNames = recordedEvents.map((event) => event?.name);
    expect(eventNames).toContain('link_paid_call');
    expect(eventNames).toContain('webhook_delivery_success');
    const webhookEvent = recordedEvents.find((event) => event?.name === 'webhook_delivery_success');
    expect(webhookEvent?.props?.webhookUrl).toBe(webhookUrl);
    expect(webhookEvent?.props?.responseStatus).toBe(200);
    expect(webhookEvent?.props?.errorMessage).toBeNull();
    expect(webhookEvent?.props?.attempt).toBe(1);
    expect(webhookEvent?.props?.paid).toBe(true);
  });

  it('records webhook failure analytics when dispatcher returns non-2xx', async () => {
    const analyticsRecord = vi.fn(
      async (
        event: Parameters<AnalyticsStore['record']>[0]
      ): Promise<AnalyticsEventRecord> => ({
        ...event,
        id: `evt-${Date.now()}`,
        receivedAt: new Date(),
      })
    );
    const analyticsStore: AnalyticsStore = {
      record: analyticsRecord,
    };

    const app = await bootstrapApp(undefined, undefined, analyticsStore);
    const webhookUrl = 'https://hooks.sol402.app/notify';
    const linkId = await createLink(app, {
      webhookUrl,
      webhookSecret: 'whsec_test_secret',
    });

    const facilitatorHandler = createFacilitatorFetchHandler({
      originResponse: () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
    });

    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
          : (input as { url?: string } | undefined)?.url ?? '';

      if (url === webhookUrl) {
        return new Response('Internal Error', {
          status: 500,
          headers: {
            'content-type': 'text/plain',
          },
        });
      }

      return facilitatorHandler(input, init);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.stubGlobal('fetch', fetchMock as any);

    const paymentHeader = createEncodedPaymentHeader();
    const response = await app.request(`http://localhost/p/${linkId}`, {
      headers: {
        'x-payment': paymentHeader,
      },
    });

    expect(response.status).toBe(200);

    const recordedEvents = analyticsRecord.mock.calls.map((callArgs) => callArgs[0]);
    const webhookEvent = recordedEvents.find(
      (event) => event?.name === 'webhook_delivery_failure'
    );
    expect(webhookEvent?.props?.webhookUrl).toBe(webhookUrl);
    expect(webhookEvent?.props?.responseStatus).toBe(500);
    expect(typeof webhookEvent?.props?.errorMessage).toBe('string');
    expect((webhookEvent?.props?.errorMessage ?? '').toLowerCase()).toContain('internal');
  });

  it('allows free quota bypass when payer qualifies', async () => {
    const app = await bootstrapApp({
      freeCallsPerWalletPerDay: 1,
      freeCallTokenThreshold: 0n,
    });
    const linkId = await createLink(app);

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        })
      )
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.stubGlobal('fetch', fetchMock as any);

    const response = await app.request(`http://localhost/p/${linkId}`, {
      headers: {
        'x-payer': 'wallet-free',
      },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.headers.get('x-payment-response')).toBe('FREE-QUOTA');
  });

  it('rejects unsafe origins before fetching', async () => {
    const store = createLinkStore();
    const app = await bootstrapApp(undefined, store);

    const record = await store.createLink({
      origin: 'http://127.0.0.1/private',
      priceUsd: 0.005,
    });

    const fetchMock = vi.fn(createFacilitatorFetchHandler());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.stubGlobal('fetch', fetchMock as any);

    const paymentHeader = createEncodedPaymentHeader();

    const response = await app.request(`http://localhost/p/${record.id}`, {
      headers: {
        'x-payment': paymentHeader,
      },
    });

    expect(response.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const calledOrigins = fetchMock.mock.calls.some(([input]) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url ?? '';
      return url.includes('127.0.0.1/private');
    });
    expect(calledOrigins).toBe(false);
    const payload = await response.json();
    expect(payload.error).toBe('invalid_origin');
  });

  it('rejects disallowed MIME types from origin', async () => {
    const app = await bootstrapApp();
    const linkId = await createLink(app, {
      origin: 'https://example.com/binary',
    });

    const fetchMock = vi.fn(
      createFacilitatorFetchHandler({
        originResponse: () =>
          new Response('binary', {
            status: 200,
            headers: {
              'content-type': 'application/octet-stream',
            },
          }),
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.stubGlobal('fetch', fetchMock as any);

    const paymentHeader = createEncodedPaymentHeader();

    const response = await app.request(`http://localhost/p/${linkId}`, {
      headers: {
        'x-payment': paymentHeader,
      },
    });

    expect(response.status).toBe(415);
    const payload = await response.json();
    expect(payload.error).toBe('unsupported_media_type');
  });
});
