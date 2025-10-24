import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.js', () => ({
  __esModule: true,
  default: () => (req, _res, next) => {
    req.user = {
      id: 991,
      email: 'learner@example.com',
      roles: ['user']
    };
    next();
  }
}));

const accountBillingServiceMock = {
  getBillingOverview: vi.fn(),
  listPaymentMethods: vi.fn(),
  listInvoices: vi.fn(),
  createPortalSession: vi.fn()
};

vi.mock('../src/services/AccountBillingService.js', () => ({
  __esModule: true,
  default: accountBillingServiceMock
}));

let app;

describe('Account billing HTTP routes', () => {
  beforeAll(async () => {
    const { default: accountBillingRouter } = await import('../src/routes/accountBilling.routes.js');

    app = express();
    app.use(express.json());
    app.use('/api/v1/account/billing', accountBillingRouter);
    app.use((error, _req, res, _next) => {
      const status = error?.status ?? 500;
      res.status(status).json({
        success: false,
        error: error?.message ?? 'Internal Server Error'
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    accountBillingServiceMock.getBillingOverview.mockResolvedValue({
      planName: 'Pro',
      currency: 'USD',
      statusLabel: 'Active'
    });
    accountBillingServiceMock.listPaymentMethods.mockResolvedValue([
      { id: 'pm_1', brand: 'visa', last4: '4242', default: true }
    ]);
    accountBillingServiceMock.listInvoices.mockResolvedValue([
      { id: 'inv_1', number: 'INV-1001', amountDueCents: 12500 }
    ]);
    accountBillingServiceMock.createPortalSession.mockResolvedValue({
      url: 'https://billing.example.com/session?token=abc',
      expiresAt: new Date('2025-03-26T18:00:00.000Z').toISOString()
    });
  });

  it('returns billing overview payload for authenticated users', async () => {
    const response = await request(app)
      .get('/api/v1/account/billing/overview')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.planName).toBe('Pro');
    expect(accountBillingServiceMock.getBillingOverview).toHaveBeenCalledWith(991);
  });

  it('lists stored payment methods', async () => {
    const response = await request(app)
      .get('/api/v1/account/billing/payment-methods')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0].id).toBe('pm_1');
    expect(accountBillingServiceMock.listPaymentMethods).toHaveBeenCalledWith(991);
  });

  it('lists recent invoices', async () => {
    const response = await request(app)
      .get('/api/v1/account/billing/invoices')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.data[0].number).toBe('INV-1001');
    expect(accountBillingServiceMock.listInvoices).toHaveBeenCalledWith(991);
  });

  it('creates billing portal sessions with contextual metadata', async () => {
    const response = await request(app)
      .post('/api/v1/account/billing/portal-sessions')
      .set('Authorization', 'Bearer token')
      .set('User-Agent', 'Vitest-Agent/1.0')
      .send({ returnUrl: 'https://app.example.com/account/billing' });

    expect(response.status).toBe(201);
    expect(response.body.data.url).toContain('https://billing.example.com');
    expect(accountBillingServiceMock.createPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 991, email: 'learner@example.com', userAgent: 'Vitest-Agent/1.0' }),
      { returnUrl: 'https://app.example.com/account/billing' }
    );
  });

  it('propagates service errors to clients', async () => {
    const error = Object.assign(new Error('Portal disabled'), { status: 503 });
    accountBillingServiceMock.createPortalSession.mockRejectedValueOnce(error);

    const response = await request(app)
      .post('/api/v1/account/billing/portal-sessions')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Portal disabled');
  });
});
