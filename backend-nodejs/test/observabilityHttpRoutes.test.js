import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { recordHttpSloObservation, resetSloRegistry } from '../src/observability/sloRegistry.js';

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (_req, _res, next) => next()
}));

let app;

describe('Observability HTTP routes', () => {
  beforeAll(async () => {
    ({ default: app } = await import('../src/app.js'));
  });

  beforeEach(() => {
    resetSloRegistry();
  });

  it('returns aggregated SLO snapshots and detail payloads', async () => {
    for (let i = 0; i < 210; i += 1) {
      recordHttpSloObservation({
        route: '/api/v1/observability/slos',
        method: 'GET',
        statusCode: 200,
        durationMs: 80 + (i % 5)
      });
    }

    for (let i = 0; i < 4; i += 1) {
      recordHttpSloObservation({
        route: '/api/v1/observability/slos',
        method: 'GET',
        statusCode: 503,
        durationMs: 420 + i * 10
      });
    }

    const listResponse = await request(app)
      .get('/api/v1/observability/slos')
      .set('Authorization', 'Bearer token');

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.data.slo)).toBe(true);
    const restSlo = listResponse.body.data.slo.find((item) => item.id === 'api-http-availability');
    expect(restSlo).toBeDefined();
    expect(restSlo.status).toMatch(/warning|critical|healthy/);
    expect(restSlo.totalRequests).toBeGreaterThanOrEqual(210);

    const detailResponse = await request(app)
      .get('/api/v1/observability/slos/api-http-availability')
      .set('Authorization', 'Bearer token');

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.id).toBe('api-http-availability');
    expect(detailResponse.body.data.definition.indicator.routePattern).toContain('/api/v1/');

    const notFound = await request(app)
      .get('/api/v1/observability/slos/unknown')
      .set('Authorization', 'Bearer token');

    expect(notFound.status).toBe(404);
  });
});
