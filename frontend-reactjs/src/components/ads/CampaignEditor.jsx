import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import useBudgetingControls from '../../hooks/useBudgetingControls.js';
import { formatCurrencyFromCents } from '../../utils/commerceFormatting.js';

import { useMediaUpload } from '../../hooks/useMediaUpload.js';
import CampaignPreview from './CampaignPreview.jsx';

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

function centsToAmount(value) {
  if (!Number.isFinite(Number(value))) {
    return '';
  }
  return (Number(value) / 100).toFixed(2);
}

function createInitialState(campaign, placementOptions, budgetPolicy) {
  const placementContexts = Array.isArray(campaign?.placements)
    ? campaign.placements
        .map((placement) => placement?.context)
        .filter(Boolean)
    : [];

  const brandSafety = campaign?.brandSafety ?? { categories: ['standard'], excludedTopics: [], reviewNotes: null };
  const preview = campaign?.preview ?? { theme: 'light', accent: 'primary' };
  const minimumDailyCents = budgetPolicy?.minimumDailyCents ?? 500;
  const campaignDailyCents = Number.isFinite(Number(campaign?.budget?.dailyCents))
    ? Number(campaign?.budget?.dailyCents)
    : minimumDailyCents;
  const campaignTotalCents = Number.isFinite(Number(campaign?.budget?.totalCents))
    ? Number(campaign?.budget?.totalCents)
    : null;

  return {
    name: campaign?.name ?? '',
    status: campaign?.status ?? 'draft',
    objective: campaign?.objective ?? 'traffic',
    budgetDailyAmount: centsToAmount(campaignDailyCents),
    budgetTotalAmount: campaignTotalCents ? centsToAmount(campaignTotalCents) : '',
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
    previewAccent: preview.accent ?? 'primary',
    simulatePacing: true,
    autosaveDraft: true
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
  mode,
  budgetPolicy,
  locale
}) {
  const placementOptions = useMemo(() => mergePlacementOptions(availablePlacements), [availablePlacements]);
  const placementLookup = useMemo(
    () => new Map(placementOptions.map((placement) => [placement.context, placement])),
    [placementOptions]
  );
  const [state, setState] = useState(() => createInitialState(initialCampaign, placementOptions, budgetPolicy));
  const [formErrors, setFormErrors] = useState([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const { upload, uploading, error: uploadError } = useMediaUpload({ token, kind: 'image', visibility: 'public' });
  const draftStorageKey = useMemo(
    () => (initialCampaign?.id ? `edulure-ads-campaign-${initialCampaign.id}` : 'edulure-ads-campaign-new'),
    [initialCampaign?.id]
  );

  useEffect(() => {
    setState(createInitialState(initialCampaign, placementOptions, budgetPolicy));
  }, [budgetPolicy, initialCampaign, placementOptions]);

  useEffect(() => {
    if (draftRestored) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    if (initialCampaign?.id) {
      setDraftRestored(true);
      return;
    }

    try {
      const stored = window.localStorage.getItem(draftStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState((current) => {
          const next = createInitialState(initialCampaign, placementOptions, budgetPolicy);
          const placements = Array.isArray(parsed?.placements)
            ? parsed.placements.filter((context) => placementLookup.has(context))
            : next.placements;
          return { ...next, ...parsed, placements };
        });
      }
    } catch (error) {
      console.warn('Unable to restore campaign draft', error);
    } finally {
      setDraftRestored(true);
    }
  }, [budgetPolicy, draftRestored, draftStorageKey, initialCampaign, placementLookup, placementOptions]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!draftRestored) {
      return;
    }
    if (!state.autosaveDraft) {
      window.localStorage.removeItem(draftStorageKey);
      return;
    }

    try {
      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          ...state,
          uploading: undefined
        })
      );
    } catch (error) {
      console.warn('Failed to persist campaign draft', error);
    }
  }, [draftRestored, draftStorageKey, state]);

  const handleFieldChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    setState((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setFormErrors([]);
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
      setFormErrors([]);
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
    setFormErrors([]);
  }, []);

  const handleUndoChanges = useCallback(() => {
    setState(createInitialState(initialCampaign, placementOptions, budgetPolicy));
    setFormErrors([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [budgetPolicy, draftStorageKey, initialCampaign, placementOptions]);

  const handleDiscardDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(draftStorageKey);
    }
    setState((current) => ({ ...current, autosaveDraft: false }));
  }, [draftStorageKey]);

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

  const minimumDailyCents = budgetPolicy?.minimumDailyCents ?? 500;
  const spendToDateCents = Number(initialCampaign?.metrics?.lifetime?.spendCents ?? 0);
  const budgetControls = useBudgetingControls({
    values: state,
    onChange: (patch) => setState((current) => ({ ...current, ...patch })),
    schedule: { startAt: state.startAt, endAt: state.endAt },
    spendToDateCents,
    minimumDailyCents,
    currency: state.budgetCurrency,
    locale
  });

  const pacingInsight = useMemo(() => {
    const forecastDaily = initialCampaign?.metrics?.forecast?.expectedDailySpendCents ?? null;
    if (!forecastDaily) {
      return null;
    }
    const planned = budgetControls.meta.sanitizedBudget.dailyCents;
    if (!Number.isFinite(planned)) return null;
    const delta = planned - forecastDaily;
    if (Math.abs(delta) < forecastDaily * 0.05) {
      return 'Budget pacing looks healthy based on the latest seven-day average.';
    }
    if (delta < 0) {
      return `Increase the daily budget by ${formatCurrencyFromCents(Math.round(Math.abs(delta)), {
        currency: budgetControls.meta.sanitizedBudget.currency,
        locale
      })} to align with current delivery.`;
    }
    return `Reduce daily spend by ${formatCurrencyFromCents(Math.round(delta), {
      currency: budgetControls.meta.sanitizedBudget.currency,
      locale
    })} to prevent pacing overages.`;
  }, [budgetControls.meta.sanitizedBudget.currency, budgetControls.meta.sanitizedBudget.dailyCents, initialCampaign?.metrics?.forecast?.expectedDailySpendCents, locale]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!onSubmit) return;

      const errors = [...budgetControls.meta.errors];
      if (!state.name.trim()) {
        errors.push('Provide a campaign name.');
      }
      if (!state.placements.length) {
        errors.push('Select at least one placement.');
      }
      if (state.creativeUrl) {
        try {
          // eslint-disable-next-line no-new
          new URL(state.creativeUrl);
        } catch (_error) {
          errors.push('Destination URL must be a valid URL.');
        }
      }
      if (errors.length) {
        setFormErrors(errors);
        return;
      }

      const payload = {
        name: state.name.trim(),
        status: state.status,
        objective: state.objective,
        budget: {
          currency: budgetControls.meta.sanitizedBudget.currency,
          dailyCents: budgetControls.meta.sanitizedBudget.dailyCents,
          totalCents: budgetControls.meta.sanitizedBudget.totalCents,
          minimumDailyCents
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
        },
        simulation: state.simulatePacing
          ? {
              pacing: budgetControls.meta.pacing,
              formatted: budgetControls.meta.formatted
            }
          : null
      };

      await onSubmit(payload);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(draftStorageKey);
      }
      setFormErrors([]);
    },
    [budgetControls.meta.errors, budgetControls.meta.formatted, budgetControls.meta.pacing, budgetControls.meta.sanitizedBudget.currency, budgetControls.meta.sanitizedBudget.dailyCents, budgetControls.meta.sanitizedBudget.totalCents, draftStorageKey, minimumDailyCents, onSubmit, placementLookup, state]
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

        {formErrors.length ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p className="font-semibold">Resolve these items before saving:</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              {formErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {budgetControls.meta.warnings.length ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <p className="font-semibold">Review before launch:</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              {budgetControls.meta.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

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

        <div className="grid gap-4 md:grid-cols-4">
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
            Daily budget
            <input
              name="budgetDailyAmount"
              type="number"
              min={0}
              step="0.01"
              value={budgetControls.inputs.daily}
              onChange={budgetControls.handlers.onDailyChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total budget (optional)
            <input
              name="budgetTotalAmount"
              type="number"
              min={0}
              step="0.01"
              value={budgetControls.inputs.total}
              onChange={budgetControls.handlers.onTotalChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Currency
            <input
              name="budgetCurrency"
              value={budgetControls.inputs.currency}
              onChange={budgetControls.handlers.onCurrencyChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <div className="mt-3 rounded-2xl bg-slate-50/80 p-4 text-xs text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold text-slate-700">Budget summary</p>
              <p>
                Daily spend is locked above{' '}
                {formatCurrencyFromCents(minimumDailyCents, {
                  currency: budgetControls.meta.sanitizedBudget.currency,
                  locale
                })}{' '}
                to respect billing policy guardrails.
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-700">{budgetControls.meta.formatted.daily}</p>
              {budgetControls.meta.formatted.total ? (
                <p className="text-slate-500">Capped at {budgetControls.meta.formatted.total}</p>
              ) : (
                <p className="text-slate-500">No total cap configured</p>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={budgetControls.handlers.onReset}
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary/50 hover:text-primary"
            >
              Reset to policy minimum
            </button>
            <span className="rounded-full bg-slate-200/60 px-3 py-1 font-medium text-slate-600">
              {budgetControls.meta.pacing.totalDurationDays
                ? `${budgetControls.meta.pacing.totalDurationDays} day plan`
                : 'Schedule pending'}
            </span>
          </div>
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

        <fieldset className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow preferences</legend>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="autosaveDraft"
                checked={state.autosaveDraft}
                onChange={handleFieldChange}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold text-slate-700">Autosave drafts locally</span>
                <span className="text-xs text-slate-500">
                  Store in-progress updates in the browser so you can step away without losing work.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="simulatePacing"
                checked={state.simulatePacing}
                onChange={handleFieldChange}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold text-slate-700">Run pacing simulation</span>
                <span className="text-xs text-slate-500">
                  Preview forecasted spend and recommended budgets while editing.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <button type="button" onClick={handleUndoChanges} className="dashboard-pill px-4 py-2">
              Undo changes
            </button>
            <button type="button" onClick={handleDiscardDraft} className="dashboard-pill px-4 py-2">
              Clear saved draft
            </button>
          </div>
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
          pacing={
            state.simulatePacing
              ? { ...budgetControls.meta.pacing, currency: budgetControls.meta.sanitizedBudget.currency }
              : null
          }
          budgetSummary={state.simulatePacing ? budgetControls.meta.formatted : null}
          spendToDateCents={spendToDateCents}
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
            {state.simulatePacing && budgetControls.meta.pacing.projectedTotalCents ? (
              <dl className="mt-3 grid gap-3 text-xs text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                  <dt className="font-semibold text-slate-700">Projected spend</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatCurrencyFromCents(budgetControls.meta.pacing.projectedTotalCents, {
                      currency: budgetControls.meta.sanitizedBudget.currency,
                      locale
                    })}
                  </dd>
                </div>
                {Number.isFinite(budgetControls.meta.pacing.recommendedDailyCents) ? (
                  <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                    <dt className="font-semibold text-slate-700">Recommended daily</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrencyFromCents(Math.round(budgetControls.meta.pacing.recommendedDailyCents), {
                        currency: budgetControls.meta.sanitizedBudget.currency,
                        locale
                      })}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                  <dt className="font-semibold text-slate-700">Spend to date</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatCurrencyFromCents(spendToDateCents, {
                      currency: budgetControls.meta.sanitizedBudget.currency,
                      locale
                    })}
                  </dd>
                </div>
                {Number.isFinite(budgetControls.meta.pacing.burnRate) && budgetControls.meta.pacing.daysElapsed ? (
                  <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                    <dt className="font-semibold text-slate-700">Observed burn</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrencyFromCents(Math.round(budgetControls.meta.pacing.burnRate), {
                        currency: budgetControls.meta.sanitizedBudget.currency,
                        locale
                      })}{' '}
                      <span className="text-slate-500">per day</span>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
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
  mode: PropTypes.oneOf(['create', 'edit']),
  budgetPolicy: PropTypes.shape({
    minimumDailyCents: PropTypes.number
  }),
  locale: PropTypes.string
};

CampaignEditor.defaultProps = {
  initialCampaign: null,
  availablePlacements: [],
  submitting: false,
  token: null,
  mode: 'create',
  budgetPolicy: null,
  locale: 'en-US'
};
