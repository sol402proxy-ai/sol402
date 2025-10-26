import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoAppEnv } from '../app-context.js';
import { assertSafeHttpUrl } from '../lib/security.js';
import {
  DisallowedMimeTypeError,
  UnsafeOriginError,
  filterResponseHeaders,
  proxyFetch,
} from '../lib/proxy.js';

const createLinkSchema = z.object({
  origin: z.string().url(),
  priceUsd: z.coerce.number().positive().optional(),
});

const admin = new Hono<HonoAppEnv>();

admin.use('*', async (c, next) => {
  const adminKey = c.get('config').adminApiKey;
  const providedKey = c.req.header('x-admin-key');

  if (!providedKey || providedKey !== adminKey) {
    return c.json(
      {
        error: 'forbidden',
        message: 'Invalid admin credentials.',
      },
      403
    );
  }

  return next();
});

admin.post('/links', async (c) => {
  const payload: unknown = await c.req.json();
  const parsed = createLinkSchema.safeParse(payload);

  if (!parsed.success) {
    return c.json(
      {
        error: 'validation_error',
        details: parsed.error.flatten(),
      },
      400
    );
  }

  const { origin, priceUsd } = parsed.data;

  // Ensure URL passes quick validation before persisting.
  assertSafeHttpUrl(origin);

  const store = c.get('store');
  const record = await store.createLink({ origin, priceUsd });

  return c.json(
    {
      id: record.id,
      origin: record.origin,
      priceUsd: record.priceUsd ?? c.get('config').defaultPriceUsd,
      createdAt: record.createdAt.toISOString(),
    },
    201
  );
});

admin.get('/links/:id', async (c) => {
  const id = c.req.param('id');
  const store = c.get('store');
  const link = await store.getLink(id);

  if (!link) {
    return c.json(
      {
        error: 'not_found',
        message: `Link "${id}" does not exist.`,
      },
      404
    );
  }

  return c.json({
    id: link.id,
    origin: link.origin,
    priceUsd: link.priceUsd ?? c.get('config').defaultPriceUsd,
    createdAt: link.createdAt.toISOString(),
  });
});

admin.get('/links/:id/preview', async (c) => {
  const id = c.req.param('id');
  const store = c.get('store');
  const link = await store.getLink(id);

  if (!link) {
    return c.json(
      {
        error: 'not_found',
        message: `Link "${id}" does not exist.`,
      },
      404
    );
  }

  const logger = c.get('logger');

  try {
    const start = Date.now();
    const upstream = await proxyFetch(link.origin);
    const headers = filterResponseHeaders(upstream.headers);
    headers.set('x-sol402-preview', 'true');
    headers.set('cache-control', 'no-store, max-age=0');

    const response = new Response(upstream.body, {
      status: upstream.status,
      headers,
    });

    logger.info('Admin previewed link', {
      linkId: link.id,
      origin: link.origin,
      status: upstream.status,
      durationMs: Date.now() - start,
    });

    return response;
  } catch (error) {
    if (error instanceof UnsafeOriginError) {
      logger.warn('Blocked unsafe origin during preview', {
        linkId: link.id,
        origin: link.origin,
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
      logger.warn('Blocked disallowed mime type during preview', {
        linkId: link.id,
        origin: link.origin,
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
      'Unexpected preview error',
      {
        linkId: link.id,
        origin: link.origin,
      },
      error
    );
    throw error;
  }
});

export default admin;
