import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { InMemoryAnalyticsStore } from '../src/lib/analytics-store.js';

describe('analytics events', () => {
  it('persists events posted from the client', async () => {
    const analyticsStore = new InMemoryAnalyticsStore();
    const app = createApp({ analyticsStore });

    const payload = {
      name: 'view_home',
      path: '/',
      props: { source: 'test' },
      ts: 1_700_000_000_000,
      referrer: 'https://ref.example',
    };

    const response = await app.request('http://localhost/analytics/events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': '203.0.113.1',
        'user-agent': 'vitest',
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(202);
    const events = analyticsStore.getEvents();
    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event.name).toBe('view_home');
    expect(event.path).toBe('/');
    expect(event.props).toEqual({ source: 'test' });
    expect(event.ip).toBe('203.0.113.1');
    expect(event.userAgent).toBe('vitest');
    expect(event.referrer).toBe('https://ref.example');
    expect(event.occurredAt.toISOString()).toBe(new Date(payload.ts).toISOString());
  });

  it('rejects invalid payloads', async () => {
    const analyticsStore = new InMemoryAnalyticsStore();
    const app = createApp({ analyticsStore });

    const response = await app.request('http://localhost/analytics/events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    expect(analyticsStore.getEvents()).toHaveLength(0);
  });
});
