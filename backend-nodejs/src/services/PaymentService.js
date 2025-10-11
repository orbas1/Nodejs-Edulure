import crypto from 'crypto';
import Stripe from 'stripe';
import paypal from '@paypal/checkout-server-sdk';
import * as promClient from 'prom-client';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import CommerceCouponModel from '../models/CommerceCouponModel.js';
import CommerceTaxRateModel from '../models/CommerceTaxRateModel.js';
import PaymentOrderModel from '../models/PaymentOrderModel.js';
import PaymentTransactionModel from '../models/PaymentTransactionModel.js';
import PaymentAuditLogModel from '../models/PaymentAuditLogModel.js';
import PaymentRefundModel from '../models/PaymentRefundModel.js';
import { metricsRegistry } from '../observability/metrics.js';

const stripeApiVersion = '2023-10-16';

const orderMetricName = 'edulure_payments_orders_total';
let ordersCounter = metricsRegistry.getSingleMetric(orderMetricName);
if (!ordersCounter) {
  ordersCounter = new promClient.Counter({
    name: orderMetricName,
    help: 'Count of commerce orders orchestrated by the API',
    labelNames: ['provider', 'status']
  });
  metricsRegistry.registerMetric(ordersCounter);
}

const orderValueMetricName = 'edulure_payments_order_value';
let orderValueHistogram = metricsRegistry.getSingleMetric(orderValueMetricName);
if (!orderValueHistogram) {
  orderValueHistogram = new promClient.Histogram({
    name: orderValueMetricName,
    help: 'Histogram of order totals processed by the commerce service',
    labelNames: ['provider', 'currency'],
    buckets: [5, 20, 50, 100, 250, 500, 1000]
  });
  metricsRegistry.registerMetric(orderValueHistogram);
}

const refundMetricName = 'edulure_payments_refunds_total';
let refundsCounter = metricsRegistry.getSingleMetric(refundMetricName);
if (!refundsCounter) {
  refundsCounter = new promClient.Counter({
    name: refundMetricName,
    help: 'Count of refunds issued via the commerce service',
    labelNames: ['provider', 'status']
  });
  metricsRegistry.registerMetric(refundsCounter);
}

let stripeClient = null;
let paypalClient = null;

function getStripeClient() {
  if (!env.payments.stripe) {
    const error = new Error('Stripe is not configured for this environment');
    error.code = 'PAYMENTS_STRIPE_DISABLED';
    throw error;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.payments.stripe.secretKey, {
      apiVersion: stripeApiVersion
    });
  }
  return stripeClient;
}

function getPayPalClient() {
  if (!env.payments.paypal) {
    const error = new Error('PayPal is not configured for this environment');
    error.code = 'PAYMENTS_PAYPAL_DISABLED';
    throw error;
  }
  if (!paypalClient) {
    const { clientId, clientSecret, environment } = env.payments.paypal;
    const paypalEnvironment =
      environment === 'live'
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret);
    paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment);
  }
  return paypalClient;
}

function normalizeCurrency(inputCurrency) {
  const currency = String(inputCurrency ?? '').trim().toUpperCase();
  if (!currency) {
    throw new Error('Currency is required to create an order');
  }
  if (!env.payments.allowedCurrencies.includes(currency)) {
    const error = new Error(`Currency ${currency} is not supported for payments`);
    error.code = 'PAYMENTS_UNSUPPORTED_CURRENCY';
    throw error;
  }
  return currency;
}

function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

function fromMinorUnits(amount) {
  return Number((amount / 100).toFixed(2));
}

function allocateMinorUnits(total, weights) {
  const sumWeights = weights.reduce((acc, weight) => acc + weight, 0);
  if (sumWeights === 0) {
    return weights.map(() => 0);
  }
  let remainder = total;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      const allocation = remainder;
      remainder -= allocation;
      return allocation;
    }
    const proportion = Math.floor((weight / sumWeights) * total);
    remainder -= proportion;
    return proportion;
  });
}

function mapStripeStatus(status) {
  switch (status) {
    case 'succeeded':
      return 'completed';
    case 'processing':
      return 'processing';
    case 'requires_action':
      return 'requires_action';
    case 'requires_payment_method':
      return 'awaiting_payment';
    case 'canceled':
      return 'cancelled';
    default:
      return 'awaiting_payment';
  }
}

function mapStripeTransactionStatus(status) {
  switch (status) {
    case 'succeeded':
      return 'succeeded';
    case 'processing':
      return 'pending';
    case 'requires_action':
      return 'requires_action';
    case 'requires_payment_method':
      return 'pending';
    case 'canceled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function mapPayPalStatus(status) {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'PAYER_ACTION_REQUIRED':
      return 'requires_action';
    case 'APPROVED':
    case 'CREATED':
      return 'awaiting_payment';
    case 'CANCELED':
      return 'cancelled';
    default:
      return 'processing';
  }
}

async function generateOrderNumber(connection) {
  const attempts = 5;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = `ORD-${new Date().getFullYear()}-${crypto.randomInt(100000, 999999)}`;
    const existing = await connection('payment_orders').where({ order_number: candidate }).first();
    if (!existing) {
      return candidate;
    }
  }
  throw new Error('Unable to generate unique order number after multiple attempts');
}

class VerifyWebhookSignatureRequest {
  constructor() {
    this.path = '/v1/notifications/verify-webhook-signature';
    this.verb = 'POST';
    this.headers = { 'Content-Type': 'application/json' };
  }
}

export default class PaymentService {
  static async createOrder({
    user,
    items,
    currency,
    paymentProvider,
    couponCode,
    billing,
    metadata = {},
    customerEmail
  }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one line item is required to create an order');
    }

    const provider = paymentProvider?.toLowerCase();
    if (!['stripe', 'paypal'].includes(provider)) {
      throw new Error('Unsupported payment provider supplied. Use "stripe" or "paypal".');
    }

    if (provider === 'stripe' && !env.payments.stripe) {
      throw new Error('Stripe payments are disabled for this environment');
    }
    if (provider === 'paypal' && !env.payments.paypal) {
      throw new Error('PayPal payments are disabled for this environment');
    }

    const normalizedCurrency = normalizeCurrency(currency);

    const normalizedItems = items.map((item) => {
      const unitAmount = Number(item.unitAmount ?? item.price ?? 0);
      const quantity = Number(item.quantity ?? 1);
      const itemName = String(item.name ?? '').trim();
      if (!itemName) {
        throw new Error('Each line item requires a descriptive name');
      }
      if (Number.isNaN(unitAmount) || unitAmount <= 0) {
        throw new Error(`Line item "${itemName}" must specify a positive unit amount`);
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Line item "${itemName}" must specify an integer quantity greater than zero`);
      }
      const unitMinor = toMinorUnits(unitAmount);
      const totalMinor = unitMinor * quantity;
      return {
        itemType: item.itemType ?? item.type ?? 'custom',
        itemId: item.itemId ?? item.referenceId ?? null,
        name: itemName,
        quantity,
        unitMinor,
        totalMinor,
        metadata: item.metadata ?? {},
        taxable: item.taxable !== false
      };
    });

    const subtotalMinor = normalizedItems.reduce((sum, item) => sum + item.totalMinor, 0);
    if (subtotalMinor <= 0) {
      throw new Error('Calculated subtotal must be greater than zero');
    }

    let appliedCoupon = null;
    let discountMinor = 0;
    if (couponCode) {
      appliedCoupon = await CommerceCouponModel.findActiveByCode(couponCode);
      if (!appliedCoupon) {
        const error = new Error('Coupon is invalid or expired');
        error.code = 'COUPON_INVALID';
        throw error;
      }
      if (appliedCoupon.currency && appliedCoupon.currency !== normalizedCurrency) {
        const error = new Error('Coupon currency does not match order currency');
        error.code = 'COUPON_CURRENCY_MISMATCH';
        throw error;
      }
      if (appliedCoupon.maxRedemptions && appliedCoupon.redemptionCount >= appliedCoupon.maxRedemptions) {
        const error = new Error('Coupon redemption limit has been reached');
        error.code = 'COUPON_REDEMPTION_LIMIT';
        throw error;
      }
      if (appliedCoupon.discountType === 'percentage') {
        discountMinor = Math.round((subtotalMinor * appliedCoupon.discountValue) / 100);
      } else {
        discountMinor = toMinorUnits(appliedCoupon.discountValue);
      }
      if (discountMinor > subtotalMinor && !appliedCoupon.stackable) {
        discountMinor = subtotalMinor;
      }
    }

    const netSubtotalMinor = Math.max(subtotalMinor - discountMinor, 0);

    let taxRate = null;
    if (billing?.country) {
      taxRate = await CommerceTaxRateModel.resolve(
        { countryCode: billing.country, regionCode: billing.region ?? null },
        db
      );
    }
    const taxMinor = taxRate ? Math.round((netSubtotalMinor * taxRate.ratePercentage) / 100) : 0;
    const totalMinor = netSubtotalMinor + taxMinor;

    if (totalMinor <= 0) {
      throw new Error('Order total must be greater than zero');
    }

    const discountAllocations = allocateMinorUnits(
      discountMinor,
      normalizedItems.map((item) => item.totalMinor)
    );

    const itemTaxAllocations = normalizedItems.map((item, index) => {
      if (!taxRate || item.taxable === false) {
        return 0;
      }
      const taxableMinor = Math.max(item.totalMinor - discountAllocations[index], 0);
      return Math.round((taxableMinor * taxRate.ratePercentage) / 100);
    });

    const taxAllocationTotal = itemTaxAllocations.reduce((sum, value) => sum + value, 0);
    if (taxAllocationTotal !== taxMinor && itemTaxAllocations.length > 0) {
      const delta = taxMinor - taxAllocationTotal;
      itemTaxAllocations[itemTaxAllocations.length - 1] += delta;
    }

    const initialMetadata = {
      ...metadata,
      couponCode: appliedCoupon?.code ?? null,
      couponRedemptionRecorded: false,
      taxRate: taxRate
        ? {
            id: taxRate.id,
            ratePercentage: taxRate.ratePercentage,
            label: taxRate.label
          }
        : null
    };

    return db.transaction(async (trx) => {
      const orderNumber = await generateOrderNumber(trx);
      const orderId = await PaymentOrderModel.create(
        {
          userId: user?.id ?? null,
          orderNumber,
          currency: normalizedCurrency,
          subtotalAmount: fromMinorUnits(subtotalMinor),
          discountAmount: fromMinorUnits(discountMinor),
          taxAmount: fromMinorUnits(taxMinor),
          totalAmount: fromMinorUnits(totalMinor),
          status: 'awaiting_payment',
          paymentProvider: provider,
          metadata: initialMetadata,
          billingEmail: billing?.email ?? customerEmail ?? null,
          billingCountry: billing?.country ?? null,
          billingRegion: billing?.region ?? null,
          appliedCouponId: appliedCoupon?.id ?? null,
          appliedTaxRateId: taxRate?.id ?? null,
          expiresAt:
            env.payments.orderExpiryMinutes > 0
              ? new Date(Date.now() + env.payments.orderExpiryMinutes * 60 * 1000)
              : null
        },
        trx
      );

      await PaymentOrderModel.attachItems(
        orderId,
        normalizedItems.map((item, index) => ({
          itemType: item.itemType,
          itemId: item.itemId,
          name: item.name,
          quantity: item.quantity,
          unitAmount: fromMinorUnits(item.unitMinor),
          totalAmount: fromMinorUnits(item.totalMinor),
          taxAmount: fromMinorUnits(itemTaxAllocations[index]),
          discountAmount: fromMinorUnits(discountAllocations[index]),
          metadata: item.metadata
        })),
        trx
      );

      const transactionId = await PaymentTransactionModel.create(
        {
          orderId,
          transactionType: 'authorization',
          status: 'pending',
          paymentProvider: provider,
          providerTransactionId: null,
          amount: fromMinorUnits(totalMinor),
          currency: normalizedCurrency,
          paymentMethodType: null,
          responseSnapshot: {}
        },
        trx
      );

      await PaymentAuditLogModel.record(
        {
          eventType: 'order.created',
          orderId,
          performedBy: user?.id ?? null,
          payload: {
            subtotalMinor,
            discountMinor,
            taxMinor,
            totalMinor,
            currency: normalizedCurrency,
            provider
          }
        },
        trx
      );

      let providerResponse = null;
      let orderStatus = 'awaiting_payment';
      let transactionStatus = 'pending';
      let clientSecret = null;
      let approvalUrl = null;

      if (provider === 'stripe') {
        const stripe = getStripeClient();
        providerResponse = await stripe.paymentIntents.create({
          amount: totalMinor,
          currency: normalizedCurrency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
          description: `Edulure order ${orderNumber}`,
          metadata: {
            orderNumber,
            userId: user?.id ?? null,
            coupon: appliedCoupon?.code ?? null
          },
          receipt_email: billing?.email ?? customerEmail ?? null,
          statement_descriptor: env.payments.stripe.statementDescriptor?.slice(0, 22)
        });
        orderStatus = mapStripeStatus(providerResponse.status);
        transactionStatus = mapStripeTransactionStatus(providerResponse.status);
        clientSecret = providerResponse.client_secret ?? null;
      } else {
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        request.requestBody({
          intent: 'CAPTURE',
          purchase_units: [
            {
              invoice_id: orderNumber,
              reference_id: orderNumber,
              amount: {
                currency_code: normalizedCurrency,
                value: fromMinorUnits(totalMinor).toFixed(2),
                breakdown: {
                  item_total: {
                    currency_code: normalizedCurrency,
                    value: fromMinorUnits(subtotalMinor).toFixed(2)
                  },
                  discount: {
                    currency_code: normalizedCurrency,
                    value: fromMinorUnits(discountMinor).toFixed(2)
                  },
                  tax_total: {
                    currency_code: normalizedCurrency,
                    value: fromMinorUnits(taxMinor).toFixed(2)
                  }
                }
              },
              items: normalizedItems.map((item, index) => ({
                name: item.name,
                sku: item.itemId ?? undefined,
                quantity: String(item.quantity),
                category: 'DIGITAL_GOODS',
                unit_amount: {
                  currency_code: normalizedCurrency,
                  value: fromMinorUnits(item.unitMinor).toFixed(2)
                },
                tax: {
                  currency_code: normalizedCurrency,
                  value: fromMinorUnits(itemTaxAllocations[index]).toFixed(2)
                }
              }))
            }
          ],
          application_context: {
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: metadata.returnUrl ?? 'https://app.edulure.com/payments/return',
            cancel_url: metadata.cancelUrl ?? 'https://app.edulure.com/payments/cancel'
          }
        });
        const response = await getPayPalClient().execute(request);
        providerResponse = response.result;
        orderStatus = mapPayPalStatus(providerResponse.status);
        transactionStatus = orderStatus === 'completed' ? 'succeeded' : 'pending';
        approvalUrl = providerResponse.links?.find((link) => link.rel === 'approve')?.href ?? null;
      }

      await PaymentOrderModel.updateById(
        orderId,
        {
          status: orderStatus,
          provider_intent_id: providerResponse.id,
          provider_client_secret: clientSecret,
          metadata: {
            ...initialMetadata,
            providerPayloadVersion: providerResponse.version ?? null
          }
        },
        trx
      );

      await PaymentTransactionModel.updateById(
        transactionId,
        {
          status: transactionStatus,
          provider_transaction_id: providerResponse.id,
          response_snapshot: providerResponse,
          payment_method_type: provider === 'stripe' ? providerResponse.payment_method_types?.[0] ?? null : 'paypal'
        },
        trx
      );

      await PaymentAuditLogModel.record(
        {
          eventType: 'payment.intent.created',
          orderId,
          transactionId,
          performedBy: user?.id ?? null,
          payload: {
            provider,
            providerIntentId: providerResponse.id,
            status: orderStatus
          }
        },
        trx
      );

      const order = await PaymentOrderModel.findById(orderId, trx);

      ordersCounter.inc({ provider, status: orderStatus });
      orderValueHistogram.observe({ provider, currency: normalizedCurrency }, fromMinorUnits(totalMinor));

      return {
        order,
        payment: {
          provider,
          clientSecret,
          approvalUrl,
          providerIntentId: providerResponse.id,
          status: orderStatus
        }
      };
    });
  }

  static async captureOrder({ orderNumber, performedBy }) {
    return db.transaction(async (trx) => {
      const order = await PaymentOrderModel.findByOrderNumber(orderNumber, trx);
      if (!order) {
        const error = new Error('Order not found');
        error.status = 404;
        throw error;
      }

      if (order.status === 'completed') {
        return order;
      }

      const provider = order.paymentProvider;
      let providerResponse = null;
      let captureId = null;
      const paidAt = new Date();

      if (provider === 'stripe') {
        const stripe = getStripeClient();
        const intent = await stripe.paymentIntents.retrieve(order.providerIntentId);
        if (intent.status === 'requires_action') {
          const confirmation = await stripe.paymentIntents.confirm(order.providerIntentId);
          providerResponse = confirmation;
        } else if (intent.status === 'requires_capture') {
          const capture = await stripe.paymentIntents.capture(order.providerIntentId);
          providerResponse = capture;
        } else if (intent.status === 'succeeded') {
          providerResponse = intent;
        } else {
          const error = new Error(`Stripe intent is not ready for capture (status: ${intent.status})`);
          error.code = 'STRIPE_CAPTURE_STATE';
          throw error;
        }
        captureId = providerResponse.id;
      } else if (provider === 'paypal') {
        const request = new paypal.orders.OrdersCaptureRequest(order.providerIntentId);
        request.requestBody({});
        const response = await getPayPalClient().execute(request);
        providerResponse = response.result;
        const capture = providerResponse.purchase_units?.[0]?.payments?.captures?.[0];
        captureId = capture?.id ?? providerResponse.id;
      } else {
        const error = new Error('Unsupported payment provider');
        error.status = 400;
        throw error;
      }

      await PaymentOrderModel.updateById(
        order.id,
        {
          status: 'completed',
          paid_at: paidAt,
          metadata: {
            ...order.metadata,
            couponRedemptionRecorded: order.metadata?.couponRedemptionRecorded ?? false
          }
        },
        trx
      );

      const latestTransaction = await PaymentTransactionModel.findLatestForOrder(order.id, trx);
      let transactionId = latestTransaction?.id ?? null;

      if (transactionId) {
        await PaymentTransactionModel.updateById(
          transactionId,
          {
            status: 'succeeded',
            transaction_type: 'capture',
            provider_transaction_id: captureId,
            processed_at: paidAt,
            response_snapshot: providerResponse
          },
          trx
        );
      } else {
        transactionId = await PaymentTransactionModel.create(
          {
            orderId: order.id,
            transactionType: 'capture',
            status: 'succeeded',
            paymentProvider: provider,
            providerTransactionId: captureId,
            amount: order.totalAmount,
            currency: order.currency,
            paymentMethodType: provider === 'stripe' ? 'card' : 'paypal',
            responseSnapshot: providerResponse,
            processedAt: paidAt
          },
          trx
        );
      }

      if (order.appliedCouponId && !order.metadata?.couponRedemptionRecorded) {
        await CommerceCouponModel.incrementRedemption(order.appliedCouponId, trx);
        await PaymentOrderModel.updateById(
          order.id,
          {
            metadata: {
              ...order.metadata,
              couponRedemptionRecorded: true
            }
          },
          trx
        );
      }

      await PaymentAuditLogModel.record(
        {
          eventType: 'payment.captured',
          orderId: order.id,
          transactionId,
          performedBy: performedBy ?? null,
          payload: {
            provider,
            providerTransactionId: captureId,
            amount: order.totalAmount,
            currency: order.currency
          }
        },
        trx
      );

      const refreshed = await PaymentOrderModel.findById(order.id, trx);
      ordersCounter.inc({ provider, status: 'completed' });
      return refreshed;
    });
  }

  static async issueRefund({ orderNumber, amount, reason, performedBy }) {
    return db.transaction(async (trx) => {
      const order = await PaymentOrderModel.findByOrderNumber(orderNumber, trx);
      if (!order) {
        const error = new Error('Order not found');
        error.status = 404;
        throw error;
      }
      if (order.status !== 'completed' && order.status !== 'refunded') {
        const error = new Error('Order is not eligible for refunds in its current state');
        error.code = 'ORDER_NOT_REFUNDABLE';
        throw error;
      }
      const refundMinor = amount ? toMinorUnits(amount) : toMinorUnits(order.totalAmount);
      if (refundMinor <= 0) {
        throw new Error('Refund amount must be greater than zero');
      }
      const currency = order.currency;

      const latestTransaction = await PaymentTransactionModel.findLatestForOrder(order.id, trx);
      if (!latestTransaction) {
        throw new Error('No settled transaction found for this order');
      }

      let providerResponse = null;
      let providerStatus = 'processing';
      let providerRefundId = null;
      let processedAt = null;
      if (order.paymentProvider === 'stripe') {
        const stripe = getStripeClient();
        providerResponse = await stripe.refunds.create({
          payment_intent: order.providerIntentId,
          amount: refundMinor,
          reason: reason ? reason.slice(0, 255) : undefined
        });
        providerStatus = providerResponse.status ?? 'succeeded';
        providerRefundId = providerResponse.id;
        if (providerResponse.status === 'succeeded') {
          processedAt = new Date((providerResponse.created ?? Date.now() / 1000) * 1000);
        }
      } else if (order.paymentProvider === 'paypal') {
        const captureId = latestTransaction.providerTransactionId ?? order.providerIntentId;
        const request = new paypal.payments.CapturesRefundRequest(captureId);
        request.requestBody({
          amount: {
            value: fromMinorUnits(refundMinor).toFixed(2),
            currency_code: currency
          },
          note_to_payer: reason ? reason.slice(0, 255) : undefined
        });
        const response = await getPayPalClient().execute(request);
        providerResponse = response.result;
        providerStatus = providerResponse.status?.toLowerCase() === 'completed' ? 'succeeded' : 'processing';
        providerRefundId = providerResponse.id;
        processedAt = providerResponse.update_time ? new Date(providerResponse.update_time) : null;
      } else {
        throw new Error('Unsupported payment provider for refunds');
      }

      const refundId = await PaymentRefundModel.create(
        {
          transactionId: latestTransaction.id,
          amount: fromMinorUnits(refundMinor),
          currency,
          status: providerStatus,
          reason: reason ?? null,
          providerRefundId,
          metadata: providerResponse,
          requestedBy: performedBy ?? null,
          processedAt
        },
        trx
      );

      await PaymentAuditLogModel.record(
        {
          eventType: 'payment.refund.requested',
          orderId: order.id,
          transactionId: latestTransaction.id,
          performedBy: performedBy ?? null,
          payload: {
            provider: order.paymentProvider,
            refundId,
            amount: fromMinorUnits(refundMinor),
            currency,
            reason: reason ?? null
          }
        },
        trx
      );

      refundsCounter.inc({ provider: order.paymentProvider, status: providerStatus });

      return { refundId, providerResponse };
    });
  }

  static async handleStripeWebhook({ rawBody, signature }) {
    if (!env.payments.stripe?.webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }
    const stripe = getStripeClient();
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.payments.stripe.webhookSecret);
    } catch (error) {
      error.status = 400;
      throw error;
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await PaymentService.#handleStripePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await PaymentService.#handleStripePaymentFailed(event.data.object);
        break;
      case 'charge.refunded':
        await PaymentService.#handleStripeRefunded(event.data.object);
        break;
      default:
        logger.debug({ eventType: event.type }, 'Stripe webhook event ignored');
    }
    return { received: true };
  }

  static async handlePayPalWebhook({ body, headers }) {
    if (!env.payments.paypal?.webhookId) {
      throw new Error('PayPal webhook ID is not configured');
    }
    const requiredHeaders = [
      'paypal-auth-algo',
      'paypal-cert-url',
      'paypal-transmission-id',
      'paypal-transmission-sig',
      'paypal-transmission-time'
    ];
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        const error = new Error(`Missing PayPal webhook header: ${header}`);
        error.status = 400;
        throw error;
      }
    }

    const request = new VerifyWebhookSignatureRequest();
    request.body = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: env.payments.paypal.webhookId,
      webhook_event: body
    };

    const verification = await getPayPalClient().execute(request);
    if (verification.result?.verification_status !== 'SUCCESS') {
      const error = new Error('PayPal webhook verification failed');
      error.status = 400;
      throw error;
    }

    const eventType = body.event_type;
    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
      case 'PAYMENT.CAPTURE.COMPLETED':
        await PaymentService.#handlePayPalCapture(body);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED':
        await PaymentService.#handlePayPalRefund(body);
        break;
      default:
        logger.debug({ eventType }, 'PayPal webhook event ignored');
    }
    return { received: true };
  }

  static async #handleStripePaymentSucceeded(intent) {
    return db.transaction(async (trx) => {
      const order = await PaymentOrderModel.findByProviderIntentId(intent.id, trx);
      if (!order) {
        logger.warn({ intentId: intent.id }, 'Stripe webhook referenced unknown order');
        return;
      }

      if (order.status === 'completed') {
        return;
      }

      const paidAt = new Date();
      await PaymentOrderModel.updateById(
        order.id,
        {
          status: 'completed',
          paid_at: paidAt,
          metadata: {
            ...order.metadata,
            couponRedemptionRecorded: order.metadata?.couponRedemptionRecorded ?? false
          }
        },
        trx
      );

      const latestTransaction = await PaymentTransactionModel.findLatestForOrder(order.id, trx);
      let transactionId = latestTransaction?.id ?? null;
      if (transactionId) {
        await PaymentTransactionModel.updateById(
          transactionId,
          {
            status: 'succeeded',
            transaction_type: 'capture',
            provider_transaction_id: intent.id,
            processed_at: paidAt,
            response_snapshot: intent
          },
          trx
        );
      }

      if (order.appliedCouponId && !order.metadata?.couponRedemptionRecorded) {
        await CommerceCouponModel.incrementRedemption(order.appliedCouponId, trx);
        await PaymentOrderModel.updateById(
          order.id,
          {
            metadata: {
              ...order.metadata,
              couponRedemptionRecorded: true
            }
          },
          trx
        );
      }

      await PaymentAuditLogModel.record(
        {
          eventType: 'payment.captured',
          orderId: order.id,
          transactionId,
          performedBy: null,
          payload: {
            provider: 'stripe',
            providerTransactionId: intent.id,
            amount: order.totalAmount,
            currency: order.currency
          }
        },
        trx
      );

      ordersCounter.inc({ provider: 'stripe', status: 'completed' });
    });
  }

  static async #handleStripePaymentFailed(intent) {
    return db.transaction(async (trx) => {
      const order = await PaymentOrderModel.findByProviderIntentId(intent.id, trx);
      if (!order) {
        logger.warn({ intentId: intent.id }, 'Stripe failure webhook referenced unknown order');
        return;
      }
      await PaymentOrderModel.updateById(
        order.id,
        {
          status: 'cancelled',
          cancelled_at: new Date()
        },
        trx
      );
      const latestTransaction = await PaymentTransactionModel.findLatestForOrder(order.id, trx);
      if (latestTransaction) {
        await PaymentTransactionModel.updateById(
          latestTransaction.id,
          {
            status: 'failed',
            response_snapshot: intent
          },
          trx
        );
      }
      await PaymentAuditLogModel.record(
        {
          eventType: 'payment.failed',
          orderId: order.id,
          transactionId: latestTransaction?.id ?? null,
          performedBy: null,
          payload: {
            provider: 'stripe',
            providerTransactionId: intent.id,
            failureCode: intent.last_payment_error?.code ?? null
          }
        },
        trx
      );
      ordersCounter.inc({ provider: 'stripe', status: 'cancelled' });
    });
  }

  static async #handleStripeRefunded(charge) {
    return db.transaction(async (trx) => {
      const intentId = charge.payment_intent ?? charge.id;
      const order = await PaymentOrderModel.findByProviderIntentId(intentId, trx);
      if (!order) {
        logger.warn({ intentId }, 'Stripe refund webhook referenced unknown order');
        return;
      }
      await PaymentOrderModel.updateById(
        order.id,
        {
          status: 'refunded'
        },
        trx
      );
      const latestTransaction = await PaymentTransactionModel.findLatestForOrder(order.id, trx);
      const refundAmount = fromMinorUnits(charge.amount_refunded ?? 0);
      const refundId = await PaymentRefundModel.create(
        {
          transactionId: latestTransaction?.id ?? null,
          amount: refundAmount,
          currency: order.currency,
          status: 'succeeded',
          reason: charge.refunds?.data?.[0]?.reason ?? null,
          providerRefundId: charge.refunds?.data?.[0]?.id ?? charge.id,
          metadata: charge,
          processedAt: new Date()
        },
        trx
      );
      await PaymentAuditLogModel.record(
        {
          eventType: 'payment.refund.completed',
          orderId: order.id,
          transactionId: latestTransaction?.id ?? null,
          performedBy: null,
          payload: {
            provider: 'stripe',
            refundId,
            amount: refundAmount,
            currency: order.currency
          }
        },
        trx
      );
      refundsCounter.inc({ provider: 'stripe', status: 'succeeded' });
    });
  }

  static async #handlePayPalCapture(eventBody) {
    return db.transaction(async (trx) => {
      const resource = eventBody.resource;
      const orderId = resource?.supplementary_data?.related_ids?.order_id ?? resource.id;
      const order = await PaymentOrderModel.findByProviderIntentId(orderId, trx);
      if (!order) {
        logger.warn({ orderId }, 'PayPal capture webhook referenced unknown order');
        return;
      }
      const capture = resource.purchase_units?.[0]?.payments?.captures?.[0] ?? resource;
      const providerCaptureId = capture?.id ?? resource.id;
      if (order.status === 'completed') {
        return;
      }
      const paidAt = new Date(capture?.update_time ?? Date.now());
      await PaymentOrderModel.updateById(
        order.id,
        {
          status: 'completed',
          paid_at: paidAt,
          metadata: {
            ...order.metadata,
            couponRedemptionRecorded: order.metadata?.couponRedemptionRecorded ?? false
          }
        },
        trx
      );
      const latestTransaction = await PaymentTransactionModel.findLatestForOrder(order.id, trx);
      let transactionId = latestTransaction?.id ?? null;
      if (transactionId) {
        await PaymentTransactionModel.updateById(
          transactionId,
          {
            status: 'succeeded',
            transaction_type: 'capture',
            provider_transaction_id: providerCaptureId,
            processed_at: paidAt,
            response_snapshot: resource
          },
          trx
        );
      }
      if (order.appliedCouponId && !order.metadata?.couponRedemptionRecorded) {
        await CommerceCouponModel.incrementRedemption(order.appliedCouponId, trx);
        await PaymentOrderModel.updateById(
          order.id,
          {
            metadata: {
              ...order.metadata,
              couponRedemptionRecorded: true
            }
          },
          trx
        );
      }
      await PaymentAuditLogModel.record(
        {
          eventType: 'payment.captured',
          orderId: order.id,
          transactionId,
          performedBy: null,
          payload: {
            provider: 'paypal',
            providerTransactionId: providerCaptureId,
            amount: order.totalAmount,
            currency: order.currency
          }
        },
        trx
      );
      ordersCounter.inc({ provider: 'paypal', status: 'completed' });
    });
  }

  static async #handlePayPalRefund(eventBody) {
    return db.transaction(async (trx) => {
      const resource = eventBody.resource;
      const orderId = resource?.supplementary_data?.related_ids?.order_id ?? resource.id;
      const order = await PaymentOrderModel.findByProviderIntentId(orderId, trx);
      if (!order) {
        logger.warn({ orderId }, 'PayPal refund webhook referenced unknown order');
        return;
      }
      const refund = resource;
      await PaymentOrderModel.updateById(
        order.id,
        {
          status: 'refunded'
        },
        trx
      );
      const latestTransaction = await PaymentTransactionModel.findLatestForOrder(order.id, trx);
      const refundAmount = Number(refund.amount?.value ?? order.totalAmount);
      const refundId = await PaymentRefundModel.create(
        {
          transactionId: latestTransaction?.id ?? null,
          amount: refundAmount,
          currency: refund.amount?.currency_code ?? order.currency,
          status: refund.status?.toLowerCase() === 'completed' ? 'succeeded' : 'processing',
          reason: refund.reason ?? null,
          providerRefundId: refund.id,
          metadata: refund,
          processedAt: refund.update_time ? new Date(refund.update_time) : new Date()
        },
        trx
      );
      await PaymentAuditLogModel.record(
        {
          eventType: 'payment.refund.completed',
          orderId: order.id,
          transactionId: latestTransaction?.id ?? null,
          performedBy: null,
          payload: {
            provider: 'paypal',
            refundId,
            amount: refundAmount,
            currency: refund.amount?.currency_code ?? order.currency
          }
        },
        trx
      );
      refundsCounter.inc({ provider: 'paypal', status: 'succeeded' });
    });
  }
}
