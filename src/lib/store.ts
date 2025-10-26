import { randomUUID } from 'node:crypto';
import type { CreateLinkInput, PaywallLink } from '../types.js';

export interface LinkStore {
  createLink(input: CreateLinkInput): Promise<PaywallLink>;
  getLink(id: string): Promise<PaywallLink | undefined>;
  deleteLink(id: string): Promise<void>;
}

export class InMemoryLinkStore implements LinkStore {
  private readonly links = new Map<string, PaywallLink>();

  createLink(input: CreateLinkInput): Promise<PaywallLink> {
    const id = randomUUID();
    const record: PaywallLink = {
      id,
      origin: input.origin,
      priceUsd: input.priceUsd,
      createdAt: new Date(),
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
}

export function createLinkStore(): LinkStore {
  return new InMemoryLinkStore();
}
