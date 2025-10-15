import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const feedServiceMock = {
  getFeed: vi.fn(),
  getPlacements: vi.fn(),
  getAnalytics: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 555, role: 'user' };
    return next();
  }
}));

vi.mock('../src/services/LiveFeedService.js', () => ({
  default: feedServiceMock
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  Object.values(feedServiceMock).forEach((mockFn) => mockFn.mockReset());
});

describe('Feed GraphQL endpoint', () => {
  it('resolves feed query with variables', async () => {
    feedServiceMock.getFeed.mockResolvedValue({
      context: 'global',
      items: [{ kind: 'post', timestamp: '2025-02-14T00:00:00.000Z' }],
      highlights: [],
      analytics: { engagement: { postsSampled: 1 }, ads: { placementsServed: 0 } },
      pagination: { page: 1, perPage: 10, total: 1, pageCount: 1 }
    });

    const query = `
      query Feed($input: FeedQueryInput) {
        feed(input: $input) {
          context
          items { kind }
          analytics { engagement { postsSampled } }
        }
      }
    `;

    const response = await request(app)
      .post('/api/v1/graphql')
      .set('x-actor-id', '555')
      .set('x-actor-role', 'user')
      .send({
        query,
        variables: {
          input: { context: 'GLOBAL', page: 1 }
        }
      })
      .expect(200);

    expect(feedServiceMock.getFeed).toHaveBeenCalledWith({
      actor: { id: 555, role: 'user' },
      context: 'global',
      community: undefined,
      page: 1,
      perPage: 20,
      includeAnalytics: true,
      includeHighlights: true,
      range: '30d',
      filters: { search: undefined, postType: undefined }
    });
    expect(response.body.data.feed.context).toBe('global');
    expect(response.body.data.feed.items).toHaveLength(1);
  });

  it('resolves placements query', async () => {
    feedServiceMock.getPlacements.mockResolvedValue([
      { placementId: 'pl1', position: 1 }
    ]);

    const response = await request(app)
      .post('/api/v1/graphql')
      .set('x-actor-id', '555')
      .set('x-actor-role', 'user')
      .send({
        query: `query Placements($input: FeedPlacementInput!) {
          feedPlacements(input: $input) { placementId position }
        }`,
        variables: { input: { context: 'SEARCH', limit: 2, keywords: ['ai'] } }
      })
      .expect(200);

    expect(feedServiceMock.getPlacements).toHaveBeenCalledWith({
      context: 'search',
      limit: 2,
      metadata: { keywords: ['ai'] }
    });
    expect(response.body.data.feedPlacements[0].placementId).toBe('pl1');
  });

  it('resolves feed analytics query', async () => {
    feedServiceMock.getAnalytics.mockResolvedValue({
      generatedAt: '2025-02-14T00:00:00.000Z',
      engagement: { postsSampled: 3, comments: 6 },
      ads: { placementsServed: 1 }
    });

    const response = await request(app)
      .post('/api/v1/graphql')
      .set('x-actor-id', '555')
      .set('x-actor-role', 'user')
      .send({
        query: `query FeedAnalytics($input: FeedAnalyticsInput) {
          feedAnalytics(input: $input) { engagement { postsSampled } }
        }`,
        variables: { input: { context: 'COMMUNITY', community: 'makers', range: '7d' } }
      })
      .expect(200);

    expect(feedServiceMock.getAnalytics).toHaveBeenCalledWith({
      actor: { id: 555, role: 'user' },
      context: 'community',
      community: 'makers',
      range: '7d',
      filters: { search: undefined, postType: undefined }
    });
    expect(response.body.data.feedAnalytics.engagement.postsSampled).toBe(3);
  });
});
