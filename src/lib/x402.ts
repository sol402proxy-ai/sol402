import type { MiddlewareHandler } from 'hono';
import type { AppConfig } from '../config.js';
import type { HonoAppEnv } from '../app-context.js';
import type { PaywallLink, PriceQuote } from '../types.js';
import { PayAiSolanaPayments, type PaymentRequirements } from './payments.js';

export interface PriceResolverArgs {
  link: PaywallLink;
  payer?: string;
  config: AppConfig;
}

export type PriceResolver = (args: PriceResolverArgs) => Promise<PriceQuote>;

export interface PaywallMiddlewareOptions {
  config: AppConfig;
  resolvePrice: PriceResolver;
  payments: PayAiSolanaPayments;
}

export function createPaywallMiddleware(
  options: PaywallMiddlewareOptions
): MiddlewareHandler<HonoAppEnv> {
  const { config, resolvePrice, payments } = options;

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
    const logger = c.get('logger');

    const paymentHeader = c.req.header('x-payment');

    if (quote.priceAtomic === 0n) {
      c.set('paymentReceipt', quote.freeQuotaUsed ? 'FREE-QUOTA' : 'NO-CHARGE');
      return next();
    }

    const requestUrl = c.req.url;
    let requirements: PaymentRequirements;
    try {
      requirements = await payments.createRequirements({
        requestUrl,
        quote,
      });
    } catch (error) {
      logger.error(
        'Failed to create payment requirements',
        {
          linkId: link.id,
          requestUrl,
        },
        error
      );
      return c.json(
        {
          error: 'payment_configuration_error',
          message: 'Unable to prepare payment requirements.',
        },
        500
      );
    }

    c.set('paymentRequirements', requirements);

    const challenge = payments.buildChallenge(requirements, quote);
    c.set('paymentChallenge', challenge);

    if (!paymentHeader) {
      c.header('X-Payment-Required', 'true');
      c.set('paymentRequired', true);
      return c.json(
        {
          error: 'payment_required',
          challenge,
        },
        402
      );
    }

    let verified = false;
    try {
      verified = await payments.verify(paymentHeader, requirements);
    } catch (error) {
      logger.error(
        'Payment verification failed',
        {
          linkId: link.id,
          requestUrl,
        },
        error
      );
      return c.json(
        {
          error: 'payment_verification_failed',
          challenge,
        },
        402
      );
    }

    if (!verified) {
      logger.warn('Payment invalid', {
        linkId: link.id,
        requestUrl,
      });
      c.header('X-Payment-Required', 'true');
      c.set('paymentRequired', true);
      return c.json(
        {
          error: 'payment_invalid',
          challenge,
        },
        402
      );
    }

    c.set('paymentReceipt', paymentHeader);

    await next();

    try {
      const settled = await payments.settle(paymentHeader, requirements);
      if (!settled) {
        logger.warn('Payment settlement failed', {
          linkId: link.id,
          requestUrl,
        });
      }
    } catch (error) {
      logger.error(
        'Payment settlement threw',
        {
          linkId: link.id,
          requestUrl,
        },
        error
      );
    }
  };
}
