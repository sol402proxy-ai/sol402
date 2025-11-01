import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoAppEnv } from '../app-context.js';
import { assertSafeHttpUrl } from '../lib/security.js';
import { generateApiKey } from '../lib/keys.js';
import { buildTierTable, resolveTier } from '../lib/tiers.js';

const solanaAddressSchema = z
  .string()
  .trim()
  .min(32, 'Invalid Solana address length.')
  .max(44, 'Invalid Solana address length.')
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana address characters.');

const createRequestSchema = z.object({
  origin: z.string().url(),
  priceUsd: z.coerce.number().positive().optional(),
  merchantAddress: solanaAddressSchema,
  contactEmail: z
    .string()
    .trim()
    .email()
    .max(160)
    .optional(),
  requestedBy: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().trim().min(8).max(256).optional(),
});

const linkRequests = new Hono<HonoAppEnv>();

linkRequests.post('/link/requests', async (c) => {
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

  const parsed = createRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return c.json(
      {
        error: 'validation_error',
        details: parsed.error.flatten(),
      },
      400
    );
  }

  const {
    origin,
    priceUsd,
    merchantAddress,
    contactEmail,
    requestedBy,
    notes,
    webhookUrl,
    webhookSecret,
  } = parsed.data;

  const config = c.get('config');

  try {
    assertSafeHttpUrl(origin);
  } catch (error) {
    return c.json(
      {
        error: 'invalid_origin',
        message: error instanceof Error ? error.message : 'Invalid origin URL supplied.',
      },
      400
    );
  }

  if (webhookUrl) {
    try {
      assertSafeHttpUrl(webhookUrl);
    } catch (error) {
      return c.json(
        {
          error: 'invalid_webhook_url',
          message: error instanceof Error ? error.message : 'Invalid webhook URL supplied.',
        },
        400
      );
    }
  }

  const rateLimiter = c.get('rateLimiter');
  const ipKey = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'anonymous';
  const allowed = rateLimiter.consume(`${ipKey}:link-request`, 1);
  if (!allowed) {
    return c.json(
      {
        error: 'rate_limited',
        message: 'Too many requests. Please try again later.',
      },
      429
    );
  }

  const store = c.get('store');
  const tokenService = c.get('tokenService');
  if (!tokenService.supportsBalanceChecks()) {
    return c.json(
      {
        error: 'balance_check_unavailable',
        message: 'Token balance checks are temporarily unavailable. Please retry shortly.',
      },
      503
    );
  }

  let balance: bigint;
  try {
    balance = await tokenService.getHolderBalance(merchantAddress);
  } catch (error) {
    c.get('logger').error(
      'Failed to fetch SOL402 balance for link request',
      {
        merchantAddress,
      },
      error
    );
    return c.json(
      {
        error: 'balance_check_failed',
        message: 'Unable to verify SOL402 holdings. Please retry in a few moments.',
      },
      503
    );
  }

  const tiers = buildTierTable(config);
  const tier = resolveTier(balance, tiers);

  if (!tier) {
    return c.json(
      {
        error: 'insufficient_tokens',
        message:
          'You need to hold at least 1M SOL402 to auto-provision links. Accumulate more tokens and try again.',
        requiredBalance: tiers[tiers.length - 1]?.minBalance.toString(),
        walletBalance: balance.toString(),
      },
      403
    );
  }

  const existingLinks = await store.countLinksByMerchant(merchantAddress);
  if (tier.maxActiveLinks > 0 && existingLinks >= tier.maxActiveLinks) {
    return c.json(
      {
        error: 'link_limit_reached',
        message: `You have reached the ${tier.maxActiveLinks} active link limit for the ${tier.label} tier.`,
        currentTier: tier.id,
        walletBalance: balance.toString(),
      },
      403
    );
  }

  const resolvedPrice =
    typeof priceUsd === 'number' ? Number(priceUsd.toFixed(config.priceDecimals)) : undefined;
  const normalizedPrice = resolvedPrice ?? config.defaultPriceUsd;

  const request = await store.createLinkRequest({
    origin,
    priceUsd: normalizedPrice,
    merchantAddress,
    contactEmail,
    requestedBy,
    notes,
    tier: tier.id,
    tierLabel: tier.label,
    dailyRequestCap: tier.dailyRequestCap,
    maxActiveLinks: tier.maxActiveLinks,
    webhookUrl,
  });

  const logger = c.get('logger');

  try {
    const { apiKey, hash: apiKeyHash, preview: apiKeyPreview } = await generateApiKey({
      prefix: 'sol402',
    });

    let resolvedWebhookSecret: string | undefined;
    let webhookSecretPreview: string | undefined;
    if (webhookUrl) {
      if (webhookSecret) {
        resolvedWebhookSecret = webhookSecret;
        webhookSecretPreview = webhookSecret
          .slice(0, Math.min(10, webhookSecret.length))
          .toUpperCase();
      } else {
        const generatedSecret = await generateApiKey({
          prefix: 'whsec',
          byteLength: 16,
        });
        resolvedWebhookSecret = generatedSecret.apiKey;
        webhookSecretPreview = generatedSecret.preview;
      }
    }

    const link = await store.createLink({
      origin,
      priceUsd: normalizedPrice,
      merchantAddress,
      contactEmail,
      requester: requestedBy,
      requestId: request.id,
      notes,
      tier: tier.id,
      tierLabel: tier.label,
      apiKeyHash,
      apiKeyPreview,
      dailyRequestCap: tier.dailyRequestCap,
      maxActiveLinks: tier.maxActiveLinks,
      webhookUrl,
      webhookSecret: resolvedWebhookSecret,
      webhookSecretPreview,
    });

    await store.updateLinkRequest(request.id, {
      status: 'approved',
      linkId: link.id,
      priceUsd: normalizedPrice,
      merchantAddress,
      contactEmail,
      requestedBy: requestedBy ?? undefined,
      notes,
      tier: tier.id,
      tierLabel: tier.label,
      apiKeyHash,
      apiKeyPreview,
      dailyRequestCap: tier.dailyRequestCap,
      maxActiveLinks: tier.maxActiveLinks,
      webhookUrl,
      webhookSecretPreview,
      processedAt: new Date(),
      adminNotes: 'Auto-provisioned via SOL402 self-serve flow.',
    });

    const requestUrl = new URL(c.req.url);
    const linkUrl = `${requestUrl.origin}/p/${link.id}`;

    logger.info('Link auto-provisioned', {
      requestId: request.id,
      linkId: link.id,
      merchantAddress,
      tier: tier.id,
      walletBalance: balance.toString(),
    });

    return c.json(
      {
        requestId: request.id,
        status: 'approved',
        linkId: link.id,
        linkUrl,
        apiKey,
        apiKeyPreview,
        tier: {
          id: tier.id,
          label: tier.label,
          minBalance: tier.minBalance.toString(),
          dailyRequestCap: tier.dailyRequestCap,
          maxActiveLinks: tier.maxActiveLinks,
        },
        priceUsd: normalizedPrice,
        walletBalance: balance.toString(),
        discountEligible: balance >= config.tokenHolderThreshold,
        freeCallsEligible: balance >= config.freeCallTokenThreshold,
        createdAt: request.createdAt.toISOString(),
        webhook: webhookUrl
          ? {
              url: webhookUrl,
              secret: resolvedWebhookSecret,
              secretPreview: webhookSecretPreview,
            }
          : null,
      },
      201
    );
  } catch (error) {
    logger.error(
      'Link auto-provisioning failed',
      {
        requestId: request.id,
        merchantAddress,
        tier: tier.id,
      },
      error
    );

    await store.updateLinkRequest(request.id, {
      status: 'rejected',
      adminNotes: 'Automatic provisioning failed. Manual follow-up required.',
    });

    return c.json(
      {
        error: 'provisioning_failed',
        message: 'We could not auto-provision your link. Please contact admin@sol402.app.',
      },
      500
    );
  }

});

linkRequests.get('/link/tiers/:wallet', async (c) => {
  const walletParam = c.req.param('wallet');
  const parsedWallet = solanaAddressSchema.safeParse(walletParam);
  if (!parsedWallet.success) {
    return c.json(
      {
        error: 'invalid_wallet',
        message: 'Merchant wallet must be a valid Solana public key.',
      },
      400
    );
  }

  const config = c.get('config');
  const tokenService = c.get('tokenService');

  if (!tokenService.supportsBalanceChecks()) {
    return c.json(
      {
        error: 'balance_check_unavailable',
        message: 'Token balance checks are temporarily unavailable. Please retry shortly.',
      },
      503
    );
  }

  let balance: bigint;
  try {
    balance = await tokenService.getHolderBalance(parsedWallet.data, { fresh: true });
  } catch (error) {
    c.get('logger').error(
      'Failed to fetch SOL402 balance during tier lookup',
      {
        merchantAddress: parsedWallet.data,
      },
      error
    );
    return c.json(
      {
        error: 'balance_check_failed',
        message: 'Unable to verify SOL402 holdings. Please retry in a few moments.',
      },
      503
    );
  }

  const tiers = buildTierTable(config);
  const tier = resolveTier(balance, tiers);

  return c.json({
    wallet: parsedWallet.data,
    balance: balance.toString(),
    eligible: Boolean(tier),
    tier: tier
      ? {
          id: tier.id,
          label: tier.label,
          minBalance: tier.minBalance.toString(),
          dailyRequestCap: tier.dailyRequestCap,
          maxActiveLinks: tier.maxActiveLinks,
        }
      : null,
    thresholds: {
      baseline: config.freeCallTokenThreshold.toString(),
      growth: config.tokenHolderThreshold.toString(),
      premium: config.premiumTokenThreshold.toString(),
    },
    discountEligible: balance >= config.tokenHolderThreshold,
    freeCallsEligible: balance >= config.freeCallTokenThreshold,
  });
});

export default linkRequests;
