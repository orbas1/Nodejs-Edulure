import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const feedServiceMock = {
  getFeed: vi.fn(),
  getAnalytics: vi.fn(),
  getPlacements: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 101, role: 'user' };
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

describe('Feed HTTP routes', () => {
  it('fetches aggregated feed data with query params', async () => {
    feedServiceMock.getFeed.mockResolvedValue({
      context: 'community',
      items: [],
      highlights: [],
      analytics: null,
      pagination: { page: 1, perPage: 10, total: 0, pageCount: 0 }
    });

    const response = await request(app)
      .get('/api/v1/feed?context=community&community=makers&page=2&perPage=10&includeAnalytics=false&range=7d')
      .expect(200);

    expect(feedServiceMock.getFeed).toHaveBeenCalledWith({
      actor: { id: 101, role: 'user' },
      context: 'community',
      community: 'makers',
      page: 2,
      perPage: 10,
      includeAnalytics: false,
      includeHighlights: true,
      range: '7d',
      filters: { search: undefined, postType: undefined }
    });
    expect(response.body.success).toBe(true);
  });

  it('returns analytics snapshot', async () => {
    feedServiceMock.getAnalytics.mockResolvedValue({
      generatedAt: '2025-02-14T00:00:00.000Z',
      engagement: { postsSampled: 4, comments: 6 },
      ads: { placementsServed: 2 }
    });

    const response = await request(app)
      .get('/api/v1/feed/analytics?context=global&range=30d')
      .expect(200);

    expect(feedServiceMock.getAnalytics).toHaveBeenCalledWith({
      actor: { id: 101, role: 'user' },
      context: 'global',
      community: undefined,
      range: '30d',
      filters: { search: undefined, postType: undefined }
    });
    expect(response.body.data.engagement.postsSampled).toBe(4);
  });

  it('fetches placements with keywords', async () => {
    feedServiceMock.getPlacements.mockResolvedValue([
      { placementId: 'pl1' }
    ]);

    const response = await request(app)
      .get('/api/v1/feed/placements?context=search&limit=2&keywords=design,growth')
      .expect(200);

    expect(feedServiceMock.getPlacements).toHaveBeenCalledWith({
      context: 'search',
      limit: 2,
      metadata: { keywords: ['design', 'growth'] }
    });
    expect(response.body.data).toHaveLength(1);
  });
});
