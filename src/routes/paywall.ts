import { Hono } from 'hono';
import type { HonoAppEnv } from '../app-context.js';
import {
  filterResponseHeaders,
  proxyFetch,
  UnsafeOriginError,
  DisallowedMimeTypeError,
} from '../lib/proxy.js';

const paywall = new Hono<HonoAppEnv>();

paywall.get('/:id', async (c) => {
  const link = c.get('link');
  const logger = c.get('logger');
  const priceQuote = c.get('priceQuote');

  if (!link) {
    return c.json(
      {
        error: 'not_found',
        message: 'Unable to resolve requested link.',
      },
      404
    );
  }

  if (c.get('paymentRequired')) {
    const challenge = c.get('paymentChallenge');
    if (!challenge || !priceQuote) {
      logger.error('Payment required but challenge or quote missing', {
        linkId: link.id,
      });
      return c.json(
        {
          error: 'payment_context_missing',
          message: 'Unable to load payment context. Please retry shortly.',
        },
        500
      );
    }

    logger.info('Payment required', {
      linkId: link.id,
      format: 'json',
      reason: priceQuote.reason,
    });

    c.header('X-Payment-Required', 'true');
    return c.json(
      {
        error: 'payment_required',
        challenge,
      },
      402
    );
  }

  try {
    const start = Date.now();
    const upstream = await proxyFetch(link.origin);

    const headers = filterResponseHeaders(upstream.headers);
    const response = new Response(upstream.body, {
      status: upstream.status,
      headers,
    });

    const receipt = c.get('paymentReceipt');
    if (receipt) {
      response.headers.set('X-PAYMENT-RESPONSE', receipt);
    }

    if (priceQuote) {
      const store = c.get('store');
      const isFree =
        Boolean(priceQuote.freeQuotaUsed) || !priceQuote.priceUsd || priceQuote.priceUsd <= 0;
      try {
        await store.recordLinkUsage(link.id, {
          paidCallsDelta: isFree ? 0 : 1,
          freeCallsDelta: isFree ? 1 : 0,
          revenueUsdDelta: isFree ? 0 : priceQuote.priceUsd,
          lastPaymentAt: new Date(),
        });
      } catch (usageError) {
        logger.error(
          'Failed to record link usage',
          {
            linkId: link.id,
            reason: priceQuote.reason,
          },
          usageError
        );
      }
    }

    logger.info('Proxied origin response', {
      linkId: link.id,
      origin: link.origin,
      status: upstream.status,
      durationMs: Date.now() - start,
      reason: priceQuote?.reason,
    });

    return response;
  } catch (error) {
    if (error instanceof UnsafeOriginError) {
      logger.warn('Blocked unsafe origin fetch', {
        linkId: link?.id,
        origin: link?.origin,
        message: error.message,
      });
      return c.json(
        {
          error: 'invalid_origin',
          message: error.message,
        },
        400
      );
    }
    if (error instanceof DisallowedMimeTypeError) {
      logger.warn('Blocked disallowed mime type', {
        linkId: link?.id,
        origin: link?.origin,
        message: error.message,
      });
      return c.json(
        {
          error: 'unsupported_media_type',
          message: error.message,
        },
        415
      );
    }
    logger.error(
      'Unexpected proxy error',
      {
        linkId: link?.id,
        origin: link?.origin,
      },
      error
    );
    throw error;
  }
});

export default paywall;
