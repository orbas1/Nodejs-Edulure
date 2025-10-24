import AccountBillingService from './AccountBillingService.js';
import CommunityPaywallTierModel from '../models/CommunityPaywallTierModel.js';
import CommunitySubscriptionModel from '../models/CommunitySubscriptionModel.js';
import LearnerDashboardService from './LearnerDashboardService.js';
import LearnerFinancialProfileModel from '../models/LearnerFinancialProfileModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

const BILLING_INTERVAL_MAP = new Map([
  ['monthly', 'monthly'],
  ['month', 'monthly'],
  ['m', 'monthly'],
  ['quarterly', 'quarterly'],
  ['quarter', 'quarterly'],
  ['q', 'quarterly'],
  ['annual', 'yearly'],
  ['annually', 'yearly'],
  ['yearly', 'yearly'],
  ['year', 'yearly']
]);

const SUBSCRIPTION_STATUS_MAP = new Map([
  ['active', 'active'],
  ['trial', 'trialing'],
  ['trialing', 'trialing'],
  ['trialling', 'trialing'],
  ['past_due', 'pastDue'],
  ['past-due', 'pastDue'],
  ['pastdue', 'pastDue'],
  ['unpaid', 'pastDue'],
  ['paused', 'pastDue'],
  ['waiting', 'inProgress'],
  ['pending', 'inProgress'],
  ['canceled', 'canceled'],
  ['cancelled', 'canceled'],
  ['incomplete', 'pastDue']
]);

const INVOICE_STATUS_MAP = new Map([
  ['paid', 'paid'],
  ['succeeded', 'paid'],
  ['complete', 'paid'],
  ['open', 'open'],
  ['draft', 'open'],
  ['processing', 'pending'],
  ['pending', 'pending'],
  ['requires_payment_method', 'pending'],
  ['requires_action', 'pending'],
  ['past_due', 'pastDue'],
  ['past-due', 'pastDue'],
  ['unpaid', 'pastDue'],
  ['void', 'voided'],
  ['voided', 'voided'],
  ['canceled', 'voided'],
  ['cancelled', 'voided'],
  ['refunded', 'paid']
]);

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'trial', 'past_due', 'past-due', 'waiting', 'pending']);

function centsToDollars(value) {
  const cents = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Math.round(cents) / 100;
}

function ensureArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return [value].filter(Boolean);
}

function normaliseEntitlements(tier, subscription) {
  const tierBenefits = ensureArray(tier?.benefits).map((benefit) => {
    if (typeof benefit === 'string') {
      return benefit;
    }
    if (benefit && typeof benefit.title === 'string') {
      return benefit.title;
    }
    if (benefit && typeof benefit.name === 'string') {
      return benefit.name;
    }
    return null;
  });

  const metadataEntitlements = ensureArray(subscription?.metadata?.entitlements).map((item) => {
    if (typeof item === 'string') {
      return item;
    }
    if (item && typeof item.title === 'string') {
      return item.title;
    }
    if (item && typeof item.name === 'string') {
      return item.name;
    }
    return null;
  });

  const combined = [...tierBenefits, ...metadataEntitlements].filter(Boolean);
  const unique = new Set(combined);
  if (unique.size === 0) {
    unique.add('Learning platform access');
  }
  return Array.from(unique);
}

function resolveBillingCycle(tier, subscription) {
  const source = subscription?.metadata?.billingInterval ?? tier?.billingInterval ?? 'monthly';
  const key = String(source).toLowerCase();
  return BILLING_INTERVAL_MAP.get(key) ?? 'monthly';
}

function mapSubscriptionStatus(subscription) {
  const status = subscription?.providerStatus ?? subscription?.status ?? 'active';
  const normalised = String(status).toLowerCase();
  return SUBSCRIPTION_STATUS_MAP.get(normalised) ?? 'active';
}

function buildUsageMetrics(profile, subscription) {
  const usage = [];
  const seatUsage = subscription?.metadata?.seatUsage ?? profile?.preferences?.seatUsage ?? null;
  if (seatUsage && (seatUsage.used !== undefined || seatUsage.total !== undefined)) {
    const used = Number.isFinite(Number(seatUsage.used)) ? Number(seatUsage.used) : 0;
    const total = Number.isFinite(Number(seatUsage.total)) ? Number(seatUsage.total) : null;
    usage.push({
      metric: 'seats',
      unit: 'seat',
      quantity: used,
      limit: total,
      included: Number.isFinite(Number(seatUsage.included))
        ? Number(seatUsage.included)
        : total ?? used
    });
  }
  if (Array.isArray(subscription?.metadata?.usage)) {
    subscription.metadata.usage.forEach((entry) => {
      if (!entry) {
        return;
      }
      const metric = entry.metric ?? entry.name;
      if (!metric) {
        return;
      }
      const quantity = Number.isFinite(Number(entry.quantity)) ? Number(entry.quantity) : 0;
      const limit = Number.isFinite(Number(entry.limit)) ? Number(entry.limit) : undefined;
      usage.push({
        metric: String(metric),
        unit: entry.unit ? String(entry.unit) : 'count',
        quantity,
        limit,
        included: Number.isFinite(Number(entry.included)) ? Number(entry.included) : 0
      });
    });
  }
  return usage;
}

function mapInvoiceStatus(status) {
  const normalised = String(status ?? 'open').toLowerCase();
  return INVOICE_STATUS_MAP.get(normalised) ?? 'open';
}

function buildInvoiceLines(invoice, plan) {
  const amount = centsToDollars(invoice.amountDueCents ?? plan?.amountCents ?? 0);
  const unitPrice = centsToDollars(plan?.amountCents ?? invoice.amountDueCents ?? 0);
  const title = plan?.name ?? invoice.metadata?.planName ?? 'Subscription';
  return [
    {
      title,
      quantity: 1,
      amount,
      unitPrice,
      metadata: {
        reference: invoice.number ?? invoice.id,
        entityType: invoice.entityType ?? 'subscription'
      }
    }
  ];
}

function mapInvoice(invoice, plan) {
  const issuedAt = invoice.issuedAt ? new Date(invoice.issuedAt).toISOString() : new Date().toISOString();
  const dueAt = invoice.dueAt ? new Date(invoice.dueAt).toISOString() : null;
  const paidAt = invoice.status && String(invoice.status).toLowerCase() === 'paid' ? issuedAt : null;
  const status = mapInvoiceStatus(invoice.status);
  return {
    id: String(invoice.id ?? invoice.number ?? `inv-${Date.now()}`),
    number: invoice.number ?? invoice.id ?? 'INV',
    amount: centsToDollars(invoice.amountDueCents ?? invoice.amountCents ?? 0),
    currency: invoice.currency ?? plan?.currency ?? 'USD',
    status,
    issuedAt,
    dueAt,
    paidAt,
    lines: buildInvoiceLines(invoice, plan),
    tax: centsToDollars(invoice.amountTax ?? 0),
    discount: centsToDollars(invoice.amountDiscount ?? 0)
  };
}

function resolveCustomerId(subscription, profile, userId) {
  return (
    subscription?.providerCustomerId ||
    subscription?.metadata?.customerId ||
    profile?.preferences?.customerId ||
    profile?.preferences?.billingCustomerId ||
    `learner-${userId}`
  );
}

function toPlan(tier, subscription, profile) {
  const amountCents = tier?.priceCents ?? subscription?.metadata?.amountDueCents ?? subscription?.metadata?.priceCents ?? 0;
  const metadata = {
    ...(tier?.metadata ?? {}),
    ...(subscription?.metadata ?? {})
  };
  const planId = subscription?.tierId ? String(subscription.tierId) : subscription?.metadata?.planId ?? 'default-plan';
  return {
    id: planId,
    name: tier?.name ?? subscription?.metadata?.planName ?? 'Subscription',
    description: tier?.description ?? subscription?.metadata?.planDescription ?? 'Learner subscription plan',
    amount: centsToDollars(amountCents),
    currency: tier?.currency ?? subscription?.metadata?.currency ?? profile?.preferences?.currency ?? 'USD',
    cycle: resolveBillingCycle(tier, subscription),
    entitlements: normaliseEntitlements(tier, subscription),
    trialDays: tier?.trialPeriodDays ?? subscription?.metadata?.trialDays ?? null,
    maxSeats: Number.isFinite(Number(subscription?.metadata?.seatUsage?.total))
      ? Number(subscription.metadata.seatUsage.total)
      : 1,
    metadata
  };
}

function pickActiveSubscription(subscriptions) {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return null;
  }
  const active = subscriptions.find((subscription) => ACTIVE_STATUSES.has(String(subscription.status ?? '').toLowerCase()));
  if (active) {
    return active;
  }
  return subscriptions[0];
}

function hasOutstandingInvoices(invoices) {
  return invoices.some((invoice) => ['open', 'pending', 'pastDue'].includes(invoice.status));
}

function mapPurchaseToInvoice(purchase, context = {}) {
  const issuedAt = purchase.purchasedAt ? new Date(purchase.purchasedAt).toISOString() : new Date().toISOString();
  const amount = centsToDollars(purchase.amountCents ?? 0);
  return {
    id: `purchase-${purchase.id}`,
    number: purchase.reference ?? `PUR-${purchase.id}`,
    amount,
    currency: purchase.currency ?? context.currency ?? 'USD',
    status: mapInvoiceStatus(purchase.status ?? 'paid'),
    issuedAt,
    dueAt: null,
    paidAt: purchase.status === 'paid' ? issuedAt : null,
    lines: [
      {
        title: context.planName ?? purchase.description ?? 'Subscription',
        quantity: 1,
        amount,
        unitPrice: amount,
        metadata: {
          planId: context.planId ?? null,
          platform: context.platform ?? null
        }
      }
    ],
    tax: 0,
    discount: 0
  };
}

export default class MobileBillingService {
  static async getSnapshot(userId) {
    if (!userId) {
      throw new Error('Authentication required to load billing snapshot');
    }

    const [profile, subscriptions, invoiceRecords] = await Promise.all([
      LearnerFinancialProfileModel.findByUserId(userId),
      CommunitySubscriptionModel.listByUser(userId),
      AccountBillingService.listInvoices(userId)
    ]);

    const subscription = pickActiveSubscription(subscriptions);
    const tier = subscription?.tierId ? await CommunityPaywallTierModel.findById(subscription.tierId) : null;
    const plan = toPlan(tier, subscription, profile);
    const invoices = invoiceRecords.map((invoice) => mapInvoice(invoice, plan));
    const usage = buildUsageMetrics(profile, subscription);

    const snapshot = {
      customerId: resolveCustomerId(subscription, profile, userId),
      status: mapSubscriptionStatus(subscription),
      plan,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      invoices,
      usage,
      updatedAt: new Date().toISOString(),
      paymentMethodRequired: hasOutstandingInvoices(invoices),
      gracePeriodEndsAt:
        subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd
          ? subscription.currentPeriodEnd
          : subscription?.expiresAt ?? subscription?.metadata?.gracePeriodEndsAt ?? null
    };

    return snapshot;
  }

  static async recordPurchase(userId, payload = {}) {
    if (!userId) {
      throw new Error('Authentication required to record purchase');
    }

    const planId = typeof payload.planId === 'string' && payload.planId.trim().length
      ? payload.planId.trim()
      : 'mobile-plan';
    const description = payload.description?.trim() || `In-app purchase for ${planId}`;
    const amountNumeric = Number(payload.amount ?? payload.amountDollars ?? 0);
    const amountCents = Math.max(0, Math.round(Number.isFinite(amountNumeric) ? amountNumeric * 100 : 0));
    const currency = typeof payload.currency === 'string' ? payload.currency.trim().toUpperCase() : 'USD';

    const purchase = await LearnerDashboardService.createFinancePurchase(userId, {
      reference: payload.reference?.toString() ?? `MOBILE-${planId}`,
      description,
      amountCents,
      currency,
      status: payload.trial ? 'pending' : 'paid',
      purchasedAt: payload.purchasedAt ?? new Date(),
      metadata: {
        platform: payload.platform ?? 'mobile',
        purchaseToken: payload.purchaseToken ?? null,
        planId,
        trial: Boolean(payload.trial),
        raw: payload.metadata ?? {}
      }
    });

    return mapPurchaseToInvoice(purchase, {
      planId,
      planName: description,
      platform: payload.platform,
      currency
    });
  }

  static async cancelSubscription(userId, { reason, cancelAtPeriodEnd = false } = {}) {
    if (!userId) {
      throw new Error('Authentication required to cancel subscription');
    }

    const subscriptions = await CommunitySubscriptionModel.listByUser(userId);
    const subscription = pickActiveSubscription(subscriptions);
    if (!subscription) {
      const error = new Error('No active subscription found');
      error.status = 404;
      throw error;
    }

    const metadata = {
      ...(subscription.metadata ?? {}),
      cancellationReason: reason ?? null,
      cancelRequestedAt: new Date().toISOString()
    };

    const updates = cancelAtPeriodEnd
      ? { cancelAtPeriodEnd: true, metadata }
      : {
          status: 'canceled',
          canceledAt: new Date().toISOString(),
          cancelAtPeriodEnd: false,
          providerStatus: 'canceled',
          metadata
        };

    await CommunitySubscriptionModel.updateByPublicId(subscription.publicId, updates);

    await DomainEventModel.record({
      entityType: 'community_subscription',
      entityId: subscription.publicId,
      eventType: cancelAtPeriodEnd
        ? 'community.subscription.cancel-at-period-end'
        : 'community.subscription.canceled',
      payload: {
        cancelAtPeriodEnd,
        reason: reason ?? null,
        communityId: subscription.communityId,
        userId
      },
      performedBy: userId
    });
  }
}
