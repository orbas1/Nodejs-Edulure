import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.js', () => ({
  __esModule: true,
  default: () => (req, _res, next) => {
    req.user = { id: 77, role: 'admin' };
    next();
  }
}));

const paymentServiceMock = {
  createPaymentIntent: vi.fn(),
  capturePayPalOrder: vi.fn(),
  issueRefund: vi.fn(),
  getFinanceSummary: vi.fn(),
  handleStripeWebhook: vi.fn()
};

const couponModelMock = {
  findByCode: vi.fn()
};

vi.mock('../src/services/PaymentService.js', () => ({
  __esModule: true,
  default: paymentServiceMock
}));

vi.mock('../src/models/PaymentCouponModel.js', () => ({
  __esModule: true,
  default: couponModelMock
}));

let app;

describe('Payment HTTP routes', () => {
  beforeAll(async () => {
    const { default: paymentRouter } = await import('../src/routes/payment.routes.js');
    app = express();
    app.use(express.json());
    app.use('/api/v1/payments', paymentRouter);
    app.use((error, _req, res, _next) => {
      const status = error?.status ?? 500;
      res.status(status).json({
        success: false,
        error: error?.message ?? 'Internal Server Error',
        details: error?.details ?? undefined
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    paymentServiceMock.createPaymentIntent.mockResolvedValue({
      publicId: 'pi_123',
      provider: 'stripe',
      clientSecret: 'secret'
    });
    paymentServiceMock.capturePayPalOrder.mockResolvedValue({ status: 'captured' });
    paymentServiceMock.issueRefund.mockResolvedValue({ refundId: 're_123', status: 'succeeded' });
    paymentServiceMock.getFinanceSummary.mockResolvedValue({ grossVolume: 10_000, currency: 'USD' });
    couponModelMock.findByCode.mockResolvedValue({
      code: 'SUMMER10',
      name: 'Summer Special',
      description: '10% off'
    });
  });

  it('creates payment intents after validating payload', async () => {
    const response = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', 'Bearer token')
      .send({
        provider: 'stripe',
        currency: 'USD',
        items: [{ name: 'Course enrolment', unitAmount: 5000, quantity: 1 }],
        metadata: { courseId: 'course-1' }
      });

    expect(response.status).toBe(201);
    expect(response.body.data.publicId).toBe('pi_123');
    expect(paymentServiceMock.createPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'stripe', userId: 77 })
    );
  });

  it('rejects invalid PayPal captures with malformed identifiers', async () => {
    const response = await request(app)
      .post('/api/v1/payments/paypal/invalid id/capture')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(422);
    expect(paymentServiceMock.capturePayPalOrder).not.toHaveBeenCalled();
  });

  it('issues refunds with validated parameters', async () => {
    const response = await request(app)
      .post('/api/v1/payments/pi_valid/refunds')
      .set('Authorization', 'Bearer token')
      .send({ amount: 2000, reason: 'Duplicate order' });

    expect(response.status).toBe(200);
    expect(paymentServiceMock.issueRefund).toHaveBeenCalledWith(
      expect.objectContaining({ paymentPublicId: 'pi_valid', amount: 2000 })
    );
  });

  it('validates finance summary date ranges', async () => {
    const response = await request(app)
      .get('/api/v1/payments/reports/summary')
      .set('Authorization', 'Bearer token')
      .query({ startDate: '2025-03-05', endDate: '2025-03-01' });

    expect(response.status).toBe(422);
    expect(paymentServiceMock.getFinanceSummary).not.toHaveBeenCalled();
  });

  it('returns coupon metadata when found', async () => {
    const response = await request(app)
      .get('/api/v1/payments/coupons/summer10')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.data.code).toBe('SUMMER10');
    expect(couponModelMock.findByCode).toHaveBeenCalledWith('SUMMER10');
  });

  it('returns 404 when coupon is not found', async () => {
    couponModelMock.findByCode.mockResolvedValueOnce(null);

    const response = await request(app)
      .get('/api/v1/payments/coupons/missing')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(404);
  });
});

