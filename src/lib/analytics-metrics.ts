import type { Logger } from './logger.js';

export class AnalyticsMetricsDisabledError extends Error {
  constructor() {
    super('Analytics metrics service is not configured.');
    this.name = 'AnalyticsMetricsDisabledError';
  }
}

export interface AnalyticsMetricsConfig {
  url?: string;
  authHeader?: string;
  database?: string;
  table?: string;
}

export interface AnalyticsMetricsOptions {
  fetchFn?: typeof fetch;
  logger?: Logger;
  cacheTtlMs?: number;
}

interface SummaryRow {
  paidCallsTotal?: number;
  paidCalls24h?: number;
  paidCallsToday?: number;
  freeCallsTotal?: number;
  freeCalls24h?: number;
  freeCallsToday?: number;
  revenueUsdTotal?: number;
  revenueUsd24h?: number;
  revenueUsdToday?: number;
  lastPaymentAt?: string | null;
}

interface TimeseriesRow {
  bucketDate: string;
  paidCalls?: number;
  freeCalls?: number;
  revenueUsd?: number;
}

interface LinkRow {
  linkId: string | null;
  paidCallsTotal?: number;
  paidCalls24h?: number;
  freeCallsTotal?: number;
  freeCalls24h?: number;
  revenueUsdTotal?: number;
  revenueUsd24h?: number;
  lastPaymentAt?: string | null;
}

interface ReferrerRow {
  referrerHost: string | null;
  paidCalls24h?: number;
}

interface ActivityRow {
  occurredAt: string;
  name: string;
  linkId: string | null;
  priceUsd?: number | null;
  reason?: string | null;
  referrerHost?: string | null;
  discountApplied?: number | null;
  freeQuotaUsed?: number | null;
}

export interface WalletSummaryMetrics {
  paidCallsTotal: number;
  paidCalls24h: number;
  paidCallsToday: number;
  freeCallsTotal: number;
  freeCalls24h: number;
  freeCallsToday: number;
  revenueUsdTotal: number;
  revenueUsd24h: number;
  revenueUsdToday: number;
  lastPaymentAt: string | null;
}

export interface TimeseriesPoint {
  date: string;
  paidCalls: number;
  freeCalls: number;
  revenueUsd: number;
}

export interface LinkMetrics {
  paidCallsTotal: number;
  paidCalls24h: number;
  freeCallsTotal: number;
  freeCalls24h: number;
  revenueUsdTotal: number;
  revenueUsd24h: number;
  lastPaymentAt: string | null;
}

export interface ReferrerStat {
  host: string;
  paidCalls24h: number;
}

export interface ActivityEntry {
  occurredAt: string;
  linkId: string | null;
  type: 'paid' | 'free';
  priceUsd: number | null;
  reason: string | null;
  referrerHost: string | null;
  discountApplied: boolean;
  freeQuotaUsed: boolean;
}

export interface WalletMetrics {
  summary: WalletSummaryMetrics;
  timeseries: TimeseriesPoint[];
  linkStats: Record<string, LinkMetrics>;
  topReferrers: ReferrerStat[];
  recentActivity: ActivityEntry[];
  generatedAt: string;
}

interface CacheEntry {
  expiresAt: number;
  value: WalletMetrics;
}

interface GlobalSummaryRow {
  requestsTotal?: number;
  paidCallsTotal?: number;
  freeCallsTotal?: number;
  revenueUsdTotal?: number;
  paidCalls24h?: number;
  freeCalls24h?: number;
  revenueUsd24h?: number;
  discountApplied24h?: number;
  freeQuotaUsed24h?: number;
}

export interface GlobalSummaryMetrics {
  requestsTotal: number;
  paidCallsTotal: number;
  freeCallsTotal: number;
  revenueUsdTotal: number;
  paidCalls24h: number;
  freeCalls24h: number;
  revenueUsd24h: number;
  discountApplied24h: number;
  freeQuotaUsed24h: number;
  generatedAt: string;
}

export class AnalyticsMetricsService {
  private readonly fetchFn: typeof fetch;

  private readonly logger?: Logger;

  private readonly cacheTtlMs: number;

  private readonly cache = new Map<string, CacheEntry>();

  private globalSummaryCache:
  | {
    expiresAt: number;
    value: GlobalSummaryMetrics;
  }
  | undefined;

  private readonly tableIdentifier?: string;

  constructor(
    private readonly config: AnalyticsMetricsConfig,
    options: AnalyticsMetricsOptions = {}
  ) {
    const baseFetch = options.fetchFn ?? fetch;
    this.fetchFn = ((...args: Parameters<typeof fetch>) =>
      baseFetch.apply(globalThis, args)) as typeof fetch;
    this.logger = options.logger;
    this.cacheTtlMs = options.cacheTtlMs ?? 60_000;

    if (this.config.table && this.config.table.length > 0) {
      this.tableIdentifier =
        this.config.database && this.config.database.length > 0
          ? `${this.config.database}.${this.config.table}`
          : this.config.table;
    }
  }

  async getWalletMetrics(wallet: string): Promise<WalletMetrics> {
    const cacheKey = wallet;
    const entry = this.cache.get(cacheKey);
    const now = Date.now();
    if (entry && entry.expiresAt > now) {
      return entry.value;
    }

    const metrics = await this.loadWalletMetrics(wallet);
    this.cache.set(cacheKey, {
      value: metrics,
      expiresAt: now + this.cacheTtlMs,
    });
    return metrics;
  }

  async getGlobalSummary(): Promise<GlobalSummaryMetrics> {
    if (!this.config.url || !this.tableIdentifier) {
      throw new AnalyticsMetricsDisabledError();
    }

    const now = Date.now();
    if (this.globalSummaryCache && this.globalSummaryCache.expiresAt > now) {
      return this.globalSummaryCache.value;
    }

    const [row] = await this.query<GlobalSummaryRow>(this.buildGlobalSummaryQuery());
    const summary = this.normalizeGlobalSummary(row);

    this.globalSummaryCache = {
      value: summary,
      expiresAt: now + this.cacheTtlMs,
    };

    return summary;
  }

  private async loadWalletMetrics(wallet: string): Promise<WalletMetrics> {
    if (!this.config.url || !this.tableIdentifier) {
      throw new AnalyticsMetricsDisabledError();
    }

    const [summaryRows, timeseriesRows, linkRows, referrerRows, activityRows] = await Promise.all([
      this.query<SummaryRow>(this.buildSummaryQuery(), { wallet }),
      this.query<TimeseriesRow>(this.buildTimeseriesQuery(), { wallet }),
      this.query<LinkRow>(this.buildLinkQuery(), { wallet }),
      this.query<ReferrerRow>(this.buildReferrerQuery(), { wallet }),
      this.query<ActivityRow>(this.buildActivityQuery(), { wallet }),
    ]);

    const summary = this.normalizeSummary(summaryRows[0]);
    const timeseries = timeseriesRows.map((row) => ({
      date: row.bucketDate,
      paidCalls: numberOrZero(row.paidCalls),
      freeCalls: numberOrZero(row.freeCalls),
      revenueUsd: numberOrZero(row.revenueUsd),
    }));
    const linkStats = this.normalizeLinkStats(linkRows);
    const topReferrers = referrerRows
      .map((row) => ({
        host: (row.referrerHost ?? '').trim() || 'direct',
        paidCalls24h: numberOrZero(row.paidCalls24h),
      }))
      .filter((row) => row.paidCalls24h > 0);
    const recentActivity = activityRows.map<ActivityEntry>((row) => ({
      occurredAt: row.occurredAt,
      linkId: row.linkId,
      type: row.name === 'link_paid_call' ? 'paid' : 'free',
      priceUsd: row.priceUsd ?? null,
      reason: row.reason ?? null,
      referrerHost: row.referrerHost ?? null,
      discountApplied: booleanFromNumber(row.discountApplied),
      freeQuotaUsed: booleanFromNumber(row.freeQuotaUsed),
    }));

    return {
      summary,
      timeseries,
      linkStats,
      topReferrers,
      recentActivity,
      generatedAt: new Date().toISOString(),
    };
  }

  private normalizeSummary(row?: SummaryRow): WalletSummaryMetrics {
    return {
      paidCallsTotal: numberOrZero(row?.paidCallsTotal),
      paidCalls24h: numberOrZero(row?.paidCalls24h),
      paidCallsToday: numberOrZero(row?.paidCallsToday),
      freeCallsTotal: numberOrZero(row?.freeCallsTotal),
      freeCalls24h: numberOrZero(row?.freeCalls24h),
      freeCallsToday: numberOrZero(row?.freeCallsToday),
      revenueUsdTotal: numberOrZero(row?.revenueUsdTotal, true),
      revenueUsd24h: numberOrZero(row?.revenueUsd24h, true),
      revenueUsdToday: numberOrZero(row?.revenueUsdToday, true),
      lastPaymentAt: row?.lastPaymentAt ?? null,
    };
  }

  private normalizeLinkStats(rows: LinkRow[]): Record<string, LinkMetrics> {
    const result: Record<string, LinkMetrics> = {};
    for (const row of rows) {
      const linkId = row.linkId;
      if (!linkId) {
        continue;
      }
      result[linkId] = {
        paidCallsTotal: numberOrZero(row.paidCallsTotal),
        paidCalls24h: numberOrZero(row.paidCalls24h),
        freeCallsTotal: numberOrZero(row.freeCallsTotal),
        freeCalls24h: numberOrZero(row.freeCalls24h),
        revenueUsdTotal: numberOrZero(row.revenueUsdTotal, true),
        revenueUsd24h: numberOrZero(row.revenueUsd24h, true),
        lastPaymentAt: row.lastPaymentAt ?? null,
      };
    }
    return result;
  }

  private normalizeGlobalSummary(row?: GlobalSummaryRow): GlobalSummaryMetrics {
    return {
      requestsTotal: numberOrZero(row?.requestsTotal),
      paidCallsTotal: numberOrZero(row?.paidCallsTotal),
      freeCallsTotal: numberOrZero(row?.freeCallsTotal),
      revenueUsdTotal: numberOrZero(row?.revenueUsdTotal, true),
      paidCalls24h: numberOrZero(row?.paidCalls24h),
      freeCalls24h: numberOrZero(row?.freeCalls24h),
      revenueUsd24h: numberOrZero(row?.revenueUsd24h, true),
      discountApplied24h: numberOrZero(row?.discountApplied24h),
      freeQuotaUsed24h: numberOrZero(row?.freeQuotaUsed24h),
      generatedAt: new Date().toISOString(),
    };
  }

  private buildSummaryQuery(): string {
    return `
      SELECT
        countIf(name = 'link_paid_call') AS paidCallsTotal,
        countIf(name = 'link_paid_call' AND occurredAt >= now() - INTERVAL 1 DAY) AS paidCalls24h,
        countIf(name = 'link_paid_call' AND toDate(occurredAt) = toDate(now())) AS paidCallsToday,
        countIf(name = 'link_free_call') AS freeCallsTotal,
        countIf(name = 'link_free_call' AND occurredAt >= now() - INTERVAL 1 DAY) AS freeCalls24h,
        countIf(name = 'link_free_call' AND toDate(occurredAt) = toDate(now())) AS freeCallsToday,
        sumIf(JSONExtractFloat(toJSONString(props), 'priceUsd'), name = 'link_paid_call') AS revenueUsdTotal,
        sumIf(
          JSONExtractFloat(toJSONString(props), 'priceUsd'),
          name = 'link_paid_call' AND occurredAt >= now() - INTERVAL 1 DAY
        ) AS revenueUsd24h,
        sumIf(
          JSONExtractFloat(toJSONString(props), 'priceUsd'),
          name = 'link_paid_call' AND toDate(occurredAt) = toDate(now())
        ) AS revenueUsdToday,
        max(occurredAt) AS lastPaymentAt
      FROM ${this.tableIdentifier}
      WHERE JSONExtractString(toJSONString(props), 'merchantAddress') = {wallet:String}
        AND name IN ('link_paid_call', 'link_free_call')
      FORMAT JSON
    `;
  }

  private buildGlobalSummaryQuery(): string {
    return `
      SELECT
        countIf(name IN ('link_paid_call', 'link_free_call')) AS requestsTotal,
        countIf(name = 'link_paid_call') AS paidCallsTotal,
        countIf(name = 'link_free_call') AS freeCallsTotal,
        sumIf(JSONExtractFloat(toJSONString(props), 'priceUsd'), name = 'link_paid_call') AS revenueUsdTotal,
        countIf(name = 'link_paid_call' AND occurredAt >= now() - INTERVAL 1 DAY) AS paidCalls24h,
        countIf(name = 'link_free_call' AND occurredAt >= now() - INTERVAL 1 DAY) AS freeCalls24h,
        sumIf(
          JSONExtractFloat(toJSONString(props), 'priceUsd'),
          name = 'link_paid_call' AND occurredAt >= now() - INTERVAL 1 DAY
        ) AS revenueUsd24h,
        countIf(
          name = 'link_paid_call'
            AND occurredAt >= now() - INTERVAL 1 DAY
            AND JSONExtractBool(toJSONString(props), 'discountApplied')
        ) AS discountApplied24h,
        countIf(
          name = 'link_free_call'
            AND occurredAt >= now() - INTERVAL 1 DAY
            AND JSONExtractBool(toJSONString(props), 'freeQuotaUsed')
        ) AS freeQuotaUsed24h
      FROM ${this.tableIdentifier}
      WHERE name IN ('link_paid_call', 'link_free_call')
      FORMAT JSON
    `;
  }

  private buildTimeseriesQuery(): string {
    return `
      SELECT
        toDate(occurredAt) AS bucketDate,
        countIf(name = 'link_paid_call') AS paidCalls,
        countIf(name = 'link_free_call') AS freeCalls,
        sumIf(JSONExtractFloat(toJSONString(props), 'priceUsd'), name = 'link_paid_call') AS revenueUsd
      FROM ${this.tableIdentifier}
      WHERE JSONExtractString(toJSONString(props), 'merchantAddress') = {wallet:String}
        AND name IN ('link_paid_call', 'link_free_call')
        AND occurredAt >= now() - INTERVAL 7 DAY
      GROUP BY bucketDate
      ORDER BY bucketDate ASC
      FORMAT JSON
    `;
  }

  private buildLinkQuery(): string {
    return `
      SELECT
        JSONExtractString(toJSONString(props), 'linkId') AS linkId,
        countIf(name = 'link_paid_call') AS paidCallsTotal,
        countIf(name = 'link_paid_call' AND occurredAt >= now() - INTERVAL 1 DAY) AS paidCalls24h,
        countIf(name = 'link_free_call') AS freeCallsTotal,
        countIf(name = 'link_free_call' AND occurredAt >= now() - INTERVAL 1 DAY) AS freeCalls24h,
        sumIf(JSONExtractFloat(toJSONString(props), 'priceUsd'), name = 'link_paid_call') AS revenueUsdTotal,
        sumIf(
          JSONExtractFloat(toJSONString(props), 'priceUsd'),
          name = 'link_paid_call' AND occurredAt >= now() - INTERVAL 1 DAY
        ) AS revenueUsd24h,
        max(occurredAt) AS lastPaymentAt
      FROM ${this.tableIdentifier}
      WHERE JSONExtractString(toJSONString(props), 'merchantAddress') = {wallet:String}
        AND name IN ('link_paid_call', 'link_free_call')
      GROUP BY linkId
      ORDER BY paidCalls24h DESC, paidCallsTotal DESC
      FORMAT JSON
    `;
  }

  private buildReferrerQuery(): string {
    return `
      SELECT
        JSONExtractString(toJSONString(props), 'referrerHost') AS referrerHost,
        count() AS paidCalls24h
      FROM ${this.tableIdentifier}
      WHERE JSONExtractString(toJSONString(props), 'merchantAddress') = {wallet:String}
        AND name = 'link_paid_call'
        AND occurredAt >= now() - INTERVAL 1 DAY
        AND length(JSONExtractString(toJSONString(props), 'referrerHost')) > 0
      GROUP BY referrerHost
      ORDER BY paidCalls24h DESC
      LIMIT 5
      FORMAT JSON
    `;
  }

  private buildActivityQuery(): string {
    return `
      SELECT
        occurredAt,
        name,
        JSONExtractString(toJSONString(props), 'linkId') AS linkId,
        JSONExtractFloat(toJSONString(props), 'priceUsd') AS priceUsd,
        JSONExtractString(toJSONString(props), 'reason') AS reason,
        JSONExtractString(toJSONString(props), 'referrerHost') AS referrerHost,
        JSONExtractBool(toJSONString(props), 'discountApplied') AS discountApplied,
        JSONExtractBool(toJSONString(props), 'freeQuotaUsed') AS freeQuotaUsed
      FROM ${this.tableIdentifier}
      WHERE JSONExtractString(toJSONString(props), 'merchantAddress') = {wallet:String}
        AND name IN ('link_paid_call', 'link_free_call')
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
      throw new AnalyticsMetricsDisabledError();
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
      this.logger?.warn?.('analytics_metrics_query_failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Analytics query failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { data?: T[] };
    return payload.data ?? [];
  }
}

function numberOrZero(value: unknown, allowFloat = false): number {
  if (typeof value === 'number') {
    return allowFloat ? value : Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = allowFloat ? Number.parseFloat(value) : Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return allowFloat ? parsed : Math.trunc(parsed);
    }
  }
  return 0;
}

function booleanFromNumber(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true';
  }
  return false;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
