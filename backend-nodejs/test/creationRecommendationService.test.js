import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  featureFlagService: {
    evaluate: vi.fn()
  },
  logModel: {
    record: vi.fn(),
    listRecent: vi.fn()
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../src/services/FeatureFlagService.js', () => ({
  featureFlagService: mocks.featureFlagService
}));

vi.mock('../src/models/CreationRecommendationLogModel.js', () => ({
  default: mocks.logModel
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => mocks.logger
  }
}));

const { featureFlagService, logModel } = mocks;

import CreationRecommendationService from '../src/services/CreationRecommendationService.js';

describe('CreationRecommendationService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
  });

  it('returns empty recommendations when feature flag is disabled', async () => {
    const evaluation = { key: 'creation.recommendations', enabled: false, reason: 'tenant-disabled' };
    featureFlagService.evaluate.mockReturnValue(evaluation);
    logModel.record.mockResolvedValue({ generatedAt: new Date().toISOString() });

    const result = await CreationRecommendationService.generate({ id: 42, role: 'instructor' });

    expect(featureFlagService.evaluate).toHaveBeenCalledWith(
      'creation.recommendations',
      expect.objectContaining({ userId: 42, role: 'instructor', tenantId: 'global' })
    );
    expect(result.recommendations).toEqual([]);
    expect(result.evaluation).toEqual(evaluation);
    expect(logModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        featureFlagState: 'tenant-disabled',
        results: []
      })
    );
    expect(logModel.listRecent).not.toHaveBeenCalled();
  });

  it('scores projects and returns prioritised recommendations', async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    featureFlagService.evaluate.mockReturnValue({ key: 'creation.recommendations', enabled: true });

    const fetchProjectsSpy = vi
      .spyOn(CreationRecommendationService, 'fetchProjectSummaries')
      .mockResolvedValue([
        {
          id: 1,
          publicId: 'project-ready',
          ownerId: 42,
          type: 'course',
          status: 'ready_for_review',
          title: 'Ads Mastery',
          metadata: {},
          analyticsTargets: {},
          reviewRequestedAt: threeDaysAgo,
          approvedAt: null,
          publishedAt: null,
          updatedAt: threeDaysAgo,
          collaboratorCount: 2
        },
        {
          id: 2,
          publicId: 'project-published',
          ownerId: 42,
          type: 'ads_asset',
          status: 'published',
          title: 'Holiday Campaign',
          metadata: {},
          analyticsTargets: { audiences: ['prospects'] },
          reviewRequestedAt: null,
          approvedAt: null,
          publishedAt: now.toISOString(),
          updatedAt: now.toISOString(),
          collaboratorCount: 1
        }
      ]);

    const fetchCampaignsSpy = vi
      .spyOn(CreationRecommendationService, 'fetchCampaignSummaries')
      .mockResolvedValue(
        new Map([
          [
            'project-published',
            [
              {
                publicId: 'cmp-1',
                name: 'Search Boost',
                status: 'active',
                performanceScore: 0.25,
                updatedAt: now.toISOString()
              }
            ]
          ]
        ])
      );

    logModel.record.mockResolvedValue({ generatedAt: now.toISOString() });
    logModel.listRecent.mockResolvedValue([
      {
        id: 99,
        generatedAt: now.toISOString(),
        algorithmVersion: '2025.02-recommendations.1',
        tenantId: 'global',
        featureFlagState: 'enabled',
        featureFlagVariant: null,
        recommendationCount: 2,
        context: { limit: 5 }
      }
    ]);

    const result = await CreationRecommendationService.generate(
      { id: 42, role: 'instructor' },
      { includeHistory: true }
    );

    expect(fetchProjectsSpy).toHaveBeenCalled();
    expect(fetchCampaignsSpy).toHaveBeenCalled();
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0].projectPublicId).toBe('project-ready');
    expect(result.recommendations[0].signals.length).toBeGreaterThan(0);
    expect(result.meta.history).toHaveLength(1);
    expect(logModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        featureFlagState: 'enabled',
        results: expect.arrayContaining([
          expect.objectContaining({ projectPublicId: 'project-ready' }),
          expect.objectContaining({ projectPublicId: 'project-published' })
        ])
      })
    );
  });
});
