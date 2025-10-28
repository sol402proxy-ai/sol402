import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TokenPerksService } from '../src/lib/token.js';

async function createTestApp(options: { tokenBalance?: bigint } = {}) {
  const [{ createApp }, { createLinkStore }] = await Promise.all([
    import('../src/app.js'),
    import('../src/lib/store.js'),
  ]);

  const balance = options.tokenBalance ?? BigInt(5_000_000);

  const tokenServiceStub = {
    adjustPrice: vi.fn(async ({ basePriceAtomic }) => ({
      priceAtomic: basePriceAtomic,
      reason: 'base-price',
      discountApplied: false,
      freeQuotaUsed: false,
    })),
    supportsBalanceChecks: () => true,
    getHolderBalance: vi.fn(async () => balance),
  } as unknown as TokenPerksService;

  return createApp({
    tokenService: tokenServiceStub,
    store: createLinkStore(),
  });
}

describe('admin routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates a link when credentials are valid', async () => {
    const app = await createTestApp();
    const response = await app.request('http://localhost/admin/links', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': 'dev-admin-key',
      },
      body: JSON.stringify({
        origin: 'https://example.com/api',
        priceUsd: 0.01,
      }),
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload).toMatchObject({
      origin: 'https://example.com/api',
      priceUsd: 0.01,
    });
    expect(typeof payload.id).toBe('string');
    expect(payload.createdAt).toBeTruthy();
  });

  it('rejects creation when admin key is missing', async () => {
    const app = await createTestApp();
    const response = await app.request('http://localhost/admin/links', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ origin: 'https://example.com' }),
    });

    expect(response.status).toBe(403);
  });

  it('allows admins to preview a proxied link', async () => {
    const app = await createTestApp();

    const createResponse = await app.request('http://localhost/admin/links', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': 'dev-admin-key',
      },
      body: JSON.stringify({
        origin: 'https://example.com/preview',
        priceUsd: 0.02,
      }),
    });

    const { id } = (await createResponse.json()) as { id: string };

    const mockHeaders = new Headers({
      'content-type': 'text/plain',
      'set-cookie': 'do-not-include=true',
    });

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response('preview-body', {
          status: 200,
          headers: mockHeaders,
        })
      )
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.stubGlobal('fetch', fetchMock as any);

    const response = await app.request(
      `http://localhost/admin/links/${id}/preview`,
      {
        headers: {
          'x-admin-key': 'dev-admin-key',
        },
      }
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('x-sol402-preview')).toBe('true');
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(await response.text()).toBe('preview-body');
  });

  it('auto-provisions link requests and returns minted metadata', async () => {
    const app = await createTestApp();

    const submission = await app.request('http://localhost/link/requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        origin: 'https://example.com/whitepaper.pdf',
        priceUsd: 0.02,
        merchantAddress: '9x2ntrxwyz5WPA9mFeXUyAEiMNC3bZ9ZUXxYQ2dGVmPT',
        contactEmail: 'founder@example.com',
        requestedBy: 'Example Labs',
      }),
    });

    expect(submission.status).toBe(201);
    const submissionPayload = await submission.json();
    expect(submissionPayload.status).toBe('approved');
    expect(submissionPayload.linkId).toBeDefined();
    expect(typeof submissionPayload.apiKey).toBe('string');
    expect(submissionPayload.tier?.id).toBe('premium');

    const listResponse = await app.request('http://localhost/admin/link-requests', {
      headers: {
        'x-admin-key': 'dev-admin-key',
      },
    });
    expect(listResponse.status).toBe(200);
    const listPayload = await listResponse.json();
    expect(Array.isArray(listPayload.requests)).toBe(true);
    const firstRequest = listPayload.requests[0];
    expect(firstRequest?.status).toBe('approved');
    expect(firstRequest?.tier).toBe('premium');
    expect(firstRequest?.linkId).toBe(submissionPayload.linkId);

    const linkResponse = await app.request(
      `http://localhost/admin/links/${submissionPayload.linkId}`,
      {
        headers: {
          'x-admin-key': 'dev-admin-key',
        },
      }
    );

    expect(linkResponse.status).toBe(200);
    const linkPayload = await linkResponse.json();
    expect(linkPayload.merchantAddress).toBe(
      '9x2ntrxwyz5WPA9mFeXUyAEiMNC3bZ9ZUXxYQ2dGVmPT'
    );
    expect(linkPayload.requestId).toBe(submissionPayload.requestId);
    expect(linkPayload.contactEmail).toBe('founder@example.com');
    expect(linkPayload.requester).toBe('Example Labs');
    expect(linkPayload.tier).toBe('premium');
  });

  it('rejects link requests when the wallet lacks the required SOL402 balance', async () => {
    const app = await createTestApp({ tokenBalance: BigInt(100_000) });

    const response = await app.request('http://localhost/link/requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        origin: 'https://example.com/insufficient.pdf',
        merchantAddress: '9x2ntrxwyz5WPA9mFeXUyAEiMNC3bZ9ZUXxYQ2dGVmPT',
        contactEmail: 'team@example.com',
      }),
    });

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error).toBe('insufficient_tokens');
  });
});
