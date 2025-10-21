import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env.js';
import PaymentService from '../src/services/PaymentService.js';

const platformSettingsServiceMock = vi.hoisted(() => ({
  getMonetizationSettings: vi.fn(async () => ({
    commissions: {
      enabled: true,
      rateBps: 250,
      minimumFeeCents: 0
    }
  })),
  calculateCommission: vi.fn(() => 0)
}));

const escrowServiceMock = vi.hoisted(() => ({
  isConfigured: vi.fn(() => true),
  createTransaction: vi.fn()
}));

const monetizationFinanceServiceMock = vi.hoisted(() => ({
  handlePaymentCaptured: vi.fn(async () => undefined),
  handleRefundProcessed: vi.fn(async () => undefined)
}));

const communityAffiliateCommissionServiceMock = vi.hoisted(() => ({
  handlePaymentCaptured: vi.fn(async () => undefined)
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

const { transactionSpy } = vi.hoisted(() => ({
  transactionSpy: vi.fn(async (handler) => handler({ isTransaction: () => true }))
}));

vi.mock('../src/config/database.js', () => ({
  default: {
    transaction: transactionSpy
  }
}));

vi.mock('../src/services/PlatformSettingsService.js', () => ({
  default: platformSettingsServiceMock
}));

vi.mock('../src/services/EscrowService.js', () => ({
  default: escrowServiceMock
}));

vi.mock('../src/services/MonetizationFinanceService.js', () => ({
  default: monetizationFinanceServiceMock
}));

vi.mock('../src/services/CommunityAffiliateCommissionService.js', () => ({
  default: communityAffiliateCommissionServiceMock
}));

const mockedModules = vi.hoisted(() => {
  const paymentIntentModel = {
    create: vi.fn(),
    findById: vi.fn(),
    findByPublicId: vi.fn(),
    findByProviderIntentId: vi.fn(),
    lockByPublicId: vi.fn(),
    updateById: vi.fn(),
    incrementRefundAmount: vi.fn()
  };

  const paymentCouponModel = {
    findActiveForRedemption: vi.fn(),
    countUserRedemptions: vi.fn(),
    findById: vi.fn(),
    recordRedemption: vi.fn()
  };

  const paymentLedgerEntryModel = {
    record: vi.fn()
  };

  const paymentRefundModel = {
    create: vi.fn(),
    findByProviderRefundId: vi.fn()
  };

  return {
    paymentIntentModel,
    paymentCouponModel,
    paymentLedgerEntryModel,
    paymentRefundModel,
    captureMetricsSpy: vi.fn(),
    refundMetricsSpy: vi.fn()
  };
});

const communityLifecycleMock = vi.hoisted(() => ({
  onPaymentSucceeded: vi.fn(),
  onPaymentFailed: vi.fn(),
  onPaymentRefunded: vi.fn()
}));

const webhookEventBusMock = vi.hoisted(() => ({
  publish: vi.fn()
}));

vi.mock('../src/models/PaymentIntentModel.js', () => ({
  default: mockedModules.paymentIntentModel
}));

vi.mock('../src/models/PaymentCouponModel.js', () => ({
  default: mockedModules.paymentCouponModel
}));

vi.mock('../src/models/PaymentLedgerEntryModel.js', () => ({
  default: mockedModules.paymentLedgerEntryModel
}));

vi.mock('../src/models/PaymentRefundModel.js', () => ({
  default: mockedModules.paymentRefundModel
}));

vi.mock('../src/observability/metrics.js', () => ({
  trackPaymentCaptureMetrics: mockedModules.captureMetricsSpy,
  trackPaymentRefundMetrics: mockedModules.refundMetricsSpy
}));

vi.mock('../src/services/CommunitySubscriptionLifecycle.js', () => ({
  onPaymentSucceeded: communityLifecycleMock.onPaymentSucceeded,
  onPaymentFailed: communityLifecycleMock.onPaymentFailed,
  onPaymentRefunded: communityLifecycleMock.onPaymentRefunded
}));

vi.mock('../src/services/WebhookEventBusService.js', () => ({
  default: webhookEventBusMock
}));

const {
  paymentIntentModel,
  paymentCouponModel,
  paymentLedgerEntryModel,
  paymentRefundModel,
  captureMetricsSpy,
  refundMetricsSpy
} = mockedModules;

describe('PaymentService', () => {
  const originalTaxConfig = { ...env.payments.tax };
  const originalAllowedCurrencies = [...env.payments.allowedCurrencies];

  beforeEach(() => {
    vi.clearAllMocks();
    transactionSpy.mockClear();
    transactionSpy.mockImplementation(async (handler) => handler({ isTransaction: () => true }));
    escrowServiceMock.isConfigured.mockReset();
    escrowServiceMock.createTransaction.mockReset();
    escrowServiceMock.isConfigured.mockReturnValue(true);
    monetizationFinanceServiceMock.handlePaymentCaptured.mockClear();
    monetizationFinanceServiceMock.handleRefundProcessed.mockClear();
    communityAffiliateCommissionServiceMock.handlePaymentCaptured.mockClear();
    platformSettingsServiceMock.getMonetizationSettings.mockResolvedValue({
      commissions: {
        enabled: true,
        rateBps: 250,
        minimumFeeCents: 0
      },
      subscriptions: {
        enabled: true,
        restrictedFeatures: [],
        gracePeriodDays: 7,
        restrictOnFailure: true
      },
      payments: {
        defaultProvider: 'stripe',
        stripeEnabled: true,
        escrowEnabled: false
      },
      affiliate: {
        defaultCommission: {
          recurrence: 'infinite',
          maxOccurrences: null,
          tiers: []
        },
        security: {
          blockSelfReferral: true,
          enforceTwoFactorForPayouts: true
        }
      },
      workforce: {
        providerControlsCompensation: true,
        minimumServicemanShareBps: 0,
        recommendedServicemanShareBps: 7500,
        nonCustodialWallets: true,
        complianceNarrative: 'Platform commission remains at 2.5%'
      }
    });
    platformSettingsServiceMock.calculateCommission.mockReturnValue(0);
    communityLifecycleMock.onPaymentSucceeded.mockResolvedValue();
    communityLifecycleMock.onPaymentFailed.mockResolvedValue();
    communityLifecycleMock.onPaymentRefunded.mockResolvedValue();
    webhookEventBusMock.publish.mockResolvedValue();
    env.payments.allowedCurrencies.splice(0, env.payments.allowedCurrencies.length, ...originalAllowedCurrencies);
    env.payments.tax.inclusive = originalTaxConfig.inclusive;
    env.payments.tax.minimumRate = originalTaxConfig.minimumRate;
    env.payments.tax.table = { ...originalTaxConfig.table };
    PaymentService.stripeGateway = null;
    PaymentService.paypalGateway = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates inclusive tax and discounts across line items', () => {
    env.payments.tax.inclusive = true;
    env.payments.tax.minimumRate = 0.05;
    env.payments.tax.table = {
      US: {
        defaultRate: 0.075,
        regions: {
          CA: 0.0825
        }
      }
    };

    const totals = PaymentService.calculateTotals({
      currency: 'USD',
      taxRegion: { country: 'US', region: 'CA', postalCode: '94105' },
      coupon: {
        code: 'SAVE10',
        discountType: 'percentage',
        discountValue: 1000
      },
      items: [
        { id: 'course', name: 'Course', unitAmount: 1000, quantity: 1 },
        { id: 'bundle', name: 'Add-on', unitAmount: 500, quantity: 2, taxExempt: true }
      ]
    });

    expect(totals.subtotal).toBe(2000);
    expect(totals.discount).toBe(100);
    expect(totals.tax).toBe(69);
    expect(totals.total).toBe(1900);
    expect(totals.lineItems[0]).toMatchObject({ discount: 100, tax: 69, total: 900 });
    expect(totals.taxBreakdown).toMatchObject({
      rate: 0.0825,
      jurisdiction: { country: 'US', region: 'CA', postalCode: '94105' },
      inclusive: true,
      discountApplied: 100
    });
  });

  it('creates Stripe payment intents with coupon validation', async () => {
    env.payments.tax.inclusive = false;
    env.payments.tax.minimumRate = 0.05;
    env.payments.tax.table = {
      US: {
        defaultRate: 0.07
      }
    };

    paymentCouponModel.findActiveForRedemption.mockResolvedValue({
      id: 22,
      code: 'SAVE20',
      discountType: 'percentage',
      discountValue: 2000,
      perUserLimit: 3
    });
    paymentCouponModel.countUserRedemptions.mockResolvedValue(1);

    paymentIntentModel.create.mockImplementation(async (payload) => ({
      ...payload,
      id: 10,
      publicId: payload.publicId,
      status: payload.status,
      amountSubtotal: payload.amountSubtotal,
      amountDiscount: payload.amountDiscount,
      amountTax: payload.amountTax,
      amountTotal: payload.amountTotal,
      amountRefunded: payload.amountRefunded,
      taxBreakdown: payload.taxBreakdown,
      metadata: payload.metadata,
      couponId: payload.couponId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      receiptEmail: payload.receiptEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const stripeCreate = vi.fn(async () => ({
      id: 'pi_123',
      client_secret: 'secret_value',
      status: 'requires_payment_method'
    }));

    vi.spyOn(PaymentService, 'getStripeGateway').mockReturnValue({
      createPaymentIntent: stripeCreate
    });

    const result = await PaymentService.createPaymentIntent({
      userId: 'user-1',
      provider: 'stripe',
      currency: 'USD',
      couponCode: 'SAVE20',
      receiptEmail: 'learner@example.com',
      entity: { id: 'course-101', type: 'course', name: 'Course 101' },
      items: [
        { id: 'course', name: 'Course Access', unitAmount: 1200, quantity: 1 },
        { id: 'support', name: 'Support Pack', unitAmount: 300, quantity: 1, taxExempt: true }
      ]
    });

    expect(paymentCouponModel.findActiveForRedemption).toHaveBeenCalledWith(
      'SAVE20',
      'USD',
      expect.anything(),
      expect.any(Date),
      { lock: false }
    );
    expect(paymentCouponModel.countUserRedemptions).toHaveBeenCalledWith(22, 'user-1');
    expect(stripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1308, currency: 'usd', receipt_email: 'learner@example.com' }),
      { idempotencyKey: expect.any(String) }
    );
    expect(paymentIntentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'stripe',
        amountSubtotal: 1500,
        amountDiscount: 240,
        amountTax: 48,
        amountTotal: 1308,
        couponId: 22,
        entityType: 'course',
        entityId: 'course-101',
        receiptEmail: 'learner@example.com'
      })
    );
    expect(result).toMatchObject({
      provider: 'stripe',
      paymentId: expect.any(String),
      clientSecret: 'secret_value',
      totals: {
        subtotal: 1500,
        discount: 240,
        tax: 48,
        total: 1308
      }
    });
  });

  it('creates Escrow payment intents with buyer and seller context', async () => {
    env.payments.tax.inclusive = false;
    env.payments.tax.minimumRate = 0;
    env.payments.tax.table = {};

    const escrowTransaction = {
      id: 'escrow-transaction-1',
      status: 'pending',
      checkoutUrl: 'https://escrow.test/checkout/escrow-transaction-1'
    };

    escrowServiceMock.createTransaction.mockResolvedValue(escrowTransaction);

    paymentIntentModel.create.mockImplementation(async (payload) => ({
      ...payload,
      id: 44,
      publicId: payload.publicId,
      status: payload.status,
      amountSubtotal: payload.amountSubtotal,
      amountDiscount: payload.amountDiscount,
      amountTax: payload.amountTax,
      amountTotal: payload.amountTotal,
      amountRefunded: payload.amountRefunded,
      taxBreakdown: payload.taxBreakdown,
      metadata: payload.metadata,
      couponId: payload.couponId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      receiptEmail: payload.receiptEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const result = await PaymentService.createPaymentIntent({
      userId: 'user-escrow',
      provider: 'escrow',
      currency: 'USD',
      entity: { id: 'order-1', type: 'commerce-item', name: 'Marketplace Order' },
      items: [
        { id: 'item-1', name: 'Service package', unitAmount: 2000, quantity: 1 }
      ],
      escrow: {
        buyer: { email: 'buyer@example.com', firstName: 'Buyer', lastName: 'Example' },
        seller: { email: 'seller@example.com', firstName: 'Seller', lastName: 'Example' },
        description: 'Custom service escrow'
      }
    });

    expect(escrowServiceMock.isConfigured).toHaveBeenCalled();
    expect(escrowServiceMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: expect.any(String),
        amountCents: 2000,
        currency: 'USD',
        description: 'Custom service escrow',
        buyer: { email: 'buyer@example.com', firstName: 'Buyer', lastName: 'Example' },
        seller: { email: 'seller@example.com', firstName: 'Seller', lastName: 'Example' }
      })
    );
    expect(paymentIntentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'escrow',
        status: 'requires_action',
        amountSubtotal: 2000,
        amountDiscount: 0,
        amountTax: 0,
        amountTotal: 2000,
        metadata: expect.objectContaining({
          escrow: escrowTransaction
        })
      })
    );
    expect(result).toEqual({
      provider: 'escrow',
      paymentId: expect.any(String),
      status: 'requires_action',
      totals: {
        subtotal: 2000,
        discount: 0,
        tax: 0,
        total: 2000
      },
      escrow: {
        transactionId: 'escrow-transaction-1',
        status: 'pending',
        redirectUrl: 'https://escrow.test/checkout/escrow-transaction-1'
      }
    });
  });

  it('captures PayPal orders and records ledger entries', async () => {
    const lockedIntent = {
      id: 50,
      publicId: 'pay-123',
      provider: 'paypal',
      providerIntentId: 'ORDER-321',
      status: 'processing',
      currency: 'USD',
      amountSubtotal: 1500,
      amountDiscount: 0,
      amountTax: 90,
      amountTotal: 1590,
      amountRefunded: 0,
      taxBreakdown: {},
      metadata: {},
      couponId: 75,
      userId: 'user-22',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    paymentIntentModel.lockByPublicId.mockResolvedValue(lockedIntent);
    paymentIntentModel.updateById.mockImplementation(async (_id, updates) => ({
      ...lockedIntent,
      ...updates,
      metadata: { ...lockedIntent.metadata, ...updates.metadata }
    }));

    paymentCouponModel.findById.mockResolvedValue({
      id: 75,
      code: 'WINTER25',
      status: 'active',
      validFrom: null,
      validUntil: null,
      maxRedemptions: null,
      perUserLimit: null
    });

    const captureResponse = {
      result: {
        status: 'COMPLETED',
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: 'CAPTURE-111',
                  status: 'COMPLETED',
                  amount: {
                    value: '15.90',
                    currency_code: 'USD'
                  },
                  seller_receivable_breakdown: {
                    paypal_fee: { value: '0.59' }
                  },
                  create_time: '2024-11-12T10:00:00Z'
                }
              ]
            }
          }
        ]
      }
    };

    const captureSpy = vi.fn(async () => captureResponse);

    vi.spyOn(PaymentService, 'getPayPalGateway').mockReturnValue({
      captureOrder: captureSpy
    });

    const result = await PaymentService.capturePayPalOrder('pay-123');

    expect(paymentIntentModel.lockByPublicId).toHaveBeenCalledWith('pay-123', expect.anything());
    expect(captureSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ORDER-321',
        requestId: expect.any(String)
      })
    );
    expect(paymentIntentModel.updateById).toHaveBeenCalledWith(
      50,
      expect.objectContaining({
        status: 'succeeded',
        providerCaptureId: 'CAPTURE-111',
        amountTotal: 1590
      }),
      expect.anything()
    );
    expect(paymentLedgerEntryModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: 50,
        entryType: 'charge',
        amount: 1590,
        currency: 'USD',
        details: expect.objectContaining({ captureId: 'CAPTURE-111', provider: 'paypal' })
      }),
      expect.anything()
    );
    expect(captureMetricsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'paypal', amountTotal: 1590, currency: 'USD', status: 'succeeded' })
    );
    expect(paymentCouponModel.recordRedemption).toHaveBeenCalledWith(
      { couponId: 75, paymentIntentId: 50, userId: 'user-22' },
      expect.anything()
    );
    expect(result).toMatchObject({ status: 'succeeded', amountTotal: 1590, provider: 'paypal' });
  });

  it('issues partial Stripe refunds with ledger updates', async () => {
    const baseIntent = {
      id: 60,
      publicId: 'pay-456',
      provider: 'stripe',
      providerIntentId: 'pi_456',
      status: 'succeeded',
      currency: 'USD',
      amountSubtotal: 1500,
      amountDiscount: 0,
      amountTax: 90,
      amountTotal: 1590,
      amountRefunded: 0,
      userId: 'user-88',
      couponId: null,
      taxBreakdown: {},
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    paymentIntentModel.lockByPublicId.mockResolvedValue(baseIntent);
    paymentIntentModel.findById
      .mockResolvedValueOnce({ ...baseIntent, amountRefunded: 400 })
      .mockResolvedValueOnce({ ...baseIntent, amountRefunded: 400, status: 'partially_refunded' });
    paymentIntentModel.updateById.mockResolvedValue({ ...baseIntent, status: 'partially_refunded' });

    const refundPaymentIntent = vi.fn(async () => ({
      id: 're_111',
      status: 'succeeded'
    }));

    vi.spyOn(PaymentService, 'getStripeGateway').mockReturnValue({
      refundPaymentIntent
    });

    const result = await PaymentService.issueRefund({
      paymentPublicId: 'pay-456',
      amount: 400,
      reason: 'duplicate',
      requesterId: 'admin-42'
    });

    expect(refundPaymentIntent).toHaveBeenCalledWith(
      { payment_intent: 'pi_456', amount: 400, reason: 'duplicate' },
      { idempotencyKey: expect.any(String) }
    );
    expect(paymentRefundModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: 60,
        providerRefundId: 're_111',
        amount: 400,
        currency: 'USD',
        requestedBy: 'admin-42'
      }),
      expect.anything()
    );
    expect(paymentIntentModel.incrementRefundAmount).toHaveBeenCalledWith(60, 400, expect.anything());
    expect(paymentIntentModel.updateById).toHaveBeenCalledWith(60, { status: 'partially_refunded' }, expect.anything());
    expect(paymentLedgerEntryModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: 60,
        entryType: 'refund',
        amount: 400,
        details: expect.objectContaining({ provider: 'stripe', reason: 'duplicate' })
      }),
      expect.anything()
    );
    expect(refundMetricsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'stripe', amount: 400, currency: 'USD' })
    );
    expect(result).toMatchObject({ status: 'partially_refunded', amountRefunded: 400 });
  });

  it('validates Stripe webhook signatures before delegating handlers', async () => {
    const verifyWebhook = vi.fn(async () => ({
      event: {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_789', amount_received: 1234, currency: 'usd' } }
      },
      receipt: { id: 'r-1' }
    }));
    const markWebhookProcessed = vi.fn(async () => {});

    vi.spyOn(PaymentService, 'getStripeGateway').mockReturnValue({
      verifyWebhook,
      markWebhookProcessed
    });

    const successSpy = vi.spyOn(PaymentService, 'handleStripePaymentSucceeded').mockResolvedValue();
    const failureSpy = vi.spyOn(PaymentService, 'handleStripePaymentFailed').mockResolvedValue();
    const refundSpy = vi.spyOn(PaymentService, 'handleStripeChargeRefunded').mockResolvedValue();

    const response = await PaymentService.handleStripeWebhook('{"id":"evt"}', 't=test');

    expect(verifyWebhook).toHaveBeenCalledWith({ rawBody: '{"id":"evt"}', signature: 't=test' });
    expect(successSpy).toHaveBeenCalledWith({ id: 'pi_789', amount_received: 1234, currency: 'usd' });
    expect(failureSpy).not.toHaveBeenCalled();
    expect(refundSpy).not.toHaveBeenCalled();
    expect(markWebhookProcessed).toHaveBeenCalledWith({ id: 'r-1' }, { status: 'processed' });
    expect(response).toEqual({ received: true });
  });

  it('publishes webhook events when Stripe payment succeeds', async () => {
    const intentRecord = {
      id: 12,
      publicId: 'pay_12',
      provider: 'stripe',
      providerIntentId: 'pi_321',
      status: 'requires_payment_method',
      currency: 'USD',
      amountSubtotal: 1200,
      amountDiscount: 0,
      amountTax: 120,
      amountTotal: 0,
      amountRefunded: 0,
      metadata: {}
    };

    paymentIntentModel.findByProviderIntentId.mockResolvedValue(intentRecord);
    paymentIntentModel.updateById.mockResolvedValue({
      ...intentRecord,
      status: 'succeeded',
      amountTotal: 1320,
      capturedAt: '2024-05-01T00:00:00.000Z'
    });
    paymentLedgerEntryModel.record.mockResolvedValue();

    await PaymentService.handleStripePaymentSucceeded({
      id: 'pi_321',
      amount_received: 1320,
      currency: 'usd',
      created: Math.floor(Date.now() / 1000),
      payment_method_types: ['card'],
      charges: { data: [{ id: 'ch_001', balance_transaction: 'txn_123', receipt_url: 'https://example.com/r' }] }
    });

    expect(webhookEventBusMock.publish).toHaveBeenCalledWith(
      'payments.intent.succeeded',
      expect.objectContaining({
        paymentId: 'pay_12',
        processedBy: 'stripe-webhook',
        amountReceived: 1320,
        chargeId: 'ch_001'
      }),
      expect.objectContaining({ source: 'stripe-webhook' })
    );
  });

  it('publishes webhook events when Stripe payment fails', async () => {
    const intentRecord = {
      id: 44,
      publicId: 'pay_44',
      provider: 'stripe',
      providerIntentId: 'pi_444',
      status: 'processing',
      currency: 'USD',
      amountSubtotal: 5000,
      amountDiscount: 0,
      amountTax: 0,
      amountTotal: 5000,
      amountRefunded: 0,
      metadata: {}
    };

    paymentIntentModel.findByProviderIntentId.mockResolvedValue(intentRecord);
    paymentIntentModel.updateById.mockResolvedValue({
      ...intentRecord,
      status: 'failed',
      failureCode: 'card_declined',
      failureMessage: 'Declined'
    });

    await PaymentService.handleStripePaymentFailed({
      id: 'pi_444',
      last_payment_error: { code: 'card_declined', message: 'Declined', type: 'card_error', created: Math.floor(Date.now() / 1000) },
      payment_method_types: ['card']
    });

    expect(webhookEventBusMock.publish).toHaveBeenCalledWith(
      'payments.intent.failed',
      expect.objectContaining({
        paymentId: 'pay_44',
        failureCode: 'card_declined',
        processedBy: 'stripe-webhook'
      }),
      expect.objectContaining({ source: 'stripe-webhook' })
    );
  });

  it('passes transactional connections to monetization finance when Stripe payments succeed', async () => {
    const transactionalConnection = {
      isTransaction: () => true,
      select: vi.fn(),
      from: vi.fn()
    };

    transactionSpy.mockImplementationOnce(async (handler) => handler(transactionalConnection));

    const intentRecord = {
      id: 77,
      publicId: 'pay_tx',
      provider: 'stripe',
      providerIntentId: 'pi_tx',
      status: 'requires_payment_method',
      currency: 'USD',
      amountSubtotal: 1000,
      amountDiscount: 0,
      amountTax: 100,
      amountTotal: 0,
      amountRefunded: 0,
      metadata: {}
    };

    paymentIntentModel.findByProviderIntentId.mockResolvedValue(intentRecord);
    paymentIntentModel.updateById.mockResolvedValue({
      ...intentRecord,
      status: 'succeeded',
      amountTotal: 1100,
      capturedAt: '2024-05-05T00:00:00.000Z'
    });
    paymentLedgerEntryModel.record.mockResolvedValue();

    await PaymentService.handleStripePaymentSucceeded({
      id: 'pi_tx',
      amount_received: 1100,
      currency: 'usd',
      created: Math.floor(Date.now() / 1000),
      payment_method_types: ['card'],
      charges: { data: [{ id: 'ch_tx', balance_transaction: 'txn_tx', receipt_url: 'https://example.com/r' }] }
    });

    expect(monetizationFinanceServiceMock.handlePaymentCaptured).toHaveBeenCalledWith(
      expect.objectContaining({ id: 77 }),
      transactionalConnection
    );

    const [, , eventOptions] = webhookEventBusMock.publish.mock.calls.at(-1);
    expect(eventOptions).toMatchObject({
      source: 'stripe-webhook',
      connection: transactionalConnection
    });
  });

  it('omits monetization finance hand-off when connection is not queryable', async () => {
    transactionSpy.mockImplementationOnce(async (handler) => handler({ isTransaction: () => true }));

    const intentRecord = {
      id: 88,
      publicId: 'pay_skip',
      provider: 'stripe',
      providerIntentId: 'pi_skip',
      status: 'requires_payment_method',
      currency: 'USD',
      amountSubtotal: 800,
      amountDiscount: 0,
      amountTax: 80,
      amountTotal: 0,
      amountRefunded: 0,
      metadata: {}
    };

    paymentIntentModel.findByProviderIntentId.mockResolvedValue(intentRecord);
    paymentIntentModel.updateById.mockResolvedValue({
      ...intentRecord,
      status: 'succeeded',
      amountTotal: 880,
      capturedAt: '2024-05-05T00:00:00.000Z'
    });
    paymentLedgerEntryModel.record.mockResolvedValue();

    await PaymentService.handleStripePaymentSucceeded({
      id: 'pi_skip',
      amount_received: 880,
      currency: 'usd',
      created: Math.floor(Date.now() / 1000),
      payment_method_types: ['card'],
      charges: { data: [{ id: 'ch_skip', balance_transaction: 'txn_skip', receipt_url: 'https://example.com/r' }] }
    });

    expect(monetizationFinanceServiceMock.handlePaymentCaptured).not.toHaveBeenCalled();

    const [, , eventOptions] = webhookEventBusMock.publish.mock.calls.at(-1);
    expect(eventOptions).not.toHaveProperty('connection');
  });
});
