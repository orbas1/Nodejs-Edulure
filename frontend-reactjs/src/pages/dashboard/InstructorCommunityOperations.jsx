import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AdjustmentsHorizontalIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BanknotesIcon,
  QueueListIcon
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

  const loadRevenue = useCallback(async () => {
    if (!communityId || !token) return;
    setLoading(true);
    try {
      const response = await fetchCommunityRevenueSummary({ communityId, token });
      setSummary(response.data ?? null);
      const detail = await fetchCommunityDetail(communityId, token);
      const paywall = detail?.data?.paywall ?? {};
      setTiers(Array.isArray(paywall.tiers) ? paywall.tiers : []);
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load revenue telemetry.' });
    } finally {
      setLoading(false);
    }
  }, [communityId, token]);

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
                <li key={tier.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{tier.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: tier.currency ?? 'USD' }).format(
                        (tier.priceCents ?? 0) / 100
                      )}{' '}
                      · {tier.billingInterval}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="dashboard-pill px-3 py-1 text-xs"
                    onClick={() => handleToggleTier(tier)}
                  >
                    {tier.isActive ? 'Pause' : 'Activate'}
                  </button>
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
  const [draft, setDraft] = useState({ id: null, title: '', body: '', stage: 'Planning', scheduledAt: '' });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

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
          body: broadcast.body ?? ''
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

  const resetDraft = useCallback(() => setDraft({ id: null, title: '', body: '', stage: 'Planning', scheduledAt: '' }), []);

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
        metadata: { stage: draft.stage },
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
        loadPosts();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to save broadcast.' });
      }
    },
    [communityId, token, draft, loadPosts, resetDraft]
  );

  const handleEdit = useCallback((post) => {
    setDraft({ id: post.id, title: post.title, body: post.body, stage: post.stage, scheduledAt: post.release ?? '' });
  }, []);

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
          <h3 className="text-lg font-semibold text-slate-900">{draft.id ? 'Update broadcast' : 'Create broadcast'}</h3>
          <div className="mt-4 space-y-3">
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
              Body
              <textarea
                rows={4}
                required
                value={draft.body}
                onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
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
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {draft.id && (
              <button type="button" className="dashboard-pill px-3 py-1 text-xs" onClick={resetDraft}>
                Cancel edit
              </button>
            )}
            <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              {draft.id ? 'Update broadcast' : 'Create broadcast'}
            </button>
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
          <button type="button" className="dashboard-primary-pill" onClick={loadIncidents} disabled={loading}>
            Refresh feed
          </button>
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
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
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
                        onClick={() =>
                          setResolutionDraft({
                            incident,
                            resolutionSummary: operations?.resolution?.resolutionSummary ?? '',
                            followUp: operations?.resolution?.followUp ?? ''
                          })
                        }
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
          <button type="button" className="dashboard-primary-pill" onClick={loadSubscriptions} disabled={loading}>
            Refresh ledger
          </button>
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
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
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
    accentColor: '#0f172a'
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
        accentColor: data?.metadata?.accentColor ?? '#0f172a'
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
            accentColor: form.accentColor || undefined
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
