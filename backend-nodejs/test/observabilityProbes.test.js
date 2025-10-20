import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createProbeApp } from '../src/observability/probes.js';

describe('observability probes', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes readiness with hardened headers and CORS', async () => {
    const app = createProbeApp({
      service: 'edulure-api',
      readinessCheck: () => ({ ready: true, region: 'eu-west-1' }),
      livenessCheck: () => ({ alive: true }),
      cors: { allowedOrigins: ['https://status.edulure.test'], allowCredentials: true }
    });

    const response = await request(app)
      .get('/ready')
      .set('Origin', 'https://status.edulure.test');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('https://status.edulure.test');
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.body).toMatchObject({
      service: 'edulure-api',
      ready: true,
      status: 'ready',
      region: 'eu-west-1'
    });
  });

  it('returns failure payloads for unhealthy liveness checks and supports HEAD', async () => {
    const app = createProbeApp({
      service: 'edulure-api',
      readinessCheck: () => ({ ready: false }),
      livenessCheck: () => ({ alive: false, detail: 'db unreachable' })
    });

    const liveResponse = await request(app).get('/live');
    expect(liveResponse.status).toBe(500);
    expect(liveResponse.body).toMatchObject({
      service: 'edulure-api',
      alive: false,
      status: 'down',
      detail: 'db unreachable'
    });

    const headResponse = await request(app).head('/live');
    expect(headResponse.status).toBe(500);
    expect(headResponse.text ?? '').toBe('');
  });

  it('emits a timeout failure when readiness checks hang', async () => {
    const app = createProbeApp({
      service: 'edulure-api',
      readinessTimeoutMs: 50,
      readinessCheck: () => new Promise(() => {}),
      livenessCheck: () => ({ alive: true })
    });

    const response = await request(app).get('/ready');
    expect(response.status).toBe(504);
    expect(response.body.ready).toBe(false);
    expect(response.body.status).toBe('not_ready');
    expect(response.body.error).toContain('timed out');
  });
});
