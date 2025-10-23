import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  eventModel: {
    create: vi.fn(),
    findByUuid: vi.fn(),
    aggregateRange: vi.fn(),
    topQueries: vi.fn()
  },
  eventEntityModel: {
    createMany: vi.fn(),
    incrementClicks: vi.fn()
  },
  dailyMetricModel: {
    incrementForEvent: vi.fn(),
    incrementClicks: vi.fn(),
    aggregateRange: vi.fn(),
    listBetween: vi.fn()
  },
  interactionModel: {
    recordInteraction: vi.fn()
  },
  alertModel: {
    create: vi.fn(),
    findOpenByCode: vi.fn(),
    resolve: vi.fn(),
    listRecent: vi.fn(),
    listOpen: vi.fn()
  },
  forecastModel: {
    upsert: vi.fn(),
    listByCode: vi.fn()
  },
  featureFlagModel: {
    all: vi.fn()
  },
  metrics: {
    recordExplorerSearchEvent: vi.fn(),
    recordExplorerInteraction: vi.fn()
  },
  db: {
    transaction: vi.fn(async (handler) => handler({}))
  }
}));

vi.mock('../src/config/database.js', () => ({
  default: mocks.db
}));

vi.mock('../src/models/ExplorerSearchEventModel.js', () => ({
  default: mocks.eventModel
}));

vi.mock('../src/models/ExplorerSearchEventEntityModel.js', () => ({
  default: mocks.eventEntityModel
}));

vi.mock('../src/models/ExplorerSearchDailyMetricModel.js', () => ({
  default: mocks.dailyMetricModel
}));

vi.mock('../src/models/ExplorerSearchInteractionModel.js', () => ({
  default: mocks.interactionModel
}));

vi.mock('../src/models/AnalyticsAlertModel.js', () => ({
  default: mocks.alertModel
}));

vi.mock('../src/models/AnalyticsForecastModel.js', () => ({
  default: mocks.forecastModel
}));

vi.mock('../src/models/FeatureFlagModel.js', () => ({
  default: mocks.featureFlagModel
}));

vi.mock('../src/observability/metrics.js', () => ({
  recordExplorerSearchEvent: mocks.metrics.recordExplorerSearchEvent,
  recordExplorerInteraction: mocks.metrics.recordExplorerInteraction
}));

import { ExplorerAnalyticsService } from '../src/services/ExplorerAnalyticsService.js';

const { eventModel, eventEntityModel, dailyMetricModel, interactionModel, alertModel, forecastModel, featureFlagModel, metrics } = mocks;

function resetMocks() {
  vi.clearAllMocks();
  metrics.recordExplorerSearchEvent.mockReset();
  metrics.recordExplorerInteraction.mockReset();
}

describe('ExplorerAnalyticsService', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('records search executions and updates metrics', async () => {
    const createdEvent = {
      id: 10,
      eventUuid: 'event-uuid',
      createdAt: new Date('2024-05-18T00:00:00.000Z')
    };
    eventModel.create.mockResolvedValue(createdEvent);
    eventEntityModel.createMany.mockResolvedValue([
      { entityType: 'courses', isZeroResult: false },
      { entityType: 'tutors', isZeroResult: false }
    ]);

    const service = new ExplorerAnalyticsService({ loggerInstance: { warn: vi.fn(), info: vi.fn() } });

    const result = await service.recordSearchExecution({
      query: 'automation',
      entitySummaries: [
        {
          entityType: 'courses',
          result: {
            totalHits: 12,
            displayedHits: 6,
            processingTimeMs: 120,
            markers: []
          }
        },
        {
          entityType: 'tutors',
          result: {
            totalHits: 8,
            displayedHits: 4,
            processingTimeMs: 80,
            markers: []
          }
        }
      ],
      userId: 7,
      sessionId: 'session-123',
      traceId: 'trace-abc',
      filters: { courses: { level: ['advanced'] } },
      globalFilters: { languages: ['en'] },
      sort: { courses: 'rating' },
      latencyMs: 200
    });

    expect(eventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'automation',
        resultTotal: 20,
        isZeroResult: false,
        latencyMs: 200,
        userId: 7
      }),
      expect.any(Object)
    );
    expect(eventEntityModel.createMany).toHaveBeenCalledWith(
      createdEvent.id,
      expect.arrayContaining([
        expect.objectContaining({ entityType: 'courses', displayedHits: 6, totalHits: 12 }),
        expect.objectContaining({ entityType: 'tutors', displayedHits: 4, totalHits: 8 })
      ]),
      expect.any(Object)
    );
    expect(dailyMetricModel.incrementForEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'all',
        displayedHits: 10,
        totalHits: 20,
        previewDigest: expect.any(Array)
      }),
      expect.any(Object)
    );
    expect(dailyMetricModel.incrementForEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'courses',
        displayedHits: 6,
        totalHits: 12,
        previewDigest: expect.any(Array)
      }),
      expect.any(Object)
    );
    expect(metrics.recordExplorerSearchEvent).toHaveBeenCalledTimes(2);
    expect(result.totalResults).toBe(20);
    expect(result.entitySummaries).toHaveLength(2);
  });

  it('records explorer interactions and increments click metrics', async () => {
    const createdAt = new Date('2024-05-18T00:00:00.000Z');
    eventModel.findByUuid.mockResolvedValue({ id: 41, createdAt });
    interactionModel.recordInteraction.mockResolvedValue({
      id: 77,
      eventId: 41,
      entityType: 'courses',
      interactionType: 'click'
    });

    const service = new ExplorerAnalyticsService({ loggerInstance: { warn: vi.fn() } });

    const interaction = await service.recordInteraction({
      eventUuid: 'seed-event',
      entityType: 'courses',
      resultId: 'course-123',
      interactionType: 'click',
      position: 0,
      userId: 9
    });

    expect(eventModel.findByUuid).toHaveBeenCalledWith('seed-event');
    expect(interactionModel.recordInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 41, entityType: 'courses', resultId: 'course-123' }),
      expect.any(Object)
    );
    expect(dailyMetricModel.incrementClicks).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'all', clicks: 1 }),
      expect.any(Object)
    );
    expect(dailyMetricModel.incrementClicks).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'courses', clicks: 1 }),
      expect.any(Object)
    );
    expect(eventEntityModel.incrementClicks).toHaveBeenCalledWith(41, 'courses', 1, expect.any(Object));
    expect(metrics.recordExplorerInteraction).toHaveBeenCalledWith({ entityType: 'courses', interactionType: 'click' });
    expect(interaction.id).toBe(77);
  });

  it('builds explorer summary with forecasts and experiments', async () => {
    const now = new Date('2024-05-20T00:00:00.000Z');
    const yesterday = new Date('2024-05-19T00:00:00.000Z');
    const twoDaysAgo = new Date('2024-05-18T00:00:00.000Z');

    const aggregateMap = new Map();
    aggregateMap.set('all', {
      searches: 100,
      zeroResults: 12,
      displayedResults: 420,
      totalResults: 600,
      clicks: 48,
      conversions: 12,
      averageLatencyMs: 164
    });
    aggregateMap.set('courses', {
      searches: 58,
      zeroResults: 6,
      displayedResults: 240,
      totalResults: 320,
      clicks: 29,
      conversions: 8,
      averageLatencyMs: 150
    });

    dailyMetricModel.aggregateRange.mockResolvedValue(aggregateMap);
    dailyMetricModel.listBetween.mockResolvedValue([
      { metricDate: twoDaysAgo, entityType: 'all', searches: 90, zeroResults: 14, displayedResults: 380, totalResults: 560, clicks: 30, averageLatencyMs: 180 },
      { metricDate: yesterday, entityType: 'all', searches: 110, zeroResults: 12, displayedResults: 450, totalResults: 640, clicks: 36, averageLatencyMs: 170 },
      { metricDate: now, entityType: 'all', searches: 100, zeroResults: 10, displayedResults: 420, totalResults: 600, clicks: 42, averageLatencyMs: 160 }
    ]);
    eventModel.topQueries.mockResolvedValue([{ query: 'automation', searches: 24 }]);
    eventModel.aggregateRange.mockResolvedValue({
      searches: 100,
      zeroResults: 12,
      totalResults: 600,
      averageLatencyMs: 160,
      uniqueUsers: 28
    });
    featureFlagModel.all.mockResolvedValue([
      { key: 'explorer.facet-experiment', name: 'Facet Experiment', description: '', enabled: true, killSwitch: false, rolloutPercentage: 50, metadata: {} }
    ]);
    alertModel.listRecent.mockResolvedValue([]);
    forecastModel.listByCode.mockResolvedValue([
      { forecastCode: 'explorer.search-volume', targetDate: now, metricValue: 360, lowerBound: 320, upperBound: 410 }
    ]);
    forecastModel.upsert.mockResolvedValue({});

    const service = new ExplorerAnalyticsService({ loggerInstance: { warn: vi.fn() } });
    service.loadAdsSummary = vi.fn().mockResolvedValue({ impressions: 1000, clicks: 120, conversions: 24, spendCents: 24000, revenueCents: 52000, clickThroughRate: 0.12, conversionRate: 0.2, roas: 2.17 });

    const summary = await service.getExplorerSummary({ rangeDays: 7 });

    expect(summary.totals.searches).toBe(100);
    expect(summary.totals.zeroResultRate).toBeCloseTo(0.12, 4);
    expect(summary.entityBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: 'courses', clickThroughRate: expect.any(Number) })
      ])
    );
    expect(service.loadAdsSummary).toHaveBeenCalled();
    expect(featureFlagModel.all).toHaveBeenCalled();
    expect(forecastModel.listByCode).toHaveBeenCalledTimes(2);
  });
});
