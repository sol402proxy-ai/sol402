import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { HonoAppEnv } from '../app-context.js';
import { hashApiKey, verifyApiKey } from '../lib/keys.js';
import type { LinkTierId, PaywallLink } from '../types.js';

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

export default dashboard;
