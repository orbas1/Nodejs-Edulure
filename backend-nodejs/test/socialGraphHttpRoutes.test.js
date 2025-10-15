import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const socialGraphServiceMock = {
  followUser: vi.fn(),
  approveFollow: vi.fn(),
  declineFollow: vi.fn(),
  unfollowUser: vi.fn(),
  listFollowers: vi.fn(),
  listFollowing: vi.fn(),
  listRecommendations: vi.fn(),
  getPrivacySettings: vi.fn(),
  updatePrivacySettings: vi.fn(),
  muteUser: vi.fn(),
  unmuteUser: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 42, role: 'user' };
    return next();
  }
}));

vi.mock('../src/services/SocialGraphService.js', () => ({
  default: socialGraphServiceMock
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  Object.values(socialGraphServiceMock).forEach((fn) => fn.mockReset());
});

describe('Social graph HTTP routes', () => {
  it('lists followers with pagination meta', async () => {
    socialGraphServiceMock.listFollowers.mockResolvedValue({
      items: [
        {
          relationship: { followerId: 91, status: 'accepted' },
          user: { id: 91, firstName: 'Nova' }
        }
      ],
      pagination: { limit: 10, offset: 0, total: 1 },
      viewerContext: { viewerFollowsSubject: true, subjectFollowsViewer: false }
    });

    const response = await request(app).get('/api/v1/social/followers?limit=10').set('Authorization', 'Bearer test');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.pagination.limit).toBe(10);
    expect(response.body.meta.viewerContext.viewerFollowsSubject).toBe(true);
    expect(socialGraphServiceMock.listFollowers).toHaveBeenCalledWith(42, 42, expect.objectContaining({ limit: 10 }));
  });

  it('creates a follow relationship via POST', async () => {
    socialGraphServiceMock.followUser.mockResolvedValue({ status: 'accepted' });

    const response = await request(app)
      .post('/api/v1/social/follows/55')
      .set('Authorization', 'Bearer test')
      .send({ source: 'profile-card' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User followed');
    expect(socialGraphServiceMock.followUser).toHaveBeenCalledWith(42, '55', expect.objectContaining({ source: 'profile-card' }));
  });

  it('approves a pending follow request', async () => {
    socialGraphServiceMock.approveFollow.mockResolvedValue({ status: 'accepted' });

    const response = await request(app)
      .post('/api/v1/social/users/42/followers/91/approve')
      .set('Authorization', 'Bearer test');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Follow request approved');
    expect(socialGraphServiceMock.approveFollow).toHaveBeenCalledWith('42', '91', 42);
  });

  it('applies a mute to a user', async () => {
    socialGraphServiceMock.muteUser.mockResolvedValue({ mutedUserId: 91 });

    const response = await request(app)
      .post('/api/v1/social/mutes/91')
      .set('Authorization', 'Bearer test')
      .send({ durationMinutes: 120, reason: 'Focus hours' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Mute applied');
    expect(socialGraphServiceMock.muteUser).toHaveBeenCalledWith(42, '91', expect.objectContaining({ durationMinutes: 120 }));
  });

  it('returns follow recommendations', async () => {
    socialGraphServiceMock.listRecommendations.mockResolvedValue([
      {
        recommendation: { score: 88 },
        user: { id: 33, firstName: 'Remy' }
      }
    ]);

    const response = await request(app)
      .get('/api/v1/social/recommendations?limit=5')
      .set('Authorization', 'Bearer test');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(socialGraphServiceMock.listRecommendations).toHaveBeenCalledWith(42, expect.objectContaining({ limit: 5 }));
  });
});
