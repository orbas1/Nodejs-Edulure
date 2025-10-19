import PlatformSettingModel from '../models/PlatformSettingModel.js';
import db from '../config/database.js';
import { env } from '../config/env.js';

const SETTINGS_KEYS = Object.freeze({
  MONETIZATION: 'monetization'
});

const DEFAULT_MONETIZATION = Object.freeze({
  commissions: {
    enabled: true,
    rateBps: 250,
    minimumFeeCents: 0,
    allowCommunityOverride: true,
    default: {
      rateBps: 250,
      minimumFeeCents: 0,
      affiliateShare: 0.25
    },
    categories: {
      community_subscription: { rateBps: 250, minimumFeeCents: 0, affiliateShare: 0.25 },
      community_live_donation: { rateBps: 1000, minimumFeeCents: 0, affiliateShare: 0.25 },
      course_sale: { rateBps: 500, minimumFeeCents: 0, affiliateShare: 0.25 },
      ebook_sale: { rateBps: 500, minimumFeeCents: 0, affiliateShare: 0.25 },
      tutor_booking: { rateBps: 250, minimumFeeCents: 0, affiliateShare: 0.25 }
    }
  },
  subscriptions: {
    enabled: true,
    restrictedFeatures: [],
    gracePeriodDays: 3,
    restrictOnFailure: true
  },
  payments: {
    defaultProvider: 'stripe',
    stripeEnabled: true,
    escrowEnabled: false
  },
  affiliate: {
    enabled: true,
    autoApprove: true,
    cookieWindowDays: 30,
    payoutScheduleDays: 30,
    requireTaxInformation: true,
    defaultCommission: {
      recurrence: 'infinite',
      maxOccurrences: null,
      tiers: [
        { thresholdCents: 0, rateBps: 1000 },
        { thresholdCents: 50_000, rateBps: 1500 }
      ]
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
    complianceNarrative:
      'Platform commission remains capped at 2.5% for communities and mentoring (5% on digital catalogues and 10% on live donations) with funds routed directly between customers and providers; the platform operates a non-custodial ledger to avoid FCA regulated activity.'
  }
});

function deepMerge(base, overrides) {
  const result = Array.isArray(base) ? [...base] : { ...base };
  if (!overrides || typeof overrides !== 'object') {
    return result;
  }

  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      result[key] = [...value];
      return;
    }

    if (value && typeof value === 'object') {
      const baseValue = result[key] && typeof result[key] === 'object' ? result[key] : {};
      result[key] = deepMerge(baseValue, value);
      return;
    }

    result[key] = value;
  });

  return result;
}

function clampInt(value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const numeric = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const rounded = Math.round(numeric);
  return Math.min(Math.max(rounded, min), max);
}

function clampRatio(value, { min = 0, max = 1, fallback = 0 } = {}) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  if (numeric < min) {
    return min;
  }
  if (numeric > max) {
    return max;
  }

  return numeric;
}

function normalizeStringArray(value) {
  if (!value) {
    return [];
  }

  const array = Array.isArray(value) ? value : String(value).split(/[\n,]/);
  const seen = new Set();
  const result = [];

  array.forEach((entry) => {
    const trimmed = typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim();
    if (!trimmed) {
      return;
    }
    const normalized = trimmed.slice(0, 120);
    if (!seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      result.push(normalized);
    }
  });

  return result;
}

function sanitizeCommissionTiers(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const tiers = value
    .map((tier) => {
      if (!tier || typeof tier !== 'object') {
        return null;
      }
      return {
        thresholdCents: clampInt(tier.thresholdCents, {
          min: 0,
          max: 1_000_000_000,
          fallback: 0
        }),
        rateBps: clampInt(tier.rateBps, { min: 0, max: 5000, fallback: 1000 })
      };
    })
    .filter(Boolean);

  return tiers.length ? tiers : null;
}

function normaliseCommissionTiers(tiers, fallbackTiers = []) {
  const source = Array.isArray(tiers) ? tiers : fallbackTiers;
  const entries = (Array.isArray(source) ? source : []).map((tier) => ({
    thresholdCents: clampInt(tier.thresholdCents, {
      min: 0,
      max: 1_000_000_000,
      fallback: 0
    }),
    rateBps: clampInt(tier.rateBps, { min: 0, max: 5000, fallback: 1000 })
  }));

  const deduped = [];
  const seenThresholds = new Set();
  entries
    .sort((a, b) => a.thresholdCents - b.thresholdCents)
    .forEach((tier) => {
      const key = tier.thresholdCents;
      if (seenThresholds.has(key)) {
        return;
      }
      seenThresholds.add(key);
      deduped.push(tier);
    });

  if (!deduped.some((tier) => tier.thresholdCents === 0)) {
    const fallbackRate =
      fallbackTiers?.find((tier) => tier?.thresholdCents === 0)?.rateBps ?? deduped[0]?.rateBps ?? 1000;
    deduped.unshift({ thresholdCents: 0, rateBps: clampInt(fallbackRate, { min: 0, max: 5000, fallback: 1000 }) });
  }

  return deduped.slice(0, 10);
}

function resolveDefaultMonetization() {
  const defaults = deepMerge({}, DEFAULT_MONETIZATION);
  const stripeConfigured = Boolean(env.payments?.stripe?.secretKey);
  const escrowConfigured = Boolean(env.payments?.escrow?.apiKey && env.payments?.escrow?.apiSecret);

  defaults.payments.stripeEnabled = stripeConfigured;
  defaults.payments.escrowEnabled = escrowConfigured;
  if (!stripeConfigured && escrowConfigured) {
    defaults.payments.defaultProvider = 'escrow';
  }

  return defaults;
}

function sanitizeMonetizationPayload(payload = {}) {
  const sanitized = {};

  if (payload.commissions && typeof payload.commissions === 'object') {
    const commission = {};
    if (payload.commissions.enabled !== undefined) {
      commission.enabled = Boolean(payload.commissions.enabled);
    }
    if (payload.commissions.rateBps !== undefined) {
      commission.rateBps = clampInt(payload.commissions.rateBps, { min: 0, max: 5000, fallback: 250 });
    }
    if (payload.commissions.minimumFeeCents !== undefined) {
      commission.minimumFeeCents = clampInt(payload.commissions.minimumFeeCents, { min: 0, max: 10_000_000, fallback: 0 });
    }
    if (payload.commissions.allowCommunityOverride !== undefined) {
      commission.allowCommunityOverride = Boolean(payload.commissions.allowCommunityOverride);
    }
    if (payload.commissions.default && typeof payload.commissions.default === 'object') {
      commission.default = {
        rateBps: clampInt(payload.commissions.default.rateBps, {
          min: 0,
          max: 5000,
          fallback: DEFAULT_MONETIZATION.commissions.default.rateBps
        }),
        minimumFeeCents: clampInt(payload.commissions.default.minimumFeeCents, {
          min: 0,
          max: 10_000_000,
          fallback: DEFAULT_MONETIZATION.commissions.default.minimumFeeCents
        }),
        affiliateShare: clampRatio(payload.commissions.default.affiliateShare, {
          min: 0,
          max: 1,
          fallback: DEFAULT_MONETIZATION.commissions.default.affiliateShare
        })
      };
    }
    if (payload.commissions.categories && typeof payload.commissions.categories === 'object') {
      const categories = {};
      Object.entries(payload.commissions.categories).forEach(([key, value]) => {
        if (!value || typeof value !== 'object') {
          return;
        }
        categories[String(key).trim()] = {
          rateBps: clampInt(value.rateBps, {
            min: 0,
            max: 5000,
            fallback: DEFAULT_MONETIZATION.commissions.categories[key]?.rateBps ??
              DEFAULT_MONETIZATION.commissions.default.rateBps
          }),
          minimumFeeCents: clampInt(value.minimumFeeCents, {
            min: 0,
            max: 10_000_000,
            fallback: DEFAULT_MONETIZATION.commissions.categories[key]?.minimumFeeCents ??
              DEFAULT_MONETIZATION.commissions.default.minimumFeeCents
          }),
          affiliateShare: clampRatio(value.affiliateShare, {
            min: 0,
            max: 1,
            fallback: DEFAULT_MONETIZATION.commissions.categories[key]?.affiliateShare ??
              DEFAULT_MONETIZATION.commissions.default.affiliateShare
          })
        };
      });
      commission.categories = categories;
    }
    if (Object.keys(commission).length) {
      sanitized.commissions = commission;
    }
  }

  if (payload.subscriptions && typeof payload.subscriptions === 'object') {
    const subscriptions = {};
    if (payload.subscriptions.enabled !== undefined) {
      subscriptions.enabled = Boolean(payload.subscriptions.enabled);
    }
    if (payload.subscriptions.restrictedFeatures !== undefined) {
      subscriptions.restrictedFeatures = normalizeStringArray(payload.subscriptions.restrictedFeatures);
    }
    if (payload.subscriptions.gracePeriodDays !== undefined) {
      subscriptions.gracePeriodDays = clampInt(payload.subscriptions.gracePeriodDays, { min: 0, max: 90, fallback: 3 });
    }
    if (payload.subscriptions.restrictOnFailure !== undefined) {
      subscriptions.restrictOnFailure = Boolean(payload.subscriptions.restrictOnFailure);
    }
    if (Object.keys(subscriptions).length) {
      sanitized.subscriptions = subscriptions;
    }
  }

  if (payload.payments && typeof payload.payments === 'object') {
    const payments = {};
    if (payload.payments.defaultProvider !== undefined) {
      const provider = String(payload.payments.defaultProvider).toLowerCase();
      if (['stripe', 'escrow'].includes(provider)) {
        payments.defaultProvider = provider;
      }
    }
    if (payload.payments.stripeEnabled !== undefined) {
      payments.stripeEnabled = Boolean(payload.payments.stripeEnabled);
    }
    if (payload.payments.escrowEnabled !== undefined) {
      payments.escrowEnabled = Boolean(payload.payments.escrowEnabled);
    }
    if (Object.keys(payments).length) {
      sanitized.payments = payments;
    }
  }

  if (payload.affiliate && typeof payload.affiliate === 'object') {
    const affiliate = {};
    if (payload.affiliate.enabled !== undefined) {
      affiliate.enabled = Boolean(payload.affiliate.enabled);
    }
    if (payload.affiliate.autoApprove !== undefined) {
      affiliate.autoApprove = Boolean(payload.affiliate.autoApprove);
    }
    if (payload.affiliate.cookieWindowDays !== undefined) {
      affiliate.cookieWindowDays = clampInt(payload.affiliate.cookieWindowDays, {
        min: 1,
        max: 365,
        fallback: 30
      });
    }
    if (payload.affiliate.payoutScheduleDays !== undefined) {
      affiliate.payoutScheduleDays = clampInt(payload.affiliate.payoutScheduleDays, {
        min: 7,
        max: 120,
        fallback: 30
      });
    }
    if (payload.affiliate.requireTaxInformation !== undefined) {
      affiliate.requireTaxInformation = Boolean(payload.affiliate.requireTaxInformation);
    }
    if (payload.affiliate.defaultCommission && typeof payload.affiliate.defaultCommission === 'object') {
      const commission = {};
      if (payload.affiliate.defaultCommission.recurrence !== undefined) {
        const recurrence = String(payload.affiliate.defaultCommission.recurrence).toLowerCase();
        if (['once', 'finite', 'infinite'].includes(recurrence)) {
          commission.recurrence = recurrence;
        }
      }
      if (payload.affiliate.defaultCommission.maxOccurrences !== undefined) {
        commission.maxOccurrences = clampInt(payload.affiliate.defaultCommission.maxOccurrences, {
          min: 1,
          max: 120,
          fallback: null
        });
      }
      const tiers = sanitizeCommissionTiers(payload.affiliate.defaultCommission.tiers);
      if (tiers) {
        commission.tiers = tiers;
      }
      if (Object.keys(commission).length) {
        affiliate.defaultCommission = commission;
      }
    }
    if (payload.affiliate.security && typeof payload.affiliate.security === 'object') {
      const security = {};
      if (payload.affiliate.security.blockSelfReferral !== undefined) {
        security.blockSelfReferral = Boolean(payload.affiliate.security.blockSelfReferral);
      }
      if (payload.affiliate.security.enforceTwoFactorForPayouts !== undefined) {
        security.enforceTwoFactorForPayouts = Boolean(
          payload.affiliate.security.enforceTwoFactorForPayouts
        );
      }
      if (Object.keys(security).length) {
        affiliate.security = security;
      }
    }
    if (Object.keys(affiliate).length) {
      sanitized.affiliate = affiliate;
    }
  }

  if (payload.workforce && typeof payload.workforce === 'object') {
    const workforce = {};
    if (payload.workforce.providerControlsCompensation !== undefined) {
      workforce.providerControlsCompensation = Boolean(
        payload.workforce.providerControlsCompensation
      );
    }
    if (payload.workforce.minimumServicemanShareBps !== undefined) {
      workforce.minimumServicemanShareBps = clampInt(
        payload.workforce.minimumServicemanShareBps,
        { min: 0, max: 10_000, fallback: 0 }
      );
    }
    if (payload.workforce.recommendedServicemanShareBps !== undefined) {
      workforce.recommendedServicemanShareBps = clampInt(
        payload.workforce.recommendedServicemanShareBps,
        { min: 0, max: 10_000, fallback: 7500 }
      );
    }
    if (payload.workforce.nonCustodialWallets !== undefined) {
      workforce.nonCustodialWallets = Boolean(payload.workforce.nonCustodialWallets);
    }
    if (payload.workforce.complianceNarrative !== undefined) {
      const narrative = String(payload.workforce.complianceNarrative ?? '').trim();
      workforce.complianceNarrative = narrative.slice(0, 2000);
    }
    if (Object.keys(workforce).length) {
      sanitized.workforce = workforce;
    }
  }

  return sanitized;
}

function normaliseMonetization(rawSettings = {}) {
  const defaults = resolveDefaultMonetization();
  const merged = deepMerge(defaults, rawSettings);

  merged.commissions.rateBps = clampInt(merged.commissions.rateBps, { min: 0, max: 5000, fallback: defaults.commissions.rateBps });
  merged.commissions.minimumFeeCents = clampInt(merged.commissions.minimumFeeCents, { min: 0, max: 10_000_000, fallback: defaults.commissions.minimumFeeCents });
  merged.commissions.enabled = Boolean(merged.commissions.enabled);
  merged.commissions.allowCommunityOverride = Boolean(merged.commissions.allowCommunityOverride);

  const defaultCommission = merged.commissions.default ?? {};
  defaultCommission.rateBps = clampInt(defaultCommission.rateBps ?? merged.commissions.rateBps, {
    min: 0,
    max: 5000,
    fallback: defaults.commissions.default.rateBps
  });
  defaultCommission.minimumFeeCents = clampInt(
    defaultCommission.minimumFeeCents ?? merged.commissions.minimumFeeCents,
    {
      min: 0,
      max: 10_000_000,
      fallback: defaults.commissions.default.minimumFeeCents
    }
  );
  defaultCommission.affiliateShare = clampRatio(
    defaultCommission.affiliateShare ?? defaults.commissions.default.affiliateShare,
    { fallback: defaults.commissions.default.affiliateShare }
  );
  merged.commissions.default = defaultCommission;
  merged.commissions.rateBps = defaultCommission.rateBps;
  merged.commissions.minimumFeeCents = defaultCommission.minimumFeeCents;

  const categoryDefaults = defaults.commissions.categories ?? {};
  const providedCategories = merged.commissions.categories ?? {};
  const categoryKeys = new Set([
    ...Object.keys(categoryDefaults),
    ...Object.keys(providedCategories)
  ]);
  const normalisedCategories = {};
  categoryKeys.forEach((key) => {
    const base = providedCategories[key] ?? {};
    const fallback = categoryDefaults[key] ?? defaultCommission;
    normalisedCategories[key] = {
      rateBps: clampInt(base.rateBps ?? fallback.rateBps ?? defaultCommission.rateBps, {
        min: 0,
        max: 5000,
        fallback: fallback.rateBps ?? defaultCommission.rateBps
      }),
      minimumFeeCents: clampInt(
        base.minimumFeeCents ?? fallback.minimumFeeCents ?? defaultCommission.minimumFeeCents,
        {
          min: 0,
          max: 10_000_000,
          fallback: fallback.minimumFeeCents ?? defaultCommission.minimumFeeCents
        }
      ),
      affiliateShare: clampRatio(
        base.affiliateShare ?? fallback.affiliateShare ?? defaultCommission.affiliateShare,
        { fallback: fallback.affiliateShare ?? defaultCommission.affiliateShare }
      )
    };
  });
  merged.commissions.categories = normalisedCategories;

  merged.subscriptions.enabled = Boolean(merged.subscriptions.enabled);
  merged.subscriptions.restrictOnFailure = Boolean(merged.subscriptions.restrictOnFailure);
  merged.subscriptions.gracePeriodDays = clampInt(merged.subscriptions.gracePeriodDays, {
    min: 0,
    max: 90,
    fallback: defaults.subscriptions.gracePeriodDays
  });
  merged.subscriptions.restrictedFeatures = normalizeStringArray(merged.subscriptions.restrictedFeatures);

  merged.payments.stripeEnabled = Boolean(merged.payments.stripeEnabled);
  merged.payments.escrowEnabled = Boolean(merged.payments.escrowEnabled);
  const requestedProvider = String(merged.payments.defaultProvider ?? defaults.payments.defaultProvider).toLowerCase();
  if (requestedProvider === 'escrow' && merged.payments.escrowEnabled) {
    merged.payments.defaultProvider = 'escrow';
  } else {
    merged.payments.defaultProvider = merged.payments.stripeEnabled ? 'stripe' : merged.payments.escrowEnabled ? 'escrow' : 'stripe';
  }

  merged.affiliate = merged.affiliate ?? {};
  const affiliateDefaults = defaults.affiliate;
  merged.affiliate.enabled = Boolean(merged.affiliate.enabled);
  merged.affiliate.autoApprove = Boolean(
    merged.affiliate.autoApprove ?? affiliateDefaults.autoApprove
  );
  merged.affiliate.cookieWindowDays = clampInt(merged.affiliate.cookieWindowDays, {
    min: 1,
    max: 365,
    fallback: affiliateDefaults.cookieWindowDays
  });
  merged.affiliate.payoutScheduleDays = clampInt(merged.affiliate.payoutScheduleDays, {
    min: 7,
    max: 120,
    fallback: affiliateDefaults.payoutScheduleDays
  });
  merged.affiliate.requireTaxInformation = Boolean(
    merged.affiliate.requireTaxInformation ?? affiliateDefaults.requireTaxInformation
  );

  const defaultCommission = merged.affiliate.defaultCommission ?? {};
  const defaultRecurrence = String(defaultCommission.recurrence ?? affiliateDefaults.defaultCommission.recurrence).toLowerCase();
  const recurrence = ['once', 'finite', 'infinite'].includes(defaultRecurrence)
    ? defaultRecurrence
    : affiliateDefaults.defaultCommission.recurrence;
  let maxOccurrences = defaultCommission.maxOccurrences;
  if (recurrence === 'finite') {
    maxOccurrences = clampInt(maxOccurrences, {
      min: 1,
      max: 120,
      fallback: affiliateDefaults.defaultCommission.maxOccurrences ?? 1
    });
  } else {
    maxOccurrences = null;
  }
  const tiers = normaliseCommissionTiers(
    defaultCommission.tiers,
    affiliateDefaults.defaultCommission.tiers
  );
  merged.affiliate.defaultCommission = {
    recurrence,
    maxOccurrences,
    tiers
  };

  const security = merged.affiliate.security ?? {};
  merged.affiliate.security = {
    blockSelfReferral: Boolean(
      security.blockSelfReferral ?? affiliateDefaults.security.blockSelfReferral
    ),
    enforceTwoFactorForPayouts: Boolean(
      security.enforceTwoFactorForPayouts ?? affiliateDefaults.security.enforceTwoFactorForPayouts
    )
  };

  merged.workforce = merged.workforce ?? {};
  merged.workforce.providerControlsCompensation = Boolean(
    merged.workforce.providerControlsCompensation ?? defaults.workforce.providerControlsCompensation
  );
  merged.workforce.minimumServicemanShareBps = clampInt(
    merged.workforce.minimumServicemanShareBps,
    {
      min: 0,
      max: 10_000,
      fallback: defaults.workforce.minimumServicemanShareBps
    }
  );
  merged.workforce.recommendedServicemanShareBps = clampInt(
    merged.workforce.recommendedServicemanShareBps,
    {
      min: 0,
      max: 10_000,
      fallback: defaults.workforce.recommendedServicemanShareBps
    }
  );
  merged.workforce.nonCustodialWallets = Boolean(
    merged.workforce.nonCustodialWallets ?? defaults.workforce.nonCustodialWallets
  );
  merged.workforce.complianceNarrative = String(
    merged.workforce.complianceNarrative ?? defaults.workforce.complianceNarrative
  )
    .trim()
    .slice(0, 2000);

  return merged;
}

export default class PlatformSettingsService {
  static async getMonetizationSettings(connection = db) {
    const record = await PlatformSettingModel.findByKey(SETTINGS_KEYS.MONETIZATION, connection);
    return normaliseMonetization(record?.value ?? {});
  }

  static async updateMonetizationSettings(payload, connection = db) {
    const sanitized = sanitizeMonetizationPayload(payload);
    const current = await this.getMonetizationSettings(connection);
    const merged = normaliseMonetization(deepMerge(current, sanitized));

    await PlatformSettingModel.upsert(SETTINGS_KEYS.MONETIZATION, {
      commissions: {
        enabled: merged.commissions.enabled,
        rateBps: merged.commissions.rateBps,
        minimumFeeCents: merged.commissions.minimumFeeCents,
        allowCommunityOverride: merged.commissions.allowCommunityOverride,
        default: merged.commissions.default,
        categories: merged.commissions.categories
      },
      subscriptions: {
        enabled: merged.subscriptions.enabled,
        restrictedFeatures: merged.subscriptions.restrictedFeatures,
        gracePeriodDays: merged.subscriptions.gracePeriodDays,
        restrictOnFailure: merged.subscriptions.restrictOnFailure
      },
      payments: {
        defaultProvider: merged.payments.defaultProvider,
        stripeEnabled: merged.payments.stripeEnabled,
        escrowEnabled: merged.payments.escrowEnabled
      },
      affiliate: {
        enabled: merged.affiliate.enabled,
        autoApprove: merged.affiliate.autoApprove,
        cookieWindowDays: merged.affiliate.cookieWindowDays,
        payoutScheduleDays: merged.affiliate.payoutScheduleDays,
        requireTaxInformation: merged.affiliate.requireTaxInformation,
        defaultCommission: merged.affiliate.defaultCommission,
        security: merged.affiliate.security
      },
      workforce: {
        providerControlsCompensation: merged.workforce.providerControlsCompensation,
        minimumServicemanShareBps: merged.workforce.minimumServicemanShareBps,
        recommendedServicemanShareBps: merged.workforce.recommendedServicemanShareBps,
        nonCustodialWallets: merged.workforce.nonCustodialWallets,
        complianceNarrative: merged.workforce.complianceNarrative
      }
    }, connection);

    return merged;
  }

  static calculateCommission(amountCents, commissionConfig, { category } = {}) {
    const fallback = {
      platformAmountCents: 0,
      affiliateAmountCents: 0,
      appliedRateBps: 0,
      affiliateShareRatio: 0,
      appliedMinimumFeeCents: 0,
      category: category ?? null
    };

    if (!commissionConfig || !commissionConfig.enabled) {
      return fallback;
    }

    const amount = clampInt(amountCents, { min: 0, fallback: 0 });
    const defaultCommission = commissionConfig.default ?? {};
    const categoryConfig = category && commissionConfig.categories
      ? commissionConfig.categories[category]
      : undefined;

    const rate = clampInt(
      categoryConfig?.rateBps ?? defaultCommission.rateBps ?? commissionConfig.rateBps,
      { min: 0, max: 5000, fallback: 0 }
    );
    const minimum = clampInt(
      categoryConfig?.minimumFeeCents ?? defaultCommission.minimumFeeCents ?? commissionConfig.minimumFeeCents,
      { min: 0, max: 10_000_000, fallback: 0 }
    );
    const affiliateShare = clampRatio(
      categoryConfig?.affiliateShare ?? defaultCommission.affiliateShare ?? 0,
      { fallback: 0 }
    );

    const calculated = Math.max(Math.floor((amount * rate) / 10_000), minimum);
    const affiliateAmount = Math.floor(calculated * affiliateShare);

    return {
      platformAmountCents: calculated,
      affiliateAmountCents: affiliateAmount,
      appliedRateBps: rate,
      affiliateShareRatio: affiliateShare,
      appliedMinimumFeeCents: minimum,
      category: categoryConfig ? category : null
    };
  }
}

export { resolveDefaultMonetization, normaliseMonetization };
