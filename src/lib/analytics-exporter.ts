import type { AnalyticsEventRecord } from './analytics-store.js';
import type { WorkersKVNamespace } from './store-workers.js';

export interface AnalyticsExporterOptions {
  prefix?: string;
  sinkUrl?: string;
  authHeaderValue?: string;
  batchSize?: number;
  fetchFn?: typeof fetch;
  now?: () => number;
  console?: Pick<typeof console, 'info' | 'warn'>;
  database?: string;
  table?: string;
}

interface ListedKey {
  name: string;
}

interface KVListResult {
  keys: ListedKey[];
  list_complete: boolean;
  cursor?: string;
}

export class AnalyticsExporter {
  private readonly kv: WorkersKVNamespace;

  private readonly prefix: string;

  private readonly sinkUrl?: string;

  private readonly authHeaderValue?: string;

  private readonly batchSize: number;

  private readonly fetchFn: typeof fetch;

  private readonly now: () => number;

  private readonly logger: Pick<typeof console, 'info' | 'warn'>;

  private readonly database?: string;

  private readonly table?: string;

  constructor(kv: WorkersKVNamespace, options: AnalyticsExporterOptions = {}) {
    this.kv = kv;
    this.prefix = options.prefix ?? 'analytics:';
    this.sinkUrl = options.sinkUrl;
    this.authHeaderValue = options.authHeaderValue;
    this.batchSize = options.batchSize ?? 50;
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
    this.now = options.now ?? Date.now;
    this.logger = options.console ?? console;
    this.database = options.database;
    this.table = options.table;
  }

  async exportAll(): Promise<number> {
    let cursor: string | undefined;
    let exported = 0;

    do {
      const page = await this.list(cursor);
      if (page.keys.length === 0) {
        cursor = page.cursor;
        continue;
      }

      const entries = await this.loadEvents(page.keys.map((key) => key.name));
      if (entries.length === 0) {
        cursor = page.cursor;
        continue;
      }

      const success = await this.deliver(entries);
      if (!success) {
        this.logger.warn('analytics_exporter delivery failed; keeping events in KV');
        return exported;
      }

      await Promise.all(entries.map((entry) => this.kv.delete(entry.id)));
      exported += entries.length;
      cursor = page.cursor;
    } while (cursor);

    return exported;
  }

  private async list(cursor?: string): Promise<KVListResult> {
    return this.kv.list({
      prefix: this.prefix,
      cursor,
      limit: this.batchSize,
    });
  }

  private async loadEvents(keys: string[]): Promise<AnalyticsEventRecord[]> {
    const results: AnalyticsEventRecord[] = [];

    for (const key of keys) {
      const raw = await this.kv.get(key);
      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw) as AnalyticsEventRecord & {
          occurredAt: string;
          receivedAt: string;
        };
        results.push({
          ...parsed,
          occurredAt: new Date(parsed.occurredAt),
          receivedAt: new Date(parsed.receivedAt),
          id: key,
        });
      } catch (error) {
        this.logger.warn('analytics_exporter failed to parse payload; dropping entry', {
          key,
        });
        await this.kv.delete(key);
      }
    }

    return results;
  }

  private async deliver(events: AnalyticsEventRecord[]): Promise<boolean> {
    if (!events.length) {
      return true;
    }

    if (!this.sinkUrl) {
      this.logger.info('analytics_exporter no sink configured; skipping delivery', {
        count: events.length,
      });
      return true;
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (this.authHeaderValue) {
      headers.authorization = this.authHeaderValue;
    }

    const exportedAtIso = new Date(this.now()).toISOString();

    let requestUrl = this.sinkUrl;
    let body: string;

    if (this.table) {
      const url = new URL(this.sinkUrl);
      const tableIdentifier =
        this.database && this.database.length > 0
          ? `${this.database}.${this.table}`
          : this.table;
      const query = `INSERT INTO ${tableIdentifier} FORMAT JSONEachRow`;
      url.searchParams.set('query', query);
      requestUrl = url.toString();
      body = events
        .map((event) =>
          JSON.stringify({
            id: event.id,
            name: event.name,
            path: event.path,
            props: event.props ?? {},
            userAgent: event.userAgent,
            ip: event.ip,
            referrer: event.referrer,
            occurredAt: event.occurredAt.toISOString(),
            receivedAt: event.receivedAt.toISOString(),
            exportedAt: exportedAtIso,
          })
        )
        .join('\n');
    } else {
      body = JSON.stringify({
        events: events.map((event) => ({
          id: event.id,
          name: event.name,
          path: event.path,
          props: event.props ?? {},
          userAgent: event.userAgent,
          ip: event.ip,
          referrer: event.referrer,
          occurredAt: event.occurredAt.toISOString(),
          receivedAt: event.receivedAt.toISOString(),
          exportedAt: exportedAtIso,
        })),
      });
    }

    try {
      const response = await this.fetchFn(requestUrl, {
        method: 'POST',
        headers,
        body,
        keepalive: true,
      });

      if (!response.ok) {
        this.logger.warn('analytics_exporter sink returned non-2xx', {
          status: response.status,
        });
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn('analytics_exporter failed to reach sink', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
