import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  createAdsCampaign,
  listAdsCampaigns,
  pauseAdsCampaign,
  recordAdsCampaignMetrics,
  resumeAdsCampaign,
  updateAdsCampaign
} from '../../api/adsApi.js';

const ALLOWED_ROLES = new Set(['instructor', 'admin']);

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1
});

const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

function formatCompactNumber(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || Number.isNaN(numeric) || numeric <= 0) {
    return '0';
  }
  return compactNumberFormatter.format(numeric);
}

function formatInteger(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    return '0';
  }
  return integerFormatter.format(Math.round(numeric));
}

function formatDateLabel(isoString) {
  if (!isoString) return 'Not yet synced';
  try {
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
      return typeof isoString === 'string' ? isoString : 'Not yet synced';
    }
    return dateFormatter.format(parsed);
  } catch (error) {
    console.warn('Failed to format date label', error);
    return 'Not yet synced';
  }
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-dark">
      {children}
    </span>
  );
}

Chip.propTypes = {
  children: PropTypes.node.isRequired
};

const OBJECTIVE_OPTIONS = [
  { label: 'Awareness', value: 'awareness' },
  { label: 'Traffic', value: 'traffic' },
  { label: 'Leads', value: 'leads' },
  { label: 'Conversions', value: 'conversions' }
];

const STATUS_CHOICES = ['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'];

const createCampaignDraft = () => ({
  name: '',
  objective: 'traffic',
  dailyBudgetCents: 5000,
  creativeHeadline: '',
  creativeDescription: '',
  creativeUrl: '',
  targetingKeywords: '',
  targetingAudiences: '',
  targetingLocations: '',
  targetingLanguages: 'EN',
  startAt: '',
  endAt: ''
});

const createMetricsDraft = () => ({
  campaignId: '',
  impressions: '',
  clicks: '',
  conversions: '',
  spendCents: '',
  revenueCents: ''
});

const parseCsv = (value) =>
  String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export default function EdulureAds() {
  const { role, dashboard, refresh } = useOutletContext();
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [campaignsState, setCampaignsState] = useState({ items: [], loading: false, error: null });
  const [campaignDraft, setCampaignDraft] = useState(createCampaignDraft);
  const [metricsDraft, setMetricsDraft] = useState(createMetricsDraft);
  const [feedback, setFeedback] = useState(null);
  const [showCreativePreview, setShowCreativePreview] = useState(true);
  const adsRaw = dashboard?.ads ?? null;

  const loadCampaigns = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setCampaignsState({ items: [], loading: false, error: null });
      return;
    }
    setCampaignsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await listAdsCampaigns({ token, params: { limit: 100 } });
      const items = Array.isArray(response.data) ? response.data : [];
      setCampaignsState({ items, loading: false, error: null });
    } catch (error) {
      setCampaignsState({ items: [], loading: false, error });
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const ads = useMemo(() => {
    if (!adsRaw || typeof adsRaw !== 'object') return null;
    const asArray = (value) => (Array.isArray(value) ? value : []);
    const asObject = (value) => (value && typeof value === 'object' ? value : {});

    const sanitizeCampaign = (campaign) => {
      const safeCampaign = asObject(campaign);
      const metrics = asObject(safeCampaign.metrics);
      const placement = asObject(safeCampaign.placement);
      const targeting = asObject(safeCampaign.targeting);
      const creative = asObject(safeCampaign.creative);

      return {
        ...safeCampaign,
        metrics: {
          impressions: Number(metrics.impressions ?? 0),
          clicks: Number(metrics.clicks ?? 0),
          conversions: Number(metrics.conversions ?? 0),
          revenueFormatted: metrics.revenueFormatted ?? '—',
          roas: metrics.roas ?? null,
          lastSyncedAt: metrics.lastSyncedAt ?? null
        },
        placement: {
          ...placement,
          tags: asArray(placement.tags)
        },
        targeting: {
          keywords: asArray(targeting.keywords),
          audiences: asArray(targeting.audiences),
          locations: asArray(targeting.locations),
          languages: asArray(targeting.languages)
        },
        creative: {
          headline: creative.headline ?? 'Untitled creative',
          description: creative.description ?? 'Add a compelling description to improve engagement.',
          url: creative.url ?? null
        },
        spend: asObject(safeCampaign.spend),
        dailyBudget: asObject(safeCampaign.dailyBudget)
      };
    };

    return {
      summary: asObject(adsRaw.summary),
      active: asArray(adsRaw.active).map(sanitizeCampaign),
      experiments: asArray(adsRaw.experiments).map(asObject),
      placements: asArray(adsRaw.placements).map((placement) => ({
        ...asObject(placement),
        tags: asArray(placement?.tags)
      })),
      targeting: {
        summary: adsRaw.targeting?.summary ?? '',
        keywords: asArray(adsRaw.targeting?.keywords),
        audiences: asArray(adsRaw.targeting?.audiences),
        locations: asArray(adsRaw.targeting?.locations),
        languages: asArray(adsRaw.targeting?.languages)
      },
      tags: asArray(adsRaw.tags).map(asObject)
    };
  }, [adsRaw]);

  if (role && !ALLOWED_ROLES.has(role)) {
    return (
      <DashboardStateMessage
        title="Restricted access"
        description="Switch to an instructor or admin Learnspace to manage Edulure Ads placements and experiments."
        actionLabel="Return"
        onAction={() => window.history.back()}
      />
    );
  }

  if (!ads) {
    return (
      <DashboardStateMessage
        title="Edulure Ads Learnspace offline"
        description="Performance data hasn't synced from your ad accounts yet. Refresh after connecting channels."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const hasSignals =
    (ads.active?.length ?? 0) +
      (ads.placements?.length ?? 0) +
      (ads.experiments?.length ?? 0) +
      (ads.tags?.length ?? 0) >
    0;

  const showTelemetryNotice = !hasSignals;

  const summary = ads.summary ?? {};

  const overviewMetrics = [
    {
      title: 'Active campaigns',
      value: summary.activeCampaigns ?? 0,
      hint: 'Connected Learnspaces'
    },
    {
      title: 'Lifetime spend',
      value: summary.totalSpend?.formatted ?? '—',
      hint: summary.totalSpend?.currency ?? 'Multi-currency'
    },
    {
      title: 'Avg CTR',
      value: summary.averageCtr ?? '—',
      hint: `${formatCompactNumber(summary.totalImpressions ?? 0)} impressions`
    },
    {
      title: 'Avg CPC',
      value: summary.averageCpc ?? '—',
      hint: summary.averageCpc !== '—' ? 'Across active placements' : 'Awaiting click volume'
    },
    {
      title: 'Avg CPA',
      value: summary.averageCpa ?? '—',
      hint: summary.averageCpa !== '—' ? 'Per acquisition' : 'Awaiting conversions'
    },
    {
      title: 'ROAS',
      value: summary.roas ?? '—',
      hint: summary.roas !== '—' ? 'Return on ad spend' : 'Insufficient revenue data'
    }
  ];

  const campaignOptions = useMemo(
    () =>
      campaignsState.items.map((campaign) => ({
        value: String(campaign.id),
        label: campaign.name ?? `Campaign ${campaign.id}`,
        status: campaign.status ?? 'draft'
      })),
    [campaignsState.items]
  );

  const selectedCampaignForMetrics = useMemo(
    () => campaignsState.items.find((campaign) => String(campaign.id) === String(metricsDraft.campaignId)) ?? null,
    [campaignsState.items, metricsDraft.campaignId]
  );

  const creativePreviewUrl = useMemo(() => {
    if (!campaignDraft.creativeUrl) {
      return 'https://player.vimeo.com/video/76979871?h=8272103f6e&title=0&byline=0&portrait=0';
    }
    try {
      const parsed = new URL(campaignDraft.creativeUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
      return parsed.toString();
    } catch (error) {
      return null;
    }
  }, [campaignDraft.creativeUrl]);

  const isAuthenticatedInstructor = Boolean(token && isAuthenticated);

  const handleCreateCampaign = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token || !isAuthenticatedInstructor) {
        setFeedback({ tone: 'error', message: 'Sign in with instructor permissions to launch campaigns.' });
        return;
      }
      const keywords = parseCsv(campaignDraft.targetingKeywords);
      const audiences = parseCsv(campaignDraft.targetingAudiences);
      const locations = parseCsv(campaignDraft.targetingLocations);
      const languagesList = parseCsv(campaignDraft.targetingLanguages);
      const languages = (languagesList.length ? languagesList : ['EN']).map((language) =>
        language.toUpperCase().slice(0, 2)
      );

      const payload = {
        name: campaignDraft.name || 'Untitled campaign',
        objective: campaignDraft.objective,
        budget: {
          currency: 'USD',
          dailyCents: Math.max(Number(campaignDraft.dailyBudgetCents) || 0, 0)
        },
        creative: {
          headline: campaignDraft.creativeHeadline || 'New creative',
          description: campaignDraft.creativeDescription || '',
          url: campaignDraft.creativeUrl || 'https://edulure.com'
        },
        targeting: {
          keywords,
          audiences,
          locations,
          languages
        },
        metadata: { createdViaDashboard: true }
      };

      if (campaignDraft.startAt) {
        payload.startAt = new Date(campaignDraft.startAt).toISOString();
      }
      if (campaignDraft.endAt) {
        payload.endAt = new Date(campaignDraft.endAt).toISOString();
      }

      try {
        await createAdsCampaign({ token, payload });
        setFeedback({ tone: 'success', message: 'Campaign launched successfully.' });
        setCampaignDraft(createCampaignDraft());
        await loadCampaigns();
        refresh?.();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to launch campaign.' });
      }
    },
    [campaignDraft, isAuthenticatedInstructor, loadCampaigns, refresh, token]
  );

  const handleStatusChange = useCallback(
    async (campaignId, status) => {
      if (!token || !campaignId) return;
      try {
        await updateAdsCampaign({ token, campaignId, payload: { status } });
        await loadCampaigns();
        refresh?.();
        setFeedback({ tone: 'success', message: 'Campaign status updated.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update campaign status.' });
      }
    },
    [loadCampaigns, refresh, token]
  );

  const handlePauseCampaign = useCallback(
    async (campaignId) => {
      if (!token || !campaignId) return;
      try {
        await pauseAdsCampaign({ token, campaignId });
        await loadCampaigns();
        refresh?.();
        setFeedback({ tone: 'success', message: 'Campaign paused.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to pause campaign.' });
      }
    },
    [loadCampaigns, refresh, token]
  );

  const handleResumeCampaign = useCallback(
    async (campaignId) => {
      if (!token || !campaignId) return;
      try {
        await resumeAdsCampaign({ token, campaignId });
        await loadCampaigns();
        refresh?.();
        setFeedback({ tone: 'success', message: 'Campaign resumed.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to resume campaign.' });
      }
    },
    [loadCampaigns, refresh, token]
  );

  const handleMetricsSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token || !metricsDraft.campaignId) {
        setFeedback({ tone: 'error', message: 'Select a campaign to record metrics.' });
        return;
      }
      const payload = {
        impressions: Number(metricsDraft.impressions) || 0,
        clicks: Number(metricsDraft.clicks) || 0,
        conversions: Number(metricsDraft.conversions) || 0,
        spendCents: Number(metricsDraft.spendCents) || 0,
        revenueCents:
          metricsDraft.revenueCents === '' || metricsDraft.revenueCents == null
            ? undefined
            : Number(metricsDraft.revenueCents) || 0,
        metricDate: new Date().toISOString()
      };

      try {
        await recordAdsCampaignMetrics({ token, campaignId: metricsDraft.campaignId, payload });
        setFeedback({ tone: 'success', message: 'Metrics recorded.' });
        setMetricsDraft(createMetricsDraft());
        await loadCampaigns();
        refresh?.();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to record metrics.' });
      }
    },
    [loadCampaigns, metricsDraft, refresh, token]
  );

  const activeCampaigns = ads.active ?? [];
  const experiments = ads.experiments ?? [];
  const placements = ads.placements ?? [];
  const targeting = ads.targeting ?? { keywords: [], audiences: [], locations: [], languages: [], summary: '' };
  const tags = ads.tags ?? [];

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edulure Ads</h1>
          <p className="mt-2 text-sm text-slate-600">
            Orchestrate placements, fine-tune targeting, and monitor revenue quality in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="dashboard-pill px-5 py-2" onClick={() => refresh?.()}>
            Refresh metrics
          </button>
          <button
            type="button"
            className="dashboard-primary-pill px-5 py-2"
            onClick={() => window.open('/ads/campaigns', '_blank', 'noopener')}
          >
            Launch campaign
          </button>
        </div>
      </div>

      {showTelemetryNotice ? (
        <section className="dashboard-section border-dashed border-primary/40 bg-primary/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="dashboard-kicker">Telemetry wizard</p>
              <h2 className="text-lg font-semibold text-primary-dark">Connect your ad channels</h2>
              <p className="mt-1 text-sm text-primary-dark/80">
                Hook up Meta, Google, LinkedIn, and other publishers to sync placements, spend, and revenue in real time.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-primary-dark/80">
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-primary-dark">•</span>
                  Authenticate each network with instructor admin credentials.
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-primary-dark">•</span>
                  Assign attribution windows and conversion events for trusted metrics.
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-primary-dark">•</span>
                  Enable telemetry sharing to unlock pacing and anomaly alerts.
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="dashboard-primary-pill px-4 py-2"
                  onClick={() => window.open('/integrations/ads', '_blank', 'noopener')}
                >
                  Launch connection wizard
                </button>
                <button type="button" className="dashboard-pill px-4 py-2" onClick={() => refresh?.()}>
                  Recheck status
                </button>
              </div>
            </div>
            <div className="aspect-video w-full max-w-xl overflow-hidden rounded-2xl border border-primary/20 shadow-sm">
              <iframe
                title="Edulure Ads onboarding"
                src="https://www.youtube.com/embed/K-s5HJy1AgU?rel=0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="dashboard-section space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Campaign launcher</p>
            <h2 className="text-lg font-semibold text-slate-900">Create or schedule an ad campaign</h2>
            <p className="mt-1 text-sm text-slate-600">
              Configure targeting, creative, pacing, and scheduling. Campaigns sync instantly with the Ads API.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {campaignsState.loading ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">Loading campaigns…</span>
            ) : null}
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
              {campaignsState.items.length} campaign{campaignsState.items.length === 1 ? '' : 's'} managed
            </span>
          </div>
        </header>

        <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm" onSubmit={handleCreateCampaign}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Campaign name
              <input
                type="text"
                className="dashboard-input"
                required
                value={campaignDraft.name}
                onChange={(event) => setCampaignDraft((previous) => ({ ...previous, name: event.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Campaign objective
              <select
                className="dashboard-input"
                value={campaignDraft.objective}
                onChange={(event) => setCampaignDraft((previous) => ({ ...previous, objective: event.target.value }))}
              >
                {OBJECTIVE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.75fr)]">
            <label className="grid gap-1 text-sm text-slate-600">
              Daily budget (USD)
              <input
                type="number"
                min="0"
                step="10"
                className="dashboard-input"
                value={campaignDraft.dailyBudgetCents / 100}
                onChange={(event) =>
                  setCampaignDraft((previous) => ({
                    ...previous,
                    dailyBudgetCents: Math.max(Number(event.target.value || 0) * 100, 0)
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Start date
              <input
                type="date"
                className="dashboard-input"
                value={campaignDraft.startAt}
                onChange={(event) => setCampaignDraft((previous) => ({ ...previous, startAt: event.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              End date
              <input
                type="date"
                className="dashboard-input"
                value={campaignDraft.endAt}
                min={campaignDraft.startAt || undefined}
                onChange={(event) => setCampaignDraft((previous) => ({ ...previous, endAt: event.target.value }))}
              />
            </label>
          </div>

          <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Creative package</summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-600">
                Headline
                <input
                  type="text"
                  className="dashboard-input"
                  value={campaignDraft.creativeHeadline}
                  onChange={(event) =>
                    setCampaignDraft((previous) => ({ ...previous, creativeHeadline: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                Destination URL
                <input
                  type="url"
                  placeholder="https://"
                  className="dashboard-input"
                  value={campaignDraft.creativeUrl}
                  onChange={(event) =>
                    setCampaignDraft((previous) => ({ ...previous, creativeUrl: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600 md:col-span-2">
                Description
                <textarea
                  rows={2}
                  className="dashboard-input resize-y"
                  value={campaignDraft.creativeDescription}
                  onChange={(event) =>
                    setCampaignDraft((previous) => ({ ...previous, creativeDescription: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={showCreativePreview}
                  onChange={() => setShowCreativePreview((previous) => !previous)}
                />
                Show live preview / multimedia embed
              </label>
              {showCreativePreview ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-inner">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {campaignDraft.creativeHeadline || 'Your campaign headline appears here'}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {campaignDraft.creativeDescription ||
                        'Craft a compelling description to invite your learners to take action.'}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-primary">
                      {campaignDraft.creativeUrl || 'https://edulure.com'}
                    </p>
                  </div>
                  {creativePreviewUrl ? (
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                      <iframe
                        title="Creative multimedia preview"
                        src={creativePreviewUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-400">
                      Provide a secure HTTPS URL to render the multimedia preview.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </details>

          <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Targeting</summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-600">
                Keywords (comma separated)
                <input
                  type="text"
                  className="dashboard-input"
                  value={campaignDraft.targetingKeywords}
                  placeholder="engagement, retention, lms"
                  onChange={(event) =>
                    setCampaignDraft((previous) => ({ ...previous, targetingKeywords: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                Audience cohorts (comma separated)
                <input
                  type="text"
                  className="dashboard-input"
                  value={campaignDraft.targetingAudiences}
                  placeholder="Course creators, Bootcamp grads"
                  onChange={(event) =>
                    setCampaignDraft((previous) => ({ ...previous, targetingAudiences: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                Locations (comma separated)
                <input
                  type="text"
                  className="dashboard-input"
                  value={campaignDraft.targetingLocations}
                  placeholder="United States, Canada"
                  onChange={(event) =>
                    setCampaignDraft((previous) => ({ ...previous, targetingLocations: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                Languages (comma separated ISO-2)
                <input
                  type="text"
                  className="dashboard-input"
                  value={campaignDraft.targetingLanguages}
                  placeholder="EN, ES"
                  onChange={(event) =>
                    setCampaignDraft((previous) => ({ ...previous, targetingLanguages: event.target.value }))
                  }
                />
              </label>
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" className="dashboard-pill px-4 py-2" onClick={() => setCampaignDraft(createCampaignDraft())}>
              Reset form
            </button>
            <button type="submit" className="dashboard-primary-pill px-6 py-2">
              Launch campaign via API
            </button>
          </div>
        </form>

        {campaignsState.error ? (
          <DashboardStateMessage
            tone="error"
            title="Unable to load ads campaigns"
            description={campaignsState.error?.message ?? 'Refresh your session or reconnect the Ads API.'}
            actionLabel="Retry"
            onAction={() => loadCampaigns()}
          />
        ) : null}
      </section>

      <section className="dashboard-section space-y-6">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="dashboard-kicker">Campaign operations</p>
            <h2 className="text-lg font-semibold text-slate-900">Manage live campaigns</h2>
            <p className="mt-1 text-sm text-slate-600">
              Update pacing, pause or resume delivery, and review last-synced performance in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              className="dashboard-pill px-3 py-1"
              onClick={() => loadCampaigns()}
              disabled={campaignsState.loading}
            >
              Sync now
            </button>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Last synced {formatDateLabel(summary.lastSyncedAt ?? summary.lastSyncedLabel)}
            </span>
          </div>
        </header>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
          <div className="hidden bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[1.3fr_1fr_1fr_1fr_160px]">
            <span>Campaign</span>
            <span>Objective &amp; budget</span>
            <span>Performance</span>
            <span>Schedule</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-slate-200">
            {campaignsState.items.map((campaign) => (
              <li key={campaign.id} className="grid gap-4 px-4 py-5 lg:grid-cols-[1.3fr_1fr_1fr_1fr_160px] lg:px-6">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{campaign.name ?? 'Untitled campaign'}</p>
                  <p className="text-xs text-slate-500">Status: {campaign.status ?? 'draft'}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(campaign.targeting?.keywords ?? []).slice(0, 3).map((keyword) => (
                      <span key={`${campaign.id}-kw-${keyword}`} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 text-xs text-slate-500">
                  <p className="text-sm font-semibold text-slate-900">{campaign.objective}</p>
                  <p>{campaign.dailyBudget?.label ?? 'Budget syncing'}</p>
                  <p>{campaign.spend?.label ?? 'Lifetime spend syncing'}</p>
                </div>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>Impressions: {formatInteger(campaign.metrics?.impressions)}</p>
                  <p>Clicks: {formatInteger(campaign.metrics?.clicks)}</p>
                  <p>Conversions: {formatInteger(campaign.metrics?.conversions)}</p>
                </div>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>{campaign.startAtLabel ?? 'Start syncing'}</p>
                  <p>{campaign.endAtLabel ?? 'End syncing'}</p>
                  <p>Last metrics {formatDateLabel(campaign.metrics?.lastSyncedAt)}</p>
                </div>
                <div className="flex flex-col items-stretch gap-2 text-xs">
                  <select
                    className="dashboard-input"
                    value={campaign.status ?? 'draft'}
                    onChange={(event) => handleStatusChange(campaign.id, event.target.value)}
                  >
                    {STATUS_CHOICES.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="dashboard-pill px-3 py-1"
                    onClick={() => handlePauseCampaign(campaign.id)}
                  >
                    Pause
                  </button>
                  <button
                    type="button"
                    className="dashboard-primary-pill px-3 py-1"
                    onClick={() => handleResumeCampaign(campaign.id)}
                  >
                    Resume
                  </button>
                </div>
              </li>
            ))}
            {campaignsState.items.length === 0 ? (
              <li className="px-6 py-8">
                <DashboardStateMessage
                  title="No managed campaigns yet"
                  description="Launch your first campaign with the builder above or import existing placements from an ad account."
                  actionLabel="Launch campaign"
                  onAction={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="dashboard-section space-y-6">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Telemetry capture</p>
            <h2 className="text-lg font-semibold text-slate-900">Record manual performance metrics</h2>
            <p className="mt-1 text-sm text-slate-600">
              Backfill offline conversions or direct sales to keep the analytics pipeline in sync across revenue surfaces.
            </p>
          </div>
          {selectedCampaignForMetrics ? (
            <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-xs text-slate-500">
              Recording metrics for <span className="font-semibold text-slate-700">{selectedCampaignForMetrics.name}</span>
            </div>
          ) : null}
        </header>

        <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm" onSubmit={handleMetricsSubmit}>
          <label className="grid gap-1 text-sm text-slate-600">
            Campaign
            <select
              required
              className="dashboard-input"
              value={metricsDraft.campaignId}
              onChange={(event) => setMetricsDraft((previous) => ({ ...previous, campaignId: event.target.value }))}
            >
              <option value="">Select campaign</option>
              {campaignOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} · {option.status}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-600">
              Impressions
              <input
                type="number"
                min="0"
                className="dashboard-input"
                value={metricsDraft.impressions}
                onChange={(event) => setMetricsDraft((previous) => ({ ...previous, impressions: event.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Clicks
              <input
                type="number"
                min="0"
                className="dashboard-input"
                value={metricsDraft.clicks}
                onChange={(event) => setMetricsDraft((previous) => ({ ...previous, clicks: event.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Conversions
              <input
                type="number"
                min="0"
                className="dashboard-input"
                value={metricsDraft.conversions}
                onChange={(event) => setMetricsDraft((previous) => ({ ...previous, conversions: event.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Spend (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                className="dashboard-input"
                value={metricsDraft.spendCents === '' ? '' : Number(metricsDraft.spendCents) / 100}
                onChange={(event) =>
                  setMetricsDraft((previous) => ({
                    ...previous,
                    spendCents:
                      event.target.value === '' ? '' : Math.max(Number(event.target.value || 0) * 100, 0)
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Revenue (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                className="dashboard-input"
                value={metricsDraft.revenueCents === '' ? '' : Number(metricsDraft.revenueCents) / 100}
                onChange={(event) =>
                  setMetricsDraft((previous) => ({
                    ...previous,
                    revenueCents:
                      event.target.value === '' ? '' : Math.max(Number(event.target.value || 0) * 100, 0)
                  }))
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" className="dashboard-pill px-4 py-2" onClick={() => setMetricsDraft(createMetricsDraft())}>
              Reset metrics
            </button>
            <button type="submit" className="dashboard-primary-pill px-6 py-2">
              Record performance
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Performance overview</h2>
            <p className="mt-1 text-xs text-slate-500">
              Last synced {formatDateLabel(summary.lastSyncedAt ?? summary.lastSyncedLabel)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <Chip>{formatInteger(summary.totalImpressions ?? 0)} impressions</Chip>
            <Chip>{formatInteger(summary.totalClicks ?? 0)} clicks</Chip>
            <Chip>{formatInteger(summary.totalConversions ?? 0)} conversions</Chip>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overviewMetrics.map((metric) => (
            <div
              key={metric.title}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-primary/5 p-5 shadow-sm transition hover:border-primary/40"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark">{metric.title}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p>
              <p className="mt-2 text-xs text-slate-500">{metric.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Active placements</h2>
            <p className="mt-1 text-sm text-slate-600">
              Detailed telemetry across surfaces, budgets, and creative packages powering your funnel.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-6">
          {activeCampaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="rounded-3xl border border-primary/15 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">{campaign.objective ?? 'Campaign objective'}</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{campaign.name ?? 'Untitled campaign'}</h3>
                  <p className="mt-1 text-xs text-slate-500">{campaign.placement.scheduleLabel ?? 'Schedule syncing'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip>{campaign.status === 'active' ? 'Live' : campaign.status ?? 'Draft'}</Chip>
                  {campaign.metrics.roas ? <Chip>{campaign.metrics.roas} ROAS</Chip> : null}
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lifetime spend</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{campaign.spend.label ?? '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">{campaign.dailyBudget.label ?? 'Budget syncing'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Click health</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{campaign.ctr ?? '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {(campaign.cpc ?? '—')} · {(campaign.cpa ?? '—')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Volume</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatInteger(campaign.metrics.impressions)} impressions
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatInteger(campaign.metrics.clicks)} clicks · {formatInteger(campaign.metrics.conversions)} conversions
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{campaign.metrics.revenueFormatted}</p>
                  <p className="mt-1 text-xs text-slate-500">Synced {formatDateLabel(campaign.metrics.lastSyncedAt)}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {campaign.placement.tags.map((tag) => (
                  <Chip key={`${campaign.id}-${tag}`}>{tag}</Chip>
                ))}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Targeting</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {campaign.targeting.keywords.slice(0, 4).map((keyword) => (
                      <span key={`${campaign.id}-kw-${keyword}`} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                        {keyword}
                      </span>
                    ))}
                    {campaign.targeting.keywords.length === 0 && (
                      <span className="text-xs text-slate-400">No keyword targeting yet</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Audiences: {campaign.targeting.audiences.slice(0, 4).join(', ') || 'Syncing audiences'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Regions: {campaign.targeting.locations.slice(0, 4).join(', ') || 'Syncing geos'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Creative</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{campaign.creative.headline}</p>
                  <p className="mt-1 text-xs text-slate-500">{campaign.creative.description}</p>
                  <a
                    href={campaign.creative.url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                  >
                    View landing page
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="dashboard-section lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900">Experiment lab</h2>
          <p className="mt-1 text-sm text-slate-600">
            Campaign experiments compare creative and placement iterations against prior conversions.
          </p>
          <ul className="mt-4 space-y-4">
            {experiments.map((experiment) => (
              <li key={experiment.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{experiment.status}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{experiment.name}</p>
                  </div>
                  {experiment.conversionsDeltaLabel && <Chip>{experiment.conversionsDeltaLabel} conversions</Chip>}
                </div>
                <p className="mt-2 text-xs text-slate-600">{experiment.hypothesis}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Last observed {formatDateLabel(experiment.lastObservedAt ?? experiment.lastObservedLabel)}
                </p>
                {experiment.baselineLabel && (
                  <p className="mt-1 text-xs text-slate-500">Baseline · {experiment.baselineLabel}</p>
                )}
              </li>
            ))}
            {experiments.length === 0 && (
              <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                Launch a creative or placement experiment to surface lift against your previous control sample.
              </li>
            )}
          </ul>
        </section>

        <section className="dashboard-section lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Targeting intelligence</h2>
          <p className="mt-1 text-sm text-slate-600">{targeting.summary}</p>
          <div className="mt-4 space-y-4 text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">Keywords</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {targeting.keywords.map((keyword) => (
                  <span key={`kw-${keyword}`} className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                    {keyword}
                  </span>
                ))}
                {targeting.keywords.length === 0 && <span className="text-slate-400">No keyword targeting configured</span>}
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Audiences</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {targeting.audiences.map((audience) => (
                  <span key={`aud-${audience}`} className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-600">
                    {audience}
                  </span>
                ))}
                {targeting.audiences.length === 0 && <span className="text-slate-400">No audience cohorts connected</span>}
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Regions &amp; languages</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {targeting.locations.map((location) => (
                  <span key={`loc-${location}`} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                    {location}
                  </span>
                ))}
                {targeting.languages.map((language) => (
                  <span key={`lang-${language}`} className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-600">
                    {language}
                  </span>
                ))}
                {targeting.locations.length === 0 && targeting.languages.length === 0 && (
                  <span className="text-slate-400">No geo or locale filters applied</span>
                )}
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Operational tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={`${tag.category ?? 'tag'}-${tag.label ?? 'label'}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600"
                  >
                    {(tag.category ?? 'Tag').trim()}: {(tag.label ?? 'Unspecified').trim()}
                  </span>
                ))}
                {tags.length === 0 && <span className="text-slate-400">No tags available</span>}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Placement board</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review channel coverage, scheduling, and optimisation focus across every campaign placement.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {placements.map((placement) => (
            <div key={placement.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{placement.name ?? 'Untitled placement'}</h3>
                <Chip>{placement.status ?? 'Draft'}</Chip>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {[placement.surface, placement.slot].filter(Boolean).join(' · ') || 'Surface syncing'}
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-700">{placement.budgetLabel ?? 'Budget syncing'}</p>
              <p className="mt-1 text-xs text-slate-500">{placement.optimisation ?? 'Optimisation pending'}</p>
              <p className="mt-1 text-xs text-slate-500">{placement.scheduleLabel ?? 'Schedule pending'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {placement.tags.map((tag) => (
                  <span key={`${placement.id}-${tag}`} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
                    {tag}
                  </span>
                ))}
                {placement.tags.length === 0 && (
                  <span className="text-[11px] text-slate-400">No placement tags</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
