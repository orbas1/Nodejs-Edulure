import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const biServiceMock = {
  getExecutiveOverview: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 501, role: 'admin', tenantId: 'tenant-admin' };
    return next();
  }
}));

vi.mock('../src/services/BusinessIntelligenceService.js', () => ({
  __esModule: true,
  default: biServiceMock
}));

let app;

describe('Analytics BI HTTP routes', () => {
  beforeAll(async () => {
    ({ default: app } = await import('../src/app.js'));
  });

  beforeEach(() => {
    biServiceMock.getExecutiveOverview.mockReset();
  });

  it('returns executive overview payload using default tenant scope', async () => {
    const payload = {
      tenantId: 'tenant-admin',
      timeframe: { range: '30d', start: '2025-02-04T00:00:00Z', end: '2025-03-05T23:59:59Z' },
      scorecard: { enrollments: { total: 120, change: { absolute: 24, percentage: 25 } } },
      enrollmentTrends: [],
      revenueTrends: [],
      revenueByCurrency: [],
      communityTrends: [],
      topCommunities: [],
      categoryBreakdown: [],
      experiments: [],
      dataQuality: { status: 'healthy', pipelines: [] }
    };
    biServiceMock.getExecutiveOverview.mockResolvedValue(payload);

    const response = await request(app)
      .get('/api/v1/analytics/bi/executive-overview?range=14d')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.scorecard.enrollments.total).toBe(120);
    expect(biServiceMock.getExecutiveOverview).toHaveBeenCalledWith({ range: '14d', tenantId: 'tenant-admin' });
  });

  it('allows tenant override header for overview queries', async () => {
    biServiceMock.getExecutiveOverview.mockResolvedValue({
      tenantId: 'tenant-eu',
      timeframe: { range: '7d' },
      scorecard: { enrollments: { total: 40, change: { absolute: 10, percentage: 33.3 } } },
      enrollmentTrends: [],
      revenueTrends: [],
      revenueByCurrency: [],
      communityTrends: [],
      topCommunities: [],
      categoryBreakdown: [],
      experiments: [],
      dataQuality: { status: 'healthy', pipelines: [] }
    });

    const response = await request(app)
      .get('/api/v1/analytics/bi/executive-overview')
      .set('Authorization', 'Bearer token')
      .set('x-tenant-id', 'tenant-eu');

    expect(response.status).toBe(200);
    expect(biServiceMock.getExecutiveOverview).toHaveBeenCalledWith({ range: '30d', tenantId: 'tenant-eu' });
  });
});

