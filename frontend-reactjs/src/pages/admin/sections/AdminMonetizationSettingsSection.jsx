import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { updateMonetizationSettings } from '../../../api/adminApi.js';

const COMMISSION_CATEGORY_LABELS = Object.freeze({
  community_subscription: 'Community subscriptions',
  community_live_donation: 'Community live stream donations',
  course_sale: 'Course sales',
  ebook_sale: 'E-book sales',
  tutor_booking: 'Tutor bookings'
});

const DEFAULT_SETTINGS = Object.freeze({
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
      'Commissions stay capped at 2.5% for communities and mentors, 5% on digital catalogues, and 10% on live donations. Providers set their own rates while the ledger remains non-custodial.'
  }
});

function normaliseSettings(settings) {
  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  const defaultAffiliate = DEFAULT_SETTINGS.affiliate;
  const providedAffiliate = settings.affiliate ?? {};
  const baseAffiliateCommission = providedAffiliate.defaultCommission ?? {};
  const affiliateRecurrence = ['once', 'finite', 'infinite'].includes(
    baseAffiliateCommission.recurrence
  )
    ? baseAffiliateCommission.recurrence
    : defaultAffiliate.defaultCommission.recurrence;
  const tierFallbackRate = defaultAffiliate.defaultCommission.tiers[0]?.rateBps ?? 1000;
  const affiliateTiers = (Array.isArray(baseAffiliateCommission.tiers)
    ? baseAffiliateCommission.tiers
    : defaultAffiliate.defaultCommission.tiers
  )
    .map((tier, index) => ({
      thresholdCents: Number.isFinite(Number(tier.thresholdCents))
        ? Number(tier.thresholdCents)
        : index === 0
          ? 0
          : (index + 1) * 25_000,
      rateBps: Number.isFinite(Number(tier.rateBps))
        ? Number(tier.rateBps)
        : tierFallbackRate
    }))
    .sort((a, b) => a.thresholdCents - b.thresholdCents)
    .slice(0, 10);
  if (!affiliateTiers.length) {
    affiliateTiers.push({ thresholdCents: 0, rateBps: tierFallbackRate });
  }
  affiliateTiers[0].thresholdCents = 0;

  const affiliateMaxOccurrences =
    affiliateRecurrence === 'finite'
      ? Number.isFinite(Number(baseAffiliateCommission.maxOccurrences))
        ? Number(baseAffiliateCommission.maxOccurrences)
        : defaultAffiliate.defaultCommission.maxOccurrences ?? 1
      : null;

  const commissionSource = settings.commissions ?? {};
  const commissionDefault = commissionSource.default ?? {};
  const defaultRate = Number.isFinite(Number(commissionSource.rateBps ?? commissionDefault.rateBps))
    ? Number(commissionSource.rateBps ?? commissionDefault.rateBps)
    : DEFAULT_SETTINGS.commissions.default.rateBps;
  const defaultMinimum = Number.isFinite(
    Number(commissionSource.minimumFeeCents ?? commissionDefault.minimumFeeCents)
  )
    ? Number(commissionSource.minimumFeeCents ?? commissionDefault.minimumFeeCents)
    : DEFAULT_SETTINGS.commissions.default.minimumFeeCents;
  const defaultAffiliateShare = clampShareRatio(
    commissionDefault.affiliateShare ?? DEFAULT_SETTINGS.commissions.default.affiliateShare
  );

  const fallbackCategories = DEFAULT_SETTINGS.commissions.categories;
  const providedCategories = commissionSource.categories ?? {};
  const categoryKeys = Array.from(
    new Set([...Object.keys(fallbackCategories), ...Object.keys(providedCategories)])
  );
  const commissionCategories = {};
  categoryKeys.forEach((key) => {
    const source = providedCategories[key] ?? fallbackCategories[key] ?? {};
    const fallback = fallbackCategories[key] ?? DEFAULT_SETTINGS.commissions.default;
    commissionCategories[key] = {
      rateBps: Number.isFinite(Number(source.rateBps))
        ? Number(source.rateBps)
        : fallback.rateBps ?? defaultRate,
      minimumFeeCents: Number.isFinite(Number(source.minimumFeeCents))
        ? Number(source.minimumFeeCents)
        : fallback.minimumFeeCents ?? defaultMinimum,
      affiliateShare: clampShareRatio(
        source.affiliateShare ?? fallback.affiliateShare ?? defaultAffiliateShare
      )
    };
  });

  return {
    commissions: {
      enabled: Boolean(commissionSource.enabled ?? DEFAULT_SETTINGS.commissions.enabled),
      rateBps: defaultRate,
      minimumFeeCents: defaultMinimum,
      allowCommunityOverride: Boolean(
        commissionSource.allowCommunityOverride ?? DEFAULT_SETTINGS.commissions.allowCommunityOverride
      ),
      default: {
        rateBps: defaultRate,
        minimumFeeCents: defaultMinimum,
        affiliateShare: defaultAffiliateShare
      },
      categories: commissionCategories
    },
    subscriptions: {
      enabled: Boolean(settings.subscriptions?.enabled ?? DEFAULT_SETTINGS.subscriptions.enabled),
      restrictedFeatures: Array.isArray(settings.subscriptions?.restrictedFeatures)
        ? settings.subscriptions.restrictedFeatures
        : DEFAULT_SETTINGS.subscriptions.restrictedFeatures,
      gracePeriodDays: Number(
        settings.subscriptions?.gracePeriodDays ?? DEFAULT_SETTINGS.subscriptions.gracePeriodDays
      ),
      restrictOnFailure: Boolean(
        settings.subscriptions?.restrictOnFailure ?? DEFAULT_SETTINGS.subscriptions.restrictOnFailure
      )
    },
    payments: {
      defaultProvider: settings.payments?.defaultProvider ?? DEFAULT_SETTINGS.payments.defaultProvider,
      stripeEnabled: Boolean(settings.payments?.stripeEnabled ?? DEFAULT_SETTINGS.payments.stripeEnabled),
      escrowEnabled: Boolean(settings.payments?.escrowEnabled ?? DEFAULT_SETTINGS.payments.escrowEnabled)
    },
    affiliate: {
      enabled: Boolean(providedAffiliate.enabled ?? defaultAffiliate.enabled),
      autoApprove: Boolean(providedAffiliate.autoApprove ?? defaultAffiliate.autoApprove),
      cookieWindowDays: Number(
        providedAffiliate.cookieWindowDays ?? defaultAffiliate.cookieWindowDays
      ),
      payoutScheduleDays: Number(
        providedAffiliate.payoutScheduleDays ?? defaultAffiliate.payoutScheduleDays
      ),
      requireTaxInformation: Boolean(
        providedAffiliate.requireTaxInformation ?? defaultAffiliate.requireTaxInformation
      ),
      defaultCommission: {
        recurrence: affiliateRecurrence,
        maxOccurrences: affiliateMaxOccurrences,
        tiers: affiliateTiers
      },
      security: {
        blockSelfReferral: Boolean(
          providedAffiliate.security?.blockSelfReferral ?? defaultAffiliate.security.blockSelfReferral
        ),
        enforceTwoFactorForPayouts: Boolean(
          providedAffiliate.security?.enforceTwoFactorForPayouts ??
            defaultAffiliate.security.enforceTwoFactorForPayouts
        )
      }
    },
    workforce: {
      providerControlsCompensation: Boolean(
        settings.workforce?.providerControlsCompensation ?? DEFAULT_SETTINGS.workforce.providerControlsCompensation
      ),
      minimumServicemanShareBps: Number(
        settings.workforce?.minimumServicemanShareBps ?? DEFAULT_SETTINGS.workforce.minimumServicemanShareBps
      ),
      recommendedServicemanShareBps: Number(
        settings.workforce?.recommendedServicemanShareBps ??
          DEFAULT_SETTINGS.workforce.recommendedServicemanShareBps
      ),
      nonCustodialWallets: Boolean(
        settings.workforce?.nonCustodialWallets ?? DEFAULT_SETTINGS.workforce.nonCustodialWallets
      ),
      complianceNarrative:
        (settings.workforce?.complianceNarrative ?? DEFAULT_SETTINGS.workforce.complianceNarrative) || ''
    }
  };
}

function buildFormState(settings) {
  const monetization = normaliseSettings(settings);
  return {
    commissionsEnabled: monetization.commissions.enabled,
    commissionRateBps: monetization.commissions.rateBps,
    commissionMinimumFeeCents: monetization.commissions.minimumFeeCents,
    allowOverride: monetization.commissions.allowCommunityOverride,
    commissionDefaultAffiliateSharePct: clampSharePercentage(
      monetization.commissions.default.affiliateShare * 100,
      monetization.commissions.default.affiliateShare
    ),
    commissionCategories: Array.from(
      new Set([
        ...Object.keys(COMMISSION_CATEGORY_LABELS),
        ...Object.keys(monetization.commissions.categories ?? {})
      ])
    ).map((key) => {
      const config = monetization.commissions.categories?.[key] ?? monetization.commissions.default;
      return {
        key,
        rateBps: config.rateBps,
        minimumFeeCents: config.minimumFeeCents,
        affiliateSharePct: clampSharePercentage(
          (config.affiliateShare ?? monetization.commissions.default.affiliateShare) * 100,
          config.affiliateShare ?? monetization.commissions.default.affiliateShare
        )
      };
    }),
    subscriptionsEnabled: monetization.subscriptions.enabled,
    restrictedFeaturesText: monetization.subscriptions.restrictedFeatures.join('\n'),
    gracePeriodDays: monetization.subscriptions.gracePeriodDays,
    restrictOnFailure: monetization.subscriptions.restrictOnFailure,
    defaultProvider: monetization.payments.defaultProvider,
    stripeEnabled: monetization.payments.stripeEnabled,
    escrowEnabled: monetization.payments.escrowEnabled,
    affiliateEnabled: monetization.affiliate.enabled,
    affiliateAutoApprove: monetization.affiliate.autoApprove,
    affiliateCookieWindowDays: monetization.affiliate.cookieWindowDays,
    affiliatePayoutScheduleDays: monetization.affiliate.payoutScheduleDays,
    affiliateRequireTaxInformation: monetization.affiliate.requireTaxInformation,
    affiliateRecurrence: monetization.affiliate.defaultCommission.recurrence,
    affiliateMaxOccurrences:
      monetization.affiliate.defaultCommission.recurrence === 'finite'
        ? monetization.affiliate.defaultCommission.maxOccurrences ?? ''
        : '',
    affiliateTiers: monetization.affiliate.defaultCommission.tiers,
    affiliateSecurityBlockSelfReferral: monetization.affiliate.security.blockSelfReferral,
    affiliateSecurityTwoFactor: monetization.affiliate.security.enforceTwoFactorForPayouts,
    workforceProviderControls: monetization.workforce.providerControlsCompensation,
    workforceMinimumShareBps: monetization.workforce.minimumServicemanShareBps,
    workforceRecommendedShareBps: monetization.workforce.recommendedServicemanShareBps,
    workforceNonCustodialWallets: monetization.workforce.nonCustodialWallets,
    workforceComplianceNarrative: monetization.workforce.complianceNarrative ?? ''
  };
}

function parseRestrictedFeatures(input) {
  if (!input) {
    return [];
  }

  return input
    .split(/\n|,/) // allow newline or comma separated entries
    .map((entry) => entry.trim())
    .filter((entry, index, arr) => entry && arr.indexOf(entry) === index)
    .slice(0, 50);
}

function clampBasisPoints(value, fallback) {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const rounded = Math.round(numeric);
  return Math.min(Math.max(rounded, 0), 10_000);
}

function clampShareRatio(value, fallback = DEFAULT_SETTINGS.commissions.default.affiliateShare) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  if (numeric < 0) {
    return 0;
  }
  if (numeric > 1) {
    return 1;
  }
  return numeric;
}

function clampSharePercentage(value, fallbackRatio) {
  if (value === undefined || value === null || value === '') {
    return Math.round((fallbackRatio ?? 0) * 1000) / 10;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return Math.round((fallbackRatio ?? 0) * 1000) / 10;
  }
  const bounded = Math.min(Math.max(numeric, 0), 100);
  return Math.round(bounded * 10) / 10;
}

export default function AdminMonetizationSettingsSection({
  sectionId,
  settings,
  token,
  onSettingsUpdated
}) {
  const [formState, setFormState] = useState(() => buildFormState(settings));
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    setFormState(buildFormState(settings));
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [settings]);

  useEffect(() => {
    setFormState((prev) => {
      const availableProviders = [];
      if (prev.stripeEnabled) availableProviders.push('stripe');
      if (prev.escrowEnabled) availableProviders.push('escrow');

      if (availableProviders.length === 0) {
        if (prev.defaultProvider === 'stripe') {
          return prev;
        }
        return { ...prev, defaultProvider: 'stripe' };
      }

      if (!availableProviders.includes(prev.defaultProvider)) {
        return { ...prev, defaultProvider: availableProviders[0] };
      }

      return prev;
    });
  }, [formState.stripeEnabled, formState.escrowEnabled]);

  const providerOptions = useMemo(() => {
    const options = [];
    if (formState.stripeEnabled) {
      options.push({ value: 'stripe', label: 'Stripe (card payments)' });
    }
    if (formState.escrowEnabled) {
      options.push({ value: 'escrow', label: 'Escrow.com (managed transactions)' });
    }
    if (!options.length) {
      options.push({ value: 'stripe', label: 'Stripe (card payments)' });
    }
    return options;
  }, [formState.stripeEnabled, formState.escrowEnabled]);

  const affiliateTiers = useMemo(
    () => (Array.isArray(formState.affiliateTiers) ? formState.affiliateTiers : []),
    [formState.affiliateTiers]
  );

  const affiliateRecurrenceOptions = useMemo(
    () => [
      { value: 'infinite', label: 'Continuous (all renewals)' },
      { value: 'finite', label: 'Finite renewals' },
      { value: 'once', label: 'One-time payout' }
    ],
    []
  );

  const handleToggle = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.checked }));
  };

  const handleInputChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleNumberChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value === '' ? '' : Number(value) }));
  };

  const handleProviderChange = (event) => {
    setFormState((prev) => ({ ...prev, defaultProvider: event.target.value }));
  };

  const handleCommissionDefaultShareChange = (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      commissionDefaultAffiliateSharePct: value === '' ? '' : Number(value)
    }));
  };

  const handleCommissionCategoryNumberChange = (index, field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => {
      const categories = Array.isArray(prev.commissionCategories) ? [...prev.commissionCategories] : [];
      if (!categories[index]) {
        return prev;
      }
      categories[index] = {
        ...categories[index],
        [field]: value === '' ? '' : Number(value)
      };
      return { ...prev, commissionCategories: categories };
    });
  };

  const handleCommissionCategoryShareChange = (index) => (event) => {
    const value = event.target.value;
    setFormState((prev) => {
      const categories = Array.isArray(prev.commissionCategories) ? [...prev.commissionCategories] : [];
      if (!categories[index]) {
        return prev;
      }
      categories[index] = {
        ...categories[index],
        affiliateSharePct: value === '' ? '' : Number(value)
      };
      return { ...prev, commissionCategories: categories };
    });
  };

  const updateAffiliateTiers = (updater) => {
    setFormState((prev) => {
      const current = Array.isArray(prev.affiliateTiers) ? prev.affiliateTiers : [];
      const next = updater(current.map((tier) => ({ ...tier }))) ?? [];
      const sorted = next
        .map((tier, index) => ({
          thresholdCents: Number.isFinite(Number(tier.thresholdCents))
            ? Number(tier.thresholdCents)
            : index === 0
              ? 0
              : 25_000 * (index + 1),
          rateBps: Number.isFinite(Number(tier.rateBps)) ? Number(tier.rateBps) : 1000
        }))
        .sort((a, b) => a.thresholdCents - b.thresholdCents);
      if (sorted.length > 0) {
        sorted[0].thresholdCents = 0;
      }
      return { ...prev, affiliateTiers: sorted };
    });
  };

  const handleTierNumberChange = (index, field) => (event) => {
    const value = event.target.value;
    updateAffiliateTiers((tiers) => {
      const next = [...tiers];
      if (!next[index]) {
        next[index] = { thresholdCents: 0, rateBps: 0 };
      }
      const numeric = Number(value);
      next[index] = {
        ...next[index],
        [field]: Number.isFinite(numeric) ? numeric : next[index][field] ?? 0
      };
      return next;
    });
  };

  const handleAddTier = () => {
    updateAffiliateTiers((tiers) => {
      const next = [...tiers];
      const last = next[next.length - 1] ?? { thresholdCents: 0, rateBps: 1000 };
      const nextThreshold = Number(last.thresholdCents ?? 0) + 25_000;
      next.push({ thresholdCents: nextThreshold, rateBps: Number(last.rateBps ?? 1000) });
      return next;
    });
  };

  const handleRemoveTier = (index) => () => {
    updateAffiliateTiers((tiers) => {
      if (tiers.length <= 1) {
        return tiers;
      }
      const next = [...tiers];
      next.splice(index, 1);
      return next;
    });
  };

  const handleAffiliateRecurrenceChange = (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      affiliateRecurrence: value,
      affiliateMaxOccurrences: value === 'finite' ? prev.affiliateMaxOccurrences || 12 : ''
    }));
  };

  const handleSave = async () => {
    if (!token) {
      setErrorMessage('You must be signed in to update monetization settings.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const preparedAffiliateTiers = affiliateTiers
      .map((tier, index) => {
        const rawThreshold = Number.isFinite(Number(tier.thresholdCents))
          ? Number(tier.thresholdCents)
          : index === 0
            ? 0
            : (index + 1) * 25_000;
        const thresholdCents = index === 0 ? 0 : Math.max(0, rawThreshold);
        const rateBps = Number.isFinite(Number(tier.rateBps))
          ? Number(tier.rateBps)
          : DEFAULT_SETTINGS.affiliate.defaultCommission.tiers[0].rateBps;
        return { thresholdCents, rateBps };
      })
      .filter((tier) => Number.isFinite(Number(tier.thresholdCents)) && Number.isFinite(Number(tier.rateBps)));

    const uniqueAffiliateTiers = preparedAffiliateTiers.filter(
      (tier, index, arr) => index === arr.findIndex((entry) => entry.thresholdCents === tier.thresholdCents)
    );
    if (!uniqueAffiliateTiers.length) {
      uniqueAffiliateTiers.push(...DEFAULT_SETTINGS.affiliate.defaultCommission.tiers);
    }
    uniqueAffiliateTiers.sort((a, b) => a.thresholdCents - b.thresholdCents);
    uniqueAffiliateTiers[0].thresholdCents = 0;

    const affiliateRecurrence = ['once', 'finite', 'infinite'].includes(formState.affiliateRecurrence)
      ? formState.affiliateRecurrence
      : DEFAULT_SETTINGS.affiliate.defaultCommission.recurrence;
    const affiliateMaxOccurrences =
      affiliateRecurrence === 'finite'
        ? Number.isFinite(Number(formState.affiliateMaxOccurrences))
          ? Number(formState.affiliateMaxOccurrences)
          : DEFAULT_SETTINGS.affiliate.defaultCommission.maxOccurrences ?? 1
        : null;

    const minimumShareBps = clampBasisPoints(
      formState.workforceMinimumShareBps,
      DEFAULT_SETTINGS.workforce.minimumServicemanShareBps
    );
    let recommendedShareBps = clampBasisPoints(
      formState.workforceRecommendedShareBps,
      DEFAULT_SETTINGS.workforce.recommendedServicemanShareBps
    );
    if (recommendedShareBps < minimumShareBps) {
      recommendedShareBps = minimumShareBps;
    }
    const workforceNarrative = String(formState.workforceComplianceNarrative ?? '')
      .trim()
      .slice(0, 2000);

    const commissionRateBps = clampBasisPoints(
      formState.commissionRateBps,
      DEFAULT_SETTINGS.commissions.rateBps
    );
    const commissionMinimumFeeCents = Number.isFinite(Number(formState.commissionMinimumFeeCents))
      ? Math.max(0, Math.round(Number(formState.commissionMinimumFeeCents)))
      : DEFAULT_SETTINGS.commissions.minimumFeeCents;
    const defaultShareInput = Number(formState.commissionDefaultAffiliateSharePct);
    const defaultAffiliateShareRatio = Number.isFinite(defaultShareInput)
      ? clampShareRatio(defaultShareInput / 100, DEFAULT_SETTINGS.commissions.default.affiliateShare)
      : DEFAULT_SETTINGS.commissions.default.affiliateShare;

    const commissionCategoriesPayload = {};
    (Array.isArray(formState.commissionCategories) ? formState.commissionCategories : []).forEach(
      (category) => {
        if (!category || !category.key) {
          return;
        }
        const fallback =
          DEFAULT_SETTINGS.commissions.categories[category.key] ?? DEFAULT_SETTINGS.commissions.default;
        const rateBps = clampBasisPoints(category.rateBps, fallback.rateBps ?? commissionRateBps);
        const minimumFee = Number.isFinite(Number(category.minimumFeeCents))
          ? Math.max(0, Math.round(Number(category.minimumFeeCents)))
          : fallback.minimumFeeCents ?? commissionMinimumFeeCents;
        const shareInput = Number(category.affiliateSharePct);
        const affiliateShareRatio = Number.isFinite(shareInput)
          ? clampShareRatio(shareInput / 100, fallback.affiliateShare ?? defaultAffiliateShareRatio)
          : clampShareRatio(fallback.affiliateShare ?? defaultAffiliateShareRatio, defaultAffiliateShareRatio);
        commissionCategoriesPayload[category.key] = {
          rateBps,
          minimumFeeCents: minimumFee,
          affiliateShare: affiliateShareRatio
        };
      }
    );

    const payload = {
      commissions: {
        enabled: Boolean(formState.commissionsEnabled),
        rateBps: commissionRateBps,
        minimumFeeCents: commissionMinimumFeeCents,
        allowCommunityOverride: Boolean(formState.allowOverride),
        default: {
          rateBps: commissionRateBps,
          minimumFeeCents: commissionMinimumFeeCents,
          affiliateShare: defaultAffiliateShareRatio
        },
        categories: commissionCategoriesPayload
      },
      subscriptions: {
        enabled: Boolean(formState.subscriptionsEnabled),
        restrictedFeatures: parseRestrictedFeatures(formState.restrictedFeaturesText),
        gracePeriodDays: Number.isFinite(formState.gracePeriodDays)
          ? Number(formState.gracePeriodDays)
          : DEFAULT_SETTINGS.subscriptions.gracePeriodDays,
        restrictOnFailure: Boolean(formState.restrictOnFailure)
      },
      payments: {
        defaultProvider: formState.defaultProvider,
        stripeEnabled: Boolean(formState.stripeEnabled),
        escrowEnabled: Boolean(formState.escrowEnabled)
      },
      affiliate: {
        enabled: Boolean(formState.affiliateEnabled),
        autoApprove: Boolean(formState.affiliateAutoApprove),
        cookieWindowDays: Number.isFinite(Number(formState.affiliateCookieWindowDays))
          ? Number(formState.affiliateCookieWindowDays)
          : DEFAULT_SETTINGS.affiliate.cookieWindowDays,
        payoutScheduleDays: Number.isFinite(Number(formState.affiliatePayoutScheduleDays))
          ? Number(formState.affiliatePayoutScheduleDays)
          : DEFAULT_SETTINGS.affiliate.payoutScheduleDays,
        requireTaxInformation: Boolean(formState.affiliateRequireTaxInformation),
        defaultCommission: {
          recurrence: affiliateRecurrence,
          maxOccurrences: affiliateMaxOccurrences,
          tiers: uniqueAffiliateTiers
        },
        security: {
          blockSelfReferral: Boolean(formState.affiliateSecurityBlockSelfReferral),
          enforceTwoFactorForPayouts: Boolean(formState.affiliateSecurityTwoFactor)
        }
      },
      workforce: {
        providerControlsCompensation: Boolean(formState.workforceProviderControls),
        minimumServicemanShareBps: minimumShareBps,
        recommendedServicemanShareBps: recommendedShareBps,
        nonCustodialWallets: Boolean(formState.workforceNonCustodialWallets),
        complianceNarrative: workforceNarrative
      }
    };

    try {
      await updateMonetizationSettings({ token, payload });
      setSuccessMessage('Monetization settings saved');
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
    } catch (error) {
      setErrorMessage(error.message ?? 'Failed to update monetization settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormState(buildFormState(settings));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  return (
    <section id={sectionId} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Monetization controls</h2>
          <p className="text-sm text-slate-600">
            Configure the fixed 2.5% platform commission, provider-led workforce payouts, subscription
            entitlements, and payment providers for the marketplace without drifting into FCA
            custodial activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="dashboard-pill"
            disabled={saving}
          >
            Reset changes
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving || !token}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Platform commission</h3>
          <p className="mt-1 text-sm text-slate-600">
            Control how much revenue the platform retains from peer-to-peer transactions. Commission
            amounts are recorded on each payment intent.
          </p>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={formState.commissionsEnabled}
                onChange={handleToggle('commissionsEnabled')}
              />
              Enable commission on transactions
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-600">
                Rate (basis points)
                <input
                  type="number"
                  min="0"
                  max="5000"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none"
                  value={formState.commissionRateBps}
                  onChange={handleNumberChange('commissionRateBps')}
                />
              </label>
              <label className="text-sm text-slate-600">
                Minimum fee (cents)
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none"
                  value={formState.commissionMinimumFeeCents}
                  onChange={handleNumberChange('commissionMinimumFeeCents')}
                />
              </label>
            </div>
            <label className="text-sm text-slate-600">
              Affiliate share of platform commission (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none"
                value={formState.commissionDefaultAffiliateSharePct}
                onChange={handleCommissionDefaultShareChange}
              />
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={formState.allowOverride}
                onChange={handleToggle('allowOverride')}
              />
              Allow communities to override commission rate
            </label>
            <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
              <p className="text-sm font-semibold text-slate-900">Channel-specific commission controls</p>
              <p className="mt-1 text-xs text-slate-500">
                Adjust the retained commission and affiliate revenue share for each monetised product. Rates are
                capped at 10% to keep creator payouts generous.
              </p>
              <div className="mt-4 space-y-3">
                {(Array.isArray(formState.commissionCategories) ? formState.commissionCategories : []).map(
                  (category, index) => {
                    const label = COMMISSION_CATEGORY_LABELS[category.key] ?? category.key;
                    return (
                      <div
                        key={category.key}
                        className="grid gap-3 rounded-xl border border-slate-200 bg-white/90 p-3 sm:grid-cols-4"
                      >
                        <div className="sm:col-span-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {category.key in COMMISSION_CATEGORY_LABELS
                              ? 'Applies automatically on checkout.'
                              : 'Custom monetisation stream.'}
                          </p>
                        </div>
                        <label className="text-xs text-slate-600 sm:col-span-1">
                          Rate (bps)
                          <input
                            type="number"
                            min="0"
                            max="5000"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none"
                            value={category.rateBps}
                            onChange={handleCommissionCategoryNumberChange(index, 'rateBps')}
                          />
                        </label>
                        <label className="text-xs text-slate-600 sm:col-span-1">
                          Minimum fee (¢)
                          <input
                            type="number"
                            min="0"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none"
                            value={category.minimumFeeCents}
                            onChange={handleCommissionCategoryNumberChange(index, 'minimumFeeCents')}
                          />
                        </label>
                        <label className="text-xs text-slate-600 sm:col-span-1">
                          Affiliate share (%)
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none"
                            value={category.affiliateSharePct}
                            onChange={handleCommissionCategoryShareChange(index)}
                          />
                        </label>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Subscription enforcement</h3>
          <p className="mt-1 text-sm text-slate-600">
            Toggle access requirements for premium features. Restricted feature identifiers are matched
            in the client experience to gate functionality.
          </p>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={formState.subscriptionsEnabled}
                onChange={handleToggle('subscriptionsEnabled')}
              />
              Require active subscription for restricted features
            </label>
            <label className="text-sm text-slate-600">
              Restricted feature identifiers
              <textarea
                className="mt-1 h-32 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                placeholder="One feature key per line"
                value={formState.restrictedFeaturesText}
                onChange={handleInputChange('restrictedFeaturesText')}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-600">
                Grace period (days)
                <input
                  type="number"
                  min="0"
                  max="90"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none"
                  value={formState.gracePeriodDays}
                  onChange={handleNumberChange('gracePeriodDays')}
                />
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={formState.restrictOnFailure}
                  onChange={handleToggle('restrictOnFailure')}
                />
                Suspend access when renewal payments fail
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Affiliate programme defaults</h3>
          <p className="mt-1 text-sm text-slate-600">
            Define referral rules and commission tiers applied to new affiliate partners. These controls sync
            instantly across learner and instructor dashboards.
          </p>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={formState.affiliateEnabled}
                onChange={handleToggle('affiliateEnabled')}
              />
              Enable affiliate earnings
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={formState.affiliateAutoApprove}
                onChange={handleToggle('affiliateAutoApprove')}
              />
              Auto-approve trusted affiliates
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-600">
                Commission recurrence
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                  value={formState.affiliateRecurrence}
                  onChange={handleAffiliateRecurrenceChange}
                >
                  {affiliateRecurrenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {formState.affiliateRecurrence === 'finite' ? (
                <label className="text-sm text-slate-600">
                  Max payout cycles
                  <input
                    type="number"
                    min="1"
                    max="120"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                    value={formState.affiliateMaxOccurrences}
                    onChange={handleNumberChange('affiliateMaxOccurrences')}
                  />
                </label>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  {formState.affiliateRecurrence === 'once'
                    ? 'Commission applies only to the first qualifying transaction.'
                    : 'Commission repeats for every qualifying renewal.'}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Commission tiers</p>
                  <p className="text-xs text-slate-500">
                    Rates are matched to transaction thresholds before payout approval.
                  </p>
                </div>
                <button type="button" onClick={handleAddTier} className="dashboard-pill">
                  Add tier
                </button>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Threshold (USD)</th>
                      <th className="px-3 py-2">Commission rate (bps)</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {affiliateTiers.map((tier, index) => (
                      <tr key={`affiliate-tier-${index}`} className="bg-white">
                        <td className="px-3 py-2">
                          {index === 0 ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              Base (0+)
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                              value={tier.thresholdCents}
                              onChange={handleTierNumberChange(index, 'thresholdCents')}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="5000"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                            value={tier.rateBps}
                            onChange={handleTierNumberChange(index, 'rateBps')}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={handleRemoveTier(index)}
                            className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                            disabled={index === 0}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-slate-500">
                <li>• Tier thresholds cascade upward; the base tier always covers 0 and above.</li>
                <li>• Rates are expressed in basis points (100 bps = 1%).</li>
                <li>• Changes apply to new transactions immediately while preserving historical ledgers.</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Service workforce compensation</h3>
          <p className="mt-1 text-sm text-slate-600">
            Providers retain discretion over how much to pay vetted service professionals while the
            platform captures a fixed 2.5% commission and keeps wallets non-custodial.
          </p>
          <div className="mt-4 space-y-4">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={formState.workforceProviderControls}
                onChange={handleToggle('workforceProviderControls')}
              />
              Allow providers to set their own serviceman compensation rates
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-600">
                Minimum serviceman share (basis points)
                <input
                  type="number"
                  min="0"
                  max="10000"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none"
                  value={formState.workforceMinimumShareBps}
                  onChange={handleNumberChange('workforceMinimumShareBps')}
                />
              </label>
              <label className="text-sm text-slate-600">
                Recommended serviceman share (basis points)
                <input
                  type="number"
                  min="0"
                  max="10000"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none"
                  value={formState.workforceRecommendedShareBps}
                  onChange={handleNumberChange('workforceRecommendedShareBps')}
                />
              </label>
            </div>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={formState.workforceNonCustodialWallets}
                onChange={handleToggle('workforceNonCustodialWallets')}
              />
              Keep platform wallets non-custodial (funds settle provider ⇄ serviceman directly)
            </label>
            <label className="text-sm text-slate-600">
              Compliance notes
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                rows={3}
                value={formState.workforceComplianceNarrative}
                onChange={handleInputChange('workforceComplianceNarrative')}
                placeholder="Document guardrails for ledgers, wage transparency, and Apple platform disclosures."
              />
            </label>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary-dark">
              <p className="font-semibold">Apple App Store &amp; FCA-light guardrails</p>
              <p className="mt-1 leading-relaxed">
                Double-entry ledgering with mirrored debit/credit entries and non-custodial settlement
                keeps the platform outside FCA client-money permissions. Apple guidelines permit
                external payments when digital goods are not unlocked inside the iOS app—surface the
                2.5% platform fee transparently and send users to the web checkout when needed.
              </p>
              <p className="mt-1 leading-relaxed">
                Providers remain responsible for honouring wage commitments, local employment rules,
                and communicating serviceman earnings before work is accepted.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Payout guardrails &amp; compliance</h3>
          <p className="mt-1 text-sm text-slate-600">
            Configure eligibility, attribution, and security policies to keep affiliate payouts audit-ready.
          </p>
          <div className="mt-4 space-y-4">
            <label className="text-sm text-slate-600">
              Attribution window (days)
              <input
                type="number"
                min="1"
                max="365"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                value={formState.affiliateCookieWindowDays}
                onChange={handleNumberChange('affiliateCookieWindowDays')}
              />
            </label>
            <label className="text-sm text-slate-600">
              Default payout cadence (days)
              <input
                type="number"
                min="7"
                max="120"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                value={formState.affiliatePayoutScheduleDays}
                onChange={handleNumberChange('affiliatePayoutScheduleDays')}
              />
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={formState.affiliateRequireTaxInformation}
                onChange={handleToggle('affiliateRequireTaxInformation')}
              />
              Require verified tax profile before releasing payouts
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={formState.affiliateSecurityBlockSelfReferral}
                onChange={handleToggle('affiliateSecurityBlockSelfReferral')}
              />
              Block self-referrals and internal purchases
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={formState.affiliateSecurityTwoFactor}
                onChange={handleToggle('affiliateSecurityTwoFactor')}
              />
              Enforce two-factor authentication for payout approvals
            </label>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary-dark">
              <p className="font-semibold">Recommended control</p>
              <p className="mt-1 leading-relaxed">
                Combining tax verification with two-factor approvals prevents fraudulent payout claims and keeps
                compliance auditors satisfied.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-base font-semibold text-slate-900">Payment providers</h3>
        <p className="mt-1 text-sm text-slate-600">
          Choose which providers are active for platform earnings. Providers can be disabled to prevent
          new transactions while keeping historical data intact.
        </p>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={formState.stripeEnabled}
              onChange={handleToggle('stripeEnabled')}
            />
            Enable Stripe card payments
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={formState.escrowEnabled}
              onChange={handleToggle('escrowEnabled')}
            />
            Enable Escrow.com managed transactions
          </label>
          <label className="text-sm text-slate-600">
            Default provider
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
              value={formState.defaultProvider}
              onChange={handleProviderChange}
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

AdminMonetizationSettingsSection.propTypes = {
  sectionId: PropTypes.string,
  settings: PropTypes.shape({
    commissions: PropTypes.object,
    subscriptions: PropTypes.object,
    payments: PropTypes.object,
    affiliate: PropTypes.object,
    workforce: PropTypes.object
  }),
  token: PropTypes.string,
  onSettingsUpdated: PropTypes.func
};

AdminMonetizationSettingsSection.defaultProps = {
  sectionId: 'monetization',
  settings: null,
  token: null,
  onSettingsUpdated: undefined
};
