import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const complianceServiceMock = {
  listDsrRequests: vi.fn(),
  assignDsrRequest: vi.fn(),
  updateDsrStatus: vi.fn(),
  listConsentRecords: vi.fn(),
  createConsentRecord: vi.fn(),
  revokeConsent: vi.fn(),
  fetchPolicyTimeline: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 9001, role: 'admin', email: 'ops@edulure.test' };
    return next();
  }
}));

vi.mock('../src/services/ComplianceService.js', () => ({
  default: vi.fn().mockImplementation(() => complianceServiceMock)
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
  complianceServiceMock.listDsrRequests.mockResolvedValue({ data: [], total: 0, overdue: 0 });
  complianceServiceMock.assignDsrRequest.mockResolvedValue({ id: 1, status: 'in_review' });
  complianceServiceMock.updateDsrStatus.mockResolvedValue({ id: 1, status: 'completed' });
  complianceServiceMock.listConsentRecords.mockResolvedValue([]);
  complianceServiceMock.createConsentRecord.mockResolvedValue({ id: 10, status: 'granted' });
  complianceServiceMock.revokeConsent.mockResolvedValue({ id: 10, status: 'revoked' });
  complianceServiceMock.fetchPolicyTimeline.mockResolvedValue([]);
});

describe('Compliance HTTP routes', () => {
  it('returns paginated DSR requests with query filters applied', async () => {
    const response = await request(app)
      .get('/api/v1/compliance/dsr/requests')
      .query({ status: 'open', dueBefore: '2025-02-01', limit: '5', offset: '15' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(complianceServiceMock.listDsrRequests).toHaveBeenCalledWith({
      status: 'open',
      dueBefore: '2025-02-01',
      limit: 5,
      offset: 15
    });
  });

  it('exposes dueInHours and deadlineState for each DSR entry', async () => {
    complianceServiceMock.listDsrRequests.mockResolvedValueOnce({
      data: [
        {
          id: 99,
          requestType: 'access',
          status: 'in_review',
          dueInHours: 6.5,
          deadlineState: 'due_soon'
        }
      ],
      total: 1,
      overdue: 0
    });

    const response = await request(app).get('/api/v1/compliance/dsr/requests');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.data[0]).toEqual(
      expect.objectContaining({
        id: 99,
        requestType: 'access',
        status: 'in_review',
        dueInHours: 6.5,
        deadlineState: 'due_soon'
      })
    );
  });

  it('validates assign payloads before delegating to the service', async () => {
    const response = await request(app).post('/api/v1/compliance/dsr/requests/44/assign').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(complianceServiceMock.assignDsrRequest).not.toHaveBeenCalled();
  });

  it('assigns DSR requests with actor metadata when payload is valid', async () => {
    const response = await request(app)
      .post('/api/v1/compliance/dsr/requests/44/assign')
      .send({ assigneeId: 'trust-analyst-7' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(complianceServiceMock.assignDsrRequest).toHaveBeenCalledWith({
      requestId: 44,
      assigneeId: 'trust-analyst-7',
      actor: { id: 9001, role: 'admin', type: 'user' },
      requestContext: expect.objectContaining({
        requestId: expect.any(String),
        ipAddress: expect.any(String),
        method: 'POST'
      })
    });
  });

  it('requires a status value when updating a DSR', async () => {
    const response = await request(app)
      .post('/api/v1/compliance/dsr/requests/77/status')
      .send({ resolutionNotes: 'Waiting on legal review' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('status');
    expect(complianceServiceMock.updateDsrStatus).not.toHaveBeenCalled();
  });

  it('updates DSR status and passes through actor context', async () => {
    const response = await request(app)
      .post('/api/v1/compliance/dsr/requests/77/status')
      .send({ status: 'completed', resolutionNotes: 'Delivered report to user' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(complianceServiceMock.updateDsrStatus).toHaveBeenCalledWith({
      requestId: 77,
      status: 'completed',
      resolutionNotes: 'Delivered report to user',
      actor: { id: 9001, role: 'admin', type: 'user' },
      requestContext: expect.objectContaining({
        requestId: expect.any(String),
        ipAddress: expect.any(String),
        method: 'POST'
      })
    });
  });

  it('loads consent records for a user', async () => {
    const response = await request(app).get('/api/v1/compliance/consents/321');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(complianceServiceMock.listConsentRecords).toHaveBeenCalledWith(321);
  });

  it('rejects consent creation when mandatory fields are missing', async () => {
    const response = await request(app).post('/api/v1/compliance/consents').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(complianceServiceMock.createConsentRecord).not.toHaveBeenCalled();
  });

  it('creates consent records with actor metadata when payload is valid', async () => {
    const response = await request(app)
      .post('/api/v1/compliance/consents')
      .send({
        userId: 501,
        consentType: 'marketing',
        policyVersion: '2025-02',
        channel: 'web_form',
        metadata: { region: 'EU' }
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(complianceServiceMock.createConsentRecord).toHaveBeenCalledWith({
      userId: 501,
      consentType: 'marketing',
      policyVersion: '2025-02',
      channel: 'web_form',
      metadata: { region: 'EU' },
      evidenceCiphertext: undefined,
      actor: { id: 9001, role: 'admin', type: 'user' },
      requestContext: expect.objectContaining({
        method: 'POST',
        requestId: expect.any(String)
      })
    });
  });

  it('revokes consent entries with actor and optional reason', async () => {
    const response = await request(app)
      .post('/api/v1/compliance/consents/10/revoke')
      .send({ reason: 'User requested erasure' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(complianceServiceMock.revokeConsent).toHaveBeenCalledWith({
      consentId: 10,
      reason: 'User requested erasure',
      actor: { id: 9001, role: 'admin', type: 'user' },
      requestContext: expect.objectContaining({
        method: 'POST',
        requestId: expect.any(String)
      })
    });
  });

  it('fetches policy timelines with optional filtering', async () => {
    const response = await request(app)
      .get('/api/v1/compliance/policies')
      .query({ policyKey: 'privacy' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(complianceServiceMock.fetchPolicyTimeline).toHaveBeenCalledWith({ policyKey: 'privacy' });
  });
});
