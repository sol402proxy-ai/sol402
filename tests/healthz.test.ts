import { describe, expect, it } from 'vitest';
import { createApp } from '../src/server.js';

describe('GET /healthz', () => {
  it('responds with ok status', async () => {
    const app = createApp();
    const response = await app.request('http://localhost/healthz');
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({ status: 'ok' });
  });
});
