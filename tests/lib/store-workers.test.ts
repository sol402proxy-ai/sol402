import { describe, expect, it } from 'vitest';
import { createWorkersKVLinkStore } from '../../src/lib/store-workers.js';

interface MockKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    keys: Array<{ name: string }>;
    list_complete: boolean;
    cursor?: string;
  }>;
}

function createMockKV(): MockKV {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list(options) {
      const keys = Array.from(store.keys()).filter((key) =>
        options?.prefix ? key.startsWith(options.prefix) : true
      );
      return {
        keys: keys.map((key) => ({ name: key })),
        list_complete: true,
      };
    },
  };
}

describe('WorkersKVLinkStore', () => {
  it('persists and retrieves links via KV namespace', async () => {
    const kv = createMockKV();
    const store = createWorkersKVLinkStore(kv, {
      createId: () => 'kv-test',
    });

    const created = await store.createLink({
      origin: 'https://example.com/kv',
      priceUsd: 0.02,
    });

    expect(created.id).toBe('kv-test');
    expect(created.origin).toBe('https://example.com/kv');

    const fetched = await store.getLink('kv-test');
    expect(fetched?.origin).toBe('https://example.com/kv');
    expect(fetched?.priceUsd).toBe(0.02);

    await store.deleteLink('kv-test');
    expect(await store.getLink('kv-test')).toBeUndefined();
  });
});
