import { httpClient } from './httpClient.js';

function ensureToken(token) {
  if (!token) {
    throw new Error('Authentication is required to load billing data.');
  }
}

function normaliseBillingOverview(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const subscription = payload.subscription ?? {};
  const plan = subscription.plan ?? payload.plan ?? {};

  return {
    planName: plan.name ?? subscription.name ?? 'Current plan',
    planAmount: plan.amount_cents ?? plan.amountCents ?? null,
    amountDueCents: payload.amount_due_cents ?? payload.amountDueCents ?? null,
    currency: plan.currency ?? payload.currency ?? 'USD',
    status: subscription.status ?? payload.status ?? null,
    statusLabel: subscription.status_label ?? payload.statusLabel ?? subscription.status ?? 'Unknown',
    billingIntervalLabel: plan.interval_label ?? payload.intervalLabel ?? null,
    nextPaymentDueAt: subscription.next_payment_due_at ?? payload.nextPaymentDueAt ?? null,
    collectionMethodLabel: subscription.collection_method_label ?? payload.collectionMethodLabel ?? null,
    supportTier: payload.support_tier ?? payload.supportTier ?? null,
    supportNotes: payload.support_notes ?? payload.supportNotes ?? null,
    renewalTerm: payload.renewal_term ?? payload.renewalTerm ?? null,
    renewalNotes: payload.renewal_notes ?? payload.renewalNotes ?? null,
    seatUsage: payload.seat_usage ?? payload.seatUsage ?? null,
    lastSyncedAt: payload.synced_at ?? payload.lastSyncedAt ?? null
  };
}

function normalisePaymentMethod(method) {
  if (!method || typeof method !== 'object') {
    return null;
  }

  const brand = method.brand ?? method.card_brand ?? method.bank_name ?? null;
  const type = method.type ?? (method.card_brand ? 'card' : method.bank_name ? 'bank_account' : null);

  return {
    id: String(method.id ?? method.reference ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
    brand,
    type,
    last4: method.last4 ?? method.last_four ?? null,
    expMonth: method.exp_month ?? method.expiry_month ?? null,
    expYear: method.exp_year ?? method.expiry_year ?? null,
    default: Boolean(method.default ?? method.is_default ?? method.primary),
    statusLabel: method.status_label ?? method.statusLabel ?? null,
    displayLabel: method.display_label ?? method.displayLabel ?? brand ?? type ?? 'Payment method'
  };
}

function normaliseInvoice(invoice) {
  if (!invoice || typeof invoice !== 'object') {
    return null;
  }

  return {
    id: String(invoice.id ?? invoice.reference ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
    number: invoice.number ?? null,
    issuedAt: invoice.issued_at ?? invoice.issuedAt ?? invoice.created_at ?? invoice.createdAt ?? null,
    dueAt: invoice.due_at ?? invoice.dueAt ?? null,
    amountDueCents: invoice.amount_due_cents ?? invoice.amountDueCents ?? invoice.total_cents ?? invoice.totalCents ?? null,
    currency: invoice.currency ?? 'USD',
    status: invoice.status ?? null,
    statusLabel: invoice.status_label ?? invoice.statusLabel ?? invoice.status ?? null,
    downloadUrl: invoice.pdf_url ?? invoice.download_url ?? invoice.downloadUrl ?? null
  };
}

export async function fetchBillingOverview({ token, signal } = {}) {
  ensureToken(token);
  const response = await httpClient.get('/account/billing/overview', {
    token,
    signal,
    cache: {
      ttl: 30_000,
      tags: ['billing:overview'],
      varyByToken: true
    }
  });

  return normaliseBillingOverview(response?.data ?? response ?? null);
}

export async function listBillingPaymentMethods({ token, signal } = {}) {
  ensureToken(token);
  const response = await httpClient.get('/account/billing/payment-methods', {
    token,
    signal,
    cache: {
      ttl: 30_000,
      tags: ['billing:payment-methods'],
      varyByToken: true
    }
  });

  const methods = Array.isArray(response?.data ?? response) ? response.data ?? response : [];
  return methods.map(normalisePaymentMethod).filter(Boolean);
}

export async function listBillingInvoices({ token, signal } = {}) {
  ensureToken(token);
  const response = await httpClient.get('/account/billing/invoices', {
    token,
    signal,
    cache: {
      ttl: 30_000,
      tags: ['billing:invoices'],
      varyByToken: true
    }
  });

  const invoices = Array.isArray(response?.data ?? response) ? response.data ?? response : [];
  return invoices.map(normaliseInvoice).filter(Boolean);
}

export async function createBillingPortalSession({ token, returnUrl, signal } = {}) {
  ensureToken(token);
  const response = await httpClient.post(
    '/account/billing/portal-sessions',
    returnUrl ? { returnUrl } : {},
    {
      token,
      signal
    }
  );

  const payload = response?.data ?? response ?? null;
  return {
    url: payload?.url ?? payload?.portalUrl ?? null,
    expiresAt: payload?.expires_at ?? payload?.expiresAt ?? null
  };
}

export const billingPortalApi = {
  fetchBillingOverview,
  listBillingPaymentMethods,
  listBillingInvoices,
  createBillingPortalSession
};

export default billingPortalApi;
