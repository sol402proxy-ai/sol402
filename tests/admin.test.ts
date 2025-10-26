import { afterEach, describe, expect, it, vi } from 'vitest';

async function createApp() {
  const module = await import('../src/server.js');
  return module.createApp();
}

describe('admin routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates a link when credentials are valid', async () => {
    const app = await createApp();
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
    const app = await createApp();
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
    const app = await createApp();

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
});
