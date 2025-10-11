import { randomUUID } from 'node:crypto';

import Stripe from 'stripe';
import {
  Client as PayPalClient,
  Environment as PayPalEnvironment,
  OrdersController,
  PaymentsController
} from '@paypal/paypal-server-sdk';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import PaymentCouponModel from '../models/PaymentCouponModel.js';
import PaymentIntentModel from '../models/PaymentIntentModel.js';
import PaymentLedgerEntryModel from '../models/PaymentLedgerEntryModel.js';
import PaymentRefundModel from '../models/PaymentRefundModel.js';
import { trackPaymentCaptureMetrics, trackPaymentRefundMetrics } from '../observability/metrics.js';
import {
  onPaymentSucceeded as handleCommunityPaymentSucceeded,
  onPaymentFailed as handleCommunityPaymentFailed,
  onPaymentRefunded as handleCommunityPaymentRefunded
} from './CommunitySubscriptionLifecycle.js';

const STRIPE_API_VERSION = '2024-06-20';
const MAX_COUPON_PERCENTAGE_BASIS_POINTS = Math.round(env.payments.coupons.maxPercentageDiscount * 100);

function centsToCurrencyString(amount) {
  return (Math.round(amount) / 100).toFixed(2);
}

function currencyStringToCents(value) {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
}

function allocateProRata(basis, total) {
  if (!Number.isFinite(total) || total <= 0) {
    return basis.map(() => 0);
  }

  const sum = basis.reduce((acc, value) => acc + (Number.isFinite(value) && value > 0 ? value : 0), 0);
  if (sum <= 0) {
    return basis.map(() => 0);
  }

  let remainder = total;
  const allocations = basis.map((value) => {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    const allocation = Math.floor((value / sum) * total);
    remainder -= allocation;
    return allocation;
  });

  if (remainder > 0) {
    const ordered = basis
      .map((value, index) => ({ value, index }))
      .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
      .sort((a, b) => b.value - a.value);

    let pointer = 0;
    while (remainder > 0 && ordered.length) {
      const target = ordered[pointer % ordered.length];
      allocations[target.index] += 1;
      remainder -= 1;
      pointer += 1;
    }
  }

  return allocations;
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  return metadata;
}

function resolvePayPalEnvironment() {
  return env.payments.paypal.environment === 'live'
    ? PayPalEnvironment.Production
    : PayPalEnvironment.Sandbox;
}

function normalizeProviderStatus(provider, providerStatus) {
  if (provider === 'stripe') {
    switch (providerStatus) {
      case 'requires_payment_method':
        return 'requires_payment_method';
      case 'requires_action':
      case 'requires_confirmation':
      case 'requires_source_action':
        return 'requires_action';
      case 'processing':
      case 'requires_capture':
        return 'processing';
      case 'succeeded':
        return 'succeeded';
      case 'canceled':
        return 'canceled';
      case 'requires_payment_method':
        return 'requires_payment_method';
      default:
        return providerStatus;
    }
  }

  if (provider === 'paypal') {
    switch ((providerStatus ?? '').toUpperCase()) {
      case 'CREATED':
        return 'requires_action';
      case 'APPROVED':
        return 'processing';
      case 'COMPLETED':
        return 'succeeded';
      case 'VOIDED':
      case 'CANCELLED':
        return 'canceled';
      default:
        return providerStatus?.toLowerCase() ?? 'processing';
    }
  }

  return providerStatus;
}

class PaymentService {
  static stripeClient;

  static paypalClient;

  static paypalOrdersController;

  static paypalPaymentsController;

  static getStripeClient() {
    if (!this.stripeClient) {
      this.stripeClient = new Stripe(env.payments.stripe.secretKey, {
        apiVersion: STRIPE_API_VERSION,
        appInfo: {
          name: 'Edulure Platform',
          version: '1.50.0'
        }
      });
    }
    return this.stripeClient;
  }

  static getPayPalClient() {
    if (!this.paypalClient) {
      this.paypalClient = new PayPalClient({
        environment: resolvePayPalEnvironment(),
        timeout: 10000,
        clientCredentialsAuthCredentials: {
          oAuthClientId: env.payments.paypal.clientId,
          oAuthClientSecret: env.payments.paypal.clientSecret
        }
      });
    }
    return this.paypalClient;
  }

  static getPayPalOrdersController() {
    if (!this.paypalOrdersController) {
      this.paypalOrdersController = new OrdersController(this.getPayPalClient());
    }
    return this.paypalOrdersController;
  }

  static getPayPalPaymentsController() {
    if (!this.paypalPaymentsController) {
      this.paypalPaymentsController = new PaymentsController(this.getPayPalClient());
    }
    return this.paypalPaymentsController;
  }

  static toApiIntent(intent) {
    if (!intent) {
      return null;
    }

    return {
      paymentId: intent.publicId,
      provider: intent.provider,
      status: intent.status,
      currency: intent.currency,
      amountSubtotal: intent.amountSubtotal,
      amountDiscount: intent.amountDiscount,
      amountTax: intent.amountTax,
      amountTotal: intent.amountTotal,
      amountRefunded: intent.amountRefunded,
      taxBreakdown: intent.taxBreakdown,
      metadata: intent.metadata,
      couponId: intent.couponId ?? null,
      entityType: intent.entityType,
      entityId: intent.entityId,
      receiptEmail: intent.receiptEmail ?? null,
      capturedAt: intent.capturedAt ?? null,
      canceledAt: intent.canceledAt ?? null,
      expiresAt: intent.expiresAt ?? null,
      failureCode: intent.failureCode ?? null,
      failureMessage: intent.failureMessage ?? null,
      createdAt: intent.createdAt,
      updatedAt: intent.updatedAt
    };
  }

  static normalizeCurrency(currency) {
    const normalized = (currency ?? env.payments.defaultCurrency).toUpperCase();
    if (!env.payments.allowedCurrencies.includes(normalized)) {
      const error = new Error(`Unsupported currency: ${normalized}`);
      error.status = 422;
      throw error;
    }
    return normalized;
  }

  static normaliseLineItems(items) {
    if (!Array.isArray(items) || !items.length) {
      const error = new Error('At least one line item is required to create a payment.');
      error.status = 422;
      throw error;
    }

    return items.map((item, index) => {
      if (!Number.isInteger(item.unitAmount) || item.unitAmount <= 0) {
        const error = new Error(`Line item ${index + 1} must provide a positive integer unitAmount expressed in cents.`);
        error.status = 422;
        throw error;
      }
      const quantity = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      const name = typeof item.name === 'string' && item.name.trim().length
        ? item.name.trim()
        : `Line ${index + 1}`;
      return {
        id: item.id ?? `line-${index + 1}`,
        name,
        description: typeof item.description === 'string' ? item.description.trim() : null,
        unitAmount: item.unitAmount,
        quantity,
        taxExempt: Boolean(item.taxExempt),
        metadata: sanitizeMetadata(item.metadata)
      };
    });
  }

  static resolveTaxRate(taxRegion) {
    if (!taxRegion) {
      return { rate: env.payments.tax.minimumRate ?? 0, jurisdiction: null };
    }

    const country = taxRegion.country ? taxRegion.country.toUpperCase() : null;
    const region = taxRegion.region ? taxRegion.region.toUpperCase() : null;
    const table = env.payments.tax.table ?? {};

    let rate = env.payments.tax.minimumRate ?? 0;
    if (country && table[country]) {
      rate = table[country].defaultRate ?? rate;
      if (region && table[country].regions?.[region] !== undefined) {
        rate = table[country].regions[region];
      }
    }

    return {
      rate: Math.max(rate, env.payments.tax.minimumRate ?? 0),
      jurisdiction: country
        ? {
            country,
            region: region ?? null,
            postalCode: taxRegion.postalCode ?? null
          }
        : null
    };
  }

  static calculateTotals({ items, coupon, taxRegion, currency }) {
    const lineItems = this.normaliseLineItems(items).map((item) => ({
      ...item,
      subtotal: item.unitAmount * item.quantity,
      taxableSubtotal: item.taxExempt ? 0 : item.unitAmount * item.quantity
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxableSubtotal = lineItems.reduce((sum, item) => sum + item.taxableSubtotal, 0);

    let discount = 0;
    if (coupon) {
      if (coupon.discountType === 'percentage') {
        const basisPoints = Math.min(Number(coupon.discountValue ?? 0), MAX_COUPON_PERCENTAGE_BASIS_POINTS);
        discount = Math.floor((taxableSubtotal * basisPoints) / 10000);
      } else {
        const couponCurrency = (coupon.currency ?? currency).toUpperCase();
        if (couponCurrency !== currency) {
          const error = new Error(`Coupon ${coupon.code} is only valid for ${couponCurrency} purchases.`);
          error.status = 422;
          throw error;
        }
        discount = Number(coupon.discountValue ?? 0);
      }
    }

    if (discount > taxableSubtotal) {
      discount = taxableSubtotal;
    }

    const discountAllocations = allocateProRata(
      lineItems.map((item) => item.taxableSubtotal),
      discount
    );

    lineItems.forEach((item, index) => {
      item.discount = discountAllocations[index];
    });

    const { rate, jurisdiction } = this.resolveTaxRate(taxRegion);
    const taxableAfterDiscount = lineItems.reduce((sum, item, index) => {
      return sum + Math.max(item.taxableSubtotal - discountAllocations[index], 0);
    }, 0);

    let tax = 0;
    const taxAllocations = new Array(lineItems.length).fill(0);
    if (rate > 0 && taxableAfterDiscount > 0) {
      if (env.payments.tax.inclusive) {
        const provisional = lineItems.map((item, index) => {
          const taxable = Math.max(item.taxableSubtotal - discountAllocations[index], 0);
          return Math.round(taxable - taxable / (1 + rate));
        });
        const expected = Math.round(taxableAfterDiscount - taxableAfterDiscount / (1 + rate));
        let diff = expected - provisional.reduce((sum, value) => sum + value, 0);
        const ordered = provisional
          .map((value, index) => ({ value, index }))
          .filter((entry) => entry.value > 0)
          .sort((a, b) => b.value - a.value);
        for (let i = 0; diff !== 0 && ordered.length; i += 1) {
          const target = ordered[i % ordered.length];
          provisional[target.index] += diff > 0 ? 1 : -1;
          diff += diff > 0 ? -1 : 1;
        }
        provisional.forEach((value, index) => {
          taxAllocations[index] = value;
        });
        tax = expected;
      } else {
        lineItems.forEach((item, index) => {
          const taxable = Math.max(item.taxableSubtotal - discountAllocations[index], 0);
          taxAllocations[index] = Math.round(taxable * rate);
        });
        const expected = Math.round(taxableAfterDiscount * rate);
        let diff = expected - taxAllocations.reduce((sum, value) => sum + value, 0);
        const ordered = taxAllocations
          .map((value, index) => ({ value, index }))
          .filter((entry) => lineItems[entry.index].taxableSubtotal > 0)
          .sort((a, b) => lineItems[b.index].taxableSubtotal - lineItems[a.index].taxableSubtotal);
        for (let i = 0; diff !== 0 && ordered.length; i += 1) {
          const target = ordered[i % ordered.length];
          taxAllocations[target.index] += diff > 0 ? 1 : -1;
          diff += diff > 0 ? -1 : 1;
        }
        tax = expected;
      }
    }

    lineItems.forEach((item, index) => {
      item.tax = taxAllocations[index] ?? 0;
      if (env.payments.tax.inclusive) {
        item.total = item.subtotal - item.discount;
      } else {
        item.total = item.subtotal - item.discount + item.tax;
      }
    });

    const total = env.payments.tax.inclusive ? subtotal - discount : subtotal - discount + tax;

    return {
      subtotal,
      discount,
      tax,
      total,
      lineItems,
      taxableSubtotal,
      taxableAfterDiscount,
      taxBreakdown: {
        jurisdiction,
        rate,
        inclusive: env.payments.tax.inclusive,
        taxableAmount: taxableAfterDiscount,
        discountApplied: discount,
        calculatedAt: new Date().toISOString()
      }
    };
  }

  static async createPaymentIntent({
    userId,
    provider,
    currency,
    items,
    couponCode,
    tax,
    entity,
    metadata,
    receiptEmail,
    paypal
  }) {
    const normalizedProvider = provider?.toLowerCase();
    if (!['stripe', 'paypal'].includes(normalizedProvider)) {
      const error = new Error('Provider must be either stripe or paypal.');
      error.status = 422;
      throw error;
    }

    const normalizedCurrency = this.normalizeCurrency(currency);

    let coupon = null;
    if (couponCode) {
      coupon = await PaymentCouponModel.findActiveForRedemption(
        couponCode,
        normalizedCurrency,
        db,
        new Date(),
        { lock: false }
      );
      if (!coupon) {
        const error = new Error(`Coupon ${couponCode} is invalid or no longer active.`);
        error.status = 404;
        throw error;
      }
      if (coupon.perUserLimit) {
        const userRedemptions = await PaymentCouponModel.countUserRedemptions(coupon.id, userId);
        if (userRedemptions >= coupon.perUserLimit) {
          const error = new Error(`Coupon ${couponCode} has already been used the maximum number of times for this account.`);
          error.status = 409;
          throw error;
        }
      }
    }

    const totals = this.calculateTotals({ items, coupon, taxRegion: tax, currency: normalizedCurrency });

    const publicId = randomUUID();
    const baseMetadata = {
      ...sanitizeMetadata(metadata),
      items: totals.lineItems.map((item) => ({
        id: item.id,
        name: item.name,
        unitAmount: item.unitAmount,
        quantity: item.quantity,
        discount: item.discount,
        tax: item.tax,
        total: item.total,
        metadata: item.metadata
      })),
      taxableSubtotal: totals.taxableSubtotal,
      taxableAfterDiscount: totals.taxableAfterDiscount,
      couponCode: coupon?.code ?? null,
      couponId: coupon?.id ?? null
    };

    if (normalizedProvider === 'stripe') {
      const stripe = this.getStripeClient();
      let stripeIntent;
      try {
        stripeIntent = await stripe.paymentIntents.create(
          {
            amount: totals.total,
            currency: normalizedCurrency.toLowerCase(),
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: 'always'
            },
            metadata: {
              public_id: publicId,
              entity_type: entity?.type ?? 'commerce-item',
              entity_id: entity?.id ?? publicId,
              ...baseMetadata
            },
            description: entity?.description ?? entity?.name ?? 'Edulure purchase',
            receipt_email: receiptEmail ?? undefined,
            statement_descriptor: env.payments.stripe.statementDescriptor,
            statement_descriptor_suffix: (entity?.name ?? 'Edulure').slice(0, 20)
          },
          {
            idempotencyKey: publicId
          }
        );
      } catch (error) {
        logger.error({ err: error, publicId }, 'Failed to create Stripe payment intent');
        error.status = 502;
        throw error;
      }

      const intentRecord = await PaymentIntentModel.create({
        publicId,
        userId,
        provider: 'stripe',
        providerIntentId: stripeIntent.id,
        status: normalizeProviderStatus('stripe', stripeIntent.status),
        currency: normalizedCurrency,
        amountSubtotal: totals.subtotal,
        amountDiscount: totals.discount,
        amountTax: totals.tax,
        amountTotal: totals.total,
        amountRefunded: 0,
        taxBreakdown: totals.taxBreakdown,
        metadata: baseMetadata,
        couponId: coupon?.id ?? null,
        entityType: entity?.type ?? 'commerce-item',
        entityId: entity?.id ?? publicId,
        receiptEmail
      });

      return {
        provider: 'stripe',
        paymentId: intentRecord.publicId,
        clientSecret: stripeIntent.client_secret,
        status: intentRecord.status,
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total
        }
      };
    }

    if (normalizedProvider === 'paypal') {
      if (!paypal?.returnUrl || !paypal?.cancelUrl) {
        const error = new Error('PayPal payments require returnUrl and cancelUrl to be provided.');
        error.status = 422;
        throw error;
      }

      const lineItems = totals.lineItems.map((item) => ({
        name: item.name.slice(0, 127),
        quantity: String(item.quantity),
        description: item.description?.slice(0, 127) ?? undefined,
        unitAmount: {
          currencyCode: normalizedCurrency,
          value: centsToCurrencyString(item.unitAmount)
        }
      }));

      const breakdown = {
        itemTotal: {
          currencyCode: normalizedCurrency,
          value: centsToCurrencyString(totals.lineItems.reduce((sum, item) => sum + item.subtotal, 0))
        },
        discount: totals.discount
          ? {
              currencyCode: normalizedCurrency,
              value: centsToCurrencyString(totals.discount)
            }
          : undefined,
        taxTotal: totals.tax
          ? {
              currencyCode: normalizedCurrency,
              value: centsToCurrencyString(totals.tax)
            }
          : undefined
      };

      const paypalOrderPayload = {
        intent: 'CAPTURE',
        purchaseUnits: [
          {
            referenceId: entity?.id ?? publicId,
            amount: {
              currencyCode: normalizedCurrency,
              value: centsToCurrencyString(totals.total),
              breakdown
            },
            description: entity?.description?.slice(0, 127) ?? entity?.name?.slice(0, 127),
            customId: entity?.id ?? undefined,
            softDescriptor: (entity?.name ?? 'Edulure').slice(0, 22),
            items: lineItems
          }
        ],
        applicationContext: {
          brandName: paypal.brandName?.slice(0, 127) ?? 'Edulure',
          landingPage: 'NO_PREFERENCE',
          shippingPreference: 'NO_SHIPPING',
          userAction: 'PAY_NOW',
          returnUrl: paypal.returnUrl,
          cancelUrl: paypal.cancelUrl
        }
      };

      let order;
      try {
        order = await this.getPayPalOrdersController().createOrder({
          body: paypalOrderPayload,
          paypalRequestId: publicId,
          prefer: 'return=representation'
        });
      } catch (error) {
        logger.error({ err: error, publicId }, 'Failed to create PayPal order');
        error.status = 502;
        throw error;
      }

      const approvalUrl = order?.result?.links?.find((link) => link.rel === 'approve')?.href ?? null;
      const intentRecord = await PaymentIntentModel.create({
        publicId,
        userId,
        provider: 'paypal',
        providerIntentId: order.result.id,
        status: normalizeProviderStatus('paypal', order.result.status),
        currency: normalizedCurrency,
        amountSubtotal: totals.subtotal,
        amountDiscount: totals.discount,
        amountTax: totals.tax,
        amountTotal: totals.total,
        amountRefunded: 0,
        taxBreakdown: totals.taxBreakdown,
        metadata: baseMetadata,
        couponId: coupon?.id ?? null,
        entityType: entity?.type ?? 'commerce-item',
        entityId: entity?.id ?? publicId,
        receiptEmail
      });

      return {
        provider: 'paypal',
        paymentId: intentRecord.publicId,
        approvalUrl,
        status: intentRecord.status,
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total
        }
      };
    }

    throw new Error('Unsupported payment provider');
  }

  static async capturePayPalOrder(publicId) {
    return db.transaction(async (trx) => {
      const intent = await PaymentIntentModel.lockByPublicId(publicId, trx);
      if (!intent) {
        const error = new Error('Payment intent not found.');
        error.status = 404;
        throw error;
      }
      if (intent.provider !== 'paypal') {
        const error = new Error('Only PayPal payment intents can be captured with this endpoint.');
        error.status = 400;
        throw error;
      }

      if (intent.status === 'succeeded') {
        return this.toApiIntent(intent);
      }

      let captureResponse;
      try {
        captureResponse = await this.getPayPalOrdersController().captureOrder({
          id: intent.providerIntentId,
          paypalRequestId: randomUUID(),
          prefer: 'return=representation'
        });
      } catch (error) {
        logger.error({ err: error, publicId }, 'PayPal capture failed');
        error.status = 502;
        throw error;
      }

      const purchaseUnit = captureResponse.result.purchase_units?.[0];
      const payments = purchaseUnit?.payments;
      const capture = payments?.captures?.[0];
      if (!capture) {
        const error = new Error('PayPal did not return a capture payload.');
        error.status = 502;
        throw error;
      }

      const amountTotal = currencyStringToCents(capture.amount?.value);
      const captureStatus = normalizeProviderStatus('paypal', capture.status);

      const updatedIntent = await PaymentIntentModel.updateById(intent.id, {
        status: captureStatus,
        providerCaptureId: capture.id,
        amountTotal,
        capturedAt: capture.create_time ? new Date(capture.create_time).toISOString() : new Date().toISOString(),
        metadata: {
          ...intent.metadata,
          paypalCapture: capture
        }
      }, trx);

      await PaymentLedgerEntryModel.record(
        {
          paymentIntentId: intent.id,
          entryType: 'charge',
          amount: amountTotal,
          currency: intent.currency,
          details: {
            provider: 'paypal',
            captureId: capture.id,
            status: capture.status,
            fee: capture.seller_receivable_breakdown?.paypal_fee?.value
              ? currencyStringToCents(capture.seller_receivable_breakdown.paypal_fee.value)
              : undefined
          }
        },
        trx
      );

      await this.finaliseCouponRedemption(updatedIntent, trx);

      trackPaymentCaptureMetrics({
        provider: 'paypal',
        currency: intent.currency,
        amountTotal,
        taxAmount: intent.amountTax,
        status: updatedIntent.status
      });

      await handleCommunityPaymentSucceeded(updatedIntent, trx);

      return this.toApiIntent(updatedIntent);
    });
  }

  static async finaliseCouponRedemption(intent, connection = db) {
    if (!intent.couponId) {
      return;
    }

    const coupon = await PaymentCouponModel.findById(intent.couponId, connection, { lock: true });

    if (!coupon) {
      logger.warn({ intentId: intent.id }, 'Coupon no longer active during redemption');
      return;
    }

    const now = new Date();
    if (coupon.status !== 'active') {
      logger.warn({ coupon: coupon.code, intentId: intent.id }, 'Coupon is not active during redemption');
      return;
    }

    if ((coupon.validFrom && new Date(coupon.validFrom) > now) || (coupon.validUntil && new Date(coupon.validUntil) < now)) {
      logger.warn({ coupon: coupon.code, intentId: intent.id }, 'Coupon outside validity window during redemption');
      return;
    }

    if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions) {
      logger.warn({ coupon: coupon.code, intentId: intent.id }, 'Coupon redemption limit reached');
      return;
    }

    if (coupon.perUserLimit) {
      const count = await PaymentCouponModel.countUserRedemptions(coupon.id, intent.userId, connection);
      if (count >= coupon.perUserLimit) {
        logger.warn({ coupon: coupon.code, userId: intent.userId }, 'Coupon per-user limit reached during redemption');
        return;
      }
    }

    await PaymentCouponModel.recordRedemption(
      {
        couponId: coupon.id,
        paymentIntentId: intent.id,
        userId: intent.userId
      },
      connection
    );
  }

  static async handleStripeWebhook(rawBody, signature) {
    const webhookSecret = env.payments.stripe.webhookSecret;
    if (!webhookSecret) {
      const error = new Error('Stripe webhook secret not configured.');
      error.status = 500;
      throw error;
    }

    let event;
    try {
      event = this.getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      logger.error({ err: error }, 'Stripe webhook signature verification failed');
      error.status = 400;
      throw error;
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handleStripePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handleStripePaymentFailed(event.data.object);
        break;
      case 'charge.refunded':
        await this.handleStripeChargeRefunded(event.data.object);
        break;
      default:
        logger.debug({ type: event.type }, 'Unhandled Stripe webhook event');
    }

    return { received: true };
  }

  static async handleStripePaymentSucceeded(paymentIntentPayload) {
    const providerIntentId = paymentIntentPayload.id;
    const amountReceived = Number(paymentIntentPayload.amount_received ?? paymentIntentPayload.amount ?? 0);
    const currency = paymentIntentPayload.currency?.toUpperCase();
    const charge = paymentIntentPayload.charges?.data?.[0];

    await db.transaction(async (trx) => {
      const intent = await PaymentIntentModel.findByProviderIntentId(providerIntentId, trx);
      if (!intent) {
        logger.warn({ providerIntentId }, 'Received success webhook for unknown payment intent');
        return;
      }

      if (intent.status === 'succeeded') {
        return;
      }

      const updated = await PaymentIntentModel.updateById(intent.id, {
        status: 'succeeded',
        amountTotal: amountReceived,
        capturedAt: new Date(paymentIntentPayload.created * 1000).toISOString(),
        providerLatestChargeId: charge?.id,
        failureCode: null,
        failureMessage: null
      }, trx);

      await PaymentLedgerEntryModel.record(
        {
          paymentIntentId: intent.id,
          entryType: 'charge',
          amount: amountReceived,
          currency: currency ?? intent.currency,
          details: {
            provider: 'stripe',
            chargeId: charge?.id,
            balanceTransaction: charge?.balance_transaction,
            paymentMethod: paymentIntentPayload.payment_method_types,
            receiptUrl: charge?.receipt_url
          }
        },
        trx
      );

      await this.finaliseCouponRedemption(updated, trx);

      trackPaymentCaptureMetrics({
        provider: 'stripe',
        currency: currency ?? intent.currency,
        amountTotal: amountReceived,
        taxAmount: intent.amountTax,
        status: 'succeeded'
      });

      await handleCommunityPaymentSucceeded(updated, trx);
    });
  }

  static async handleStripePaymentFailed(paymentIntentPayload) {
    const providerIntentId = paymentIntentPayload.id;
    const failure = paymentIntentPayload.last_payment_error;

    await db.transaction(async (trx) => {
      const intent = await PaymentIntentModel.findByProviderIntentId(providerIntentId, trx);
      if (!intent) {
        logger.warn({ providerIntentId }, 'Received failure webhook for unknown payment intent');
        return;
      }

      const updatedIntent = await PaymentIntentModel.updateById(intent.id, {
        status: 'failed',
        failureCode: failure?.code ?? null,
        failureMessage: failure?.message ?? paymentIntentPayload.cancellation_reason ?? null,
        canceledAt: failure?.created ? new Date(failure.created * 1000).toISOString() : new Date().toISOString()
      }, trx);

      await handleCommunityPaymentFailed(updatedIntent, trx);
    });
  }

  static async handleStripeChargeRefunded(chargePayload) {
    const providerIntentId = chargePayload.payment_intent;
    if (!providerIntentId) {
      return;
    }

    await db.transaction(async (trx) => {
      const intent = await PaymentIntentModel.findByProviderIntentId(providerIntentId, trx);
      if (!intent) {
        logger.warn({ providerIntentId }, 'Charge refund received for unknown payment intent');
        return;
      }

      const refunds = chargePayload.refunds?.data ?? [];
      for (const refund of refunds) {
        const existing = await PaymentRefundModel.findByProviderRefundId(refund.id, trx);
        if (existing) {
          continue;
        }
        await PaymentRefundModel.create(
          {
            paymentIntentId: intent.id,
            providerRefundId: refund.id,
            status: refund.status ?? 'succeeded',
            amount: Number(refund.amount ?? refund.amount_refunded ?? 0),
            currency: refund.currency?.toUpperCase() ?? intent.currency,
            reason: refund.reason ?? null,
            processedAt: refund.created ? new Date(refund.created * 1000).toISOString() : new Date().toISOString()
          },
          trx
        );
        await PaymentLedgerEntryModel.record(
          {
            paymentIntentId: intent.id,
            entryType: 'refund',
            amount: Number(refund.amount ?? 0),
            currency: refund.currency?.toUpperCase() ?? intent.currency,
            details: {
              provider: 'stripe',
              refundId: refund.id
            }
          },
          trx
        );
        await PaymentIntentModel.incrementRefundAmount(intent.id, Number(refund.amount ?? 0), trx);

        trackPaymentRefundMetrics({
          provider: 'stripe',
          currency: refund.currency?.toUpperCase() ?? intent.currency,
          amount: Number(refund.amount ?? 0)
        });

        const updatedIntent = await PaymentIntentModel.findById(intent.id, trx);
        await handleCommunityPaymentRefunded(updatedIntent, Number(refund.amount ?? 0), trx);
      }

      const refreshed = await PaymentIntentModel.findById(intent.id, trx);
      if (refreshed.amountRefunded >= refreshed.amountTotal) {
        await PaymentIntentModel.updateById(intent.id, { status: 'refunded' }, trx);
      } else if (refreshed.amountRefunded > 0) {
        await PaymentIntentModel.updateById(intent.id, { status: 'partially_refunded' }, trx);
      }
    });
  }

  static async issueRefund({ paymentPublicId, amount, reason, requesterId }) {
    return db.transaction(async (trx) => {
      const intent = await PaymentIntentModel.lockByPublicId(paymentPublicId, trx);
      if (!intent) {
        const error = new Error('Payment intent not found.');
        error.status = 404;
        throw error;
      }

      if (!['succeeded', 'partially_refunded'].includes(intent.status)) {
        const error = new Error('Only settled payments can be refunded.');
        error.status = 400;
        throw error;
      }

      const available = intent.amountTotal - intent.amountRefunded;
      if (available <= 0) {
        const error = new Error('Payment has already been fully refunded.');
        error.status = 400;
        throw error;
      }

      const refundAmount = amount ? Number(amount) : available;
      if (!Number.isInteger(refundAmount) || refundAmount <= 0) {
        const error = new Error('Refund amount must be a positive integer expressed in cents.');
        error.status = 422;
        throw error;
      }
      if (refundAmount > available) {
        const error = new Error('Refund amount exceeds available refundable balance.');
        error.status = 422;
        throw error;
      }

      if (intent.provider === 'stripe') {
        const stripe = this.getStripeClient();
        const refund = await stripe.refunds.create(
          {
            payment_intent: intent.providerIntentId,
            amount: refundAmount,
            reason: reason ?? undefined
          },
          { idempotencyKey: randomUUID() }
        );

        await PaymentRefundModel.create(
          {
            paymentIntentId: intent.id,
            providerRefundId: refund.id,
            status: refund.status ?? 'pending',
            amount: refundAmount,
            currency: intent.currency,
            reason: refund.reason ?? reason ?? null,
            requestedBy: requesterId ?? null
          },
          trx
        );
      } else if (intent.provider === 'paypal') {
        if (!intent.providerCaptureId) {
          const error = new Error('Cannot issue a PayPal refund before the capture step.');
          error.status = 400;
          throw error;
        }

        const refundRequest = refundAmount === available ? {} : {
          amount: {
            currencyCode: intent.currency,
            value: centsToCurrencyString(refundAmount)
          }
        };

        const response = await this.getPayPalPaymentsController().refundCapturedPayment({
          captureId: intent.providerCaptureId,
          body: refundRequest,
          paypalRequestId: randomUUID()
        });

        await PaymentRefundModel.create(
          {
            paymentIntentId: intent.id,
            providerRefundId: response.result.id,
            status: normalizeProviderStatus('paypal', response.result.status),
            amount: refundAmount,
            currency: intent.currency,
            reason: response.result.reason ?? reason ?? null,
            processedAt: response.result.create_time
              ? new Date(response.result.create_time).toISOString()
              : new Date().toISOString(),
            requestedBy: requesterId ?? null
          },
          trx
        );
      } else {
        const error = new Error('Refunds are only supported for Stripe and PayPal payments.');
        error.status = 400;
        throw error;
      }

      await PaymentIntentModel.incrementRefundAmount(intent.id, refundAmount, trx);
      const refreshed = await PaymentIntentModel.findById(intent.id, trx);
      const newStatus = refreshed.amountRefunded >= refreshed.amountTotal ? 'refunded' : 'partially_refunded';
      await PaymentIntentModel.updateById(intent.id, { status: newStatus }, trx);

      await PaymentLedgerEntryModel.record(
        {
          paymentIntentId: intent.id,
          entryType: 'refund',
          amount: refundAmount,
          currency: intent.currency,
          details: {
            provider: intent.provider,
            reason: reason ?? null
          }
        },
        trx
      );

      trackPaymentRefundMetrics({
        provider: intent.provider,
        currency: intent.currency,
        amount: refundAmount
      });

      const finalIntent = await PaymentIntentModel.findById(intent.id, trx);
      await handleCommunityPaymentRefunded(finalIntent, refundAmount, trx);
      return this.toApiIntent(finalIntent);
    });
  }

  static async getFinanceSummary({ startDate, endDate, currency }) {
    const normalizedCurrency = currency ? this.normalizeCurrency(currency) : null;

    const paymentsQuery = db('payment_intents')
      .select('currency')
      .sum({ gross: 'amount_total' })
      .sum({ discount: 'amount_discount' })
      .sum({ tax: 'amount_tax' })
      .sum({ refunded: 'amount_refunded' })
      .count({ total: '*' })
      .whereIn('status', ['succeeded', 'partially_refunded', 'refunded']);

    if (startDate) {
      paymentsQuery.andWhere('captured_at', '>=', startDate);
    }
    if (endDate) {
      paymentsQuery.andWhere('captured_at', '<=', endDate);
    }
    if (normalizedCurrency) {
      paymentsQuery.andWhere('currency', normalizedCurrency);
    }

    const rows = await paymentsQuery.groupBy('currency');
    return rows.map((row) => {
      const gross = Number(row.gross ?? 0);
      const discount = Number(row.discount ?? 0);
      const tax = Number(row.tax ?? 0);
      const refunded = Number(row.refunded ?? 0);
      return {
        currency: row.currency,
        gross,
        discount,
        net: gross - discount,
        tax,
        refunded,
        captured: Number(row.total ?? 0)
      };
    });
  }
}

export default PaymentService;
