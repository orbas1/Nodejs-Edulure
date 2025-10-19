import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMock = {
  listActiveAnnouncements: vi.fn(),
  getAnnouncementDetail: vi.fn(),
  recordAcknowledgement: vi.fn(),
  recordStatusUpdate: vi.fn()
};

vi.mock('../src/services/ProviderTransitionService.js', () => ({
  default: vi.fn(() => serviceMock)
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
  serviceMock.listActiveAnnouncements.mockResolvedValue([
    {
      announcement: {
        id: 1,
        slug: 'provider-migration-q1',
        title: 'Migration timeline Q1',
        summary: 'Transition of classic dashboards to Provider Hub',
        status: 'active',
        effectiveFrom: '2024-11-01T00:00:00.000Z',
        ackRequired: true
      },
      acknowledgements: { total: 12 },
      latestStatus: { statusCode: 'testing', recordedAt: '2024-11-18T10:00:00.000Z' }
    }
  ]);
  serviceMock.getAnnouncementDetail.mockResolvedValue({
    announcement: { slug: 'provider-migration-q1' },
    acknowledgements: { total: 12 },
    timeline: [],
    resources: [],
    recentStatusUpdates: []
  });
  serviceMock.recordAcknowledgement.mockResolvedValue({
    id: 55,
    organisationName: 'Future Skills Ltd',
    ackMethod: 'portal',
    acknowledgedAt: '2024-11-18T10:00:00.000Z'
  });
  serviceMock.recordStatusUpdate.mockResolvedValue({
    id: 9,
    statusCode: 'testing',
    recordedAt: '2024-11-18T10:00:00.000Z'
  });
});

describe('Provider transition HTTP routes', () => {
  it('lists announcements with acknowledgement progress', async () => {
    const response = await request(app).get('/api/v1/provider-transition/announcements');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(serviceMock.listActiveAnnouncements).toHaveBeenCalledWith({ tenantScope: 'global', includeDetails: false });
    expect(response.body.data[0].announcement.slug).toBe('provider-migration-q1');
    expect(response.body.data[0].acknowledgements.total).toBe(12);
  });

  it('validates acknowledgement payloads and returns 422 for invalid submissions', async () => {
    const response = await request(app)
      .post('/api/v1/provider-transition/announcements/provider-migration-q1/acknowledgements')
      .send({ contactEmail: 'invalid' });

    expect(response.status).toBe(422);
    expect(serviceMock.recordAcknowledgement).not.toHaveBeenCalled();
  });

  it('records acknowledgements and status updates', async () => {
    const ackResponse = await request(app)
      .post('/api/v1/provider-transition/announcements/provider-migration-q1/acknowledgements')
      .send({
        organisationName: 'Future Skills Ltd',
        contactName: 'Alex Rivera',
        contactEmail: 'alex@futureskills.com'
      });
    expect(ackResponse.status).toBe(201);
    expect(serviceMock.recordAcknowledgement).toHaveBeenCalledWith(
      'provider-migration-q1',
      expect.objectContaining({ organisationName: 'Future Skills Ltd' }),
      { tenantScope: 'global' }
    );

    const statusResponse = await request(app)
      .post('/api/v1/provider-transition/announcements/provider-migration-q1/status-updates')
      .send({ statusCode: 'testing' });
    expect(statusResponse.status).toBe(201);
    expect(serviceMock.recordStatusUpdate).toHaveBeenCalledWith(
      'provider-migration-q1',
      expect.objectContaining({ statusCode: 'testing' }),
      { tenantScope: 'global' }
    );
  });
});
