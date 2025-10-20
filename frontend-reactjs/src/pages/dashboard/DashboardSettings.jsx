import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  PaintBrushIcon,
  PhotoIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  ServerStackIcon,
  KeyIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';
import { useOutletContext } from 'react-router-dom';

import DashboardSectionHeader from '../../components/dashboard/DashboardSectionHeader.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchAppearanceSettings,
  fetchIntegrationSettings,
  fetchPreferenceSettings,
  fetchSystemSettings,
  fetchThirdPartySettings,
  updateAppearanceSettings,
  updateIntegrationSettings,
  updatePreferenceSettings,
  updateSystemSettings,
  updateThirdPartySettings
} from '../../api/adminSettingsApi.js';

function ToggleRow({ label, description, value, onChange }) {
  return (
    <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:border-primary/40">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {description ? <span className="text-xs text-slate-500">{description}</span> : null}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
        <button
          type="button"
          onClick={onChange}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            value ? 'bg-primary' : 'bg-slate-200'
          }`}
          aria-pressed={value}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${value ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
      </div>
    </label>
  );
}

ToggleRow.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  value: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired
};

ToggleRow.defaultProps = {
  description: undefined
};

const createFlagState = () => ({
  appearance: false,
  preferences: false,
  system: false,
  integration: false,
  thirdParty: false
});

const createFeedbackState = () => ({
  appearance: null,
  preferences: null,
  system: null,
  integration: null,
  thirdParty: null
});

const generateId = (prefix) => {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const safeColour = (value, fallback) =>
  typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : fallback;

const parseList = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return String(value)
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const formatList = (value) => (Array.isArray(value) ? value.join(', ') : '');

const initialAssetDraft = () => ({
  id: generateId('asset'),
  label: '',
  type: 'image',
  url: '',
  altText: '',
  featured: false
});

const newWebhookDraft = () => ({
  id: generateId('webhook'),
  name: '',
  url: '',
  events: '',
  active: true,
  error: null
});

const newServiceDraft = () => ({
  id: generateId('service'),
  provider: '',
  status: 'active',
  connectedAccount: '',
  notes: '',
  error: null
});

const newCredentialDraft = () => ({
  id: generateId('credential'),
  provider: '',
  environment: 'production',
  alias: '',
  ownerEmail: '',
  status: 'active',
  notes: '',
  error: null
});

const ensureObject = (value) => (value && typeof value === 'object' ? { ...value } : {});

const ensureArray = (value) => (Array.isArray(value) ? [...value] : []);

const withIds = (items, prefix) =>
  ensureArray(items).map((item) => ({ ...ensureObject(item), id: item?.id ?? generateId(prefix) }));

const normaliseAppearanceForm = (value = {}) => {
  const brand = ensureObject(value.brand);
  const layout = ensureObject(value.layout);
  const typography = ensureObject(value.typography);
  const assets = withIds(value.assets, 'asset').map((asset) => ({
    ...asset,
    label: asset.label ?? '',
    type: asset.type ?? 'image',
    url: asset.url ?? '',
    altText: asset.altText ?? '',
    featured: Boolean(asset.featured)
  }));

  return {
    ...value,
    brand,
    layout,
    typography,
    assets
  };
};

const normalisePreferencesForm = (value = {}) => {
  const localization = ensureObject(value.localization);
  localization.supportedLanguages = ensureArray(localization.supportedLanguages);

  const registrations = ensureObject(value.registrations);
  registrations.allowedDomains = ensureArray(registrations.allowedDomains);

  const content = ensureObject(value.content);
  content.featuredCourseIds = ensureArray(content.featuredCourseIds);

  const communications = ensureObject(value.communications);

  return {
    ...value,
    localization,
    registrations,
    content,
    communications
  };
};

const normaliseSystemForm = (value = {}) => {
  const environment = ensureObject(value.environment);
  const security = ensureObject(value.security);
  const storage = ensureObject(value.storage);
  const performance = ensureObject(value.performance);

  return {
    ...value,
    environment,
    security,
    storage,
    performance
  };
};

const normaliseIntegrationForm = (value = {}) => {
  const webhooks = withIds(value.webhooks, 'webhook').map((webhook) => ({
    ...webhook,
    name: webhook.name ?? '',
    url: webhook.url ?? '',
    events: ensureArray(webhook.events),
    active: webhook.active ?? true
  }));

  const services = withIds(value.services, 'service').map((service) => ({
    ...service,
    provider: service.provider ?? '',
    status: service.status ?? 'active',
    connectedAccount: service.connectedAccount ?? '',
    notes: service.notes ?? '',
    lastSyncedAt: service.lastSyncedAt ?? null
  }));

  return {
    ...value,
    webhooks,
    services
  };
};

const normaliseThirdPartyForm = (value = {}) => {
  const credentials = withIds(value.credentials, 'credential').map((credential) => ({
    ...credential,
    provider: credential.provider ?? '',
    environment: credential.environment ?? 'production',
    alias: credential.alias ?? '',
    ownerEmail: credential.ownerEmail ?? '',
    status: credential.status ?? 'active',
    notes: credential.notes ?? '',
    createdAt: credential.createdAt ?? null
  }));

  const monitoring = ensureObject(value.monitoring);
  monitoring.alertEmails = ensureArray(monitoring.alertEmails);

  return {
    ...value,
    credentials,
    monitoring
  };
};
export default function DashboardSettings() {
  const { role, dashboard } = useOutletContext();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;

  const isAdmin = role === 'admin';

  const [notifications, setNotifications] = useState({
    email: true,
    sms: role === 'admin',
    push: true
  });
  const [security, setSecurity] = useState({
    mfa: dashboard?.security?.mfaEnabled ?? false,
    alerts: true
  });
  const [devices, setDevices] = useState(() => dashboard?.devices ?? []);

  const [appearanceForm, setAppearanceForm] = useState(null);
  const [preferencesForm, setPreferencesForm] = useState(null);
  const [systemForm, setSystemForm] = useState(null);
  const [integrationForm, setIntegrationForm] = useState(null);
  const [thirdPartyForm, setThirdPartyForm] = useState(null);
  const [adminLoading, setAdminLoading] = useState(isAdmin);
  const [adminError, setAdminError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dirty, setDirty] = useState(createFlagState);
  const [saving, setSaving] = useState(createFlagState);
  const [sectionFeedback, setSectionFeedback] = useState(createFeedbackState);
  const [assetWizard, setAssetWizard] = useState({ open: false, step: 1, draft: initialAssetDraft(), error: null });
  const [newWebhook, setNewWebhook] = useState(null);
  const [newService, setNewService] = useState(null);
  const [newCredential, setNewCredential] = useState(null);

  const roleLabel = useMemo(() => {
    switch (role) {
      case 'instructor':
        return 'Instructor Learnspace';
      case 'admin':
        return 'Administrator Learnspace';
      default:
        return 'Learner Learnspace';
    }
  }, [role]);

  const refreshAdminSettings = useCallback(() => {
    if (isAdmin) {
      setRefreshKey((key) => key + 1);
    }
  }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin || !token) {
      return undefined;
    }
    const controller = new AbortController();
    setAdminLoading(true);
    setAdminError(null);
    Promise.all([
      fetchAppearanceSettings({ token, signal: controller.signal }),
      fetchPreferenceSettings({ token, signal: controller.signal }),
      fetchSystemSettings({ token, signal: controller.signal }),
      fetchIntegrationSettings({ token, signal: controller.signal }),
      fetchThirdPartySettings({ token, signal: controller.signal })
    ])
      .then(([appearance, preferences, system, integration, thirdParty]) => {
        setAppearanceForm(normaliseAppearanceForm(appearance ?? {}));
        setPreferencesForm(normalisePreferencesForm(preferences ?? {}));
        setSystemForm(normaliseSystemForm(system ?? {}));
        setIntegrationForm(normaliseIntegrationForm(integration ?? {}));
        setThirdPartyForm(normaliseThirdPartyForm(thirdParty ?? {}));
        setDirty(createFlagState());
        setSaving(createFlagState());
        setSectionFeedback(createFeedbackState());
        setAssetWizard({ open: false, step: 1, draft: initialAssetDraft(), error: null });
        setNewWebhook(null);
        setNewService(null);
        setNewCredential(null);
      })
      .catch((error) => {
        if (error?.name === 'AbortError' || error?.message === 'canceled') {
          return;
        }
        setAdminError(error instanceof Error ? error : new Error('Failed to load admin settings'));
      })
      .finally(() => setAdminLoading(false));

    return () => {
      controller.abort();
    };
  }, [isAdmin, token, refreshKey]);

  const setDirtyFlag = useCallback((section) => {
    setDirty((prev) => ({ ...prev, [section]: true }));
    setSectionFeedback((prev) => ({ ...prev, [section]: null }));
  }, []);

  const setSavingFlag = useCallback((section, value) => {
    setSaving((prev) => ({ ...prev, [section]: value }));
  }, []);

  const setFeedback = useCallback((section, feedback) => {
    setSectionFeedback((prev) => ({ ...prev, [section]: feedback }));
  }, []);

  const resetDirtyFlag = useCallback((section) => {
    setDirty((prev) => ({ ...prev, [section]: false }));
  }, []);
  const handleAppearanceSave = async () => {
    if (!token || !appearanceForm) {
      setFeedback('appearance', {
        tone: 'error',
        message: 'You need an active admin session to update appearance settings.'
      });
      return;
    }
    setSavingFlag('appearance', true);
    setFeedback('appearance', null);
    try {
      const payload = await updateAppearanceSettings({ token, payload: appearanceForm });
      setAppearanceForm(payload ?? appearanceForm);
      resetDirtyFlag('appearance');
      setFeedback('appearance', {
        tone: 'success',
        message: 'Appearance settings saved successfully.'
      });
    } catch (error) {
      setFeedback('appearance', {
        tone: 'error',
        message: error?.message ?? 'Failed to save appearance settings.'
      });
    } finally {
      setSavingFlag('appearance', false);
    }
  };

  const handlePreferencesSave = async () => {
    if (!token || !preferencesForm) {
      setFeedback('preferences', {
        tone: 'error',
        message: 'You need an active admin session to update website preferences.'
      });
      return;
    }
    setSavingFlag('preferences', true);
    setFeedback('preferences', null);
    try {
      const payload = await updatePreferenceSettings({ token, payload: preferencesForm });
      setPreferencesForm(payload ?? preferencesForm);
      resetDirtyFlag('preferences');
      setFeedback('preferences', {
        tone: 'success',
        message: 'Website preferences saved.'
      });
    } catch (error) {
      setFeedback('preferences', {
        tone: 'error',
        message: error?.message ?? 'Failed to save website preferences.'
      });
    } finally {
      setSavingFlag('preferences', false);
    }
  };

  const handleSystemSave = async () => {
    if (!token || !systemForm) {
      setFeedback('system', {
        tone: 'error',
        message: 'You need an active admin session to update system settings.'
      });
      return;
    }
    setSavingFlag('system', true);
    setFeedback('system', null);
    try {
      const payload = await updateSystemSettings({ token, payload: systemForm });
      setSystemForm(payload ?? systemForm);
      resetDirtyFlag('system');
      setFeedback('system', {
        tone: 'success',
        message: 'System settings saved.'
      });
    } catch (error) {
      setFeedback('system', {
        tone: 'error',
        message: error?.message ?? 'Failed to save system settings.'
      });
    } finally {
      setSavingFlag('system', false);
    }
  };

  const handleIntegrationSave = async () => {
    if (!token || !integrationForm) {
      setFeedback('integration', {
        tone: 'error',
        message: 'You need an active admin session to update integration settings.'
      });
      return;
    }
    setSavingFlag('integration', true);
    setFeedback('integration', null);
    try {
      const payload = await updateIntegrationSettings({ token, payload: integrationForm });
      setIntegrationForm(payload ?? integrationForm);
      resetDirtyFlag('integration');
      setFeedback('integration', {
        tone: 'success',
        message: 'Integration settings saved.'
      });
    } catch (error) {
      setFeedback('integration', {
        tone: 'error',
        message: error?.message ?? 'Failed to save integration settings.'
      });
    } finally {
      setSavingFlag('integration', false);
    }
  };

  const handleThirdPartySave = async () => {
    if (!token || !thirdPartyForm) {
      setFeedback('thirdParty', {
        tone: 'error',
        message: 'You need an active admin session to update third-party API settings.'
      });
      return;
    }
    setSavingFlag('thirdParty', true);
    setFeedback('thirdParty', null);
    try {
      const payload = await updateThirdPartySettings({ token, payload: thirdPartyForm });
      setThirdPartyForm(payload ?? thirdPartyForm);
      resetDirtyFlag('thirdParty');
      setFeedback('thirdParty', {
        tone: 'success',
        message: 'Third-party API settings saved.'
      });
    } catch (error) {
      setFeedback('thirdParty', {
        tone: 'error',
        message: error?.message ?? 'Failed to save third-party API settings.'
      });
    } finally {
      setSavingFlag('thirdParty', false);
    }
  };

  const handleAssetWizardAdvance = () => {
    const { draft, step } = assetWizard;
    if (step === 1) {
      if (!draft.label.trim() || !draft.url.trim()) {
        setAssetWizard((prev) => ({ ...prev, error: 'Provide a descriptive label and media URL to continue.' }));
        return;
      }
      setAssetWizard((prev) => ({ ...prev, step: 2, error: null }));
      return;
    }
    setAppearanceForm((prev) => {
      const assets = Array.isArray(prev?.assets) ? [...prev.assets, { ...draft }] : [{ ...draft }];
      return { ...prev, assets };
    });
    setAssetWizard({ open: false, step: 1, draft: initialAssetDraft(), error: null });
    setFeedback('appearance', {
      tone: 'info',
      message: 'Asset staged. Remember to save appearance settings to publish.'
    });
    setDirtyFlag('appearance');
  };

  const handleAddWebhook = () => {
    if (!newWebhook) {
      setNewWebhook(newWebhookDraft());
      return;
    }
    if (!newWebhook.name.trim() || !newWebhook.url.trim()) {
      setNewWebhook((prev) => ({ ...prev, error: 'Webhook name and endpoint URL are required.' }));
      return;
    }
    const events = parseList(newWebhook.events);
    setIntegrationForm((prev) => {
      const webhooks = Array.isArray(prev?.webhooks) ? [...prev.webhooks] : [];
      webhooks.push({ id: newWebhook.id, name: newWebhook.name.trim(), url: newWebhook.url.trim(), events, active: newWebhook.active });
      return { ...prev, webhooks };
    });
    setNewWebhook(null);
    setDirtyFlag('integration');
  };

  const handleAddService = () => {
    if (!newService) {
      setNewService(newServiceDraft());
      return;
    }
    if (!newService.provider.trim()) {
      setNewService((prev) => ({ ...prev, error: 'Integration provider is required.' }));
      return;
    }
    setIntegrationForm((prev) => {
      const services = Array.isArray(prev?.services) ? [...prev.services] : [];
      services.push({
        id: newService.id,
        provider: newService.provider.trim(),
        status: newService.status,
        lastSyncedAt: null,
        connectedAccount: newService.connectedAccount.trim(),
        notes: newService.notes.trim()
      });
      return { ...prev, services };
    });
    setNewService(null);
    setDirtyFlag('integration');
  };

  const handleAddCredential = () => {
    if (!newCredential) {
      setNewCredential(newCredentialDraft());
      return;
    }
    if (!newCredential.provider.trim() || !newCredential.alias.trim()) {
      setNewCredential((prev) => ({ ...prev, error: 'Provider and alias are required.' }));
      return;
    }
    setThirdPartyForm((prev) => {
      const credentials = Array.isArray(prev?.credentials) ? [...prev.credentials] : [];
      credentials.push({
        id: newCredential.id,
        provider: newCredential.provider.trim(),
        environment: newCredential.environment,
        alias: newCredential.alias.trim(),
        ownerEmail: newCredential.ownerEmail.trim(),
        status: newCredential.status,
        createdAt: null,
        notes: newCredential.notes.trim()
      });
      return { ...prev, credentials };
    });
    setNewCredential(null);
    setDirtyFlag('thirdParty');
  };
  if (isAdmin) {
    return (
      <div className="space-y-10">
        <DashboardSectionHeader
          eyebrow="Admin settings"
          title="Orchestrate your platform operating system"
          description="Craft production-ready branding, fine-tune learner preferences, and govern integrations with full auditability."
          actions={
            <button type="button" className="dashboard-tertiary-pill" onClick={refreshAdminSettings}>
              Refresh data
            </button>
          }
        />

        {adminError ? (
          <div className="dashboard-section">
            <DashboardActionFeedback
              feedback={{
                tone: 'error',
                message: adminError.message ?? 'Failed to load admin settings.',
                detail: 'Verify your connection and try again.'
              }}
              onDismiss={() => setAdminError(null)}
            />
            <button
              type="button"
              className="dashboard-primary-pill mt-6"
              onClick={refreshAdminSettings}
            >
              Retry loading settings
            </button>
          </div>
        ) : null}

        {adminLoading ? (
          <section className="dashboard-section animate-pulse space-y-4">
            <div className="h-5 w-52 rounded-full bg-slate-200" />
            <div className="h-24 rounded-3xl bg-slate-100" />
            <div className="h-24 rounded-3xl bg-slate-100" />
            <div className="h-12 w-40 rounded-full bg-slate-200" />
          </section>
        ) : null}
        {!adminLoading && !adminError && appearanceForm ? (
          <section className="dashboard-section space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <PaintBrushIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Visual identity & appearance</h2>
                  <p className="text-sm text-slate-600">
                    Align every surface with your brand system and showcase premium media.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {dirty.appearance ? 'Unsaved changes' : 'Up to date'}
                </span>
                <button
                  type="button"
                  onClick={handleAppearanceSave}
                  disabled={!dirty.appearance || saving.appearance}
                  className="dashboard-primary-pill disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving.appearance ? 'Saving…' : 'Save appearance'}
                </button>
              </div>
            </div>

            <DashboardActionFeedback
              feedback={sectionFeedback.appearance}
              onDismiss={() => setFeedback('appearance', null)}
            />

            <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <SparklesIcon className="h-4 w-4" /> Brand palette
                  </h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {['primaryColor', 'secondaryColor', 'accentColor'].map((field) => (
                      <label key={field} className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {field === 'primaryColor'
                            ? 'Primary colour'
                            : field === 'secondaryColor'
                              ? 'Secondary colour'
                              : 'Accent colour'}
                        </span>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                          <input
                            type="color"
                            className="h-10 w-10 flex-shrink-0 rounded-xl border border-slate-200"
                            value={appearanceForm?.brand?.[field] ?? '#2563eb'}
                            onChange={(event) => {
                              const value = event.target.value;
                              setAppearanceForm((prev) => ({
                                ...prev,
                                brand: { ...prev.brand, [field]: value }
                              }));
                              setDirtyFlag('appearance');
                            }}
                          />
                          <input
                            type="text"
                            className="w-full rounded-xl border border-transparent bg-transparent text-sm font-medium text-slate-700 focus:border-primary focus:outline-none"
                            value={appearanceForm?.brand?.[field] ?? ''}
                            onChange={(event) => {
                              const value = event.target.value;
                              setAppearanceForm((prev) => ({
                                ...prev,
                                brand: { ...prev.brand, [field]: value }
                              }));
                              setDirtyFlag('appearance');
                            }}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <PhotoIcon className="h-4 w-4" /> Hero narrative
                  </h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Headline</span>
                      <input
                        type="text"
                        value={appearanceForm?.layout?.homepageHeadline ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAppearanceForm((prev) => ({
                            ...prev,
                            layout: { ...prev.layout, homepageHeadline: value }
                          }));
                          setDirtyFlag('appearance');
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 focus:border-primary focus:outline-none"
                        placeholder="Craft a bold promise for visitors"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subheadline</span>
                      <textarea
                        value={appearanceForm?.layout?.homepageSubheadline ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAppearanceForm((prev) => ({
                            ...prev,
                            layout: { ...prev.layout, homepageSubheadline: value }
                          }));
                          setDirtyFlag('appearance');
                        }}
                        rows={3}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        placeholder="Build trust with a concise explanation of your value proposition"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Call-to-action label</span>
                      <input
                        type="text"
                        value={appearanceForm?.layout?.callToActionLabel ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAppearanceForm((prev) => ({
                            ...prev,
                            layout: { ...prev.layout, callToActionLabel: value }
                          }));
                          setDirtyFlag('appearance');
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 focus:border-primary focus:outline-none"
                        placeholder="Launch learner hub"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Call-to-action URL</span>
                      <input
                        type="text"
                        value={appearanceForm?.layout?.callToActionUrl ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAppearanceForm((prev) => ({
                            ...prev,
                            layout: { ...prev.layout, callToActionUrl: value }
                          }));
                          setDirtyFlag('appearance');
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        placeholder="/explorer"
                      />
                    </label>
                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Homepage announcement</span>
                      <input
                        type="text"
                        value={appearanceForm?.layout?.announcement ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAppearanceForm((prev) => ({
                            ...prev,
                            layout: { ...prev.layout, announcement: value }
                          }));
                          setDirtyFlag('appearance');
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        placeholder="Celebrating new product milestones or feature launches"
                      />
                    </label>
                    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live hero preview</span>
                      <div
                        className="mt-4 rounded-3xl px-6 py-8 text-white shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${safeColour(
                            appearanceForm?.brand?.primaryColor,
                            '#2563eb'
                          )}, ${safeColour(appearanceForm?.brand?.accentColor, '#f97316')})`
                        }}
                      >
                        <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
                          {appearanceForm?.layout?.announcement || 'Announcement banner'}
                        </p>
                        <h4 className="mt-3 text-2xl font-semibold">
                          {appearanceForm?.layout?.homepageHeadline || 'Design the future of learning'}
                        </h4>
                        <p className="mt-2 text-sm text-white/80">
                          {appearanceForm?.layout?.homepageSubheadline ||
                            'Deliver a premium, accessible learning experience with cinematic storytelling, trusted credentials, and modern commerce.'}
                        </p>
                        {appearanceForm?.layout?.callToActionLabel ? (
                          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                            {appearanceForm.layout.callToActionLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Typography system
                  </h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {['headingFont', 'bodyFont', 'codeFont'].map((field) => (
                      <label key={field} className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {field === 'headingFont'
                            ? 'Heading font'
                            : field === 'bodyFont'
                              ? 'Body font'
                              : 'Code font'}
                        </span>
                        <input
                          type="text"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                          value={appearanceForm?.typography?.[field] ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            setAppearanceForm((prev) => ({
                              ...prev,
                              typography: { ...prev.typography, [field]: value }
                            }));
                            setDirtyFlag('appearance');
                          }}
                          placeholder={field === 'codeFont' ? 'Fira Code' : 'Inter'}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Brand assets</h3>
                    <button
                      type="button"
                      onClick={() => setAssetWizard({ open: true, step: 1, draft: initialAssetDraft(), error: null })}
                      className="text-xs font-semibold text-primary transition hover:text-primary-dark"
                    >
                      Launch asset wizard
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Upload cinematic imagery or hero videos to elevate key landing pages.
                  </p>

                  <div className="mt-4 space-y-3">
                    {Array.isArray(appearanceForm?.assets) && appearanceForm.assets.length > 0 ? (
                      appearanceForm.assets.map((asset) => (
                        <div key={asset.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{asset.label || 'Untitled asset'}</p>
                              <p className="text-xs text-slate-500">{asset.type === 'video' ? 'Video' : 'Image'} asset</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                  checked={asset.featured ?? false}
                                  onChange={(event) => {
                                    const value = event.target.checked;
                                    setAppearanceForm((prev) => ({
                                      ...prev,
                                      assets: prev.assets.map((item) =>
                                        item.id === asset.id ? { ...item, featured: value } : item
                                      )
                                    }));
                                    setDirtyFlag('appearance');
                                  }}
                                />
                                Featured
                              </label>
                              <button
                                type="button"
                                className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                                onClick={() => {
                                  setAppearanceForm((prev) => ({
                                    ...prev,
                                    assets: prev.assets.filter((item) => item.id !== asset.id)
                                  }));
                                  setDirtyFlag('appearance');
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <label className="flex flex-col gap-1 text-xs text-slate-500">
                              Label
                              <input
                                type="text"
                                value={asset.label ?? ''}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setAppearanceForm((prev) => ({
                                    ...prev,
                                    assets: prev.assets.map((item) =>
                                      item.id === asset.id ? { ...item, label: value } : item
                                    )
                                  }));
                                  setDirtyFlag('appearance');
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-slate-500">
                              Media type
                              <select
                                value={asset.type ?? 'image'}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setAppearanceForm((prev) => ({
                                    ...prev,
                                    assets: prev.assets.map((item) =>
                                      item.id === asset.id ? { ...item, type: value } : item
                                    )
                                  }));
                                  setDirtyFlag('appearance');
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              >
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                                <option value="illustration">Illustration</option>
                              </select>
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-slate-500 md:col-span-2">
                              URL
                              <input
                                type="text"
                                value={asset.url ?? ''}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setAppearanceForm((prev) => ({
                                    ...prev,
                                    assets: prev.assets.map((item) =>
                                      item.id === asset.id ? { ...item, url: value } : item
                                    )
                                  }));
                                  setDirtyFlag('appearance');
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-slate-500 md:col-span-2">
                              Alternative text
                              <input
                                type="text"
                                value={asset.altText ?? ''}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setAppearanceForm((prev) => ({
                                    ...prev,
                                    assets: prev.assets.map((item) =>
                                      item.id === asset.id ? { ...item, altText: value } : item
                                    )
                                  }));
                                  setDirtyFlag('appearance');
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              />
                            </label>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No brand assets configured yet.</p>
                    )}
                  </div>
                  {assetWizard.open ? (
                    <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-primary">Asset wizard</p>
                        <button
                          type="button"
                          className="text-xs font-semibold text-primary/70 hover:text-primary"
                          onClick={() => setAssetWizard({ open: false, step: 1, draft: initialAssetDraft(), error: null })}
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-primary/80">Step {assetWizard.step} of 2</p>
                      {assetWizard.error ? (
                        <p className="mt-2 text-xs font-semibold text-rose-500">{assetWizard.error}</p>
                      ) : null}
                      {assetWizard.step === 1 ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="flex flex-col gap-1 text-xs text-slate-600">
                            Label
                            <input
                              type="text"
                              value={assetWizard.draft.label}
                              onChange={(event) =>
                                setAssetWizard((prev) => ({
                                  ...prev,
                                  draft: { ...prev.draft, label: event.target.value }
                                }))
                              }
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-600">
                            Media type
                            <select
                              value={assetWizard.draft.type}
                              onChange={(event) =>
                                setAssetWizard((prev) => ({
                                  ...prev,
                                  draft: { ...prev.draft, type: event.target.value }
                                }))
                              }
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="image">Image</option>
                              <option value="video">Video</option>
                              <option value="illustration">Illustration</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-600 md:col-span-2">
                            Media URL
                            <input
                              type="text"
                              value={assetWizard.draft.url}
                              onChange={(event) =>
                                setAssetWizard((prev) => ({
                                  ...prev,
                                  draft: { ...prev.draft, url: event.target.value }
                                }))
                              }
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              placeholder="https://cdn.example.com/hero.jpg"
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <label className="flex flex-col gap-1 text-xs text-slate-600">
                            Alt text
                            <input
                              type="text"
                              value={assetWizard.draft.altText}
                              onChange={(event) =>
                                setAssetWizard((prev) => ({
                                  ...prev,
                                  draft: { ...prev.draft, altText: event.target.value }
                                }))
                              }
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              placeholder="Describe the visual for accessibility"
                            />
                          </label>
                          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              checked={assetWizard.draft.featured}
                              onChange={(event) =>
                                setAssetWizard((prev) => ({
                                  ...prev,
                                  draft: { ...prev.draft, featured: event.target.checked }
                                }))
                              }
                            />
                            Feature this asset in hero sections
                          </label>
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            {assetWizard.draft.type === 'image' ? (
                              <img
                                src={assetWizard.draft.url || 'https://placehold.co/600x320?text=Asset+preview'}
                                alt={assetWizard.draft.altText || 'Asset preview'}
                                className="h-48 w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-48 flex-col items-center justify-center bg-slate-900/90 text-white">
                                <span className="text-sm font-semibold">Video asset preview</span>
                                <span className="mt-1 text-xs text-white/70">{assetWizard.draft.url || 'Awaiting URL'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="mt-4 flex items-center justify-end gap-3">
                        {assetWizard.step === 2 ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                            onClick={() => setAssetWizard((prev) => ({ ...prev, step: 1, error: null }))}
                          >
                            Back
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="dashboard-primary-pill"
                          onClick={handleAssetWizardAdvance}
                        >
                          {assetWizard.step === 1 ? 'Continue' : 'Add asset'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}
        {!adminLoading && !adminError && preferencesForm ? (
          <section className="dashboard-section space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <GlobeAltIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Website experience preferences</h2>
                  <p className="text-sm text-slate-600">
                    Manage localisation, onboarding rules, and content modules for your public site.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {dirty.preferences ? 'Unsaved changes' : 'Up to date'}
                </span>
                <button
                  type="button"
                  onClick={handlePreferencesSave}
                  disabled={!dirty.preferences || saving.preferences}
                  className="dashboard-primary-pill disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving.preferences ? 'Saving…' : 'Save preferences'}
                </button>
              </div>
            </div>

            <DashboardActionFeedback
              feedback={sectionFeedback.preferences}
              onDismiss={() => setFeedback('preferences', null)}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Localisation</h3>
                <div className="mt-4 space-y-4">
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Default language
                    <input
                      type="text"
                      value={preferencesForm?.localization?.defaultLanguage ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          localization: { ...prev.localization, defaultLanguage: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="en"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Supported languages
                    <input
                      type="text"
                      value={formatList(preferencesForm?.localization?.supportedLanguages)}
                      onChange={(event) => {
                        const list = parseList(event.target.value);
                        setPreferencesForm((prev) => ({
                          ...prev,
                          localization: { ...prev.localization, supportedLanguages: list }
                        }));
                        setDirtyFlag('preferences');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="en, es, fr"
                    />
                    <span className="text-[11px] text-slate-400">Separate with commas.</span>
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Default timezone
                    <input
                      type="text"
                      value={preferencesForm?.localization?.defaultTimezone ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          localization: { ...prev.localization, defaultTimezone: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="Europe/London"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Registration & access</h3>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Allow open registration</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={preferencesForm?.registrations?.allowOpenRegistration ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          registrations: { ...prev.registrations, allowOpenRegistration: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Require email verification</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={preferencesForm?.registrations?.requireEmailVerification ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          registrations: { ...prev.registrations, requireEmailVerification: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Enable social sign-in</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={preferencesForm?.registrations?.allowSocialAuth ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          registrations: { ...prev.registrations, allowSocialAuth: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Allowed email domains
                    <input
                      type="text"
                      value={formatList(preferencesForm?.registrations?.allowedDomains)}
                      onChange={(event) => {
                        const list = parseList(event.target.value);
                        setPreferencesForm((prev) => ({
                          ...prev,
                          registrations: { ...prev.registrations, allowedDomains: list }
                        }));
                        setDirtyFlag('preferences');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="example.com, edulure.com"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Content modules</h3>
                <div className="mt-4 space-y-4">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Show instructor showcase</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={preferencesForm?.content?.showInstructorShowcase ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          content: { ...prev.content, showInstructorShowcase: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Enable blog surface</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={preferencesForm?.content?.enableBlog ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          content: { ...prev.content, enableBlog: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Featured course IDs
                    <input
                      type="text"
                      value={formatList(preferencesForm?.content?.featuredCourseIds)}
                      onChange={(event) => {
                        const list = parseList(event.target.value);
                        setPreferencesForm((prev) => ({
                          ...prev,
                          content: { ...prev.content, featuredCourseIds: list }
                        }));
                        setDirtyFlag('preferences');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="course-alpha, course-beta"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Featured playlist URL
                    <input
                      type="text"
                      value={preferencesForm?.content?.featuredPlaylistUrl ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          content: { ...prev.content, featuredPlaylistUrl: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Communications</h3>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Send weekly digest</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={preferencesForm?.communications?.sendWeeklyDigest ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          communications: { ...prev.communications, sendWeeklyDigest: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Send maintenance emails</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={preferencesForm?.communications?.sendMaintenanceEmails ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          communications: { ...prev.communications, sendMaintenanceEmails: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Marketing emails opt-in by default</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={preferencesForm?.communications?.marketingEmailsOptInDefault ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setPreferencesForm((prev) => ({
                          ...prev,
                          communications: { ...prev.communications, marketingEmailsOptInDefault: value }
                        }));
                        setDirtyFlag('preferences');
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>
        ) : null}
        {!adminLoading && !adminError && systemForm ? (
          <section className="dashboard-section space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Cog6ToothIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">System reliability & safeguards</h2>
                  <p className="text-sm text-slate-600">Set maintenance modes, security controls, and operational policies.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {dirty.system ? 'Unsaved changes' : 'Up to date'}
                </span>
                <button
                  type="button"
                  onClick={handleSystemSave}
                  disabled={!dirty.system || saving.system}
                  className="dashboard-primary-pill disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving.system ? 'Saving…' : 'Save system settings'}
                </button>
              </div>
            </div>

            <DashboardActionFeedback
              feedback={sectionFeedback.system}
              onDismiss={() => setFeedback('system', null)}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Environment</h3>
                <div className="mt-4 space-y-4">
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Deployment status
                    <select
                      value={systemForm?.environment?.status ?? 'production'}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSystemForm((prev) => ({
                          ...prev,
                          environment: { ...prev.environment, status: value }
                        }));
                        setDirtyFlag('system');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Enable maintenance mode</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={systemForm?.environment?.maintenanceMode ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setSystemForm((prev) => ({
                          ...prev,
                          environment: { ...prev.environment, maintenanceMode: value }
                        }));
                        setDirtyFlag('system');
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Maintenance message
                    <textarea
                      value={systemForm?.environment?.maintenanceMessage ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSystemForm((prev) => ({
                          ...prev,
                          environment: { ...prev.environment, maintenanceMessage: value }
                        }));
                        setDirtyFlag('system');
                      }}
                      rows={3}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="Scheduled upgrades will complete at 02:00 UTC."
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Incident contact email
                    <input
                      type="email"
                      value={systemForm?.environment?.incidentContactEmail ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSystemForm((prev) => ({
                          ...prev,
                          environment: { ...prev.environment, incidentContactEmail: value }
                        }));
                        setDirtyFlag('system');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="platform-operations@edulure.com"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Security</h3>
                <div className="mt-4 space-y-4">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Enforce SSO</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={systemForm?.security?.enforceSso ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setSystemForm((prev) => ({
                          ...prev,
                          security: { ...prev.security, enforceSso: value }
                        }));
                        setDirtyFlag('system');
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Password rotation days
                    <input
                      type="number"
                      min={30}
                      value={systemForm?.security?.passwordRotationDays ?? 180}
                      onChange={(event) => {
                        const value = event.target.value === '' ? '' : Number(event.target.value);
                        setSystemForm((prev) => ({
                          ...prev,
                          security: { ...prev.security, passwordRotationDays: value }
                        }));
                        setDirtyFlag('system');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Session timeout (minutes)
                    <input
                      type="number"
                      min={15}
                      value={systemForm?.security?.sessionTimeoutMinutes ?? 60}
                      onChange={(event) => {
                        const value = event.target.value === '' ? '' : Number(event.target.value);
                        setSystemForm((prev) => ({
                          ...prev,
                          security: { ...prev.security, sessionTimeoutMinutes: value }
                        }));
                        setDirtyFlag('system');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Audit log retention (days)
                    <input
                      type="number"
                      min={30}
                      value={systemForm?.security?.auditLogRetentionDays ?? 365}
                      onChange={(event) => {
                        const value = event.target.value === '' ? '' : Number(event.target.value);
                        setSystemForm((prev) => ({
                          ...prev,
                          security: { ...prev.security, auditLogRetentionDays: value }
                        }));
                        setDirtyFlag('system');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Storage & backups</h3>
                <div className="mt-4 space-y-4">
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Primary region
                    <input
                      type="text"
                      value={systemForm?.storage?.defaultRegion ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSystemForm((prev) => ({
                          ...prev,
                          storage: { ...prev.storage, defaultRegion: value }
                        }));
                        setDirtyFlag('system');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="eu-west-1"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Backup frequency (hours)
                    <input
                      type="number"
                      min={1}
                      value={systemForm?.storage?.backupFrequencyHours ?? 6}
                      onChange={(event) => {
                        const value = event.target.value === '' ? '' : Number(event.target.value);
                        setSystemForm((prev) => ({
                          ...prev,
                          storage: { ...prev.storage, backupFrequencyHours: value }
                        }));
                        setDirtyFlag('system');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Data residency note
                    <textarea
                      value={systemForm?.storage?.dataResidencyNote ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSystemForm((prev) => ({
                          ...prev,
                          storage: { ...prev.storage, dataResidencyNote: value }
                        }));
                        setDirtyFlag('system');
                      }}
                      rows={3}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="Document residency commitments and failover strategy."
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Performance</h3>
                <div className="mt-4 space-y-4">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Enable edge caching</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={systemForm?.performance?.enableEdgeCache ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setSystemForm((prev) => ({
                          ...prev,
                          performance: { ...prev.performance, enableEdgeCache: value }
                        }));
                        setDirtyFlag('system');
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Cache TTL (seconds)
                    <input
                      type="number"
                      min={60}
                      value={systemForm?.performance?.cacheTtlSeconds ?? 3600}
                      onChange={(event) => {
                        const value = event.target.value === '' ? '' : Number(event.target.value);
                        setSystemForm((prev) => ({
                          ...prev,
                          performance: { ...prev.performance, cacheTtlSeconds: value }
                        }));
                        setDirtyFlag('system');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Enable image optimisation</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={systemForm?.performance?.enableImageOptimization ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setSystemForm((prev) => ({
                          ...prev,
                          performance: { ...prev.performance, enableImageOptimization: value }
                        }));
                        setDirtyFlag('system');
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>
        ) : null}
        {!adminLoading && !adminError && integrationForm ? (
          <section className="dashboard-section space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ServerStackIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Integration orchestration</h2>
                  <p className="text-sm text-slate-600">Control outbound webhooks and partner platform connections.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {dirty.integration ? 'Unsaved changes' : 'Up to date'}
                </span>
                <button
                  type="button"
                  onClick={handleIntegrationSave}
                  disabled={!dirty.integration || saving.integration}
                  className="dashboard-primary-pill disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving.integration ? 'Saving…' : 'Save integration settings'}
                </button>
              </div>
            </div>

            <DashboardActionFeedback
              feedback={sectionFeedback.integration}
              onDismiss={() => setFeedback('integration', null)}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Webhooks</h3>
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary transition hover:text-primary-dark"
                    onClick={handleAddWebhook}
                  >
                    {newWebhook ? 'Add webhook' : 'New webhook'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Publish events to partner systems with real-time delivery.</p>
                <div className="mt-4 space-y-3">
                  {Array.isArray(integrationForm?.webhooks) && integrationForm.webhooks.length > 0 ? (
                    integrationForm.webhooks.map((webhook) => (
                      <div key={webhook.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{webhook.name || 'Unnamed webhook'}</p>
                            <p className="text-xs text-slate-500">{webhook.url}</p>
                          </div>
                          <button
                            type="button"
                            className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                            onClick={() => {
                              setIntegrationForm((prev) => ({
                                ...prev,
                                webhooks: prev.webhooks.filter((item) => item.id !== webhook.id)
                              }));
                              setDirtyFlag('integration');
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="flex flex-col gap-1 text-xs text-slate-500">
                            Name
                            <input
                              type="text"
                              value={webhook.name ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setIntegrationForm((prev) => ({
                                  ...prev,
                                  webhooks: prev.webhooks.map((item) =>
                                    item.id === webhook.id ? { ...item, name: value } : item
                                  )
                                }));
                                setDirtyFlag('integration');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500">
                            Endpoint URL
                            <input
                              type="text"
                              value={webhook.url ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setIntegrationForm((prev) => ({
                                  ...prev,
                                  webhooks: prev.webhooks.map((item) =>
                                    item.id === webhook.id ? { ...item, url: value } : item
                                  )
                                }));
                                setDirtyFlag('integration');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500 md:col-span-2">
                            Events
                            <input
                              type="text"
                              value={formatList(webhook.events)}
                              onChange={(event) => {
                                const list = parseList(event.target.value);
                                setIntegrationForm((prev) => ({
                                  ...prev,
                                  webhooks: prev.webhooks.map((item) =>
                                    item.id === webhook.id ? { ...item, events: list } : item
                                  )
                                }));
                                setDirtyFlag('integration');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              placeholder="learner.enrolled, learner.completed"
                            />
                          </label>
                          <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2">
                            <span className="font-semibold text-slate-700">Active</span>
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                              checked={webhook.active ?? true}
                              onChange={(event) => {
                                const value = event.target.checked;
                                setIntegrationForm((prev) => ({
                                  ...prev,
                                  webhooks: prev.webhooks.map((item) =>
                                    item.id === webhook.id ? { ...item, active: value } : item
                                  )
                                }));
                                setDirtyFlag('integration');
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No webhooks configured yet.</p>
                  )}

                  {newWebhook ? (
                    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-primary">New webhook</h4>
                      {newWebhook.error ? (
                        <p className="mt-1 text-xs font-semibold text-rose-500">{newWebhook.error}</p>
                      ) : null}
                      <div className="mt-3 grid gap-3">
                        <input
                          type="text"
                          value={newWebhook.name}
                          onChange={(event) => setNewWebhook((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder="Enrollment stream"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        />
                        <input
                          type="text"
                          value={newWebhook.url}
                          onChange={(event) => setNewWebhook((prev) => ({ ...prev, url: event.target.value }))}
                          placeholder="https://hooks.example.com/events"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        />
                        <input
                          type="text"
                          value={newWebhook.events}
                          onChange={(event) => setNewWebhook((prev) => ({ ...prev, events: event.target.value }))}
                          placeholder="learner.enrolled, learner.completed"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        />
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                            checked={newWebhook.active}
                            onChange={(event) => setNewWebhook((prev) => ({ ...prev, active: event.target.checked }))}
                          />
                          Active
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Connected services</h3>
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary transition hover:text-primary-dark"
                    onClick={handleAddService}
                  >
                    {newService ? 'Add service' : 'New service'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Track partner integrations and their operational status.</p>
                <div className="mt-4 space-y-3">
                  {Array.isArray(integrationForm?.services) && integrationForm.services.length > 0 ? (
                    integrationForm.services.map((service) => (
                      <div key={service.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{service.provider}</p>
                            <p className="text-xs text-slate-500">{service.connectedAccount || 'No account linked'}</p>
                          </div>
                          <button
                            type="button"
                            className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                            onClick={() => {
                              setIntegrationForm((prev) => ({
                                ...prev,
                                services: prev.services.filter((item) => item.id !== service.id)
                              }));
                              setDirtyFlag('integration');
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="flex flex-col gap-1 text-xs text-slate-500">
                            Provider
                            <input
                              type="text"
                              value={service.provider ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setIntegrationForm((prev) => ({
                                  ...prev,
                                  services: prev.services.map((item) =>
                                    item.id === service.id ? { ...item, provider: value } : item
                                  )
                                }));
                                setDirtyFlag('integration');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500">
                            Status
                            <select
                              value={service.status ?? 'active'}
                              onChange={(event) => {
                                const value = event.target.value;
                                setIntegrationForm((prev) => ({
                                  ...prev,
                                  services: prev.services.map((item) =>
                                    item.id === service.id ? { ...item, status: value } : item
                                  )
                                }));
                                setDirtyFlag('integration');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="active">Active</option>
                              <option value="paused">Paused</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500">
                            Connected account
                            <input
                              type="text"
                              value={service.connectedAccount ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setIntegrationForm((prev) => ({
                                  ...prev,
                                  services: prev.services.map((item) =>
                                    item.id === service.id ? { ...item, connectedAccount: value } : item
                                  )
                                }));
                                setDirtyFlag('integration');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              placeholder="rev-ops@edulure.com"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500 md:col-span-2">
                            Notes
                            <textarea
                              value={service.notes ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setIntegrationForm((prev) => ({
                                  ...prev,
                                  services: prev.services.map((item) =>
                                    item.id === service.id ? { ...item, notes: value } : item
                                  )
                                }));
                                setDirtyFlag('integration');
                              }}
                              rows={3}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              placeholder="Describe sync scope or outstanding tasks."
                            />
                          </label>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No connected services yet.</p>
                  )}

                  {newService ? (
                    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-primary">New service</h4>
                      {newService.error ? (
                        <p className="mt-1 text-xs font-semibold text-rose-500">{newService.error}</p>
                      ) : null}
                      <div className="mt-3 grid gap-3">
                        <input
                          type="text"
                          value={newService.provider}
                          onChange={(event) => setNewService((prev) => ({ ...prev, provider: event.target.value }))}
                          placeholder="HubSpot"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        />
                        <select
                          value={newService.status}
                          onChange={(event) => setNewService((prev) => ({ ...prev, status: event.target.value }))}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="disabled">Disabled</option>
                        </select>
                        <input
                          type="text"
                          value={newService.connectedAccount}
                          onChange={(event) => setNewService((prev) => ({ ...prev, connectedAccount: event.target.value }))}
                          placeholder="rev-ops@edulure.com"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        />
                        <textarea
                          value={newService.notes}
                          onChange={(event) => setNewService((prev) => ({ ...prev, notes: event.target.value }))}
                          rows={3}
                          placeholder="Add runbooks or context for this integration."
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}
        {!adminLoading && !adminError && thirdPartyForm ? (
          <section className="dashboard-section space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <KeyIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Third-party API governance</h2>
                  <p className="text-sm text-slate-600">Oversee credentials, heartbeat monitoring, and escalation policies.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {dirty.thirdParty ? 'Unsaved changes' : 'Up to date'}
                </span>
                <button
                  type="button"
                  onClick={handleThirdPartySave}
                  disabled={!dirty.thirdParty || saving.thirdParty}
                  className="dashboard-primary-pill disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving.thirdParty ? 'Saving…' : 'Save third-party settings'}
                </button>
              </div>
            </div>

            <DashboardActionFeedback
              feedback={sectionFeedback.thirdParty}
              onDismiss={() => setFeedback('thirdParty', null)}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Credentials</h3>
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary transition hover:text-primary-dark"
                    onClick={handleAddCredential}
                  >
                    {newCredential ? 'Add credential' : 'New credential'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Document which teams own sensitive access tokens.</p>
                <div className="mt-4 space-y-3">
                  {Array.isArray(thirdPartyForm?.credentials) && thirdPartyForm.credentials.length > 0 ? (
                    thirdPartyForm.credentials.map((credential) => (
                      <div key={credential.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{credential.provider}</p>
                            <p className="text-xs text-slate-500">{credential.alias}</p>
                          </div>
                          <button
                            type="button"
                            className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                            onClick={() => {
                              setThirdPartyForm((prev) => ({
                                ...prev,
                                credentials: prev.credentials.filter((item) => item.id !== credential.id)
                              }));
                              setDirtyFlag('thirdParty');
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="flex flex-col gap-1 text-xs text-slate-500">
                            Provider
                            <input
                              type="text"
                              value={credential.provider ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setThirdPartyForm((prev) => ({
                                  ...prev,
                                  credentials: prev.credentials.map((item) =>
                                    item.id === credential.id ? { ...item, provider: value } : item
                                  )
                                }));
                                setDirtyFlag('thirdParty');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500">
                            Environment
                            <select
                              value={credential.environment ?? 'production'}
                              onChange={(event) => {
                                const value = event.target.value;
                                setThirdPartyForm((prev) => ({
                                  ...prev,
                                  credentials: prev.credentials.map((item) =>
                                    item.id === credential.id ? { ...item, environment: value } : item
                                  )
                                }));
                                setDirtyFlag('thirdParty');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="production">Production</option>
                              <option value="staging">Staging</option>
                              <option value="development">Development</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500">
                            Alias
                            <input
                              type="text"
                              value={credential.alias ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setThirdPartyForm((prev) => ({
                                  ...prev,
                                  credentials: prev.credentials.map((item) =>
                                    item.id === credential.id ? { ...item, alias: value } : item
                                  )
                                }));
                                setDirtyFlag('thirdParty');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500">
                            Owner email
                            <input
                              type="email"
                              value={credential.ownerEmail ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setThirdPartyForm((prev) => ({
                                  ...prev,
                                  credentials: prev.credentials.map((item) =>
                                    item.id === credential.id ? { ...item, ownerEmail: value } : item
                                  )
                                }));
                                setDirtyFlag('thirdParty');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              placeholder="ai-platform@edulure.com"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500">
                            Status
                            <select
                              value={credential.status ?? 'active'}
                              onChange={(event) => {
                                const value = event.target.value;
                                setThirdPartyForm((prev) => ({
                                  ...prev,
                                  credentials: prev.credentials.map((item) =>
                                    item.id === credential.id ? { ...item, status: value } : item
                                  )
                                }));
                                setDirtyFlag('thirdParty');
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                            >
                              <option value="active">Active</option>
                              <option value="rotating">Rotating</option>
                              <option value="revoked">Revoked</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-500 md:col-span-2">
                            Notes
                            <textarea
                              value={credential.notes ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                setThirdPartyForm((prev) => ({
                                  ...prev,
                                  credentials: prev.credentials.map((item) =>
                                    item.id === credential.id ? { ...item, notes: value } : item
                                  )
                                }));
                                setDirtyFlag('thirdParty');
                              }}
                              rows={3}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                              placeholder="Document rotation cadences or vendor context."
                            />
                          </label>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No credentials provisioned yet.</p>
                  )}

                  {newCredential ? (
                    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-primary">New credential</h4>
                      {newCredential.error ? (
                        <p className="mt-1 text-xs font-semibold text-rose-500">{newCredential.error}</p>
                      ) : null}
                      <div className="mt-3 grid gap-3">
                        <input
                          type="text"
                          value={newCredential.provider}
                          onChange={(event) => setNewCredential((prev) => ({ ...prev, provider: event.target.value }))}
                          placeholder="OpenAI"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        />
                        <select
                          value={newCredential.environment}
                          onChange={(event) => setNewCredential((prev) => ({ ...prev, environment: event.target.value }))}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        >
                          <option value="production">Production</option>
                          <option value="staging">Staging</option>
                          <option value="development">Development</option>
                        </select>
                        <input
                          type="text"
                          value={newCredential.alias}
                          onChange={(event) => setNewCredential((prev) => ({ ...prev, alias: event.target.value }))}
                          placeholder="Instructional design copilot"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        />
                        <input
                          type="email"
                          value={newCredential.ownerEmail}
                          onChange={(event) => setNewCredential((prev) => ({ ...prev, ownerEmail: event.target.value }))}
                          placeholder="ai-platform@edulure.com"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        />
                        <select
                          value={newCredential.status}
                          onChange={(event) => setNewCredential((prev) => ({ ...prev, status: event.target.value }))}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        >
                          <option value="active">Active</option>
                          <option value="rotating">Rotating</option>
                          <option value="revoked">Revoked</option>
                        </select>
                        <textarea
                          value={newCredential.notes}
                          onChange={(event) => setNewCredential((prev) => ({ ...prev, notes: event.target.value }))}
                          rows={3}
                          placeholder="Add context for how this credential is used."
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Monitoring & escalation</h3>
                <div className="mt-4 space-y-4">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-700">Enable heartbeat monitoring</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={thirdPartyForm?.monitoring?.enableHeartbeat ?? false}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setThirdPartyForm((prev) => ({
                          ...prev,
                          monitoring: { ...prev.monitoring, enableHeartbeat: value }
                        }));
                        setDirtyFlag('thirdParty');
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Alert emails
                    <input
                      type="text"
                      value={formatList(thirdPartyForm?.monitoring?.alertEmails)}
                      onChange={(event) => {
                        const list = parseList(event.target.value);
                        setThirdPartyForm((prev) => ({
                          ...prev,
                          monitoring: { ...prev.monitoring, alertEmails: list }
                        }));
                        setDirtyFlag('thirdParty');
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="platform-operations@edulure.com, security@edulure.com"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-slate-500">
                    Escalation policy
                    <textarea
                      value={thirdPartyForm?.monitoring?.escalationPolicy ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setThirdPartyForm((prev) => ({
                          ...prev,
                          monitoring: { ...prev.monitoring, escalationPolicy: value }
                        }));
                        setDirtyFlag('thirdParty');
                      }}
                      rows={4}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                      placeholder="Critical vendors page incident commander if response > 15 minutes."
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-10">
      <DashboardSectionHeader
        eyebrow="Settings"
        title="Keep your Learnspace secure"
        description={`Manage how ${roleLabel.toLowerCase()} notifications, devices, and security safeguards operate.`}
        actions={
          <button type="button" className="dashboard-primary-pill">
            Save configuration
          </button>
        }
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="dashboard-section space-y-4">
          <div className="flex items-center gap-3">
            <AdjustmentsHorizontalIcon className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Notification strategy</h2>
              <p className="text-sm text-slate-600">Define how we should alert your teams about programme activity.</p>
            </div>
          </div>
          <ToggleRow
            label="Email updates"
            description="Send weekly digests and immediate alerts for high-priority changes."
            value={notifications.email}
            onChange={() =>
              setNotifications((prev) => ({
                ...prev,
                email: !prev.email
              }))
            }
          />
          <ToggleRow
            label="SMS escalations"
            description="Notify on-call instructors and admins when bookings or compliance issues require attention."
            value={notifications.sms}
            onChange={() =>
              setNotifications((prev) => ({
                ...prev,
                sms: !prev.sms
              }))
            }
          />
          <ToggleRow
            label="Push notifications"
            description="Deliver instant updates to the Edulure mobile app for learners and operators."
            value={notifications.push}
            onChange={() =>
              setNotifications((prev) => ({
                ...prev,
                push: !prev.push
              }))
            }
          />
        </div>

        <div className="dashboard-section space-y-4">
          <div className="flex items-center gap-3">
            <LockClosedIcon className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Security posture</h2>
              <p className="text-sm text-slate-600">Double down on multi-factor authentication and anomaly detection.</p>
            </div>
          </div>
          <ToggleRow
            label="Multi-factor authentication"
            description="Require verification across authenticator apps, security keys, or SMS for every sign-in."
            value={security.mfa}
            onChange={() =>
              setSecurity((prev) => ({
                ...prev,
                mfa: !prev.mfa
              }))
            }
          />
          <ToggleRow
            label="Risk alerts"
            description="Flag unrecognised devices, impossible travel, and policy breaches instantly."
            value={security.alerts}
            onChange={() =>
              setSecurity((prev) => ({
                ...prev,
                alerts: !prev.alerts
              }))
            }
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Latest status</p>
            <p className="mt-1 text-slate-500">
              {security.mfa ? 'MFA enforced for all members.' : 'MFA recommended but not enforced.'}
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-section space-y-5">
        <div className="flex items-center gap-3">
          <DevicePhoneMobileIcon className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Trusted devices</h2>
            <p className="text-sm text-slate-600">Review which laptops and mobile devices currently have Learnspace access.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(devices.length > 0
            ? devices
            : [
                {
                  id: 'placeholder-1',
                  label: 'MacBook Pro · Product team',
                  lastSeen: '2 hours ago',
                  location: 'London, UK',
                  risk: 'Low'
                }
              ]).map((device) => (
            <div key={device.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              <p className="text-sm font-semibold text-slate-900">{device.label}</p>
              <p className="mt-1 text-xs text-slate-500">Last active {device.lastSeen}</p>
              <p className="mt-1 text-xs text-slate-500">Location {device.location}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Risk {device.risk}</p>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-primary transition hover:text-primary-dark"
                onClick={() => setDevices((prev) => prev.filter((item) => item.id !== device.id))}
              >
                Revoke access
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
