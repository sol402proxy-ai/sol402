import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoAppEnv } from '../app-context.js';

const propsSchema = z.record(z.unknown());

const eventSchema = z.object({
  name: z.string().min(1, 'name is required'),
  path: z.string().min(1, 'path is required'),
  props: propsSchema.optional(),
  ts: z.number().int().nonnegative().optional(),
  referrer: z.string().optional(),
});

const analytics = new Hono<HonoAppEnv>();

analytics.post('/events', async (c) => {
  const logger = c.get('logger');
  const analyticsStore = c.get('analyticsStore');

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch (error) {
    logger.warn('Invalid analytics payload (non-JSON)');
    return c.json(
      {
        error: 'invalid_json',
      },
      400
    );
  }

  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) {
    logger.warn('Invalid analytics payload (schema)', {
      issues: parsed.error.issues,
    });
    return c.json(
      {
        error: 'invalid_payload',
      },
      400
    );
  }

  const { name, path, props, ts, referrer } = parsed.data;

  const issuedAt = typeof ts === 'number' ? new Date(ts) : new Date();
  const userAgent = c.req.header('user-agent') ?? undefined;
  const forwarded = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? undefined;
  const refererHeader = c.req.header('referer') ?? undefined;

  await analyticsStore.record({
    name,
    path,
    props,
    userAgent,
    ip: forwarded,
    referrer: referrer ?? refererHeader,
    occurredAt: issuedAt,
  });

  logger.debug('analytics_event_recorded', {
    name,
    path,
    ip: forwarded,
  });

  return c.json(
    {
      status: 'accepted',
    },
    202
  );
});

export default analytics;
