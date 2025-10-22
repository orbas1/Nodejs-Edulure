import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApiRouter } from '../../src/routes/routerFactory.js';

describe('createApiRouter', () => {
  it('applies security headers and supports allowed origins', async () => {
    const app = express();
    const router = createApiRouter({ allowedOrigins: ['https://app.local'] });

    router.get('/health', (_req, res) => {
      res.status(200).json({ ok: true });
    });

    app.use(router);

    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://app.local')
      .expect(200);

    expect(response.body).toEqual({ ok: true });
    expect(response.headers['cache-control']).toBe(
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    expect(response.headers.pragma).toBe('no-cache');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers.vary).toContain('Origin');
    expect(response.headers['access-control-allow-origin']).toBe('https://app.local');
  });

  it('rejects disallowed origins with a 403 status code', async () => {
    const app = express();
    const router = createApiRouter({ allowedOrigins: ['https://studio.local'] });

    router.get('/secure', (_req, res) => {
      res.status(200).json({ ok: true });
    });

    app.use(router);
    app.use((err, _req, res, _next) => {
      const status = err.status ?? 500;
      res.status(status).json({ success: false, status, message: err.message });
    });

    const response = await request(app)
      .get('/secure')
      .set('Origin', 'https://unauthorised.example')
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.status).toBe(403);
    expect(response.body.message).toContain('not allowed by CORS policy');
  });
});
