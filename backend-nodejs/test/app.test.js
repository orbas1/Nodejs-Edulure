import express from 'express';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const envMock = {
  security: {
    rateLimitWindowMinutes: 15,
    rateLimitMax: 200
  },
  app: {
    corsOrigins: ['https://app.local']
  },
  isProduction: false
};

const healthcheckMock = vi.fn();

vi.mock('../src/config/env.js', () => ({
  env: envMock
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
  }
}));

vi.mock('../src/config/database.js', () => ({
  healthcheck: healthcheckMock
}));

vi.mock('../src/routes/registerApiRoutes.js', () => ({
  mountVersionedApi: vi.fn()
}));

vi.mock('../src/routes/routeRegistry.js', () => ({
  apiRouteRegistry: { routes: [] }
}));

vi.mock('../src/graphql/router.js', () => ({
  createGraphQLRouter: () => {
    const router = express.Router();
    router.get('/status', (_req, res) => res.json({ ok: true }));
    return router;
  }
}));

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (_req, _res, next) => next()
}));

vi.mock('../src/middleware/requestContext.js', () => ({
  default: (_req, _res, next) => next()
}));

vi.mock('../src/middleware/runtimeConfig.js', () => ({
  default: (_req, _res, next) => next()
}));

vi.mock('../src/observability/metrics.js', () => ({
  httpMetricsMiddleware: (_req, _res, next) => next(),
  metricsHandler: (_req, res) => res.status(200).send('metrics'),
  annotateLogContextFromRequest: () => {},
  recordUnhandledException: vi.fn()
}));

vi.mock('pino-http', () => ({
  default: () => (_req, _res, next) => next()
}));

let app;
let registerReadinessProbe;
let getCurrentReadinessReport;
let defaultReadiness;

beforeAll(async () => {
  const module = await import('../src/app.js');
  app = module.default;
  registerReadinessProbe = module.registerReadinessProbe;
  getCurrentReadinessReport = module.getCurrentReadinessReport;
  defaultReadiness = getCurrentReadinessReport();
});

afterEach(() => {
  healthcheckMock.mockReset();
  registerReadinessProbe(() => ({
    ...defaultReadiness,
    timestamp: new Date().toISOString(),
    ready: false,
    status: 'not_ready'
  }));
});

describe('app service probes', () => {
  it('returns a deterministic readiness report when no probe registered', () => {
    const report = getCurrentReadinessReport();
    expect(report.service).toBe('web-service');
    expect(report.ready).toBe(false);
    expect(report.status).toBe('not_ready');
  });

  it('honours a custom readiness probe', async () => {
    registerReadinessProbe(() => ({
      service: 'web-service',
      ready: true,
      status: 'ready',
      message: 'Dependencies healthy',
      timestamp: new Date().toISOString()
    }));

    const response = await request(app).get('/ready');
    expect(response.status).toBe(200);
    expect(response.body.ready ?? response.body.status === 'ready').toBeTruthy();
    expect(response.body.message).toBe('Dependencies healthy');
  });

  it('propagates a failing readiness probe through the API', async () => {
    registerReadinessProbe(() => ({
      service: 'web-service',
      ready: false,
      status: 'degraded',
      message: 'Database unavailable',
      timestamp: new Date().toISOString()
    }));

    const response = await request(app).get('/ready');
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.message).toBe('Database unavailable');
  });

  it('exposes a live probe that always succeeds', async () => {
    const response = await request(app).get('/live');
    expect(response.status).toBe(200);
    expect(response.body.status ?? response.body.alive).toBeTruthy();
  });

  it('returns success for health checks when dependencies pass', async () => {
    healthcheckMock.mockResolvedValueOnce();

    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });

  it('returns a 503 when the health check rejects', async () => {
    const failure = new Error('connection refused');
    healthcheckMock.mockRejectedValueOnce(failure);

    const response = await request(app).get('/health');
    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
  });
});
