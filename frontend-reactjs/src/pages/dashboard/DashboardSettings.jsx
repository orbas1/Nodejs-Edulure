import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  GlobeAltIcon,
  KeyIcon,
  PaintBrushIcon,
  PhotoIcon,
  ServerStackIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import PropTypes from 'prop-types';

import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import SettingsLayout from '../../components/settings/SettingsLayout.jsx';
import SettingsToggleField from '../../components/settings/SettingsToggleField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOutletContext } from 'react-router-dom';
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

const FALLBACK_APPEARANCE = Object.freeze({
  branding: {
    primaryColor: '#2563EB',
    secondaryColor: '#9333EA',
    accentColor: '#F59E0B',
    logoUrl: '',
    faviconUrl: ''
  },
  theme: {
    mode: 'system',
    borderRadius: 'rounded',
    density: 'comfortable',
    fontFamily: 'Inter',
    headingFontFamily: 'Cal Sans'
  },
  hero: {
    heading: 'Inspire learners at scale',
    subheading:
      'Craft immersive cohort experiences, digitise your expertise, and operate a vibrant learning community from a single console.',
    backgroundImageUrl: '',
    backgroundVideoUrl: '',
    primaryCtaLabel: 'Explore programs',
    primaryCtaUrl: '/explore',
    secondaryCtaLabel: 'Book a demo',
    secondaryCtaUrl: '/demo'
  },
  mediaLibrary: []
});

const FALLBACK_PREFERENCES = Object.freeze({
  localisation: {
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    currency: 'USD',
    timezone: 'UTC'
  },
  experience: {
    enableRecommendations: true,
    enableSocialSharing: true,
    enableLiveChatSupport: false,
    allowGuestCheckout: false,
    requireEmailVerification: true
  },
  communications: {
    supportEmail: 'support@edulure.io',
    supportPhone: '',
    marketingEmail: '',
    sendWeeklyDigest: true,
    sendProductUpdates: true
  }
});

const FALLBACK_SYSTEM = Object.freeze({
  maintenanceMode: {
    enabled: false,
    message: '',
    scheduledWindow: null
  },
  operations: {
    timezone: 'UTC',
    weeklyBackupDay: 'sunday',
    autoUpdatesEnabled: true,
    dataRetentionDays: 365
  },
  security: {
    enforceMfaForAdmins: true,
    sessionTimeoutMinutes: 60,
    allowSessionResume: true
  },
  observability: {
    enableAuditTrail: true,
    errorReportingEmail: '',
    notifyOnIntegrationFailure: true
  }
});

const FALLBACK_INTEGRATIONS = Object.freeze({
  webhooks: [],
  services: []
});

const FALLBACK_THIRD_PARTY = Object.freeze({
  credentials: []
});

function cloneState(template) {
  return JSON.parse(JSON.stringify(template));
}

function stableStringify(value) {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function isDeepEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

function summariseCollection(label, noun = 'item') {
  return (before, after) => {
    const previousCount = Array.isArray(before) ? before.length : 0;
    const nextCount = Array.isArray(after) ? after.length : 0;
    if (nextCount === 0) {
      return `${label} cleared`;
    }
    if (nextCount !== previousCount) {
      return `${label} (${nextCount} ${noun}${nextCount === 1 ? '' : 's'})`;
    }
    return `${label} updated`;
  };
}

const SECTION_LABELS = Object.freeze({
  appearance: 'Appearance',
  preferences: 'Preferences',
  system: 'System',
  integrations: 'Integrations',
  'third-party': 'Third-party credentials'
});

const SECTION_ANCHORS = Object.freeze({
  appearance: 'settings-appearance',
  preferences: 'settings-preferences',
  system: 'settings-system',
  integrations: 'settings-integrations',
  'third-party': 'settings-third-party'
});

const SECTION_CHANGE_META = Object.freeze({
  appearance: {
    branding: { label: 'Brand palette' },
    theme: { label: 'Theme settings' },
    hero: { label: 'Hero module messaging' },
    mediaLibrary: { label: 'Media library assets', summarize: summariseCollection('Media library assets', 'asset') }
  },
  preferences: {
    localisation: { label: 'Localisation defaults' },
    experience: { label: 'Experience controls' },
    communications: { label: 'Communication settings' }
  },
  system: {
    maintenanceMode: { label: 'Maintenance mode' },
    operations: { label: 'Operations policies' },
    security: { label: 'Security safeguards' },
    observability: { label: 'Observability alerts' }
  },
  integrations: {
    webhooks: { label: 'Webhook subscriptions', summarize: summariseCollection('Webhook subscriptions', 'subscription') },
    services: { label: 'Connected services', summarize: summariseCollection('Connected services', 'integration') }
  },
  'third-party': {
    credentials: { label: 'Credential vault entries', summarize: summariseCollection('Credential vault entries', 'credential') }
  }
});

function computeChangedSegments(sectionKey, baseline, current) {
  const meta = SECTION_CHANGE_META[sectionKey];
  if (!meta) {
    return isDeepEqual(baseline, current) ? [] : ['Configuration updated'];
  }
  const changes = [];
  Object.entries(meta).forEach(([field, descriptor]) => {
    const config = typeof descriptor === 'string' ? { label: descriptor } : descriptor;
    const { label, summarize } = config;
    const before = baseline?.[field];
    const after = current?.[field];
    if (!isDeepEqual(before, after)) {
      if (typeof summarize === 'function') {
        changes.push(summarize(before, after) || label);
      } else {
        changes.push(label);
      }
    }
  });

  const trackedFields = new Set(Object.keys(meta));
  const unionFields = new Set([
    ...Object.keys(baseline ?? {}),
    ...Object.keys(current ?? {})
  ]);
  let additionalChangeDetected = false;
  unionFields.forEach((field) => {
    if (!trackedFields.has(field) && !isDeepEqual(baseline?.[field], current?.[field])) {
      additionalChangeDetected = true;
    }
  });
  if (additionalChangeDetected) {
    changes.push('Additional configuration updates');
  }

  return Array.from(new Set(changes));
}

function generateId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function TextField({
  label,
  description,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {description ? <span className="text-xs text-slate-500">{description}</span> : null}
      <input
        type={type}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-slate-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

TextField.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  type: PropTypes.string,
  disabled: PropTypes.bool
};

function TextAreaField({
  label,
  description,
  value,
  onChange,
  rows = 4,
  placeholder,
  disabled = false
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {description ? <span className="text-xs text-slate-500">{description}</span> : null}
      <textarea
        className="min-h-[120px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-slate-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
    </label>
  );
}

TextAreaField.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  rows: PropTypes.number,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool
};

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  onSubmit,
  saving = false,
  footer = null,
  actions = null,
  id
}) {
  return (
    <section id={id} className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </header>
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        {children}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          {footer ?? <p className="text-xs text-slate-500">Changes persist immediately after saving.</p>}
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-primary/60"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}

SectionCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  footer: PropTypes.node,
  actions: PropTypes.node,
  id: PropTypes.string
};

function useSettingsSection({ token, fetcher, updater, fallback, sectionName }) {
  const [data, setData] = useState(() => cloneState(fallback));
  const [baseline, setBaseline] = useState(() => cloneState(fallback));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetcher({ token });
      const resolved = response ? cloneState(response) : cloneState(fallback);
      setData(resolved);
      setBaseline(cloneState(resolved));
      setFeedback(null);
    } catch (error) {
      console.error(`Failed to load ${sectionName}`, error);
      setFeedback({
        tone: 'error',
        message: `We could not load ${sectionName}.`,
        detail: error.message
      });
      const fallbackState = cloneState(fallback);
      setData(fallbackState);
      setBaseline(cloneState(fallbackState));
    } finally {
      setLoading(false);
    }
  }, [token, fetcher, fallback, sectionName]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (nextData) => {
      if (!token) {
        return;
      }
      setSaving(true);
      try {
        const payload = await updater({ token, payload: nextData });
        const resolved =
          payload && typeof payload === 'object' && Object.keys(payload).length
            ? payload
            : nextData;
        const resolvedState = cloneState(resolved);
        setData(resolvedState);
        setBaseline(cloneState(resolvedState));
        setFeedback({
          tone: 'success',
          message: `${sectionName} saved`,
          detail: 'Your configuration is now live.'
        });
      } catch (error) {
        console.error(`Failed to update ${sectionName}`, error);
        setFeedback({
          tone: 'error',
          message: `Could not save ${sectionName}.`,
          detail: error.message
        });
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [token, updater, sectionName]
  );

  const reset = useCallback(() => {
    setData(cloneState(baseline));
    setFeedback(null);
  }, [baseline]);

  return {
    data,
    setData,
    baseline,
    loading,
    saving,
    feedback,
    setFeedback,
    refresh,
    save,
    reset
  };
}

function AppearanceSection({ state, onChange, onSubmit, saving = false, disabled = false }) {
  const updateBranding = (field, value) =>
    onChange((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        [field]: value
      }
    }));

  const updateTheme = (field, value) =>
    onChange((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value
      }
    }));

  const updateHero = (field, value) =>
    onChange((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        [field]: value
      }
    }));

  const addAsset = () =>
    onChange((prev) => ({
      ...prev,
      mediaLibrary: [...prev.mediaLibrary, { id: generateId('asset'), type: 'image', label: '', url: '', altText: '', featured: false }]
    }));

  const updateAsset = (assetId, field, value) =>
    onChange((prev) => ({
      ...prev,
      mediaLibrary: prev.mediaLibrary.map((asset) =>
        asset.id === assetId
          ? {
              ...asset,
              [field]: field === 'featured' ? value : value
            }
          : asset
      )
    }));

  const removeAsset = (assetId) =>
    onChange((prev) => ({
      ...prev,
      mediaLibrary: prev.mediaLibrary.filter((asset) => asset.id !== assetId)
    }));

  return (
    <SectionCard
      id="settings-appearance"
      icon={PaintBrushIcon}
      title="Website appearance"
      description="Control your brand palette, typography, hero module, and media library."
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await onSubmit(state);
        } catch (error) {
          console.error('Failed to submit appearance form', error);
        }
      }}
      saving={saving}
      actions={
        <button
          type="button"
          className="text-xs font-semibold text-primary underline"
          onClick={addAsset}
          disabled={disabled}
        >
          Add media asset
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Branding</h3>
          <TextField
            label="Primary colour"
            value={state.branding.primaryColor}
            onChange={(value) => updateBranding('primaryColor', value)}
            placeholder="#2563EB"
            disabled={disabled}
          />
          <TextField
            label="Secondary colour"
            value={state.branding.secondaryColor}
            onChange={(value) => updateBranding('secondaryColor', value)}
            placeholder="#9333EA"
            disabled={disabled}
          />
          <TextField
            label="Accent colour"
            value={state.branding.accentColor}
            onChange={(value) => updateBranding('accentColor', value)}
            placeholder="#F59E0B"
            disabled={disabled}
          />
          <TextField
            label="Logo URL"
            value={state.branding.logoUrl}
            onChange={(value) => updateBranding('logoUrl', value)}
            placeholder="https://cdn.example.com/logo.svg"
            disabled={disabled}
          />
          <TextField
            label="Favicon URL"
            value={state.branding.faviconUrl}
            onChange={(value) => updateBranding('faviconUrl', value)}
            placeholder="https://cdn.example.com/favicon.ico"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Theme & typography</h3>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Interface density</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              value={state.theme.density}
              onChange={(event) => updateTheme('density', event.target.value)}
              disabled={disabled}
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
              <option value="expanded">Expanded</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Border radius</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              value={state.theme.borderRadius}
              onChange={(event) => updateTheme('borderRadius', event.target.value)}
              disabled={disabled}
            >
              <option value="sharp">Sharp</option>
              <option value="rounded">Rounded</option>
              <option value="pill">Pill</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Colour mode</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              value={state.theme.mode}
              onChange={(event) => updateTheme('mode', event.target.value)}
              disabled={disabled}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">Follow system</option>
            </select>
          </label>
          <TextField
            label="Body font"
            value={state.theme.fontFamily}
            onChange={(value) => updateTheme('fontFamily', value)}
            placeholder="Inter"
            disabled={disabled}
          />
          <TextField
            label="Heading font"
            value={state.theme.headingFontFamily}
            onChange={(value) => updateTheme('headingFontFamily', value)}
            placeholder="Cal Sans"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Homepage hero</h3>
          <TextField
            label="Headline"
            value={state.hero.heading}
            onChange={(value) => updateHero('heading', value)}
            placeholder="Inspire learners at scale"
            disabled={disabled}
          />
          <TextAreaField
            label="Supporting copy"
            value={state.hero.subheading ?? ''}
            onChange={(value) => updateHero('subheading', value)}
            placeholder="Craft immersive cohort experiences..."
            disabled={disabled}
          />
          <TextField
            label="Primary CTA label"
            value={state.hero.primaryCtaLabel}
            onChange={(value) => updateHero('primaryCtaLabel', value)}
            placeholder="Explore programs"
            disabled={disabled}
          />
          <TextField
            label="Primary CTA link"
            value={state.hero.primaryCtaUrl}
            onChange={(value) => updateHero('primaryCtaUrl', value)}
            placeholder="/explore"
            disabled={disabled}
          />
          <TextField
            label="Secondary CTA label"
            value={state.hero.secondaryCtaLabel ?? ''}
            onChange={(value) => updateHero('secondaryCtaLabel', value)}
            placeholder="Book a demo"
            disabled={disabled}
          />
          <TextField
            label="Secondary CTA link"
            value={state.hero.secondaryCtaUrl ?? ''}
            onChange={(value) => updateHero('secondaryCtaUrl', value)}
            placeholder="/demo"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-4">
          <TextField
            label="Hero background image"
            description="Large hero illustration or photograph."
            value={state.hero.backgroundImageUrl ?? ''}
            onChange={(value) => updateHero('backgroundImageUrl', value)}
            placeholder="https://cdn.example.com/hero.jpg"
            disabled={disabled}
          />
          <TextField
            label="Hero background video"
            description="Optional autoplay muted video URL."
            value={state.hero.backgroundVideoUrl ?? ''}
            onChange={(value) => updateHero('backgroundVideoUrl', value)}
            placeholder="https://cdn.example.com/hero.mp4"
            disabled={disabled}
          />
          <div className="mt-2 rounded-2xl border border-dashed border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <PhotoIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Media library</p>
                <p className="text-xs text-slate-500">Showcase partner logos, press imagery, or promotional assets.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {state.mediaLibrary.length === 0 ? (
                <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
                  No media assets yet. Use “Add media asset” to begin curating your library.
                </p>
              ) : (
                state.mediaLibrary.map((asset) => (
                  <div key={asset.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <TextField
                      label="Label"
                      value={asset.label ?? ''}
                      onChange={(value) => updateAsset(asset.id, 'label', value)}
                      placeholder="Student success story"
                      disabled={disabled}
                    />
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">Asset type</span>
                      <select
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                        value={asset.type}
                        onChange={(event) => updateAsset(asset.id, 'type', event.target.value)}
                        disabled={disabled}
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </label>
                    <TextField
                      label="URL"
                      value={asset.url ?? ''}
                      onChange={(value) => updateAsset(asset.id, 'url', value)}
                      placeholder="https://cdn.example.com/promo.png"
                      disabled={disabled}
                    />
                    <TextField
                      label="Alt text"
                      value={asset.altText ?? ''}
                      onChange={(value) => updateAsset(asset.id, 'altText', value)}
                      placeholder="Learners collaborating in a workshop"
                      disabled={disabled}
                    />
                    <SettingsToggleField
                      label="Feature on marketing pages"
                      checked={Boolean(asset.featured)}
                      onChange={(value) => updateAsset(asset.id, 'featured', value)}
                      disabled={disabled}
                    />
                    <button
                      type="button"
                      className="self-start text-xs font-semibold text-rose-500 underline"
                      onClick={() => removeAsset(asset.id)}
                      disabled={disabled}
                    >
                      Remove asset
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

AppearanceSection.propTypes = {
  state: PropTypes.shape({
    branding: PropTypes.object,
    theme: PropTypes.object,
    hero: PropTypes.object,
    mediaLibrary: PropTypes.array
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  disabled: PropTypes.bool
};

function PreferencesSection({ state, onChange, onSubmit, saving = false, disabled = false }) {
  const updateLocalisation = (field, value) =>
    onChange((prev) => ({
      ...prev,
      localisation: {
        ...prev.localisation,
        [field]: value
      }
    }));

  const updateExperience = (field, value) =>
    onChange((prev) => ({
      ...prev,
      experience: {
        ...prev.experience,
        [field]: value
      }
    }));

  const updateCommunications = (field, value) =>
    onChange((prev) => ({
      ...prev,
      communications: {
        ...prev.communications,
        [field]: value
      }
    }));

  return (
    <SectionCard
      id="settings-preferences"
      icon={GlobeAltIcon}
      title="Website preferences"
      description="Fine-tune localisation defaults, user experience levers, and communication policies."
      onSubmit={async (event) => {
        event.preventDefault();
        const supported = state.localisation.supportedLanguages
          .join(',')
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
        try {
          await onSubmit({
            ...state,
            localisation: {
              ...state.localisation,
              supportedLanguages: supported
            }
          });
        } catch (error) {
          console.error('Failed to submit preferences form', error);
        }
      }}
      saving={saving}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Localisation</h3>
          <TextField
            label="Default language"
            value={state.localisation.defaultLanguage}
            onChange={(value) => updateLocalisation('defaultLanguage', value)}
            placeholder="en"
            disabled={disabled}
          />
          <TextField
            label="Supported languages"
            description="Comma separated codes (e.g. en, fr, es)."
            value={state.localisation.supportedLanguages.join(', ')}
            onChange={(value) => updateLocalisation('supportedLanguages', value.split(',').map((entry) => entry.trim()))}
            placeholder="en, fr"
            disabled={disabled}
          />
          <TextField
            label="Default currency"
            value={state.localisation.currency}
            onChange={(value) => updateLocalisation('currency', value)}
            placeholder="USD"
            disabled={disabled}
          />
          <TextField
            label="Platform timezone"
            value={state.localisation.timezone}
            onChange={(value) => updateLocalisation('timezone', value)}
            placeholder="UTC"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Experience controls</h3>
          <SettingsToggleField
            label="Enable personalised recommendations"
            description="Surface relevant courses, cohorts, and events on the marketplace."
            checked={state.experience.enableRecommendations}
            onChange={(value) => updateExperience('enableRecommendations', value)}
            disabled={disabled}
          />
          <SettingsToggleField
            label="Allow social sharing widgets"
            description="Expose share buttons across learning artefacts."
            checked={state.experience.enableSocialSharing}
            onChange={(value) => updateExperience('enableSocialSharing', value)}
            disabled={disabled}
          />
          <SettingsToggleField
            label="Enable live chat support"
            description="Display the concierge widget for authenticated learners."
            checked={state.experience.enableLiveChatSupport}
            onChange={(value) => updateExperience('enableLiveChatSupport', value)}
            disabled={disabled}
          />
          <SettingsToggleField
            label="Allow guest checkout"
            checked={state.experience.allowGuestCheckout}
            onChange={(value) => updateExperience('allowGuestCheckout', value)}
            disabled={disabled}
          />
          <SettingsToggleField
            label="Require email verification"
            checked={state.experience.requireEmailVerification}
            onChange={(value) => updateExperience('requireEmailVerification', value)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Communications</h3>
          <TextField
            label="Support email"
            value={state.communications.supportEmail}
            onChange={(value) => updateCommunications('supportEmail', value)}
            placeholder="support@edulure.io"
            disabled={disabled}
          />
          <TextField
            label="Support phone"
            value={state.communications.supportPhone ?? ''}
            onChange={(value) => updateCommunications('supportPhone', value)}
            placeholder="+1 202 555 0182"
            disabled={disabled}
          />
          <TextField
            label="Marketing email"
            value={state.communications.marketingEmail ?? ''}
            onChange={(value) => updateCommunications('marketingEmail', value)}
            placeholder="hello@edulure.io"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-4">
          <SettingsToggleField
            label="Send weekly digest"
            description="Deliver progress highlights and upcoming events to every learner."
            checked={state.communications.sendWeeklyDigest}
            onChange={(value) => updateCommunications('sendWeeklyDigest', value)}
            disabled={disabled}
          />
          <SettingsToggleField
            label="Send product updates"
            checked={state.communications.sendProductUpdates}
            onChange={(value) => updateCommunications('sendProductUpdates', value)}
            disabled={disabled}
          />
        </div>
      </div>
    </SectionCard>
  );
}

PreferencesSection.propTypes = {
  state: PropTypes.shape({
    localisation: PropTypes.object,
    experience: PropTypes.object,
    communications: PropTypes.object
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  disabled: PropTypes.bool
};

function SystemSection({ state, onChange, onSubmit, saving = false, disabled = false }) {
  const updateMaintenance = (field, value) =>
    onChange((prev) => ({
      ...prev,
      maintenanceMode: {
        ...prev.maintenanceMode,
        [field]: value
      }
    }));

  const updateOperations = (field, value) =>
    onChange((prev) => ({
      ...prev,
      operations: {
        ...prev.operations,
        [field]: value
      }
    }));

  const updateSecurity = (field, value) =>
    onChange((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        [field]: value
      }
    }));

  const updateObservability = (field, value) =>
    onChange((prev) => ({
      ...prev,
      observability: {
        ...prev.observability,
        [field]: value
      }
    }));

  return (
    <SectionCard
      id="settings-system"
      icon={ServerStackIcon}
      title="System settings"
      description="Orchestrate maintenance windows, retention policies, and operational safeguards."
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await onSubmit(state);
        } catch (error) {
          console.error('Failed to submit system form', error);
        }
      }}
      saving={saving}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Maintenance</h3>
          <SettingsToggleField
            label="Enable maintenance mode"
            description="Temporarily pause learner logins and purchases."
            checked={state.maintenanceMode.enabled}
            onChange={(value) => updateMaintenance('enabled', value)}
            disabled={disabled}
          />
          <TextAreaField
            label="Maintenance notice"
            value={state.maintenanceMode.message ?? ''}
            onChange={(value) => updateMaintenance('message', value)}
            placeholder="We'll be right back – planned upgrades underway."
            disabled={disabled}
          />
          <TextField
            label="Scheduled window"
            value={state.maintenanceMode.scheduledWindow ?? ''}
            onChange={(value) => updateMaintenance('scheduledWindow', value)}
            placeholder="2025-02-01T00:00Z → 2025-02-01T04:00Z"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Operations</h3>
          <TextField
            label="Primary timezone"
            value={state.operations.timezone}
            onChange={(value) => updateOperations('timezone', value)}
            placeholder="UTC"
            disabled={disabled}
          />
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Weekly backup day</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              value={state.operations.weeklyBackupDay}
              onChange={(event) => updateOperations('weeklyBackupDay', event.target.value)}
              disabled={disabled}
            >
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <option key={day} value={day}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <SettingsToggleField
            label="Auto-apply security updates"
            checked={state.operations.autoUpdatesEnabled}
            onChange={(value) => updateOperations('autoUpdatesEnabled', value)}
            disabled={disabled}
          />
          <TextField
            label="Data retention (days)"
            type="number"
            value={state.operations.dataRetentionDays}
            onChange={(value) => updateOperations('dataRetentionDays', Number(value))}
            placeholder="365"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Security</h3>
          <SettingsToggleField
            label="Enforce MFA for administrators"
            checked={state.security.enforceMfaForAdmins}
            onChange={(value) => updateSecurity('enforceMfaForAdmins', value)}
            disabled={disabled}
          />
          <TextField
            label="Session timeout (minutes)"
            type="number"
            value={state.security.sessionTimeoutMinutes}
            onChange={(value) => updateSecurity('sessionTimeoutMinutes', Number(value))}
            placeholder="60"
            disabled={disabled}
          />
          <SettingsToggleField
            label="Allow session resume"
            description="Let learners reconnect to in-progress sessions after connection drops."
            checked={state.security.allowSessionResume}
            onChange={(value) => updateSecurity('allowSessionResume', value)}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Observability</h3>
          <SettingsToggleField
            label="Enable audit trails"
            checked={state.observability.enableAuditTrail}
            onChange={(value) => updateObservability('enableAuditTrail', value)}
            disabled={disabled}
          />
          <TextField
            label="Error reporting email"
            value={state.observability.errorReportingEmail ?? ''}
            onChange={(value) => updateObservability('errorReportingEmail', value)}
            placeholder="ops@edulure.io"
            disabled={disabled}
          />
          <SettingsToggleField
            label="Notify on integration failures"
            checked={state.observability.notifyOnIntegrationFailure}
            onChange={(value) => updateObservability('notifyOnIntegrationFailure', value)}
            disabled={disabled}
          />
        </div>
      </div>
    </SectionCard>
  );
}

SystemSection.propTypes = {
  state: PropTypes.shape({
    maintenanceMode: PropTypes.object,
    operations: PropTypes.object,
    security: PropTypes.object,
    observability: PropTypes.object
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  disabled: PropTypes.bool
};

function IntegrationsSection({ state, onChange, onSubmit, saving = false, disabled = false }) {
  const addWebhook = () =>
    onChange((prev) => ({
      ...prev,
      webhooks: [
        ...prev.webhooks,
        {
          id: generateId('webhook'),
          name: 'New destination',
          url: '',
          events: [],
          secret: '',
          active: true
        }
      ]
    }));

  const updateWebhook = (webhookId, field, value) =>
    onChange((prev) => ({
      ...prev,
      webhooks: prev.webhooks.map((hook) =>
        hook.id === webhookId
          ? {
              ...hook,
              [field]: field === 'events' ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : value
            }
          : hook
      )
    }));

  const removeWebhook = (webhookId) =>
    onChange((prev) => ({
      ...prev,
      webhooks: prev.webhooks.filter((hook) => hook.id !== webhookId)
    }));

  const addService = () =>
    onChange((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          id: generateId('service'),
          provider: 'New integration',
          status: 'active',
          connectedAccount: '',
          notes: ''
        }
      ]
    }));

  const updateService = (serviceId, field, value) =>
    onChange((prev) => ({
      ...prev,
      services: prev.services.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              [field]: value
            }
          : service
      )
    }));

  const removeService = (serviceId) =>
    onChange((prev) => ({
      ...prev,
      services: prev.services.filter((service) => service.id !== serviceId)
    }));

  return (
    <SectionCard
      id="settings-integrations"
      icon={AdjustmentsHorizontalIcon}
      title="Integration settings"
      description="Manage webhook destinations, SaaS connectors, and operational runbooks."
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await onSubmit({
            webhooks: state.webhooks,
            services: state.services
          });
        } catch (error) {
          console.error('Failed to submit integration form', error);
        }
      }}
      saving={saving}
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-xs font-semibold text-primary underline"
            onClick={addWebhook}
            disabled={disabled}
          >
            Add webhook
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-primary underline"
            onClick={addService}
            disabled={disabled}
          >
            Add integration
          </button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Outgoing webhooks</h3>
          {state.webhooks.length === 0 ? (
            <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
              No webhook subscriptions configured yet.
            </p>
          ) : (
            state.webhooks.map((webhook) => (
              <div key={webhook.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <TextField
                  label="Destination name"
                  value={webhook.name ?? ''}
                  onChange={(value) => updateWebhook(webhook.id, 'name', value)}
                  placeholder="HubSpot"
                  disabled={disabled}
                />
                <TextField
                  label="Endpoint URL"
                  value={webhook.url ?? ''}
                  onChange={(value) => updateWebhook(webhook.id, 'url', value)}
                  placeholder="https://hooks.example.com/crm"
                  disabled={disabled}
                />
                <TextField
                  label="Subscribed events"
                  description="Comma separated event keys."
                  value={(webhook.events ?? []).join(', ')}
                  onChange={(value) => updateWebhook(webhook.id, 'events', value)}
                  placeholder="enrolment.created, payment.completed"
                  disabled={disabled}
                />
                <TextField
                  label="Signing secret"
                  value={webhook.secret ?? ''}
                  onChange={(value) => updateWebhook(webhook.id, 'secret', value)}
                  placeholder="whsec_***"
                  disabled={disabled}
                />
                <SettingsToggleField
                  label="Active"
                  checked={Boolean(webhook.active)}
                  onChange={(value) => updateWebhook(webhook.id, 'active', value)}
                  disabled={disabled}
                />
                <button
                  type="button"
                  className="self-start text-xs font-semibold text-rose-500 underline"
                  onClick={() => removeWebhook(webhook.id)}
                  disabled={disabled}
                >
                  Remove webhook
                </button>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Connected services</h3>
          {state.services.length === 0 ? (
            <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
              No third-party services connected yet.
            </p>
          ) : (
            state.services.map((service) => (
              <div key={service.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <TextField
                  label="Provider"
                  value={service.provider ?? ''}
                  onChange={(value) => updateService(service.id, 'provider', value)}
                  placeholder="Stripe"
                  disabled={disabled}
                />
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">Status</span>
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                    value={service.status ?? 'active'}
                    onChange={(event) => updateService(service.id, 'status', event.target.value)}
                    disabled={disabled}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="error">Error</option>
                  </select>
                </label>
                <TextField
                  label="Connected account"
                  value={service.connectedAccount ?? ''}
                  onChange={(value) => updateService(service.id, 'connectedAccount', value)}
                  placeholder="acct_1234"
                  disabled={disabled}
                />
                <TextAreaField
                  label="Operational notes"
                  value={service.notes ?? ''}
                  onChange={(value) => updateService(service.id, 'notes', value)}
                  placeholder="Nightly reconciliation at 02:00 UTC."
                  disabled={disabled}
                />
                <button
                  type="button"
                  className="self-start text-xs font-semibold text-rose-500 underline"
                  onClick={() => removeService(service.id)}
                  disabled={disabled}
                >
                  Remove integration
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </SectionCard>
  );
}

IntegrationsSection.propTypes = {
  state: PropTypes.shape({
    webhooks: PropTypes.array,
    services: PropTypes.array
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  disabled: PropTypes.bool
};

function ThirdPartySection({ state, onChange, onSubmit, saving = false, disabled = false }) {
  const addCredential = () =>
    onChange((prev) => ({
      ...prev,
      credentials: [
        ...prev.credentials,
        {
          id: generateId('credential'),
          provider: 'New provider',
          environment: 'production',
          alias: '',
          ownerEmail: '',
          status: 'active',
          maskedKey: '',
          createdAt: new Date().toISOString(),
          lastRotatedAt: ''
        }
      ]
    }));

  const updateCredential = (credentialId, field, value) =>
    onChange((prev) => ({
      ...prev,
      credentials: prev.credentials.map((credential) =>
        credential.id === credentialId
          ? {
              ...credential,
              [field]: value
            }
          : credential
      )
    }));

  const removeCredential = (credentialId) =>
    onChange((prev) => ({
      ...prev,
      credentials: prev.credentials.filter((credential) => credential.id !== credentialId)
    }));

  return (
    <SectionCard
      id="settings-third-party"
      icon={KeyIcon}
      title="Third-party API credentials"
      description="Track, rotate, and document external API credentials across environments."
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await onSubmit(state);
        } catch (error) {
          console.error('Failed to submit third-party form', error);
        }
      }}
      saving={saving}
      actions={
        <button
          type="button"
          className="text-xs font-semibold text-primary underline"
          onClick={addCredential}
          disabled={disabled}
        >
          Add credential
        </button>
      }
    >
      {state.credentials.length === 0 ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
          No credentials captured yet. Use “Add credential” to begin documenting access tokens.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {state.credentials.map((credential) => (
            <div key={credential.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <TextField
                label="Provider"
                value={credential.provider ?? ''}
                onChange={(value) => updateCredential(credential.id, 'provider', value)}
                placeholder="Salesforce"
                disabled={disabled}
              />
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Environment</span>
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  value={credential.environment ?? 'production'}
                  onChange={(event) => updateCredential(credential.id, 'environment', event.target.value)}
                  disabled={disabled}
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="sandbox">Sandbox</option>
                </select>
              </label>
              <TextField
                label="Alias"
                value={credential.alias ?? ''}
                onChange={(value) => updateCredential(credential.id, 'alias', value)}
                placeholder="Core CRM key"
                disabled={disabled}
              />
              <TextField
                label="Owner email"
                value={credential.ownerEmail ?? ''}
                onChange={(value) => updateCredential(credential.id, 'ownerEmail', value)}
                placeholder="ops@edulure.io"
                disabled={disabled}
              />
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Status</span>
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  value={credential.status ?? 'active'}
                  onChange={(event) => updateCredential(credential.id, 'status', event.target.value)}
                  disabled={disabled}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                  <option value="revoked">Revoked</option>
                </select>
              </label>
              <TextField
                label="Masked key"
                value={credential.maskedKey ?? ''}
                onChange={(value) => updateCredential(credential.id, 'maskedKey', value)}
                placeholder="****6789"
                disabled={disabled}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Created at"
                  value={credential.createdAt ?? ''}
                  onChange={(value) => updateCredential(credential.id, 'createdAt', value)}
                  placeholder="2025-01-10"
                  disabled={disabled}
                />
                <TextField
                  label="Last rotated"
                  value={credential.lastRotatedAt ?? ''}
                  onChange={(value) => updateCredential(credential.id, 'lastRotatedAt', value)}
                  placeholder="2025-02-01"
                  disabled={disabled}
                />
              </div>
              <TextAreaField
                label="Operational notes"
                value={credential.notes ?? ''}
                onChange={(value) => updateCredential(credential.id, 'notes', value)}
                placeholder="Rotate quarterly. Used by Growth automation."
                disabled={disabled}
              />
              <button
                type="button"
                className="self-start text-xs font-semibold text-rose-500 underline"
                onClick={() => removeCredential(credential.id)}
                disabled={disabled}
              >
                Remove credential
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

ThirdPartySection.propTypes = {
  state: PropTypes.shape({
    credentials: PropTypes.array
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  disabled: PropTypes.bool
};

export default function DashboardSettings() {
  const { session } = useAuth();
  const outletContext = useOutletContext();
  const token = session?.tokens?.accessToken ?? outletContext?.token;

  const appearance = useSettingsSection({
    token,
    fetcher: fetchAppearanceSettings,
    updater: updateAppearanceSettings,
    fallback: FALLBACK_APPEARANCE,
    sectionName: 'appearance settings'
  });
  const preferences = useSettingsSection({
    token,
    fetcher: fetchPreferenceSettings,
    updater: updatePreferenceSettings,
    fallback: FALLBACK_PREFERENCES,
    sectionName: 'preference settings'
  });
  const system = useSettingsSection({
    token,
    fetcher: fetchSystemSettings,
    updater: updateSystemSettings,
    fallback: FALLBACK_SYSTEM,
    sectionName: 'system settings'
  });
  const integrations = useSettingsSection({
    token,
    fetcher: fetchIntegrationSettings,
    updater: updateIntegrationSettings,
    fallback: FALLBACK_INTEGRATIONS,
    sectionName: 'integration settings'
  });
  const thirdParty = useSettingsSection({
    token,
    fetcher: fetchThirdPartySettings,
    updater: updateThirdPartySettings,
    fallback: FALLBACK_THIRD_PARTY,
    sectionName: 'third-party credentials'
  });

  const sections = useMemo(
    () => [
      { key: 'appearance', controller: appearance },
      { key: 'preferences', controller: preferences },
      { key: 'system', controller: system },
      { key: 'integrations', controller: integrations },
      { key: 'third-party', controller: thirdParty }
    ],
    [appearance, preferences, system, integrations, thirdParty]
  );

  const isLoadingAny = sections.some((entry) => entry.controller.loading);
  const isSavingAny = sections.some((entry) => entry.controller.saving);

  const unsavedSections = useMemo(
    () =>
      sections
        .map((entry) => {
          const changes = computeChangedSegments(
            entry.key,
            entry.controller.baseline,
            entry.controller.data
          );
          return {
            key: entry.key,
            label: SECTION_LABELS[entry.key] ?? entry.key,
            anchor: SECTION_ANCHORS[entry.key] ?? '',
            changes,
            reset: entry.controller.reset
          };
        })
        .filter((entry) => entry.changes.length > 0),
    [sections]
  );

  const totalPendingSegments = useMemo(
    () => unsavedSections.reduce((sum, entry) => sum + entry.changes.length, 0),
    [unsavedSections]
  );

  const discardAll = useCallback(() => {
    if (isSavingAny) {
      return;
    }
    unsavedSections.forEach((entry) => {
      if (typeof entry.reset === 'function') {
        entry.reset();
      }
    });
  }, [unsavedSections, isSavingAny]);

  return (
    <SettingsLayout
      eyebrow="Admin"
      title="Settings control centre"
      description="Configure how your brand presents to learners, how the platform behaves, and how external systems integrate with your academy."
      actions={
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
          onClick={() => {
            appearance.refresh();
            preferences.refresh();
            system.refresh();
            integrations.refresh();
            thirdParty.refresh();
          }}
        >
          Refresh all
        </button>
      }
    >

      {!isLoadingAny && unsavedSections.length ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Unsaved updates</p>
              <h2 className="text-base font-semibold text-amber-900">
                {totalPendingSegments === 1
                  ? '1 configuration update awaiting review'
                  : `${totalPendingSegments} configuration updates awaiting review`}
              </h2>
              <p className="mt-1 text-sm text-amber-700">
                Save each section to publish your changes or discard items directly from this summary.
              </p>
            </div>
            <button
              type="button"
              className="self-start text-xs font-semibold text-amber-700 underline disabled:text-amber-300"
              onClick={discardAll}
              disabled={isSavingAny}
            >
              Discard all changes
            </button>
          </div>
          <ul className="mt-4 space-y-3">
            {unsavedSections.map((section) => (
              <li
                key={section.key}
                className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-white/90 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-amber-900">{section.label}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-amber-800">
                    {section.changes.map((change, index) => (
                      <li key={`${section.key}-${index}`}>{change}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-start">
                  {section.anchor ? (
                    <a className="text-xs font-semibold text-primary underline" href={`#${section.anchor}`}>
                      Review section
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs font-semibold text-amber-700 underline disabled:text-amber-300"
                    onClick={() => section.reset?.()}
                    disabled={isSavingAny}
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isLoadingAny ? (
        <div className="flex items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/80 p-8 text-sm text-slate-500">
          Loading your latest configuration…
        </div>
      ) : null}

      {sections
        .filter((entry) => entry.controller.feedback)
        .map((entry) => (
          <DashboardActionFeedback
            key={entry.key}
            feedback={entry.controller.feedback}
            onDismiss={() => entry.controller.setFeedback(null)}
          />
        ))}

      <AppearanceSection
        state={appearance.data}
        onChange={appearance.setData}
        onSubmit={appearance.save}
        saving={appearance.saving}
        disabled={appearance.saving}
      />

      <PreferencesSection
        state={preferences.data}
        onChange={preferences.setData}
        onSubmit={preferences.save}
        saving={preferences.saving}
        disabled={preferences.saving}
      />

      <SystemSection
        state={system.data}
        onChange={system.setData}
        onSubmit={system.save}
        saving={system.saving}
        disabled={system.saving}
      />

      <IntegrationsSection
        state={integrations.data}
        onChange={integrations.setData}
        onSubmit={integrations.save}
        saving={integrations.saving}
        disabled={integrations.saving}
      />

      <ThirdPartySection
        state={thirdParty.data}
        onChange={thirdParty.setData}
        onSubmit={thirdParty.save}
        saving={thirdParty.saving}
        disabled={thirdParty.saving}
      />
    </SettingsLayout>
  );
}

