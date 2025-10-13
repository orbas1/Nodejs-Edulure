import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const dashboardServiceMock = {
  getDashboardForUser: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 42, role: 'user', sessionId: 'sess-dashboard' };
    return next();
  }
}));

vi.mock('../src/services/DashboardService.js', () => ({
  default: dashboardServiceMock
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
  dashboardServiceMock.getDashboardForUser.mockResolvedValue({
    profile: { id: 42, name: 'Test User', email: 'user@test.local', avatar: '', title: '', bio: '', stats: [], feedHighlights: [] },
    roles: [{ id: 'learner', label: 'Learner' }],
    dashboards: { learner: { metrics: [], analytics: { learningPace: [], communityEngagement: [] }, upcoming: [], communities: { managed: [], pipelines: [] }, courses: { active: [], recommendations: [] }, calendar: [], tutorBookings: { active: [], history: [] }, ebooks: { library: [], recommendations: [] }, financial: { summary: [], invoices: [] }, notifications: { total: 0, unreadMessages: 0, items: [] }, followers: { followers: 0, following: 0, pending: [], outgoing: [], recommendations: [] }, settings: { privacy: { visibility: 'public', followApprovalRequired: false, shareActivity: true, messagePermission: 'followers' }, messaging: { unreadThreads: 0, notificationsEnabled: true }, communities: [] } } },
    searchIndex: []
  });
});

describe('Dashboard HTTP routes', () => {
  it('returns aggregated dashboard data for the authenticated user', async () => {
    const response = await request(app).get('/api/dashboard/me').set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(dashboardServiceMock.getDashboardForUser).toHaveBeenCalledWith(42);
    expect(response.body.data.profile.id).toBe(42);
  });
});
