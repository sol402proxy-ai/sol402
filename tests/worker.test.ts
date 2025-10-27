import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { __resetWorkerApp } from '../src/worker.js';

interface MemoryKV {
  namespace: import('../src/lib/store-workers.js').WorkersKVNamespace;
  storage: Map<string, string>;
}

function createMemoryKV(): MemoryKV {
  const storage = new Map<string, string>();
  return {
    storage,
    namespace: {
      async get(key) {
        return storage.get(key) ?? null;
      },
      async put(key, value) {
        storage.set(key, value);
      },
      async delete(key) {
        storage.delete(key);
      },
      async list(options) {
        const prefix = options?.prefix ?? '';
        const limit = options?.limit ?? 1000;
        const filtered = Array.from(storage.keys()).filter((key) => key.startsWith(prefix));
        const start = options?.cursor ? Number(options.cursor) : 0;
        const slice = filtered.slice(start, start + limit);
        const nextCursor = start + slice.length;
        return {
          keys: slice.map((name) => ({ name })),
          list_complete: nextCursor >= filtered.length,
          cursor: nextCursor >= filtered.length ? undefined : String(nextCursor),
        };
      },
    },
  };
}

function createMemoryBucket(files: Record<string, string | Uint8Array | ArrayBuffer>) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const toArrayBuffer = (value: string | Uint8Array | ArrayBuffer): ArrayBuffer => {
    if (value instanceof ArrayBuffer) {
      return value;
    }
    if (value instanceof Uint8Array) {
      return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    }
    const encoded = encoder.encode(value);
    return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
  };

  const toText = (value: string | Uint8Array | ArrayBuffer): string => {
    if (typeof value === 'string') {
      return value;
    }
    const arrayBuffer = toArrayBuffer(value);
    return decoder.decode(new Uint8Array(arrayBuffer));
  };

  const storage = new Map(
    Object.entries(files).map(([key, value]) => {
      return [key, { text: toText(value), data: toArrayBuffer(value) }];
    })
  );

  return {
    async get(key: string) {
      const entry = storage.get(key);
      if (!entry) {
        return null;
      }
      return {
        async text() {
          return entry.text;
        },
        async arrayBuffer() {
          return entry.data;
        },
      };
    },
  };
}

const ctx = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
  props: {},
};

describe('worker runtime', () => {
  beforeEach(() => {
    __resetWorkerApp();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('serves marketing assets from the MARKETING_ASSETS bucket', async () => {
    const linksKV = createMemoryKV();
    const analyticsKV = createMemoryKV();
    const bucket = createMemoryBucket({
      'robots.txt': 'User-agent: *\nAllow: /',
      'assets/sol402-demo.js': 'export const demo = true;',
    });

    const env = {
      LINKS_KV: linksKV.namespace,
      ANALYTICS_KV: analyticsKV.namespace,
      MARKETING_ASSETS: bucket,
      SOLANA_RPC_URL: 'https://rpc.example.com',
    } as const;

    const robotsResponse = await worker.fetch(new Request('https://example.com/robots.txt'), env, ctx);
    expect(robotsResponse.status).toBe(200);
    expect(await robotsResponse.text()).toContain('User-agent');

    const assetResponse = await worker.fetch(new Request('https://example.com/assets/sol402-demo.js'), env, ctx);
    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers.get('content-type')).toContain('application/javascript');
    expect(await assetResponse.text()).toContain('demo');
  });

  it('proxies demo RPC requests to the configured Solana endpoint', async () => {
    const linksKV = createMemoryKV();
    const analyticsKV = createMemoryKV();

    const env = {
      LINKS_KV: linksKV.namespace,
      ANALYTICS_KV: analyticsKV.namespace,
      SOLANA_RPC_URL: 'https://rpc.example.com',
    } as const;

    const payload = { jsonrpc: '2.0', id: 1, method: 'getSlot' };

    const originalFetch = globalThis.fetch;
    const rpcMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ jsonrpc: '2.0', result: 123, id: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.fetch = vi.fn((input: any, init?: RequestInit) => {
      if (typeof input === 'string' && input === 'https://rpc.example.com') {
        return rpcMock(input, init);
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    const response = await worker.fetch(
      new Request('https://example.com/demo/rpc', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      }),
      env,
      ctx
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ jsonrpc: '2.0', result: 123, id: 1 });
    expect(rpcMock).toHaveBeenCalledWith('https://rpc.example.com', expect.objectContaining({ method: 'POST' }));

    globalThis.fetch = originalFetch;
  });

  it('flushes analytics events to the configured sink during scheduled runs', async () => {
    const linksKV = createMemoryKV();
    const analyticsKV = createMemoryKV();

    const env = {
      LINKS_KV: linksKV.namespace,
      ANALYTICS_KV: analyticsKV.namespace,
    } as const;

    const payload = {
      name: 'view_home',
      path: '/',
      ts: Date.now(),
    };

    const recordResponse = await worker.fetch(
      new Request('https://example.com/analytics/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      }),
      env,
      ctx
    );

    expect(recordResponse.status).toBe(202);
    expect(analyticsKV.storage.size).toBe(1);

    const sinkUrl = 'https://metrics.example/ingest';
    const originalFetch = globalThis.fetch;
    const sinkMock = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.fetch = sinkMock as any;

    try {
      await worker.scheduled({ cron: '* * * * *' }, {
        ...env,
        ANALYTICS_SINK_URL: sinkUrl,
        ANALYTICS_SINK_DATABASE: 'sol402',
        ANALYTICS_SINK_TABLE: 'analytics_events',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(sinkMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = sinkMock.mock.calls[0] as [string, RequestInit];
    const parsedUrl = new URL(requestUrl);
    expect(parsedUrl.searchParams.get('query')).toBe('INSERT INTO sol402.analytics_events FORMAT JSONEachRow');
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toMatchObject({ 'content-type': 'application/json' });
    const body =
      typeof requestInit.body === 'string'
        ? requestInit.body
        : await new Response(requestInit.body as BodyInit).text();
    const rows = body
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'view_home', path: '/' });
    expect(analyticsKV.storage.size).toBe(0);
  });
});
