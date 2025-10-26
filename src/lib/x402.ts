import type { MiddlewareHandler } from 'hono';
import type { AppConfig } from '../config.js';
import type { HonoAppEnv } from '../app-context.js';
import type { PaywallLink, PaymentChallenge, PriceQuote } from '../types.js';

export interface PriceResolverArgs {
  link: PaywallLink;
  payer?: string;
  config: AppConfig;
}

export type PriceResolver = (args: PriceResolverArgs) => Promise<PriceQuote>;

export interface PaywallMiddlewareOptions {
  config: AppConfig;
  resolvePrice: PriceResolver;
}

export function createPaywallMiddleware(
  options: PaywallMiddlewareOptions
): MiddlewareHandler<HonoAppEnv> {
  const { config, resolvePrice } = options;

  return async (c, next) => {
    const link = c.get('link');

    if (!link) {
      return c.json(
        {
          error: 'link_not_loaded',
          message: 'Paywall middleware requires link context to be set.',
        },
        500
      );
    }

    const payer = c.req.header('x-payer') ?? undefined;
    const quote = await resolvePrice({ link, payer, config });

    c.set('priceQuote', quote);

    const paymentHeader = c.req.header('x-payment');

    if (quote.priceAtomic === 0n) {
      c.set('paymentReceipt', quote.freeQuotaUsed ? 'FREE-QUOTA' : 'NO-CHARGE');
      return next();
    }

    if (!paymentHeader) {
      const challenge: PaymentChallenge = {
        x402Version: 1,
        facilitatorUrl: config.facilitatorUrl,
        accepts: [
          {
            scheme: 'exact',
            network: config.network,
            asset: config.usdcMint,
            payTo: config.merchantAddress,
            maxAmountRequired: quote.priceAtomic.toString(),
            priceUsd: quote.priceUsd,
            reason: quote.reason,
            discountApplied: quote.discountApplied,
            freeQuotaUsed: quote.freeQuotaUsed,
          },
        ],
      };
      c.header('X-Payment-Required', 'true');
      c.set('paymentRequired', true);
      c.set('paymentChallenge', challenge);
      c.status(402);
      return next();
    }

    c.set('paymentReceipt', paymentHeader);
    return next();
  };
}
