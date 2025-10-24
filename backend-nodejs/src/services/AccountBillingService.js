import { randomUUID } from 'node:crypto';

import { env } from '../config/env.js';
import BillingPortalSessionModel from '../models/BillingPortalSessionModel.js';
import CommunityPaywallTierModel from '../models/CommunityPaywallTierModel.js';
import CommunitySubscriptionModel from '../models/CommunitySubscriptionModel.js';
import LearnerFinancePurchaseModel from '../models/LearnerFinancePurchaseModel.js';
import LearnerFinancialProfileModel from '../models/LearnerFinancialProfileModel.js';
import LearnerPaymentMethodModel from '../models/LearnerPaymentMethodModel.js';
import PaymentIntentModel from '../models/PaymentIntentModel.js';

const OUTSTANDING_PAYMENT_STATUSES = new Set([
  'requires_payment_method',
  'requires_action',
  'open',
  'past_due',
  'unpaid'
]);

const SUCCESS_STATUSES = new Set(['succeeded', 'paid', 'complete']);

const STATUS_LABEL_OVERRIDES = new Map([
  ['requires_payment_method', 'Payment method required'],
  ['requires_action', 'Action required'],
  ['past_due', 'Past due'],
  ['unpaid', 'Unpaid'],
  ['open', 'Open'],
  ['succeeded', 'Paid'],
  ['paid', 'Paid'],
  ['complete', 'Completed']
]);

const BILLING_INTERVAL_LABELS = new Map([
  ['monthly', 'Monthly billing'],
  ['quarterly', 'Quarterly billing'],
  ['annual', 'Annual billing'],
  ['one_time', 'One-time charge'],
  ['usage', 'Usage-based billing']
]);

function normaliseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normaliseIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function humaniseStatus(status) {
  if (!status) {
    return 'Unknown';
  }
  const lowered = String(status).toLowerCase();
  if (STATUS_LABEL_OVERRIDES.has(lowered)) {
    return STATUS_LABEL_OVERRIDES.get(lowered);
  }
  return lowered
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveIntervalLabel(interval) {
  if (!interval) {
    return 'Flexible billing';
  }
  const lowered = String(interval).toLowerCase();
  if (BILLING_INTERVAL_LABELS.has(lowered)) {
    return BILLING_INTERVAL_LABELS.get(lowered);
  }
  return humaniseStatus(lowered);
}

function clampSeatUsage(usage) {
  if (!usage || typeof usage !== 'object') {
    return null;
  }
  const used = normaliseNumber(usage.used ?? usage.current ?? usage.active);
  const total = normaliseNumber(usage.total ?? usage.capacity);
  if (used === null && total === null) {
    return null;
  }
  return {
    used: used ?? 0,
    total: total ?? used ?? 0
  };
}

function parseExpiry(expiry) {
  if (!expiry || typeof expiry !== 'string') {
    return { expMonth: null, expYear: null };
  }
  const [monthRaw, yearRaw] = expiry.split('/');
  const month = Number.parseInt(monthRaw, 10);
  const year = Number.parseInt(yearRaw, 10);
  return {
    expMonth: Number.isFinite(month) ? month : null,
    expYear: Number.isFinite(year) ? (year > 100 ? year : 2000 + year) : null
  };
}

function resolvePlanAmount({ tier, subscription, invoices }) {
  if (tier?.priceCents) {
    return tier.priceCents;
  }
  const latestPaid = invoices.find((invoice) => SUCCESS_STATUSES.has(String(invoice.status).toLowerCase()));
  if (latestPaid?.amountDueCents) {
    return latestPaid.amountDueCents;
  }
  const billed = normaliseNumber(subscription?.metadata?.amount_due_cents ?? subscription?.metadata?.amountDueCents);
  return billed ?? null;
}

function resolveCurrency({ tier, invoices, profile }) {
  if (tier?.currency) {
    return tier.currency;
  }
  const latestInvoice = invoices[0];
  if (latestInvoice?.currency) {
    return latestInvoice.currency;
  }
  if (profile?.preferences?.currency) {
    return profile.preferences.currency;
  }
  return 'USD';
}

function pickLatestDate(...values) {
  const timestamps = values
    .map((value) => {
      const date = value instanceof Date ? value : value ? new Date(value) : null;
      return date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
    })
    .filter((value) => value !== null);
  if (timestamps.length === 0) {
    return null;
  }
  return new Date(Math.max(...timestamps));
}

function normaliseInvoiceFromIntent(intent) {
  if (!intent) {
    return null;
  }
  const amountTotal = normaliseNumber(intent.amountTotal) ?? 0;
  const amountRefunded = normaliseNumber(intent.amountRefunded) ?? 0;
  const outstanding = Math.max(0, amountTotal - amountRefunded);
  const metadata = intent.metadata ?? {};
  const dueAtRaw = metadata.dueAt ?? metadata.due_at ?? metadata.dueDate ?? metadata.due_date ?? null;
  const issuedAt = intent.capturedAt ?? intent.createdAt ?? null;

  return {
    id: intent.publicId ?? String(intent.id),
    number: metadata.invoiceNumber ?? metadata.public_id ?? intent.publicId ?? String(intent.id),
    issuedAt: normaliseIso(issuedAt),
    dueAt: normaliseIso(dueAtRaw),
    amountDueCents: outstanding || null,
    currency: intent.currency ?? metadata.currency ?? 'USD',
    status: intent.status ?? 'unknown',
    statusLabel: humaniseStatus(intent.status ?? 'unknown'),
    downloadUrl: metadata.invoiceUrl ?? metadata.receiptUrl ?? null
  };
}

function normaliseInvoiceFromPurchase(purchase) {
  if (!purchase) {
    return null;
  }
  const metadata = purchase.metadata ?? {};
  const dueAtRaw = metadata.dueAt ?? metadata.due_at ?? null;
  return {
    id: `purchase-${purchase.id}`,
    number: purchase.reference ?? `PUR-${purchase.id}`,
    issuedAt: normaliseIso(purchase.purchasedAt ?? purchase.createdAt),
    dueAt: normaliseIso(dueAtRaw),
    amountDueCents: normaliseNumber(purchase.amountCents) ?? 0,
    currency: purchase.currency ?? metadata.currency ?? 'USD',
    status: purchase.status ?? 'paid',
    statusLabel: humaniseStatus(purchase.status ?? 'paid'),
    downloadUrl: metadata.receiptUrl ?? metadata.invoiceUrl ?? null
  };
}

function resolvePortalConfig() {
  const config = env?.payments?.billingPortal ?? {};
  const baseUrl = config.baseUrl ?? buildDefaultPortalUrl();
  return {
    enabled: config.enabled !== false,
    baseUrl,
    allowedReturnOrigins: Array.isArray(config.allowedReturnOrigins) ? config.allowedReturnOrigins : [],
    sessionTtlSeconds: Number.isFinite(config.sessionTtlSeconds) ? config.sessionTtlSeconds : 600
  };
}

function buildDefaultPortalUrl() {
  const appBase = env?.app?.baseUrl ?? 'https://app.edulure.test';
  try {
    const url = new URL(appBase);
    url.pathname = [url.pathname.replace(/\/$/, ''), 'billing', 'portal'].filter(Boolean).join('/');
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (_error) {
    return 'https://app.edulure.test/billing/portal';
  }
}

function normaliseReturnUrl(requestedUrl, allowedOrigins = []) {
  if (!requestedUrl) {
    return null;
  }
  try {
    const url = new URL(requestedUrl, allowedOrigins[0] ?? undefined);
    if (!url.protocol || !url.host) {
      return null;
    }
    const origin = `${url.protocol}//${url.host}`;
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return url.toString();
    }
    return null;
  } catch (_error) {
    return null;
  }
}

export default class AccountBillingService {
  static async getBillingOverview(userId) {
    if (!userId) {
      throw new Error('A user identifier is required to load billing overview');
    }

    await BillingPortalSessionModel.expireStaleSessions(new Date());

    const [profile, subscriptions, paymentIntentsRaw, purchasesRaw] = await Promise.all([
      LearnerFinancialProfileModel.findByUserId(userId),
      CommunitySubscriptionModel.listByUser(userId),
      PaymentIntentModel.listByUser(userId, { limit: 10 }),
      LearnerFinancePurchaseModel.listByUserId(userId)
    ]);

    const invoices = [
      ...paymentIntentsRaw.map(normaliseInvoiceFromIntent).filter(Boolean),
      ...purchasesRaw.map(normaliseInvoiceFromPurchase).filter(Boolean)
    ].sort((a, b) => {
      const aTime = a.issuedAt ? new Date(a.issuedAt).getTime() : 0;
      const bTime = b.issuedAt ? new Date(b.issuedAt).getTime() : 0;
      return bTime - aTime;
    });

    const activeSubscription = subscriptions.find((subscription) => {
      const status = String(subscription.status ?? '').toLowerCase();
      if (!status) {
        return false;
      }
      return status === 'active' || status === 'trialing' || status === 'past_due';
    }) ?? subscriptions[0] ?? null;

    const tier = activeSubscription?.tierId
      ? await CommunityPaywallTierModel.findById(activeSubscription.tierId)
      : null;

    const outstandingInvoice = invoices.find((invoice) =>
      OUTSTANDING_PAYMENT_STATUSES.has(String(invoice.status).toLowerCase())
    );

    const amountDueCents = outstandingInvoice?.amountDueCents ?? null;
    const currency = resolveCurrency({ tier, invoices, profile });
    const planAmount = resolvePlanAmount({ tier, subscription: activeSubscription, invoices });
    const nextPaymentDate = activeSubscription?.currentPeriodEnd ?? outstandingInvoice?.dueAt ?? null;

    const seatUsage =
      clampSeatUsage(profile?.preferences?.seatUsage) ??
      clampSeatUsage(activeSubscription?.metadata?.seatUsage);

    const collectionMethodLabel = profile?.autoPayEnabled === false
      ? 'Manual invoicing'
      : profile?.preferences?.collectionMethod ?? 'Automatic card collection';

    const supportTier = profile?.preferences?.supportTier ?? 'Standard support';
    const supportNotes =
      profile?.preferences?.supportNotes ?? 'Escalations route through customer success with a 1 business day SLA.';

    const renewalTerm =
      profile?.preferences?.renewalTerm ?? resolveIntervalLabel(tier?.billingInterval ?? activeSubscription?.metadata?.billingInterval);

    const renewalNotes = profile?.preferences?.renewalNotes ?? 'Update renewal preferences from the billing portal.';

    const lastSyncedAt =
      pickLatestDate(
        outstandingInvoice?.issuedAt,
        activeSubscription?.updatedAt,
        profile?.updatedAt,
        invoices[0]?.issuedAt
      ) ?? new Date();

    return {
      planName: tier?.name ?? activeSubscription?.metadata?.planName ?? 'Current plan',
      planAmount,
      amountDueCents,
      currency,
      status: activeSubscription?.providerStatus ?? activeSubscription?.status ?? 'unknown',
      statusLabel: humaniseStatus(activeSubscription?.providerStatus ?? activeSubscription?.status ?? 'unknown'),
      billingIntervalLabel: resolveIntervalLabel(tier?.billingInterval ?? activeSubscription?.metadata?.billingInterval),
      nextPaymentDueAt: normaliseIso(nextPaymentDate),
      collectionMethodLabel,
      supportTier,
      supportNotes,
      renewalTerm,
      renewalNotes,
      seatUsage,
      lastSyncedAt: normaliseIso(lastSyncedAt)
    };
  }

  static async listPaymentMethods(userId) {
    if (!userId) {
      throw new Error('A user identifier is required to list payment methods');
    }

    const methods = await LearnerPaymentMethodModel.listByUserId(userId);
    return methods.map((method) => {
      const metadata = method.metadata ?? {};
      const type = metadata.type ?? metadata.brand ?? (method.brand ? 'card' : metadata.accountType ?? 'payment_method');
      const { expMonth, expYear } = parseExpiry(method.expiry ?? metadata.expiry);
      return {
        id: String(method.id),
        brand: method.brand ?? metadata.brand ?? null,
        type,
        last4: method.last4 ?? metadata.last4 ?? null,
        expMonth,
        expYear,
        default: Boolean(method.primary),
        statusLabel: metadata.statusLabel ?? (method.primary ? 'Default' : 'Backup'),
        displayLabel: method.label ?? metadata.label ?? 'Payment method'
      };
    });
  }

  static async listInvoices(userId) {
    if (!userId) {
      throw new Error('A user identifier is required to list invoices');
    }

    const [paymentIntents, purchases] = await Promise.all([
      PaymentIntentModel.listByUser(userId, { limit: 25 }),
      LearnerFinancePurchaseModel.listByUserId(userId)
    ]);

    const invoices = [
      ...paymentIntents.map(normaliseInvoiceFromIntent).filter(Boolean),
      ...purchases.map(normaliseInvoiceFromPurchase).filter(Boolean)
    ];

    return invoices.sort((a, b) => {
      const aTime = a.issuedAt ? new Date(a.issuedAt).getTime() : 0;
      const bTime = b.issuedAt ? new Date(b.issuedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  static async createPortalSession(user, { returnUrl } = {}) {
    if (!user?.id) {
      throw new Error('Authentication required to create a billing portal session');
    }

    const config = resolvePortalConfig();
    if (!config.enabled) {
      throw Object.assign(new Error('Billing portal is disabled'), { status: 503 });
    }

    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000);
    const resolvedReturnUrl = normaliseReturnUrl(returnUrl, config.allowedReturnOrigins);

    let portalUrl;
    try {
      const url = new URL(config.baseUrl);
      url.searchParams.set('session', sessionToken);
      if (resolvedReturnUrl) {
        url.searchParams.set('return_url', resolvedReturnUrl);
      }
      portalUrl = url.toString();
    } catch (error) {
      throw Object.assign(new Error('Invalid billing portal configuration'), { status: 500, cause: error });
    }

    await BillingPortalSessionModel.create({
      userId: user.id,
      token: sessionToken,
      portalUrl,
      returnUrl: resolvedReturnUrl,
      expiresAt,
      metadata: {
        requestedBy: user.email ?? user.id,
        actorRoles: user.roles ?? [],
        userAgent: user.userAgent ?? null
      }
    });

    return {
      url: portalUrl,
      expiresAt: expiresAt.toISOString()
    };
  }
}
