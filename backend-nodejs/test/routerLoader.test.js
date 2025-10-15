import express, { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { mountVersionedApi } from '../src/routes/registerApiRoutes.js';

describe('mountVersionedApi', () => {
  it('mounts versioned routes and enforces feature flags', async () => {
    const app = express();
    const enabledRouter = Router();
    enabledRouter.get('/ping', (_req, res) => {
      res.status(200).json({ success: true, message: 'ok' });
    });

    const disabledRouter = Router();
    disabledRouter.get('/ping', (_req, res) => {
      res.status(200).json({ success: true, message: 'should not be reachable' });
    });

    mountVersionedApi(app, {
      registry: [
        {
          name: 'enabled',
          capability: 'test-enabled',
          basePath: '/enabled',
          flagKey: 'test.enabled',
          defaultState: 'disabled',
          evaluator: () => ({ key: 'test.enabled', enabled: true, reason: 'forced-enabled' }),
          router: enabledRouter
        },
        {
          name: 'disabled',
          capability: 'test-disabled',
          basePath: '/disabled',
          flagKey: 'test.disabled',
          defaultState: 'enabled',
          disabledMessage: 'Feature off',
          fallbackStatus: 503,
          evaluator: () => ({ key: 'test.disabled', enabled: false, reason: 'forced-disabled' }),
          router: disabledRouter
        }
      ],
      exposeLegacyRedirect: false
    });

    const enabledResponse = await request(app).get('/api/v1/enabled/ping').expect(200);
    expect(enabledResponse.body).toMatchObject({ success: true, message: 'ok' });

    const disabledResponse = await request(app).get('/api/v1/disabled/ping').expect(503);
    expect(disabledResponse.body.success).toBe(false);
    expect(disabledResponse.body.flag).toBe('test.disabled');
    expect(disabledResponse.body.reason).toBe('forced-disabled');
    expect(disabledResponse.body.message).toContain('Feature off');
  });

  it('redirects legacy /api requests to the versioned base path', async () => {
    const app = express();
    const router = Router();
    router.get('/health', (_req, res) => {
      res.status(200).json({ healthy: true });
    });

    const previousToggle = process.env.API_EXPOSE_LEGACY_REDIRECTS;
    process.env.API_EXPOSE_LEGACY_REDIRECTS = 'true';
    mountVersionedApi(app, {
      registry: [
        {
          name: 'legacy-redirect',
          capability: 'legacy-test',
          basePath: '/legacy',
          flagKey: 'test.redirect',
          defaultState: 'enabled',
          evaluator: () => ({ key: 'test.redirect', enabled: true, reason: 'enabled' }),
          router
        }
      ]
    });

    const response = await request(app).get('/api/legacy/health').redirects(0).expect(308);
    expect(response.headers.location).toBe('/api/v1/legacy/health');
    process.env.API_EXPOSE_LEGACY_REDIRECTS = previousToggle;
  });

  it('wraps router handlers with an error boundary', async () => {
    const app = express();
    const router = Router();
    router.get('/explode', () => {
      const error = new Error('explosion');
      error.status = 418;
      throw error;
    });

    mountVersionedApi(app, {
      registry: [
        {
          name: 'errors',
          capability: 'error-boundary',
          basePath: '/errors',
          flagKey: 'test.errors',
          defaultState: 'enabled',
          evaluator: () => ({ key: 'test.errors', enabled: true, reason: 'enabled' }),
          router
        }
      ],
      exposeLegacyRedirect: false
    });

    const response = await request(app).get('/api/v1/errors/explode').expect(418);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('route_error');
    expect(response.body.message).toBe('explosion');
    expect(response.body.correlationId).toBeDefined();
  });
});
