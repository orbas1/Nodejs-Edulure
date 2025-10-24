import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import designRoutes from '../src/routes/design.routes.js';

vi.mock('../src/routes/routerFactory.js', () => ({
  createApiRouter: () => express.Router({ mergeParams: true })
}));

let app;

describe('Design system HTTP routes', () => {
  beforeAll(() => {
    app = express();
    app.use('/design', designRoutes);
  });

  it('returns aggregated design tokens and research insights', async () => {
    const response = await request(app).get('/design/system/assets');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.summary.total).toBeGreaterThan(0);
    expect(response.body.data.research.insights[0].id).toBeTruthy();
  });
});
