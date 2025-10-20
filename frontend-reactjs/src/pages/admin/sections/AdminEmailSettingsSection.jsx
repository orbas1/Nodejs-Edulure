import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { fetchEmailSettings, updateEmailSettings } from '../../../api/adminSettingsApi.js';
import { cloneDeep, isDeepEqual } from '../utils.js';

const DOMAIN_STATUS = ['verified', 'pending', 'failed'];
const DNS_STATUS = ['valid', 'pending', 'failed'];

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normaliseSettings(settings) {
  if (!settings) {
    return {
      branding: {},
      notifications: {},
      escalationRecipients: [],
      domains: [],
      templates: []
    };
  }
  return {
    branding: settings.branding ? { ...settings.branding } : {},
    notifications: settings.notifications ? { ...settings.notifications } : {},
    escalationRecipients: Array.isArray(settings.escalationRecipients)
      ? [...settings.escalationRecipients]
      : settings.escalationRecipients
        ? String(settings.escalationRecipients).split(',').map((entry) => entry.trim()).filter(Boolean)
        : [],
    domains: Array.isArray(settings.domains) ? [...settings.domains] : [],
    templates: Array.isArray(settings.templates) ? [...settings.templates] : []
  };
}

export default function AdminEmailSettingsSection({ sectionId, token, settings, onSettingsUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState(() => normaliseSettings(settings));
  const [baseline, setBaseline] = useState(() => cloneDeep(normaliseSettings(settings)));
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const hasChanges = useMemo(() => !isDeepEqual(formState, baseline), [formState, baseline]);
  const branding = useMemo(() => formState.branding ?? {}, [formState.branding]);
  const notifications = useMemo(() => formState.notifications ?? {}, [formState.notifications]);

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
    fetchEmailSettings({ token })
      .then((payload) => {
        if (!active) return;
        applySettings(payload);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error?.message ?? 'Failed to load email settings');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, settings, applySettings]);

  const handleBrandingChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        [field]: value
      }
    }));
  };

  const handleNotificationToggle = (field) => (event) => {
    const checked = event.target.checked;
    setFormState((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: checked
      }
    }));
  };

  const handleEscalationChange = (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      escalationRecipients: value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    }));
  };

  const updateCollection = (key, updater) => {
    setFormState((prev) => ({
      ...prev,
      [key]: updater(Array.isArray(prev[key]) ? [...prev[key]] : [])
    }));
  };

  const handleAddDomain = () => {
    updateCollection('domains', (items) => [
      ...items,
      {
        id: createId('domain'),
        domain: '',
        status: 'pending',
        dkimStatus: 'pending',
        spfStatus: 'pending'
      }
    ]);
  };

  const handleAddTemplate = () => {
    updateCollection('templates', (items) => [
      ...items,
      {
        id: createId('template'),
        name: '',
        category: 'operations',
        subject: '',
        lastUpdated: ''
      }
    ]);
  };

  const handleDomainChange = (index, field) => (event) => {
    const value = event.target.value;
    updateCollection('domains', (items) => {
      if (!items[index]) return items;
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: value
      };
      return next;
    });
  };

  const handleTemplateChange = (index, field) => (event) => {
    const value = event.target.value;
    updateCollection('templates', (items) => {
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
      setErrorMessage('Sign in required to update email settings.');
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
      branding: {
        fromName: branding.fromName ?? '',
        fromEmail: branding.fromEmail ?? '',
        replyTo: branding.replyTo ?? ''
      },
      notifications: {
        onboarding: Boolean(notifications.onboarding),
        weeklyDigest: Boolean(notifications.weeklyDigest),
        incidentAlerts: Boolean(notifications.incidentAlerts),
        marketingOptInDefault: Boolean(notifications.marketingOptInDefault)
      },
      escalationRecipients: formState.escalationRecipients.join(', '),
      domains: formState.domains.map((domain) => ({
        id: domain.id,
        domain: domain.domain,
        status: domain.status,
        dkimStatus: domain.dkimStatus,
        spfStatus: domain.spfStatus
      })),
      templates: formState.templates.map((template) => ({
        id: template.id,
        name: template.name,
        category: template.category,
        subject: template.subject,
        lastUpdated: template.lastUpdated
      }))
    };

    try {
      const updated = await updateEmailSettings({ token, payload });
      applySettings(updated);
      setSuccessMessage('Email settings saved successfully.');
      if (onSettingsUpdated) {
        onSettingsUpdated(updated);
      }
    } catch (error) {
      setErrorMessage(error?.message ?? 'Unable to update email settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Email and communications</h3>
          <p className="mt-1 text-sm text-slate-600">
            Manage outbound branding, notification defaults, and template governance for operations messaging.
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
            {saving ? 'Saving…' : hasChanges ? 'Save email settings' : 'Saved'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-primary" aria-hidden="true" />
          <span>Loading communication preferences…</span>
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
          <h4 className="text-base font-semibold text-slate-900">Branding</h4>
          <div className="mt-4 space-y-4 text-sm">
            <label className="block text-xs text-slate-500">
              From name
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={branding.fromName ?? ''}
                onChange={handleBrandingChange('fromName')}
              />
            </label>
            <label className="block text-xs text-slate-500">
              From email
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={branding.fromEmail ?? ''}
                onChange={handleBrandingChange('fromEmail')}
              />
            </label>
            <label className="block text-xs text-slate-500">
              Reply-to
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={branding.replyTo ?? ''}
                onChange={handleBrandingChange('replyTo')}
              />
            </label>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-base font-semibold text-slate-900">Notification defaults</h4>
          <div className="mt-4 space-y-3 text-sm">
            {[
              ['onboarding', 'Send onboarding campaigns to new administrators'],
              ['weeklyDigest', 'Send weekly digest to stakeholders'],
              ['incidentAlerts', 'Send high severity incident alerts'],
              ['marketingOptInDefault', 'Opt-in new users to marketing announcements']
            ].map(([field, label]) => (
              <label key={field} className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary"
                  checked={Boolean(notifications[field])}
                  onChange={handleNotificationToggle(field)}
                />
                {label}
              </label>
            ))}
            <label className="block text-xs text-slate-500">
              Escalation recipients (comma separated)
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={formState.escalationRecipients.join(', ')}
                onChange={handleEscalationChange}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Sending domains</h4>
            <button
              type="button"
              onClick={handleAddDomain}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Add domain
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {formState.domains.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No domains connected yet.
              </p>
            ) : (
              formState.domains.map((domain, index) => (
                <div key={domain.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Domain #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemove('domains', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Domain"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={domain.domain ?? ''}
                    onChange={handleDomainChange(index, 'domain')}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={domain.status ?? 'pending'}
                      onChange={handleDomainChange(index, 'status')}
                    >
                      {DOMAIN_STATUS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={domain.dkimStatus ?? 'pending'}
                      onChange={handleDomainChange(index, 'dkimStatus')}
                    >
                      {DNS_STATUS.map((option) => (
                        <option key={option} value={option}>
                          DKIM {option}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={domain.spfStatus ?? 'pending'}
                      onChange={handleDomainChange(index, 'spfStatus')}
                    >
                      {DNS_STATUS.map((option) => (
                        <option key={option} value={option}>
                          SPF {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Email templates</h4>
            <button
              type="button"
              onClick={handleAddTemplate}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Add template
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {formState.templates.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No templates configured for automated operations emails.
              </p>
            ) : (
              formState.templates.map((template, index) => (
                <div key={template.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Template #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemove('templates', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Template name"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={template.name ?? ''}
                    onChange={handleTemplateChange(index, 'name')}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Category"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={template.category ?? ''}
                      onChange={handleTemplateChange(index, 'category')}
                    />
                    <input
                      type="text"
                      placeholder="Last updated"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={template.lastUpdated ?? ''}
                      onChange={handleTemplateChange(index, 'lastUpdated')}
                    />
                  </div>
                  <textarea
                    placeholder="Subject"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    rows={2}
                    value={template.subject ?? ''}
                    onChange={handleTemplateChange(index, 'subject')}
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

AdminEmailSettingsSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string,
  settings: PropTypes.shape({
    branding: PropTypes.object,
    notifications: PropTypes.object,
    escalationRecipients: PropTypes.array,
    domains: PropTypes.array,
    templates: PropTypes.array
  }),
  onSettingsUpdated: PropTypes.func
};

AdminEmailSettingsSection.defaultProps = {
  sectionId: 'email-settings',
  token: null,
  settings: null,
  onSettingsUpdated: undefined
};
