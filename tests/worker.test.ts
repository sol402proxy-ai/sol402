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

function createMemoryBucket(files: Record<string, string | Uint8Array>) {
  const encoder = new TextEncoder();
  const storage = new Map(
    Object.entries(files).map(([key, value]) => {
      if (value instanceof Uint8Array) {
        return [key, { text: new TextDecoder().decode(value), data: value }];
      }
      const data = encoder.encode(value);
      return [key, { text: value, data }];
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
          return entry.data.buffer.slice(entry.data.byteOffset, entry.data.byteOffset + entry.data.byteLength);
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
    });

    const env = {
      LINKS_KV: linksKV.namespace,
      ANALYTICS_KV: analyticsKV.namespace,
      MARKETING_ASSETS: bucket,
    } as const;

    const response = await worker.fetch(new Request('https://example.com/robots.txt'), env, ctx);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('User-agent');
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
