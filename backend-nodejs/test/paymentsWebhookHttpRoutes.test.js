import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const dashboardServiceMock = {
  getDashboardForUser: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 1, role: 'user', sessionId: 'stripe-webhook-test' };
    return next();
  }
}));

vi.mock('../src/services/DashboardService.js', () => ({
  default: dashboardServiceMock
}));

import PaymentService from '../src/services/PaymentService.js';

describe('payments webhook routes', () => {
  let app;

  beforeAll(async () => {
    ({ default: app } = await import('../src/app.js'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dashboardServiceMock.getDashboardForUser.mockReset();
  });

  it('captures the raw Stripe payload for signature verification', async () => {
    const signature = 't=1733272570,v1=mock-signature';
    const payload = JSON.stringify({ id: 'evt_test_raw_body', type: 'payment_intent.succeeded' });
    const stripeWebhookSpy = vi
      .spyOn(PaymentService, 'handleStripeWebhook')
      .mockResolvedValue({ success: true });

    await request(app)
      .post('/api/v1/payments/webhooks/stripe')
      .set('stripe-signature', signature)
      .set('content-type', 'application/json')
      .send(payload)
      .expect(200);

    expect(stripeWebhookSpy).toHaveBeenCalledWith(payload, signature);
  });
});

