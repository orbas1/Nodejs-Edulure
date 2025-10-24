import { beforeEach, describe, expect, it, vi } from 'vitest';

const communityServiceMock = {
  listFeedForUser: vi.fn(),
  listFeed: vi.fn()
};
const adsPlacementServiceMock = {
  fetchEligibleCampaigns: vi.fn()
};
const creationProjectModelMock = {
  list: vi.fn()
};
const adsCampaignModelMock = {
  list: vi.fn(),
  findByPublicIds: vi.fn()
};
const adsCampaignMetricModelMock = {
  summariseByCampaignIds: vi.fn()
};
const communityFeedImpressionModelMock = {
  record: vi.fn()
};
const communityGrowthExperimentModelMock = {
  listActiveForCommunities: vi.fn()
};

vi.mock('../src/services/CommunityService.js', () => ({
  default: communityServiceMock
}));
vi.mock('../src/services/AdsPlacementService.js', () => ({
  default: adsPlacementServiceMock
}));
vi.mock('../src/models/CreationProjectModel.js', () => ({
  default: creationProjectModelMock
}));
vi.mock('../src/models/AdsCampaignModel.js', () => ({
  default: adsCampaignModelMock
}));
vi.mock('../src/models/AdsCampaignMetricModel.js', () => ({
  default: adsCampaignMetricModelMock
}));
vi.mock('../src/models/CommunityFeedImpressionModel.js', () => ({
  default: communityFeedImpressionModelMock
}));
vi.mock('../src/models/CommunityGrowthExperimentModel.js', () => ({
  default: communityGrowthExperimentModelMock
}));

const LiveFeedService = await import('../src/services/LiveFeedService.js').then((module) => module.default);

describe('LiveFeedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    communityFeedImpressionModelMock.record.mockResolvedValue(undefined);
    communityGrowthExperimentModelMock.listActiveForCommunities.mockResolvedValue([]);
  });

  it('returns aggregated feed with analytics and highlights for the global context', async () => {
    communityServiceMock.listFeedForUser.mockResolvedValue({
      items: [
        {
          kind: 'post',
          post: {
            id: 11,
            title: 'Launch update',
            body: 'Highlights from the latest cohort.',
            tags: ['launch', 'cohort'],
            community: { id: 6, name: 'Growth', slug: 'growth' },
            author: { id: 52, name: 'Jess', role: 'instructor' },
            stats: { comments: 3, reactions: 7 },
            publishedAt: '2025-02-14T10:00:00.000Z'
          }
        },
        {
          kind: 'ad',
          ad: {
            placementId: 'pl_test',
            campaignId: 'cmp-live',
            headline: 'Promote your course',
            slot: 'feed-inline'
          }
        }
      ],
      pagination: { page: 1, perPage: 2, total: 10, pageCount: 5 },
      ads: { placements: [{ campaignId: 'cmp-live', placementId: 'pl_test' }] }
    });

    creationProjectModelMock.list.mockResolvedValue([
      {
        publicId: 'proj-1',
        title: 'AI Storytelling',
        summary: 'Rapid prototype templates',
        status: 'published',
        type: 'course',
        ownerId: 42,
        metadata: { streams: 4 },
        analyticsTargets: { keywords: ['ai'] },
        updatedAt: '2025-02-13T09:00:00.000Z'
      }
    ]);

    adsCampaignModelMock.list.mockResolvedValue([
      {
        publicId: 'cmp-featured',
        name: 'Creator Showcase',
        status: 'active',
        objective: 'awareness',
        performanceScore: 0.91,
        ctr: 0.12,
        cpcCents: 180,
        cpaCents: 420,
        spendTotalCents: 9800,
        targetingKeywords: ['creator'],
        targetingAudiences: ['instructors'],
        targetingLocations: ['US'],
        targetingLanguages: ['en'],
        startAt: '2025-02-12T00:00:00.000Z',
        endAt: null,
        updatedAt: '2025-02-14T08:00:00.000Z'
      }
    ]);

    adsCampaignModelMock.findByPublicIds.mockResolvedValue([
      {
        id: 77,
        publicId: 'cmp-live',
        status: 'active',
        performanceScore: 0.8,
        ctr: 0.09,
        cpcCents: 150,
        cpaCents: 350,
        spendTotalCents: 6400
      }
    ]);

    adsCampaignMetricModelMock.summariseByCampaignIds.mockResolvedValue(
      new Map([
        [77, { impressions: 1200, clicks: 140, conversions: 16, spendCents: 6400, revenueCents: 8800 }]
      ])
    );

    const result = await LiveFeedService.getFeed({
      actor: { id: 7, role: 'user' },
      includeAnalytics: true,
      includeHighlights: true
    });

    expect(result.context).toBe('global');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ kind: 'post' });
    expect(result.highlights.length).toBeGreaterThan(0);
    expect(result.analytics.engagement.comments).toBe(3);
    expect(result.analytics.ads.totals.impressions).toBe(1200);
  });

  it('omits analytics when disabled', async () => {
    communityServiceMock.listFeedForUser.mockResolvedValue({
      items: [],
      pagination: { page: 1, perPage: 20, total: 0, pageCount: 0 },
      ads: { placements: [] }
    });

    creationProjectModelMock.list.mockResolvedValue([]);
    adsCampaignModelMock.list.mockResolvedValue([]);
    adsCampaignModelMock.findByPublicIds.mockResolvedValue([]);
    adsCampaignMetricModelMock.summariseByCampaignIds.mockResolvedValue(new Map());

    const result = await LiveFeedService.getFeed({
      actor: { id: 10, role: 'user' },
      includeAnalytics: false,
      includeHighlights: false
    });

    expect(result.analytics).toBeNull();
    expect(result.highlights).toEqual([]);
  });

  it('computes analytics for a community context', async () => {
    communityServiceMock.listFeed.mockResolvedValue({
      items: [
        {
          kind: 'post',
          post: {
            id: 3,
            title: 'Community AMA',
            tags: ['community'],
            stats: { comments: 5, reactions: 10 },
            community: { id: 44, name: 'Makers', slug: 'makers' },
            publishedAt: '2025-02-12T05:00:00.000Z'
          }
        }
      ],
      pagination: { page: 1, perPage: 20, total: 5, pageCount: 1 },
      ads: { placements: [] }
    });

    creationProjectModelMock.list.mockResolvedValue([]);
    adsCampaignModelMock.list.mockResolvedValue([]);
    adsCampaignModelMock.findByPublicIds.mockResolvedValue([]);
    adsCampaignMetricModelMock.summariseByCampaignIds.mockResolvedValue(new Map());

    const analytics = await LiveFeedService.getAnalytics({
      actor: { id: 22, role: 'user' },
      context: 'community',
      community: 'makers',
      range: '7d'
    });

    expect(communityServiceMock.listFeed).toHaveBeenCalledWith('makers', 22, expect.objectContaining({ page: 1 }));
    expect(analytics.engagement.comments).toBe(5);
    expect(analytics.range.start).toBeDefined();
  });

  it('fetches placements with keyword metadata', async () => {
    adsPlacementServiceMock.fetchEligibleCampaigns.mockResolvedValue([
      { placementId: 'pl1', campaignId: 'cmp1', position: 1 },
      { placementId: 'pl2', campaignId: 'cmp2', position: 2 }
    ]);

    const placements = await LiveFeedService.getPlacements({
      context: 'search',
      limit: 2,
      metadata: { keywords: ['design', 'ads'] }
    });

    expect(adsPlacementServiceMock.fetchEligibleCampaigns).toHaveBeenCalledWith({
      context: 'search',
      limit: 2,
      metadata: { keywords: ['design', 'ads'] }
    });
    expect(placements).toHaveLength(2);
    expect(placements[0]).toMatchObject({ position: 1 });
  });

  it('generates cache digests that react to content changes', async () => {
    communityServiceMock.listFeedForUser
      .mockResolvedValueOnce({
        items: [
          {
            kind: 'post',
            post: {
              id: 41,
              title: 'Initial post',
              updatedAt: '2025-01-01T00:00:00.000Z',
              stats: { comments: 0, reactions: 0 },
              community: { id: 4 }
            }
          }
        ],
        pagination: { page: 1, perPage: 20, total: 1, pageCount: 1 },
        ads: { placements: [] }
      })
      .mockResolvedValueOnce({
        items: [
          {
            kind: 'post',
            post: {
              id: 41,
              title: 'Initial post',
              updatedAt: '2025-01-02T00:00:00.000Z',
              stats: { comments: 0, reactions: 0 },
              community: { id: 4 }
            }
          }
        ],
        pagination: { page: 1, perPage: 20, total: 1, pageCount: 1 },
        ads: { placements: [] }
      });

    creationProjectModelMock.list.mockResolvedValue([]);
    adsCampaignModelMock.list.mockResolvedValue([]);
    adsCampaignModelMock.findByPublicIds.mockResolvedValue([]);
    adsCampaignMetricModelMock.summariseByCampaignIds.mockResolvedValue(new Map());

    const args = {
      actor: { id: 19, role: 'user' },
      includeAnalytics: false,
      includeHighlights: false
    };

    const first = await LiveFeedService.getFeed(args);
    const second = await LiveFeedService.getFeed(args);

    expect(first.cache.digest).toBeDefined();
    expect(second.cache.digest).toBeDefined();
    expect(second.cache.digest).not.toEqual(first.cache.digest);
    expect(communityFeedImpressionModelMock.record).toHaveBeenCalled();
  });
});
