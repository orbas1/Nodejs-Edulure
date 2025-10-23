import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adsCampaignModelMock: {
    list: vi.fn(),
    count: vi.fn(),
    updateById: vi.fn(),
    findByPublicId: vi.fn()
  },
  adsCampaignMetricModelMock: {
    summariseByCampaignIds: vi.fn(),
    summariseWindow: vi.fn(),
    summariseWindowBulk: vi.fn(),
    listByCampaign: vi.fn()
  },
  domainEventModelMock: {
    record: vi.fn()
  },
  db: {
    transaction: vi.fn(async (handler) =>
      handler({
        fn: {
          now: () => new Date().toISOString()
        }
      })
    )
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../src/models/AdsCampaignModel.js', () => ({
  default: mocks.adsCampaignModelMock
}));

vi.mock('../src/models/AdsCampaignMetricModel.js', () => ({
  default: mocks.adsCampaignMetricModelMock
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: mocks.domainEventModelMock
}));

vi.mock('../src/config/database.js', () => ({
  default: mocks.db
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => mocks.logger
  }
}));

const { adsCampaignModelMock, adsCampaignMetricModelMock, domainEventModelMock, db } = mocks;

import AdsService from '../src/services/AdsService.js';

const baseCampaign = {
  id: 1,
  publicId: '5f67dd82-2470-4d97-98c1-14df43d62a7a',
  createdBy: 42,
  name: 'Creator Funnel Boost Q4',
  objective: 'traffic',
  status: 'active',
  budgetCurrency: 'USD',
  budgetDailyCents: 50000,
  spendCurrency: 'USD',
  spendTotalCents: 0,
  performanceScore: 0,
  ctr: 0,
  cpcCents: 0,
  cpaCents: 0,
  targetingKeywords: ['growth'],
  targetingAudiences: ['Creators'],
  targetingLocations: ['US'],
  targetingLanguages: ['EN'],
  creativeHeadline: 'Scale creator funnels with telemetry-grade insights',
  creativeDescription: 'Drive conversions with automation playbooks.',
  creativeUrl: 'https://edulure.test/ads/creator-funnel-boost',
  startAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  endAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('AdsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.transaction.mockImplementation(async (handler) =>
      handler({
        fn: {
          now: () => new Date().toISOString()
        }
      })
    );
    adsCampaignMetricModelMock.summariseWindowBulk.mockResolvedValue(new Map());
  });

  it('applies compliance automation when campaigns overspend beyond tolerance', async () => {
    adsCampaignModelMock.list.mockResolvedValue([baseCampaign]);
    adsCampaignModelMock.count.mockResolvedValue(1);

    const lifetime = new Map();
    lifetime.set(baseCampaign.id, {
      impressions: 90000,
      clicks: 3900,
      conversions: 450,
      spendCents: 320000,
      revenueCents: 720000,
      lastMetricDate: new Date()
    });
    adsCampaignMetricModelMock.summariseByCampaignIds.mockResolvedValue(lifetime);
    adsCampaignMetricModelMock.summariseWindowBulk.mockResolvedValue(
      new Map([
        [
          baseCampaign.id,
          {
            impressions: 48000,
            clicks: 2043,
            conversions: 238,
            spendCents: 41200,
            revenueCents: 109500
          }
        ]
      ])
    );

    adsCampaignModelMock.updateById.mockImplementation(async (_id, updates) => ({
      ...baseCampaign,
      ...updates,
      metadata: updates.metadata ?? baseCampaign.metadata
    }));

    const result = await AdsService.listCampaigns({
      actor: { id: 42, role: 'instructor' },
      filters: {},
      pagination: { page: 1, limit: 10 }
    });

    expect(result.data).toHaveLength(1);
    const [campaign] = result.data;
    expect(campaign.compliance.status).toBe('halted');
    expect(campaign.status).toBe('paused');
    expect(campaign.metrics.lifetime.spendCents).toBe(320000);
    expect(adsCampaignModelMock.updateById).toHaveBeenCalledWith(
      baseCampaign.id,
      expect.objectContaining({ status: 'paused' })
    );
    expect(domainEventModelMock.record).toHaveBeenCalled();
    expect(result.pagination.total).toBe(1);
  });

  it('aggregates rolling insights across requested window', async () => {
    adsCampaignModelMock.findByPublicId.mockResolvedValue(baseCampaign);
    adsCampaignMetricModelMock.listByCampaign.mockResolvedValue([
      {
        metricDate: new Date('2024-12-01T00:00:00.000Z'),
        impressions: 42000,
        clicks: 1785,
        conversions: 214,
        spendCents: 36500,
        revenueCents: 98200
      },
      {
        metricDate: new Date('2024-12-02T00:00:00.000Z'),
        impressions: 48750,
        clicks: 2043,
        conversions: 238,
        spendCents: 41200,
        revenueCents: 109500
      }
    ]);

    const insights = await AdsService.getInsights(baseCampaign.publicId, { id: 42, role: 'instructor' }, { windowDays: 7 });

    expect(insights.summary.impressions).toBe(90750);
    expect(insights.summary.clicks).toBe(3828);
    expect(insights.summary.conversions).toBe(452);
    expect(insights.summary.spendCents).toBe(77700);
    expect(insights.daily).toHaveLength(2);
    expect(insights.daily[0].date).toBe('2024-12-01T00:00:00.000Z');
    expect(insights.daily[1].ctr).toBeGreaterThan(0);
  });

  it('prevents actors without campaign permissions from listing campaigns', async () => {
    await expect(
      AdsService.listCampaigns({
        actor: { id: 99, role: 'user' }
      })
    ).rejects.toMatchObject({ status: 403 });
    expect(adsCampaignModelMock.list).not.toHaveBeenCalled();
  });

  it('requires an authenticated identity when requesting campaigns', async () => {
    await expect(
      AdsService.listCampaigns({
        actor: { role: 'instructor' }
      })
    ).rejects.toMatchObject({ status: 401 });
  });
});
