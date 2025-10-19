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
    roles: [
      { id: 'learner', label: 'Learner' },
      { id: 'community', label: 'Community' },
      { id: 'instructor', label: 'Instructor' }
    ],
    dashboards: {
      learner: {
        metrics: [],
        analytics: { learningPace: [], communityEngagement: [] },
        upcoming: [],
        communities: { managed: [], pipelines: [] },
        courses: { active: [], recommendations: [] },
        calendar: [],
        tutorBookings: { active: [], history: [] },
        ebooks: { library: [], recommendations: [] },
        financial: { summary: [], invoices: [] },
        notifications: { total: 0, unreadMessages: 0, items: [] },
        assessments: {
          overview: [],
          timeline: { upcoming: [], overdue: [], completed: [] },
          courses: [],
          schedule: { studyPlan: [], events: [] },
          analytics: { byType: [], pendingReviews: 0, overdue: 0, averageLeadTimeDays: null, workloadWeight: 0 },
          resources: []
        },
        followers: { followers: 0, following: 0, pending: [], outgoing: [], recommendations: [] },
        settings: {
          privacy: { visibility: 'public', followApprovalRequired: false, shareActivity: true, messagePermission: 'followers' },
          messaging: { unreadThreads: 0, notificationsEnabled: true },
          communities: []
        }
      },
      community: {
        metrics: [
          {
            label: 'Active members',
            value: '120',
            change: '+8 awaiting approval',
            trend: 'up'
          }
        ],
        health: {
          overview: [
            {
              id: 'community-55',
              name: 'DesignOps Collective',
              health: 'Healthy'
            }
          ]
        },
        operations: { runbooks: [], escalations: [] },
        programming: { upcomingEvents: [], tutorPods: [], broadcasts: [] },
        monetisation: { tiers: [], experiments: [], insights: [] },
        safety: { incidents: [], backlog: [], moderators: [] },
        communications: { highlights: [], broadcasts: [], trends: [] }
      },
      instructor: {
        metrics: [
          {
            label: 'Active learners',
            value: '12',
            change: '+3 last 30d',
            trend: 'up'
          }
        ],
        analytics: { revenueStreams: [] },
        assessments: {
          overview: [],
          timeline: { upcoming: [], overdue: [], completed: [] },
          courses: [],
          grading: { queue: [], flagged: [] },
          schedule: { releasePlan: [], liveSessions: [] },
          analytics: { byType: [], completionRate: null, averageLeadTimeDays: null }
        }
      }
    },
    searchIndex: []
  });
});

describe('Dashboard HTTP routes', () => {
  it('returns aggregated dashboard data for the authenticated user', async () => {
    const response = await request(app).get('/api/v1/dashboard/me').set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(dashboardServiceMock.getDashboardForUser).toHaveBeenCalledWith(42);
    expect(response.body.data.profile.id).toBe(42);
    expect(response.body.data.dashboards.learner.metrics).toBeDefined();
    expect(response.body.data.roles).toContainEqual({ id: 'community', label: 'Community' });
    expect(response.body.data.roles).toContainEqual({ id: 'instructor', label: 'Instructor' });
    expect(response.body.data.dashboards.community.metrics[0].label).toBe('Active members');
    expect(response.body.data.dashboards.instructor.metrics[0].label).toBe('Active learners');
  });
});
