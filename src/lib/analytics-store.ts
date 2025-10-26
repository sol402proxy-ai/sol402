export interface AnalyticsEventInput {
  name: string;
  path: string;
  props?: Record<string, unknown>;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  occurredAt: Date;
}

export interface AnalyticsEventRecord extends AnalyticsEventInput {
  id: string;
  receivedAt: Date;
}

export interface AnalyticsStore {
  record(event: AnalyticsEventInput): Promise<AnalyticsEventRecord>;
}

export class InMemoryAnalyticsStore implements AnalyticsStore {
  private readonly events: AnalyticsEventRecord[] = [];

  async record(event: AnalyticsEventInput): Promise<AnalyticsEventRecord> {
    const id = generateId();
    const record: AnalyticsEventRecord = {
      ...event,
      id,
      receivedAt: new Date(),
    };
    this.events.push(record);
    return record;
  }

  getEvents(): AnalyticsEventRecord[] {
    return [...this.events];
  }
}

export function createAnalyticsStore(): AnalyticsStore {
  return new InMemoryAnalyticsStore();
}

function generateId(): string {
  const globalCrypto = (globalThis as {
    crypto?: { randomUUID?: () => string; getRandomValues?: <T extends ArrayBufferView>(array: T) => T };
  }).crypto;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }
  if (globalCrypto?.getRandomValues) {
    const buffer = new Uint8Array(16);
    globalCrypto.getRandomValues(buffer);
    return Array.from(buffer, (value) => value.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('generateId requires crypto support');
}
