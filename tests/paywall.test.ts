import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/config.js';
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
  holderDiscountBps: 2_500,
  freeCallsPerWalletPerDay: 5,
  freeCallTokenThreshold: 0n,
  solanaRpcUrl: undefined,
  rpcMetricsUrl: undefined,
  rpcMetricsAuthHeader: undefined,
};

async function bootstrapApp(
  configOverride?: Partial<AppConfig>,
  storeOverride?: LinkStore
) {
  const module = await import('../src/server.js');
  return module.createApp({
    config: { ...baseConfig, ...configOverride },
    store: storeOverride,
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
    overrides?: { origin?: string; priceUsd?: number }
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
