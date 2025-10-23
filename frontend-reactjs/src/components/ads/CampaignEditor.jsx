import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMediaUpload } from '../../hooks/useMediaUpload.js';
import CampaignPreview from './CampaignPreview.jsx';
import CampaignOptimizationChecklist from './CampaignOptimizationChecklist.jsx';

const DEFAULT_PLACEMENTS = [
  { context: 'global_feed', label: 'Discovery feed card', surface: 'Discovery Feed', slot: 'feed-inline' },
  { context: 'community_feed', label: 'Community feed highlight', surface: 'Community Feed', slot: 'feed-community' },
  { context: 'search', label: 'Explorer search result', surface: 'Explorer Search', slot: 'search-top' },
  { context: 'course_live', label: 'Live classroom interstitial', surface: 'Live Course', slot: 'course-live' }
];

const BRAND_SAFETY_OPTIONS = [
  { value: 'standard', label: 'Standard inventory' },
  { value: 'education', label: 'Education friendly' },
  { value: 'financial', label: 'Financial services compliant' },
  { value: 'youth', label: 'Youth / family audiences' },
  { value: 'sensitive', label: 'Sensitive topics excluded' }
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
];

const OBJECTIVE_OPTIONS = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'leads', label: 'Lead generation' },
  { value: 'conversions', label: 'Conversions' }
];

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatList(value) {
  return Array.isArray(value) ? value.join(', ') : '';
}

function createInitialState(campaign, placementOptions) {
  const placementContexts = Array.isArray(campaign?.placements)
    ? campaign.placements
        .map((placement) => placement?.context)
        .filter(Boolean)
    : [];

  const brandSafety = campaign?.brandSafety ?? { categories: ['standard'], excludedTopics: [], reviewNotes: null };
  const preview = campaign?.preview ?? { theme: 'light', accent: 'primary' };

  return {
    name: campaign?.name ?? '',
    status: campaign?.status ?? 'draft',
    objective: campaign?.objective ?? 'traffic',
    budgetDailyCents: campaign?.budget?.dailyCents ?? 5000,
    budgetCurrency: campaign?.budget?.currency ?? 'USD',
    startAt: campaign?.schedule?.startAt ? campaign.schedule.startAt.slice(0, 10) : '',
    endAt: campaign?.schedule?.endAt ? campaign.schedule.endAt.slice(0, 10) : '',
    targetingKeywords: formatList(campaign?.targeting?.keywords ?? []),
    targetingAudiences: formatList(campaign?.targeting?.audiences ?? []),
    targetingLocations: formatList(campaign?.targeting?.locations ?? []),
    targetingLanguages: formatList(campaign?.targeting?.languages ?? ['EN']),
    creativeHeadline: campaign?.creative?.headline ?? '',
    creativeDescription: campaign?.creative?.description ?? '',
    creativeUrl: campaign?.creative?.url ?? '',
    creativeAsset: campaign?.creative?.asset ?? null,
    placements: placementContexts.length
      ? placementContexts
      : placementOptions.map((placement) => placement.context).slice(0, 1),
    brandSafetyCategories: Array.isArray(brandSafety.categories) && brandSafety.categories.length
      ? brandSafety.categories
      : ['standard'],
    brandSafetyExcludedTopics: formatList(brandSafety.excludedTopics ?? []),
    brandSafetyReviewNotes: brandSafety.reviewNotes ?? '',
    previewTheme: preview.theme ?? 'light',
    previewAccent: preview.accent ?? 'primary'
  };
}

function mergePlacementOptions(available = []) {
  const map = new Map(DEFAULT_PLACEMENTS.map((placement) => [placement.context, placement]));
  for (const placement of available) {
    if (!placement || !placement.context) continue;
    const base = map.get(placement.context) ?? { context: placement.context };
    map.set(placement.context, { ...base, ...placement });
  }
  return Array.from(map.values());
}

export default function CampaignEditor({
  initialCampaign,
  availablePlacements,
  onSubmit,
  onCancel,
  submitting,
  token,
  mode
}) {
  const placementOptions = useMemo(() => mergePlacementOptions(availablePlacements), [availablePlacements]);
  const placementLookup = useMemo(
    () => new Map(placementOptions.map((placement) => [placement.context, placement])),
    [placementOptions]
  );
  const [state, setState] = useState(() => createInitialState(initialCampaign, placementOptions));
  const { upload, uploading, error: uploadError } = useMediaUpload({ token, kind: 'image', visibility: 'public' });

  useEffect(() => {
    setState(createInitialState(initialCampaign, placementOptions));
  }, [initialCampaign, placementOptions]);

  const handleFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setState((current) => ({ ...current, [name]: value }));
  }, []);

  const handlePlacementToggle = useCallback(
    (context) => {
      setState((current) => {
        const exists = current.placements.includes(context);
        const next = exists
          ? current.placements.filter((placement) => placement !== context)
          : [...current.placements, context];
        return { ...current, placements: next };
      });
    },
    []
  );

  const handleBrandSafetyToggle = useCallback((value) => {
    setState((current) => {
      const exists = current.brandSafetyCategories.includes(value);
      const next = exists
        ? current.brandSafetyCategories.filter((category) => category !== value)
        : [...current.brandSafetyCategories, value];
      return { ...current, brandSafetyCategories: next.length ? next : ['standard'] };
    });
  }, []);

  const handleAssetUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const asset = await upload(file);
        setState((current) => ({ ...current, creativeAsset: asset }));
      } catch (error) {
        console.error('Failed to upload creative asset', error);
      }
    },
    [upload]
  );

  const pacingInsight = useMemo(() => {
    const forecastDaily = initialCampaign?.metrics?.forecast?.expectedDailySpendCents ?? null;
    if (!forecastDaily) {
      return null;
    }
    const planned = Number(state.budgetDailyCents ?? 0);
    if (!Number.isFinite(planned)) return null;
    const delta = planned - forecastDaily;
    if (Math.abs(delta) < forecastDaily * 0.05) {
      return 'Budget pacing looks healthy based on the latest seven-day average.';
    }
    if (delta < 0) {
      return `Increase the daily budget by ${Math.round(Math.abs(delta))}¢ to align with current delivery.`;
    }
    return `Reduce daily spend by ${Math.round(delta)}¢ to prevent pacing overages.`;
  }, [initialCampaign?.metrics?.forecast?.expectedDailySpendCents, state.budgetDailyCents]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!onSubmit) return;

      const payload = {
        name: state.name.trim(),
        status: state.status,
        objective: state.objective,
        budget: {
          currency: state.budgetCurrency,
          dailyCents: Number(state.budgetDailyCents ?? 0)
        },
        schedule: {
          startAt: state.startAt ? new Date(state.startAt).toISOString() : null,
          endAt: state.endAt ? new Date(state.endAt).toISOString() : null
        },
        targeting: {
          keywords: parseList(state.targetingKeywords),
          audiences: parseList(state.targetingAudiences),
          locations: parseList(state.targetingLocations),
          languages: parseList(state.targetingLanguages)
        },
        creative: {
          headline: state.creativeHeadline.trim() || null,
          description: state.creativeDescription.trim() || null,
          url: state.creativeUrl.trim() || null,
          asset: state.creativeAsset
        },
        placements: state.placements.map((context) => placementLookup.get(context) ?? { context }),
        brandSafety: {
          categories: state.brandSafetyCategories,
          excludedTopics: parseList(state.brandSafetyExcludedTopics),
          reviewNotes: state.brandSafetyReviewNotes.trim() || null
        },
        preview: {
          theme: state.previewTheme,
          accent: state.previewAccent
        }
      };

      await onSubmit(payload);
    },
    [onSubmit, placementLookup, state]
  );

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        <header>
          <h2 className="text-lg font-semibold">{mode === 'edit' ? 'Update campaign' : 'Create campaign'}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure delivery, creative, and guardrails once—Edulure Ads reuses the same contract across feed and explorer
            surfaces.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Campaign name
            <input
              required
              name="name"
              value={state.name}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              name="status"
              value={state.status}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Objective
            <select
              name="objective"
              value={state.objective}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {OBJECTIVE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Daily budget (¢)
            <input
              name="budgetDailyCents"
              type="number"
              min="0"
              value={state.budgetDailyCents}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Currency
            <input
              name="budgetCurrency"
              value={state.budgetCurrency}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Start date
            <input
              type="date"
              name="startAt"
              value={state.startAt}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            End date
            <input
              type="date"
              name="endAt"
              value={state.endAt}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <fieldset className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Placements</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {placementOptions.map((placement) => {
              const checked = state.placements.includes(placement.context);
              return (
                <label
                  key={placement.context}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    checked ? 'border-primary/70 bg-primary/5' : 'border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handlePlacementToggle(placement.context)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-slate-700">{placement.label}</span>
                    <span className="block text-xs text-slate-500">{placement.surface}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Targeting</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Keywords
              <input
                name="targetingKeywords"
                value={state.targetingKeywords}
                onChange={handleFieldChange}
                placeholder="product strategy, ads, monetisation"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Audiences
              <input
                name="targetingAudiences"
                value={state.targetingAudiences}
                onChange={handleFieldChange}
                placeholder="Creators, Instructional designers"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Locations
              <input
                name="targetingLocations"
                value={state.targetingLocations}
                onChange={handleFieldChange}
                placeholder="United States, Canada"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Languages
              <input
                name="targetingLanguages"
                value={state.targetingLanguages}
                onChange={handleFieldChange}
                placeholder="English, Spanish"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Creative</legend>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Headline
              <input
                name="creativeHeadline"
                value={state.creativeHeadline}
                onChange={handleFieldChange}
                placeholder="Launch elite cohorts in 60 days"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Destination URL
              <input
                name="creativeUrl"
                value={state.creativeUrl}
                onChange={handleFieldChange}
                placeholder="https://edulure.test/campaigns/launch"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
              Description
              <textarea
                name="creativeDescription"
                value={state.creativeDescription}
                onChange={handleFieldChange}
                rows={3}
                placeholder="Partner with Edulure producers to launch fully-managed learning communities."
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Creative asset
              <input
                type="file"
                accept="image/*"
                onChange={handleAssetUpload}
                className="mt-1 block w-full text-sm"
              />
              {uploading && <span className="mt-1 block text-xs text-slate-500">Uploading creative…</span>}
              {uploadError && (
                <span className="mt-1 block text-xs text-rose-500">{uploadError.message ?? 'Upload failed'}</span>
              )}
            </label>
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
              Provide a 1200×628 hero or 1:1 square image. Creative uploads reuse the Media Upload controller used across marketing surfaces, so existing caching and CDN policies apply.
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Brand safety</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {BRAND_SAFETY_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={state.brandSafetyCategories.includes(option.value)}
                  onChange={() => handleBrandSafetyToggle(option.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-slate-700">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.value === 'standard' ? 'Default guardrail for network inventory.' : 'Adds extra review filters for this campaign.'}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Excluded topics
            <input
              name="brandSafetyExcludedTopics"
              value={state.brandSafetyExcludedTopics}
              onChange={handleFieldChange}
              placeholder="crypto, speculative investing"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Review notes
            <textarea
              name="brandSafetyReviewNotes"
              value={state.brandSafetyReviewNotes}
              onChange={handleFieldChange}
              rows={2}
              placeholder="Flag finance funnel variations for manual review."
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </fieldset>
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CampaignPreview
          headline={state.creativeHeadline}
          description={state.creativeDescription}
          url={state.creativeUrl}
          asset={state.creativeAsset}
          advertiser={state.name}
          objective={state.objective}
          disclosure="Sponsored"
          theme={state.previewTheme}
          accent={state.previewAccent}
        />
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Preview settings</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Theme
                <select
                  name="previewTheme"
                  value={state.previewTheme}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="midnight">Midnight</option>
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Accent
                <select
                  name="previewAccent"
                  value={state.previewAccent}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="primary">Primary</option>
                  <option value="emerald">Emerald</option>
                  <option value="amber">Amber</option>
                  <option value="slate">Slate</option>
                </select>
              </label>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold">Budget pacing</p>
            <p className="mt-1 text-xs text-slate-500">
              {pacingInsight ?? 'We will forecast pacing once this campaign records at least three days of spend.'}
            </p>
          </div>
          <CampaignOptimizationChecklist state={state} metrics={initialCampaign?.metrics} />
          <div className="mt-auto flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="dashboard-primary-pill px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create campaign'}
            </button>
            <button type="button" onClick={onCancel} className="dashboard-pill px-5 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}

CampaignEditor.propTypes = {
  initialCampaign: PropTypes.object,
  availablePlacements: PropTypes.arrayOf(PropTypes.object),
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  token: PropTypes.string,
  mode: PropTypes.oneOf(['create', 'edit'])
};

CampaignEditor.defaultProps = {
  initialCampaign: null,
  availablePlacements: [],
  submitting: false,
  token: null,
  mode: 'create'
};
