import { Connection } from '@solana/web3.js';
import { Hono } from 'hono';
import type { HonoAppEnv } from './app-context.js';
import { loadConfig, type AppConfig } from './config.js';
import { atomicToUsd, usdToAtomic } from './lib/pricing.js';
import { createLinkStore, type LinkStore } from './lib/store.js';
import { TokenBucketRateLimiter } from './lib/rate-limit.js';
import { type Logger, createLogger } from './lib/logger.js';
import { TokenPerksService } from './lib/token.js';
import { createPaywallMiddleware } from './lib/x402.js';
import { PayAiSolanaPayments } from './lib/payments.js';
import { AnalyticsMetricsService } from './lib/analytics-metrics.js';
import adminRoutes from './routes/admin.js';
import paywallRoutes from './routes/paywall.js';
import siteRoutes from './routes/site.js';
import linkRequestRoutes from './routes/link-requests.js';
import { createAnalyticsStore, type AnalyticsStore } from './lib/analytics-store.js';
import analyticsRoutes from './routes/analytics.js';
import {
  HttpMetricsPublisher,
  type MetricsPublisher,
} from './lib/metrics-publisher.js';
import dashboardRoutes from './routes/dashboard.js';

export interface AssetProvider {
  getTextAsset(path: string): Promise<string | undefined>;
  getBinaryAsset(path: string): Promise<ArrayBuffer | undefined>;
}

export interface CreateAppOptions {
  store?: LinkStore;
  config?: AppConfig;
  logger?: Logger;
  tokenService?: TokenPerksService;
  rateLimiter?: TokenBucketRateLimiter;
  connection?: Connection;
  assetProvider?: AssetProvider;
  analyticsStore?: AnalyticsStore;
  metricsPublisher?: MetricsPublisher;
  analyticsMetrics?: AnalyticsMetricsService;
}

export function createApp(options: CreateAppOptions = {}) {
  const config = options.config ?? loadConfig();
  const store = options.store ?? createLinkStore();
  const logger = options.logger ?? createLogger();
  const analyticsStore = options.analyticsStore ?? createAnalyticsStore();
  const metricsPublisher =
    options.metricsPublisher
    ?? (config.rpcMetricsUrl
      ? new HttpMetricsPublisher({
          sinkUrl: config.rpcMetricsUrl,
          authHeaderValue: config.rpcMetricsAuthHeader,
          fetchFn: fetch,
          logger,
          serviceLabel: 'sol402-proxy',
        })
      : undefined);
  const analyticsMetrics =
    options.analyticsMetrics
    ?? (config.analyticsSinkUrl && config.analyticsSinkTable
      ? new AnalyticsMetricsService(
        {
          url: config.analyticsSinkUrl,
          authHeader: config.analyticsSinkAuthHeader,
          database: config.analyticsSinkDatabase,
          table: config.analyticsSinkTable,
        },
        {
          fetchFn: fetch,
          logger,
        }
      )
      : undefined);

  const connection = options.connection
    ?? (config.solanaRpcUrl ? new Connection(config.solanaRpcUrl, 'confirmed') : undefined);

  const tokenService =
    options.tokenService ??
    new TokenPerksService(config, {
      connection,
      logger,
      metricsPublisher,
      rpcEndpoint: config.solanaRpcUrl,
    });
  const paymentService = new PayAiSolanaPayments(config, { logger });

  const rateLimiter =
    options.rateLimiter ??
    new TokenBucketRateLimiter({
      capacity: 60,
      refillRate: 60,
      refillIntervalMs: 60_000,
    });

  const assetProvider = options.assetProvider;

  const app = new Hono<HonoAppEnv>();

  app.use('*', async (c, next) => {
    c.set('store', store);
    c.set('config', config);
    c.set('logger', logger);
    c.set('tokenService', tokenService);
    c.set('rateLimiter', rateLimiter);
    c.set('analyticsStore', analyticsStore);
    if (analyticsMetrics) {
      c.set('analyticsMetrics', analyticsMetrics);
    }
    await next();
  });

  app.get('/healthz', (c) =>
    c.json({
      status: 'ok',
    })
  );

  if (assetProvider) {
    app.get('/assets/:asset{.+}', async (c) => {
      const assetParam = c.req.param('asset');
      const assetPath = `assets/${assetParam}`;
      const extension = assetParam.split('.').pop()?.toLowerCase();
      const textTypes: Record<string, string> = {
        js: 'application/javascript; charset=utf-8',
        css: 'text/css; charset=utf-8',
        json: 'application/json; charset=utf-8',
        txt: 'text/plain; charset=utf-8',
      };
      const contentType = (extension && textTypes[extension]) || undefined;
      if (contentType) {
        const body = await assetProvider.getTextAsset(assetPath);
        if (!body) {
          return c.notFound();
        }
        return c.text(body, 200, {
          'content-type': contentType,
        });
      }

      const binary = await assetProvider.getBinaryAsset(assetPath);
      if (!binary) {
        return c.notFound();
      }
      let binaryContentType = 'application/octet-stream';
      if (extension === 'png') {
        binaryContentType = 'image/png';
      } else if (extension === 'jpg' || extension === 'jpeg') {
        binaryContentType = 'image/jpeg';
      } else if (extension === 'svg') {
        binaryContentType = 'image/svg+xml';
      }
      const blob = new Blob([binary], { type: binaryContentType });
      return new Response(blob, {
        status: 200,
        headers: {
          'content-type': binaryContentType,
        },
      });
    });

    app.get('/robots.txt', async (c) => {
      const body = await assetProvider.getTextAsset('robots.txt');
      if (!body) {
        return c.notFound();
      }
      return c.text(body, 200, {
        'content-type': 'text/plain; charset=utf-8',
      });
    });

    app.get('/sitemap.xml', async (c) => {
      const body = await assetProvider.getTextAsset('sitemap.xml');
      if (!body) {
        return c.notFound();
      }
      return c.body(body, 200, {
        'content-type': 'application/xml; charset=utf-8',
      });
    });

    app.get('/og.png', async (c) => {
      const body = await assetProvider.getBinaryAsset('og.png');
      if (!body) {
        return c.notFound();
      }
      const blob = new Blob([body], { type: 'image/png' });
      return new Response(blob, {
        status: 200,
        headers: {
          'content-type': 'image/png',
        },
      });
    });
  }

  app.post('/demo/rpc', async (c) => {
    const config = c.get('config');
    const logger = c.get('logger');

    if (!config.solanaRpcUrl) {
      return c.json(
        {
          error: 'rpc_unconfigured',
          message: 'Solana RPC endpoint is not configured.',
        },
        503
      );
    }

    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json(
        {
          error: 'invalid_json',
          message: 'RPC payload must be valid JSON.',
        },
        400
      );
    }

    try {
      const upstream = await fetch(config.solanaRpcUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await upstream.text();
      const contentType = upstream.headers.get('content-type') ?? 'application/json';
      return new Response(responseText, {
        status: upstream.status,
        headers: {
          'content-type': contentType,
          'cache-control': 'no-store',
        },
      });
    } catch (error) {
      logger.error(
        'Demo RPC proxy request failed',
        {
          rpcUrl: config.solanaRpcUrl,
        },
        error
      );
      return c.json(
        {
          error: 'rpc_proxy_failure',
          message: 'Unable to reach the Solana RPC endpoint.',
        },
        502
      );
    }
  });

  // Load link context for paywalled routes.
  app.use('/p/:id', async (c, next) => {
    const linkId = c.req.param('id');
    const link = await store.getLink(linkId);

    if (!link) {
      return c.json(
        {
          error: 'not_found',
          message: `Link "${linkId}" not found.`,
        },
        404
      );
    }

    c.set('link', link);
    await next();
  });

  app.use('/p/:id', async (c, next) => {
    const payer = c.req.header('x-payer');
    const forwarded = c.req.header('x-forwarded-for');
    const connecting = c.req.header('cf-connecting-ip');
    const forwardedIp = forwarded?.split(',')[0]?.trim();
    const rateLimitKey =
      (payer && `payer:${payer}`) ||
      (forwardedIp && `ip:${forwardedIp}`) ||
      (connecting && `ip:${connecting}`) ||
      'ip:unknown';
    if (!rateLimiter.consume(rateLimitKey)) {
      return c.json(
        {
          error: 'rate_limited',
          message: 'Too many requests. Slow down and retry shortly.',
        },
        429
      );
    }
    await next();
  });

  const paywallMiddleware = createPaywallMiddleware({
    config,
    payments: paymentService,
    resolvePrice: async ({ link, payer, config: cfg }) => {
      const priceUsd = link.priceUsd ?? cfg.defaultPriceUsd;
      const baseAtomic = usdToAtomic(priceUsd, cfg.priceDecimals);
      const adjustment = await tokenService.adjustPrice({
        basePriceAtomic: baseAtomic,
        payer,
      });

      const finalAtomic = adjustment.priceAtomic;
      const baseReason = link.priceUsd ? 'link-override' : 'default-price';
      const reason =
        adjustment.reason === 'base-price' ? baseReason : adjustment.reason;

      return {
        priceAtomic: finalAtomic,
        priceUsd: atomicToUsd(finalAtomic, cfg.priceDecimals),
        reason,
        discountApplied: adjustment.discountApplied,
        freeQuotaUsed: adjustment.freeQuotaUsed,
      };
    },
  });

  app.use('/p/:id', paywallMiddleware);

  app.route('/', linkRequestRoutes);
  app.route('/', dashboardRoutes);
  app.route('/', siteRoutes);
  app.route('/admin', adminRoutes);
  app.route('/p', paywallRoutes);
  app.route('/analytics', analyticsRoutes);

  return app;
}
