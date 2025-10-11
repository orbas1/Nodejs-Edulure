import { describe, it, expect, beforeEach, vi } from 'vitest';

const paymentOrderModelMock = {
  create: vi.fn(),
  attachItems: vi.fn(),
  updateById: vi.fn(),
  findById: vi.fn(),
  findByOrderNumber: vi.fn(),
  findByProviderIntentId: vi.fn()
};

const paymentTransactionModelMock = {
  create: vi.fn(),
  updateById: vi.fn(),
  findLatestForOrder: vi.fn(),
  findByProviderReference: vi.fn()
};

const paymentAuditLogMock = {
  record: vi.fn()
};

const commerceCouponMock = {
  findActiveByCode: vi.fn(),
  incrementRedemption: vi.fn(),
  cancelRedemption: vi.fn()
};

const commerceTaxRateMock = {
  resolve: vi.fn()
};

const paymentRefundMock = {
  create: vi.fn(),
  updateById: vi.fn(),
  findByProviderReference: vi.fn()
};

const transactionMock = vi.fn(async (callback) => callback({}));

vi.mock('../src/models/PaymentOrderModel.js', () => ({
  __esModule: true,
  default: paymentOrderModelMock
}));

vi.mock('../src/models/PaymentTransactionModel.js', () => ({
  __esModule: true,
  default: paymentTransactionModelMock
}));

vi.mock('../src/models/PaymentAuditLogModel.js', () => ({
  __esModule: true,
  default: paymentAuditLogMock
}));

vi.mock('../src/models/CommerceCouponModel.js', () => ({
  __esModule: true,
  default: commerceCouponMock
}));

vi.mock('../src/models/CommerceTaxRateModel.js', () => ({
  __esModule: true,
  default: commerceTaxRateMock
}));

vi.mock('../src/models/PaymentRefundModel.js', () => ({
  __esModule: true,
  default: paymentRefundMock
}));

vi.mock('../src/config/database.js', () => ({
  __esModule: true,
  default: {
    transaction: transactionMock
  }
}));

describe('PaymentService', () => {
  let PaymentService;
  let stripeModule;
  let paypalModule;

  beforeEach(async () => {
    vi.resetModules();

    Object.values(paymentOrderModelMock).forEach((fn) => fn.mockReset?.());
    Object.values(paymentTransactionModelMock).forEach((fn) => fn.mockReset?.());
    Object.values(paymentAuditLogMock).forEach((fn) => fn.mockReset?.());
    Object.values(commerceCouponMock).forEach((fn) => fn.mockReset?.());
    Object.values(commerceTaxRateMock).forEach((fn) => fn.mockReset?.());
    Object.values(paymentRefundMock).forEach((fn) => fn.mockReset?.());
    transactionMock.mockClear();

    stripeModule = await import('stripe');
    const stripeMock = stripeModule.default.__mock;
    stripeMock.paymentIntents.create.mockReset();
    stripeMock.paymentIntents.retrieve.mockReset();
    stripeMock.paymentIntents.confirm.mockReset();
    stripeMock.paymentIntents.capture.mockReset();
    stripeMock.refunds.create.mockReset();
    stripeMock.webhooks.constructEvent.mockReset();

    paypalModule = await import('@paypal/checkout-server-sdk');
    paypalModule.__mock.execute.mockReset();

    PaymentService = (await import('../src/services/PaymentService.js')).default;
  });

  it('creates a Stripe order with tax computation and returns client secret', async () => {
    const stripeMock = stripeModule.default.__mock;
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_stripe_1',
      status: 'requires_payment_method',
      client_secret: 'cs_test_123',
      payment_method_types: ['card']
    });

    paymentOrderModelMock.create.mockResolvedValue(101);
    paymentOrderModelMock.attachItems.mockResolvedValue(undefined);
    paymentTransactionModelMock.create.mockResolvedValue(301);
    paymentOrderModelMock.findById.mockResolvedValue({
      id: 101,
      orderNumber: 'ORD-2024-0001',
      totalAmount: 325.5,
      currency: 'USD',
      items: []
    });

    commerceCouponMock.findActiveByCode.mockResolvedValue(null);
    commerceTaxRateMock.resolve.mockResolvedValue({
      id: 55,
      ratePercentage: 8.5,
      label: 'California'
    });

    const result = await PaymentService.createOrder({
      user: { id: 77, email: 'learner@example.com' },
      currency: 'usd',
      paymentProvider: 'stripe',
      couponCode: null,
      billing: { country: 'US', region: 'CA', email: 'billing@example.com' },
      items: [
        { itemType: 'course', name: 'Ops Blueprint', unitAmount: 220, quantity: 1 },
        { itemType: 'ebook', name: 'Systems Thinking', unitAmount: 100, quantity: 1 }
      ]
    });

    expect(paymentOrderModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 77,
        subtotalAmount: 320,
        discountAmount: 0,
        taxAmount: 27.2,
        totalAmount: 347.2,
        paymentProvider: 'stripe'
      }),
      expect.any(Object)
    );
    expect(paymentOrderModelMock.attachItems).toHaveBeenCalledWith(
      101,
      expect.arrayContaining([
        expect.objectContaining({ name: 'Ops Blueprint', taxAmount: expect.any(Number) }),
        expect.objectContaining({ name: 'Systems Thinking', taxAmount: expect.any(Number) })
      ]),
      expect.any(Object)
    );
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: expect.any(Number),
        currency: 'usd'
      })
    );
    expect(result.payment.clientSecret).toBe('cs_test_123');
    expect(result.order.orderNumber).toBe('ORD-2024-0001');
  });

  it('applies percentage coupon and records metadata', async () => {
    const stripeMock = stripeModule.default.__mock;
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_coupon',
      status: 'requires_payment_method',
      client_secret: 'secret'
    });

    paymentOrderModelMock.create.mockResolvedValue(20);
    paymentOrderModelMock.attachItems.mockResolvedValue(undefined);
    paymentTransactionModelMock.create.mockResolvedValue(40);
    paymentOrderModelMock.findById.mockResolvedValue({
      id: 20,
      orderNumber: 'ORD-2024-0002',
      totalAmount: 225,
      currency: 'USD',
      metadata: { couponCode: 'LAUNCH25' },
      items: []
    });

    commerceCouponMock.findActiveByCode.mockResolvedValue({
      id: 10,
      code: 'LAUNCH25',
      discountType: 'percentage',
      discountValue: 25,
      currency: 'USD',
      stackable: false,
      redemptionCount: 0
    });
    commerceTaxRateMock.resolve.mockResolvedValue(null);

    const result = await PaymentService.createOrder({
      user: { id: 5, email: 'coupon@example.com' },
      currency: 'USD',
      paymentProvider: 'stripe',
      couponCode: 'LAUNCH25',
      items: [
        { itemType: 'course', name: 'Flagship', unitAmount: 300 }
      ]
    });

    expect(paymentOrderModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        discountAmount: 75,
        totalAmount: 225,
        appliedCouponId: 10
      }),
      expect.any(Object)
    );
    expect(result.order.metadata.couponCode).toBe('LAUNCH25');
  });

  it('captures a Stripe order and increments coupon redemption', async () => {
    const stripeMock = stripeModule.default.__mock;
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'requires_action', id: 'pi_capture' });
    stripeMock.paymentIntents.confirm.mockResolvedValue({ status: 'succeeded', id: 'pi_capture' });

    paymentOrderModelMock.findByOrderNumber.mockResolvedValue({
      id: 70,
      orderNumber: 'ORD-2024-0003',
      status: 'awaiting_payment',
      paymentProvider: 'stripe',
      providerIntentId: 'pi_capture',
      totalAmount: 150,
      currency: 'USD',
      appliedCouponId: 2,
      metadata: { couponRedemptionRecorded: false }
    });
    paymentTransactionModelMock.findLatestForOrder.mockResolvedValue({ id: 900 });
    paymentOrderModelMock.findById.mockResolvedValue({
      id: 70,
      orderNumber: 'ORD-2024-0003',
      status: 'completed',
      totalAmount: 150,
      currency: 'USD'
    });

    const order = await PaymentService.captureOrder({ orderNumber: 'ORD-2024-0003', performedBy: 99 });

    expect(stripeMock.paymentIntents.confirm).toHaveBeenCalledWith('pi_capture');
    expect(paymentTransactionModelMock.updateById).toHaveBeenCalledWith(
      900,
      expect.objectContaining({ status: 'succeeded', transaction_type: 'capture' }),
      expect.any(Object)
    );
    expect(commerceCouponMock.incrementRedemption).toHaveBeenCalledWith(2, expect.any(Object));
    expect(order.status).toBe('completed');
  });

  it('processes Stripe webhook success and updates order state', async () => {
    const stripeMock = stripeModule.default.__mock;
    const webhookEvent = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_webhook' } } };
    stripeMock.webhooks.constructEvent.mockReturnValue(webhookEvent);

    paymentOrderModelMock.findByProviderIntentId.mockResolvedValue({
      id: 33,
      status: 'awaiting_payment',
      paymentProvider: 'stripe',
      totalAmount: 90,
      currency: 'USD',
      appliedCouponId: 7,
      metadata: { couponRedemptionRecorded: false }
    });
    paymentTransactionModelMock.findLatestForOrder.mockResolvedValue({ id: 800 });

    await PaymentService.handleStripeWebhook({ rawBody: Buffer.from('{}'), signature: 'sig' });

    expect(stripeMock.webhooks.constructEvent).toHaveBeenCalled();
    expect(paymentOrderModelMock.updateById).toHaveBeenCalledWith(
      33,
      expect.objectContaining({ status: 'completed' }),
      expect.any(Object)
    );
    expect(paymentTransactionModelMock.updateById).toHaveBeenCalledWith(
      800,
      expect.objectContaining({ status: 'succeeded' }),
      expect.any(Object)
    );
    expect(commerceCouponMock.incrementRedemption).toHaveBeenCalledWith(7, expect.any(Object));
  });

  it('creates a PayPal order and surfaces approval URL', async () => {
    paypalModule.__mock.execute.mockResolvedValueOnce({
      result: {
        id: 'PAYPAL-ORDER-1',
        status: 'CREATED',
        links: [{ rel: 'approve', href: 'https://paypal.test/checkout' }]
      }
    });

    paymentOrderModelMock.create.mockResolvedValue(501);
    paymentOrderModelMock.attachItems.mockResolvedValue(undefined);
    paymentTransactionModelMock.create.mockResolvedValue(601);
    paymentOrderModelMock.findById.mockResolvedValue({
      id: 501,
      orderNumber: 'ORD-2024-0004',
      totalAmount: 180,
      currency: 'EUR',
      items: []
    });

    commerceCouponMock.findActiveByCode.mockResolvedValue(null);
    commerceTaxRateMock.resolve.mockResolvedValue(null);

    const result = await PaymentService.createOrder({
      user: { id: 12, email: 'paypal@example.com' },
      currency: 'EUR',
      paymentProvider: 'paypal',
      items: [{ itemType: 'subscription', name: 'Membership', unitAmount: 180 }],
      metadata: { returnUrl: 'https://app.test/return', cancelUrl: 'https://app.test/cancel' }
    });

    expect(paypalModule.__mock.execute).toHaveBeenCalled();
    expect(result.payment.approvalUrl).toBe('https://paypal.test/checkout');
    expect(result.payment.provider).toBe('paypal');
  });
});
