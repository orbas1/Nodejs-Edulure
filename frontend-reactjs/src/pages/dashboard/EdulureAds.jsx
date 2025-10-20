/* eslint-disable react-hooks/rules-of-hooks */
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
          await updateAdsCampaign({ token, campaignId: campaignForm.id, payload });
          setStatusMessage({ type: 'success', message: 'Campaign updated successfully.' });
        } else {
          await createAdsCampaign({ token, payload });
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
