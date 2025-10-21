import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 42, tenantId: 'global' };
    next();
  }
}));

const serviceMock = {
  createPaymentMethod: vi.fn(),
  updatePaymentMethod: vi.fn(),
  removePaymentMethod: vi.fn(),
  deleteBillingContact: vi.fn(),
  getSystemPreferences: vi.fn(),
  updateSystemPreferences: vi.fn(),
  getFinanceSettings: vi.fn(),
  updateFinanceSettings: vi.fn(),
  createFinancePurchase: vi.fn(),
  updateFinancePurchase: vi.fn(),
  deleteFinancePurchase: vi.fn(),
  createGrowthInitiative: vi.fn(),
  updateGrowthInitiative: vi.fn(),
  deleteGrowthInitiative: vi.fn(),
  createGrowthExperiment: vi.fn(),
  updateGrowthExperiment: vi.fn(),
  deleteGrowthExperiment: vi.fn(),
  createAffiliateChannel: vi.fn(),
  updateAffiliateChannel: vi.fn(),
  deleteAffiliateChannel: vi.fn(),
  recordAffiliatePayout: vi.fn(),
  createAdCampaign: vi.fn(),
  updateAdCampaign: vi.fn(),
  deleteAdCampaign: vi.fn(),
  getInstructorApplication: vi.fn(),
  upsertInstructorApplication: vi.fn(),
  submitInstructorApplication: vi.fn(),
  createTutorBookingRequest: vi.fn(),
  listTutorBookings: vi.fn(),
  updateTutorBooking: vi.fn(),
  cancelTutorBooking: vi.fn(),
  exportTutorSchedule: vi.fn(),
  updateTutorBookingRequest: vi.fn(),
  cancelTutorBookingRequest: vi.fn(),
  createCourseGoal: vi.fn(),
  resumeEbook: vi.fn(),
  shareEbook: vi.fn(),
  createLearnerLibraryEntry: vi.fn(),
  updateLearnerLibraryEntry: vi.fn(),
  deleteLearnerLibraryEntry: vi.fn(),
  downloadInvoice: vi.fn(),
  updateBillingPreferences: vi.fn(),
  joinLiveSession: vi.fn(),
  checkInToLiveSession: vi.fn(),
  triggerCommunityAction: vi.fn(),
  createFieldServiceAssignment: vi.fn(),
  updateFieldServiceAssignment: vi.fn(),
  closeFieldServiceAssignment: vi.fn(),
  listSupportTickets: vi.fn(),
  createSupportTicket: vi.fn(),
  updateSupportTicket: vi.fn(),
  addSupportTicketMessage: vi.fn(),
  closeSupportTicket: vi.fn()
};

vi.mock('../src/services/LearnerDashboardService.js', () => ({
  default: serviceMock
}));

let app;

describe('Learner dashboard HTTP routes', () => {
  beforeAll(async () => {
    const { default: dashboardRouter } = await import('../src/routes/dashboard.routes.js');
    app = express();
    app.use(express.json());
    app.use('/api/v1/dashboard', dashboardRouter);
    app.use((error, _req, res, _next) => {
      const status = error?.status ?? 500;
      res.status(status).json({ success: false, error: error?.message ?? 'Internal Server Error' });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates payment methods with sanitised payloads', async () => {
    serviceMock.createPaymentMethod.mockResolvedValue({ id: 'pm-1', primary: true });

    const response = await request(app)
      .post('/api/v1/dashboard/learner/financial/payment-methods')
      .send({
        label: '  Primary Card  ',
        brand: '  Visa  ',
        last4: ' 12-34 ',
        expiry: ' 12-2030 ',
        primary: 'true',
        metadata: { note: '  keep  ' }
      })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(serviceMock.createPaymentMethod).toHaveBeenCalledWith(42, {
      label: 'Primary Card',
      brand: 'Visa',
      last4: '1234',
      expiry: '12/30',
      primary: true,
      metadata: { note: 'keep' }
    });
  });

  it('rejects payment method creation when required fields are missing', async () => {
    const response = await request(app)
      .post('/api/v1/dashboard/learner/financial/payment-methods')
      .send({ brand: 'Visa', last4: '1234', expiry: '12/30' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Payment method label is required');
    expect(serviceMock.createPaymentMethod).not.toHaveBeenCalled();
  });

  it('normalises growth initiative payloads before delegating to the service', async () => {
    serviceMock.createGrowthInitiative.mockResolvedValue({ id: 'gi-1', slug: 'growth-test' });

    const response = await request(app)
      .post('/api/v1/dashboard/learner/growth/initiatives')
      .send({
        slug: ' Growth Test  ',
        title: '  Expand reach  ',
        tags: [' focus ', 'Focus', ''],
        metadata: { owner: '  marketing  ' }
      })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(serviceMock.createGrowthInitiative).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        slug: 'growth-test',
        title: 'Expand reach',
        tags: ['focus'],
        metadata: { owner: 'marketing' }
      })
    );
  });

  it('requires a positive amount when recording affiliate payouts', async () => {
    const response = await request(app)
      .post('/api/v1/dashboard/learner/affiliate/channels/ch-1/payouts')
      .send({ status: 'paid' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('An amountCents value is required to record a payout');
    expect(serviceMock.recordAffiliatePayout).not.toHaveBeenCalled();
  });

  it('records affiliate payouts with sanitised metadata', async () => {
    serviceMock.recordAffiliatePayout.mockResolvedValue({ id: 'payout-1' });

    const response = await request(app)
      .post('/api/v1/dashboard/learner/affiliate/channels/ch-9/payouts')
      .send({
        amountCents: ' 5000 ',
        status: ' paid ',
        note: '  cleared ',
        metadata: { confirmer: '  ops  ' }
      })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(serviceMock.recordAffiliatePayout).toHaveBeenCalledWith(42, 'ch-9', {
      amountCents: 5000,
      currency: 'USD',
      status: 'paid',
      scheduledAt: undefined,
      processedAt: undefined,
      reference: null,
      note: 'cleared',
      metadata: { confirmer: 'ops' }
    });
  });

  it('creates support tickets and enforces required subject', async () => {
    serviceMock.createSupportTicket.mockResolvedValue({ id: 'case-1', subject: 'Help' });

    const response = await request(app)
      .post('/api/v1/dashboard/learner/support/tickets')
      .send({ subject: '  Help  ', description: '  Need assistance ' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(serviceMock.createSupportTicket).toHaveBeenCalledWith(42, {
      subject: 'Help',
      description: 'Need assistance'
    });

    const errorResponse = await request(app)
      .post('/api/v1/dashboard/learner/support/tickets')
      .send({ description: 'Missing subject' })
      .set('Authorization', 'Bearer token');

    expect(errorResponse.status).toBe(400);
    expect(errorResponse.body.error).toBe('Subject is required to create a support ticket');
  });

  it('validates support ticket replies require content', async () => {
    const errorResponse = await request(app)
      .post('/api/v1/dashboard/learner/support/tickets/tk-1/messages')
      .send({})
      .set('Authorization', 'Bearer token');

    expect(errorResponse.status).toBe(400);
    expect(errorResponse.body.error).toBe('Message content is required');
    expect(serviceMock.addSupportTicketMessage).not.toHaveBeenCalled();

    serviceMock.addSupportTicketMessage.mockResolvedValue({ id: 'msg-1', body: 'Hello' });

    const response = await request(app)
      .post('/api/v1/dashboard/learner/support/tickets/tk-2/messages')
      .send({ body: '  Hello  ' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(serviceMock.addSupportTicketMessage).toHaveBeenCalledWith(42, 'tk-2', {
      body: 'Hello'
    });
  });
});
