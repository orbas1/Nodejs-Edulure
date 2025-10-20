import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { fetchSecuritySettings, updateSecuritySettings } from '../../../api/adminSettingsApi.js';
import { cloneDeep, isDeepEqual } from '../utils.js';

const METHOD_OPTIONS = ['totp', 'sms', 'webauthn', 'email'];

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normaliseSettings(settings) {
  if (!settings) {
    return {
      enforcement: {},
      methods: [],
      backup: {},
      audits: []
    };
  }
  return {
    enforcement: settings.enforcement ? { ...settings.enforcement } : {},
    methods: Array.isArray(settings.methods) ? [...settings.methods] : [],
    backup: settings.backup ? { ...settings.backup } : {},
    audits: Array.isArray(settings.audits) ? [...settings.audits] : []
  };
}

export default function AdminSecuritySettingsSection({ sectionId, token, settings, onSettingsUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState(() => normaliseSettings(settings));
  const [baseline, setBaseline] = useState(() => cloneDeep(normaliseSettings(settings)));
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const hasChanges = useMemo(() => !isDeepEqual(formState, baseline), [formState, baseline]);
  const enforcement = useMemo(() => formState.enforcement ?? {}, [formState.enforcement]);
  const backup = useMemo(() => formState.backup ?? {}, [formState.backup]);

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
    fetchSecuritySettings({ token })
      .then((payload) => {
        if (!active) return;
        applySettings(payload);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error?.message ?? 'Failed to load security settings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, settings, applySettings]);

  const handleEnforcementToggle = (field) => (event) => {
    const value = field.includes('required') ? event.target.checked : event.target.value;
    setFormState((prev) => ({
      ...prev,
      enforcement: {
        ...prev.enforcement,
        [field]: field.includes('required') ? Boolean(value) : Number(value ?? 0)
      }
    }));
  };

  const handleBackupToggle = (field) => (event) => {
    const checked = event.target.checked;
    setFormState((prev) => ({
      ...prev,
      backup: {
        ...prev.backup,
        [field]: checked
      }
    }));
  };

  const updateCollection = (key, updater) => {
    setFormState((prev) => ({
      ...prev,
      [key]: updater(Array.isArray(prev[key]) ? [...prev[key]] : [])
    }));
  };

  const handleAddMethod = () => {
    updateCollection('methods', (items) => [
      ...items,
      {
        id: createId('method'),
        type: 'totp',
        enabled: true,
        description: 'Authenticator apps enforced for admins'
      }
    ]);
  };

  const handleAddAudit = () => {
    updateCollection('audits', (items) => [
      ...items,
      {
        id: createId('audit'),
        label: 'Quarterly access review',
        completedAt: new Date().toISOString().slice(0, 10)
      }
    ]);
  };

  const handleMethodChange = (index, field) => (event) => {
    const value = field === 'enabled' ? event.target.checked : event.target.value;
    updateCollection('methods', (items) => {
      if (!items[index]) return items;
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: field === 'enabled' ? Boolean(value) : value
      };
      return next;
    });
  };

  const handleAuditChange = (index, field) => (event) => {
    const value = event.target.value;
    updateCollection('audits', (items) => {
      if (!items[index]) return items;
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: value
      };
      return next;
    });
  };

  const handleRemove = (key, index) => () => {
    updateCollection(key, (items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleReset = () => {
    if (!baseline) return;
    setFormState(cloneDeep(baseline));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!token) {
      setErrorMessage('Sign in required to update security settings.');
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
      enforcement: {
        requiredForAdmins: Boolean(enforcement.requiredForAdmins),
        requiredForInstructors: Boolean(enforcement.requiredForInstructors),
        requiredForFinance: Boolean(enforcement.requiredForFinance),
        rememberDeviceDays: Number(enforcement.rememberDeviceDays ?? 0),
        sessionTimeoutMinutes: Number(enforcement.sessionTimeoutMinutes ?? 30)
      },
      methods: formState.methods.map((method) => ({
        id: method.id,
        type: method.type,
        enabled: Boolean(method.enabled),
        description: method.description
      })),
      backup: {
        backupCodesEnabled: Boolean(backup.backupCodesEnabled),
        requireRegenerationOnUse: Boolean(backup.requireRegenerationOnUse)
      },
      audits: formState.audits.map((audit) => ({
        id: audit.id,
        label: audit.label,
        completedAt: audit.completedAt
      }))
    };

    try {
      const updated = await updateSecuritySettings({ token, payload });
      applySettings(updated);
      setSuccessMessage('Security settings saved successfully.');
      if (onSettingsUpdated) {
        onSettingsUpdated(updated);
      }
    } catch (error) {
      setErrorMessage(error?.message ?? 'Unable to update security settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Two-factor & access control</h3>
          <p className="mt-1 text-sm text-slate-600">
            Enforce MFA across administrative cohorts and maintain an auditable history of access reviews.
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
            {saving ? 'Saving…' : hasChanges ? 'Save security settings' : 'Saved'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-primary" aria-hidden="true" />
          <span>Loading security posture…</span>
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
          <h4 className="text-base font-semibold text-slate-900">Enforcement policy</h4>
          <div className="mt-4 space-y-4 text-sm">
            {[
              ['requiredForAdmins', 'Require MFA for all administrators'],
              ['requiredForInstructors', 'Require MFA for instructors with elevated privileges'],
              ['requiredForFinance', 'Require MFA for finance controllers']
            ].map(([field, label]) => (
              <label key={field} className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary"
                  checked={Boolean(enforcement[field])}
                  onChange={handleEnforcementToggle(field)}
                />
                {label}
              </label>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-slate-500">
                Remember device (days)
                <input
                  type="number"
                  min={0}
                  max={90}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={enforcement.rememberDeviceDays ?? 30}
                  onChange={handleEnforcementToggle('rememberDeviceDays')}
                />
              </label>
              <label className="block text-xs text-slate-500">
                Session timeout (minutes)
                <input
                  type="number"
                  min={5}
                  max={600}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={enforcement.sessionTimeoutMinutes ?? 30}
                  onChange={handleEnforcementToggle('sessionTimeoutMinutes')}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">MFA methods</h4>
            <button
              type="button"
              onClick={handleAddMethod}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Add method
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {formState.methods.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No multifactor methods configured yet.
              </p>
            ) : (
              formState.methods.map((method, index) => (
                <div key={method.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Method #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemove('methods', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={method.type ?? 'totp'}
                      onChange={handleMethodChange(index, 'type')}
                    >
                      {METHOD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary"
                        checked={Boolean(method.enabled)}
                        onChange={handleMethodChange(index, 'enabled')}
                      />
                      Enabled
                    </label>
                  </div>
                  <textarea
                    placeholder="Description"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    rows={2}
                    value={method.description ?? ''}
                    onChange={handleMethodChange(index, 'description')}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-base font-semibold text-slate-900">Backup policy</h4>
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary"
                checked={Boolean(backup.backupCodesEnabled)}
                onChange={handleBackupToggle('backupCodesEnabled')}
              />
              Enable backup codes for emergency access
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary"
                checked={Boolean(backup.requireRegenerationOnUse)}
                onChange={handleBackupToggle('requireRegenerationOnUse')}
              />
              Require regeneration when codes are used
            </label>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Access audits</h4>
            <button
              type="button"
              onClick={handleAddAudit}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Log audit
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {formState.audits.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No access reviews recorded yet.
              </p>
            ) : (
              formState.audits.map((audit, index) => (
                <div key={audit.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Audit #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemove('audits', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Label"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={audit.label ?? ''}
                    onChange={handleAuditChange(index, 'label')}
                  />
                  <input
                    type="text"
                    placeholder="Completed at"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={audit.completedAt ?? ''}
                    onChange={handleAuditChange(index, 'completedAt')}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

AdminSecuritySettingsSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string,
  settings: PropTypes.shape({
    enforcement: PropTypes.object,
    methods: PropTypes.array,
    backup: PropTypes.object,
    audits: PropTypes.array
  }),
  onSettingsUpdated: PropTypes.func
};

AdminSecuritySettingsSection.defaultProps = {
  sectionId: 'security-settings',
  token: null,
  settings: null,
  onSettingsUpdated: undefined
};
