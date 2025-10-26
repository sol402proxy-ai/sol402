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
import adminRoutes from './routes/admin.js';
import paywallRoutes from './routes/paywall.js';
import siteRoutes from './routes/site.js';
import { createAnalyticsStore, type AnalyticsStore } from './lib/analytics-store.js';
import analyticsRoutes from './routes/analytics.js';
import {
  HttpMetricsPublisher,
  type MetricsPublisher,
} from './lib/metrics-publisher.js';

export interface AssetProvider {
  getTextAsset(path: string): Promise<string | undefined>;
  getBinaryAsset(path: string): Promise<Uint8Array | undefined>;
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
  const paymentService = new PayAiSolanaPayments(config);

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
    await next();
  });

  app.get('/healthz', (c) =>
    c.json({
      status: 'ok',
    })
  );

  if (assetProvider) {
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
      return new Response(body, {
        status: 200,
        headers: {
          'content-type': 'image/png',
        },
      });
    });
  }

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

  app.route('/', siteRoutes);
  app.route('/admin', adminRoutes);
  app.route('/p', paywallRoutes);
  app.route('/analytics', analyticsRoutes);

  return app;
}
