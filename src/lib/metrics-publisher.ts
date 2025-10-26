import type { Logger } from './logger.js';

export interface RpcMetricEvent {
  endpoint?: string;
  network?: string;
  payer?: string;
  attempt: number;
  durationMs: number;
  success: boolean;
  timestamp: number;
}

export interface MetricsPublisher {
  record(event: RpcMetricEvent): void;
}

export interface HttpMetricsPublisherOptions {
  sinkUrl: string;
  authHeaderValue?: string;
  fetchFn?: typeof fetch;
  logger?: Logger;
  serviceLabel?: string;
}

export class HttpMetricsPublisher implements MetricsPublisher {
  private readonly sinkUrl: string;

  private readonly authHeaderValue?: string;

  private readonly fetchFn: typeof fetch;

  private readonly logger?: Logger;

  private readonly serviceLabel: string;

  constructor(options: HttpMetricsPublisherOptions) {
    this.sinkUrl = options.sinkUrl;
    this.authHeaderValue = options.authHeaderValue;
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
    this.logger = options.logger;
    this.serviceLabel = options.serviceLabel ?? 'sol402-proxy';
  }

  record(event: RpcMetricEvent): void {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (this.authHeaderValue) {
      headers.authorization = this.authHeaderValue;
    }

    const timestampMs = Number.isFinite(event.timestamp) ? event.timestamp : Date.now();
    const timestampNs = BigInt(Math.floor(timestampMs)) * 1_000_000n;
    const logLine = JSON.stringify({
      type: 'rpc_metric',
      endpoint: event.endpoint,
      network: event.network,
      attempt: event.attempt,
      durationMs: event.durationMs,
      success: event.success,
      payer: event.payer,
      timestamp: timestampMs,
    });

    const payload = JSON.stringify({
      streams: [
        {
          stream: {
            service: this.serviceLabel,
            metric: 'rpc_latency',
            network: event.network ?? 'unknown',
            success: event.success ? 'true' : 'false',
          },
          values: [[timestampNs.toString(), logLine]],
        },
      ],
    });

    void this.fetchFn(this.sinkUrl, {
      method: 'POST',
      headers,
      body: payload,
      keepalive: true,
    }).catch((error: unknown) => {
      this.logger?.warn('Failed to publish RPC metric', {
        endpoint: event.endpoint,
        attempt: event.attempt,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
}
