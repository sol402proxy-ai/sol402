import type { AnalyticsEventInput, AnalyticsEventRecord, AnalyticsStore } from './analytics-store.js';
import type { WorkersKVNamespace } from './store-workers.js';

export interface WorkersKVAnalyticsStoreOptions {
  prefix?: string;
}

const defaultPrefix = 'analytics:';

function generateKey(prefix: string, occurredAt: Date): string {
  const ts = occurredAt.getTime().toString(36);
  const random = generateRandomSuffix();
  return `${prefix}${ts}:${random}`;
}

function generateRandomSuffix(): string {
  const globalCrypto = (globalThis as {
    crypto?: { getRandomValues?: <T extends ArrayBufferView>(array: T) => T };
  }).crypto;
  if (!globalCrypto?.getRandomValues) {
    throw new Error('WorkersKVAnalyticsStore requires crypto.getRandomValues support');
  }
  const buffer = new Uint8Array(6);
  globalCrypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, '0')).join('');
}

export class WorkersKVAnalyticsStore implements AnalyticsStore {
  private readonly prefix: string;

  constructor(private readonly kv: WorkersKVNamespace, options: WorkersKVAnalyticsStoreOptions = {}) {
    this.prefix = options.prefix ?? defaultPrefix;
  }

  async record(event: AnalyticsEventInput): Promise<AnalyticsEventRecord> {
    const key = generateKey(this.prefix, event.occurredAt);
    const record: AnalyticsEventRecord = {
      id: key,
      receivedAt: new Date(),
      ...event,
    };
    await this.kv.put(key, JSON.stringify(serialize(record)));
    return record;
  }
}

function serialize(record: AnalyticsEventRecord) {
  return {
    ...record,
    occurredAt: record.occurredAt.toISOString(),
    receivedAt: record.receivedAt.toISOString(),
  };
}

export function createWorkersKVAnalyticsStore(
  kv: WorkersKVNamespace,
  options?: WorkersKVAnalyticsStoreOptions
): WorkersKVAnalyticsStore {
  return new WorkersKVAnalyticsStore(kv, options);
}
