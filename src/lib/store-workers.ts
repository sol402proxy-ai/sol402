import type { CreateLinkInput, PaywallLink } from '../types.js';
import type { LinkStore } from './store.js';

export interface WorkersKVNamespace {
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

export interface WorkersKVLinkStoreOptions {
  prefix?: string;
  createId?: () => string;
}

const defaultPrefix = 'link:';

function generateId(): string {
  const globalCrypto = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: <T extends ArrayBufferView>(array: T) => T } }).crypto;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }
  if (globalCrypto?.getRandomValues) {
    const buffer = new Uint8Array(16);
    globalCrypto.getRandomValues(buffer);
    return Array.from(buffer, (value) => value.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('WorkersKVLinkStore requires crypto.randomUUID support');
}

function encode(link: PaywallLink): string {
  return JSON.stringify({
    ...link,
    createdAt: link.createdAt.toISOString(),
  });
}

function decode(raw: string): PaywallLink {
  const payload = JSON.parse(raw) as {
    id: string;
    origin: string;
    priceUsd?: number;
    createdAt: string;
  };
  return {
    id: payload.id,
    origin: payload.origin,
    priceUsd: payload.priceUsd,
    createdAt: new Date(payload.createdAt),
  };
}

export class WorkersKVLinkStore implements LinkStore {
  private readonly prefix: string;

  private readonly createId: () => string;

  constructor(private readonly kv: WorkersKVNamespace, options: WorkersKVLinkStoreOptions = {}) {
    this.prefix = options.prefix ?? defaultPrefix;
    this.createId = options.createId ?? generateId;
  }

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }

  async createLink(input: CreateLinkInput): Promise<PaywallLink> {
    const id = this.createId();
    const link: PaywallLink = {
      id,
      origin: input.origin,
      priceUsd: input.priceUsd,
      createdAt: new Date(),
    };

    await this.kv.put(this.key(id), encode(link));
    return link;
  }

  async getLink(id: string): Promise<PaywallLink | undefined> {
    const raw = await this.kv.get(this.key(id));
    if (!raw) {
      return undefined;
    }
    return decode(raw);
  }

  async deleteLink(id: string): Promise<void> {
    await this.kv.delete(this.key(id));
  }
}

export function createWorkersKVLinkStore(
  kv: WorkersKVNamespace,
  options?: WorkersKVLinkStoreOptions
): WorkersKVLinkStore {
  return new WorkersKVLinkStore(kv, options);
}
