import type {
  CreateLinkInput,
  CreateLinkRequestInput,
  LinkRequest,
  LinkUsage,
  ListLinkRequestsOptions,
  PaywallLink,
  UpdateLinkRequestInput,
  UpdateLinkUsageInput,
} from '../types.js';
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
  requestPrefix?: string;
  createId?: () => string;
}

const defaultPrefix = 'link:';
const defaultRequestPrefix = 'request:';

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
  const payload: Record<string, unknown> = {
    ...link,
    createdAt: link.createdAt.toISOString(),
  };

  if (link.merchantAddress) {
    payload.merchantAddress = link.merchantAddress;
  }
  if (link.contactEmail) {
    payload.contactEmail = link.contactEmail;
  }
  if (link.requester) {
    payload.requester = link.requester;
  }
  if (link.requestId) {
    payload.requestId = link.requestId;
  }
  if (link.notes) {
    payload.notes = link.notes;
  }
  if (link.adminNotes) {
    payload.adminNotes = link.adminNotes;
  }
  if (link.tier) {
    payload.tier = link.tier;
  }
  if (link.tierLabel) {
    payload.tierLabel = link.tierLabel;
  }
  if (link.apiKeyHash) {
    payload.apiKeyHash = link.apiKeyHash;
  }
  if (link.apiKeyPreview) {
    payload.apiKeyPreview = link.apiKeyPreview;
  }
  if (typeof link.dailyRequestCap === 'number') {
    payload.dailyRequestCap = link.dailyRequestCap;
  }
  if (typeof link.maxActiveLinks === 'number') {
    payload.maxActiveLinks = link.maxActiveLinks;
  }
  if (link.usage) {
    payload.usage = {
      totalPaidCalls: link.usage.totalPaidCalls,
      totalFreeCalls: link.usage.totalFreeCalls,
      totalRevenueUsd: link.usage.totalRevenueUsd,
      lastPaymentAt: link.usage.lastPaymentAt ? link.usage.lastPaymentAt.toISOString() : null,
    };
  }

  return JSON.stringify(payload);
}

function decode(raw: string): PaywallLink {
  const payload = JSON.parse(raw) as {
    id: string;
    origin: string;
    priceUsd?: number;
    createdAt: string;
    merchantAddress?: string;
    contactEmail?: string;
    requester?: string;
    requestId?: string;
    notes?: string;
    adminNotes?: string;
    tier?: string;
    tierLabel?: string;
    apiKeyHash?: string;
    apiKeyPreview?: string;
    dailyRequestCap?: number;
    maxActiveLinks?: number;
    usage?: {
      totalPaidCalls: number;
      totalFreeCalls: number;
      totalRevenueUsd: number;
      lastPaymentAt?: string | null;
    };
  };
  return {
    id: payload.id,
    origin: payload.origin,
    priceUsd: payload.priceUsd,
    createdAt: new Date(payload.createdAt),
    merchantAddress: payload.merchantAddress,
    contactEmail: payload.contactEmail,
    requester: payload.requester,
    requestId: payload.requestId,
    notes: payload.notes,
    adminNotes: payload.adminNotes,
    tier: payload.tier as PaywallLink['tier'],
    tierLabel: payload.tierLabel,
    apiKeyHash: payload.apiKeyHash,
    apiKeyPreview: payload.apiKeyPreview,
    dailyRequestCap: payload.dailyRequestCap,
    maxActiveLinks: payload.maxActiveLinks,
    usage: payload.usage
      ? {
          totalPaidCalls: payload.usage.totalPaidCalls ?? 0,
          totalFreeCalls: payload.usage.totalFreeCalls ?? 0,
          totalRevenueUsd: payload.usage.totalRevenueUsd ?? 0,
          lastPaymentAt: payload.usage.lastPaymentAt
            ? new Date(payload.usage.lastPaymentAt)
            : undefined,
        }
      : undefined,
  };
}

function encodeRequest(request: LinkRequest): string {
  return JSON.stringify({
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    processedAt: request.processedAt ? request.processedAt.toISOString() : null,
  });
}

function decodeRequest(raw: string): LinkRequest {
  const payload = JSON.parse(raw) as {
    id: string;
    origin: string;
    priceUsd?: number;
    merchantAddress: string;
    contactEmail: string;
    requestedBy?: string;
    notes?: string;
    adminNotes?: string;
    status: LinkRequest['status'];
    createdAt: string;
    updatedAt: string;
    processedAt?: string | null;
    linkId?: string;
    tier?: string;
    tierLabel?: string;
    apiKeyHash?: string;
    apiKeyPreview?: string;
    dailyRequestCap?: number;
    maxActiveLinks?: number;
  };

  return {
    id: payload.id,
    origin: payload.origin,
    priceUsd: payload.priceUsd,
    merchantAddress: payload.merchantAddress,
    contactEmail: payload.contactEmail,
    requestedBy: payload.requestedBy,
    notes: payload.notes,
    adminNotes: payload.adminNotes,
    status: payload.status,
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    processedAt: payload.processedAt ? new Date(payload.processedAt) : undefined,
    linkId: payload.linkId,
    tier: payload.tier as LinkRequest['tier'],
    tierLabel: payload.tierLabel,
    apiKeyHash: payload.apiKeyHash,
    apiKeyPreview: payload.apiKeyPreview,
    dailyRequestCap: payload.dailyRequestCap,
    maxActiveLinks: payload.maxActiveLinks,
  };
}

export class WorkersKVLinkStore implements LinkStore {
  private readonly prefix: string;

  private readonly requestPrefix: string;

  private readonly createId: () => string;

  constructor(private readonly kv: WorkersKVNamespace, options: WorkersKVLinkStoreOptions = {}) {
    this.prefix = options.prefix ?? defaultPrefix;
    this.requestPrefix = options.requestPrefix ?? defaultRequestPrefix;
    this.createId = options.createId ?? generateId;
  }

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }

  private requestKey(id: string): string {
    return `${this.requestPrefix}${id}`;
  }

  private cloneUsage(usage?: LinkUsage): LinkUsage | undefined {
    if (!usage) {
      return undefined;
    }
    return {
      totalPaidCalls: usage.totalPaidCalls,
      totalFreeCalls: usage.totalFreeCalls,
      totalRevenueUsd: usage.totalRevenueUsd,
      lastPaymentAt: usage.lastPaymentAt ? new Date(usage.lastPaymentAt) : undefined,
    };
  }

  private initializeUsage(usage?: LinkUsage): LinkUsage {
    return (
      this.cloneUsage(usage) ?? {
        totalPaidCalls: 0,
        totalFreeCalls: 0,
        totalRevenueUsd: 0,
      }
    );
  }

  async createLink(input: CreateLinkInput): Promise<PaywallLink> {
    const id = this.createId();
    const usage = this.initializeUsage(input.usage);
    const link: PaywallLink = {
      id,
      origin: input.origin,
      priceUsd: input.priceUsd,
      createdAt: new Date(),
      merchantAddress: input.merchantAddress,
      contactEmail: input.contactEmail,
      requester: input.requester,
      requestId: input.requestId,
      notes: input.notes,
      adminNotes: input.adminNotes,
      tier: input.tier,
      tierLabel: input.tierLabel,
      apiKeyHash: input.apiKeyHash,
      apiKeyPreview: input.apiKeyPreview,
      dailyRequestCap: input.dailyRequestCap,
      maxActiveLinks: input.maxActiveLinks,
      usage,
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

  async listLinksByMerchant(merchantAddress: string): Promise<PaywallLink[]> {
    const response = await this.kv.list({
      prefix: this.prefix,
    });
    const links: PaywallLink[] = [];
    for (const key of response.keys) {
      const raw = await this.kv.get(key.name);
      if (!raw) {
        continue;
      }
      const link = decode(raw);
      if ((link.merchantAddress ?? '') === merchantAddress) {
        links.push(link);
      }
    }
    return links;
  }

  async countLinksByMerchant(merchantAddress: string): Promise<number> {
    const links = await this.listLinksByMerchant(merchantAddress);
    return links.length;
  }

  async findLinkByApiKeyHash(hash: string): Promise<PaywallLink | undefined> {
    const response = await this.kv.list({
      prefix: this.prefix,
    });
    for (const entry of response.keys) {
      const raw = await this.kv.get(entry.name);
      if (!raw) {
        continue;
      }
      const link = decode(raw);
      if (link.apiKeyHash && link.apiKeyHash === hash) {
        return link;
      }
    }
    return undefined;
  }

  async recordLinkUsage(id: string, update: UpdateLinkUsageInput): Promise<PaywallLink | undefined> {
    const existing = await this.getLink(id);
    if (!existing) {
      return undefined;
    }

    let nextUsage: LinkUsage;
    if (update.reset || !existing.usage) {
      nextUsage = {
        totalPaidCalls: 0,
        totalFreeCalls: 0,
        totalRevenueUsd: 0,
      };
    } else {
      nextUsage = {
        totalPaidCalls: existing.usage.totalPaidCalls,
        totalFreeCalls: existing.usage.totalFreeCalls,
        totalRevenueUsd: existing.usage.totalRevenueUsd,
        lastPaymentAt: existing.usage.lastPaymentAt
          ? new Date(existing.usage.lastPaymentAt)
          : undefined,
      };
    }

    const paidDelta = typeof update.paidCallsDelta === 'number' ? update.paidCallsDelta : 0;
    const freeDelta = typeof update.freeCallsDelta === 'number' ? update.freeCallsDelta : 0;
    const revenueDelta =
      typeof update.revenueUsdDelta === 'number' ? update.revenueUsdDelta : 0;

    nextUsage.totalPaidCalls = Math.max(0, nextUsage.totalPaidCalls + paidDelta);
    nextUsage.totalFreeCalls = Math.max(0, nextUsage.totalFreeCalls + freeDelta);
    const revenue = nextUsage.totalRevenueUsd + revenueDelta;
    nextUsage.totalRevenueUsd = Number.isFinite(revenue) ? Math.max(0, revenue) : nextUsage.totalRevenueUsd;

    if (update.lastPaymentAt) {
      nextUsage.lastPaymentAt = new Date(update.lastPaymentAt);
    }

    const updated: PaywallLink = {
      ...existing,
      usage: nextUsage,
    };

    await this.kv.put(this.key(id), encode(updated));
    return updated;
  }

  async createLinkRequest(input: CreateLinkRequestInput): Promise<LinkRequest> {
    const id = this.createId();
    const now = new Date();
    const request: LinkRequest = {
      id,
      origin: input.origin,
      priceUsd: input.priceUsd,
      merchantAddress: input.merchantAddress,
      contactEmail: input.contactEmail,
      requestedBy: input.requestedBy,
      notes: input.notes,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      tier: input.tier,
      tierLabel: input.tierLabel,
      apiKeyHash: input.apiKeyHash,
      apiKeyPreview: input.apiKeyPreview,
      dailyRequestCap: input.dailyRequestCap,
      maxActiveLinks: input.maxActiveLinks,
    };

    await this.kv.put(this.requestKey(id), encodeRequest(request));
    return request;
  }

  async getLinkRequest(id: string): Promise<LinkRequest | undefined> {
    const raw = await this.kv.get(this.requestKey(id));
    if (!raw) {
      return undefined;
    }
    return decodeRequest(raw);
  }

  async listLinkRequests(options: ListLinkRequestsOptions = {}): Promise<LinkRequest[]> {
    const { status, limit } = options;
    const response = await this.kv.list({
      prefix: this.requestPrefix,
    });

    const items: LinkRequest[] = [];
    for (const key of response.keys) {
      const raw = await this.kv.get(key.name);
      if (!raw) {
        continue;
      }
      items.push(decodeRequest(raw));
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const filtered = status ? items.filter((item) => item.status === status) : items;

    if (typeof limit === 'number' && limit > 0) {
      return filtered.slice(0, limit);
    }

    return filtered;
  }

  async updateLinkRequest(
    id: string,
    update: UpdateLinkRequestInput
  ): Promise<LinkRequest | undefined> {
    const existing = await this.getLinkRequest(id);
    if (!existing) {
      return undefined;
    }

    const status = update.status ?? existing.status;
    const processedAt =
      update.processedAt
      ?? (status !== 'pending' ? existing.processedAt ?? new Date() : existing.processedAt);

    const next: LinkRequest = {
      ...existing,
      merchantAddress: update.merchantAddress ?? existing.merchantAddress,
      contactEmail: update.contactEmail ?? existing.contactEmail,
      requestedBy: update.requestedBy ?? existing.requestedBy,
      priceUsd: update.priceUsd ?? existing.priceUsd,
      notes: update.notes ?? existing.notes,
      adminNotes: update.adminNotes ?? existing.adminNotes,
      status,
      linkId: update.linkId ?? existing.linkId,
      updatedAt: new Date(),
      processedAt,
      tier: update.tier ?? existing.tier,
      tierLabel: update.tierLabel ?? existing.tierLabel,
      apiKeyHash: update.apiKeyHash ?? existing.apiKeyHash,
      apiKeyPreview: update.apiKeyPreview ?? existing.apiKeyPreview,
      dailyRequestCap: update.dailyRequestCap ?? existing.dailyRequestCap,
      maxActiveLinks: update.maxActiveLinks ?? existing.maxActiveLinks,
    };

    await this.kv.put(this.requestKey(id), encodeRequest(next));
    return next;
  }
}

export function createWorkersKVLinkStore(
  kv: WorkersKVNamespace,
  options?: WorkersKVLinkStoreOptions
): WorkersKVLinkStore {
  return new WorkersKVLinkStore(kv, options);
}
