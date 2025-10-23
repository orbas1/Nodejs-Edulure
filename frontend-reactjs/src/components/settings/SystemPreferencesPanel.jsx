import PropTypes from 'prop-types';

import SettingsAccordion from './SettingsAccordion.jsx';
import SettingsToggleField from './SettingsToggleField.jsx';
import {
  ADS_DATA_USAGE_COPY,
  FALLBACK_RECOMMENDATION_PREVIEW,
  INTERFACE_DENSITIES,
  SUPPORTED_LANGUAGES,
  SUPPORTED_TIMEZONES
} from '../../hooks/useSystemPreferencesForm.js';

export default function SystemPreferencesPanel({
  form,
  recommendationPreview,
  recommendedTopicsInputValue,
  adPersonalisationEnabled,
  onSubmit,
  onSavePersonalisation,
  onInputChange,
  onSystemToggle,
  onPreferenceToggle,
  onAdPersonalisationChange,
  disableActions,
  isSaving
}) {
  const previewItems = recommendationPreview?.length ? recommendationPreview : FALLBACK_RECOMMENDATION_PREVIEW;

  return (
    <>
      <SettingsAccordion
        id="learner-system-preferences"
        title="System preferences"
        description="Configure accessibility, localisation, and notification cadence across the learner experience."
        actions={<span className="dashboard-kicker text-primary hidden sm:inline">Personalised</span>}
        defaultOpen
      >
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Language
              <select
                name="language"
                value={form.language}
                onChange={onInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {SUPPORTED_LANGUAGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Region
              <input
                name="region"
                value={form.region}
                onChange={onInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Time zone
              <select
                name="timezone"
                value={form.timezone}
                onChange={onInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {SUPPORTED_TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SettingsToggleField
              name="notificationsEnabled"
              label="Email notifications"
              description="Receive workflow, finance, and community alerts."
              checked={form.notificationsEnabled}
              onChange={(value) => onSystemToggle('notificationsEnabled', value)}
              disabled={disableActions}
            />
            <SettingsToggleField
              name="digestEnabled"
              label="Weekly digest"
              description="Summarise learning progress and recommendations."
              checked={form.digestEnabled}
              onChange={(value) => onSystemToggle('digestEnabled', value)}
              disabled={disableActions}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SettingsToggleField
              name="autoPlayMedia"
              label="Auto-play media"
              description="Automatically start videos and podcasts."
              checked={form.autoPlayMedia}
              onChange={(value) => onSystemToggle('autoPlayMedia', value)}
              disabled={disableActions}
            />
            <SettingsToggleField
              name="highContrast"
              label="High contrast"
              description="Enhance contrast for improved readability."
              checked={form.highContrast}
              onChange={(value) => onSystemToggle('highContrast', value)}
              disabled={disableActions}
            />
            <SettingsToggleField
              name="reducedMotion"
              label="Reduce motion"
              description="Minimise animations for sensitive users."
              checked={form.reducedMotion}
              onChange={(value) => onSystemToggle('reducedMotion', value)}
              disabled={disableActions}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Interface density
              <select
                name="preferences.interfaceDensity"
                value={form.preferences.interfaceDensity}
                onChange={onInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {INTERFACE_DENSITIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Subtitle language
              <select
                name="preferences.subtitleLanguage"
                value={form.preferences.subtitleLanguage}
                onChange={onInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {SUPPORTED_LANGUAGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="self-stretch">
              <SettingsToggleField
                name="preferences.audioDescription"
                label="Audio description"
                description="Enable descriptive narration in supported lessons."
                checked={Boolean(form.preferences.audioDescription)}
                onChange={(value) => onPreferenceToggle('audioDescription', value)}
                disabled={disableActions}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="dashboard-primary-pill" disabled={disableActions}>
              {isSaving ? 'Saving…' : 'Save system preferences'}
            </button>
          </div>
        </form>
      </SettingsAccordion>

      <SettingsAccordion
        id="learner-personalisation"
        title="Personalisation"
        description="Tune recommendations, analytics consent, and sponsor visibility."
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recommended preview</h3>
            <p className="mt-2 text-sm text-slate-600">
              Learner dashboards surface these sample items to demonstrate how your academy will highlight relevant content.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {previewItems.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="overflow-hidden rounded-xl bg-slate-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-32 w-full object-cover" />
                    ) : (
                      <div className="flex h-32 items-center justify-center text-xs font-medium text-slate-500">
                        Preview
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.category}</p>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    {item.descriptor ? <p className="mt-1 text-xs text-slate-500">{item.descriptor}</p> : null}
                  </div>
                  {item.route ? (
                    <a href={item.route} className="text-xs font-semibold text-primary hover:underline">
                      Open
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SettingsToggleField
              name="preferences.analyticsOptIn"
              label="Analytics insights"
              description="Share anonymous usage analytics to improve study guidance and community programming."
              checked={Boolean(form.preferences.analyticsOptIn)}
              onChange={(value) => onPreferenceToggle('analyticsOptIn', value)}
              disabled={disableActions}
            />
            <SettingsToggleField
              name="preferences.adPersonalisation"
              label="Personalised sponsors"
              description="Allow Edulure Ads to align sponsors with your learning interests."
              checked={adPersonalisationEnabled}
              onChange={onAdPersonalisationChange}
              disabled={disableActions}
            />
            <SettingsToggleField
              name="preferences.sponsoredHighlights"
              label="Sponsored highlights"
              description="Feature partner resources inside recommendation carousels."
              checked={Boolean(form.preferences.sponsoredHighlights)}
              onChange={(value) => onPreferenceToggle('sponsoredHighlights', value)}
              disabled={disableActions}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
            {ADS_DATA_USAGE_COPY}
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Preferred recommendation topics
            <input
              name="preferences.recommendedTopics"
              value={recommendedTopicsInputValue}
              onChange={onInputChange}
              placeholder="community-building, automation, retention"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={disableActions}
            />
            <span className="text-xs text-slate-500">
              Separate topics with commas to tailor the learning spotlight.
            </span>
          </label>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Saving personalisation updates applies the same system preference controls.</p>
            <button
              type="button"
              className="dashboard-primary-pill"
              onClick={onSavePersonalisation}
              disabled={disableActions}
            >
              {isSaving ? 'Saving…' : 'Save personalisation'}
            </button>
          </div>
        </div>
      </SettingsAccordion>
    </>
  );
}

SystemPreferencesPanel.propTypes = {
  form: PropTypes.shape({
    language: PropTypes.string,
    region: PropTypes.string,
    timezone: PropTypes.string,
    notificationsEnabled: PropTypes.bool,
    digestEnabled: PropTypes.bool,
    autoPlayMedia: PropTypes.bool,
    highContrast: PropTypes.bool,
    reducedMotion: PropTypes.bool,
    preferences: PropTypes.shape({
      interfaceDensity: PropTypes.string,
      subtitleLanguage: PropTypes.string,
      audioDescription: PropTypes.bool,
      analyticsOptIn: PropTypes.bool,
      adPersonalisation: PropTypes.bool,
      sponsoredHighlights: PropTypes.bool
    })
  }).isRequired,
  recommendationPreview: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      category: PropTypes.string,
      descriptor: PropTypes.string,
      imageUrl: PropTypes.string,
      route: PropTypes.string
    })
  ),
  recommendedTopicsInputValue: PropTypes.string.isRequired,
  adPersonalisationEnabled: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onSavePersonalisation: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onSystemToggle: PropTypes.func.isRequired,
  onPreferenceToggle: PropTypes.func.isRequired,
  onAdPersonalisationChange: PropTypes.func.isRequired,
  disableActions: PropTypes.bool,
  isSaving: PropTypes.bool
};

SystemPreferencesPanel.defaultProps = {
  recommendationPreview: undefined,
  disableActions: false,
  isSaving: false
};
