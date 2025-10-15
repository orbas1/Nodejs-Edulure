import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const adsServiceMock = {
  listCampaigns: vi.fn(),
  createCampaign: vi.fn(),
  getCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  pauseCampaign: vi.fn(),
  resumeCampaign: vi.fn(),
  recordDailyMetrics: vi.fn(),
  getInsights: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 42, role: 'instructor', sessionId: 'sess-1' };
    return next();
  }
}));

vi.mock('../src/services/AdsService.js', () => ({
  default: adsServiceMock
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  Object.values(adsServiceMock).forEach((fn) => fn.mockReset());
});

describe('Ads HTTP routes', () => {
  it('lists campaigns with query filters applied', async () => {
    adsServiceMock.listCampaigns.mockResolvedValue({
      data: [],
      pagination: { page: 2, limit: 5, total: 0, totalPages: 0 }
    });

    const response = await request(app)
      .get('/api/v1/ads/campaigns?status=active,paused&page=2&limit=5')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(adsServiceMock.listCampaigns).toHaveBeenCalledWith({
      actor: { id: 42, role: 'instructor' },
      filters: { status: ['active', 'paused'], search: undefined },
      pagination: { page: 2, limit: 5 }
    });
  });

  it('creates a campaign when payload is valid', async () => {
    const campaign = { id: 'uuid', name: 'Launch', objective: 'traffic' };
    adsServiceMock.createCampaign.mockResolvedValue(campaign);

    const response = await request(app)
      .post('/api/v1/ads/campaigns')
      .set('Authorization', 'Bearer token')
      .send({
        name: 'Launch Creator Ads',
        objective: 'traffic',
        status: 'draft',
        budget: { currency: 'USD', dailyCents: 80000 },
        targeting: { keywords: ['creators'], audiences: ['Ops'], locations: ['US'], languages: ['EN'] },
        creative: {
          headline: 'Scale creator funnels with telemetry-grade insights',
          description: 'Drive conversions with automation playbooks.',
          url: 'https://edulure.test/ads/launch'
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(campaign);
    expect(adsServiceMock.createCampaign).toHaveBeenCalled();
  });

  it('rejects metrics payloads with validation errors', async () => {
    const response = await request(app)
      .post(`/api/ads/campaigns/${baseCampaignId()}/metrics`)
      .set('Authorization', 'Bearer token')
      .send({ impressions: -1 });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(adsServiceMock.recordDailyMetrics).not.toHaveBeenCalled();
  });

  it('fetches campaign insights with optional window parameter', async () => {
    adsServiceMock.getInsights.mockResolvedValue({
      summary: { impressions: 1, clicks: 0, conversions: 0, spendCents: 0, revenueCents: 0, ctr: 0, conversionRate: 0, cpcCents: 0, cpaCents: 0 },
      daily: []
    });

    const response = await request(app)
      .get(`/api/ads/campaigns/${baseCampaignId()}/insights?windowDays=21`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(adsServiceMock.getInsights).toHaveBeenCalledWith(baseCampaignId(), { id: 42, role: 'instructor' }, { windowDays: 21 });
  });
});

function baseCampaignId() {
  return '5f67dd82-2470-4d97-98c1-14df43d62a7a';
}
