/* eslint-disable react-hooks/rules-of-hooks */
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import CampaignEditor from '../../components/ads/CampaignEditor.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  createAdsCampaign,
  listAdsCampaigns,
  pauseAdsCampaign,
  recordAdsCampaignMetrics,
  resumeAdsCampaign,
  updateAdsCampaign
} from '../../api/adsApi.js';

const ALLOWED_ROLES = new Set(['learner', 'instructor', 'admin']);

const createMetricsDraft = () => ({
  campaignId: '',
  impressions: '',
  clicks: '',
  conversions: '',
  spendCents: '',
  revenueCents: ''
});

const STATUS_CHOICES = ['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'];

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

function formatCompactNumber(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || Number.isNaN(numeric) || numeric <= 0) {
    return '0';
  }
  return compactNumberFormatter.format(numeric);
}

function formatPlacementLabel(placement) {
  if (!placement) return '';
  if (typeof placement === 'string') return placement;
  const label = placement.label ?? placement.name;
  if (label) return label;
  const tokens = [placement.surface, placement.slot, placement.optimisation].filter(Boolean);
  return tokens.length ? tokens.join(' · ') : '';
}

function formatInteger(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numeric);
}

function formatDateLabel(value) {
  if (!value) {
    return 'Not available';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : 'Unknown';
  }
  return date.toLocaleString();
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      {children}
    </span>
  );
}

Chip.propTypes = {
  children: PropTypes.node.isRequired
};

export default function EdulureAds() {
  const { role, dashboard, refresh } = useOutletContext();
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [campaignsState, setCampaignsState] = useState({ items: [], loading: false, error: null });
  const [metricsDraft, setMetricsDraft] = useState(createMetricsDraft);
  const [feedback, setFeedback] = useState(null);
  const adsRaw = dashboard?.ads ?? null;
  const [statusMessage, setStatusMessage] = useState(null);
  const [editorState, setEditorState] = useState({ open: false, campaign: null, mode: 'create' });
  const [editorSubmitting, setEditorSubmitting] = useState(false);
  const { campaign: activeCampaign, mode: editorMode } = editorState;

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

  const openEditor = useCallback((campaign) => {
    setEditorState({ open: true, campaign, mode: campaign ? 'edit' : 'create' });
  }, []);

  const closeEditor = useCallback(() => {
    setEditorState({ open: false, campaign: null, mode: 'create' });
    setEditorSubmitting(false);
  }, []);

  const handleEditorSubmit = useCallback(
    async (payload) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage Edulure Ads.' });
        return;
      }

      setEditorSubmitting(true);
      try {
        if (editorMode === 'edit' && activeCampaign?.id) {
          await updateAdsCampaign({ token, campaignId: activeCampaign.id, payload });
          setStatusMessage({ type: 'success', message: 'Campaign updated successfully.' });
        } else {
          await createAdsCampaign({ token, payload });
          setStatusMessage({ type: 'success', message: 'New Edulure Ads campaign launched.' });
        }
        await loadCampaigns();
        await refresh?.();
        closeEditor();
      } catch (error) {
        setStatusMessage({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unable to save campaign right now.'
        });
      } finally {
        setEditorSubmitting(false);
      }
    },
    [activeCampaign?.id, closeEditor, editorMode, loadCampaigns, refresh, token]
  );

  const ads = useMemo(() => {
    if (!adsRaw || typeof adsRaw !== 'object') return null;

    const campaigns = Array.isArray(adsRaw.campaigns)
      ? adsRaw.campaigns.map((campaign) => ({
          ...campaign,
          metrics: campaign.metrics && typeof campaign.metrics === 'object' ? campaign.metrics : {},
          targeting: campaign.targeting && typeof campaign.targeting === 'object' ? campaign.targeting : {},
          creative: campaign.creative && typeof campaign.creative === 'object' ? campaign.creative : {},
          placements: Array.isArray(campaign.placements) ? campaign.placements : []
        }))
      : [];

    const summary = adsRaw.summary && typeof adsRaw.summary === 'object' ? adsRaw.summary : {};
    const experiments = Array.isArray(adsRaw.experiments) ? adsRaw.experiments : [];
    const placements = Array.isArray(adsRaw.placements) ? adsRaw.placements : [];
    const targeting =
      adsRaw.targeting && typeof adsRaw.targeting === 'object'
        ? {
            keywords: Array.isArray(adsRaw.targeting.keywords) ? adsRaw.targeting.keywords : [],
            audiences: Array.isArray(adsRaw.targeting.audiences) ? adsRaw.targeting.audiences : [],
            locations: Array.isArray(adsRaw.targeting.locations) ? adsRaw.targeting.locations : [],
            languages: Array.isArray(adsRaw.targeting.languages) ? adsRaw.targeting.languages : [],
            summary: typeof adsRaw.targeting.summary === 'string' ? adsRaw.targeting.summary : ''
          }
        : { keywords: [], audiences: [], locations: [], languages: [], summary: '' };
    const tags = Array.isArray(adsRaw.tags) ? adsRaw.tags : [];

    return { campaigns, summary, experiments, placements, targeting, tags };
  }, [adsRaw]);

  const campaigns = ads?.campaigns ?? [];
  const summary = ads?.summary ?? {};

  const campaignHealth = useMemo(
    () =>
      campaigns.map((campaign) => {
        const issues = [];
        if (!campaign.creative?.headline) {
          issues.push('Missing headline copy');
        }
        if (campaign.status === 'active' && !campaign.endAt) {
          issues.push('Active flight has no scheduled end date');
        }
        if (!campaign.placements?.length) {
          issues.push('No placements selected');
        }
        if (campaign.dailyBudgetCents && campaign.dailyBudgetCents < (summary?.budgetPolicy?.minimumDailyCents ?? 500)) {
          issues.push('Daily budget below policy minimum');
        }
        return {
          id: campaign.id,
          name: campaign.name ?? `Campaign ${campaign.id}`,
          status: campaign.status,
          issues
        };
      }),
    [campaigns, summary?.budgetPolicy?.minimumDailyCents]
  );

  const flaggedCampaigns = useMemo(
    () => campaignHealth.filter((item) => item.issues.length > 0),
    [campaignHealth]
  );

  if (role && !ALLOWED_ROLES.has(role)) {
    return (
      <DashboardStateMessage
        title="Restricted access"
        description="Switch to a learner or instructor Learnspace to orchestrate Edulure Ads placements."
        actionLabel="Return"
        onAction={() => window.history.back()}
      />
    );
  }

  if (!ads) {
    return (
      <DashboardStateMessage
        title="Edulure Ads workspace offline"
        description="We could not retrieve the latest campaign data. Refresh once accounts are connected."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const hasSignals = campaigns.length > 0;

  const showTelemetryNotice = !hasSignals;

  const overviewMetrics = [
    {
      title: 'Active campaigns',
      value: summary.activeCampaigns ?? campaigns.filter((campaign) => campaign.status === 'active').length,
      hint: 'Live flighting'
    },
    {
      title: 'Lifetime spend',
      value: summary.totalSpend ?? currencyFormatter.format(
        campaigns.reduce((total, campaign) => total + Number(campaign.totalSpendCents ?? 0), 0) / 100
      ),
      hint: 'All placements'
    },
    {
      title: 'Average daily budget',
      value: summary.averageDailyBudget ?? currencyFormatter.format(
        campaigns.length
          ? campaigns.reduce((total, campaign) => total + Number(campaign.dailyBudgetCents ?? 0), 0) /
            (campaigns.length * 100)
          : 0
      ),
      hint: 'Current period'
    },
    {
      title: 'Total impressions',
      value: formatCompactNumber(campaigns.reduce((total, campaign) => total + Number(campaign.metrics?.impressions ?? 0), 0)),
      hint: 'Last sync'
    },
    {
      title: 'Total clicks',
      value: formatCompactNumber(campaigns.reduce((total, campaign) => total + Number(campaign.metrics?.clicks ?? 0), 0)),
      hint: 'Last sync'
    },
    {
      title: 'Conversions',
      value: formatCompactNumber(
        campaigns.reduce((total, campaign) => total + Number(campaign.metrics?.conversions ?? 0), 0)
      ),
      hint: 'Attributed'
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

  const experiments = ads.experiments ?? [];
  const placements = ads.placements ?? [];
  const targeting = ads.targeting ?? { keywords: [], audiences: [], locations: [], languages: [], summary: '' };
  const tags = ads.tags ?? [];

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="dashboard-kicker text-primary">Growth engine</p>
          <h1 className="dashboard-title">Coordinate Edulure Ads campaigns</h1>
          <p className="dashboard-subtitle">
            Launch paid growth experiments, orchestrate targeting, and review revenue telemetry without leaving the dashboard.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="dashboard-pill px-5 py-2" onClick={() => refresh?.()}>
            Refresh metrics
          </button>
          <button type="button" className="dashboard-primary-pill px-5 py-2" onClick={() => openEditor(null)}>
            New campaign
          </button>
        </div>
      </header>

      {statusMessage ? (
        <div
          role="status"
          className={`rounded-3xl border px-4 py-3 text-sm ${
            statusMessage.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : statusMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}

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

        {editorState.open ? (
          <CampaignEditor
            initialCampaign={activeCampaign}
            availablePlacements={ads?.placements ?? []}
            onSubmit={handleEditorSubmit}
            onCancel={closeEditor}
            submitting={editorSubmitting}
            token={token}
            mode={editorMode}
            budgetPolicy={ads?.policy?.budget ?? summary?.budgetPolicy ?? null}
            locale={dashboard?.locale ?? 'en-US'}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
            Use the <span className="font-semibold text-primary">New campaign</span> button above to open the shared campaign
            editor. Upload creatives, pick placements, and tune brand safety from one workflow before publishing.
          </div>
        )}

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

        {flaggedCampaigns.length ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Campaign quality checks</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              {flaggedCampaigns.map((item) => (
                <li key={item.id}>
                  <span className="font-semibold">{item.name}.</span>{' '}
                  {item.issues.join('; ')}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {(campaign.placements ?? []).map((placement) => (
                      <span
                        key={`${campaign.id}-placement-${placement.context}`}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600"
                      >
                        {placement.label ?? placement.surface ?? placement.context}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Brand safety: {(campaign.brandSafety?.categories ?? ['standard']).join(', ')}
                  </p>
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
                  <button
                    type="button"
                    className="dashboard-pill px-3 py-1"
                    onClick={() => openEditor(campaign)}
                  >
                    Edit campaign
                  </button>
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

      {campaignFormVisible ? (
        <section className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">
            {campaignForm.id ? 'Edit Edulure Ads campaign' : 'Launch new campaign'}
          </h2>
          <CampaignForm
            form={campaignForm}
            onChange={handleCampaignFieldChange}
            onSubmit={handleCampaignSubmit}
            onCancel={closeCampaignForm}
            submitting={campaignSubmitting}
          />
        </section>
      ) : null}

      <section className="space-y-6">
        {campaigns.map((campaign) => {
          const placements = campaign.placements.map((placement) => formatPlacementLabel(placement)).filter(Boolean);
          return (
            <article
              key={campaign.id}
              className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="dashboard-kicker text-primary">{campaign.objective ?? 'Campaign objective'}</p>
                  <h3 className="text-xl font-semibold text-slate-950">{campaign.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {campaign.startAt ? new Date(campaign.startAt).toLocaleDateString() : 'Schedule pending'} —{' '}
                    {campaign.endAt ? new Date(campaign.endAt).toLocaleDateString() : 'No end date'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                    {campaign.status}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                    {currencyFormatter.format(Number(campaign.dailyBudgetCents ?? 0) / 100)} / day
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                    Lifetime {currencyFormatter.format(Number(campaign.totalSpendCents ?? 0) / 100)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Volume</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCompactNumber(campaign.metrics?.impressions)} impressions
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatCompactNumber(campaign.metrics?.clicks)} clicks ·{' '}
                    {formatCompactNumber(campaign.metrics?.conversions)} conversions
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Efficiency</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {campaign.metrics?.ctr ? `${campaign.metrics.ctr}% CTR` : 'CTR syncing'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {campaign.metrics?.cpc ?? 'CPC syncing'} · {campaign.metrics?.cpa ?? 'CPA syncing'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {currencyFormatter.format(Number(campaign.metrics?.revenueCents ?? 0) / 100)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">ROAS {campaign.metrics?.roas ?? 'Syncing'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last synced</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {campaign.metrics?.lastSyncedAt
                      ? new Date(campaign.metrics.lastSyncedAt).toLocaleString()
                      : campaign.lastSyncedAt
                        ? new Date(campaign.lastSyncedAt).toLocaleString()
                        : 'Awaiting sync'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{campaign.placements.length} placements tracked</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Targeting focus</p>
                  <p className="mt-2 text-sm text-slate-700">{campaign.targeting?.summary || 'Add a targeting narrative.'}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    {(campaign.targeting?.keywords ?? []).map((keyword) => (
                      <span key={`${campaign.id}-kw-${keyword}`} className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
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
          );
        })}

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
              <article key={placement.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
              </article>
            ))}
          </div>
        </section>
      </div>
  );
}
