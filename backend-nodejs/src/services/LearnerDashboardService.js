import crypto from 'crypto';

import db from '../config/database.js';
import logger from '../config/logger.js';
import TutorBookingModel from '../models/TutorBookingModel.js';
import TutorProfileModel from '../models/TutorProfileModel.js';
import LearnerSupportRepository from '../repositories/LearnerSupportRepository.js';
import LearnerPaymentMethodModel from '../models/LearnerPaymentMethodModel.js';
import LearnerBillingContactModel from '../models/LearnerBillingContactModel.js';
import LearnerFinancialProfileModel from '../models/LearnerFinancialProfileModel.js';
import LearnerSystemPreferenceModel from '../models/LearnerSystemPreferenceModel.js';
import LearnerFinancePurchaseModel from '../models/LearnerFinancePurchaseModel.js';
import LearnerGrowthInitiativeModel from '../models/LearnerGrowthInitiativeModel.js';
import LearnerGrowthExperimentModel from '../models/LearnerGrowthExperimentModel.js';
import LearnerAffiliateChannelModel from '../models/LearnerAffiliateChannelModel.js';
import LearnerAffiliatePayoutModel from '../models/LearnerAffiliatePayoutModel.js';
import LearnerAdCampaignModel from '../models/LearnerAdCampaignModel.js';
import InstructorApplicationModel from '../models/InstructorApplicationModel.js';
import LearnerLibraryEntryModel from '../models/LearnerLibraryEntryModel.js';
import FieldServiceOrderModel from '../models/FieldServiceOrderModel.js';
import FieldServiceEventModel from '../models/FieldServiceEventModel.js';
import FieldServiceProviderModel from '../models/FieldServiceProviderModel.js';
import buildFieldServiceWorkspace from './FieldServiceWorkspace.js';
import CommunitySubscriptionModel from '../models/CommunitySubscriptionModel.js';
import CommunityModel from '../models/CommunityModel.js';
import CommunityPaywallTierModel from '../models/CommunityPaywallTierModel.js';

const log = logger.child({ service: 'LearnerDashboardService' });

function generateReference(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function buildAcknowledgement({
  reference,
  message,
  meta = {}
}) {
  return {
    reference,
    message,
    meta
  };
}

function parseDate(value, fallback) {
  if (!value) {
    return fallback instanceof Date ? fallback : new Date(fallback ?? Date.now());
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback instanceof Date ? fallback : new Date(fallback ?? Date.now());
  }

  return date;
}

function normaliseDurationMinutes(value, fallback = 60) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 15 && numeric <= 600) {
    return Math.round(numeric);
  }
  return fallback;
}

function formatCurrencyValue(amountCents, currency = 'USD') {
  const cents = Number(amountCents ?? 0);
  const amount = Math.round(cents) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  } catch (_error) {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDateLabel(value, fallback = 'Not recorded') {
  if (!value) return fallback;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(date);
  } catch (_error) {
    return fallback;
  }
}

function formatPurchase(purchase) {
  if (!purchase) return null;
  return {
    id: purchase.id,
    reference: purchase.reference,
    description: purchase.description,
    amountCents: Number(purchase.amountCents ?? 0),
    amountFormatted: formatCurrencyValue(purchase.amountCents, purchase.currency),
    currency: purchase.currency ?? 'USD',
    status: purchase.status ?? 'paid',
    purchasedAt: purchase.purchasedAt ?? null,
    purchasedAtLabel: formatDateLabel(purchase.purchasedAt, 'Awaiting confirmation'),
    metadata: purchase.metadata ?? {},
    createdAt: purchase.createdAt ?? null,
    updatedAt: purchase.updatedAt ?? null
  };
}

function toIso(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime()) ? null : asDate.toISOString();
}

function formatBookingAcknowledgement(booking, message = 'Tutor booking updated') {
  if (!booking) {
    return buildAcknowledgement({ reference: null, message, meta: {} });
  }

  const reference = booking.publicId ?? booking.id ?? booking.reference ?? null;
  const metadata = booking.metadata && typeof booking.metadata === 'object' ? booking.metadata : {};

  return buildAcknowledgement({
    reference,
    message,
    meta: {
      status: booking.status ?? null,
      scheduledStart: toIso(booking.scheduledStart ?? booking.metadata?.scheduledStart),
      scheduledEnd: toIso(booking.scheduledEnd ?? booking.metadata?.scheduledEnd),
      durationMinutes: booking.durationMinutes ?? null,
      hourlyRateAmount: booking.hourlyRateAmount ?? null,
      hourlyRateCurrency: booking.hourlyRateCurrency ?? null,
      tutorId: booking.tutorId ?? null,
      metadata
    }
  });
}

function formatLibraryEntry(entry) {
  if (!entry) {
    return null;
  }

  const tags = Array.isArray(entry.tags)
    ? entry.tags
    : typeof entry.tags === 'string'
      ? entry.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [];

  return {
    id: entry.id,
    userId: entry.userId ?? null,
    title: entry.title ?? '',
    format: entry.format ?? 'E-book',
    progress: Number.isFinite(Number(entry.progress)) ? Number(entry.progress) : 0,
    lastOpened: entry.lastOpened ?? null,
    lastOpenedLabel: formatDateLabel(entry.lastOpened, 'Not opened yet'),
    url: entry.url ?? null,
    summary: entry.summary ?? null,
    author: entry.author ?? null,
    coverUrl: entry.coverUrl ?? null,
    tags,
    metadata: entry.metadata ?? {},
    createdAt: entry.createdAt ?? null,
    updatedAt: entry.updatedAt ?? null
  };
}

function formatSubscription(subscription, communityMap, tierMap) {
  if (!subscription) return null;
  const community = communityMap.get(subscription.communityId ?? null);
  const tier = tierMap.get(subscription.tierId ?? null);
  const priceCents = tier?.priceCents ?? subscription.metadata?.priceCents;
  const currency = tier?.currency ?? subscription.metadata?.currency ?? 'USD';
  const billingInterval = tier?.billingInterval ?? subscription.metadata?.billingInterval ?? 'monthly';

  return {
    id: subscription.publicId ?? subscription.id,
    status: subscription.status ?? 'active',
    provider: subscription.provider ?? 'platform',
    cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
    currentPeriodStart: subscription.currentPeriodStart ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd ?? null,
    currentPeriodEndLabel: formatDateLabel(subscription.currentPeriodEnd, 'No renewal date'),
    community: community
      ? {
          id: community.id,
          name: community.name,
          slug: community.slug,
          coverImageUrl: community.coverImageUrl ?? null
        }
      : null,
    plan: tier
      ? {
          id: tier.id,
          name: tier.name,
          billingInterval,
          priceFormatted: formatCurrencyValue(priceCents, currency)
        }
      : {
          id: null,
          name: subscription.metadata?.planName ?? 'Subscription',
          billingInterval,
          priceFormatted: formatCurrencyValue(priceCents ?? 0, currency)
        },
    metadata: subscription.metadata ?? {},
    createdAt: subscription.createdAt ?? null,
    updatedAt: subscription.updatedAt ?? null
  };
}

function clampScore(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function computeEngagementScore({
  bookings = [],
  libraryEntries = [],
  supportCases = [],
  subscriptions = [],
  growthExperiments = []
} = {}) {
  const bookingScore = Math.min(bookings.length * 8, 30);
  const libraryScore = Math.min(libraryEntries.length * 4, 20);
  const subscriptionScore = subscriptions.some((subscription) => subscription.status === 'active') ? 20 : 0;
  const supportScore = Math.max(0, 15 - Math.min(supportCases.length * 3, 15));
  const growthScore = Math.min(growthExperiments.length * 5, 15);

  const total = bookingScore + libraryScore + subscriptionScore + supportScore + growthScore;
  return clampScore(total);
}

const DEFAULT_SYSTEM_PREFERENCES = Object.freeze({
  language: 'en',
  region: 'US',
  timezone: 'UTC',
  notificationsEnabled: true,
  digestEnabled: true,
  autoPlayMedia: false,
  highContrast: false,
  reducedMotion: false,
  preferences: {
    interfaceDensity: 'comfortable',
    analyticsOptIn: true,
    subtitleLanguage: 'en',
    audioDescription: false
  }
});

const DEFAULT_FINANCE_ALERTS = Object.freeze({
  sendEmail: true,
  sendSms: false,
  escalationEmail: null,
  notifyThresholdPercent: 80
});

const FIELD_SERVICE_PRIORITIES = new Set(['critical', 'high', 'standard', 'low']);

function normaliseFieldServicePriority(value) {
  if (!value) {
    return 'standard';
  }
  const normalised = String(value).trim().toLowerCase();
  if (FIELD_SERVICE_PRIORITIES.has(normalised)) {
    return normalised;
  }
  if (['urgent', 'immediate'].includes(normalised)) {
    return 'critical';
  }
  return 'standard';
}

function normaliseFieldServiceStatus(value, fallback = 'dispatched') {
  if (!value) {
    return fallback;
  }
  const normalised = String(value).trim().toLowerCase();
  return normalised || fallback;
}

function normaliseFieldServiceAttachments(value) {
  if (!value) {
    return [];
  }
  const items = Array.isArray(value)
    ? value
    : String(value)
        .split(',')
        .map((entry) => entry.trim());
  const seen = new Set();
  const attachments = [];
  items
    .map((entry) => String(entry ?? '').trim())
    .filter((entry) => entry.length > 0)
    .forEach((entry) => {
      if (!seen.has(entry.toLowerCase())) {
        seen.add(entry.toLowerCase());
        attachments.push(entry);
      }
    });
  return attachments;
}

function normaliseFieldServicePreferenceTags(value) {
  if (!value) {
    return [];
  }
  const list = Array.isArray(value) ? value : String(value).split(',');
  const seen = new Set();
  return list
    .map((entry) => String(entry ?? '').trim())
    .filter((entry) => entry.length > 0)
    .filter((entry) => {
      const key = entry.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function normaliseFieldServiceUpsellOffers(value) {
  if (!value) {
    return [];
  }
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((entry, index) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        return { id: `upsell-${index}`, title: entry, cta: 'View details', href: null };
      }
      if (typeof entry === 'object') {
        return {
          id: entry.id ?? `upsell-${index}`,
          title: entry.title ?? entry.label ?? 'Follow-up',
          cta: entry.cta ?? entry.action ?? null,
          href: entry.href ?? entry.url ?? null
        };
      }
      return null;
    })
    .filter(Boolean);
}

function normaliseFieldServiceReminderInputs(value) {
  if (!value) {
    return [];
  }
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((entry, index) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        return { id: `reminder-${index}`, label: entry };
      }
      if (typeof entry === 'object') {
        const sendAt = entry.sendAt ?? entry.send_at ?? entry.time ?? null;
        return {
          id: entry.id ?? `reminder-${index}`,
          label: entry.label ?? entry.title ?? 'Reminder',
          sendAt,
          status: entry.status ?? null
        };
      }
      return null;
    })
    .filter(Boolean);
}

async function buildFieldServiceAssignment({ userId, order, connection = db }) {
  if (!order) return null;
  const [events, providers] = await Promise.all([
    FieldServiceEventModel.listByOrderIds([order.id], connection),
    order.providerId ? FieldServiceProviderModel.listByIds([order.providerId], connection) : []
  ]);

  const workspace = buildFieldServiceWorkspace({
    now: new Date(),
    user: { id: userId },
    orders: [order],
    events,
    providers
  });

  const customerAssignments = workspace.customer?.assignments ?? [];
  const assignment =
    customerAssignments.find((item) => item.id === order.id) ?? customerAssignments[0] ?? null;

  return assignment ?? null;
}

export default class LearnerDashboardService {
  static async listPaymentMethods(userId) {
    return LearnerPaymentMethodModel.listByUserId(userId);
  }

  static async createPaymentMethod(userId, payload = {}) {
    if (!payload.label || !payload.brand || !payload.last4 || !payload.expiry) {
      throw new Error('Label, brand, last four digits, and expiry are required for a payment method');
    }

    return db.transaction(async (trx) => {
      if (payload.primary) {
        await LearnerPaymentMethodModel.clearPrimaryForUser(userId, trx);
      }
      const method = await LearnerPaymentMethodModel.create(
        {
          userId,
          label: payload.label,
          brand: payload.brand,
          last4: payload.last4.slice(-4),
          expiry: payload.expiry,
          primary: Boolean(payload.primary),
          metadata: payload.metadata ?? {}
        },
        trx
      );
      return method;
    });
  }

  static async updatePaymentMethod(userId, methodId, payload = {}) {
    const method = await LearnerPaymentMethodModel.findByIdForUser(userId, methodId);
    if (!method) {
      const error = new Error('Payment method not found');
      error.status = 404;
      throw error;
    }

    return db.transaction(async (trx) => {
      if (payload.primary === true) {
        await LearnerPaymentMethodModel.clearPrimaryForUser(userId, trx);
      }
      const updated = await LearnerPaymentMethodModel.updateById(
        methodId,
        {
          userId,
          label: payload.label ?? method.label,
          brand: payload.brand ?? method.brand,
          last4: payload.last4 ? payload.last4.slice(-4) : method.last4,
          expiry: payload.expiry ?? method.expiry,
          primary: payload.primary === undefined ? method.primary : Boolean(payload.primary),
          metadata: payload.metadata ?? method.metadata
        },
        trx
      );
      return updated;
    });
  }

  static async removePaymentMethod(userId, methodId) {
    const deleted = await LearnerPaymentMethodModel.deleteByIdForUser(userId, methodId);
    if (!deleted) {
      const error = new Error('Payment method not found');
      error.status = 404;
      throw error;
    }
    return buildAcknowledgement({
      reference: methodId,
      message: 'Payment method removed',
      meta: { methodId }
    });
  }

  static async listBillingContacts(userId) {
    return LearnerBillingContactModel.listByUserId(userId);
  }

  static async upsertBillingContact(userId, payload = {}) {
    if (!payload.name || !payload.email) {
      throw new Error('Name and email are required for a billing contact');
    }
    const existing = await LearnerBillingContactModel.findByEmail(userId, payload.email);
    if (existing) {
      return LearnerBillingContactModel.updateById(existing.id, {
        userId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? null,
        company: payload.company ?? null,
        metadata: payload.metadata ?? existing.metadata ?? {}
      });
    }
    return LearnerBillingContactModel.create({
      userId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone ?? null,
      company: payload.company ?? null,
      metadata: payload.metadata ?? {}
    });
  }

  static async deleteBillingContact(userId, contactId) {
    const deleted = await LearnerBillingContactModel.deleteByIdForUser(userId, contactId);
    if (!deleted) {
      const error = new Error('Billing contact not found');
      error.status = 404;
      throw error;
    }
    return buildAcknowledgement({
      reference: contactId,
      message: 'Billing contact removed',
      meta: { contactId }
    });
  }

  static async getSystemPreferences(userId) {
    const stored = await LearnerSystemPreferenceModel.getForUser(userId);
    if (!stored) {
      return { ...DEFAULT_SYSTEM_PREFERENCES };
    }
    return {
      id: stored.id ?? null,
      language: stored.language ?? DEFAULT_SYSTEM_PREFERENCES.language,
      region: stored.region ?? DEFAULT_SYSTEM_PREFERENCES.region,
      timezone: stored.timezone ?? DEFAULT_SYSTEM_PREFERENCES.timezone,
      notificationsEnabled:
        stored.notificationsEnabled ?? DEFAULT_SYSTEM_PREFERENCES.notificationsEnabled,
      digestEnabled: stored.digestEnabled ?? DEFAULT_SYSTEM_PREFERENCES.digestEnabled,
      autoPlayMedia: stored.autoPlayMedia ?? DEFAULT_SYSTEM_PREFERENCES.autoPlayMedia,
      highContrast: stored.highContrast ?? DEFAULT_SYSTEM_PREFERENCES.highContrast,
      reducedMotion: stored.reducedMotion ?? DEFAULT_SYSTEM_PREFERENCES.reducedMotion,
      preferences: {
        ...DEFAULT_SYSTEM_PREFERENCES.preferences,
        ...(stored.preferences ?? {})
      },
      createdAt: stored.createdAt ?? null,
      updatedAt: stored.updatedAt ?? null
    };
  }

  static async updateSystemPreferences(userId, payload = {}) {
    const existingPreference = await LearnerSystemPreferenceModel.getForUser(userId);
    const base = existingPreference ?? DEFAULT_SYSTEM_PREFERENCES;

    const hasString = (value) => typeof value === 'string' && value.trim().length > 0;
    const language = hasString(payload.language)
      ? payload.language.slice(0, 8)
      : base.language ?? DEFAULT_SYSTEM_PREFERENCES.language;
    const region = hasString(payload.region)
      ? payload.region.slice(0, 32)
      : base.region ?? DEFAULT_SYSTEM_PREFERENCES.region;
    const timezone = hasString(payload.timezone)
      ? payload.timezone.slice(0, 64)
      : base.timezone ?? DEFAULT_SYSTEM_PREFERENCES.timezone;

    const rawPreferences =
      payload.preferences && typeof payload.preferences === 'object'
        ? payload.preferences
        : {};
    const allowedDensity = new Set(['comfortable', 'compact', 'expanded']);
    const basePreferences = {
      ...DEFAULT_SYSTEM_PREFERENCES.preferences,
      ...(existingPreference?.preferences ?? {})
    };
    const interfaceDensity = rawPreferences.interfaceDensity;
    const normalisedPreferences = {
      ...basePreferences,
      ...rawPreferences,
      interfaceDensity: allowedDensity.has(interfaceDensity)
        ? interfaceDensity
        : basePreferences.interfaceDensity,
      analyticsOptIn:
        rawPreferences.analyticsOptIn !== undefined
          ? Boolean(rawPreferences.analyticsOptIn)
          : basePreferences.analyticsOptIn,
      subtitleLanguage:
        typeof rawPreferences.subtitleLanguage === 'string'
          ? rawPreferences.subtitleLanguage.slice(0, 8)
          : basePreferences.subtitleLanguage,
      audioDescription:
        rawPreferences.audioDescription !== undefined
          ? Boolean(rawPreferences.audioDescription)
          : basePreferences.audioDescription
    };

    const preference = await LearnerSystemPreferenceModel.upsertForUser(userId, {
      language,
      region,
      timezone,
      notificationsEnabled:
        payload.notificationsEnabled !== undefined
          ? Boolean(payload.notificationsEnabled)
          : base.notificationsEnabled ?? DEFAULT_SYSTEM_PREFERENCES.notificationsEnabled,
      digestEnabled:
        payload.digestEnabled !== undefined
          ? Boolean(payload.digestEnabled)
          : base.digestEnabled ?? DEFAULT_SYSTEM_PREFERENCES.digestEnabled,
      autoPlayMedia:
        payload.autoPlayMedia !== undefined
          ? Boolean(payload.autoPlayMedia)
          : base.autoPlayMedia ?? DEFAULT_SYSTEM_PREFERENCES.autoPlayMedia,
      highContrast:
        payload.highContrast !== undefined
          ? Boolean(payload.highContrast)
          : base.highContrast ?? DEFAULT_SYSTEM_PREFERENCES.highContrast,
      reducedMotion:
        payload.reducedMotion !== undefined
          ? Boolean(payload.reducedMotion)
          : base.reducedMotion ?? DEFAULT_SYSTEM_PREFERENCES.reducedMotion,
      preferences: normalisedPreferences
    });

    const normalised = await this.getSystemPreferences(userId);
    log.info({ userId, preference: normalised }, 'Learner updated system preferences');
    return buildAcknowledgement({
      reference: preference.id,
      message: 'System preferences updated',
      meta: { preference: normalised }
    });
  }

  static async listFinancePurchases(userId) {
    const purchases = await LearnerFinancePurchaseModel.listByUserId(userId);
    return purchases.map((purchase) => formatPurchase(purchase));
  }

  static async createFinancePurchase(userId, payload = {}) {
    if (!payload.reference || payload.reference.trim().length < 3) {
      throw new Error('A reference label is required for the purchase');
    }
    if (!payload.description || payload.description.trim().length < 3) {
      throw new Error('A description is required for the purchase');
    }

    const amountCentsRaw =
      payload.amountCents !== undefined
        ? Number(payload.amountCents)
        : Number.parseFloat(payload.amount ?? payload.amountDollars ?? 0) * 100;
    const amountCents = Math.max(0, Math.round(Number.isFinite(amountCentsRaw) ? amountCentsRaw : 0));
    const allowedStatuses = new Set(['paid', 'pending', 'refunded', 'cancelled']);
    const status = allowedStatuses.has(payload.status) ? payload.status : 'paid';
    const purchasedAt = (() => {
      if (!payload.purchasedAt) return new Date();
      const parsed = new Date(payload.purchasedAt);
      return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    })();

    const purchase = await LearnerFinancePurchaseModel.create(
      {
        userId,
        reference: payload.reference.trim().slice(0, 64),
        description: payload.description.trim().slice(0, 255),
        amountCents,
        currency: typeof payload.currency === 'string' ? payload.currency.slice(0, 3).toUpperCase() : 'USD',
        status,
        purchasedAt,
        metadata: payload.metadata ?? {}
      },
      db
    );

    log.info({ userId, purchaseId: purchase.id }, 'Learner recorded finance purchase');
    return formatPurchase(purchase);
  }

  static async updateFinancePurchase(userId, purchaseId, payload = {}) {
    const existing = await LearnerFinancePurchaseModel.findByIdForUser(userId, purchaseId);
    if (!existing) {
      const error = new Error('Finance purchase not found');
      error.status = 404;
      throw error;
    }

    const updates = { ...payload };
    if (updates.reference !== undefined && typeof updates.reference === 'string') {
      updates.reference = updates.reference.trim().slice(0, 64);
    }
    if (updates.description !== undefined && typeof updates.description === 'string') {
      updates.description = updates.description.trim().slice(0, 255);
    }
    if (updates.amountCents === undefined && updates.amount !== undefined) {
      const cents = Number.parseFloat(updates.amount) * 100;
      updates.amountCents = Math.round(Number.isFinite(cents) ? cents : existing.amountCents);
    }
    if (updates.amountCents !== undefined) {
      updates.amountCents = Math.max(0, Math.round(Number(updates.amountCents) || 0));
    }
    if (updates.currency !== undefined && typeof updates.currency === 'string') {
      updates.currency = updates.currency.slice(0, 3).toUpperCase();
    }
    if (updates.status !== undefined) {
      const allowedStatuses = new Set(['paid', 'pending', 'refunded', 'cancelled']);
      updates.status = allowedStatuses.has(updates.status) ? updates.status : existing.status;
    }
    if (updates.purchasedAt !== undefined) {
      const parsed = new Date(updates.purchasedAt);
      updates.purchasedAt = Number.isNaN(parsed.getTime()) ? existing.purchasedAt : parsed;
    }

    const updated = await LearnerFinancePurchaseModel.updateByIdForUser(userId, purchaseId, updates);
    log.info({ userId, purchaseId }, 'Learner updated finance purchase');
    return formatPurchase(updated);
  }

  static async deleteFinancePurchase(userId, purchaseId) {
    const deleted = await LearnerFinancePurchaseModel.deleteByIdForUser(userId, purchaseId);
    if (!deleted) {
      const error = new Error('Finance purchase not found');
      error.status = 404;
      throw error;
    }
    log.info({ userId, purchaseId }, 'Learner removed finance purchase');
    return buildAcknowledgement({ reference: purchaseId, message: 'Finance purchase removed' });
  }

  static async getFinanceSettings(userId) {
    const [profile, purchases, subscriptions] = await Promise.all([
      LearnerFinancialProfileModel.findByUserId(userId),
      LearnerFinancePurchaseModel.listByUserId(userId),
      CommunitySubscriptionModel.listByUser(userId)
    ]);
    const preferences = profile?.preferences && typeof profile.preferences === 'object' ? profile.preferences : {};
    const alerts = {
      ...DEFAULT_FINANCE_ALERTS,
      ...(preferences.alerts ?? {})
    };
    const financeProfile = {
      autoPayEnabled: Boolean(profile?.autoPayEnabled),
      reserveTargetCents: Number(profile?.reserveTargetCents ?? 0),
      reserveTarget: Math.round(Number(profile?.reserveTargetCents ?? 0) / 100),
      currency: preferences.currency ?? 'USD',
      taxId: preferences.taxId ?? null,
      invoiceDelivery: preferences.invoiceDelivery ?? 'email',
      payoutSchedule: preferences.payoutSchedule ?? 'monthly',
      expensePolicyUrl: preferences.expensePolicyUrl ?? null
    };
    const documents = Array.isArray(preferences.documents)
      ? preferences.documents
      : [];
    const reimbursements =
      preferences.reimbursements && typeof preferences.reimbursements === 'object'
        ? {
            enabled: Boolean(preferences.reimbursements.enabled),
            instructions: preferences.reimbursements.instructions ?? null
          }
        : { enabled: false, instructions: null };

    const communityIds = Array.from(
      new Set(subscriptions.map((subscription) => subscription.communityId).filter(Boolean))
    );
    const tierIds = Array.from(new Set(subscriptions.map((subscription) => subscription.tierId).filter(Boolean)));

    const [communityRecords, tierRecords] = await Promise.all([
      Promise.all(communityIds.map((communityId) => CommunityModel.findById(communityId))),
      Promise.all(tierIds.map((tierId) => CommunityPaywallTierModel.findById(tierId)))
    ]);

    const communityMap = new Map(
      communityRecords
        .filter((community) => community)
        .map((community) => [community.id, community])
    );
    const tierMap = new Map(
      tierRecords
        .filter((tier) => tier)
        .map((tier) => [tier.id, tier])
    );

    return {
      profile: financeProfile,
      alerts,
      purchases: purchases.map((purchase) => formatPurchase(purchase)),
      subscriptions: subscriptions.map((subscription) => formatSubscription(subscription, communityMap, tierMap)),
      documents,
      reimbursements
    };
  }

  static async updateFinanceSettings(userId, payload = {}) {
    const alertsPayload = payload.alerts && typeof payload.alerts === 'object' ? payload.alerts : {};
    const documents = Array.isArray(payload.documents) ? payload.documents : undefined;
    const reimbursementsPayload =
      payload.reimbursements && typeof payload.reimbursements === 'object' ? payload.reimbursements : {};

    const preferences = {
      currency: payload.currency ?? payload.profile?.currency ?? 'USD',
      taxId: payload.taxId ?? payload.profile?.taxId ?? null,
      invoiceDelivery: payload.invoiceDelivery ?? payload.profile?.invoiceDelivery ?? 'email',
      payoutSchedule: payload.payoutSchedule ?? payload.profile?.payoutSchedule ?? 'monthly',
      expensePolicyUrl: payload.expensePolicyUrl ?? payload.profile?.expensePolicyUrl ?? null,
      alerts: {
        ...DEFAULT_FINANCE_ALERTS,
        ...alertsPayload,
        sendEmail:
          alertsPayload.sendEmail !== undefined ? Boolean(alertsPayload.sendEmail) : DEFAULT_FINANCE_ALERTS.sendEmail,
        sendSms:
          alertsPayload.sendSms !== undefined ? Boolean(alertsPayload.sendSms) : DEFAULT_FINANCE_ALERTS.sendSms,
        escalationEmail:
          typeof alertsPayload.escalationEmail === 'string'
            ? alertsPayload.escalationEmail.trim() || null
            : DEFAULT_FINANCE_ALERTS.escalationEmail,
        notifyThresholdPercent: Math.min(
          100,
          Math.max(1, Number.parseInt(alertsPayload.notifyThresholdPercent ?? DEFAULT_FINANCE_ALERTS.notifyThresholdPercent, 10))
        )
      },
      reimbursements: {
        enabled:
          reimbursementsPayload.enabled !== undefined
            ? Boolean(reimbursementsPayload.enabled)
            : false,
        instructions:
          typeof reimbursementsPayload.instructions === 'string'
            ? reimbursementsPayload.instructions.trim() || null
            : null
      }
    };

    if (documents !== undefined) {
      preferences.documents = documents;
    }

    const acknowledgement = await this.updateFinancialPreferences(userId, {
      autoPayEnabled:
        payload.autoPayEnabled !== undefined
          ? Boolean(payload.autoPayEnabled)
          : undefined,
      autoPay: payload.autoPay,
      reserveTargetCents:
        payload.reserveTargetCents !== undefined
          ? Number(payload.reserveTargetCents)
          : payload.reserveTarget !== undefined
            ? Math.round(Number(payload.reserveTarget) * 100)
            : undefined,
      preferences
    });

    const financeSettings = await this.getFinanceSettings(userId);
    acknowledgement.meta = { ...acknowledgement.meta, financeSettings };
    acknowledgement.message = acknowledgement.message ?? 'Finance settings updated';
    log.info({ userId, financeSettings }, 'Learner updated finance settings');
    return acknowledgement;
  }

  static async updateFinancialPreferences(userId, payload = {}) {
    const existing = await LearnerFinancialProfileModel.findByUserId(userId);
    const nextAutoPayEnabled =
      payload.autoPay && payload.autoPay.enabled !== undefined
        ? Boolean(payload.autoPay.enabled)
        : payload.autoPayEnabled !== undefined
          ? Boolean(payload.autoPayEnabled)
          : Boolean(existing?.autoPayEnabled);
    let reserveTargetCents;
    if (payload.reserveTargetCents !== undefined) {
      reserveTargetCents = Math.max(0, Number(payload.reserveTargetCents));
    } else if (payload.reserveTarget !== undefined) {
      reserveTargetCents = Math.max(0, Math.round(Number(payload.reserveTarget) * 100));
    } else {
      reserveTargetCents = Number(existing?.reserveTargetCents ?? 0);
    }

    const mergedPreferences = {
      ...(existing?.preferences ?? {}),
      ...(payload.metadata ?? {}),
      ...(payload.preferences ?? {})
    };

    const profile = await LearnerFinancialProfileModel.upsertForUser(userId, {
      autoPayEnabled: nextAutoPayEnabled,
      reserveTargetCents,
      preferences: mergedPreferences
    });
    return buildAcknowledgement({
      reference: profile.id,
      message: 'Financial preferences updated',
      meta: {
        autoPayEnabled: profile.autoPayEnabled,
        reserveTargetCents: profile.reserveTargetCents
      }
    });
  }

  static async listGrowthInitiatives(userId) {
    return LearnerGrowthInitiativeModel.listByUserId(userId);
  }

  static async createGrowthInitiative(userId, payload = {}) {
    if (!payload.slug || !payload.title) {
      throw new Error('A slug and title are required for a growth initiative');
    }
    const existing = await LearnerGrowthInitiativeModel.findBySlug(userId, payload.slug);
    if (existing) {
      const error = new Error('A growth initiative with this slug already exists');
      error.status = 409;
      throw error;
    }
    return LearnerGrowthInitiativeModel.create({
      userId,
      slug: payload.slug,
      title: payload.title,
      status: payload.status ?? 'planning',
      objective: payload.objective ?? null,
      primaryMetric: payload.primaryMetric ?? null,
      baselineValue: payload.baselineValue ?? null,
      targetValue: payload.targetValue ?? null,
      currentValue: payload.currentValue ?? null,
      startAt: payload.startAt ?? null,
      endAt: payload.endAt ?? null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      metadata: payload.metadata ?? {}
    });
  }

  static async updateGrowthInitiative(userId, initiativeId, payload = {}) {
    const initiative = await LearnerGrowthInitiativeModel.findByIdForUser(userId, initiativeId);
    if (!initiative) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    return LearnerGrowthInitiativeModel.updateById(initiativeId, { ...payload, userId });
  }

  static async deleteGrowthInitiative(userId, initiativeId) {
    const deleted = await LearnerGrowthInitiativeModel.deleteByIdForUser(userId, initiativeId);
    if (!deleted) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    return buildAcknowledgement({
      reference: initiativeId,
      message: 'Growth initiative removed',
      meta: { initiativeId }
    });
  }

  static async listGrowthExperiments(userId, initiativeId) {
    const initiative = await LearnerGrowthInitiativeModel.findByIdForUser(userId, initiativeId);
    if (!initiative) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    return LearnerGrowthExperimentModel.listByInitiativeId(initiativeId);
  }

  static async createGrowthExperiment(userId, initiativeId, payload = {}) {
    const initiative = await LearnerGrowthInitiativeModel.findByIdForUser(userId, initiativeId);
    if (!initiative) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    if (!payload.name) {
      throw new Error('A name is required for a growth experiment');
    }
    return LearnerGrowthExperimentModel.create({
      initiativeId,
      name: payload.name,
      status: payload.status ?? 'draft',
      hypothesis: payload.hypothesis ?? null,
      metric: payload.metric ?? null,
      baselineValue: payload.baselineValue ?? null,
      targetValue: payload.targetValue ?? null,
      resultValue: payload.resultValue ?? null,
      startAt: payload.startAt ?? null,
      endAt: payload.endAt ?? null,
      segments: Array.isArray(payload.segments) ? payload.segments : [],
      metadata: payload.metadata ?? {}
    });
  }

  static async updateGrowthExperiment(userId, initiativeId, experimentId, payload = {}) {
    const initiative = await LearnerGrowthInitiativeModel.findByIdForUser(userId, initiativeId);
    if (!initiative) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    const experiment = await LearnerGrowthExperimentModel.findById(experimentId);
    if (!experiment || experiment.initiativeId !== initiativeId) {
      const error = new Error('Growth experiment not found');
      error.status = 404;
      throw error;
    }
    return LearnerGrowthExperimentModel.updateById(experimentId, payload);
  }

  static async deleteGrowthExperiment(userId, initiativeId, experimentId) {
    const initiative = await LearnerGrowthInitiativeModel.findByIdForUser(userId, initiativeId);
    if (!initiative) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    const experiment = await LearnerGrowthExperimentModel.findById(experimentId);
    if (!experiment || experiment.initiativeId !== initiativeId) {
      const error = new Error('Growth experiment not found');
      error.status = 404;
      throw error;
    }
    await LearnerGrowthExperimentModel.deleteById(experimentId);
    return buildAcknowledgement({
      reference: experimentId,
      message: 'Growth experiment removed',
      meta: { experimentId }
    });
  }

  static async listAffiliateChannels(userId) {
    return LearnerAffiliateChannelModel.listByUserId(userId);
  }

  static async createAffiliateChannel(userId, payload = {}) {
    if (!payload.platform || !payload.referralCode) {
      throw new Error('Platform and referral code are required to create an affiliate channel');
    }
    return LearnerAffiliateChannelModel.create({
      userId,
      platform: payload.platform,
      handle: payload.handle ?? null,
      referralCode: payload.referralCode,
      trackingUrl: payload.trackingUrl ?? null,
      status: payload.status ?? 'draft',
      commissionRateBps: payload.commissionRateBps ?? 250,
      totalEarningsCents: payload.totalEarningsCents ?? 0,
      totalPaidCents: payload.totalPaidCents ?? 0,
      notes: Array.isArray(payload.notes) ? payload.notes : [],
      performance: payload.performance ?? {},
      metadata: payload.metadata ?? {}
    });
  }

  static async updateAffiliateChannel(userId, channelId, payload = {}) {
    const channel = await LearnerAffiliateChannelModel.findByIdForUser(userId, channelId);
    if (!channel) {
      const error = new Error('Affiliate channel not found');
      error.status = 404;
      throw error;
    }
    return LearnerAffiliateChannelModel.updateById(channelId, { ...payload, userId });
  }

  static async deleteAffiliateChannel(userId, channelId) {
    const deleted = await LearnerAffiliateChannelModel.deleteByIdForUser(userId, channelId);
    if (!deleted) {
      const error = new Error('Affiliate channel not found');
      error.status = 404;
      throw error;
    }
    return buildAcknowledgement({
      reference: channelId,
      message: 'Affiliate channel archived',
      meta: { channelId }
    });
  }

  static async recordAffiliatePayout(userId, channelId, payload = {}) {
    const channel = await LearnerAffiliateChannelModel.findByIdForUser(userId, channelId);
    if (!channel) {
      const error = new Error('Affiliate channel not found');
      error.status = 404;
      throw error;
    }
    if (!payload.amountCents) {
      throw new Error('An amount is required to record a payout');
    }
    const payout = await LearnerAffiliatePayoutModel.create({
      channelId,
      amountCents: payload.amountCents,
      currency: payload.currency ?? 'USD',
      status: payload.status ?? 'scheduled',
      scheduledAt: payload.scheduledAt ?? new Date().toISOString(),
      processedAt: payload.processedAt ?? null,
      reference: payload.reference ?? null,
      note: payload.note ?? null,
      metadata: payload.metadata ?? {}
    });

    await LearnerAffiliateChannelModel.updateById(channelId, {
      totalEarningsCents: channel.totalEarningsCents,
      totalPaidCents: channel.totalPaidCents + (payout.status === 'paid' ? payout.amountCents : 0)
    });

    return payout;
  }

  static async listAdCampaigns(userId) {
    return LearnerAdCampaignModel.listByUserId(userId);
  }

  static async createAdCampaign(userId, payload = {}) {
    if (!payload.name) {
      throw new Error('Campaign name is required');
    }
    return LearnerAdCampaignModel.create({
      userId,
      name: payload.name,
      status: payload.status ?? 'draft',
      objective: payload.objective ?? null,
      dailyBudgetCents: payload.dailyBudgetCents ?? 0,
      totalSpendCents: payload.totalSpendCents ?? 0,
      startAt: payload.startAt ?? null,
      endAt: payload.endAt ?? null,
      lastSyncedAt: payload.lastSyncedAt ?? null,
      metrics: payload.metrics ?? {},
      targeting: payload.targeting ?? {},
      creative: payload.creative ?? {},
      placements: Array.isArray(payload.placements) ? payload.placements : [],
      metadata: payload.metadata ?? {}
    });
  }

  static async updateAdCampaign(userId, campaignId, payload = {}) {
    const campaign = await LearnerAdCampaignModel.findByIdForUser(userId, campaignId);
    if (!campaign) {
      const error = new Error('Ad campaign not found');
      error.status = 404;
      throw error;
    }
    return LearnerAdCampaignModel.updateById(campaignId, { ...payload, userId });
  }

  static async deleteAdCampaign(userId, campaignId) {
    const deleted = await LearnerAdCampaignModel.deleteByIdForUser(userId, campaignId);
    if (!deleted) {
      const error = new Error('Ad campaign not found');
      error.status = 404;
      throw error;
    }
    return buildAcknowledgement({
      reference: campaignId,
      message: 'Ad campaign removed',
      meta: { campaignId }
    });
  }

  static async getInstructorApplication(userId) {
    return InstructorApplicationModel.findByUserId(userId);
  }

  static async upsertInstructorApplication(userId, payload = {}) {
    return InstructorApplicationModel.upsertForUser(userId, {
      status: payload.status ?? 'draft',
      stage: payload.stage ?? 'intake',
      motivation: payload.motivation ?? null,
      portfolioUrl: payload.portfolioUrl ?? null,
      experienceYears: payload.experienceYears ?? 0,
      teachingFocus: Array.isArray(payload.teachingFocus) ? payload.teachingFocus : [],
      availability: payload.availability ?? {},
      marketingAssets: Array.isArray(payload.marketingAssets) ? payload.marketingAssets : [],
      submittedAt: payload.submittedAt ?? null,
      reviewedAt: payload.reviewedAt ?? null,
      decisionNote: payload.decisionNote ?? null,
      metadata: payload.metadata ?? {}
    });
  }

  static async submitInstructorApplication(userId, payload = {}) {
    const application = await this.upsertInstructorApplication(userId, {
      ...payload,
      status: 'submitted',
      stage: 'portfolio',
      submittedAt: new Date().toISOString()
    });
    return buildAcknowledgement({
      reference: application.id,
      message: 'Instructor application submitted',
      meta: { status: application.status, stage: application.stage }
    });
  }

  static async createTutorBookingRequest(userId, payload = {}) {
    if (!userId) {
      const error = new Error('Authentication required to create a tutor booking');
      error.status = 401;
      throw error;
    }

    const tutorId = Number(payload.tutorId ?? payload.profileId ?? payload.tutorProfileId);
    if (!Number.isInteger(tutorId) || tutorId <= 0) {
      const error = new Error('A valid tutor identifier is required');
      error.status = 422;
      throw error;
    }

    const tutorProfile = await TutorProfileModel.findById(tutorId, db);
    if (!tutorProfile) {
      const error = new Error('Tutor profile not found');
      error.status = 404;
      throw error;
    }

    const now = new Date();
    const defaultDuration = normaliseDurationMinutes(
      payload.durationMinutes,
      tutorProfile.metadata?.defaultSessionMinutes ?? 60
    );
    const scheduledStart = parseDate(
      payload.scheduledStart ?? payload.preferredStart,
      now.getTime() + 60 * 60 * 1000
    );
    const scheduledEnd = parseDate(
      payload.scheduledEnd,
      scheduledStart.getTime() + defaultDuration * 60 * 1000
    );

    const hourlyRateAmount = Number.isFinite(Number(payload.hourlyRateAmount))
      ? Number(payload.hourlyRateAmount)
      : tutorProfile.hourlyRateAmount ?? 0;

    const metadata = {
      ...(tutorProfile.metadata ?? {}),
      topic: payload.topic ?? tutorProfile.metadata?.primaryFocus ?? 'Mentorship session',
      message: payload.message ?? null,
      source: 'learner-dashboard',
      timezone: payload.timezone ?? payload.timeZone ?? tutorProfile.metadata?.timezone ?? null
    };

    const booking = await TutorBookingModel.create(
      {
        publicId: crypto.randomUUID(),
        tutorId,
        learnerId: userId,
        scheduledStart,
        scheduledEnd,
        durationMinutes: defaultDuration,
        hourlyRateAmount,
        hourlyRateCurrency: payload.hourlyRateCurrency ?? tutorProfile.hourlyRateCurrency ?? 'USD',
        status: 'requested',
        metadata
      },
      db
    );

    log.info({ userId, tutorId, bookingId: booking.publicId }, 'Learner requested new tutor booking');
    return formatBookingAcknowledgement(booking, 'Tutor booking request submitted');
  }

  static async exportTutorSchedule(userId) {
    const exportId = generateReference('schedule');
    log.info({ userId, exportId }, 'Learner requested tutor schedule export');
    return buildAcknowledgement({
      reference: exportId,
      message: 'Tutor agenda export ready',
      meta: {
        downloadUrl: `/exports/${exportId}.ics`
      }
    });
  }

  static async updateTutorBookingRequest(userId, bookingId, payload = {}) {
    if (!bookingId) {
      const error = new Error('Tutor booking identifier is required');
      error.status = 400;
      throw error;
    }

    log.info({ userId, bookingId, payload }, 'Learner updated tutor booking');
    return buildAcknowledgement({
      reference: bookingId,
      message: 'Tutor booking updated',
      meta: {
        status: payload.status ?? 'updated',
        topic: payload.topic ?? null,
        preferredDate: payload.preferredDate ?? null
      }
    });
  }

  static async cancelTutorBookingRequest(userId, bookingId, payload = {}) {
    if (!bookingId) {
      const error = new Error('Tutor booking identifier is required');
      error.status = 400;
      throw error;
    }
    log.info({ userId, bookingId, payload }, 'Learner cancelled tutor booking');
    return buildAcknowledgement({
      reference: bookingId,
      message: 'Tutor booking cancelled',
      meta: {
        reason: payload.reason ?? null
      }
    });
  }

  static async createCourseGoal(userId, courseId, payload = {}) {
    const goalId = generateReference('goal');
    log.info({ userId, courseId, goalId, payload }, 'Learner created a new course goal');
    return buildAcknowledgement({
      reference: goalId,
      message: 'Learning goal created',
      meta: {
        courseId,
        target: payload.target ?? null,
        dueDate: payload.dueDate ?? null
      }
    });
  }

  static async resumeEbook(userId, ebookId) {
    log.info({ userId, ebookId }, 'Learner resumed ebook');
    return buildAcknowledgement({
      reference: ebookId,
      message: 'E-book resumed'
    });
  }

  static async shareEbook(userId, ebookId, payload = {}) {
    const shareId = generateReference('share');
    log.info({ userId, ebookId, shareId, payload }, 'Learner shared ebook highlight');
    return buildAcknowledgement({
      reference: shareId,
      message: 'E-book highlight shared',
      meta: {
        recipients: Array.isArray(payload.recipients) ? payload.recipients : payload.recipient ? [payload.recipient] : []
      }
    });
  }

  static async createLearnerLibraryEntry(userId, payload = {}) {
    if (!payload.title) {
      throw new Error('A title is required to add a library entry');
    }

    const entry = await LearnerLibraryEntryModel.create({
      userId,
      title: payload.title.trim(),
      format: payload.format?.trim() || 'E-book',
      progress: Math.max(0, Math.min(100, Number(payload.progress ?? 0))),
      lastOpened: payload.lastOpened ?? null,
      url: payload.url ?? null,
      summary: payload.summary ?? null,
      author: payload.author ?? null,
      coverUrl: payload.coverUrl ?? null,
      tags: Array.isArray(payload.tags) ? payload.tags : payload.tags ? [payload.tags].flat() : [],
      metadata: { source: 'learner-dashboard' }
    });

    return formatLibraryEntry(entry);
  }

  static async updateLearnerLibraryEntry(userId, entryId, payload = {}) {
    const entry = await LearnerLibraryEntryModel.findByIdForUser(userId, entryId);
    if (!entry) {
      const error = new Error('Library entry not found');
      error.status = 404;
      throw error;
    }

    const updates = {};
    if (payload.title !== undefined) {
      updates.title = typeof payload.title === 'string' ? payload.title.trim() : payload.title;
    }
    if (payload.format !== undefined) {
      updates.format = typeof payload.format === 'string' ? payload.format.trim() : payload.format;
    }
    if (payload.progress !== undefined) {
      const numeric = Number(payload.progress);
      updates.progress = Number.isFinite(numeric)
        ? Math.max(0, Math.min(100, Math.round(numeric)))
        : 0;
    }
    if (payload.lastOpened !== undefined) {
      updates.lastOpened = payload.lastOpened;
    }
    if (payload.url !== undefined) {
      updates.url = payload.url;
    }
    if (payload.summary !== undefined) {
      updates.summary = payload.summary;
    }
    if (payload.author !== undefined) {
      updates.author = payload.author;
    }
    if (payload.coverUrl !== undefined) {
      updates.coverUrl = payload.coverUrl;
    }
    if (payload.tags !== undefined) {
      const rawTags = Array.isArray(payload.tags) ? payload.tags : [payload.tags];
      const normalisedTags = rawTags
        .flat()
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter((tag) => tag.length > 0);
      const deduped = [];
      const seen = new Set();
      normalisedTags.forEach((tag) => {
        const key = tag.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(tag);
        }
      });
      updates.tags = deduped;
    }

    const updated = await LearnerLibraryEntryModel.updateByIdForUser(userId, entryId, updates);

    return formatLibraryEntry(updated);
  }

  static async deleteLearnerLibraryEntry(userId, entryId) {
    const deleted = await LearnerLibraryEntryModel.deleteByIdForUser(userId, entryId);
    if (!deleted) {
      const error = new Error('Library entry not found');
      error.status = 404;
      throw error;
    }

    return buildAcknowledgement({
      reference: entryId,
      message: 'Library entry removed',
      meta: { entryId }
    });
  }

  static async createFieldServiceAssignment(userId, payload = {}) {
    if (!userId) {
      throw new Error('User is required to create a field service assignment');
    }

    const serviceType = typeof payload.serviceType === 'string' ? payload.serviceType.trim() : '';
    if (!serviceType) {
      const error = new Error('A service type is required to create a field service assignment');
      error.status = 422;
      throw error;
    }

    const priority = normaliseFieldServicePriority(payload.priority);
    const status = normaliseFieldServiceStatus(payload.status, 'dispatched');
    const attachments = normaliseFieldServiceAttachments(payload.attachments);
    const owner = typeof payload.owner === 'string' ? payload.owner.trim() : payload.owner ?? null;
    const metadata = {
      ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
      owner,
      fieldNotes: payload.fieldNotes ?? null,
      attachments
    };

    if (payload.supportChannel) {
      metadata.supportChannel = payload.supportChannel.trim();
    }
    if (payload.briefUrl) {
      metadata.briefUrl = payload.briefUrl.trim();
    }
    if (payload.equipment) {
      metadata.equipment = payload.equipment.trim();
    }
    if (payload.debriefHost) {
      metadata.debriefHost = payload.debriefHost.trim();
    }
    if (payload.debriefAt) {
      metadata.debriefAt = payload.debriefAt;
    }
    if (payload.followUpChannel) {
      metadata.followUpChannel = payload.followUpChannel;
    }
    const preferenceTags = normaliseFieldServicePreferenceTags(payload.preferenceTags ?? metadata.preferenceTags);
    if (preferenceTags.length) {
      metadata.preferenceTags = preferenceTags;
    }
    const upsellOffers = normaliseFieldServiceUpsellOffers(payload.upsellOffers ?? metadata.upsellOffers);
    if (upsellOffers.length) {
      metadata.upsellOffers = upsellOffers;
    }
    const reminderInputs = normaliseFieldServiceReminderInputs(payload.reminders ?? metadata.reminders);
    if (reminderInputs.length) {
      metadata.reminders = reminderInputs;
    }

    return db.transaction(async (trx) => {
      const order = await FieldServiceOrderModel.createAssignment(
        {
          reference: payload.reference ?? generateReference('fs'),
          customerUserId: userId,
          providerId: payload.providerId ?? null,
          serviceType,
          priority,
          status,
          summary: payload.summary ?? null,
          requestedAt: payload.requestedAt ?? undefined,
          scheduledFor: payload.scheduledFor ?? null,
          locationLabel: payload.locationLabel ?? null,
          metadata
        },
        trx
      );

      await FieldServiceEventModel.create(
        {
          orderId: order.id,
          eventType: 'dispatch_created',
          status,
          notes: payload.dispatchNotes ?? null,
          author: userId,
          metadata: {
            owner,
            attachments,
            priority,
            source: 'learner-dashboard'
          }
        },
        trx
      );

      return buildFieldServiceAssignment({ userId, order, connection: trx });
    });
  }

  static async updateFieldServiceAssignment(userId, orderId, payload = {}) {
    const existing = await FieldServiceOrderModel.findByIdForCustomer(userId, orderId);
    if (!existing) {
      const error = new Error('Field service assignment not found');
      error.status = 404;
      throw error;
    }

    const {
      clientUpdatedAt: rawClientUpdatedAt,
      lastKnownUpdate,
      expectedUpdatedAt,
      forceResolve,
      clientSnapshot: _clientSnapshot,
      ...candidatePayload
    } = payload ?? {};

    const metadataOverrides =
      candidatePayload.metadata && typeof candidatePayload.metadata === 'object' ? candidatePayload.metadata : {};
    const updatePayload = { ...candidatePayload };
    delete updatePayload.metadata;

    if (updatePayload.preferenceTags !== undefined) {
      metadataOverrides.preferenceTags = normaliseFieldServicePreferenceTags(updatePayload.preferenceTags);
      delete updatePayload.preferenceTags;
    }
    if (updatePayload.upsellOffers !== undefined) {
      metadataOverrides.upsellOffers = normaliseFieldServiceUpsellOffers(updatePayload.upsellOffers);
      delete updatePayload.upsellOffers;
    }
    if (updatePayload.reminders !== undefined) {
      metadataOverrides.reminders = normaliseFieldServiceReminderInputs(updatePayload.reminders);
      delete updatePayload.reminders;
    }
    if (updatePayload.followUpChannel !== undefined) {
      metadataOverrides.followUpChannel = updatePayload.followUpChannel ?? null;
      delete updatePayload.followUpChannel;
    }

    const clientTimestamp = rawClientUpdatedAt ?? lastKnownUpdate ?? expectedUpdatedAt ?? null;
    const clientUpdatedAt = (() => {
      if (!clientTimestamp) return null;
      const parsed = new Date(clientTimestamp);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })();
    const serverUpdatedAt = (() => {
      if (!existing.updatedAt) return null;
      const parsed = new Date(existing.updatedAt);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })();

    const nextStatus = normaliseFieldServiceStatus(updatePayload.status, existing.status);
    const nextPriority =
      updatePayload.priority !== undefined
        ? normaliseFieldServicePriority(updatePayload.priority)
        : existing.priority;
    const attachments =
      updatePayload.attachments !== undefined
        ? normaliseFieldServiceAttachments(updatePayload.attachments)
        : normaliseFieldServiceAttachments(existing.metadata?.attachments);

    const owner =
      updatePayload.owner !== undefined
        ? typeof updatePayload.owner === 'string'
          ? updatePayload.owner.trim()
          : updatePayload.owner
        : existing.metadata?.owner ?? null;

    const metadata = {
      ...(existing.metadata ?? {}),
      ...metadataOverrides,
      owner,
      fieldNotes: updatePayload.fieldNotes ?? existing.metadata?.fieldNotes ?? null,
      attachments
    };

    if (updatePayload.supportChannel !== undefined || metadataOverrides.supportChannel !== undefined) {
      metadata.supportChannel = updatePayload.supportChannel ?? metadataOverrides.supportChannel ?? null;
    }
    if (updatePayload.briefUrl !== undefined || metadataOverrides.briefUrl !== undefined) {
      metadata.briefUrl = updatePayload.briefUrl ?? metadataOverrides.briefUrl ?? null;
    }
    if (updatePayload.equipment !== undefined || metadataOverrides.equipment !== undefined) {
      metadata.equipment = updatePayload.equipment ?? metadataOverrides.equipment ?? null;
    }
    if (updatePayload.debriefHost !== undefined || metadataOverrides.debriefHost !== undefined) {
      metadata.debriefHost = updatePayload.debriefHost ?? metadataOverrides.debriefHost ?? null;
    }
    if (updatePayload.debriefAt !== undefined || metadataOverrides.debriefAt !== undefined) {
      metadata.debriefAt = updatePayload.debriefAt ?? metadataOverrides.debriefAt ?? null;
    }
    if (metadataOverrides.preferenceTags !== undefined) {
      metadata.preferenceTags = Array.isArray(metadataOverrides.preferenceTags)
        ? metadataOverrides.preferenceTags
        : normaliseFieldServicePreferenceTags(metadataOverrides.preferenceTags);
    }
    if (metadataOverrides.upsellOffers !== undefined) {
      metadata.upsellOffers = Array.isArray(metadataOverrides.upsellOffers)
        ? metadataOverrides.upsellOffers
        : normaliseFieldServiceUpsellOffers(metadataOverrides.upsellOffers);
    }
    if (metadataOverrides.reminders !== undefined) {
      metadata.reminders = Array.isArray(metadataOverrides.reminders)
        ? metadataOverrides.reminders
        : normaliseFieldServiceReminderInputs(metadataOverrides.reminders);
    }
    if (metadataOverrides.followUpChannel !== undefined) {
      metadata.followUpChannel = metadataOverrides.followUpChannel;
    }

    const providedFields = Object.entries(updatePayload)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);
    const metadataFieldList = Object.entries(metadataOverrides)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => `metadata.${key}`);
    if (updatePayload.owner !== undefined) metadataFieldList.push('metadata.owner');
    if (updatePayload.fieldNotes !== undefined) metadataFieldList.push('metadata.fieldNotes');
    if (updatePayload.attachments !== undefined) metadataFieldList.push('metadata.attachments');
    if (updatePayload.supportChannel !== undefined) metadataFieldList.push('metadata.supportChannel');
    if (updatePayload.briefUrl !== undefined) metadataFieldList.push('metadata.briefUrl');
    if (updatePayload.equipment !== undefined) metadataFieldList.push('metadata.equipment');
    if (updatePayload.debriefHost !== undefined) metadataFieldList.push('metadata.debriefHost');
    if (updatePayload.debriefAt !== undefined) metadataFieldList.push('metadata.debriefAt');

    const conflictingFields = Array.from(new Set([...providedFields, ...metadataFieldList]));

    const normalisedServiceType =
      updatePayload.serviceType !== undefined
        ? typeof updatePayload.serviceType === 'string'
          ? updatePayload.serviceType.trim()
          : updatePayload.serviceType
        : existing.serviceType;

    const updatePatch = {};
    if (updatePayload.status !== undefined) updatePatch.status = nextStatus;
    if (updatePayload.priority !== undefined) updatePatch.priority = nextPriority;
    if (updatePayload.serviceType !== undefined) updatePatch.serviceType = normalisedServiceType;
    if (updatePayload.summary !== undefined) {
      updatePatch.summary = updatePayload.summary ?? existing.summary;
    }

    if (updatePayload.providerId !== undefined) {
      updatePatch.providerId = updatePayload.providerId ?? existing.providerId;
    }

    if (updatePayload.scheduledFor !== undefined) {
      updatePatch.scheduledFor = updatePayload.scheduledFor ?? existing.scheduledFor;
    }

    if (updatePayload.etaMinutes !== undefined) {
      updatePatch.etaMinutes = updatePayload.etaMinutes;
    }

    if (updatePayload.slaMinutes !== undefined) {
      updatePatch.slaMinutes = updatePayload.slaMinutes;
    }

    if (updatePayload.distanceKm !== undefined) {
      updatePatch.distanceKm = updatePayload.distanceKm;
    }

    if (updatePayload.locationLabel !== undefined) {
      updatePatch.locationLabel = updatePayload.locationLabel;
    }
    updatePatch.metadata = metadata;

    const mergedOrder = {
      ...existing,
      status: updatePayload.status !== undefined ? nextStatus : existing.status,
      priority: updatePayload.priority !== undefined ? nextPriority : existing.priority,
      serviceType: updatePayload.serviceType !== undefined ? normalisedServiceType : existing.serviceType,
      summary: updatePayload.summary !== undefined ? updatePayload.summary ?? existing.summary : existing.summary,
      metadata,
      providerId: updatePayload.providerId !== undefined ? updatePayload.providerId ?? existing.providerId : existing.providerId,
      scheduledFor:
        updatePayload.scheduledFor !== undefined
          ? updatePayload.scheduledFor ?? existing.scheduledFor
          : existing.scheduledFor,
      etaMinutes: updatePayload.etaMinutes !== undefined ? updatePayload.etaMinutes : existing.etaMinutes,
      slaMinutes: updatePayload.slaMinutes !== undefined ? updatePayload.slaMinutes : existing.slaMinutes,
      distanceKm: updatePayload.distanceKm !== undefined ? updatePayload.distanceKm : existing.distanceKm,
      locationLabel: updatePayload.locationLabel !== undefined ? updatePayload.locationLabel : existing.locationLabel
    };

    const shouldCheckConflict = Boolean(clientUpdatedAt) && Boolean(serverUpdatedAt) && !forceResolve;
    if (shouldCheckConflict && serverUpdatedAt.getTime() > clientUpdatedAt.getTime()) {
      const serverAssignment = await buildFieldServiceAssignment({ userId, order: existing });
      const suggestedAssignment = await buildFieldServiceAssignment({ userId, order: mergedOrder });

      const suggestedPayload = {};
      if (updatePayload.status !== undefined) {
        suggestedPayload.status = nextStatus;
      }

      if (updatePayload.priority !== undefined) {
        suggestedPayload.priority = nextPriority;
      }

      if (updatePayload.serviceType !== undefined) {
        suggestedPayload.serviceType = normalisedServiceType;
      }

      if (updatePayload.summary !== undefined) {
        suggestedPayload.summary = updatePayload.summary ?? existing.summary;
      }

      if (updatePayload.providerId !== undefined) {
        suggestedPayload.providerId = updatePayload.providerId ?? existing.providerId;
      }

      if (updatePayload.scheduledFor !== undefined) {
        suggestedPayload.scheduledFor = updatePayload.scheduledFor ?? existing.scheduledFor;
      }

      if (updatePayload.etaMinutes !== undefined) {
        suggestedPayload.etaMinutes = updatePayload.etaMinutes;
      }

      if (updatePayload.slaMinutes !== undefined) {
        suggestedPayload.slaMinutes = updatePayload.slaMinutes;
      }

      if (updatePayload.distanceKm !== undefined) {
        suggestedPayload.distanceKm = updatePayload.distanceKm;
      }

      if (updatePayload.locationLabel !== undefined) {
        suggestedPayload.locationLabel = updatePayload.locationLabel;
      }
      if (
        updatePayload.attachments !== undefined ||
        updatePayload.fieldNotes !== undefined ||
        updatePayload.owner !== undefined ||
        updatePayload.supportChannel !== undefined ||
        updatePayload.briefUrl !== undefined ||
        updatePayload.equipment !== undefined ||
        updatePayload.debriefHost !== undefined ||
        updatePayload.debriefAt !== undefined ||
        Object.keys(metadataOverrides).length > 0
      ) {
        suggestedPayload.metadata = metadata;
      }

      const conflictError = new Error('Field service assignment has changed since your last sync.');
      conflictError.status = 409;
      conflictError.code = 'FIELD_SERVICE_CONFLICT';
      conflictError.details = {
        type: 'FIELD_SERVICE_CONFLICT',
        assignmentId: orderId,
        serverUpdatedAt: existing.updatedAt ?? null,
        clientUpdatedAt: clientTimestamp ?? null,
        serverAssignment,
        suggestedAssignment,
        suggestedPayload,
        attemptedPayload: candidatePayload,
        conflictingFields
      };
      throw conflictError;
    }

    return db.transaction(async (trx) => {
      const updated = await FieldServiceOrderModel.updateById(
        orderId,
        updatePatch,
        trx
      );

      await FieldServiceEventModel.create(
        {
          orderId: updated.id,
          eventType: updatePayload.status ? `status_${nextStatus}` : 'assignment_updated',
          status: nextStatus,
          notes: updatePayload.fieldNotes ?? null,
          author: userId,
          metadata: {
            attachments,
            owner,
            updatedFields: conflictingFields
          }
        },
        trx
      );

      return buildFieldServiceAssignment({ userId, order: updated, connection: trx });
    });
  }

  static async closeFieldServiceAssignment(userId, orderId, payload = {}) {
    const existing = await FieldServiceOrderModel.findByIdForCustomer(userId, orderId);
    if (!existing) {
      const error = new Error('Field service assignment not found');
      error.status = 404;
      throw error;
    }

    const resolution = payload.resolution ?? null;
    const reason = payload.reason ?? null;
    const attachments = normaliseFieldServiceAttachments(existing.metadata?.attachments);

    return db.transaction(async (trx) => {
      const metadata = {
        ...(existing.metadata ?? {}),
        attachments,
        resolution,
        closeNotes: payload.closeNotes ?? null,
        closedAt: new Date().toISOString(),
        closedBy: userId,
        closureReason: reason ?? null
      };

      const updated = await FieldServiceOrderModel.updateById(
        orderId,
        {
          status: 'closed',
          metadata
        },
        trx
      );

      await FieldServiceEventModel.create(
        {
          orderId: updated.id,
          eventType: 'job_completed',
          status: 'closed',
          notes: resolution,
          author: userId,
          metadata: {
            resolution,
            reason
          }
        },
        trx
      );

      return buildAcknowledgement({
        reference: updated.reference ?? generateReference('fs'),
        message: 'Field service assignment closed',
        meta: {
          assignmentId: updated.id,
          status: updated.status,
          resolution
        }
      });
    });
  }

  static async downloadInvoice(userId, invoiceId) {
    log.info({ userId, invoiceId }, 'Learner requested invoice download');
    return buildAcknowledgement({
      reference: invoiceId,
      message: 'Invoice download ready',
      meta: {
        downloadUrl: `/billing/invoices/${invoiceId}.pdf`
      }
    });
  }

  static async updateBillingPreferences(userId, payload = {}) {
    const meta = {};

    if (payload.billingContact) {
      const contact = await this.upsertBillingContact(userId, payload.billingContact);
      meta.contact = contact;
    }

    if (
      payload.autoPay !== undefined ||
      payload.autoPayEnabled !== undefined ||
      payload.reserveTarget !== undefined ||
      payload.reserveTargetCents !== undefined ||
      payload.preferences !== undefined
    ) {
      const acknowledgement = await this.updateFinancialPreferences(userId, payload);
      meta.preferences = acknowledgement.meta;
    }

    if (payload.paymentMethod || payload.autoRenew !== undefined) {
      meta.legacy = {
        autoRenew: payload.autoRenew ?? null,
        paymentMethod: payload.paymentMethod ?? null
      };
    }

    const preferenceId = generateReference('billing');
    log.info({ userId, preferenceId, payload, meta }, 'Learner updated billing preferences');
    return buildAcknowledgement({
      reference: preferenceId,
      message: 'Billing preferences updated',
      meta
    });
  }

  static async joinLiveSession(userId, sessionId) {
    log.info({ userId, sessionId }, 'Learner joined live session');
    return buildAcknowledgement({
      reference: sessionId,
      message: 'Live session joined'
    });
  }

  static async checkInToLiveSession(userId, sessionId) {
    const checkInId = generateReference('checkin');
    log.info({ userId, sessionId, checkInId }, 'Learner checked in to live session');
    return buildAcknowledgement({
      reference: checkInId,
      message: 'Live session check-in recorded',
      meta: {
        sessionId
      }
    });
  }

  static async triggerCommunityAction(userId, communityId, payload = {}) {
    const actionId = generateReference('community');
    log.info({ userId, communityId, payload, actionId }, 'Learner launched community action');
    return buildAcknowledgement({
      reference: actionId,
      message: 'Community action triggered',
      meta: {
        communityId,
        action: payload.action ?? 'general'
      }
    });
  }

  static async listTutorBookings(userId) {
    if (!userId) {
      return [];
    }
    const bookings = await TutorBookingModel.listByLearnerId(userId, { limit: 100 }, db);
    return bookings;
  }

  static async updateTutorBooking(userId, bookingPublicId, payload = {}) {
    if (!userId) {
      const error = new Error('Authentication required to update a tutor booking');
      error.status = 401;
      throw error;
    }
    if (!bookingPublicId) {
      const error = new Error('A booking reference is required');
      error.status = 422;
      throw error;
    }

    const booking = await TutorBookingModel.findByPublicId(bookingPublicId, db);
    if (!booking || booking.learnerId !== userId) {
      const error = new Error('Tutor booking not found');
      error.status = 404;
      throw error;
    }

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      const error = new Error('Completed or cancelled bookings cannot be modified');
      error.status = 409;
      throw error;
    }

    const updates = {};
    let metadata = { ...(booking.metadata ?? {}) };

    if (payload.topic !== undefined) {
      metadata = { ...metadata, topic: payload.topic || null };
    }
    if (payload.message !== undefined) {
      metadata = { ...metadata, message: payload.message || null };
    }
    if (payload.timezone !== undefined || payload.timeZone !== undefined) {
      metadata = { ...metadata, timezone: payload.timezone ?? payload.timeZone ?? null };
    }

    if (payload.scheduledStart || payload.scheduledEnd || payload.durationMinutes) {
      const duration = normaliseDurationMinutes(payload.durationMinutes ?? booking.durationMinutes);
      const scheduledStart = parseDate(payload.scheduledStart, booking.scheduledStart ?? new Date());
      const scheduledEnd = parseDate(
        payload.scheduledEnd,
        scheduledStart.getTime() + duration * 60 * 1000
      );
      updates.scheduledStart = scheduledStart;
      updates.scheduledEnd = scheduledEnd;
      updates.durationMinutes = duration;
    }

    if (payload.hourlyRateAmount !== undefined) {
      updates.hourlyRateAmount = Number(payload.hourlyRateAmount);
    }

    if (payload.hourlyRateCurrency !== undefined) {
      updates.hourlyRateCurrency = payload.hourlyRateCurrency;
    }

    if (payload.status && ['requested', 'confirmed', 'completed'].includes(payload.status)) {
      updates.status = payload.status;
      if (payload.status === 'confirmed' && !booking.confirmedAt) {
        updates.confirmedAt = new Date();
      }
      if (payload.status === 'completed' && !booking.completedAt) {
        updates.completedAt = new Date();
      }
    }

    updates.metadata = metadata;

    const updated = await TutorBookingModel.updateByPublicId(bookingPublicId, updates, db);
    log.info({ userId, bookingId: bookingPublicId }, 'Learner updated tutor booking');
    return formatBookingAcknowledgement(updated, 'Tutor booking updated');
  }

  static async cancelTutorBooking(userId, bookingPublicId, payload = {}) {
    if (!userId) {
      const error = new Error('Authentication required to cancel a tutor booking');
      error.status = 401;
      throw error;
    }
    if (!bookingPublicId) {
      const error = new Error('A booking reference is required');
      error.status = 422;
      throw error;
    }

    const booking = await TutorBookingModel.findByPublicId(bookingPublicId, db);
    if (!booking || booking.learnerId !== userId) {
      const error = new Error('Tutor booking not found');
      error.status = 404;
      throw error;
    }

    if (booking.status === 'cancelled') {
      return formatBookingAcknowledgement(booking, 'Tutor booking already cancelled');
    }

    const metadata = {
      ...(booking.metadata ?? {}),
      cancellationReason: payload.reason ?? payload.cancellationReason ?? null,
      cancellationNotes: payload.notes ?? payload.note ?? null,
      cancelledByLearner: true
    };

    const cancelled = await TutorBookingModel.updateByPublicId(
      bookingPublicId,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        metadata
      },
      db
    );

    log.info({ userId, bookingId: bookingPublicId }, 'Learner cancelled tutor booking');
    return formatBookingAcknowledgement(cancelled, 'Tutor booking cancelled');
  }

  static async listSupportTickets(userId) {
    const cases = await LearnerSupportRepository.listCases(userId);
    return cases;
  }

  static async createSupportTicket(userId, payload = {}) {
    if (!payload.subject) {
      throw new Error('Subject is required to create a support ticket');
    }
    const initialMessages = [];
    if (payload.description) {
      initialMessages.push({
        author: 'learner',
        body: payload.description,
        attachments: payload.attachments ?? [],
        createdAt: new Date().toISOString()
      });
    }
    const ticket = await LearnerSupportRepository.createCase(userId, {
      subject: payload.subject,
      category: payload.category ?? 'General',
      priority: payload.priority ?? 'normal',
      status: 'open',
      channel: 'Portal',
      initialMessages,
      metadata: payload.metadata ?? {}
    });
    log.info({ userId, ticketId: ticket?.id }, 'Learner created support ticket');
    return ticket;
  }

  static async updateSupportTicket(userId, ticketId, payload = {}) {
    const ticket = await LearnerSupportRepository.updateCase(userId, ticketId, payload);
    if (!ticket) {
      throw new Error('Support ticket not found');
    }
    log.info({ userId, ticketId }, 'Learner updated support ticket');
    return ticket;
  }

  static async addSupportTicketMessage(userId, ticketId, payload = {}) {
    if (!payload.body && !Array.isArray(payload.attachments)) {
      throw new Error('Message content is required');
    }
    const message = await LearnerSupportRepository.addMessage(userId, ticketId, {
      author: payload.author ?? 'learner',
      body: payload.body ?? '',
      attachments: payload.attachments ?? [],
      createdAt: payload.createdAt ?? new Date().toISOString()
    });
    if (!message) {
      throw new Error('Support ticket not found');
    }
    log.info({ userId, ticketId }, 'Learner added support ticket message');
    return message;
  }

  static async closeSupportTicket(userId, ticketId, payload = {}) {
    const ticket = await LearnerSupportRepository.closeCase(userId, ticketId, {
      resolutionNote: payload.resolutionNote ?? payload.note ?? null,
      satisfaction: payload.satisfaction ?? null
    });
    if (!ticket) {
      throw new Error('Support ticket not found');
    }
    log.info({ userId, ticketId }, 'Learner closed support ticket');
    return ticket;
  }

  static async getEngagementOverview(userId) {
    if (!userId) {
      return {
        score: 0,
        breakdown: {
          bookings: 0,
          libraryEntries: 0,
          openSupportTickets: 0,
          subscriptions: 0,
          growthExperiments: 0
        },
        generatedAt: new Date().toISOString()
      };
    }

    const [bookings, libraryEntries, supportCases, subscriptions, initiatives] = await Promise.all([
      TutorBookingModel.listByLearnerId(userId, { limit: 50 }, db),
      LearnerLibraryEntryModel.listByUserId(userId, db),
      LearnerSupportRepository.listCases(userId),
      CommunitySubscriptionModel.listByUser(userId),
      LearnerGrowthInitiativeModel.listByUserId(userId, { status: ['active', 'monitoring'] }, db)
    ]);

    const experimentLists = await Promise.all(
      initiatives.slice(0, 5).map((initiative) => LearnerGrowthExperimentModel.listByInitiativeId(initiative.id, db))
    );
    const experiments = experimentLists.flat();

    const breakdown = {
      bookings: bookings.length,
      libraryEntries: libraryEntries.length,
      openSupportTickets: supportCases.filter((supportCase) => supportCase?.status !== 'resolved').length,
      subscriptions: subscriptions.filter((subscription) => subscription?.status === 'active').length,
      growthExperiments: experiments.length
    };

    const score = computeEngagementScore({
      bookings,
      libraryEntries,
      supportCases,
      subscriptions,
      growthExperiments: experiments
    });

    return {
      score,
      breakdown,
      generatedAt: new Date().toISOString()
    };
  }
}
