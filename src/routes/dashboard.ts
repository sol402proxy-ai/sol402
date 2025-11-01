import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { HonoAppEnv } from '../app-context.js';
import { hashApiKey, verifyApiKey } from '../lib/keys.js';
import type { LinkTierId, PaywallLink } from '../types.js';
import type { LinkMetrics } from '../lib/analytics-metrics.js';
import { buildTierTable, getTierProgress } from '../lib/tiers.js';

const sessionSchema = z.object({
  apiKey: z.string().trim().min(12, 'API key is required.'),
});

const tierOrder: Record<LinkTierId, number> = {
  baseline: 1,
  growth: 2,
  premium: 3,
};

function pickDominantTier(links: PaywallLink[]): { id: LinkTierId; label: string } | null {
  let selected: { id: LinkTierId; label?: string } | null = null;

  for (const link of links) {
    if (!link.tier) {
      continue;
    }
    if (!selected || tierOrder[link.tier] > tierOrder[selected.id]) {
      selected = { id: link.tier, label: link.tierLabel ?? undefined };
    }
  }

  if (!selected) {
    return null;
  }

  return {
    id: selected.id,
    label:
      selected.label
      ?? (selected.id === 'premium'
        ? 'Premium'
        : selected.id === 'growth'
          ? 'Growth'
          : 'Baseline'),
  };
}

function formatUsage(links: PaywallLink[]) {
  let totalPaidCalls = 0;
  let totalFreeCalls = 0;
  let totalRevenueUsd = 0;
  let lastPaymentAt: Date | undefined;

  for (const link of links) {
    if (!link.usage) {
      continue;
    }
    totalPaidCalls += link.usage.totalPaidCalls ?? 0;
    totalFreeCalls += link.usage.totalFreeCalls ?? 0;
    totalRevenueUsd += link.usage.totalRevenueUsd ?? 0;
    if (link.usage.lastPaymentAt) {
      if (!lastPaymentAt || link.usage.lastPaymentAt > lastPaymentAt) {
        lastPaymentAt = link.usage.lastPaymentAt;
      }
    }
  }

  return {
    totalPaidCalls,
    totalFreeCalls,
    totalRevenueUsd: Number(totalRevenueUsd.toFixed(6)),
    lastPaymentAt,
  };
}

function formatLink(link: PaywallLink, origin: string) {
  const usage = link.usage ?? {
    totalPaidCalls: 0,
    totalFreeCalls: 0,
    totalRevenueUsd: 0,
    lastPaymentAt: undefined,
  };

  return {
    id: link.id,
    origin: link.origin,
    linkUrl: `${origin}/p/${link.id}`,
    priceUsd: link.priceUsd ?? null,
    createdAt: link.createdAt.toISOString(),
    tier: link.tier ?? null,
    tierLabel: link.tierLabel ?? null,
    apiKeyPreview: link.apiKeyPreview ?? null,
    dailyRequestCap: link.dailyRequestCap ?? null,
    maxActiveLinks: link.maxActiveLinks ?? null,
    usage: {
      totalPaidCalls: usage.totalPaidCalls ?? 0,
      totalFreeCalls: usage.totalFreeCalls ?? 0,
      totalRevenueUsd: Number((usage.totalRevenueUsd ?? 0).toFixed(6)),
      lastPaymentAt: usage.lastPaymentAt ? usage.lastPaymentAt.toISOString() : null,
    },
  };
}

async function resolveScopedLinks(apiKey: string, c: Context<HonoAppEnv>) {
  const parsed = sessionSchema.safeParse({ apiKey });
  if (!parsed.success) {
    return {
      status: 400 as const,
      body: {
        error: 'validation_error' as const,
        details: parsed.error.flatten(),
      },
    };
  }

  const store = c.get('store');
  const hashed = await hashApiKey(parsed.data.apiKey);
  const link = await store.findLinkByApiKeyHash(hashed);

  if (!link || !link.apiKeyHash) {
    return {
      status: 403 as const,
      body: {
        error: 'invalid_credentials' as const,
        message: 'Invalid or expired API key.',
      },
    };
  }

  const isValid = await verifyApiKey(parsed.data.apiKey, link.apiKeyHash);
  if (!isValid) {
    return {
      status: 403 as const,
      body: {
        error: 'invalid_credentials' as const,
        message: 'Invalid or expired API key.',
      },
    };
  }

  if (!link.merchantAddress) {
    return {
      status: 409 as const,
      body: {
        error: 'missing_merchant' as const,
        message:
          'This link predates self-serve provisioning and is missing merchant metadata. Contact admin@sol402.app for assistance.',
      },
    };
  }

  const merchantLinks = await store.listLinksByMerchant(link.merchantAddress);
  const origin = new URL(c.req.url).origin;
  const dominantTier = pickDominantTier(merchantLinks);
  const usage = formatUsage(merchantLinks);
  const config = c.get('config');
  const tierDailyRequestCap = merchantLinks.reduce<number>(
    (max, current) => Math.max(max, current.dailyRequestCap ?? 0),
    0
  );
  const tierMaxActiveLinks = merchantLinks.reduce<number>(
    (max, current) => Math.max(max, current.maxActiveLinks ?? 0),
    0
  );

  const tierMeta =
    dominantTier
    ?? {
      id: 'baseline' as LinkTierId,
      label: 'Baseline',
    };

  const discountEligible = tierMeta.id === 'growth' || tierMeta.id === 'premium';
  const freeCallsEligible = true;

  return {
    status: 200 as const,
    body: {
      merchantAddress: link.merchantAddress,
      tier: {
        id: tierMeta.id,
        label: tierMeta.label,
        discountEligible,
        freeCallsEligible,
      },
      quotas: {
        freeCallsPerDay: config.freeCallsPerWalletPerDay,
        tierDailyRequestCap: tierDailyRequestCap > 0 ? tierDailyRequestCap : null,
        tierMaxActiveLinks: tierMaxActiveLinks > 0 ? tierMaxActiveLinks : null,
      },
      stats: {
        totalPaidCalls: usage.totalPaidCalls,
        totalFreeCalls: usage.totalFreeCalls,
        totalRevenueUsd: usage.totalRevenueUsd,
        lastPaymentAt: usage.lastPaymentAt ? usage.lastPaymentAt.toISOString() : null,
      },
      links: merchantLinks
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((item) => formatLink(item, origin)),
    },
  };
}

const dashboard = new Hono<HonoAppEnv>();

dashboard.post('/dashboard/session', async (c) => {
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json(
      {
        error: 'invalid_json',
        message: 'Request body must be valid JSON.',
      },
      400
    );
  }

  const parsed = sessionSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json(
      {
        error: 'validation_error',
        details: parsed.error.flatten(),
      },
      400
    );
  }

  const result = await resolveScopedLinks(parsed.data.apiKey, c);

  return c.json(result.body, result.status);
});

dashboard.get('/dashboard/links', async (c) => {
  const authHeader = c.req.header('authorization') ?? c.req.header('x-api-key');
  if (!authHeader) {
    return c.json(
      {
        error: 'missing_credentials',
        message: 'Provide your API key via Authorization: Bearer <key>.',
      },
      401
    );
  }

  let apiKey = authHeader;
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    apiKey = authHeader.slice(7).trim();
  }

  const result = await resolveScopedLinks(apiKey, c);
  if (result.status !== 200) {
    return c.json(result.body, result.status);
  }

  return c.json(
    {
      ...result.body,
    },
    200
  );
});

dashboard.get('/dashboard/metrics', async (c) => {
  const authHeader = c.req.header('authorization') ?? c.req.header('x-api-key');
  if (!authHeader) {
    return c.json(
      {
        error: 'missing_credentials',
        message: 'Provide your API key via Authorization: Bearer <key>.',
      },
      401
    );
  }

  let apiKey = authHeader;
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    apiKey = authHeader.slice(7).trim();
  }

  const metricsService = c.get('analyticsMetrics');
  if (!metricsService) {
    return c.json(
      {
        error: 'analytics_unavailable',
        message: 'Analytics sink is not configured for this deployment.',
      },
      503
    );
  }

  const result = await resolveScopedLinks(apiKey, c);
  if (result.status !== 200) {
    return c.json(result.body, result.status);
  }

  const { merchantAddress, links } = result.body;
  const logger = c.get('logger');
  const config = c.get('config');

  try {
    const metrics = await metricsService.getWalletMetrics(merchantAddress);
    const freeCallsDailyLimit = config.freeCallsPerWalletPerDay;
    const freeCallsRemaining = Math.max(
      freeCallsDailyLimit - metrics.summary.freeCallsToday,
      0
    );

    const zeroStats: LinkMetrics = {
      paidCallsTotal: 0,
      paidCalls24h: 0,
      freeCallsTotal: 0,
      freeCalls24h: 0,
      revenueUsdTotal: 0,
      revenueUsd24h: 0,
      lastPaymentAt: null,
    };

    const enrichedLinks = links.map((link) => {
      const stats = metrics.linkStats[link.id]
        ?? {
          ...zeroStats,
        };
      const usage = link.usage;
      let lastPaymentIso: string | null = null;
      const lastPaymentValue = usage?.lastPaymentAt as unknown;
      if (lastPaymentValue && typeof lastPaymentValue === 'object' && lastPaymentValue instanceof Date) {
        lastPaymentIso = lastPaymentValue.toISOString();
      } else if (typeof lastPaymentValue === 'string') {
        const parsed = new Date(lastPaymentValue);
        lastPaymentIso = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
      } else if (typeof lastPaymentValue === 'number') {
        const parsed = new Date(lastPaymentValue);
        lastPaymentIso = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
      }
      return {
        id: link.id,
        origin: link.origin,
        linkUrl: link.linkUrl,
        priceUsd: link.priceUsd ?? null,
        tier: link.tier ?? null,
        tierLabel: link.tierLabel ?? null,
        apiKeyPreview: link.apiKeyPreview ?? null,
        createdAt: link.createdAt,
        stats,
        usage: usage
          ? {
              totalPaidCalls: usage.totalPaidCalls ?? 0,
              totalFreeCalls: usage.totalFreeCalls ?? 0,
              totalRevenueUsd: Number((usage.totalRevenueUsd ?? 0).toFixed(6)),
              lastPaymentAt: lastPaymentIso,
            }
          : null,
      };
    });

    return c.json(
      {
        generatedAt: metrics.generatedAt,
        summary: {
          ...metrics.summary,
          freeCallsDailyLimit,
          freeCallsRemaining,
        },
        timeseries: metrics.timeseries,
        topReferrers: metrics.topReferrers,
        recentActivity: metrics.recentActivity,
        links: enrichedLinks,
      },
      200
    );
  } catch (error) {
    logger.error(
      'Failed to load analytics metrics',
      {
        merchantAddress,
      },
      error
    );
    return c.json(
      {
        error: 'analytics_error',
        message: 'Unable to load analytics metrics right now.',
      },
      502
    );
  }
});

dashboard.get('/dashboard/balance', async (c) => {
  const authHeader = c.req.header('authorization') ?? c.req.header('x-api-key');
  if (!authHeader) {
    return c.json(
      {
        error: 'missing_credentials',
        message: 'Provide your API key via Authorization: Bearer <key>.',
      },
      401
    );
  }

  let apiKey = authHeader;
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    apiKey = authHeader.slice(7).trim();
  }

  const tokenService = c.get('tokenService');
  if (!tokenService.supportsBalanceChecks()) {
    return c.json(
      {
        error: 'balance_unavailable',
        message: 'Token balance checks are not available in this environment.',
      },
      503
    );
  }

  const result = await resolveScopedLinks(apiKey, c);
  if (result.status !== 200) {
    return c.json(result.body, result.status);
  }

  const merchantAddress = result.body.merchantAddress;
  const forceFresh = (() => {
    const query = c.req.query('fresh');
    if (!query) return false;
    const normalized = query.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
  })();

  try {
    const details = await tokenService.getHolderBalanceDetails(merchantAddress, {
      fresh: forceFresh,
    });
    const config = c.get('config');
    const tiers = buildTierTable(config);
    const { currentTier, nextTier } = getTierProgress(details.balance, tiers);

    const deltaToNext = nextTier
      ? nextTier.minBalance > details.balance
        ? nextTier.minBalance - details.balance
        : 0n
      : null;

    return c.json(
      {
        wallet: merchantAddress,
        tokenMint: config.tokenMint,
        balance: {
          atomic: details.balance.toString(),
          decimals: details.decimals,
          uiAmount: details.uiAmount,
          uiAmountString: details.uiAmountString,
          refreshedAt: details.refreshedAt.toISOString(),
        },
        eligibility: {
          freeCalls: details.balance >= config.freeCallTokenThreshold,
          discount: details.balance >= config.tokenHolderThreshold,
          premium: details.balance >= config.premiumTokenThreshold,
        },
        currentTier: currentTier
          ? {
              id: currentTier.id,
              label: currentTier.label,
              minBalance: currentTier.minBalance.toString(),
              dailyRequestCap: currentTier.dailyRequestCap,
              maxActiveLinks: currentTier.maxActiveLinks,
            }
          : null,
        nextTier: nextTier
          ? {
              id: nextTier.id,
              label: nextTier.label,
              minBalance: nextTier.minBalance.toString(),
              delta: deltaToNext ? deltaToNext.toString() : '0',
            }
          : null,
        thresholds: {
          baseline: config.freeCallTokenThreshold.toString(),
          growth: config.tokenHolderThreshold.toString(),
          premium: config.premiumTokenThreshold.toString(),
        },
      },
      200
    );
  } catch (error) {
    c.get('logger').error(
      'Failed to fetch SOL402 balance for dashboard',
      {
        merchantAddress,
      },
      error
    );
    return c.json(
      {
        error: 'balance_check_failed',
        message: 'Unable to load SOL402 balance right now. Please try again shortly.',
      },
      503
    );
  }
});

dashboard.get('/dashboard/webhooks', async (c) => {
  const authHeader = c.req.header('authorization') ?? c.req.header('x-api-key');
  if (!authHeader) {
    return c.json(
      {
        error: 'missing_credentials',
        message: 'Provide your API key via Authorization: Bearer <key>.',
      },
      401
    );
  }

  let apiKey = authHeader;
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    apiKey = authHeader.slice(7).trim();
  }

  const result = await resolveScopedLinks(apiKey, c);
  if (result.status !== 200) {
    return c.json(result.body, result.status);
  }

  const webhookMetrics = c.get('webhookMetrics');
  if (!webhookMetrics) {
    return c.json(
      {
        featureAvailable: false,
        summary: null,
        recentDeliveries: [],
      },
      200
    );
  }

  const logger = c.get('logger');

  try {
    const metrics = await webhookMetrics.getWebhookMetrics(result.body.merchantAddress);
    const summary = metrics.summary;
    const failurePercent = Number.isFinite(summary.failureRate24h)
      ? Math.round(summary.failureRate24h * 1000) / 10
      : 0;

    return c.json(
      {
        featureAvailable: true,
        generatedAt: metrics.generatedAt,
        summary: {
          success24h: summary.success24h,
          failure24h: summary.failure24h,
          failureRate24h: summary.failureRate24h,
          failurePercent24h: failurePercent,
          lastSuccessAt: summary.lastSuccessAt,
          lastFailureAt: summary.lastFailureAt,
        },
        recentDeliveries: metrics.recentDeliveries.map((delivery) => ({
          occurredAt: delivery.occurredAt,
          status: delivery.status,
          linkId: delivery.linkId,
          webhookUrl: delivery.webhookUrl,
          attempts: delivery.attempts,
          responseStatus: delivery.responseStatus,
          latencyMs: delivery.latencyMs,
          errorMessage: delivery.errorMessage,
        })),
      },
      200
    );
  } catch (error) {
    logger.error(
      'Failed to load webhook metrics',
      {
        merchantAddress: result.body.merchantAddress,
      },
      error
    );
    return c.json(
      {
        error: 'webhook_metrics_unavailable',
        message: 'Unable to load webhook health right now.',
      },
      502
    );
  }
});

export default dashboard;
