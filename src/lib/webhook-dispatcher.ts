import type { AnalyticsStore } from './analytics-store.js';
import type { Logger } from './logger.js';
import type { PaywallLink, PriceQuote } from '../types.js';

export interface WebhookDispatcherOptions {
  fetchFn?: typeof fetch;
  logger?: Logger;
  analyticsStore?: AnalyticsStore;
  timeoutMs?: number;
  userAgent?: string;
}

export interface WebhookDispatchArgs {
  link: PaywallLink;
  merchantAddress: string;
  requestPath: string;
  requestMethod: string;
  payer?: string;
  quote?: PriceQuote;
  receipt?: string;
  isFree: boolean;
  responseStatus: number;
  latencyMs: number;
  occurredAt: Date;
  attempt?: number;
}

interface DispatchOutcome {
  ok: boolean;
  status?: number;
  latencyMs: number;
  attempt: number;
  errorMessage?: string;
}

const DEFAULT_TIMEOUT_MS = 5_000;

export class WebhookDispatcher {
  private readonly fetchFn: typeof fetch;

  private readonly logger?: Logger;

  private readonly analyticsStore?: AnalyticsStore;

  private readonly timeoutMs: number;

  private readonly userAgent: string;

  constructor(options: WebhookDispatcherOptions = {}) {
    this.fetchFn =
      options.fetchFn ??
      (((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
        fetch(input, init)) as typeof fetch);
    this.logger = options.logger;
    this.analyticsStore = options.analyticsStore;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = options.userAgent ?? 'sol402-proxy/1.0';
  }

  async dispatch(args: WebhookDispatchArgs): Promise<void> {
    const { link } = args;
    if (!link.webhookUrl) {
      return;
    }

    const attempt = typeof args.attempt === 'number' && args.attempt > 0 ? args.attempt : 1;

    const body = this.buildPayload(args);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let outcome: DispatchOutcome;

    try {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'user-agent': this.userAgent,
      };
      if (link.webhookSecret) {
        headers.authorization = `Bearer ${link.webhookSecret}`;
      }

      const startedAt = Date.now();
      const response = await this.fetchFn(link.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
        keepalive: true,
      });
      const latencyMs = Date.now() - startedAt;
      const ok = response.ok;
      let errorMessage: string | undefined;
      if (!ok) {
        errorMessage = await safeReadText(response);
        this.logger?.warn('webhook_delivery_failed', {
          linkId: link.id,
          webhookUrl: link.webhookUrl,
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
      }

      outcome = {
        ok,
        status: response.status,
        latencyMs,
        attempt,
        errorMessage,
      };
    } catch (error) {
      const latencyMs = this.timeoutMs;
      const message =
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'Request timed out'
            : error.message
          : String(error);
      this.logger?.error('webhook_delivery_error', {
        linkId: link.id,
        webhookUrl: link.webhookUrl,
      }, error instanceof Error ? error : undefined);
      outcome = {
        ok: false,
        latencyMs,
        attempt,
        errorMessage: message,
      };
    } finally {
      clearTimeout(timeoutId);
    }

    await this.recordAnalytics(args, outcome);
  }

  private buildPayload(args: WebhookDispatchArgs) {
    return {
      event: 'sol402.link.settled',
      occurredAt: args.occurredAt.toISOString(),
      link: {
        id: args.link.id,
        origin: args.link.origin,
        tier: args.link.tier ?? null,
        tierLabel: args.link.tierLabel ?? null,
        merchantAddress: args.merchantAddress,
        requestId: args.link.requestId ?? null,
      },
      pricing: args.quote
        ? {
            priceUsd: args.quote.priceUsd,
            reason: args.quote.reason,
            discountApplied: args.quote.discountApplied,
            freeQuotaUsed: args.quote.freeQuotaUsed,
            paid: !args.isFree,
          }
        : null,
      payment: {
        status: args.isFree ? 'free' : 'paid',
        receipt: args.isFree ? null : args.receipt ?? null,
        amountUsd: args.isFree ? 0 : args.quote?.priceUsd ?? 0,
      },
      request: {
        method: args.requestMethod,
        path: args.requestPath,
        payer: args.payer ?? null,
      },
      response: {
        status: args.responseStatus,
        latencyMs: args.latencyMs,
      },
      meta: {
        attempt: typeof args.attempt === 'number' ? args.attempt : 1,
      },
    };
  }

  private async recordAnalytics(args: WebhookDispatchArgs, outcome: DispatchOutcome) {
    if (!this.analyticsStore) {
      return;
    }

    const eventName = outcome.ok ? 'webhook_delivery_success' : 'webhook_delivery_failure';
    const attempt = outcome.attempt;
    const occurredAt = args.occurredAt;

    try {
      await this.analyticsStore.record({
        name: eventName,
        path: args.requestPath,
        props: {
          linkId: args.link.id,
          merchantAddress: args.merchantAddress,
          webhookUrl: args.link.webhookUrl ?? null,
          responseStatus: outcome.status ?? null,
          latencyMs: outcome.latencyMs,
          attempt,
          errorMessage: outcome.errorMessage ?? null,
          tierId: args.link.tier ?? null,
          requestId: args.link.requestId ?? null,
          paid: !args.isFree,
          priceUsd: args.quote?.priceUsd ?? null,
        },
        userAgent: this.userAgent,
        occurredAt,
      });
    } catch (error) {
      this.logger?.error(
        'webhook_analytics_record_failed',
        {
          linkId: args.link.id,
        },
        error instanceof Error ? error : undefined
      );
    }
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (text.length > 500) {
      return `${text.slice(0, 500)}…`;
    }
    return text;
  } catch {
    return '';
  }
}
