import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMock = {
  getOverview: vi.fn(),
  listTenants: vi.fn(),
  assignTicket: vi.fn(),
  escalateTicket: vi.fn(),
  resolveTicket: vi.fn(),
  scheduleBroadcast: vi.fn(),
  updateNotificationPolicy: vi.fn()
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

  serviceMock.assignTicket.mockResolvedValue({
    id: 42,
    reference: 'SUP-2042',
    status: 'in_progress',
    owner: 'agent-7'
  });

  serviceMock.escalateTicket.mockResolvedValue({
    id: 42,
    status: 'escalated',
    escalationLevel: 'L2'
  });

  serviceMock.resolveTicket.mockResolvedValue({
    id: 42,
    status: 'resolved'
  });

  serviceMock.scheduleBroadcast.mockResolvedValue({
    id: 11,
    title: 'Status update',
    channel: 'email',
    status: 'scheduled'
  });

  serviceMock.updateNotificationPolicy.mockResolvedValue({
    id: 5,
    tenantId: 'global',
    channels: { email: true, sms: false },
    updatedAt: '2025-02-04T10:00:00Z'
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

  it('assigns a support ticket to the requesting agent', async () => {
    const response = await request(app)
      .patch('/api/v1/operator/support/tenants/global/tickets/42/assign')
      .set('Authorization', 'Bearer token')
      .send({ assigneeId: 'agent-7' });

    expect(response.status).toBe(200);
    expect(serviceMock.assignTicket).toHaveBeenCalledWith({
      tenantId: 'global',
      ticketId: '42',
      assigneeId: 'agent-7',
      actor: { id: 7, name: null, email: null }
    });
    expect(response.body.data.owner).toBe('agent-7');
  });

  it('escalates a support ticket', async () => {
    const response = await request(app)
      .patch('/api/v1/operator/support/tenants/global/tickets/42/escalate')
      .set('Authorization', 'Bearer token')
      .send({ reason: 'Breaching SLA', target: 'L2' });

    expect(response.status).toBe(200);
    expect(serviceMock.escalateTicket).toHaveBeenCalledWith({
      tenantId: 'global',
      ticketId: '42',
      reason: 'Breaching SLA',
      target: 'L2',
      actor: { id: 7, name: null, email: null }
    });
    expect(response.body.data.status).toBe('escalated');
  });

  it('resolves a support ticket', async () => {
    const response = await request(app)
      .patch('/api/v1/operator/support/tenants/global/tickets/42/resolve')
      .set('Authorization', 'Bearer token')
      .send({ resolution: { summary: 'Handled via dashboard' } });

    expect(response.status).toBe(200);
    expect(serviceMock.resolveTicket).toHaveBeenCalledWith({
      tenantId: 'global',
      ticketId: '42',
      resolution: { summary: 'Handled via dashboard' },
      actor: { id: 7, name: null, email: null }
    });
    expect(response.body.data.status).toBe('resolved');
  });

  it('schedules a support broadcast', async () => {
    const response = await request(app)
      .post('/api/v1/operator/support/tenants/global/communications/broadcasts')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Status update', channel: 'email' });

    expect(response.status).toBe(200);
    expect(serviceMock.scheduleBroadcast).toHaveBeenCalledWith({
      tenantId: 'global',
      payload: { title: 'Status update', channel: 'email' },
      actor: { id: 7, name: null, email: null }
    });
    expect(response.body.data.broadcast.title).toBe('Status update');
  });

  it('updates a notification policy', async () => {
    const response = await request(app)
      .put('/api/v1/operator/support/tenants/global/notification-policies/5')
      .set('Authorization', 'Bearer token')
      .send({ channels: { email: true, sms: false } });

    expect(response.status).toBe(200);
    expect(serviceMock.updateNotificationPolicy).toHaveBeenCalledWith({
      tenantId: 'global',
      policyId: '5',
      updates: { channels: { email: true, sms: false } },
      actor: { id: 7, name: null, email: null }
    });
    expect(response.body.data.id).toBe(5);
  });
});

