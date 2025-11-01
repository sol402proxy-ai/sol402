import { randomUUID } from 'node:crypto';
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

export interface LinkStore {
  createLink(input: CreateLinkInput): Promise<PaywallLink>;
  getLink(id: string): Promise<PaywallLink | undefined>;
  deleteLink(id: string): Promise<void>;
  listLinksByMerchant(merchantAddress: string): Promise<PaywallLink[]>;
  countLinksByMerchant(merchantAddress: string): Promise<number>;
  findLinkByApiKeyHash(hash: string): Promise<PaywallLink | undefined>;
  recordLinkUsage(id: string, update: UpdateLinkUsageInput): Promise<PaywallLink | undefined>;
  createLinkRequest(input: CreateLinkRequestInput): Promise<LinkRequest>;
  getLinkRequest(id: string): Promise<LinkRequest | undefined>;
  listLinkRequests(options?: ListLinkRequestsOptions): Promise<LinkRequest[]>;
  updateLinkRequest(
    id: string,
    update: UpdateLinkRequestInput
  ): Promise<LinkRequest | undefined>;
}

export class InMemoryLinkStore implements LinkStore {
  private readonly links = new Map<string, PaywallLink>();

  private readonly linkRequests = new Map<string, LinkRequest>();

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

  createLink(input: CreateLinkInput): Promise<PaywallLink> {
    const id = randomUUID();
    const usage =
      this.cloneUsage(input.usage) ?? {
        totalPaidCalls: 0,
        totalFreeCalls: 0,
        totalRevenueUsd: 0,
      };
    const record: PaywallLink = {
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
      webhookUrl: input.webhookUrl,
      webhookSecret: input.webhookSecret,
      webhookSecretPreview: input.webhookSecretPreview,
    };
    this.links.set(id, record);
    return Promise.resolve(record);
  }

  getLink(id: string): Promise<PaywallLink | undefined> {
    return Promise.resolve(this.links.get(id));
  }

  deleteLink(id: string): Promise<void> {
    this.links.delete(id);
    return Promise.resolve();
  }

  async listLinksByMerchant(merchantAddress: string): Promise<PaywallLink[]> {
    const results: PaywallLink[] = [];
    for (const link of this.links.values()) {
      if ((link.merchantAddress ?? '') === merchantAddress) {
        results.push(link);
      }
    }
    return results;
  }

  async countLinksByMerchant(merchantAddress: string): Promise<number> {
    let count = 0;
    for (const link of this.links.values()) {
      if ((link.merchantAddress ?? '') === merchantAddress) {
        count += 1;
      }
    }
    return count;
  }

  async findLinkByApiKeyHash(hash: string): Promise<PaywallLink | undefined> {
    for (const link of this.links.values()) {
      if (link.apiKeyHash && link.apiKeyHash === hash) {
        return link;
      }
    }
    return undefined;
  }

  async recordLinkUsage(id: string, update: UpdateLinkUsageInput): Promise<PaywallLink | undefined> {
    const existing = this.links.get(id);
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
    this.links.set(id, updated);
    return updated;
  }

  createLinkRequest(input: CreateLinkRequestInput): Promise<LinkRequest> {
    const id = randomUUID();
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
      webhookUrl: input.webhookUrl,
      webhookSecretPreview: input.webhookSecretPreview,
    };
    this.linkRequests.set(id, request);
    return Promise.resolve(request);
  }

  getLinkRequest(id: string): Promise<LinkRequest | undefined> {
    return Promise.resolve(this.linkRequests.get(id));
  }

  async listLinkRequests(options: ListLinkRequestsOptions = {}): Promise<LinkRequest[]> {
    const { status, limit } = options;
    let items = Array.from(this.linkRequests.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    if (status) {
      items = items.filter((item) => item.status === status);
    }

    if (typeof limit === 'number' && limit > 0) {
      items = items.slice(0, limit);
    }

    return items;
  }

  async updateLinkRequest(
    id: string,
    update: UpdateLinkRequestInput
  ): Promise<LinkRequest | undefined> {
    const existing = this.linkRequests.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: LinkRequest = {
      ...existing,
      merchantAddress: update.merchantAddress ?? existing.merchantAddress,
      contactEmail: update.contactEmail ?? existing.contactEmail,
      requestedBy: update.requestedBy ?? existing.requestedBy,
      priceUsd: update.priceUsd ?? existing.priceUsd,
      notes: update.notes ?? existing.notes,
      adminNotes: update.adminNotes ?? existing.adminNotes,
      status: update.status ?? existing.status,
      linkId: update.linkId ?? existing.linkId,
      updatedAt: new Date(),
      processedAt:
        update.processedAt
        ?? ((update.status ?? existing.status) !== 'pending'
          ? existing.processedAt ?? new Date()
          : existing.processedAt),
      tier: update.tier ?? existing.tier,
      tierLabel: update.tierLabel ?? existing.tierLabel,
      apiKeyHash: update.apiKeyHash ?? existing.apiKeyHash,
      apiKeyPreview: update.apiKeyPreview ?? existing.apiKeyPreview,
      dailyRequestCap: update.dailyRequestCap ?? existing.dailyRequestCap,
      maxActiveLinks: update.maxActiveLinks ?? existing.maxActiveLinks,
      webhookUrl: update.webhookUrl ?? existing.webhookUrl,
      webhookSecretPreview: update.webhookSecretPreview ?? existing.webhookSecretPreview,
    };

    this.linkRequests.set(id, updated);
    return updated;
  }
}

export function createLinkStore(): LinkStore {
  return new InMemoryLinkStore();
}
