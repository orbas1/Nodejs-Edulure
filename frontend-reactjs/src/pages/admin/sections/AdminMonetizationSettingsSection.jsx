import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { updateMonetizationSettings } from '../../../api/adminApi.js';

const DEFAULT_SETTINGS = Object.freeze({
  commissions: {
    enabled: true,
    rateBps: 1500,
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
  }
});

function normaliseSettings(settings) {
  if (!settings) {
    return DEFAULT_SETTINGS;
  }

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
    escrowEnabled: monetization.payments.escrowEnabled
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

  const handleSave = async () => {
    if (!token) {
      setErrorMessage('You must be signed in to update monetization settings.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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
            Configure platform commissions, subscription entitlements, and payment providers for the
            marketplace.
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
    payments: PropTypes.object
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
