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
  const analyticsStore = c.get('analyticsStore');
  const webhookDispatcher = c.get('webhookDispatcher');
  const config = c.get('config');

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
    const now = new Date();
    const requestPath = new URL(c.req.url).pathname;
    const merchantAddress = link.merchantAddress ?? config.merchantAddress;
    const payer = c.req.header('x-payer') ?? undefined;

    const headers = filterResponseHeaders(upstream.headers);
    const response = new Response(upstream.body, {
      status: upstream.status,
      headers,
    });

    const receipt = c.get('paymentReceipt');
    if (receipt) {
      response.headers.set('X-PAYMENT-RESPONSE', receipt);
    }

    const isFreeCall = priceQuote
      ? Boolean(priceQuote.freeQuotaUsed) || !priceQuote.priceUsd || priceQuote.priceUsd <= 0
      : true;

    if (priceQuote) {
      const store = c.get('store');
      try {
        await store.recordLinkUsage(link.id, {
          paidCallsDelta: isFreeCall ? 0 : 1,
          freeCallsDelta: isFreeCall ? 1 : 0,
          revenueUsdDelta: isFreeCall ? 0 : priceQuote.priceUsd,
          lastPaymentAt: now,
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

      if (analyticsStore) {
        try {
          const referrerHeader = c.req.header('referer') ?? undefined;
          let referrerHost: string | undefined;
          if (referrerHeader) {
            try {
              const parsedReferrer = new URL(referrerHeader);
              referrerHost = parsedReferrer.host || parsedReferrer.hostname;
            } catch {
              referrerHost = undefined;
            }
          }
          const analyticsRecord = await analyticsStore.record({
            name: isFreeCall ? 'link_free_call' : 'link_paid_call',
            path: requestPath,
            props: {
              linkId: link.id,
              merchantAddress: link.merchantAddress ?? null,
              tierId: link.tier ?? null,
              tierLabel: link.tierLabel ?? null,
              reason: priceQuote.reason,
              priceUsd: priceQuote.priceUsd,
              discountApplied: priceQuote.discountApplied,
              freeQuotaUsed: priceQuote.freeQuotaUsed,
              origin: link.origin,
              requestId: link.requestId ?? null,
              referrer: referrerHeader ?? null,
              referrerHost: referrerHost ?? null,
              responseStatus: upstream.status,
            },
            userAgent: c.req.header('user-agent') ?? undefined,
            ip: c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? undefined,
            referrer: referrerHeader,
            occurredAt: now,
          });
          logger.debug('analytics_event_recorded', {
            recordId: analyticsRecord.id,
            name: analyticsRecord.name,
            path: analyticsRecord.path,
          });
        } catch (analyticsError) {
          logger.error(
            'Failed to record analytics event',
            {
              linkId: link.id,
            },
            analyticsError
          );
        }
      }
    }

    const durationMs = Date.now() - start;

    if (link.webhookUrl) {
      const receipt = c.get('paymentReceipt');
      await webhookDispatcher.dispatch({
        link,
        merchantAddress,
        requestPath,
        requestMethod: c.req.method ?? 'GET',
        payer,
        quote: priceQuote,
        receipt,
        isFree: isFreeCall,
        responseStatus: upstream.status,
        latencyMs: durationMs,
        occurredAt: now,
      });
    }

    logger.info('Proxied origin response', {
      linkId: link.id,
      origin: link.origin,
      status: upstream.status,
      durationMs,
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
