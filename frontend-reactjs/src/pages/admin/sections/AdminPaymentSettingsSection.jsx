import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { fetchPaymentSettings, updatePaymentSettings } from '../../../api/adminSettingsApi.js';
import { cloneDeep, isDeepEqual } from '../utils.js';

const SCHEDULE_OPTIONS = ['daily', 'weekly', 'biweekly', 'monthly', 'adhoc'];
const WEEKDAY_OPTIONS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const STATUS_OPTIONS = ['active', 'paused', 'error', 'testing'];

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normaliseSettings(settings) {
  if (!settings) {
    return {
      processors: [],
      payoutRules: {},
      bankAccounts: [],
      webhooks: []
    };
  }
  return {
    processors: Array.isArray(settings.processors) ? [...settings.processors] : [],
    payoutRules: settings.payoutRules ? { ...settings.payoutRules } : {},
    bankAccounts: Array.isArray(settings.bankAccounts) ? [...settings.bankAccounts] : [],
    webhooks: Array.isArray(settings.webhooks) ? [...settings.webhooks] : []
  };
}

export default function AdminPaymentSettingsSection({ sectionId, token, settings, onSettingsUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState(() => normaliseSettings(settings));
  const [baseline, setBaseline] = useState(() => cloneDeep(normaliseSettings(settings)));
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const hasChanges = useMemo(() => !isDeepEqual(formState, baseline), [formState, baseline]);
  const payoutRules = useMemo(() => formState.payoutRules ?? {}, [formState.payoutRules]);

  const applySettings = useCallback((payload) => {
    const next = normaliseSettings(payload);
    setFormState(next);
    setBaseline(cloneDeep(next));
  }, []);

  useEffect(() => {
    if (!token) return;
    if (settings) {
      applySettings(settings);
      return;
    }
    let active = true;
    setLoading(true);
    fetchPaymentSettings({ token })
      .then((payload) => {
        if (!active) return;
        applySettings(payload);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error?.message ?? 'Failed to load payment settings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, settings, applySettings]);

  const updateCollection = (key, updater) => {
    setFormState((prev) => ({
      ...prev,
      [key]: updater(Array.isArray(prev[key]) ? [...prev[key]] : [])
    }));
  };

  const handleProcessorChange = (index, field) => (event) => {
    const value = event.target.value;
    updateCollection('processors', (items) => {
      if (!items[index]) return items;
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: field === 'capabilities' || field === 'currencies'
          ? value.split(',').map((entry) => entry.trim()).filter(Boolean)
          : value
      };
      return next;
    });
  };

  const handleBankAccountChange = (index, field) => (event) => {
    const value = field === 'primary' ? event.target.checked : event.target.value;
    updateCollection('bankAccounts', (items) => {
      if (!items[index]) return items;
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: field === 'primary' ? Boolean(value) : value
      };
      if (field === 'primary' && value) {
        return next.map((account, accountIndex) => ({ ...account, primary: accountIndex === index }));
      }
      return next;
    });
  };

  const handleWebhookChange = (index, field) => (event) => {
    const value = field === 'active' ? event.target.checked : event.target.value;
    updateCollection('webhooks', (items) => {
      if (!items[index]) return items;
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: value
      };
      return next;
    });
  };

  const handleAddProcessor = () => {
    updateCollection('processors', (items) => [
      ...items,
      {
        id: createId('processor'),
        provider: '',
        status: 'active',
        merchantId: '',
        capabilities: [],
        settlementTimeframe: 'T+2',
        currencies: ['USD'],
        supportContact: ''
      }
    ]);
  };

  const handleAddBankAccount = () => {
    updateCollection('bankAccounts', (items) => [
      ...items,
      {
        id: createId('bank'),
        name: '',
        bankName: '',
        last4: '',
        currency: 'USD',
        primary: items.length === 0
      }
    ]);
  };

  const handleAddWebhook = () => {
    updateCollection('webhooks', (items) => [
      ...items,
      {
        id: createId('webhook'),
        event: 'payment.succeeded',
        url: '',
        active: true
      }
    ]);
  };

  const handleRemove = (key, index) => () => {
    updateCollection(key, (items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const handlePayoutChange = (field) => (event) => {
    const value = field === 'autoApproveRefunds' ? event.target.checked : event.target.value;
    setFormState((prev) => ({
      ...prev,
      payoutRules: {
        ...prev.payoutRules,
        [field]: field === 'minimumPayoutCents' || field === 'reservePercentage'
          ? Number(value ?? 0)
          : value
      }
    }));
  };

  const handleReset = () => {
    if (!baseline) return;
    setFormState(cloneDeep(baseline));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!token) {
      setErrorMessage('Sign in required to update payment settings.');
      return;
    }

    if (!hasChanges) {
      setSuccessMessage('No changes detected.');
      return;
    }

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    const payload = {
      processors: formState.processors.map((processor) => ({
        id: processor.id,
        provider: processor.provider,
        status: processor.status,
        merchantId: processor.merchantId,
        capabilities: Array.isArray(processor.capabilities)
          ? processor.capabilities
          : String(processor.capabilities ?? '')
              .split(',')
              .map((entry) => entry.trim())
              .filter(Boolean),
        settlementTimeframe: processor.settlementTimeframe,
        currencies: Array.isArray(processor.currencies)
          ? processor.currencies
          : String(processor.currencies ?? '')
              .split(',')
              .map((entry) => entry.trim())
              .filter(Boolean),
        supportContact: processor.supportContact
      })),
      payoutRules: {
        schedule: payoutRules.schedule ?? 'weekly',
        dayOfWeek: payoutRules.dayOfWeek ?? 'friday',
        minimumPayoutCents: Number(payoutRules.minimumPayoutCents ?? 0),
        reservePercentage: Number(payoutRules.reservePercentage ?? 0),
        autoApproveRefunds: Boolean(payoutRules.autoApproveRefunds),
        riskThreshold: payoutRules.riskThreshold ?? ''
      },
      bankAccounts: formState.bankAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        bankName: account.bankName,
        last4: account.last4,
        currency: account.currency,
        primary: Boolean(account.primary)
      })),
      webhooks: formState.webhooks.map((webhook) => ({
        id: webhook.id,
        event: webhook.event,
        url: webhook.url,
        active: Boolean(webhook.active)
      }))
    };

    try {
      const updated = await updatePaymentSettings({ token, payload });
      applySettings(updated);
      setSuccessMessage('Payment settings updated successfully.');
      if (onSettingsUpdated) {
        onSettingsUpdated(updated);
      }
    } catch (error) {
      setErrorMessage(error?.message ?? 'Unable to update payment settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Payment operations</h3>
          <p className="mt-1 text-sm text-slate-600">
            Configure processors, payout cadences, and settlement destinations to keep finance workflows auditable.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {loading ? 'Loading…' : hasChanges ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges || saving || loading}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving || loading}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : hasChanges ? 'Save payment settings' : 'Saved'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-primary" aria-hidden="true" />
          <span>Loading payment configuration…</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
      ) : null}
      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Payment processors</h4>
            <button
              type="button"
              onClick={handleAddProcessor}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Add processor
            </button>
          </div>
          <div className="mt-4 space-y-4 text-sm">
            {formState.processors.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No payment processors configured.
              </p>
            ) : (
              formState.processors.map((processor, index) => (
                <div key={processor.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Processor #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemove('processors', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Provider"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={processor.provider ?? ''}
                      onChange={handleProcessorChange(index, 'provider')}
                    />
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={processor.status ?? 'active'}
                      onChange={handleProcessorChange(index, 'status')}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Merchant ID"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={processor.merchantId ?? ''}
                    onChange={handleProcessorChange(index, 'merchantId')}
                  />
                  <input
                    type="text"
                    placeholder="Capabilities (comma separated)"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={Array.isArray(processor.capabilities) ? processor.capabilities.join(', ') : processor.capabilities ?? ''}
                    onChange={handleProcessorChange(index, 'capabilities')}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Settlement timeframe"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={processor.settlementTimeframe ?? ''}
                      onChange={handleProcessorChange(index, 'settlementTimeframe')}
                    />
                    <input
                      type="text"
                      placeholder="Currencies (comma separated)"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={Array.isArray(processor.currencies) ? processor.currencies.join(', ') : processor.currencies ?? ''}
                      onChange={handleProcessorChange(index, 'currencies')}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Finance contact"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={processor.supportContact ?? ''}
                    onChange={handleProcessorChange(index, 'supportContact')}
                  />
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-base font-semibold text-slate-900">Payout rules</h4>
          <div className="mt-4 space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-slate-500">
                Schedule
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={payoutRules.schedule ?? 'weekly'}
                  onChange={handlePayoutChange('schedule')}
                >
                  {SCHEDULE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-slate-500">
                Settlement day
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={payoutRules.dayOfWeek ?? 'friday'}
                  onChange={handlePayoutChange('dayOfWeek')}
                >
                  {WEEKDAY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-slate-500">
                Minimum payout (cents)
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={payoutRules.minimumPayoutCents ?? 0}
                  onChange={handlePayoutChange('minimumPayoutCents')}
                />
              </label>
              <label className="block text-xs text-slate-500">
                Operating reserve (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={payoutRules.reservePercentage ?? 0}
                  onChange={handlePayoutChange('reservePercentage')}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary"
                checked={Boolean(payoutRules.autoApproveRefunds)}
                onChange={handlePayoutChange('autoApproveRefunds')}
              />
              Auto-approve refund requests under risk thresholds
            </label>
            <label className="block text-xs text-slate-500">
              Risk threshold narrative
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={payoutRules.riskThreshold ?? ''}
                onChange={handlePayoutChange('riskThreshold')}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Settlement accounts</h4>
            <button
              type="button"
              onClick={handleAddBankAccount}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Add account
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {formState.bankAccounts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No settlement accounts configured.
              </p>
            ) : (
              formState.bankAccounts.map((account, index) => (
                <div key={account.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Account #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemove('bankAccounts', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Account name"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={account.name ?? ''}
                    onChange={handleBankAccountChange(index, 'name')}
                  />
                  <input
                    type="text"
                    placeholder="Bank name"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={account.bankName ?? ''}
                    onChange={handleBankAccountChange(index, 'bankName')}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Last 4"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={account.last4 ?? ''}
                      onChange={handleBankAccountChange(index, 'last4')}
                    />
                    <input
                      type="text"
                      placeholder="Currency"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={account.currency ?? 'USD'}
                      onChange={handleBankAccountChange(index, 'currency')}
                    />
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-primary"
                      checked={Boolean(account.primary)}
                      onChange={handleBankAccountChange(index, 'primary')}
                    />
                    Primary settlement destination
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Payment webhooks</h4>
            <button
              type="button"
              onClick={handleAddWebhook}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Add webhook
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {formState.webhooks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No webhook destinations configured.
              </p>
            ) : (
              formState.webhooks.map((webhook, index) => (
                <div key={webhook.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Webhook #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemove('webhooks', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Event"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={webhook.event ?? ''}
                    onChange={handleWebhookChange(index, 'event')}
                  />
                  <input
                    type="url"
                    placeholder="Destination URL"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={webhook.url ?? ''}
                    onChange={handleWebhookChange(index, 'url')}
                  />
                  <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-primary"
                      checked={Boolean(webhook.active)}
                      onChange={handleWebhookChange(index, 'active')}
                    />
                    Webhook active
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

AdminPaymentSettingsSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string,
  settings: PropTypes.shape({
    processors: PropTypes.array,
    payoutRules: PropTypes.object,
    bankAccounts: PropTypes.array,
    webhooks: PropTypes.array
  }),
  onSettingsUpdated: PropTypes.func
};

AdminPaymentSettingsSection.defaultProps = {
  sectionId: 'payment-settings',
  token: null,
  settings: null,
  onSettingsUpdated: undefined
};
