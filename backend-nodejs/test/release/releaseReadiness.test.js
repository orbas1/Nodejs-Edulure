import http from 'node:http';

import autocannon from 'autocannon';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/database.js', () => {
  const fakeDb = {};
  fakeDb.raw = vi.fn().mockResolvedValue([{ health_check: 1 }]);
  fakeDb.destroy = vi.fn();
  fakeDb.select = vi.fn(() => fakeDb);
  fakeDb.where = vi.fn(() => fakeDb);
  fakeDb.first = vi.fn().mockResolvedValue(null);
  fakeDb.transaction = vi.fn(async (handler) => handler({ commit: vi.fn(), rollback: vi.fn() }));
  fakeDb.insert = vi.fn(() => fakeDb);
  fakeDb.update = vi.fn(() => fakeDb);
  fakeDb.delete = vi.fn(() => fakeDb);

  return {
    default: fakeDb,
    healthcheck: vi.fn().mockResolvedValue(true)
  };
});

import app, { registerReadinessProbe } from '../../src/app.js';

function runLoadProbe(url) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url,
        connections: 5,
        amount: 150,
        duration: 0.5,
        method: 'GET',
        headers: {
          'user-agent': 'edulure-release-readiness',
          'x-release-check': 'load-probe'
        }
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    instance.on('error', reject);
  });
}

describe('Release readiness guardrails', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    registerReadinessProbe(() => ({
      service: 'web-service',
      ready: true,
      status: 'ready',
      timestamp: new Date().toISOString(),
      latestMigrations: ['20241118100000_provider_transition_program'],
      activeIncidents: 0,
      dependenciesHealthy: true
    }));

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    }
  });

  it('enforces hardened security headers on health surfaces', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(response.headers['strict-transport-security']).toContain('max-age=15552000');
  });

  it('reports readiness and health metadata required for go/no-go sign-off', async () => {
    const readinessResponse = await request(app).get('/ready');
    expect(readinessResponse.status).toBe(200);
    expect(readinessResponse.body.ready).toBe(true);
    expect(readinessResponse.body.latestMigrations).toContain('20241118100000_provider_transition_program');
    expect(readinessResponse.body.activeIncidents).toBe(0);

    const healthResponse = await request(app).get('/health');
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.data.status).toBe('ok');
    expect(new Date(healthResponse.body.data.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('satisfies latency and error-rate objectives under a short burst load', async () => {
    const result = await runLoadProbe(`${baseUrl}/health`);
    expect(result.errors).toBe(0);
    expect(result.non2xx).toBe(0);
    expect(result.latency.p99).toBeLessThanOrEqual(200);
    expect(result.requests.average).toBeGreaterThan(120);
  });
});
