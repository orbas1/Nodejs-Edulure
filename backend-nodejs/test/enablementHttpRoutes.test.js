import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.js', () => ({
  __esModule: true,
  default: () => (req, _res, next) => {
    req.user = { id: 999, role: 'admin', tenantId: 'tenant-enablement' };
    return next();
  }
}));

let app;

describe('Enablement HTTP routes', () => {
  beforeAll(async () => {
    ({ default: app } = await import('../src/app.js'));
  });

  it('returns paginated article listing', async () => {
    const response = await request(app)
      .get('/api/v1/enablement/articles?limit=2')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items.length).toBeLessThanOrEqual(2);
    expect(response.body.data.total).toBeGreaterThanOrEqual(3);
  });

  it('filters and retrieves article detail as HTML', async () => {
    const listing = await request(app)
      .get('/api/v1/enablement/articles?tag=onboarding')
      .set('Authorization', 'Bearer token');

    expect(listing.status).toBe(200);
    expect(listing.body.data.total).toBe(1);
    const slug = listing.body.data.items[0].slug;

    const detail = await request(app)
      .get(`/api/v1/enablement/articles/${slug}?format=html`)
      .set('Authorization', 'Bearer token');

    expect(detail.status).toBe(200);
    expect(detail.body.success).toBe(true);
    expect(detail.body.data.format).toBe('html');
    expect(detail.body.data.content).toContain('<h1>');
  });

  it('forces a reindex and exposes capability matrix', async () => {
    const reindex = await request(app)
      .post('/api/v1/enablement/reindex')
      .set('Authorization', 'Bearer token');

    expect(reindex.status).toBe(202);
    expect(reindex.body.success).toBe(true);
    expect(reindex.body.data.articles).toBeGreaterThanOrEqual(3);

    const matrix = await request(app)
      .get('/api/v1/enablement/capability-matrix')
      .set('Authorization', 'Bearer token');

    expect(matrix.status).toBe(200);
    expect(matrix.body.success).toBe(true);
    expect(matrix.body.data.total).toBeGreaterThanOrEqual(3);
    expect(matrix.body.data.audiences.support).toBeGreaterThanOrEqual(1);
  });
});
