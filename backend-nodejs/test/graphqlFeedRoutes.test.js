import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const feedServiceMock = {
  getFeed: vi.fn(),
  getPlacements: vi.fn(),
  getAnalytics: vi.fn()
};

const authState = {
  user: { id: '555', role: 'user' }
};

const dashboardServiceMock = {
  getDashboardForUser: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    if (authState.user) {
      req.user = authState.user;
    }
    return next();
  }
}));

vi.mock('../src/services/DashboardService.js', () => ({
  default: dashboardServiceMock
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
  Object.values(dashboardServiceMock).forEach((mockFn) => mockFn.mockReset());
  authState.user = { id: '555', role: 'user' };
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

  it('rejects requests without a resolved actor', async () => {
    authState.user = null;

    const response = await request(app)
      .post('/api/v1/graphql')
      .send({
        query: `query Feed { feed { context } }`
      })
      .expect(401);

    expect(response.body.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
    expect(feedServiceMock.getFeed).not.toHaveBeenCalled();
  });

  it('allows service actors to be resolved from headers when session is missing', async () => {
    authState.user = null;
    feedServiceMock.getFeed.mockResolvedValue({
      context: 'global',
      items: [],
      highlights: [],
      analytics: null,
      pagination: { page: 1, perPage: 20, total: 0, pageCount: 0 }
    });

    await request(app)
      .post('/api/v1/graphql')
      .set('x-actor-id', '777')
      .set('x-actor-role', 'service')
      .send({
        query: `query Feed { feed { context } }`
      })
      .expect(200);

    expect(feedServiceMock.getFeed).toHaveBeenCalledWith({
      actor: { id: 777, role: 'service' },
      context: 'global',
      community: undefined,
      page: 1,
      perPage: 20,
      includeAnalytics: true,
      includeHighlights: true,
      range: '30d',
      filters: { search: undefined, postType: undefined }
    });
  });

  it('blocks documents containing more than one operation', async () => {
    authState.user = { id: '555', role: 'user' };

    const response = await request(app)
      .post('/api/v1/graphql')
      .send({
        query: `
          query First { feed { context } }
          query Second { feedPlacements(input: { context: GLOBAL_FEED }) { placementId } }
        `
      })
      .expect(200);

    expect(response.body.errors?.[0]?.extensions?.code).toBe('OPERATION_LIMIT_EXCEEDED');
    expect(response.body.errors?.[0]?.extensions?.http?.status).toBe(400);
    expect(feedServiceMock.getFeed).not.toHaveBeenCalled();
    expect(feedServiceMock.getPlacements).not.toHaveBeenCalled();
  });

  it('enforces query depth limits to mitigate expensive introspection', async () => {
    const response = await request(app)
      .post('/api/v1/graphql')
      .send({
        query: `
          query DeepIntrospection {
            __schema {
              types {
                fields {
                  type {
                    ofType {
                      ofType {
                        ofType {
                          ofType {
                            ofType {
                              ofType {
                                ofType {
                                  name
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `
      })
      .expect(200);

    expect(response.body.errors?.[0]?.extensions?.code).toBe('DEPTH_LIMIT_EXCEEDED');
    expect(response.body.errors?.[0]?.extensions?.http?.status).toBe(400);
  });
});
