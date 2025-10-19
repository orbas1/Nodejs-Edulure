import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.js', () => ({
  __esModule: true,
  default: () => (req, _res, next) => {
    req.user = { id: 1, role: 'admin', tenantId: 'global' };
    return next();
  }
}));

const serviceMock = {
  getOverview: vi.fn(),
  listContracts: vi.fn(),
  updateContract: vi.fn(),
  listVendorAssessments: vi.fn(),
  recordVendorAssessmentDecision: vi.fn(),
  listReviewCycles: vi.fn(),
  recordReviewAction: vi.fn(),
  listCommunications: vi.fn(),
  scheduleCommunication: vi.fn(),
  recordCommunicationMetrics: vi.fn()
};

vi.mock('../src/services/GovernanceStakeholderService.js', () => ({
  __esModule: true,
  default: serviceMock
}));

let app;

describe('Governance HTTP routes', () => {
  beforeAll(async () => {
    ({ default: app } = await import('../src/app.js'));
  });

  it('returns governance overview payload', async () => {
    serviceMock.getOverview.mockResolvedValue({
      contracts: { summary: { totalContracts: 3 }, upcomingRenewals: [] },
      vendorAssessments: { summary: { totalAssessments: 2 } }
    });

    const response = await request(app).get('/api/v1/governance/overview');

    expect(response.status).toBe(200);
    expect(response.body.data.contracts.summary.totalContracts).toBe(3);
  });

  it('lists contracts with filters', async () => {
    serviceMock.listContracts.mockResolvedValue({ total: 1, items: [{ publicId: 'contract-1' }] });

    const response = await request(app).get('/api/v1/governance/contracts?status=active&limit=5');

    expect(response.status).toBe(200);
    expect(serviceMock.listContracts).toHaveBeenCalledWith(
      expect.objectContaining({ status: ['active'] }),
      expect.objectContaining({ limit: '5' })
    );
    expect(response.body.data.items[0].publicId).toBe('contract-1');
  });

  it('updates contract details', async () => {
    serviceMock.updateContract.mockResolvedValue({ publicId: 'contract-1', status: 'active' });

    const response = await request(app)
      .patch('/api/v1/governance/contracts/contract-1')
      .send({ status: 'active' });

    expect(response.status).toBe(200);
    expect(serviceMock.updateContract).toHaveBeenCalledWith('contract-1', expect.objectContaining({ status: 'active' }));
  });

  it('records vendor assessment decisions', async () => {
    serviceMock.recordVendorAssessmentDecision.mockResolvedValue({ publicId: 'assessment-1', status: 'approved' });

    const response = await request(app)
      .post('/api/v1/governance/vendor-assessments/assessment-1/decisions')
      .send({ status: 'approved' });

    expect(response.status).toBe(200);
    expect(serviceMock.recordVendorAssessmentDecision).toHaveBeenCalledWith(
      'assessment-1',
      expect.objectContaining({ status: 'approved' })
    );
  });

  it('appends review action items', async () => {
    serviceMock.recordReviewAction.mockResolvedValue({ publicId: 'review-1', openActionItems: 2 });

    const response = await request(app)
      .post('/api/v1/governance/review-cycles/review-1/action-items')
      .send({ summary: 'Gather notes' });

    expect(response.status).toBe(200);
    expect(serviceMock.recordReviewAction).toHaveBeenCalledWith(
      'review-1',
      expect.objectContaining({ summary: 'Gather notes' })
    );
    expect(response.body.data.openActionItems).toBe(2);
  });

  it('schedules communications and returns 201', async () => {
    serviceMock.scheduleCommunication.mockResolvedValue({ publicId: 'comm-1', status: 'scheduled' });

    const response = await request(app)
      .post('/api/v1/governance/communications')
      .send({ audience: 'executive-sponsors', channel: 'webinar' });

    expect(response.status).toBe(201);
    expect(serviceMock.scheduleCommunication).toHaveBeenCalled();
  });

  it('records communication metrics', async () => {
    serviceMock.recordCommunicationMetrics.mockResolvedValue({ publicId: 'comm-1', metrics: { delivered: 20 } });

    const response = await request(app)
      .post('/api/v1/governance/communications/comm-1/metrics')
      .send({ delivered: 20 });

    expect(response.status).toBe(200);
    expect(serviceMock.recordCommunicationMetrics).toHaveBeenCalledWith('comm-1', expect.objectContaining({ delivered: 20 }));
  });
});
