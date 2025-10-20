import { useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { createAdCampaign, updateAdCampaign, deleteAdCampaign } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ALLOWED_ROLES = new Set(['learner', 'instructor', 'admin']);

const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
];

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

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toDateTimeLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}T${hours}:${minutes}`;
}

function parseCommaSeparated(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseMultiline(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function formatPlacementLabel(placement) {
  if (!placement) return '';
  if (typeof placement === 'string') return placement;
  const label = placement.label ?? placement.name;
  if (label) return label;
  const tokens = [placement.surface, placement.slot, placement.optimisation].filter(Boolean);
  return tokens.length ? tokens.join(' · ') : '';
}

const emptyCampaignForm = {
  id: null,
  name: '',
  status: 'draft',
  objective: '',
  dailyBudgetCents: '',
  totalSpendCents: '',
  startAt: '',
  endAt: '',
  lastSyncedAt: '',
  metricsImpressions: '',
  metricsClicks: '',
  metricsConversions: '',
  metricsSpendCents: '',
  metricsRevenueCents: '',
  metricsCtr: '',
  metricsCpc: '',
  metricsCpa: '',
  metricsRoas: '',
  targetingKeywords: '',
  targetingAudiences: '',
  targetingLocations: '',
  targetingLanguages: '',
  targetingSummary: '',
  creativeHeadline: '',
  creativeDescription: '',
  creativeUrl: '',
  placements: ''
};

function CampaignForm({ form, onChange, onSubmit, onCancel, submitting }) {
  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Campaign name
          <input
            required
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Spring funnel accelerator"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Status
          <select
            name="status"
            value={form.status}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {CAMPAIGN_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Objective
        <input
          name="objective"
          value={form.objective}
          onChange={onChange}
          placeholder="Drive qualified cohort applications"
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Daily budget (cents)
          <input
            name="dailyBudgetCents"
            type="number"
            min="0"
            value={form.dailyBudgetCents}
            onChange={onChange}
            placeholder="25000"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Lifetime spend (cents)
          <input
            name="totalSpendCents"
            type="number"
            min="0"
            value={form.totalSpendCents}
            onChange={onChange}
            placeholder="125000"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          ROAS
          <input
            name="metricsRoas"
            value={form.metricsRoas}
            onChange={onChange}
            placeholder="3.4x"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Start date
          <input
            name="startAt"
            type="date"
            value={form.startAt}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          End date
          <input
            name="endAt"
            type="date"
            value={form.endAt}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Last synced
          <input
            name="lastSyncedAt"
            type="datetime-local"
            value={form.lastSyncedAt}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>

      <fieldset className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Performance metrics</legend>
        <div className="mt-2 grid gap-4 md:grid-cols-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Impressions
            <input
              name="metricsImpressions"
              type="number"
              min="0"
              value={form.metricsImpressions}
              onChange={onChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Clicks
            <input
              name="metricsClicks"
              type="number"
              min="0"
              value={form.metricsClicks}
              onChange={onChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Conversions
            <input
              name="metricsConversions"
              type="number"
              min="0"
              value={form.metricsConversions}
              onChange={onChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Spend (cents)
            <input
              name="metricsSpendCents"
              type="number"
              min="0"
              value={form.metricsSpendCents}
              onChange={onChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Revenue (cents)
            <input
              name="metricsRevenueCents"
              type="number"
              min="0"
              value={form.metricsRevenueCents}
              onChange={onChange}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            CTR (%)
            <input
              name="metricsCtr"
              value={form.metricsCtr}
              onChange={onChange}
              placeholder="3.2"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            CPC (currency)
            <input
              name="metricsCpc"
              value={form.metricsCpc}
              onChange={onChange}
              placeholder="$2.40"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            CPA (currency)
            <input
              name="metricsCpa"
              value={form.metricsCpa}
              onChange={onChange}
              placeholder="$18.00"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Targeting</legend>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Keywords (comma separated)
            <input
              name="targetingKeywords"
              value={form.targetingKeywords}
              onChange={onChange}
              placeholder="product strategy, design systems"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Audiences (comma separated)
            <input
              name="targetingAudiences"
              value={form.targetingAudiences}
              onChange={onChange}
              placeholder="Product leads, Design managers"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Locations (comma separated)
            <input
              name="targetingLocations"
              value={form.targetingLocations}
              onChange={onChange}
              placeholder="United States, Canada"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Languages (comma separated)
            <input
              name="targetingLanguages"
              value={form.targetingLanguages}
              onChange={onChange}
              placeholder="English, Spanish"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
            Summary insight
            <textarea
              name="targetingSummary"
              value={form.targetingSummary}
              onChange={onChange}
              rows={2}
              placeholder="Design leaders in North America with active hiring roadmaps."
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Creative</legend>
        <div className="mt-2 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Headline
            <input
              name="creativeHeadline"
              value={form.creativeHeadline}
              onChange={onChange}
              placeholder="Launch elite cohorts in 60 days"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Description
            <textarea
              name="creativeDescription"
              value={form.creativeDescription}
              onChange={onChange}
              rows={2}
              placeholder="Partner with Edulure producers to design premium cohort experiences."
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Destination URL
            <input
              name="creativeUrl"
              value={form.creativeUrl}
              onChange={onChange}
              placeholder="https://edulure.test/campaigns/spring-growth"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
      </fieldset>

      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Placements (one per line)
        <textarea
          name="placements"
          value={form.placements}
          onChange={onChange}
          rows={3}
          placeholder="Discovery Feed · Homepage Hero"
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="dashboard-primary-pill px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save campaign'}
        </button>
        <button type="button" onClick={onCancel} className="dashboard-pill px-5 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

CampaignForm.defaultProps = {
  submitting: false
};

export default function EdulureAds() {
  const { role, dashboard, refresh } = useOutletContext();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const adsRaw = dashboard?.ads ?? null;

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

    return { campaigns, summary };
  }, [adsRaw]);

  const [statusMessage, setStatusMessage] = useState(null);
  const [campaignFormVisible, setCampaignFormVisible] = useState(false);
  const [campaignForm, setCampaignForm] = useState(emptyCampaignForm);
  const [campaignSubmitting, setCampaignSubmitting] = useState(false);

  const campaigns = ads?.campaigns ?? [];
  const summary = ads?.summary ?? {};

  const handleCampaignFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setCampaignForm((current) => ({ ...current, [name]: value }));
  }, []);

  const closeCampaignForm = useCallback(() => {
    setCampaignForm(emptyCampaignForm);
    setCampaignFormVisible(false);
    setCampaignSubmitting(false);
  }, []);

  const openCampaignForm = useCallback((campaign) => {
    if (campaign) {
      setCampaignForm({
        id: campaign.id,
        name: campaign.name ?? '',
        status: campaign.status ?? 'draft',
        objective: campaign.objective ?? '',
        dailyBudgetCents: campaign.dailyBudgetCents != null ? String(campaign.dailyBudgetCents) : '',
        totalSpendCents: campaign.totalSpendCents != null ? String(campaign.totalSpendCents) : '',
        startAt: toDateInput(campaign.startAt),
        endAt: toDateInput(campaign.endAt),
        lastSyncedAt: toDateTimeLocalInput(campaign.lastSyncedAt ?? campaign.metrics?.lastSyncedAt),
        metricsImpressions: campaign.metrics?.impressions ?? '',
        metricsClicks: campaign.metrics?.clicks ?? '',
        metricsConversions: campaign.metrics?.conversions ?? '',
        metricsSpendCents: campaign.metrics?.spendCents ?? '',
        metricsRevenueCents: campaign.metrics?.revenueCents ?? '',
        metricsCtr: campaign.metrics?.ctr ?? '',
        metricsCpc: campaign.metrics?.cpc ?? '',
        metricsCpa: campaign.metrics?.cpa ?? '',
        metricsRoas: campaign.metrics?.roas ?? '',
        targetingKeywords: (campaign.targeting?.keywords ?? []).join(', '),
        targetingAudiences: (campaign.targeting?.audiences ?? []).join(', '),
        targetingLocations: (campaign.targeting?.locations ?? []).join(', '),
        targetingLanguages: (campaign.targeting?.languages ?? []).join(', '),
        targetingSummary: campaign.targeting?.summary ?? '',
        creativeHeadline: campaign.creative?.headline ?? '',
        creativeDescription: campaign.creative?.description ?? '',
        creativeUrl: campaign.creative?.url ?? '',
        placements: campaign.placements.map((placement) => formatPlacementLabel(placement)).filter(Boolean).join('\n')
      });
    } else {
      setCampaignForm(emptyCampaignForm);
    }
    setCampaignFormVisible(true);
  }, []);

  const handleCampaignSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage Edulure Ads.' });
        return;
      }

      setCampaignSubmitting(true);

      const payload = {
        name: campaignForm.name.trim(),
        status: campaignForm.status,
        objective: campaignForm.objective?.trim() || null,
        dailyBudgetCents: Number(campaignForm.dailyBudgetCents || 0),
        totalSpendCents: Number(campaignForm.totalSpendCents || 0),
        startAt: campaignForm.startAt || null,
        endAt: campaignForm.endAt || null,
        lastSyncedAt: campaignForm.lastSyncedAt ? new Date(campaignForm.lastSyncedAt).toISOString() : null,
        metrics: {
          impressions: Number(campaignForm.metricsImpressions || 0),
          clicks: Number(campaignForm.metricsClicks || 0),
          conversions: Number(campaignForm.metricsConversions || 0),
          spendCents: Number(campaignForm.metricsSpendCents || 0),
          revenueCents: Number(campaignForm.metricsRevenueCents || 0),
          ctr: campaignForm.metricsCtr || null,
          cpc: campaignForm.metricsCpc || null,
          cpa: campaignForm.metricsCpa || null,
          roas: campaignForm.metricsRoas || null,
          lastSyncedAt: campaignForm.lastSyncedAt ? new Date(campaignForm.lastSyncedAt).toISOString() : null
        },
        targeting: {
          summary: campaignForm.targetingSummary?.trim() || '',
          keywords: parseCommaSeparated(campaignForm.targetingKeywords),
          audiences: parseCommaSeparated(campaignForm.targetingAudiences),
          locations: parseCommaSeparated(campaignForm.targetingLocations),
          languages: parseCommaSeparated(campaignForm.targetingLanguages)
        },
        creative: {
          headline: campaignForm.creativeHeadline?.trim() || null,
          description: campaignForm.creativeDescription?.trim() || null,
          url: campaignForm.creativeUrl?.trim() || null
        },
        placements: parseMultiline(campaignForm.placements)
      };

      try {
        if (campaignForm.id) {
          await updateAdCampaign({ token, campaignId: campaignForm.id, payload });
          setStatusMessage({ type: 'success', message: 'Campaign updated successfully.' });
        } else {
          await createAdCampaign({ token, payload });
          setStatusMessage({ type: 'success', message: 'New Edulure Ads campaign launched.' });
        }
        closeCampaignForm();
        await refresh?.();
      } catch (error) {
        setStatusMessage({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unable to save campaign right now.'
        });
      } finally {
        setCampaignSubmitting(false);
      }
    },
    [campaignForm, closeCampaignForm, refresh, token]
  );

  const handleCampaignDelete = useCallback(
    async (campaignId) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage Edulure Ads.' });
        return;
      }
      try {
        await deleteAdCampaign({ token, campaignId });
        setStatusMessage({ type: 'success', message: 'Campaign archived.' });
        await refresh?.();
      } catch (error) {
        setStatusMessage({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unable to archive this campaign.'
        });
      }
    },
    [refresh, token]
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

  if (!hasSignals) {
    return (
      <DashboardStateMessage
        title="No campaigns yet"
        description="Launch your first Edulure Ads campaign to unlock performance analytics and payout automation."
        actionLabel="Create campaign"
        onAction={() => openCampaignForm(null)}
      />
    );
  }

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

  return (
    <div className="space-y-8">
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
          <button type="button" className="dashboard-primary-pill px-5 py-2" onClick={() => openCampaignForm(null)}>
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

      <section className="dashboard-section">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Performance overview</h2>
            <p className="mt-1 text-xs text-slate-500">
              Last synced {summary.lastSyncedAt ? new Date(summary.lastSyncedAt).toLocaleString() : '—'}
            </p>
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
                    {(campaign.targeting?.audiences ?? []).map((audience) => (
                      <span key={`${campaign.id}-aud-${audience}`} className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-600">
                        {audience}
                      </span>
                    ))}
                    {(campaign.targeting?.locations ?? []).map((location) => (
                      <span key={`${campaign.id}-loc-${location}`} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                        {location}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Creative</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{campaign.creative?.headline ?? 'Untitled creative'}</p>
                  <p className="mt-2 text-xs text-slate-600">{campaign.creative?.description ?? 'Add a description to increase engagement.'}</p>
                  {campaign.creative?.url ? (
                    <a
                      href={campaign.creative.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-dark"
                    >
                      Preview creative <span aria-hidden="true">→</span>
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
                {placements.length
                  ? placements.map((placement) => (
                      <span
                        key={`${campaign.id}-placement-${placement}`}
                        className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600"
                      >
                        {placement}
                      </span>
                    ))
                  : (
                      <span className="text-slate-400">Add placements to monitor channel coverage.</span>
                    )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" className="dashboard-pill px-4 py-2 text-sm" onClick={() => openCampaignForm(campaign)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="dashboard-pill border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600"
                  onClick={() => handleCampaignDelete(campaign.id)}
                >
                  Archive
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
