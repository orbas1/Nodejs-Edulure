import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { updateMonetizationSettings } from '../../../api/adminApi.js';

const DEFAULT_SETTINGS = Object.freeze({
  commissions: {
    enabled: true,
    rateBps: 250,
    minimumFeeCents: 0,
    allowCommunityOverride: true
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
      'Commission is fixed at 2.5% for the platform. Providers decide service professional rates while the ledger operates on a non-custodial basis.'
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

  return {
    commissions: {
      enabled: Boolean(settings.commissions?.enabled ?? DEFAULT_SETTINGS.commissions.enabled),
      rateBps: Number(settings.commissions?.rateBps ?? DEFAULT_SETTINGS.commissions.rateBps),
      minimumFeeCents: Number(
        settings.commissions?.minimumFeeCents ?? DEFAULT_SETTINGS.commissions.minimumFeeCents
      ),
      allowCommunityOverride: Boolean(
        settings.commissions?.allowCommunityOverride ?? DEFAULT_SETTINGS.commissions.allowCommunityOverride
      )
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

    const payload = {
      commissions: {
        enabled: Boolean(formState.commissionsEnabled),
        rateBps: Number.isFinite(formState.commissionRateBps)
          ? Number(formState.commissionRateBps)
          : DEFAULT_SETTINGS.commissions.rateBps,
        minimumFeeCents: Number.isFinite(formState.commissionMinimumFeeCents)
          ? Number(formState.commissionMinimumFeeCents)
          : DEFAULT_SETTINGS.commissions.minimumFeeCents,
        allowCommunityOverride: Boolean(formState.allowOverride)
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
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={formState.allowOverride}
                onChange={handleToggle('allowOverride')}
              />
              Allow communities to override commission rate
            </label>
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
