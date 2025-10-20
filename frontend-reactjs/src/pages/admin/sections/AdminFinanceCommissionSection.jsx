import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { fetchFinanceSettings, updateFinanceSettings } from '../../../api/adminSettingsApi.js';
import { cloneDeep, isDeepEqual } from '../utils.js';

const ADJUSTMENT_STATUS = ['draft', 'scheduled', 'processing', 'processed', 'cancelled'];

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normaliseSettings(settings) {
  if (!settings) {
    return {
      policies: {},
      tiers: [],
      adjustments: [],
      revenueStreams: [],
      approvals: {}
    };
  }
  return {
    policies: settings.policies ? { ...settings.policies } : {},
    tiers: Array.isArray(settings.tiers) ? [...settings.tiers] : [],
    adjustments: Array.isArray(settings.adjustments) ? [...settings.adjustments] : [],
    revenueStreams: Array.isArray(settings.revenueStreams) ? [...settings.revenueStreams] : [],
    approvals: settings.approvals ? { ...settings.approvals } : {}
  };
}

export default function AdminFinanceCommissionSection({ sectionId, token, settings, onSettingsUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState(() => normaliseSettings(settings));
  const [baseline, setBaseline] = useState(() => cloneDeep(normaliseSettings(settings)));
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const hasChanges = useMemo(() => !isDeepEqual(formState, baseline), [formState, baseline]);
  const policies = useMemo(() => formState.policies ?? {}, [formState.policies]);
  const approvals = useMemo(() => formState.approvals ?? {}, [formState.approvals]);

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
    fetchFinanceSettings({ token })
      .then((payload) => {
        if (!active) return;
        applySettings(payload);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error?.message ?? 'Failed to load finance settings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, settings, applySettings]);

  const handlePolicyChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      policies: {
        ...prev.policies,
        [field]: ['invoiceGraceDays', 'payoutScheduleDays', 'defaultCommissionBps', 'minimumCommissionCents'].includes(field)
          ? Number(value ?? 0)
          : value
      }
    }));
  };

  const handleApprovalsChange = (field) => (event) => {
    const value = field === 'requireDualApproval' ? event.target.checked : event.target.value;
    setFormState((prev) => ({
      ...prev,
      approvals: {
        ...prev.approvals,
        [field]: field === 'requireDualApproval' ? Boolean(value) : value
      }
    }));
  };

  const updateCollection = (key, updater) => {
    setFormState((prev) => ({
      ...prev,
      [key]: updater(Array.isArray(prev[key]) ? [...prev[key]] : [])
    }));
  };

  const handleTierChange = (index, field) => (event) => {
    const value = event.target.value;
    updateCollection('tiers', (items) => {
      if (!items[index]) return items;
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: field === 'thresholdCents' || field === 'rateBps' ? Number(value ?? 0) : value
      };
      return next;
    });
  };

  const handleAdjustmentChange = (index, field) => (event) => {
    const value = field === 'amountCents' ? Number(event.target.value ?? 0) : event.target.value;
    updateCollection('adjustments', (items) => {
      if (!items[index]) return items;
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: value
      };
      return next;
    });
  };

  const handleStreamChange = (index, field) => (event) => {
    const value = field === 'active' ? event.target.checked : event.target.value;
    updateCollection('revenueStreams', (items) => {
      if (!items[index]) return items;
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: field === 'shareBps' ? Number(value ?? 0) : field === 'active' ? Boolean(value) : value
      };
      return next;
    });
  };

  const handleRemove = (key, index) => () => {
    updateCollection(key, (items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleAddTier = () => {
    updateCollection('tiers', (items) => [
      ...items,
      {
        id: createId('tier'),
        name: '',
        appliesTo: '',
        thresholdCents: 0,
        rateBps: 250
      }
    ]);
  };

  const handleAddAdjustment = () => {
    updateCollection('adjustments', (items) => [
      ...items,
      {
        id: createId('adjustment'),
        description: '',
        amountCents: 0,
        status: 'draft',
        createdAt: new Date().toISOString().slice(0, 10)
      }
    ]);
  };

  const handleAddStream = () => {
    updateCollection('revenueStreams', (items) => [
      ...items,
      {
        id: createId('stream'),
        name: '',
        shareBps: 250,
        active: true
      }
    ]);
  };

  const handleReset = () => {
    if (!baseline) return;
    setFormState(cloneDeep(baseline));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!token) {
      setErrorMessage('Sign in required to update finance settings.');
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
      policies: {
        billingContact: policies.billingContact ?? '',
        invoiceGraceDays: Number(policies.invoiceGraceDays ?? 7),
        reconciliationCadence: policies.reconciliationCadence ?? 'weekly',
        payoutScheduleDays: Number(policies.payoutScheduleDays ?? 30),
        defaultCommissionBps: Number(policies.defaultCommissionBps ?? 250),
        minimumCommissionCents: Number(policies.minimumCommissionCents ?? 0),
        currency: policies.currency ?? 'USD'
      },
      tiers: formState.tiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        appliesTo: Array.isArray(tier.appliesTo)
          ? tier.appliesTo
          : String(tier.appliesTo ?? '')
              .split(',')
              .map((entry) => entry.trim())
              .filter(Boolean),
        thresholdCents: Number(tier.thresholdCents ?? 0),
        rateBps: Number(tier.rateBps ?? 0)
      })),
      adjustments: formState.adjustments.map((adjustment) => ({
        id: adjustment.id,
        description: adjustment.description,
        amountCents: Number(adjustment.amountCents ?? 0),
        status: adjustment.status,
        createdAt: adjustment.createdAt
      })),
      revenueStreams: formState.revenueStreams.map((stream) => ({
        id: stream.id,
        name: stream.name,
        shareBps: Number(stream.shareBps ?? 0),
        active: Boolean(stream.active)
      })),
      approvals: {
        requireDualApproval: Boolean(approvals.requireDualApproval),
        financeReviewer: approvals.financeReviewer ?? ''
      }
    };

    try {
      const updated = await updateFinanceSettings({ token, payload });
      applySettings(updated);
      setSuccessMessage('Finance & commission settings saved successfully.');
      if (onSettingsUpdated) {
        onSettingsUpdated(updated);
      }
    } catch (error) {
      setErrorMessage(error?.message ?? 'Unable to update finance settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Finance & commissions</h3>
          <p className="mt-1 text-sm text-slate-600">
            Govern commission policies, revenue streams, and adjustment workflows powering the monetisation engine.
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
            {saving ? 'Saving…' : hasChanges ? 'Save finance settings' : 'Saved'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-primary" aria-hidden="true" />
          <span>Loading finance configuration…</span>
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
          <h4 className="text-base font-semibold text-slate-900">Commission policies</h4>
          <div className="mt-4 space-y-4 text-sm">
            <label className="block text-xs text-slate-500">
              Billing contact
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={policies.billingContact ?? ''}
                onChange={handlePolicyChange('billingContact')}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-slate-500">
                Invoice grace days
                <input
                  type="number"
                  min={0}
                  max={60}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={policies.invoiceGraceDays ?? 7}
                  onChange={handlePolicyChange('invoiceGraceDays')}
                />
              </label>
              <label className="block text-xs text-slate-500">
                Payout schedule (days)
                <input
                  type="number"
                  min={7}
                  max={120}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={policies.payoutScheduleDays ?? 30}
                  onChange={handlePolicyChange('payoutScheduleDays')}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-xs text-slate-500">
                Default commission (bps)
                <input
                  type="number"
                  min={0}
                  max={5000}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={policies.defaultCommissionBps ?? 250}
                  onChange={handlePolicyChange('defaultCommissionBps')}
                />
              </label>
              <label className="block text-xs text-slate-500">
                Minimum commission (cents)
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={policies.minimumCommissionCents ?? 0}
                  onChange={handlePolicyChange('minimumCommissionCents')}
                />
              </label>
              <label className="block text-xs text-slate-500">
                Currency
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 uppercase"
                  value={policies.currency ?? 'USD'}
                  onChange={handlePolicyChange('currency')}
                />
              </label>
            </div>
            <label className="block text-xs text-slate-500">
              Reconciliation cadence
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={policies.reconciliationCadence ?? 'weekly'}
                onChange={handlePolicyChange('reconciliationCadence')}
              />
            </label>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Commission tiers</h4>
            <button
              type="button"
              onClick={handleAddTier}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Add tier
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {formState.tiers.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No commission tiers defined.
              </p>
            ) : (
              formState.tiers.map((tier, index) => (
                <div key={tier.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Tier #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemove('tiers', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Tier name"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={tier.name ?? ''}
                    onChange={handleTierChange(index, 'name')}
                  />
                  <input
                    type="text"
                    placeholder="Applies to (comma separated)"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={Array.isArray(tier.appliesTo) ? tier.appliesTo.join(', ') : tier.appliesTo ?? ''}
                    onChange={handleTierChange(index, 'appliesTo')}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs text-slate-500">
                      Threshold (cents)
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        value={tier.thresholdCents ?? 0}
                        onChange={handleTierChange(index, 'thresholdCents')}
                      />
                    </label>
                    <label className="block text-xs text-slate-500">
                      Rate (bps)
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        value={tier.rateBps ?? 0}
                        onChange={handleTierChange(index, 'rateBps')}
                      />
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Revenue streams</h4>
            <button
              type="button"
              onClick={handleAddStream}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Add stream
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {formState.revenueStreams.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No revenue streams configured.
              </p>
            ) : (
              formState.revenueStreams.map((stream, index) => (
                <div key={stream.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Stream #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemove('revenueStreams', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Name"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={stream.name ?? ''}
                    onChange={handleStreamChange(index, 'name')}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs text-slate-500">
                      Share (bps)
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        value={stream.shareBps ?? 0}
                        onChange={handleStreamChange(index, 'shareBps')}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary"
                        checked={Boolean(stream.active)}
                        onChange={handleStreamChange(index, 'active')}
                      />
                      Active
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Finance adjustments</h4>
            <button
              type="button"
              onClick={handleAddAdjustment}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Add adjustment
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {formState.adjustments.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No adjustments logged.
              </p>
            ) : (
              formState.adjustments.map((adjustment, index) => (
                <div key={adjustment.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Adjustment #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemove('adjustments', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    placeholder="Description"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    rows={2}
                    value={adjustment.description ?? ''}
                    onChange={handleAdjustmentChange(index, 'description')}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="block text-xs text-slate-500">
                      Amount (cents)
                      <input
                        type="number"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        value={adjustment.amountCents ?? 0}
                        onChange={handleAdjustmentChange(index, 'amountCents')}
                      />
                    </label>
                    <label className="block text-xs text-slate-500">
                      Status
                      <select
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        value={adjustment.status ?? 'draft'}
                        onChange={handleAdjustmentChange(index, 'status')}
                      >
                        {ADJUSTMENT_STATUS.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs text-slate-500">
                      Created at
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                        value={adjustment.createdAt ?? ''}
                        onChange={handleAdjustmentChange(index, 'createdAt')}
                      />
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-base font-semibold text-slate-900">Approvals & oversight</h4>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary"
              checked={Boolean(approvals.requireDualApproval)}
              onChange={handleApprovalsChange('requireDualApproval')}
            />
            Dual approval required for manual payouts
          </label>
          <label className="block text-xs text-slate-500">
            Finance reviewer email
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={approvals.financeReviewer ?? ''}
              onChange={handleApprovalsChange('financeReviewer')}
            />
          </label>
        </div>
      </div>
    </section>
  );
}

AdminFinanceCommissionSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string,
  settings: PropTypes.shape({
    policies: PropTypes.object,
    tiers: PropTypes.array,
    adjustments: PropTypes.array,
    revenueStreams: PropTypes.array,
    approvals: PropTypes.object
  }),
  onSettingsUpdated: PropTypes.func
};

AdminFinanceCommissionSection.defaultProps = {
  sectionId: 'finance-settings',
  token: null,
  settings: null,
  onSettingsUpdated: undefined
};
