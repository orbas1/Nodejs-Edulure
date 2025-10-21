import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const loggerWarnSpy = vi.hoisted(() => vi.fn());

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => ({
      warn: loggerWarnSpy
    })
  }
}));

const creationAnalyticsServiceModulePromise = import('../src/services/CreationAnalyticsService.js');

let CreationAnalyticsService;

beforeAll(async () => {
  ({ default: CreationAnalyticsService } = await creationAnalyticsServiceModulePromise);
});

beforeEach(() => {
  loggerWarnSpy.mockReset();
});

describe('CreationAnalyticsService authorisation', () => {
  it('rejects missing actor context', async () => {
    await expect(CreationAnalyticsService.getSummary(null)).rejects.toMatchObject({
      message: 'Unauthorised analytics request',
      status: 401
    });
  });

  it('rejects actors without privileged roles', async () => {
    await expect(CreationAnalyticsService.getSummary({ id: 9, role: 'learner' })).rejects.toMatchObject({
      message: 'You do not have permission to view creation analytics',
      status: 403
    });
  });

  it('resolves scope depending on actor role', () => {
    expect(CreationAnalyticsService.resolveScope({ id: 3, role: 'admin' })).toEqual({});
    expect(CreationAnalyticsService.resolveScope({ id: 7, role: 'staff' }, 22)).toEqual({ ownerId: 22 });
    expect(CreationAnalyticsService.resolveScope({ id: 11, role: 'instructor' }, 999)).toEqual({ ownerId: 11 });
  });
});

describe('CreationAnalyticsService.getSummary', () => {
  let fetchProjectsSpy;
  let fetchCollaboratorsSpy;
  let fetchSessionSummarySpy;
  let fetchAdsAggregatesSpy;
  let fetchTopCampaignsSpy;
  let fetchScamReportsSpy;

  beforeEach(() => {
    fetchProjectsSpy = vi.spyOn(CreationAnalyticsService, 'fetchProjects');
    fetchCollaboratorsSpy = vi.spyOn(CreationAnalyticsService, 'fetchCollaborators');
    fetchSessionSummarySpy = vi.spyOn(CreationAnalyticsService, 'fetchSessionSummary');
    fetchAdsAggregatesSpy = vi.spyOn(CreationAnalyticsService, 'fetchAdsAggregates');
    fetchTopCampaignsSpy = vi.spyOn(CreationAnalyticsService, 'fetchTopCampaigns');
    fetchScamReportsSpy = vi.spyOn(CreationAnalyticsService, 'fetchScamReports');
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchProjectsSpy.mockRestore();
    fetchCollaboratorsSpy.mockRestore();
    fetchSessionSummarySpy.mockRestore();
    fetchAdsAggregatesSpy.mockRestore();
    fetchTopCampaignsSpy.mockRestore();
    fetchScamReportsSpy.mockRestore();
  });

  it('aggregates project, engagement, campaign and risk analytics into a summary payload', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));

    const projects = [
      {
        id: 1,
        publicId: 'proj-1',
        ownerId: 7,
        type: 'course',
        status: 'published',
        title: 'Ops Command Centre',
        metadata: JSON.stringify({
          analytics: {
            views: 1000,
            completions: 400,
            conversions: 120,
            watchTimeMinutes: 900
          },
          revenue: { totalCents: 50000 },
          community: { subscribers: 1200 }
        }),
        analyticsTargets: JSON.stringify({
          audiences: ['operators'],
          markets: ['EMEA'],
          goals: ['Retention']
        }),
        reviewRequestedAt: '2023-12-10T00:00:00Z',
        approvedAt: '2023-12-12T00:00:00Z',
        createdAt: '2023-12-01T00:00:00Z',
        publishedAt: '2023-12-15T00:00:00Z',
        updatedAt: '2023-12-20T00:00:00Z'
      },
      {
        id: 2,
        publicId: 'proj-2',
        ownerId: 7,
        type: 'webinar',
        status: 'ready_for_review',
        title: 'Launch Control Live',
        metadata: JSON.stringify({
          analytics: {
            views: 500,
            completions: 125,
            conversions: 80,
            watchTimeMinutes: 240
          },
          revenue: { totalCents: 12000 },
          community: { subscribers: 300 }
        }),
        analyticsTargets: JSON.stringify({
          audiences: ['founders'],
          markets: ['NA'],
          goals: ['Acquisition']
        }),
        reviewRequestedAt: '2023-12-20T00:00:00Z',
        approvedAt: null,
        createdAt: '2023-12-05T00:00:00Z',
        publishedAt: null,
        updatedAt: '2023-12-30T00:00:00Z'
      }
    ];

    fetchProjectsSpy.mockResolvedValue(projects);
    fetchCollaboratorsSpy.mockResolvedValue([
      { projectId: 1, userId: 91 },
      { projectId: 1, userId: 92 },
      { projectId: 2, userId: 93 }
    ]);
    fetchSessionSummarySpy.mockResolvedValue({
      totalSessions: 4,
      activeSessions: 1,
      completedSessions: 3,
      averageDurationMinutes: 45
    });
    fetchAdsAggregatesSpy.mockResolvedValue({
      totalCampaigns: 2,
      activeCampaigns: 1,
      pausedCampaigns: 1,
      totalSpendCents: 12300,
      totalDailyBudgetCents: 4500,
      averageCtr: 0.045,
      averageCpcCents: 123,
      averageCpaCents: 456
    });
    fetchTopCampaignsSpy.mockResolvedValue([
      {
        publicId: 'camp-1',
        name: 'Acquisition Blitz',
        status: 'active',
        performanceScore: 0.87,
        ctr: 0.051,
        cpcCents: 110,
        cpaCents: 320,
        spendTotalCents: 6800,
        updatedAt: '2024-01-10T00:00:00Z'
      },
      {
        publicId: 'camp-2',
        name: 'Retention Fuel',
        status: 'paused',
        performanceScore: 0.62,
        ctr: 0.034,
        cpcCents: 145,
        cpaCents: 540,
        spendTotalCents: 5500,
        updatedAt: '2024-01-12T00:00:00Z'
      }
    ]);
    fetchScamReportsSpy.mockResolvedValue([
      {
        reason: 'Fraudulent asset',
        riskScore: 85,
        status: 'pending',
        createdAt: '2024-01-14T05:00:00Z'
      },
      {
        reason: 'Suspicious traffic',
        riskScore: 45,
        status: 'investigating',
        createdAt: '2024-01-13T02:00:00Z'
      }
    ]);

    const summary = await CreationAnalyticsService.getSummary({ id: 7, role: 'instructor' }, { range: '30d' });

    expect(fetchProjectsSpy).toHaveBeenCalledWith({ ownerId: 7 }, expect.any(Date), expect.any(Date));
    expect(fetchCollaboratorsSpy).toHaveBeenCalledWith({ ownerId: 7 });

    expect(summary.projectMetrics.totals).toEqual(
      expect.objectContaining({ total: 2, published: 1, awaitingReview: 1 })
    );
    expect(summary.projectMetrics.velocity.averageReviewHours).toBe(48);
    expect(summary.projectMetrics.collaboration).toEqual(
      expect.objectContaining({ collaborators: 3, activeSessions: 1, totalSessions: 4 })
    );
    expect(summary.engagement.totals).toEqual(
      expect.objectContaining({ views: 1500, completions: 525, conversions: 200, revenueCents: 62000 })
    );
    expect(summary.engagement.rates).toEqual({ completionRate: 35, conversionRate: 13.33 });
    expect(summary.engagement.audienceTargets.audiences).toEqual(['operators', 'founders']);

    expect(summary.adsPerformance.totals).toEqual(
      expect.objectContaining({
        campaigns: 2,
        activeCampaigns: 1,
        pausedCampaigns: 1,
        spendCents: 12300,
        averageCtr: 0.045,
        averageCpcCents: 123,
        averageCpaCents: 456
      })
    );
    expect(summary.adsPerformance.topCampaigns[0]).toEqual(
      expect.objectContaining({ id: 'camp-1', performanceScore: 0.87, ctr: 0.051 })
    );

    expect(summary.rankingInsights[0]).toEqual(
      expect.objectContaining({ entityId: 'proj-1', rank: 1, driver: expect.stringContaining('watch time') })
    );
    expect(summary.scamAlert).toEqual(
      expect.objectContaining({ state: 'critical', openReports: 2, highRiskCount: 1 })
    );
    expect(summary.scamAlert.topReasons).toEqual(
      expect.arrayContaining([
        { reason: 'Fraudulent asset', count: 1 },
        { reason: 'Suspicious traffic', count: 1 }
      ])
    );
    expect(summary.exportMeta).toEqual(
      expect.objectContaining({ ownerScope: 7, projectCount: 2, generatedAt: expect.stringContaining('2024-01-15') })
    );
    expect(loggerWarnSpy).not.toHaveBeenCalled();
  });
});
