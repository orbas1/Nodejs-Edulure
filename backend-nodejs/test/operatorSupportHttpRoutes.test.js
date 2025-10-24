import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMock = {
  getOverview: vi.fn(),
  listTenants: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 7, role: 'admin', tenantId: 'global' };
    return next();
  }
}));

vi.mock('../src/services/SupportOperationsService.js', () => ({
  default: vi.fn(() => serviceMock)
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
  serviceMock.getOverview.mockResolvedValue({
    tenantId: 'global',
    generatedAt: '2025-02-04T09:30:00Z',
    queue: {
      stats: {
        open: 3,
        breached: 1,
        awaitingAssignment: 1,
        firstResponseMinutes: 32,
        resolutionMinutes: 65,
        slaAttainment: 0.66,
        csat: 0.84,
        nps: 42
      },
      backlogTrend: [
        { id: '2025-02-01', date: '2025-02-01', open: 1 },
        { id: '2025-02-02', date: '2025-02-02', open: 2 }
      ],
      items: [
        {
          id: 1,
          reference: 'SUP-1001',
          subject: 'Live classroom session frozen',
          priority: 'high',
          status: 'waiting',
          channel: 'Portal',
          slaBreached: false,
          waitingSince: '2025-02-01T08:30:00Z',
          lastUpdated: '2025-02-01T09:10:00Z',
          sentiment: 'neutral',
          unreadMessages: 0,
          tags: ['live-classroom'],
          requester: { id: 99, name: 'Ada Lovelace', organisation: null, email: 'ada@example.test' },
          assignee: { id: 'Mira Patel', name: 'Mira Patel', email: null },
          escalationLevel: 'L1'
        }
      ]
    },
    communications: {
      scheduled: [],
      recent: [],
      playbooks: []
    },
    knowledgeBase: {
      totalArticles: 3,
      flaggedArticles: [],
      drafts: []
    },
    automation: {
      workflows: [],
      health: { total: 0, active: 0, paused: 0 }
    },
    settings: {
      notificationPolicies: [],
      channels: { email: false, sms: false, push: false, inApp: true },
      responseTargets: []
    },
    onboarding: {
      checklists: [],
      playbooks: []
    }
  });

  serviceMock.listTenants.mockResolvedValue({
    items: [
      { id: 'global', name: 'Global Workspace', status: 'active', region: 'US', timezone: 'UTC' },
      { id: 'enterprise', name: 'Enterprise North', status: 'active', region: 'CA', timezone: 'America/Toronto' }
    ],
    defaultTenantId: 'global'
  });
});

describe('Operator support HTTP routes', () => {
  it('returns support overview for the requested tenant', async () => {
    const response = await request(app)
      .get('/api/v1/operator/support/overview')
      .query({ tenantId: 'global' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(serviceMock.getOverview).toHaveBeenCalledWith({ tenantId: 'global' });
    expect(response.body.data.queue.stats.open).toBe(3);
    expect(response.body.data.queue.items[0].reference).toBe('SUP-1001');
  });

  it('returns the list of operator support tenants', async () => {
    const response = await request(app)
      .get('/api/v1/operator/support/tenants')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(serviceMock.listTenants).toHaveBeenCalledTimes(1);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.defaultTenantId).toBe('global');
  });
});

