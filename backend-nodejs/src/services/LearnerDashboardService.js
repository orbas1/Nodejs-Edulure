import crypto from 'crypto';

import logger from '../config/logger.js';
import db from '../config/database.js';
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

function formatLastOpenedLabel(value) {
  if (!value) {
    return 'Not opened yet';
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Not opened yet';
    }
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (_error) {
    return 'Not opened yet';
  }
}

function formatLibraryEntry(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    title: entry.title,
    format: entry.format,
    progress: Number(entry.progress ?? 0),
    lastOpened: entry.lastOpened ?? null,
    lastOpenedLabel: formatLastOpenedLabel(entry.lastOpened),
    url: entry.url ?? null,
    summary: entry.summary ?? null,
    author: entry.author ?? null,
    coverUrl: entry.coverUrl ?? null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    highlights: Array.isArray(entry.highlights) ? entry.highlights : [],
    audioUrl: entry.audioUrl ?? null,
    previewUrl: entry.previewUrl ?? null,
    metadata: entry.metadata ?? {}
  };
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

  return workspace.customer?.assignments?.find((assignment) => assignment.id === order.id) ?? null;
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
    const bookingId = generateReference('booking');
    log.info({ userId, bookingId, payload }, 'Learner requested new tutor booking');
    return buildAcknowledgement({
      reference: bookingId,
      message: 'Tutor booking request submitted',
      meta: {
        status: 'requested',
        topic: payload.topic ?? 'Mentorship session',
        preferredDate: payload.preferredDate ?? null
      }
    });
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

  static async createFieldServiceAssignment(userId, payload = {}) {
    if (!payload.serviceType) {
      throw new Error('Service type is required to dispatch a field service assignment');
    }

    const owner = payload.owner?.trim();
    if (!owner) {
      throw new Error('An assignment owner is required');
    }

    return db.transaction(async (trx) => {
      const reference = generateReference('fs');
      const metadata = {
        owner,
        supportChannel: payload.supportChannel ?? null,
        briefUrl: payload.briefUrl ?? null,
        fieldNotes: payload.fieldNotes ?? null,
        equipment: payload.equipment ?? null,
        attachments: Array.isArray(payload.attachments)
          ? payload.attachments.map((item) => String(item).trim()).filter(Boolean)
          : [],
        debriefHost: payload.debriefHost ?? null,
        debriefAt: payload.debriefAt ?? null
      };

      const order = await FieldServiceOrderModel.createAssignment(
        {
          reference,
          customerUserId: userId,
          status: payload.status ? String(payload.status).toLowerCase() : 'dispatched',
          priority: payload.priority ? String(payload.priority).toLowerCase() : 'standard',
          serviceType: payload.serviceType.trim(),
          summary: payload.fieldNotes ?? null,
          requestedAt: new Date().toISOString(),
          scheduledFor: payload.scheduledFor ?? null,
          locationLabel: payload.location ?? null,
          metadata
        },
        trx
      );

      await FieldServiceEventModel.create(
        {
          orderId: order.id,
          eventType: 'dispatch_created',
          status: order.status,
          notes: payload.fieldNotes ?? null,
          author: owner,
          metadata: {
            supportChannel: payload.supportChannel ?? null
          }
        },
        trx
      );

      const assignment = await buildFieldServiceAssignment({ userId, order, connection: trx });
      return assignment ?? {
        id: order.id,
        reference: order.reference,
        status: order.status,
        serviceType: order.serviceType,
        priority: order.priority
      };
    });
  }

  static async updateFieldServiceAssignment(userId, assignmentId, payload = {}) {
    const order = await FieldServiceOrderModel.findByIdForCustomer(userId, assignmentId);
    if (!order) {
      const error = new Error('Field service assignment not found');
      error.status = 404;
      throw error;
    }

    const metadata = { ...order.metadata };
    if (payload.owner !== undefined) {
      metadata.owner = payload.owner?.trim() || null;
    }
    if (payload.supportChannel !== undefined) {
      metadata.supportChannel = payload.supportChannel || null;
    }
    if (payload.briefUrl !== undefined) {
      metadata.briefUrl = payload.briefUrl || null;
    }
    if (payload.fieldNotes !== undefined) {
      metadata.fieldNotes = payload.fieldNotes || null;
    }
    if (payload.equipment !== undefined) {
      metadata.equipment = payload.equipment || null;
    }
    if (payload.attachments !== undefined) {
      metadata.attachments = Array.isArray(payload.attachments)
        ? payload.attachments.map((item) => String(item).trim()).filter(Boolean)
        : [];
    }
    if (payload.debriefHost !== undefined) {
      metadata.debriefHost = payload.debriefHost || null;
    }
    if (payload.debriefAt !== undefined) {
      metadata.debriefAt = payload.debriefAt || null;
    }
    if (payload.escalation) {
      metadata.escalatedAt = new Date().toISOString();
    }

    return db.transaction(async (trx) => {
      const updated = await FieldServiceOrderModel.updateById(
        order.id,
        {
          status: payload.status ? String(payload.status).toLowerCase() : undefined,
          priority: payload.priority ? String(payload.priority).toLowerCase() : undefined,
          serviceType: payload.serviceType ? payload.serviceType.trim() : undefined,
          summary: payload.fieldNotes !== undefined ? payload.fieldNotes : undefined,
          scheduledFor: payload.scheduledFor !== undefined ? payload.scheduledFor : undefined,
          locationLabel: payload.location !== undefined ? payload.location : undefined,
          metadata
        },
        trx
      );

      const eventType = payload.status
        ? `status_${String(payload.status).toLowerCase()}`
        : 'details_updated';

      await FieldServiceEventModel.create(
        {
          orderId: order.id,
          eventType,
          status: payload.status ? String(payload.status).toLowerCase() : updated.status,
          notes: payload.fieldNotes ?? payload.notes ?? null,
          author: metadata.owner ?? 'Learner operations',
          metadata: {
            supportChannel: metadata.supportChannel ?? null,
            escalation: Boolean(payload.escalation ?? false)
          }
        },
        trx
      );

      const assignment = await buildFieldServiceAssignment({ userId, order: updated, connection: trx });
      return assignment ?? {
        id: updated.id,
        status: updated.status,
        serviceType: updated.serviceType,
        priority: updated.priority
      };
    });
  }

  static async closeFieldServiceAssignment(userId, assignmentId, payload = {}) {
    const order = await FieldServiceOrderModel.findByIdForCustomer(userId, assignmentId);
    if (!order) {
      const error = new Error('Field service assignment not found');
      error.status = 404;
      throw error;
    }

    return db.transaction(async (trx) => {
      const metadata = {
        ...order.metadata,
        resolution: payload.resolution ?? null,
        closedAt: new Date().toISOString(),
        closedBy: userId
      };

      const updated = await FieldServiceOrderModel.updateById(
        order.id,
        {
          status: 'closed',
          metadata
        },
        trx
      );

      await FieldServiceEventModel.create(
        {
          orderId: order.id,
          eventType: 'job_completed',
          status: 'closed',
          notes: payload.resolution ?? null,
          author: metadata.owner ?? 'Learner operations',
          metadata: {
            resolution: payload.resolution ?? null
          }
        },
        trx
      );

      return buildAcknowledgement({
        reference: updated.reference ?? `fs-${updated.id}`,
        message: 'Field service assignment closed',
        meta: {
          assignmentId: updated.id
        }
      });
    });
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
}
