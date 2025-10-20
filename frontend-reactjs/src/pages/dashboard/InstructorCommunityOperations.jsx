import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AdjustmentsHorizontalIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BanknotesIcon,
  QueueListIcon,
  PlayCircleIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchCommunities,
  fetchCommunityDetail,
  updateCommunity,
  fetchCommunityRevenueSummary,
  createCommunityTier,
  updateCommunityTier,
  fetchCommunityIncidents,
  resolveCommunityIncident,
  listCommunitySubscriptions,
  updateCommunitySubscription,
  fetchCommunityMembers,
  createCommunityMember,
  updateCommunityMember,
  removeCommunityMember,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost
} from '../../api/communityApi.js';

const tabs = [
  { id: 'revenue', label: 'Revenue', icon: BanknotesIcon },
  { id: 'broadcast', label: 'Broadcast', icon: MegaphoneIcon },
  { id: 'safety', label: 'Safety', icon: ShieldCheckIcon },
  { id: 'subscriptions', label: 'Subscriptions', icon: QueueListIcon },
  { id: 'members', label: 'Member management', icon: UserGroupIcon },
  { id: 'manage', label: 'Manage', icon: AdjustmentsHorizontalIcon }
];

function SectionHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Instructor community</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.node,
  actions: PropTypes.node
};

SectionHeader.defaultProps = {
  description: null,
  actions: null
};

function CommunitySelector({ communities, selectedId, onSelect }) {
  if (!communities.length) {
    return (
      <DashboardStateMessage
        title="No communities available"
        description="Create your first community to unlock instructor operations."
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {communities.map((community) => (
        <button
          key={community.id}
          type="button"
          onClick={() => onSelect(community.id)}
          className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
            community.id === selectedId
              ? 'bg-primary text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
          }`}
        >
          {community.name}
        </button>
      ))}
    </div>
  );
}

CommunitySelector.propTypes = {
  communities: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedId: PropTypes.number,
  onSelect: PropTypes.func.isRequired
};

CommunitySelector.defaultProps = {
  selectedId: null
};
function RevenuePanel({ communityId, token }) {
  const [summary, setSummary] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [tierDraft, setTierDraft] = useState({ name: '', priceCents: 4900, billingInterval: 'monthly' });
  const [selectedTier, setSelectedTier] = useState(null);
  const [tierEditor, setTierEditor] = useState({ name: '', priceCents: 0, description: '', benefits: '' });

  const loadRevenue = useCallback(async () => {
    if (!communityId || !token) return;
    setLoading(true);
    try {
      const response = await fetchCommunityRevenueSummary({ communityId, token });
      setSummary(response.data ?? null);
      const detail = await fetchCommunityDetail(communityId, token);
      const paywall = detail?.data?.paywall ?? {};
      const nextTiers = Array.isArray(paywall.tiers) ? paywall.tiers : [];
      setTiers(nextTiers);
      if (nextTiers.length && !selectedTier) {
        const [firstTier] = nextTiers;
        setSelectedTier(firstTier);
        setTierEditor({
          name: firstTier.name ?? '',
          priceCents: firstTier.priceCents ?? 0,
          description: firstTier.description ?? '',
          benefits: Array.isArray(firstTier.benefits) ? firstTier.benefits.join(', ') : ''
        });
      } else if (!nextTiers.length) {
        setSelectedTier(null);
        setTierEditor({ name: '', priceCents: 0, description: '', benefits: '' });
      }
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load revenue telemetry.' });
    } finally {
      setLoading(false);
    }
  }, [communityId, token, selectedTier]);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  const handleCreateTier = useCallback(
    async (event) => {
      event.preventDefault();
      if (!communityId || !token) return;
      setFeedback(null);
      try {
        await createCommunityTier({
          communityId,
          token,
          payload: {
            name: tierDraft.name,
            priceCents: Number(tierDraft.priceCents ?? 0),
            currency: summary?.currency ?? 'USD',
            billingInterval: tierDraft.billingInterval,
            description: '',
            benefits: []
          }
        });
        setTierDraft({ name: '', priceCents: 4900, billingInterval: 'monthly' });
        setFeedback({ tone: 'success', message: 'Tier created successfully.' });
        loadRevenue();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to create tier.' });
      }
    },
    [communityId, token, tierDraft, summary?.currency, loadRevenue]
  );

  const handleToggleTier = useCallback(
    async (tier) => {
      if (!communityId || !token) return;
      setFeedback(null);
      try {
        await updateCommunityTier({
          communityId,
          tierId: tier.id,
          token,
          payload: { isActive: !tier.isActive }
        });
        setFeedback({ tone: 'success', message: `${tier.name} ${tier.isActive ? 'disabled' : 'activated'}.` });
        loadRevenue();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update tier.' });
      }
    },
    [communityId, token, loadRevenue]
  );

  const handleTierSelection = useCallback((tier) => {
    setSelectedTier(tier);
    setTierEditor({
      name: tier.name ?? '',
      priceCents: tier.priceCents ?? 0,
      description: tier.description ?? '',
      benefits: Array.isArray(tier.benefits) ? tier.benefits.join(', ') : ''
    });
  }, []);

  const handleTierUpdate = useCallback(
    async (event) => {
      event.preventDefault();
      if (!communityId || !token || !selectedTier) return;
      setFeedback(null);
      try {
        await updateCommunityTier({
          communityId,
          tierId: selectedTier.id,
          token,
          payload: {
            name: tierEditor.name || undefined,
            priceCents: Number(tierEditor.priceCents) || undefined,
            description: tierEditor.description || undefined,
            benefits: tierEditor.benefits
              ? tierEditor.benefits
                  .split(',')
                  .map((benefit) => benefit.trim())
                  .filter(Boolean)
              : undefined
          }
        });
        setFeedback({ tone: 'success', message: `${tierEditor.name || selectedTier.name} updated.` });
        loadRevenue();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update tier settings.' });
      }
    },
    [communityId, token, selectedTier, tierEditor, loadRevenue]
  );

  const mrrTrend = useMemo(() => {
    const rawTrend =
      summary?.trends?.monthlyRecurring ?? summary?.trend?.monthlyRecurring ?? summary?.monthlyRecurring ?? [];
    if (Array.isArray(rawTrend) && rawTrend.length) {
      return rawTrend
        .map((point) => ({
          label: point.label ?? point.month ?? point.period ?? '',
          value: Number(point.value ?? point.amount ?? 0)
        }))
        .filter((point) => point.label && Number.isFinite(point.value));
    }
    const fallbackBase = Number(summary?.totals?.monthlyRecurringCents ?? 0) / 100;
    return Array.from({ length: 6 }).map((_, index) => {
      const monthsAgo = 5 - index;
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);
      return {
        label: date.toLocaleString(undefined, { month: 'short' }),
        value: Math.max(0, fallbackBase - monthsAgo * (fallbackBase * 0.05))
      };
    });
  }, [summary]);

  const topTiers = useMemo(() => {
    if (!tiers.length) return [];
    return [...tiers]
      .sort((a, b) => (b.metrics?.activeMembers ?? 0) - (a.metrics?.activeMembers ?? 0))
      .slice(0, 3);
  }, [tiers]);

  if (!communityId) {
    return <DashboardStateMessage title="Choose a community" description="Select a community to review revenue." />;
  }

  const totals = summary?.totals ?? {};

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Revenue intelligence"
        description="Monitor recurring revenue and manage paywall tiers without leaving your instructor dashboard."
        actions={
          <button type="button" className="dashboard-primary-pill" onClick={loadRevenue} disabled={loading}>
            Refresh metrics
          </button>
        }
      />

      {feedback && <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly recurring</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {new Intl.NumberFormat(undefined, { style: 'currency', currency: summary?.currency ?? 'USD' }).format(
              (totals.monthlyRecurringCents ?? 0) / 100
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active subscriptions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.activeSubscriptions ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paused</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.pausedSubscriptions ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">30 day churn</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totals.churnRate ?? 0}%</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Paywall tiers</h3>
          <p className="mb-4 text-sm text-slate-600">Toggle live tiers to control who has access to premium programmes.</p>
          <ul className="space-y-3">
            {tiers.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No tiers configured yet.
              </li>
            ) : (
              tiers.map((tier) => (
                <li
                  key={tier.id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 transition ${
                    selectedTier?.id === tier.id
                      ? 'border-primary/60 bg-primary/5 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{tier.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: tier.currency ?? 'USD' }).format(
                          (tier.priceCents ?? 0) / 100
                        )}{' '}
                        · {tier.billingInterval}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs"
                        onClick={() => handleToggleTier(tier)}
                      >
                        {tier.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs"
                        onClick={() => handleTierSelection(tier)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  {tier.metrics?.activeMembers && (
                    <p className="text-xs text-slate-500">{tier.metrics.activeMembers} active members</p>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
        <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleCreateTier}>
          <h3 className="text-lg font-semibold text-slate-900">Launch new tier</h3>
          <div className="mt-4 grid gap-3">
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              Name
              <input
                type="text"
                required
                value={tierDraft.name}
                onChange={(event) => setTierDraft((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              Price (cents)
              <input
                type="number"
                min="100"
                value={tierDraft.priceCents}
                onChange={(event) => setTierDraft((prev) => ({ ...prev, priceCents: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              Billing interval
              <select
                value={tierDraft.billingInterval}
                onChange={(event) => setTierDraft((prev) => ({ ...prev, billingInterval: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            Create tier
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <form className="rounded-2xl border border-primary/40 bg-white p-5 shadow-sm" onSubmit={handleTierUpdate}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Tier configuration</h3>
            {selectedTier && (
              <span className="text-xs font-semibold uppercase text-primary">Editing {selectedTier.name}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Fine-tune pricing, benefits and messaging before publishing changes live to members.
          </p>
          {selectedTier ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Tier name
                <input
                  type="text"
                  required
                  value={tierEditor.name}
                  onChange={(event) => setTierEditor((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Price (cents)
                <input
                  type="number"
                  min="100"
                  value={tierEditor.priceCents}
                  onChange={(event) => setTierEditor((prev) => ({ ...prev, priceCents: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
                Description
                <textarea
                  rows={3}
                  value={tierEditor.description}
                  onChange={(event) => setTierEditor((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
                Benefits (comma separated)
                <input
                  type="text"
                  value={tierEditor.benefits}
                  onChange={(event) => setTierEditor((prev) => ({ ...prev, benefits: event.target.value }))}
                  placeholder="Weekly coaching, Bonus lessons, Office hours"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" className="dashboard-pill px-3 py-1 text-xs" onClick={() => setSelectedTier(null)}>
                  Cancel
                </button>
                <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                  Save tier changes
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Select a tier to unlock advanced editing controls.
            </div>
          )}
        </form>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">MRR trend</h3>
            <p className="text-xs text-slate-500">Six-month look at monthly recurring revenue.</p>
            <svg viewBox="0 0 240 120" className="mt-4 h-32 w-full">
              <polyline
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3"
                strokeLinecap="round"
                points={mrrTrend
                  .map((point, index) => {
                    const x = (index / Math.max(mrrTrend.length - 1, 1)) * 220 + 10;
                    const maxValue = Math.max(...mrrTrend.map((item) => item.value || 0), 1);
                    const y = 100 - (Number(point.value || 0) / maxValue) * 90 + 10;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
              {mrrTrend.map((point, index) => {
                const x = (index / Math.max(mrrTrend.length - 1, 1)) * 220 + 10;
                const maxValue = Math.max(...mrrTrend.map((item) => item.value || 0), 1);
                const y = 100 - (Number(point.value || 0) / maxValue) * 90 + 10;
                return <circle key={point.label ?? index} cx={x} cy={y} r="3" fill="#4f46e5" />;
              })}
            </svg>
            <div className="mt-3 flex justify-between text-xs text-slate-500">
              {mrrTrend.map((point) => (
                <span key={point.label}>{point.label}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Top tiers</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-600">
              {topTiers.length === 0 ? (
                <li>No active tiers yet.</li>
              ) : (
                topTiers.map((tier) => (
                  <li key={tier.id} className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{tier.name}</span>
                    <span className="text-xs text-slate-500">
                      {tier.metrics?.activeMembers ?? 0} members ·{' '}
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: tier.currency ?? 'USD' }).format(
                        (tier.priceCents ?? 0) / 100
                      )}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

RevenuePanel.propTypes = {
  communityId: PropTypes.number,
  token: PropTypes.string
};

RevenuePanel.defaultProps = {
  communityId: null,
  token: null
};
function BroadcastPanel({ communityId, token }) {
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState({
    id: null,
    title: '',
    body: '',
    stage: 'Planning',
    scheduledAt: '',
    audience: 'all_members',
    channels: ['email', 'in_app'],
    mediaUrl: '',
    ctaLabel: 'View update',
    ctaUrl: ''
  });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const totalSteps = 3;

  const loadPosts = useCallback(async () => {
    if (!communityId || !token) return;
    setLoading(true);
    try {
      const detail = await fetchCommunityDetail(communityId, token);
      const broadcasts = Array.isArray(detail?.data?.broadcasts) ? detail.data.broadcasts : [];
      setPosts(
        broadcasts.map((broadcast) => ({
          id: broadcast.id,
          title: broadcast.title ?? 'Broadcast',
          stage: broadcast.stage ?? broadcast.metadata?.stage ?? 'Planning',
          release: broadcast.release ?? broadcast.publishedAt ?? '',
          body: broadcast.body ?? '',
          metadata: broadcast.metadata ?? {}
        }))
      );
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load broadcasts.' });
    } finally {
      setLoading(false);
    }
  }, [communityId, token]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const resetDraft = useCallback(
    () =>
      setDraft({
        id: null,
        title: '',
        body: '',
        stage: 'Planning',
        scheduledAt: '',
        audience: 'all_members',
        channels: ['email', 'in_app'],
        mediaUrl: '',
        ctaLabel: 'View update',
        ctaUrl: ''
      }),
    []
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!communityId || !token) return;
      setFeedback(null);
      const payload = {
        title: draft.title,
        body: draft.body,
        postType: 'update',
        status: draft.stage === 'Live' ? 'published' : 'scheduled',
        metadata: {
          stage: draft.stage,
          audience: draft.audience,
          channels: draft.channels,
          mediaUrl: draft.mediaUrl || undefined,
          cta: {
            label: draft.ctaLabel || undefined,
            url: draft.ctaUrl || undefined
          }
        },
        scheduledAt: draft.scheduledAt || undefined
      };
      try {
        if (draft.id) {
          await updateCommunityPost({ communityId, postId: draft.id, token, payload });
          setFeedback({ tone: 'success', message: 'Broadcast updated.' });
        } else {
          await createCommunityPost({ communityId, token, payload });
          setFeedback({ tone: 'success', message: 'Broadcast created.' });
        }
        resetDraft();
        setWizardStep(1);
        loadPosts();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to save broadcast.' });
      }
    },
    [communityId, token, draft, loadPosts, resetDraft]
  );

  const handleEdit = useCallback(
    (post) => {
      const metadata = post.metadata ?? {};
      setDraft({
        id: post.id,
        title: post.title,
        body: post.body,
        stage: post.stage,
        scheduledAt: post.release ?? '',
        audience: metadata.audience ?? 'all_members',
        channels: Array.isArray(metadata.channels) && metadata.channels.length ? metadata.channels : ['email'],
        mediaUrl: metadata.mediaUrl ?? '',
        ctaLabel: metadata.cta?.label ?? 'View update',
        ctaUrl: metadata.cta?.url ?? ''
      });
      setWizardStep(totalSteps);
    },
    [totalSteps]
  );

  const handleDelete = useCallback(
    async (postId) => {
      if (!communityId || !token) return;
      if (!window.confirm('Delete this broadcast?')) return;
      try {
        await deleteCommunityPost({ communityId, postId, token });
        setFeedback({ tone: 'success', message: 'Broadcast deleted.' });
        loadPosts();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to delete broadcast.' });
      }
    },
    [communityId, token, loadPosts]
  );

  const handleChannelToggle = useCallback((channel) => {
    setDraft((prev) => {
      const exists = prev.channels.includes(channel);
      return {
        ...prev,
        channels: exists ? prev.channels.filter((item) => item !== channel) : [...prev.channels, channel]
      };
    });
  }, []);

  const goToStep = useCallback(
    (step) => {
      setWizardStep((current) => {
        const next = typeof step === 'number' ? step : current + step;
        return Math.min(Math.max(next, 1), totalSteps);
      });
    },
    [totalSteps]
  );

  if (!communityId) {
    return <DashboardStateMessage title="Choose a community" description="Select a community to plan broadcasts." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Broadcast playbook"
        description="Keep members engaged with staged broadcast campaigns across your community."
      />
      {feedback && <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{draft.id ? 'Update broadcast' : 'Create broadcast'}</h3>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              {Array.from({ length: totalSteps }).map((_, index) => {
                const stepNumber = index + 1;
                const isActive = wizardStep === stepNumber;
                return (
                  <button
                    key={stepNumber}
                    type="button"
                    onClick={() => goToStep(stepNumber)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
                      isActive
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-primary'
                    }`}
                  >
                    {stepNumber}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {wizardStep === 1 && (
              <>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Title
                  <input
                    type="text"
                    required
                    value={draft.title}
                    onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Stage
                  <select
                    value={draft.stage}
                    onChange={(event) => setDraft((prev) => ({ ...prev, stage: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Preflight">Preflight</option>
                    <option value="Live">Live</option>
                    <option value="Complete">Complete</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Broadcast body
                  <textarea
                    rows={4}
                    required
                    value={draft.body}
                    onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </>
            )}
            {wizardStep === 2 && (
              <>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Target audience
                  <select
                    value={draft.audience}
                    onChange={(event) => setDraft((prev) => ({ ...prev, audience: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="all_members">All members</option>
                    <option value="paying_members">Paying members</option>
                    <option value="trial_members">Trial members</option>
                    <option value="alumni">Alumni</option>
                  </select>
                </label>
                <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Channels</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'email', label: 'Email' },
                      { id: 'in_app', label: 'In-app' },
                      { id: 'sms', label: 'SMS' }
                    ].map((channel) => {
                      const isSelected = draft.channels.includes(channel.id);
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => handleChannelToggle(channel.id)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            isSelected ? 'bg-primary text-white' : 'border border-slate-200 text-slate-600 hover:border-primary'
                          }`}
                        >
                          {channel.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">
                    Choose how we deliver the broadcast. SMS requires short copy and opt-in members.
                  </p>
                </div>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Featured media (optional)
                  <input
                    type="url"
                    value={draft.mediaUrl}
                    onChange={(event) => setDraft((prev) => ({ ...prev, mediaUrl: event.target.value }))}
                    placeholder="https://cdn.edulure.com/broadcast-cover.mp4"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </>
            )}
            {wizardStep === 3 && (
              <>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Call-to-action label
                  <input
                    type="text"
                    value={draft.ctaLabel}
                    onChange={(event) => setDraft((prev) => ({ ...prev, ctaLabel: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Call-to-action URL
                  <input
                    type="url"
                    value={draft.ctaUrl}
                    onChange={(event) => setDraft((prev) => ({ ...prev, ctaUrl: event.target.value }))}
                    placeholder="https://edulure.com/lesson/live"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Release (optional)
                  <input
                    type="datetime-local"
                    value={draft.scheduledAt}
                    onChange={(event) => setDraft((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Preview</p>
                  <p className="mt-2">{draft.body || 'Broadcast body will appear here.'}</p>
                  {draft.mediaUrl && (
                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                      {draft.mediaUrl.endsWith('.mp4') || draft.mediaUrl.includes('youtube') ? (
                        <video controls className="h-40 w-full object-cover">
                          <source src={draft.mediaUrl} />
                        </video>
                      ) : (
                        <img src={draft.mediaUrl} alt="Broadcast media" className="h-40 w-full object-cover" />
                      )}
                    </div>
                  )}
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
                    <PlayCircleIcon className="h-4 w-4" />
                    {draft.ctaLabel || 'Open link'}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              className="dashboard-pill px-3 py-1 text-xs"
              onClick={() => goToStep(wizardStep - 1)}
              disabled={wizardStep === 1}
            >
              Back
            </button>
            <div className="flex items-center gap-3">
              {draft.id && (
                <button
                  type="button"
                  className="dashboard-pill px-3 py-1 text-xs"
                  onClick={() => {
                    resetDraft();
                    goToStep(1);
                  }}
                >
                  Cancel edit
                </button>
              )}
              {wizardStep < totalSteps ? (
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => goToStep(wizardStep + 1)}
                >
                  Continue
                </button>
              ) : (
                <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
                  {draft.id ? 'Update broadcast' : 'Create broadcast'}
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Broadcast pipeline</h3>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600">Loading broadcasts…</p>
          ) : posts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No broadcasts planned yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {posts.map((post) => (
                <li key={post.id} className="flex items-start justify-between rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{post.title}</p>
                    <p className="text-xs text-slate-500">
                      Stage {post.stage} · {post.release ? `Release ${post.release}` : 'Release TBD'}
                    </p>
                    {post.metadata?.audience && (
                      <p className="mt-1 text-xs text-slate-500">Audience: {post.metadata.audience}</p>
                    )}
                    {Array.isArray(post.metadata?.channels) && post.metadata.channels.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Channels: {post.metadata.channels.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="dashboard-pill px-3 py-1 text-xs" onClick={() => handleEdit(post)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1 text-xs text-rose-600"
                      onClick={() => handleDelete(post.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

BroadcastPanel.propTypes = {
  communityId: PropTypes.number,
  token: PropTypes.string
};

BroadcastPanel.defaultProps = {
  communityId: null,
  token: null
};

function SafetyPanel({ communityId, token }) {
  const [filters, setFilters] = useState({ status: 'pending', severity: 'medium', search: '' });
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 20 });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolutionDraft, setResolutionDraft] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const loadIncidents = useCallback(async () => {
    if (!communityId || !token) return;
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetchCommunityIncidents({
        communityId,
        token,
        params: {
          status: filters.status || undefined,
          severity: filters.severity || undefined,
          search: filters.search || undefined,
          page: pagination.page,
          perPage: pagination.perPage
        }
      });
      setIncidents(Array.isArray(response.data) ? response.data : []);
      setPagination((prev) => ({ ...prev, ...(response.meta?.pagination ?? {}) }));
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load safety incidents.' });
    } finally {
      setLoading(false);
    }
  }, [communityId, token, filters.status, filters.severity, filters.search, pagination.page, pagination.perPage]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleExportIncidents = useCallback(() => {
    if (!incidents.length) return;
    const blob = new Blob([JSON.stringify(incidents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `community-${communityId}-incidents.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [incidents, communityId]);

  const handleCopyIncident = useCallback(async (incident) => {
    try {
      await navigator.clipboard?.writeText(JSON.stringify(incident, null, 2));
      setFeedback({ tone: 'success', message: 'Incident copied to clipboard.' });
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to copy incident.' });
    }
  }, []);

  const handleResolve = useCallback(
    async (event) => {
      event.preventDefault();
      if (!resolutionDraft?.incident || !communityId || !token) return;
      setFeedback(null);
      try {
        await resolveCommunityIncident({
          communityId,
          incidentId: resolutionDraft.incident.publicId,
          token,
          payload: {
            resolutionSummary: resolutionDraft.resolutionSummary || undefined,
            followUp: resolutionDraft.followUp || undefined
          }
        });
        setFeedback({ tone: 'success', message: 'Incident marked as resolved.' });
        setResolutionDraft(null);
        loadIncidents();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to resolve incident.' });
      }
    },
    [communityId, token, resolutionDraft, loadIncidents]
  );

  if (!communityId) {
    return <DashboardStateMessage title="Choose a community" description="Select a community to review safety activity." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Safety command centre"
        description="Triaging flagged content and escalations keeps your community trusted."
        actions={
          <div className="flex gap-2">
            <button type="button" className="dashboard-primary-pill" onClick={loadIncidents} disabled={loading}>
              Refresh feed
            </button>
            <button
              type="button"
              className="dashboard-pill px-3 py-1 text-xs"
              onClick={handleExportIncidents}
              disabled={!incidents.length}
            >
              <ArrowDownTrayIcon className="mr-1 h-4 w-4" /> Export
            </button>
          </div>
        }
      />

      {feedback && (
        <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="in_review">In review</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="suppressed">Suppressed</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Severity
            <select
              value={filters.severity}
              onChange={(event) => setFilters((prev) => ({ ...prev, severity: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
            Search
            <input
              type="search"
              placeholder="Search reason, case ID, member"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading incidents…
          </div>
        ) : incidents.length === 0 ? (
          <DashboardStateMessage
            title="No incidents in this view"
            description="Great news—there are no active safety items that match your filters."
          />
        ) : (
          incidents.map((incident) => {
            const metadata = incident.metadata ?? {};
            const operations = metadata.operations ?? {};
            const acknowledgedAt = operations.acknowledgedAt ?? incident.escalatedAt;
            return (
              <div
                key={incident.publicId ?? incident.id}
                className={`rounded-2xl border p-5 shadow-sm transition ${
                  selectedIncident?.id === incident.id || selectedIncident?.publicId === incident.publicId
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-slate-200 bg-white hover:border-primary/30'
                }`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedIncident(incident)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedIncident(incident);
                  }
                }}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {incident.reason ?? 'Flagged content incident'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Case {incident.publicId ?? incident.id} · Severity {incident.severity} · Status {incident.status}
                    </p>
                    {incident.post?.title && (
                      <p className="mt-2 text-sm text-slate-600">
                        Related post: <span className="font-medium text-slate-900">{incident.post.title}</span>
                      </p>
                    )}
                    {incident.reporter?.name && (
                      <p className="mt-1 text-xs text-slate-500">Reported by {incident.reporter.name}</p>
                    )}
                    {acknowledgedAt && (
                      <p className="mt-1 text-xs text-slate-500">
                        Acknowledged {new Date(acknowledgedAt).toLocaleString()}
                      </p>
                    )}
                    {incident.resolvedAt && (
                      <p className="mt-1 text-xs text-emerald-600">
                        Resolved {new Date(incident.resolvedAt).toLocaleString()}
                      </p>
                    )}
                    {operations?.resolution?.resolutionSummary && (
                      <p className="mt-2 text-sm text-slate-600">
                        Resolution: {operations.resolution.resolutionSummary}
                      </p>
                    )}
                    {operations?.resolution?.followUp && (
                      <p className="mt-1 text-xs text-slate-500">
                        Follow-up: {operations.resolution.followUp}
                      </p>
                    )}
                    <button
                      type="button"
                      className="dashboard-pill mt-3 inline-flex items-center gap-1 px-3 py-1 text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCopyIncident(incident);
                      }}
                    >
                      <ClipboardDocumentCheckIcon className="h-4 w-4" /> Copy report
                    </button>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        incident.severity === 'critical'
                          ? 'bg-rose-100 text-rose-600'
                          : incident.severity === 'high'
                            ? 'bg-amber-100 text-amber-600'
                            : incident.severity === 'medium'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {incident.severity}
                    </span>
                    {!incident.resolvedAt && (
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          setResolutionDraft({
                            incident,
                            resolutionSummary: operations?.resolution?.resolutionSummary ?? '',
                            followUp: operations?.resolution?.followUp ?? ''
                          });
                        }}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedIncident && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Incident overview · {selectedIncident.publicId ?? selectedIncident.id}
            </h3>
            <button type="button" className="dashboard-pill px-3 py-1 text-xs" onClick={() => setSelectedIncident(null)}>
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Summary</p>
              <p className="mt-1 text-sm text-slate-700">{selectedIncident.summary ?? selectedIncident.reason}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Member</p>
              <p className="mt-1 text-sm text-slate-700">{selectedIncident.member?.name ?? 'Unknown member'}</p>
              {selectedIncident.member?.email && (
                <p className="text-xs text-slate-500">{selectedIncident.member.email}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Timeline</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {selectedIncident.reportedAt && (
                  <li>Reported {new Date(selectedIncident.reportedAt).toLocaleString()}</li>
                )}
                {selectedIncident.escalatedAt && (
                  <li>Escalated {new Date(selectedIncident.escalatedAt).toLocaleString()}</li>
                )}
                {selectedIncident.resolvedAt && (
                  <li>Resolved {new Date(selectedIncident.resolvedAt).toLocaleString()}</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Attachments</p>
              {selectedIncident.evidence?.length ? (
                <ul className="mt-1 space-y-1 text-xs text-slate-600">
                  {selectedIncident.evidence.map((item) => (
                    <li key={item.url} className="inline-flex items-center gap-2">
                      <PhotoIcon className="h-4 w-4 text-slate-400" />
                      <a href={item.url} className="text-primary" target="_blank" rel="noreferrer">
                        {item.label ?? item.url}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-slate-500">No attachments uploaded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {resolutionDraft?.incident && (
        <form className="rounded-2xl border border-primary/40 bg-primary/5 p-5 shadow-inner" onSubmit={handleResolve}>
          <h3 className="text-lg font-semibold text-slate-900">Resolve incident {resolutionDraft.incident.publicId}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Provide a concise resolution summary and optional follow-up action for your moderation journal.
          </p>
          <div className="mt-4 space-y-3">
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              Resolution summary
              <textarea
                rows={3}
                required
                value={resolutionDraft.resolutionSummary}
                onChange={(event) =>
                  setResolutionDraft((prev) => ({ ...prev, resolutionSummary: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              Follow-up task (optional)
              <textarea
                rows={2}
                value={resolutionDraft.followUp}
                onChange={(event) => setResolutionDraft((prev) => ({ ...prev, followUp: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button type="button" className="dashboard-pill px-3 py-1 text-xs" onClick={() => setResolutionDraft(null)}>
              Cancel
            </button>
            <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              Mark resolved
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

SafetyPanel.propTypes = {
  communityId: PropTypes.number,
  token: PropTypes.string
};

SafetyPanel.defaultProps = {
  communityId: null,
  token: null
};

function SubscriptionsPanel({ communityId, token }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [filters, setFilters] = useState({ status: 'active', search: '' });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  const loadSubscriptions = useCallback(async () => {
    if (!communityId || !token) return;
    setLoading(true);
    setFeedback(null);
    try {
      const response = await listCommunitySubscriptions({
        communityId,
        token,
        params: {
          status: filters.status || undefined,
          search: filters.search || undefined
        }
      });
      setSubscriptions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load subscriptions.' });
    } finally {
      setLoading(false);
    }
  }, [communityId, token, filters.status, filters.search]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleExport = useCallback(() => {
    if (!subscriptions.length) return;
    const header = 'subscription_id,member,tier,status,renewal\n';
    const rows = subscriptions
      .map((subscription) => {
        const renewalLabel = subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd).toISOString()
          : '';
        const memberName = subscription.user?.name ?? '';
        const tierName = subscription.tier?.name ?? '';
        return `${subscription.publicId},"${memberName}","${tierName}",${subscription.status},${renewalLabel}`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `community-${communityId}-subscriptions.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [subscriptions, communityId]);

  const handleStatusUpdate = useCallback(
    async (subscription, status) => {
      if (!communityId || !token) return;
      setFeedback(null);
      try {
        await updateCommunitySubscription({
          communityId,
          subscriptionId: subscription.publicId,
          token,
          payload: { status }
        });
        setFeedback({ tone: 'success', message: `Subscription ${subscription.publicId} updated.` });
        loadSubscriptions();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update subscription.' });
      }
    },
    [communityId, token, loadSubscriptions]
  );

  const handleToggleCancellation = useCallback(
    async (subscription) => {
      if (!communityId || !token) return;
      setFeedback(null);
      try {
        await updateCommunitySubscription({
          communityId,
          subscriptionId: subscription.publicId,
          token,
          payload: { cancelAtPeriodEnd: !subscription.cancelAtPeriodEnd }
        });
        setFeedback({ tone: 'success', message: 'Cancellation preference updated.' });
        loadSubscriptions();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update cancellation settings.' });
      }
    },
    [communityId, token, loadSubscriptions]
  );

  if (!communityId) {
    return (
      <DashboardStateMessage
        title="Choose a community"
        description="Select a community to inspect member subscriptions."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Subscription ledger"
        description="Track and manage every paying member in a single operations view."
        actions={
          <div className="flex gap-2">
            <button type="button" className="dashboard-primary-pill" onClick={loadSubscriptions} disabled={loading}>
              Refresh ledger
            </button>
            <button
              type="button"
              className="dashboard-pill px-3 py-1 text-xs"
              onClick={handleExport}
              disabled={!subscriptions.length}
            >
              <ArrowDownTrayIcon className="mr-1 h-4 w-4" /> Export CSV
            </button>
          </div>
        }
      />

      {feedback && (
        <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="pending">Pending</option>
              <option value="incomplete">Incomplete</option>
              <option value="trialing">Trialing</option>
              <option value="canceled">Canceled</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
            Search
            <input
              type="search"
              placeholder="Search member, tier or subscription ID"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden w-full grid-cols-12 gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <div className="col-span-3">Member</div>
          <div className="col-span-2">Tier</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Renewal</div>
          <div className="col-span-2">Cancellation</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-5 py-6 text-sm text-slate-600">Loading subscriptions…</div>
          ) : subscriptions.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-600">No subscriptions match your filters.</div>
          ) : (
            subscriptions.map((subscription) => {
              const renewalLabel = subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                : 'TBD';
              const memberName = subscription.user?.name ?? 'Member';
              const memberEmail = subscription.user?.email ?? 'N/A';
              const tierName = subscription.tier?.name ?? '—';
              return (
                <div
                  key={subscription.publicId}
                  className="grid grid-cols-1 gap-4 px-5 py-4 text-sm text-slate-700 md:grid-cols-12 md:items-center"
                >
                  <div className="md:col-span-3">
                    <p className="font-semibold text-slate-900">{memberName}</p>
                    <p className="text-xs text-slate-500">{memberEmail}</p>
                    <p className="text-xs text-slate-400">ID {subscription.publicId}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p>{tierName}</p>
                    <p className="text-xs text-slate-500">
                      {subscription.tier?.priceCents
                        ? `${new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: subscription.tier.currency ?? 'USD'
                          }).format(subscription.tier.priceCents / 100)} / ${subscription.tier.interval}`
                        : 'Custom tier'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        subscription.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : subscription.status === 'paused'
                            ? 'bg-amber-100 text-amber-600'
                            : subscription.status === 'canceled'
                              ? 'bg-rose-100 text-rose-600'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {subscription.status}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <p>{renewalLabel}</p>
                    {subscription.cancelAtPeriodEnd && (
                      <p className="text-xs text-amber-600">Will end after this period</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1 text-xs"
                      onClick={() => handleToggleCancellation(subscription)}
                    >
                      {subscription.cancelAtPeriodEnd ? 'Reinstate renewal' : 'Cancel at period end'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 md:col-span-1 md:justify-end">
                    {subscription.status !== 'active' && (
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs"
                        onClick={() => handleStatusUpdate(subscription, 'active')}
                      >
                        Activate
                      </button>
                    )}
                    {subscription.status === 'active' && (
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs"
                        onClick={() => handleStatusUpdate(subscription, 'paused')}
                      >
                        Pause
                      </button>
                    )}
                    {subscription.status !== 'canceled' && (
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs text-rose-600"
                        onClick={() => handleStatusUpdate(subscription, 'canceled')}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1 text-xs"
                      onClick={() => setSelectedSubscription(subscription)}
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedSubscription && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Subscription details</h3>
            <button type="button" className="dashboard-pill px-3 py-1 text-xs" onClick={() => setSelectedSubscription(null)}>
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Subscriber</p>
              <p className="mt-1 text-sm text-slate-700">{selectedSubscription.user?.name ?? 'Member'}</p>
              <p className="text-xs text-slate-500">{selectedSubscription.user?.email ?? 'No email'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Tier</p>
              <p className="mt-1 text-sm text-slate-700">{selectedSubscription.tier?.name ?? 'Custom tier'}</p>
              <p className="text-xs text-slate-500">
                {selectedSubscription.tier?.priceCents
                  ? `${new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: selectedSubscription.tier?.currency ?? 'USD'
                    }).format(selectedSubscription.tier.priceCents / 100)} / ${selectedSubscription.tier.interval}`
                  : 'Custom rate'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Renewal</p>
              <p className="mt-1 text-sm text-slate-700">
                {selectedSubscription.currentPeriodEnd
                  ? new Date(selectedSubscription.currentPeriodEnd).toLocaleString()
                  : 'TBD'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Lifecycle</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {selectedSubscription.createdAt && (
                  <li>Created {new Date(selectedSubscription.createdAt).toLocaleString()}</li>
                )}
                {selectedSubscription.statusTransitions?.pausedAt && (
                  <li>Paused {new Date(selectedSubscription.statusTransitions.pausedAt).toLocaleString()}</li>
                )}
                {selectedSubscription.statusTransitions?.canceledAt && (
                  <li>Canceled {new Date(selectedSubscription.statusTransitions.canceledAt).toLocaleString()}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

SubscriptionsPanel.propTypes = {
  communityId: PropTypes.number,
  token: PropTypes.string
};

SubscriptionsPanel.defaultProps = {
  communityId: null,
  token: null
};

function MembersPanel({ communityId, token }) {
  const [members, setMembers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });
  const [newMember, setNewMember] = useState({ email: '', userId: '', role: 'member', status: 'active', title: '', location: '' });
  const [bulkUpload, setBulkUpload] = useState({ rows: [], filename: '', uploading: false });

  const loadMembers = useCallback(async () => {
    if (!communityId || !token) return;
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetchCommunityMembers({
        communityId,
        token,
        params: {
          role: filters.role || undefined,
          status: filters.status || undefined,
          search: filters.search || undefined
        }
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setMembers(
        data.map((member) => ({
          data: member,
          draft: {
            role: member.role,
            status: member.status,
            title: member.metadata?.title ?? '',
            location: member.metadata?.location ?? '',
            tags: Array.isArray(member.metadata?.tags) ? member.metadata.tags.join(', ') : '',
            notes: member.metadata?.notes ?? ''
          }
        }))
      );
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load members.' });
    } finally {
      setLoading(false);
    }
  }, [communityId, token, filters.role, filters.status, filters.search]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const updateDraft = useCallback((userId, field, value) => {
    setMembers((prev) =>
      prev.map((entry) =>
        entry.data.userId === userId ? { ...entry, draft: { ...entry.draft, [field]: value } } : entry
      )
    );
  }, []);

  const handleMemberUpdate = useCallback(
    async (entry) => {
      if (!communityId || !token) return;
      const payload = {};
      if (entry.draft.role !== entry.data.role) payload.role = entry.draft.role;
      if (entry.draft.status !== entry.data.status) payload.status = entry.draft.status;
      if ((entry.draft.title ?? '') !== (entry.data.metadata?.title ?? '')) payload.title = entry.draft.title;
      if ((entry.draft.location ?? '') !== (entry.data.metadata?.location ?? '')) payload.location = entry.draft.location;
      const originalTags = Array.isArray(entry.data.metadata?.tags) ? entry.data.metadata.tags.join(', ') : '';
      if ((entry.draft.tags ?? '') !== originalTags) payload.tags = entry.draft.tags;
      if ((entry.draft.notes ?? '') !== (entry.data.metadata?.notes ?? '')) payload.notes = entry.draft.notes;

      if (Object.keys(payload).length === 0) {
        setFeedback({ tone: 'info', message: 'No changes detected for this member.' });
        return;
      }

      try {
        await updateCommunityMember({
          communityId,
          userId: entry.data.userId,
          token,
          payload
        });
        setFeedback({ tone: 'success', message: 'Member profile updated.' });
        loadMembers();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update member.' });
      }
    },
    [communityId, token, loadMembers]
  );

  const handleRemoveMember = useCallback(
    async (entry) => {
      if (!communityId || !token) return;
      if (!window.confirm('Remove this member from the community?')) return;
      try {
        await removeCommunityMember({ communityId, userId: entry.data.userId, token });
        setFeedback({ tone: 'success', message: 'Member removed from community.' });
        loadMembers();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to remove member.' });
      }
    },
    [communityId, token, loadMembers]
  );

  const handleInvite = useCallback(
    async (event) => {
      event.preventDefault();
      if (!communityId || !token) return;
      if (!newMember.email && !newMember.userId) {
        setFeedback({ tone: 'error', message: 'Provide a member email or user ID to invite.' });
        return;
      }
      try {
        await createCommunityMember({
          communityId,
          token,
          payload: {
            email: newMember.email || undefined,
            userId: newMember.userId ? Number(newMember.userId) : undefined,
            role: newMember.role,
            status: newMember.status,
            title: newMember.title || undefined,
            location: newMember.location || undefined
          }
        });
        setFeedback({ tone: 'success', message: 'Member invitation sent.' });
        setNewMember({ email: '', userId: '', role: 'member', status: 'active', title: '', location: '' });
        loadMembers();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to invite member.' });
      }
    },
    [communityId, token, newMember, loadMembers]
  );

  const handleBulkFile = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const contents = reader.result;
      if (typeof contents !== 'string') return;
      const [headerLine, ...rows] = contents.split(/\r?\n/).filter(Boolean);
      const headers = headerLine.split(',').map((header) => header.trim().toLowerCase());
      const parsedRows = rows.map((line) => {
        const cells = line.split(',');
        const record = {};
        headers.forEach((header, index) => {
          record[header] = cells[index]?.trim();
        });
        return record;
      });
      setBulkUpload({ rows: parsedRows, filename: file.name, uploading: false });
    };
    reader.readAsText(file);
  }, []);

  const handleBulkInvite = useCallback(async () => {
    if (!communityId || !token || !bulkUpload.rows.length) return;
    setBulkUpload((prev) => ({ ...prev, uploading: true }));
    try {
      for (const row of bulkUpload.rows) {
        // eslint-disable-next-line no-await-in-loop
        await createCommunityMember({
          communityId,
          token,
          payload: {
            email: row.email || undefined,
            userId: row.userid ? Number(row.userid) : undefined,
            role: row.role || 'member',
            status: row.status || 'active',
            title: row.title || undefined,
            location: row.location || undefined
          }
        });
      }
      setFeedback({ tone: 'success', message: 'Bulk invitations queued.' });
      setBulkUpload({ rows: [], filename: '', uploading: false });
      loadMembers();
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to process bulk upload.' });
      setBulkUpload((prev) => ({ ...prev, uploading: false }));
    }
  }, [bulkUpload.rows, communityId, token, loadMembers]);

  if (!communityId) {
    return <DashboardStateMessage title="Choose a community" description="Select a community to manage members." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Member operations"
        description="Onboard, retag and moderate members with inline actions."
        actions={
          <button type="button" className="dashboard-primary-pill" onClick={loadMembers} disabled={loading}>
            Refresh roster
          </button>
        }
      />

      {feedback && (
        <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      )}

      <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleInvite}>
        <h3 className="text-lg font-semibold text-slate-900">Invite or promote member</h3>
        <p className="mt-1 text-sm text-slate-600">
          Send an invitation by email or promote an existing user by ID. We’ll handle welcome messaging automatically.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Email
            <input
              type="email"
              placeholder="member@domain.com"
              value={newMember.email}
              onChange={(event) => setNewMember((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            User ID (optional)
            <input
              type="number"
              min="1"
              value={newMember.userId}
              onChange={(event) => setNewMember((prev) => ({ ...prev, userId: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Role
            <select
              value={newMember.role}
              onChange={(event) => setNewMember((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="member">Member</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Status
            <select
              value={newMember.status}
              onChange={(event) => setNewMember((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Title
            <input
              type="text"
              value={newMember.title}
              onChange={(event) => setNewMember((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Location
            <input
              type="text"
              value={newMember.location}
              onChange={(event) => setNewMember((prev) => ({ ...prev, location: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
            Send invite
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Bulk import roster</h3>
            <p className="text-sm text-slate-600">
              Upload a CSV file with headers <span className="font-semibold">email,userid,role,status,title,location</span> to
              invite multiple members at once.
            </p>
          </div>
          <label className="dashboard-primary-pill cursor-pointer">
            <input type="file" accept=".csv" className="sr-only" onChange={handleBulkFile} />
            Upload CSV
          </label>
        </div>
        {bulkUpload.filename && (
          <div className="mt-4 overflow-x-auto">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <p>
                Loaded <span className="font-semibold text-slate-900">{bulkUpload.rows.length}</span> rows from{' '}
                <span className="font-semibold text-slate-900">{bulkUpload.filename}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="dashboard-pill px-3 py-1 text-xs"
                  onClick={() => setBulkUpload({ rows: [], filename: '', uploading: false })}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                  onClick={handleBulkInvite}
                  disabled={bulkUpload.uploading}
                >
                  {bulkUpload.uploading ? 'Processing…' : 'Send invites'}
                </button>
              </div>
            </div>
            <table className="mt-3 w-full min-w-[500px] table-auto divide-y divide-slate-100 text-left text-xs text-slate-600">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Email</th>
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">User ID</th>
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Role</th>
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Status</th>
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Title</th>
                </tr>
              </thead>
              <tbody>
                {bulkUpload.rows.slice(0, 5).map((row, index) => (
                  <tr key={`${row.email}-${index}`} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{row.email || '—'}</td>
                    <td className="py-2 pr-4">{row.userid || '—'}</td>
                    <td className="py-2 pr-4">{row.role || 'member'}</td>
                    <td className="py-2 pr-4">{row.status || 'active'}</td>
                    <td className="py-2 pr-4">{row.title || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bulkUpload.rows.length > 5 && (
              <p className="mt-2 text-xs text-slate-500">Showing first 5 rows.</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Role
            <select
              value={filters.role}
              onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="member">Member</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
            Search roster
            <input
              type="search"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading roster…</div>
        ) : members.length === 0 ? (
          <DashboardStateMessage
            title="No members match these filters"
            description="Adjust the filters or invite new members to populate your roster."
          />
        ) : (
          members.map((entry) => (
            <div
              key={entry.data.userId}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {entry.data.user?.name ?? `Member ${entry.data.userId}`}
                  </p>
                  <p className="text-xs text-slate-500">{entry.data.user?.email ?? 'No email on record'}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Joined {entry.data.joinedAt ? new Date(entry.data.joinedAt).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 md:items-center">
                  <label className="space-y-1 text-xs font-semibold text-slate-600">
                    Role
                    <select
                      value={entry.draft.role}
                      onChange={(event) => updateDraft(entry.data.userId, 'role', event.target.value)}
                      className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderator</option>
                      <option value="member">Member</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-600">
                    Status
                    <select
                      value={entry.draft.status}
                      onChange={(event) => updateDraft(entry.data.userId, 'status', event.target.value)}
                      className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-600">
                    Title
                    <input
                      type="text"
                      value={entry.draft.title}
                      onChange={(event) => updateDraft(entry.data.userId, 'title', event.target.value)}
                      className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-600">
                    Location
                    <input
                      type="text"
                      value={entry.draft.location}
                      onChange={(event) => updateDraft(entry.data.userId, 'location', event.target.value)}
                      className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Tags
                  <input
                    type="text"
                    placeholder="coach, vip, cohort-3"
                    value={entry.draft.tags}
                    onChange={(event) => updateDraft(entry.data.userId, 'tags', event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-600">
                  Notes
                  <textarea
                    rows={2}
                    value={entry.draft.notes}
                    onChange={(event) => updateDraft(entry.data.userId, 'notes', event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="dashboard-pill px-3 py-1 text-xs text-rose-600"
                  onClick={() => handleRemoveMember(entry)}
                >
                  Remove
                </button>
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => handleMemberUpdate(entry)}
                >
                  Save changes
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

MembersPanel.propTypes = {
  communityId: PropTypes.number,
  token: PropTypes.string
};

MembersPanel.defaultProps = {
  communityId: null,
  token: null
};

function ManagePanel({ communityId, token, onCommunityUpdated }) {
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    coverImageUrl: '',
    visibility: 'public',
    tagline: '',
    accentColor: '#0f172a',
    promoVideoUrl: '',
    welcomeMessage: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadDetail = useCallback(async () => {
    if (!communityId || !token) return;
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetchCommunityDetail(communityId, token);
      const data = response.data ?? null;
      setDetail(data);
      setForm({
        name: data?.name ?? '',
        slug: data?.slug ?? '',
        description: data?.description ?? '',
        coverImageUrl: data?.coverImageUrl ?? '',
        visibility: data?.visibility ?? 'public',
        tagline: data?.metadata?.tagline ?? '',
        accentColor: data?.metadata?.accentColor ?? '#0f172a',
        promoVideoUrl: data?.metadata?.promoVideoUrl ?? '',
        welcomeMessage: data?.metadata?.welcomeMessage ?? ''
      });
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load community.' });
    } finally {
      setLoading(false);
    }
  }, [communityId, token]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!communityId || !token) return;
      setFeedback(null);
      try {
        const payload = {
          name: form.name || undefined,
          slug: form.slug || undefined,
          description: form.description || undefined,
          coverImageUrl: form.coverImageUrl || undefined,
          visibility: form.visibility || undefined,
          metadata: {
            ...(detail?.metadata ?? {}),
            tagline: form.tagline || undefined,
            accentColor: form.accentColor || undefined,
            promoVideoUrl: form.promoVideoUrl || undefined,
            welcomeMessage: form.welcomeMessage || undefined
          }
        };
        const response = await updateCommunity({ communityId, token, payload });
        setFeedback({ tone: 'success', message: 'Community settings updated.' });
        if (response.data) {
          setDetail(response.data);
          onCommunityUpdated?.(response.data);
        }
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update community.' });
      }
    },
    [communityId, token, form, detail, onCommunityUpdated]
  );

  if (!communityId) {
    return <DashboardStateMessage title="Choose a community" description="Select a community to configure." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Community configuration"
        description="Update branding, access and messaging before your next cohort joins."
        actions={
          <button type="button" className="dashboard-primary-pill" onClick={loadDetail} disabled={loading}>
            Refresh details
          </button>
        }
      />

      {feedback && (
        <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Branding & identity</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
                Community name
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Slug
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="my-instructor-community"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Tagline
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value }))}
                  placeholder="Where ambitious learners level up."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">
                Accent color
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(event) => setForm((prev) => ({ ...prev, accentColor: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
                Description
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600 md:col-span-2">
                Welcome message
                <textarea
                  rows={4}
                  value={form.welcomeMessage}
                  onChange={(event) => setForm((prev) => ({ ...prev, welcomeMessage: event.target.value }))}
                  placeholder="Share onboarding instructions that greet every new member."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Cover preview</h3>
              <p className="mt-1 text-xs text-slate-500">
                Upload media to your CDN and paste the URL. We’ll use it across landing pages and email headers.
              </p>
              <label className="mt-3 block space-y-1 text-xs font-semibold text-slate-600">
                Cover image URL
                <input
                  type="url"
                  value={form.coverImageUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
                  placeholder="https://cdn.edulure.com/cover.jpg"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {form.coverImageUrl ? (
                  <img src={form.coverImageUrl} alt="Community cover preview" className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center text-xs text-slate-500">
                    Cover image preview appears here
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Promo video spotlight</h3>
              <p className="mt-1 text-xs text-slate-500">
                Drop in a short teaser video to autoplay on your community landing pages.
              </p>
              <label className="mt-3 block space-y-1 text-xs font-semibold text-slate-600">
                Promo video URL
                <input
                  type="url"
                  value={form.promoVideoUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, promoVideoUrl: event.target.value }))}
                  placeholder="https://videos.edulure.com/intro.mp4"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {form.promoVideoUrl ? (
                  form.promoVideoUrl.includes('youtube') || form.promoVideoUrl.includes('youtu.be') ? (
                    <iframe
                      title="Promo video preview"
                      src={form.promoVideoUrl}
                      className="h-40 w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video controls className="h-40 w-full object-cover">
                      <source src={form.promoVideoUrl} />
                    </video>
                  )
                ) : (
                  <div className="flex h-40 items-center justify-center text-xs text-slate-500">
                    Video preview appears here
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Hero preview</h3>
              <div
                className="mt-3 rounded-xl p-5 text-white shadow-inner"
                style={{ backgroundColor: form.accentColor || '#0f172a' }}
              >
                <p className="text-sm uppercase tracking-wide opacity-80">{detail?.name ?? 'Instructor community'}</p>
                <p className="mt-2 text-2xl font-semibold">{form.tagline || 'Inspire your learners every week.'}</p>
                <p className="mt-3 text-sm opacity-90">
                  {form.welcomeMessage || 'Welcome learners! Update this message to describe how to get started.'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Access control</h3>
              <label className="mt-3 space-y-1 text-xs font-semibold text-slate-600">
                Visibility
                <select
                  value={form.visibility}
                  onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                {form.visibility === 'public'
                  ? 'Public communities appear in discovery and allow open join requests.'
                  : 'Private communities hide from discovery. Invitations or approvals are required for access.'}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">
            Save configuration
          </button>
        </div>
      </form>
    </div>
  );
}

ManagePanel.propTypes = {
  communityId: PropTypes.number,
  token: PropTypes.string,
  onCommunityUpdated: PropTypes.func
};

ManagePanel.defaultProps = {
  communityId: null,
  token: null,
  onCommunityUpdated: null
};

function InstructorCommunityOperations() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const loadCommunities = useCallback(async () => {
    if (!token) return;
    setLoadingCommunities(true);
    setFeedback(null);
    try {
      const response = await fetchCommunities(token);
      const list = Array.isArray(response.data) ? response.data : [];
      setCommunities(list);
      if (list.length) {
        setSelectedCommunityId((prev) => prev ?? list[0].id);
      }
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load communities.' });
    } finally {
      setLoadingCommunities(false);
    }
  }, [token]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleCommunityUpdated = useCallback((updatedCommunity) => {
    setCommunities((prev) =>
      prev.map((community) => (community.id === updatedCommunity.id ? { ...community, ...updatedCommunity } : community))
    );
  }, []);

  const activePanel = useMemo(() => {
    const panelProps = { communityId: selectedCommunityId, token };
    switch (activeTab) {
      case 'revenue':
        return <RevenuePanel {...panelProps} />;
      case 'broadcast':
        return <BroadcastPanel {...panelProps} />;
      case 'safety':
        return <SafetyPanel {...panelProps} />;
      case 'subscriptions':
        return <SubscriptionsPanel {...panelProps} />;
      case 'members':
        return <MembersPanel {...panelProps} />;
      case 'manage':
        return <ManagePanel {...panelProps} onCommunityUpdated={handleCommunityUpdated} />;
      default:
        return null;
    }
  }, [activeTab, selectedCommunityId, token, handleCommunityUpdated]);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Instructor community operations"
        description="A single pane of glass to operate revenue, content and member experience across your cohorts."
        actions={
          <button type="button" className="dashboard-primary-pill" onClick={loadCommunities} disabled={loadingCommunities}>
            Refresh communities
          </button>
        }
      />

      {feedback && (
        <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      )}

      {loadingCommunities && !communities.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading instructor communities…
        </div>
      ) : (
        <>
          <CommunitySelector
            communities={communities}
            selectedId={selectedCommunityId}
            onSelect={setSelectedCommunityId}
          />

          {communities.length > 0 && (
            <div className="overflow-x-auto">
              <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-slate-600 hover:text-primary'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8">{activePanel}</div>
        </>
      )}
    </div>
  );
}

export default InstructorCommunityOperations;
