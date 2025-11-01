import type { Logger } from './logger.js';

export class WebhookMetricsDisabledError extends Error {
  constructor() {
    super('Webhook metrics service is not configured.');
    this.name = 'WebhookMetricsDisabledError';
  }
}

export interface WebhookMetricsConfig {
  url?: string;
  authHeader?: string;
  database?: string;
  table?: string;
}

export interface WebhookMetricsOptions {
  fetchFn?: typeof fetch;
  logger?: Logger;
  cacheTtlMs?: number;
}

interface SummaryRow {
  success24h?: number;
  failure24h?: number;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
}

interface DeliveryRow {
  occurredAt: string;
  name: string;
  linkId: string | null;
  webhookUrl: string | null;
  attempts?: number | null;
  responseStatus?: number | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
}

export interface WebhookSummary {
  success24h: number;
  failure24h: number;
  failureRate24h: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
}

export interface WebhookDeliveryEntry {
  occurredAt: string;
  status: 'success' | 'failure';
  linkId: string | null;
  webhookUrl: string | null;
  attempts: number | null;
  responseStatus: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
}

export interface WebhookMetricsSnapshot {
  summary: WebhookSummary;
  recentDeliveries: WebhookDeliveryEntry[];
  generatedAt: string;
}

interface CacheEntry {
  value: WebhookMetricsSnapshot;
  expiresAt: number;
}

type FetchFn = typeof fetch;

export class WebhookMetricsService {
  private readonly cache = new Map<string, CacheEntry>();

  private readonly fetchFn: FetchFn;

  private readonly logger?: Logger;

  private readonly cacheTtlMs: number;

  private readonly tableIdentifier?: string;

  constructor(
    private readonly config: WebhookMetricsConfig,
    options: WebhookMetricsOptions = {}
  ) {
    const baseFetch = options.fetchFn ?? fetch;
    this.fetchFn = ((...args: Parameters<typeof fetch>) =>
      baseFetch.apply(globalThis, args)) as typeof fetch;
    this.logger = options.logger;
    this.cacheTtlMs = options.cacheTtlMs ?? 60_000;
    if (config.table && config.table.length > 0) {
      this.tableIdentifier =
        config.database && config.database.length > 0
          ? `${config.database}.${config.table}`
          : config.table;
    }
  }

  async getWebhookMetrics(wallet: string): Promise<WebhookMetricsSnapshot> {
    const now = Date.now();
    const cached = this.cache.get(wallet);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const [summaryRows, deliveryRows] = await Promise.all([
      this.query<SummaryRow>(this.buildSummaryQuery(), { wallet }),
      this.query<DeliveryRow>(this.buildDeliveryQuery(), { wallet }),
    ]);

    const summary = this.normalizeSummary(summaryRows[0]);
    const deliveries = deliveryRows.map((row) => this.normalizeDelivery(row));

    const snapshot: WebhookMetricsSnapshot = {
      summary,
      recentDeliveries: deliveries,
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(wallet, {
      value: snapshot,
      expiresAt: now + this.cacheTtlMs,
    });

    return snapshot;
  }

  private normalizeSummary(row?: SummaryRow): WebhookSummary {
    const success24h = numberOrZero(row?.success24h);
    const failure24h = numberOrZero(row?.failure24h);
    const total24h = success24h + failure24h;
    const failureRate24h = total24h > 0 ? failure24h / total24h : 0;

    return {
      success24h,
      failure24h,
      failureRate24h,
      lastSuccessAt: row?.lastSuccessAt ?? null,
      lastFailureAt: row?.lastFailureAt ?? null,
    };
  }

  private normalizeDelivery(row: DeliveryRow): WebhookDeliveryEntry {
    const status = row.name === 'webhook_delivery_failure' ? 'failure' : 'success';
    return {
      occurredAt: row.occurredAt,
      status,
      linkId: row.linkId,
      webhookUrl: row.webhookUrl,
      attempts: numberOrNull(row.attempts),
      responseStatus: numberOrNull(row.responseStatus),
      latencyMs: numberOrNull(row.latencyMs),
      errorMessage: stringOrNull(row.errorMessage),
    };
  }

  private buildSummaryQuery(): string {
    return `
      SELECT
        countIf(name = 'webhook_delivery_success' AND occurredAt >= now() - INTERVAL 1 DAY) AS success24h,
        countIf(name = 'webhook_delivery_failure' AND occurredAt >= now() - INTERVAL 1 DAY) AS failure24h,
        maxIf(occurredAt, name = 'webhook_delivery_success') AS lastSuccessAt,
        maxIf(occurredAt, name = 'webhook_delivery_failure') AS lastFailureAt
      FROM ${this.tableIdentifier}
      WHERE JSONExtractString(toJSONString(props), 'merchantAddress') = {wallet:String}
        AND name IN ('webhook_delivery_success', 'webhook_delivery_failure')
      FORMAT JSON
    `;
  }

  private buildDeliveryQuery(): string {
    return `
      SELECT
        occurredAt,
        name,
        JSONExtractString(toJSONString(props), 'linkId') AS linkId,
        JSONExtractString(toJSONString(props), 'webhookUrl') AS webhookUrl,
        JSONExtractInt(toJSONString(props), 'attempt') AS attempts,
        JSONExtractInt(toJSONString(props), 'responseStatus') AS responseStatus,
        JSONExtractInt(toJSONString(props), 'latencyMs') AS latencyMs,
        JSONExtractString(toJSONString(props), 'errorMessage') AS errorMessage
      FROM ${this.tableIdentifier}
      WHERE JSONExtractString(toJSONString(props), 'merchantAddress') = {wallet:String}
        AND name IN ('webhook_delivery_success', 'webhook_delivery_failure')
      ORDER BY occurredAt DESC
      LIMIT 25
      FORMAT JSON
    `;
  }

  private async query<T>(
    sql: string,
    params: Record<string, string | number | boolean> = {}
  ): Promise<T[]> {
    if (!this.config.url || !this.tableIdentifier) {
      throw new WebhookMetricsDisabledError();
    }

    const url = new URL(this.config.url);
    url.searchParams.set('default_format', 'JSON');
    url.searchParams.set('query', sql);
    if (this.config.database && this.config.database.length > 0) {
      url.searchParams.set('database', this.config.database);
    }
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(`param_${key}`, String(value));
    }

    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    if (this.config.authHeader) {
      headers.authorization = this.config.authHeader;
    }

    const response = await this.fetchFn(url.toString(), {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const errorText = await safeReadText(response);
      this.logger?.warn?.('webhook_metrics_query_failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Webhook metrics query failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { data?: T[] };
    return payload.data ?? [];
  }
}

function numberOrZero(value: unknown): number {
  if (typeof value === 'number') {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return 0;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
