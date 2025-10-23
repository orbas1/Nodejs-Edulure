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
  let currentRevenueDaily;
  let previousRevenueDaily;

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

    currentRevenueDaily = [
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
        date: '2025-03-02',
        currency: 'USD',
        grossVolumeCents: 91000,
        recognisedVolumeCents: 84000,
        discountCents: 2500,
        taxCents: 6200,
        refundedCents: 2600,
        totalIntents: 52,
        succeededIntents: 46
      }
    ];
    previousRevenueDaily = [
      {
        date: '2025-02-22',
        currency: 'USD',
        grossVolumeCents: 70000,
        recognisedVolumeCents: 65000,
        discountCents: 1800,
        taxCents: 5400,
        refundedCents: 4000,
        totalIntents: 44,
        succeededIntents: 38
      },
      {
        date: '2025-02-23',
        currency: 'USD',
        grossVolumeCents: 72000,
        recognisedVolumeCents: 66000,
        discountCents: 2000,
        taxCents: 5500,
        refundedCents: 3200,
        totalIntents: 45,
        succeededIntents: 39
      }
    ];

    paymentsReportingModel.fetchDailySummaries.mockImplementation(async ({ end }) => {
      const endIso = end instanceof Date ? end.toISOString().slice(0, 10) : end;
      if (endIso && endIso >= '2025-03-05') {
        return currentRevenueDaily;
      }
      return previousRevenueDaily;
    });
    paymentsReportingModel.fetchTotals
      .mockResolvedValueOnce({
        grossVolumeCents: 220000,
        recognisedVolumeCents: 205000,
        discountCents: 7000,
        taxCents: 12500,
        refundedCents: 9000,
        totalIntents: 150,
        succeededIntents: 136
      })
      .mockResolvedValueOnce({
        grossVolumeCents: 180000,
        recognisedVolumeCents: 168000,
        discountCents: 6000,
        taxCents: 11200,
        refundedCents: 6000,
        totalIntents: 132,
        succeededIntents: 120
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
    expect(overview.scorecard.netRevenue.cents).toBe(196000);
    expect(overview.scorecard.netRevenue.change.absolute).toBe(32000);
    expect(overview.scorecard.communityEngagement.posts.total).toBe(60);
    expect(overview.scorecard.communityEngagement.posts.change.absolute).toBe(12);
    expect(overview.revenueByCurrency[0].currency).toBe('USD');
    expect(overview.categoryBreakdown[0].category).toBe('leadership');
    expect(overview.experiments[0]).toMatchObject({ experimentId: 'exp-123', status: 'active' });
    expect(overview.dataQuality.status).toBe('warning');
    expect(overview.dataQuality.pipelines).toHaveLength(2);
  });

  it('returns revenue saved views with computed deltas and ratios', async () => {
    const payload = await service.getRevenueSavedViews({ range: '7d', tenantId: 'tenant-ops' });

    expect(payload.tenantId).toBe('tenant-ops');
    expect(payload.views).toHaveLength(3);

    const netView = payload.views.find((view) => view.id === 'net-revenue');
    expect(netView).toBeDefined();
    const netMetric = netView.metrics.find((metric) => metric.key === 'netRevenue');
    expect(netMetric.current).toBe(154400);
    expect(netMetric.change.absolute).toBe(30600);

    const refundRateMetric = netView.metrics.find((metric) => metric.key === 'refundRate');
    expect(refundRateMetric.current).toBeCloseTo(0.035, 3);
    expect(refundRateMetric.change.absolute).toBeCloseTo(-0.0199, 3);

    const healthView = payload.views.find((view) => view.id === 'payment-health');
    expect(healthView.metrics.find((metric) => metric.key === 'successRate').current).toBeCloseTo(0.88, 3);
    expect(
      healthView.metrics.find((metric) => metric.key === 'grossVolume').change.absolute
    ).toBe(31000);

    const leakageView = payload.views.find((view) => view.id === 'revenue-leakage');
    expect(leakageView.metrics.find((metric) => metric.key === 'averageTicket').current).toBeCloseTo(
      1818.18,
      2
    );
    expect(leakageView.metrics.find((metric) => metric.key === 'discountRate').change.absolute).toBeCloseTo(
      -0.00075,
      4
    );

    expect(payload.timeframe.days).toBe(7);
    expect(payload.timeframe.start).toBe('2025-02-27T00:00:00.000Z');
    expect(payload.timeframe.previousEnd).toBe('2025-02-26T23:59:59.999Z');
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

