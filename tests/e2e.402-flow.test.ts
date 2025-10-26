import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/config.js';
import { createApp } from '../src/server.js';

const testConfig: AppConfig = {
  adminApiKey: 'dev-admin-key',
  defaultPriceUsd: 0.01,
  priceDecimals: 6,
  facilitatorUrl: 'https://facilitator.test',
  merchantAddress: 'merchant-e2e',
  network: 'solana',
  usdcMint: 'mint-e2e',
  tokenMint: 'TokenMint11111111111111111111111111111111',
  tokenHolderThreshold: 2_000_000n,
  holderDiscountBps: 2_500,
  freeCallsPerWalletPerDay: 0,
  freeCallTokenThreshold: 0n,
  solanaRpcUrl: undefined,
  rpcMetricsUrl: undefined,
  rpcMetricsAuthHeader: undefined,
};

describe('e2e 402 flow', () => {
  it('challenges, accepts payment, and proxies origin', async () => {
    const app = createApp({
      config: testConfig,
    });

    const createLinkResponse = await app.request('http://localhost/admin/links', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': testConfig.adminApiKey,
      },
      body: JSON.stringify({
        origin: 'https://example.com/e2e',
        priceUsd: 0.01,
      }),
    });

    const { id } = await createLinkResponse.json<{ id: string }>();

    const firstAttempt = await app.request(`http://localhost/p/${id}`, {
      headers: {
        accept: 'application/json',
      },
    });
    expect(firstAttempt.status).toBe(402);
    expect(firstAttempt.headers.get('x-payment-required')).toBe('true');

    const challenge = await firstAttempt.json();
    expect(challenge).toHaveProperty('challenge.accepts');

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'ignore',
          },
        })
      )
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.stubGlobal('fetch', fetchMock as any);

      const paidResponse = await app.request(`http://localhost/p/${id}`, {
        headers: {
          'x-payment': 'mock-receipt',
        },
      });

      expect(paidResponse.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(paidResponse.headers.get('set-cookie')).toBeNull();
      expect(paidResponse.headers.get('x-payment-response')).toBe('mock-receipt');
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });

});
