import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessIntelligenceService } from '../src/services/BusinessIntelligenceService.js';

const courseReportingModel = {
  fetchDailySummaries: vi.fn(),
  fetchTotals: vi.fn(),
  fetchCategoryBreakdown: vi.fn()
};

const communityReportingModel = {
  fetchDailySummaries: vi.fn(),
  fetchTotals: vi.fn(),
  fetchTopCommunities: vi.fn()
};

const paymentsReportingModel = {
  fetchDailySummaries: vi.fn(),
  fetchTotals: vi.fn()
};

const featureFlagModel = {
  allWithOverrides: vi.fn()
};

const freshnessModel = {
  listSnapshots: vi.fn()
};

describe('BusinessIntelligenceService', () => {
  let service;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-05T12:00:00Z'));

    Object.values(courseReportingModel).forEach((fn) => fn.mockReset());
    Object.values(communityReportingModel).forEach((fn) => fn.mockReset());
    Object.values(paymentsReportingModel).forEach((fn) => fn.mockReset());
    featureFlagModel.allWithOverrides.mockReset();
    freshnessModel.listSnapshots.mockReset();

    courseReportingModel.fetchDailySummaries.mockResolvedValue([
      { date: '2025-03-01', enrollments: 40, completions: 22, recognisedRevenueCents: 45000 },
      { date: '2025-03-02', enrollments: 35, completions: 20, recognisedRevenueCents: 42000 }
    ]);
    courseReportingModel.fetchTotals
      .mockResolvedValueOnce({
        enrollments: 120,
        completions: 84,
        recognisedRevenueCents: 135000,
        averageProgressPercent: 68.5
      })
      .mockResolvedValueOnce({
        enrollments: 90,
        completions: 45,
        recognisedRevenueCents: 90000,
        averageProgressPercent: 52.1
      });
    courseReportingModel.fetchCategoryBreakdown.mockResolvedValue([
      { category: 'leadership', deliveryFormat: 'cohort', level: 'intermediate', enrollments: 40, completions: 30, recognisedRevenueCents: 60000 },
      { category: 'marketing', deliveryFormat: 'self_paced', level: 'beginner', enrollments: 32, completions: 28, recognisedRevenueCents: 42000 }
    ]);

    communityReportingModel.fetchDailySummaries.mockResolvedValue([
      { date: '2025-03-01', posts: 12, comments: 44, eventPosts: 2 },
      { date: '2025-03-02', posts: 9, comments: 31, eventPosts: 1 }
    ]);
    communityReportingModel.fetchTotals
      .mockResolvedValueOnce({ posts: 60, comments: 210, tags: 54, publicPosts: 35, eventPosts: 6 })
      .mockResolvedValueOnce({ posts: 48, comments: 156, tags: 40, publicPosts: 28, eventPosts: 5 });
    communityReportingModel.fetchTopCommunities.mockResolvedValue([
      { communityId: 1, name: 'Global Cohort', posts: 24, comments: 120, publicPosts: 18, eventPosts: 3 }
    ]);

    paymentsReportingModel.fetchDailySummaries
      .mockResolvedValueOnce([
        {
          date: '2025-03-01',
          currency: 'USD',
          grossVolumeCents: 82000,
          recognisedVolumeCents: 76000,
          discountCents: 2000,
          taxCents: 6000,
          refundedCents: 3000,
          totalIntents: 48,
          succeededIntents: 42
        },
        {
          date: '2025-03-01',
          currency: 'EUR',
          grossVolumeCents: 54000,
          recognisedVolumeCents: 50000,
          discountCents: 1500,
          taxCents: 4000,
          refundedCents: 2000,
          totalIntents: 30,
          succeededIntents: 26
        }
      ])
      .mockResolvedValueOnce([
        {
          date: '2025-02-24',
          currency: 'USD',
          grossVolumeCents: 65000,
          recognisedVolumeCents: 60000,
          discountCents: 2500,
          taxCents: 4500,
          refundedCents: 2000,
          totalIntents: 38,
          succeededIntents: 33
        },
        {
          date: '2025-02-24',
          currency: 'EUR',
          grossVolumeCents: 40000,
          recognisedVolumeCents: 36000,
          discountCents: 1200,
          taxCents: 3200,
          refundedCents: 1500,
          totalIntents: 24,
          succeededIntents: 20
        }
      ]);
    paymentsReportingModel.fetchTotals
      .mockResolvedValueOnce({
        grossVolumeCents: 136000,
        recognisedVolumeCents: 126000,
        discountCents: 3500,
        taxCents: 10000,
        refundedCents: 5000,
        totalIntents: 78,
        succeededIntents: 68
      })
      .mockResolvedValueOnce({
        grossVolumeCents: 105000,
        recognisedVolumeCents: 96000,
        discountCents: 3700,
        taxCents: 7700,
        refundedCents: 3500,
        totalIntents: 62,
        succeededIntents: 53
      });

    featureFlagModel.allWithOverrides.mockResolvedValue([
      {
        key: 'explorer.personalisation.experiment',
        name: 'Explorer Personalisation Experiment',
        enabled: true,
        killSwitch: false,
        rolloutPercentage: 50,
        metadata: { experimentId: 'exp-123', owner: 'Growth', tags: ['experiment', 'explorer'] },
        environments: ['production'],
        description: 'Optimise explorer ranking signals',
        updatedAt: '2025-03-04T08:00:00Z'
      }
    ]);

    freshnessModel.listSnapshots.mockResolvedValue([
      {
        pipelineKey: 'ingestion.raw',
        status: 'healthy',
        lagSeconds: 45,
        thresholdMinutes: 15,
        lastEventAt: '2025-03-05T11:55:00Z',
        metadata: { eventId: 999 }
      },
      {
        pipelineKey: 'warehouse.export',
        status: 'warning',
        lagSeconds: 3200,
        thresholdMinutes: 30,
        lastEventAt: '2025-03-05T08:15:00Z',
        metadata: { batchId: 'batch-42' }
      }
    ]);

    service = new BusinessIntelligenceService({
      courseReportingModel,
      communityReportingModel,
      paymentsReportingModel,
      featureFlagModel,
      freshnessModel,
      loggerInstance: { error: vi.fn() }
    });
  });

  it('builds an executive overview with deltas, experiments, and data quality', async () => {
    const overview = await service.getExecutiveOverview({ range: '7d', tenantId: 'tenant-42' });

    expect(overview.tenantId).toBe('tenant-42');
    expect(overview.timeframe.range).toBe('7d');
    expect(overview.scorecard.enrollments.total).toBe(120);
    expect(overview.scorecard.enrollments.change.absolute).toBe(30);
    expect(overview.scorecard.netRevenue.cents).toBe(121000);
    expect(overview.scorecard.netRevenue.change.absolute).toBe(27750);
    expect(overview.scorecard.communityEngagement.posts.total).toBe(60);
    expect(overview.scorecard.communityEngagement.posts.change.absolute).toBe(12);
    expect(overview.revenueByCurrency[0].currency).toBe('USD');
    expect(overview.categoryBreakdown[0].category).toBe('leadership');
    expect(overview.experiments[0]).toMatchObject({ experimentId: 'exp-123', status: 'active' });
    expect(overview.dataQuality.status).toBe('warning');
    expect(overview.dataQuality.pipelines).toHaveLength(2);
  });

  it('returns saved revenue views aggregated by currency and range', async () => {
    const savedViews = await service.getRevenueSavedViews({ range: '30d', tenantId: 'tenant-ops' });

    expect(savedViews.tenantId).toBe('tenant-ops');
    expect(savedViews.range).toBe('30d');
    expect(savedViews.views).toHaveLength(3);

    const overall = savedViews.views.find((view) => view.id === 'overall-30d');
    expect(overall).toBeDefined();
    expect(overall.totals.grossVolumeCents).toBe(136000);
    expect(overall.change.grossVolume.absolute).toBe(31000);
    expect(overall.breakdown.currencies).toHaveLength(2);

    const usdView = savedViews.views.find((view) => view.id.startsWith('currency-usd'));
    expect(usdView).toBeDefined();
    expect(usdView.currency).toBe('USD');
    expect(usdView.totals.grossVolumeCents).toBe(82000);
    expect(usdView.change.grossVolume.absolute).toBe(17000);
    expect(usdView.change.recognisedVolume.absolute).toBe(16000);
    expect(usdView.intents.totalIntents).toBe(48);

    const usdBreakdown = usdView.breakdown.currencies[0];
    expect(usdBreakdown.share).toBeCloseTo(60.29, 2);

    const eurView = savedViews.views.find((view) => view.id.startsWith('currency-eur'));
    expect(eurView.totals.grossVolumeCents).toBe(54000);
    expect(eurView.change.grossVolume.absolute).toBe(14000);
    expect(eurView.intents.succeededIntents).toBe(26);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

