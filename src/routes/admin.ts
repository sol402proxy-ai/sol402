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
import type { LinkRequest, PaywallLink } from '../types.js';

const solanaAddressSchema = z
  .string()
  .trim()
  .min(32, 'Invalid Solana address length.')
  .max(44, 'Invalid Solana address length.')
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana address characters.');

const optionalSolanaAddress = solanaAddressSchema.optional();
const optionalEmail = z.string().trim().email().max(160).optional();
const optionalNotes = z.string().trim().max(1000).optional();

const createLinkSchema = z.object({
  origin: z.string().url(),
  priceUsd: z.coerce.number().positive().optional(),
  merchantAddress: optionalSolanaAddress,
  contactEmail: optionalEmail,
  requester: z.string().trim().max(160).optional(),
  requestId: z.string().trim().uuid().optional(),
  notes: optionalNotes,
  adminNotes: optionalNotes,
});

const listStatusSchema = z.enum(['pending', 'approved', 'rejected']).optional();

function toLinkResponse(
  link: PaywallLink,
  defaults: { priceUsd: number; merchantAddress: string }
) {
  return {
    id: link.id,
    origin: link.origin,
    priceUsd: link.priceUsd ?? defaults.priceUsd,
    createdAt: link.createdAt.toISOString(),
    merchantAddress: link.merchantAddress ?? defaults.merchantAddress,
    contactEmail: link.contactEmail ?? null,
    requester: link.requester ?? null,
    requestId: link.requestId ?? null,
    notes: link.notes ?? null,
    adminNotes: link.adminNotes ?? null,
    tier: link.tier ?? null,
    tierLabel: link.tierLabel ?? null,
    apiKeyPreview: link.apiKeyPreview ?? null,
    dailyRequestCap: link.dailyRequestCap ?? null,
    maxActiveLinks: link.maxActiveLinks ?? null,
    usage: link.usage
      ? {
          totalPaidCalls: link.usage.totalPaidCalls,
          totalFreeCalls: link.usage.totalFreeCalls,
          totalRevenueUsd: link.usage.totalRevenueUsd,
          lastPaymentAt: link.usage.lastPaymentAt ? link.usage.lastPaymentAt.toISOString() : null,
        }
      : {
          totalPaidCalls: 0,
          totalFreeCalls: 0,
          totalRevenueUsd: 0,
          lastPaymentAt: null,
        },
  };
}

function toLinkRequestResponse(request: LinkRequest) {
  return {
    id: request.id,
    origin: request.origin,
    priceUsd: request.priceUsd ?? null,
    merchantAddress: request.merchantAddress,
    contactEmail: request.contactEmail ?? null,
    requestedBy: request.requestedBy ?? null,
    notes: request.notes ?? null,
    adminNotes: request.adminNotes ?? null,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    processedAt: request.processedAt ? request.processedAt.toISOString() : null,
    linkId: request.linkId ?? null,
    tier: request.tier ?? null,
    tierLabel: request.tierLabel ?? null,
    apiKeyPreview: request.apiKeyPreview ?? null,
    dailyRequestCap: request.dailyRequestCap ?? null,
    maxActiveLinks: request.maxActiveLinks ?? null,
  };
}

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

  const {
    origin,
    priceUsd,
    merchantAddress,
    contactEmail,
    requester,
    requestId,
    notes,
    adminNotes,
  } = parsed.data;

  // Ensure URL passes quick validation before persisting.
  assertSafeHttpUrl(origin);

  const store = c.get('store');
  const record = await store.createLink({
    origin,
    priceUsd,
    merchantAddress,
    contactEmail,
    requester,
    requestId,
    notes,
    adminNotes,
  });

  return c.json(
    {
      ...toLinkResponse(record, {
        priceUsd: c.get('config').defaultPriceUsd,
        merchantAddress: c.get('config').merchantAddress,
      }),
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
    ...toLinkResponse(link, {
      priceUsd: c.get('config').defaultPriceUsd,
      merchantAddress: c.get('config').merchantAddress,
    }),
  });
});

admin.get('/link-requests', async (c) => {
  const statusParam = c.req.query('status');
  let statusFilter: 'pending' | 'approved' | 'rejected' | undefined;
  if (statusParam) {
    const parsed = listStatusSchema.safeParse(statusParam);
    if (!parsed.success) {
      return c.json(
        {
          error: 'validation_error',
          details: parsed.error.flatten(),
        },
        400
      );
    }
    statusFilter = parsed.data;
  }

  const store = c.get('store');
  const requests = await store.listLinkRequests({
    status: statusFilter,
  });

  return c.json({
    requests: requests.map((request) => toLinkRequestResponse(request)),
  });
});

admin.get('/link-requests/:id', async (c) => {
  const id = c.req.param('id');
  const store = c.get('store');
  const request = await store.getLinkRequest(id);

  if (!request) {
    return c.json(
      {
        error: 'not_found',
        message: `Link request "${id}" does not exist.`,
      },
      404
    );
  }

  return c.json({
    ...toLinkRequestResponse(request),
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
