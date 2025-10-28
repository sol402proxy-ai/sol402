import { describe, expect, it } from 'vitest';
import { createWorkersKVLinkStore } from '../../src/lib/store-workers.js';

interface MockKV {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: {
      expiration?: number;
      expirationTtl?: number;
    }
  ): Promise<void>;
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
      merchantAddress: 'Merchant1111111111111111111111111111111',
      contactEmail: 'owner@example.com',
      requester: 'Example Owner',
      notes: 'Sample notes',
      tier: 'growth',
      tierLabel: 'Growth',
      apiKeyHash: 'hash-123',
      apiKeyPreview: 'SOL402-1234',
      dailyRequestCap: 500,
      maxActiveLinks: 10,
    });

    expect(created.id).toBe('kv-test');
    expect(created.origin).toBe('https://example.com/kv');
    expect(created.merchantAddress).toBe('Merchant1111111111111111111111111111111');
    expect(created.contactEmail).toBe('owner@example.com');
    expect(created.requester).toBe('Example Owner');
    expect(created.notes).toBe('Sample notes');
    expect(created.tier).toBe('growth');
    expect(created.apiKeyPreview).toBe('SOL402-1234');
    expect(created.usage?.totalPaidCalls).toBe(0);

    expect(await kv.get('link-api:hash-123')).toBe('kv-test');

    const fetched = await store.getLink('kv-test');
    expect(fetched?.origin).toBe('https://example.com/kv');
    expect(fetched?.priceUsd).toBe(0.02);
    expect(fetched?.merchantAddress).toBe('Merchant1111111111111111111111111111111');
    expect(fetched?.contactEmail).toBe('owner@example.com');
    expect(fetched?.requester).toBe('Example Owner');
    expect(fetched?.tierLabel).toBe('Growth');

    const located = await store.findLinkByApiKeyHash('hash-123');
    expect(located?.id).toBe('kv-test');

    await store.recordLinkUsage('kv-test', {
      paidCallsDelta: 3,
      freeCallsDelta: 1,
      revenueUsdDelta: 0.06,
    });

    const withUsage = await store.getLink('kv-test');
    expect(withUsage?.usage?.totalPaidCalls).toBe(3);
    expect(withUsage?.usage?.totalFreeCalls).toBe(1);
    expect(withUsage?.usage?.totalRevenueUsd).toBeCloseTo(0.06);

    const count = await store.countLinksByMerchant('Merchant1111111111111111111111111111111');
    expect(count).toBe(1);

    await store.deleteLink('kv-test');
    expect(await store.getLink('kv-test')).toBeUndefined();
  });

  it('manages link requests lifecycle', async () => {
    const kv = createMockKV();
    const store = createWorkersKVLinkStore(kv, {
      createId: () => Math.random().toString(36).slice(2),
    });

    const request = await store.createLinkRequest({
      origin: 'https://example.com/report',
      priceUsd: 0.5,
      merchantAddress: 'Merchant1111111111111111111111111111111',
      contactEmail: 'admin@example.com',
      requestedBy: 'Example Owner',
      notes: 'Please approve quickly',
      tier: 'baseline',
      tierLabel: 'Baseline',
      apiKeyHash: 'hash',
      apiKeyPreview: 'SOL402-ABCD',
      dailyRequestCap: 200,
      maxActiveLinks: 3,
    });

    expect(request.status).toBe('pending');

    const fetched = await store.getLinkRequest(request.id);
    expect(fetched?.origin).toBe('https://example.com/report');
    expect(fetched?.contactEmail).toBe('admin@example.com');

    const listed = await store.listLinkRequests();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(request.id);

    const updated = await store.updateLinkRequest(request.id, {
      status: 'approved',
      linkId: 'link-123',
      adminNotes: 'Looks good',
      tier: 'premium',
      tierLabel: 'Premium',
    });

    expect(updated?.status).toBe('approved');
    expect(updated?.linkId).toBe('link-123');
    expect(updated?.adminNotes).toBe('Looks good');
    expect(updated?.tier).toBe('premium');

    const approved = await store.listLinkRequests({ status: 'approved' });
    expect(approved).toHaveLength(1);
  });
});
