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
  fetchCommunityFeed,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  fetchCommunityIncidents,
  resolveCommunityIncident,
  listCommunitySubscriptions,
  updateCommunitySubscription,
  fetchCommunityMembers,
  createCommunityMember,
  updateCommunityMember,
  removeCommunityMember
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

function TabNavigation({ activeTab, onSelect }) {
  return (
    <nav className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ul className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-y-0">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span
                  className={`rounded-full border p-1 ${
                    isActive ? 'border-primary/60 bg-primary/10 text-primary' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

TabNavigation.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired
};

function StatCard({ title, value, description }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>
      <span className="text-2xl font-semibold text-slate-900">{value}</span>
      {description && <span className="text-xs text-slate-500">{description}</span>}
    </div>
  );
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  description: PropTypes.node
};

StatCard.defaultProps = {
  description: null
};

function RevenuePanel({ communityId, token }) {
  const [summary, setSummary] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [tierEditor, setTierEditor] = useState({
    name: '',
    priceCents: 0,
    billingInterval: 'monthly',
    description: '',
    benefits: ''
  });
  const [tierDraft, setTierDraft] = useState({ name: '', priceCents: 4900, billingInterval: 'monthly' });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const currency = summary?.currency ?? 'USD';
  const currencyFormatter = useMemo(() => new Intl.NumberFormat(undefined, { style: 'currency', currency }), [currency]);

  const loadRevenue = useCallback(
    async (signal) => {
      if (!communityId || !token) return;
      setLoading(true);
      try {
        const [summaryResponse, detailResponse] = await Promise.all([
          fetchCommunityRevenueSummary({ communityId, token, signal }),
          fetchCommunityDetail(communityId, token)
        ]);
        if (signal?.aborted) return;
        const summaryData = summaryResponse?.data ?? null;
        const paywall = detailResponse?.data?.paywall ?? {};
        const tierList = Array.isArray(paywall.tiers) ? paywall.tiers : [];
        setSummary(summaryData);
        setTiers(tierList);
        if (tierList.length) {
          const tier = tierList.find((item) => item.id === selectedTier?.id) ?? tierList[0];
          setSelectedTier(tier);
          setTierEditor({
            name: tier.name ?? '',
            priceCents: Number(tier.priceCents ?? 0),
            billingInterval: tier.billingInterval ?? 'monthly',
            description: tier.description ?? '',
            benefits: Array.isArray(tier.benefits) ? tier.benefits.join('\n') : ''
          });
        } else {
          setSelectedTier(null);
          setTierEditor({ name: '', priceCents: 0, billingInterval: 'monthly', description: '', benefits: '' });
        }
      } catch (error) {
        if (signal?.aborted) return;
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load revenue summary.' });
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [communityId, token, selectedTier?.id]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadRevenue(controller.signal);
    return () => controller.abort();
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
            priceCents: Number(tierDraft.priceCents || 0),
            currency,
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
    [communityId, token, tierDraft, currency, loadRevenue]
  );

  const handleUpdateTier = useCallback(
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
            name: tierEditor.name,
            description: tierEditor.description,
            priceCents: Number(tierEditor.priceCents || 0),
            billingInterval: tierEditor.billingInterval,
            benefits: tierEditor.benefits
              .split('\n')
              .map((benefit) => benefit.trim())
              .filter(Boolean)
          }
        });
        setFeedback({ tone: 'success', message: 'Tier updated successfully.' });
        loadRevenue();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update tier.' });
      }
    },
    [communityId, token, selectedTier, tierEditor, loadRevenue]
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
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update tier status.' });
      }
    },
    [communityId, token, loadRevenue]
  );
          token,
          payload: {
            name: tierDraft.name,
            priceCents: Number(tierDraft.priceCents || 0),
            currency,
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
    [communityId, token, tierDraft, currency, loadRevenue]
  );

  const handleUpdateTier = useCallback(
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
            name: tierEditor.name,
            description: tierEditor.description,
            priceCents: Number(tierEditor.priceCents || 0),
            billingInterval: tierEditor.billingInterval,
            benefits: tierEditor.benefits
              .split('\n')
              .map((benefit) => benefit.trim())
              .filter(Boolean)
          }
        });
        setFeedback({ tone: 'success', message: 'Tier updated successfully.' });
        loadRevenue();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update tier.' });
      }
    },
    [communityId, token, selectedTier, tierEditor, loadRevenue]
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
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update tier status.' });
      }
    },
    [communityId, token, loadRevenue]
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Revenue & paywall"
        description="Track monetisation health, refine your tiers, and launch new offerings with a few clicks."
        actions={
          <button
            type="button"
            onClick={() => loadRevenue()}
            className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
          >
            Refresh
          </button>
        }
      />

      {feedback && <DashboardActionFeedback {...feedback} onDismiss={() => setFeedback(null)} />}

      {loading && !summary ? (
        <DashboardStateMessage title="Loading revenue" description="Fetching live monetisation telemetry." tone="loading" />
      ) : (
        <>
          {summary ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Monthly recurring revenue" value={currencyFormatter.format((summary.mrrCents ?? 0) / 100)} />
              <StatCard
                title="Active subscribers"
                value={summary.activeSubscribers ?? 0}
                description="Includes paused accounts scheduled to resume."
              />
              <StatCard title="Churn this month" value={`${(((summary.monthlyChurnRate ?? 0) * 100).toFixed(1))}%`} />
              <StatCard
                title="Projected run rate"
                value={currencyFormatter.format((summary.projectedRunRateCents ?? 0) / 100)}
                description="Based on current MRR and trial conversions."
              />
            </div>
          ) : (
            <DashboardStateMessage
              title="No revenue yet"
              description="Launch your first tier to start collecting subscriptions."
            />
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <header>
                <h3 className="text-lg font-semibold text-slate-900">Create a new tier</h3>
                <p className="text-sm text-slate-500">
                  Craft experimental offers without leaving the dashboard. You can archive or iterate on tiers at any time.
                </p>
              </header>
              <form className="space-y-4" onSubmit={handleCreateTier}>
                <label className="block text-sm font-medium text-slate-700">
                  Tier name
                  <input
                    type="text"
                    required
                    value={tierDraft.name}
                    onChange={(event) => setTierDraft((draft) => ({ ...draft, name: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Gold membership"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Price ({currency})
                    <input
                      type="number"
                      min={1}
                      required
                      value={tierDraft.priceCents}
                      onChange={(event) =>
                        setTierDraft((draft) => ({ ...draft, priceCents: Number(event.target.value ?? 0) }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Billing interval
                    <select
                      value={tierDraft.billingInterval}
                      onChange={(event) =>
                        setTierDraft((draft) => ({ ...draft, billingInterval: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  Launch tier
                </button>
              </form>
            </section>

            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Existing tiers</h3>
                  <p className="text-sm text-slate-500">Fine-tune pricing, copy, and benefits for your active offers.</p>
                </div>
              </header>
              {tiers.length ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {tiers.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          setSelectedTier(tier);
                          setTierEditor({
                            name: tier.name ?? '',
                            priceCents: Number(tier.priceCents ?? 0),
                            billingInterval: tier.billingInterval ?? 'monthly',
                            description: tier.description ?? '',
                            benefits: Array.isArray(tier.benefits) ? tier.benefits.join('\n') : ''
                          });
                        }}
                        className={`rounded-full border px-4 py-1 text-sm font-medium transition ${
                          selectedTier?.id === tier.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {tier.name}
                      </button>
                    ))}
                  </div>

                  {selectedTier ? (
                    <form className="space-y-4" onSubmit={handleUpdateTier}>
                      <label className="block text-sm font-medium text-slate-700">
                        Display name
                        <input
                          type="text"
                          value={tierEditor.name}
                          onChange={(event) => setTierEditor((prev) => ({ ...prev, name: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Price ({currency})
                          <input
                            type="number"
                            min={1}
                            value={tierEditor.priceCents}
                            onChange={(event) =>
                              setTierEditor((prev) => ({ ...prev, priceCents: Number(event.target.value ?? 0) }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                          Interval
                          <select
                            value={tierEditor.billingInterval}
                            onChange={(event) =>
                              setTierEditor((prev) => ({ ...prev, billingInterval: event.target.value }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annual">Annual</option>
                            <option value="lifetime">Lifetime</option>
                          </select>
                        </label>
                      </div>
                      <label className="block text-sm font-medium text-slate-700">
                        Marketing blurb
                        <textarea
                          rows={3}
                          value={tierEditor.description}
                          onChange={(event) => setTierEditor((prev) => ({ ...prev, description: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Benefits (one per line)
                        <textarea
                          rows={4}
                          value={tierEditor.benefits}
                          onChange={(event) => setTierEditor((prev) => ({ ...prev, benefits: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="submit"
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                        >
                          Save changes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleTier(selectedTier)}
                          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                            selectedTier.isActive
                              ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {selectedTier.isActive ? 'Pause tier' : 'Activate tier'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <DashboardStateMessage
                      title="No tiers"
                      description="Select a tier to begin editing or create a new one."
                    />
                  )}
                </div>
              ) : (
                <DashboardStateMessage
                  title="No tiers configured"
                  description="Launch your first tier to start charging for premium access."
                />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

RevenuePanel.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  token: PropTypes.string
};

RevenuePanel.defaultProps = {
  communityId: null,
  token: null
};
function BroadcastPanel({ communityId, token, communityName }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [editor, setEditor] = useState({
    id: null,
    title: '',
    body: '',
    visibility: 'members',
    mediaUrl: '',
    ctaText: '',
    ctaUrl: ''
  });

  const loadPosts = useCallback(
    async (signal) => {
      if (!communityId || !token) return;
      setLoading(true);
      try {
        const response = await fetchCommunityFeed({
          communityId,
          token,
          signal,
          perPage: 8,
          postType: 'broadcast'
        });
        if (signal?.aborted) return;
        setPosts(response?.data ?? []);
      } catch (error) {
        if (signal?.aborted) return;
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load broadcasts.' });
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [communityId, token]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadPosts(controller.signal);
    return () => controller.abort();
  }, [loadPosts]);

  const resetEditor = useCallback(() => {
    setEditor({ id: null, title: '', body: '', visibility: 'members', mediaUrl: '', ctaText: '', ctaUrl: '' });
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!communityId || !token) return;
      setFeedback(null);
      const payload = {
        title: editor.title,
        body: editor.body,
        postType: 'broadcast',
        visibility: editor.visibility,
        status: 'published',
        metadata: {
          mediaUrl: editor.mediaUrl || null,
          cta: editor.ctaUrl ? { text: editor.ctaText || 'Learn more', url: editor.ctaUrl } : null
        }
      };
      try {
        if (editor.id) {
          await updateCommunityPost({ communityId, postId: editor.id, token, payload });
          setFeedback({ tone: 'success', message: 'Broadcast updated.' });
        } else {
          await createCommunityPost({ communityId, token, payload });
          setFeedback({ tone: 'success', message: 'Broadcast published.' });
        }
        resetEditor();
        loadPosts();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to save broadcast.' });
      }
    },
    [communityId, token, editor, loadPosts, resetEditor]
  );

  const handleEdit = useCallback((post) => {
    const metadata = post.metadata ?? {};
    const cta = metadata.cta ?? null;
    setEditor({
      id: post.id,
      title: post.title ?? '',
      body: post.body ?? '',
      visibility: post.visibility ?? 'members',
      mediaUrl: metadata.mediaUrl ?? '',
      ctaText: cta?.text ?? '',
      ctaUrl: cta?.url ?? ''
    });
  }, []);

  const handleDelete = useCallback(
    async (postId) => {
      if (!communityId || !token) return;
      const confirmed = window.confirm('Archive this broadcast? Members will no longer see it.');
      if (!confirmed) return;
      setFeedback(null);
      try {
        await deleteCommunityPost({ communityId, postId, token });
        setFeedback({ tone: 'success', message: 'Broadcast archived.' });
        if (editor.id === postId) {
          resetEditor();
        }
        loadPosts();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to archive broadcast.' });
      }
    },
    [communityId, token, loadPosts, editor.id, resetEditor]
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Broadcasts"
        description="Plan, publish, and iterate on announcements with media, CTAs, and visibility controls."
      />

      {feedback && <DashboardActionFeedback {...feedback} onDismiss={() => setFeedback(null)} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{editor.id ? 'Update broadcast' : 'Compose broadcast'}</h3>
              <p className="text-sm text-slate-500">
                Broadcasts go out instantly to all eligible members of {communityName ?? 'your community'}.
              </p>
            </div>
            {editor.id && (
              <button
                type="button"
                onClick={resetEditor}
                className="text-sm font-semibold text-primary hover:text-primary/80"
              >
                New broadcast
              </button>
            )}
          </header>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Title
              <input
                type="text"
                required
                value={editor.title}
                onChange={(event) => setEditor((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Message
              <textarea
                rows={6}
                required
                value={editor.body}
                onChange={(event) => setEditor((prev) => ({ ...prev, body: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Share updates, link to new lessons, or celebrate wins."
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Featured media URL
              <input
                type="url"
                value={editor.mediaUrl}
                onChange={(event) => setEditor((prev) => ({ ...prev, mediaUrl: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="https://cdn.example.com/hero.jpg"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                CTA label
                <input
                  type="text"
                  value={editor.ctaText}
                  onChange={(event) => setEditor((prev) => ({ ...prev, ctaText: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Join the webinar"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                CTA link
                <input
                  type="url"
                  value={editor.ctaUrl}
                  onChange={(event) => setEditor((prev) => ({ ...prev, ctaUrl: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="https://..."
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Visibility
              <select
                value={editor.visibility}
                onChange={(event) => setEditor((prev) => ({ ...prev, visibility: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="members">Members only</option>
                <option value="public">Public</option>
              </select>
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              {editor.id ? 'Save broadcast' : 'Publish broadcast'}
            </button>
          </form>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Recent broadcasts</h3>
              <p className="text-sm text-slate-500">Review performance and keep evergreen announcements fresh.</p>
            </div>
          </header>

          {loading && !posts.length ? (
            <DashboardStateMessage title="Loading broadcasts" tone="loading" />
          ) : posts.length ? (
            <ul className="space-y-4">
              {posts.map((post) => {
                const metadata = post.metadata ?? {};
                const reactionTotal = post.reactionSummary
                  ? Object.values(post.reactionSummary).reduce((total, count) => total + Number(count || 0), 0)
                  : 0;
                return (
                  <li key={post.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <h4 className="text-base font-semibold text-slate-900">{post.title ?? 'Untitled broadcast'}</h4>
                        <p className="text-sm text-slate-600 line-clamp-3">{post.body}</p>
                        {metadata.mediaUrl && (
                          <div className="overflow-hidden rounded-lg border border-slate-200">
                            <img src={metadata.mediaUrl} alt="Broadcast media" className="h-32 w-full object-cover" />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>Visibility: {post.visibility}</span>
                          {post.publishedAt && <span>Published {new Date(post.publishedAt).toLocaleString()}</span>}
                          <span>Reactions: {reactionTotal}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(post)}
                          className="rounded-lg border border-primary/40 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <DashboardStateMessage
              title="No broadcasts yet"
              description="Create an announcement to welcome new members or promote your latest course."
            />
          )}
        </section>
      </div>
    </div>
  );
}

BroadcastPanel.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  token: PropTypes.string,
  communityName: PropTypes.string
};

BroadcastPanel.defaultProps = {
  communityId: null,
  token: null,
  communityName: null
};
function SafetyPanel({ communityId, token }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [filters, setFilters] = useState({ status: 'pending', severity: '' });
  const [resolutionNotes, setResolutionNotes] = useState({});

  const loadIncidents = useCallback(
    async (signal) => {
      if (!communityId || !token) return;
      setLoading(true);
      try {
        const response = await fetchCommunityIncidents({
          communityId,
          token,
          signal,
          params: {
            status: filters.status || undefined,
            severity: filters.severity || undefined,
            perPage: 20
          }
        });
        if (signal?.aborted) return;
        setIncidents(response?.data ?? []);
      } catch (error) {
        if (signal?.aborted) return;
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load incidents.' });
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [communityId, token, filters]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadIncidents(controller.signal);
    return () => controller.abort();
  }, [loadIncidents]);

  const handleResolve = useCallback(
    async (incident) => {
      if (!communityId || !token) return;
      setFeedback(null);
      try {
        await resolveCommunityIncident({
          communityId,
          incidentId: incident.publicId ?? incident.id,
          token,
          payload: {
            resolutionSummary: resolutionNotes[incident.id] ?? '',
            followUp: incident.severity === 'critical' ? 'Post-mortem required' : null
          }
        });
        setResolutionNotes((prev) => {
          const next = { ...prev };
          delete next[incident.id];
          return next;
        });
        setFeedback({ tone: 'success', message: 'Incident resolved and logged.' });
        loadIncidents();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to resolve incident.' });
      }
    },
    [communityId, token, resolutionNotes, loadIncidents]
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Safety centre"
        description="Track escalations from moderators, close out incidents, and leave audit-ready notes."
        actions={
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_review">In review</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={filters.severity}
              onChange={(event) => setFilters((prev) => ({ ...prev, severity: event.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">All severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        }
      />

      {feedback && <DashboardActionFeedback {...feedback} onDismiss={() => setFeedback(null)} />}

      {loading && !incidents.length ? (
        <DashboardStateMessage title="Loading incidents" tone="loading" />
      ) : incidents.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Context</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {incidents.map((incident) => (
                <tr key={incident.id}>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{incident.title ?? incident.publicId}</div>
                    <div className="text-xs text-slate-500">
                      Filed {incident.createdAt ? new Date(incident.createdAt).toLocaleString() : '—'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        incident.severity === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : incident.severity === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : incident.severity === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {incident.severity ?? 'unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-4 capitalize text-slate-600">{incident.status}</td>
                  <td className="px-4 py-4">
                    <p className="line-clamp-3 text-slate-600">{incident.description ?? 'No context provided.'}</p>
                    <textarea
                      rows={2}
                      value={resolutionNotes[incident.id] ?? ''}
                      onChange={(event) =>
                        setResolutionNotes((prev) => ({ ...prev, [incident.id]: event.target.value }))
                      }
                      placeholder="Resolution notes for audit trail"
                      className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolve(incident)}
                        disabled={incident.status === 'resolved'}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          incident.status === 'resolved'
                            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        }`}
                      >
                        Mark resolved
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DashboardStateMessage
          title="No incidents"
          description="Great news—moderators have not raised any incidents for this filter set."
        />
      )}
    </div>
  );
}

SafetyPanel.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  token: PropTypes.string
};

SafetyPanel.defaultProps = {
  communityId: null,
  token: null
};
function SubscriptionsPanel({ communityId, token }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [filter, setFilter] = useState('');

  const loadSubscriptions = useCallback(
    async (signal) => {
      if (!communityId || !token) return;
      setLoading(true);
      try {
        const response = await listCommunitySubscriptions({
          communityId,
          token,
          signal,
          params: { status: filter || undefined }
        });
        if (signal?.aborted) return;
        setSubscriptions(response?.data ?? []);
      } catch (error) {
        if (signal?.aborted) return;
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load subscriptions.' });
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [communityId, token, filter]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadSubscriptions(controller.signal);
    return () => controller.abort();
  }, [loadSubscriptions]);

  const updateStatus = useCallback(
    async (subscription, status) => {
      if (!communityId || !token) return;
      setFeedback(null);
      try {
        await updateCommunitySubscription({
          communityId,
          subscriptionId: subscription.id,
          token,
          payload: { status }
        });
        setFeedback({ tone: 'success', message: 'Subscription updated.' });
        loadSubscriptions();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update subscription.' });
      }
    },
    [communityId, token, loadSubscriptions]
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Subscriptions"
        description="Audit subscriber activity and take action on paused or overdue accounts."
        actions={
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="canceled">Canceled</option>
            <option value="pending">Pending</option>
          </select>
        }
      />

      {feedback && <DashboardActionFeedback {...feedback} onDismiss={() => setFeedback(null)} />}

      {loading && !subscriptions.length ? (
        <DashboardStateMessage title="Loading subscriptions" tone="loading" />
      ) : subscriptions.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Renewal</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {subscriptions.map((subscription) => {
                const tier = subscription.tier ?? {};
                const member = subscription.user ?? {};
                const formatter = new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: tier.currency ?? 'USD'
                });
                return (
                  <tr key={subscription.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{member.name ?? member.email ?? 'Unknown member'}</div>
                      <div className="text-xs text-slate-500">{member.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-700">{tier.name ?? 'Unassigned'}</div>
                      {tier.priceCents ? (
                        <div className="text-xs text-slate-500">
                          {formatter.format((tier.priceCents ?? 0) / 100)} / {tier.interval}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 capitalize text-slate-600">{subscription.status}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {['active', 'paused', 'canceled']
                          .filter((status) => status !== subscription.status)
                          .map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => updateStatus(subscription, status)}
                              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                            >
                              Mark {status}
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <DashboardStateMessage
          title="No subscriptions"
          description="When learners subscribe, you will see their billing status and renewal dates here."
        />
      )}
    </div>
  );
}

SubscriptionsPanel.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  token: PropTypes.string
};

SubscriptionsPanel.defaultProps = {
  communityId: null,
  token: null
};
function MembersPanel({ communityId, token }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [draft, setDraft] = useState({
    email: '',
    role: 'member',
    status: 'active',
    title: '',
    location: '',
    notes: ''
  });

  const loadMembers = useCallback(
    async (signal) => {
      if (!communityId || !token) return;
      setLoading(true);
      try {
        const response = await fetchCommunityMembers({
          communityId,
          token,
          signal,
          params: { search: search || undefined }
        });
        if (signal?.aborted) return;
        setMembers(response?.data ?? []);
      } catch (error) {
        if (signal?.aborted) return;
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load members.' });
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [communityId, token, search]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadMembers(controller.signal);
    return () => controller.abort();
  }, [loadMembers]);

  const resetDraft = useCallback(() => {
    setDraft({ email: '', role: 'member', status: 'active', title: '', location: '', notes: '' });
    setSelectedMember(null);
  }, []);

  const handleCreate = useCallback(
    async (event) => {
      event.preventDefault();
      if (!communityId || !token) return;
      setFeedback(null);
      try {
        await createCommunityMember({
          communityId,
          token,
          payload: {
            email: draft.email,
            role: draft.role,
            status: draft.status,
            title: draft.title,
            location: draft.location,
            notes: draft.notes
          }
        });
        setFeedback({ tone: 'success', message: 'Member added successfully.' });
        resetDraft();
        loadMembers();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to add member.' });
      }
    },
    [communityId, token, draft, loadMembers, resetDraft]
  );

  const handleUpdate = useCallback(
    async (event) => {
      event.preventDefault();
      if (!communityId || !token || !selectedMember) return;
      setFeedback(null);
      try {
        await updateCommunityMember({
          communityId,
          userId: selectedMember.userId,
          token,
          payload: {
            role: draft.role,
            status: draft.status,
            title: draft.title,
            location: draft.location,
            notes: draft.notes
          }
        });
        setFeedback({ tone: 'success', message: 'Member updated.' });
        resetDraft();
        loadMembers();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update member.' });
      }
    },
    [communityId, token, selectedMember, draft, loadMembers, resetDraft]
  );

  const handleRemove = useCallback(
    async (member) => {
      if (!communityId || !token) return;
      const confirmed = window.confirm(`Remove ${member.user?.name ?? member.user?.email ?? 'this member'}?`);
      if (!confirmed) return;
      setFeedback(null);
      try {
        await removeCommunityMember({
          communityId,
          userId: member.userId,
          token,
          payload: { reason: 'Removed via instructor dashboard' }
        });
        setFeedback({ tone: 'success', message: 'Member removed.' });
        if (selectedMember?.userId === member.userId) {
          resetDraft();
        }
        loadMembers();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to remove member.' });
      }
    },
    [communityId, token, selectedMember, loadMembers, resetDraft]
  );

  const startEdit = useCallback((member) => {
    setSelectedMember(member);
    const metadata = member.metadata ?? {};
    setDraft({
      email: member.user?.email ?? '',
      role: member.role ?? 'member',
      status: member.status ?? 'active',
      title: metadata.title ?? '',
      location: metadata.location ?? '',
      notes: metadata.notes ?? ''
    });
  }, []);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Member roster"
        description="Invite new learners, adjust roles, and maintain a clean directory."
        actions={
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        }
      />

      {feedback && <DashboardActionFeedback {...feedback} onDismiss={() => setFeedback(null)} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header>
            <h3 className="text-lg font-semibold text-slate-900">{selectedMember ? 'Update member' : 'Invite member'}</h3>
            <p className="text-sm text-slate-500">
              Send instant access to your community roster by email. Existing users are updated in place.
            </p>
          </header>
          <form className="space-y-4" onSubmit={selectedMember ? handleUpdate : handleCreate}>
            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                type="email"
                required
                disabled={Boolean(selectedMember)}
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Role
                <select
                  value={draft.role}
                  onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="member">Member</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Status
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Title
              <input
                type="text"
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Location
              <input
                type="text"
                value={draft.location}
                onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {selectedMember ? 'Save changes' : 'Send invite'}
              </button>
              {selectedMember && (
                <button
                  type="button"
                  onClick={resetDraft}
                  className="text-sm font-semibold text-primary hover:text-primary/80"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header>
            <h3 className="text-lg font-semibold text-slate-900">Active members</h3>
            <p className="text-sm text-slate-500">
              Click a member to update details, promote to moderator, or remove them from the roster.
            </p>
          </header>

          {loading && !members.length ? (
            <DashboardStateMessage title="Loading members" tone="loading" />
          ) : members.length ? (
            <ul className="space-y-3">
              {members.map((member) => (
                <li key={member.userId}>
                  <button
                    type="button"
                    onClick={() => startEdit(member)}
                    className={`flex w-full items-start justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${
                      selectedMember?.userId === member.userId
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary hover:text-primary'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{member.user?.name ?? member.user?.email ?? 'Unknown user'}</div>
                      <div className="text-xs text-slate-500">{member.user?.email}</div>
                      <div className="mt-1 text-xs text-slate-500">Role: {member.role}</div>
                      {member.metadata?.title && (
                        <div className="text-xs text-slate-500">Title: {member.metadata.title}</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                        {member.status}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemove(member);
                        }}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <DashboardStateMessage
              title="No members yet"
              description="Invite your first learner to build momentum in your community."
            />
          )}
        </section>
      </div>
    </div>
  );
}

MembersPanel.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  token: PropTypes.string
};

MembersPanel.defaultProps = {
  communityId: null,
  token: null
};
function ManagePanel({ communityId, token, community }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    coverImageUrl: '',
    visibility: 'public',
    welcomeMessage: '',
    contactEmail: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!community) return;
    setForm({
      name: community.name ?? '',
      slug: community.slug ?? '',
      description: community.description ?? '',
      coverImageUrl: community.coverImageUrl ?? '',
      visibility: community.visibility ?? 'public',
      welcomeMessage: community.metadata?.welcomeMessage ?? '',
      contactEmail: community.metadata?.contactEmail ?? ''
    });
  }, [community]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!communityId || !token) return;
      setFeedback(null);
      setLoading(true);
      try {
        await updateCommunity({
          communityId,
          token,
          payload: {
            name: form.name,
            slug: form.slug,
            description: form.description,
            coverImageUrl: form.coverImageUrl || null,
            visibility: form.visibility,
            metadata: {
              ...(community?.metadata ?? {}),
              welcomeMessage: form.welcomeMessage || null,
              contactEmail: form.contactEmail || null
            }
          }
        });
        setFeedback({ tone: 'success', message: 'Community settings updated.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update community.' });
      } finally {
        setLoading(false);
      }
    },
    [communityId, token, form, community]
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Community settings"
        description="Control how your community is presented to the world and keep key contact details up to date."
      />

      {feedback && <DashboardActionFeedback {...feedback} onDismiss={() => setFeedback(null)} />}

      <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Name
            <input
              type="text"
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            URL slug
            <input
              type="text"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Cover image URL
            <input
              type="url"
              value={form.coverImageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Visibility
            <select
              value={form.visibility}
              onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Welcome message
            <textarea
              rows={3}
              value={form.welcomeMessage}
              onChange={(event) => setForm((prev) => ({ ...prev, welcomeMessage: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Contact email
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="ops@community.com"
            />
          </label>
        </div>
        {form.coverImageUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <img src={form.coverImageUrl} alt="Community cover" className="h-48 w-full object-cover" />
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
            loading ? 'bg-primary/70' : 'bg-primary hover:bg-primary/90'
          }`}
        >
          Save settings
        </button>
      </form>
    </div>
  );
}

ManagePanel.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  token: PropTypes.string,
  community: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    slug: PropTypes.string,
    description: PropTypes.string,
    coverImageUrl: PropTypes.string,
    visibility: PropTypes.string,
    metadata: PropTypes.object
  })
};

ManagePanel.defaultProps = {
  communityId: null,
  token: null,
  community: null
};
export default function InstructorCommunityOperations() {
  const { token, user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [activeTab, setActiveTab] = useState('revenue');
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadCommunities = useCallback(
    async (signal) => {
      if (!token) return;
      setLoadingCommunities(true);
      try {
        const response = await fetchCommunities(token);
        if (signal?.aborted) return;
        const list = response?.data ?? [];
        setCommunities(list);
        if (list.length) {
          const initial = list.find((community) => community.id === selectedCommunityId) ?? list[0];
          setSelectedCommunityId(initial.id);
          const detail = await fetchCommunityDetail(initial.id, token);
          if (signal?.aborted) return;
          setSelectedCommunity(detail?.data ?? initial);
        } else {
          setSelectedCommunityId(null);
          setSelectedCommunity(null);
        }
      } catch (error) {
        if (signal?.aborted) return;
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load communities.' });
      } finally {
        if (!signal?.aborted) {
          setLoadingCommunities(false);
        }
      }
    },
    [token, selectedCommunityId]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadCommunities(controller.signal);
    return () => controller.abort();
  }, [loadCommunities]);

  const handleSelectCommunity = useCallback(
    async (communityId) => {
      if (!token) return;
      setSelectedCommunityId(communityId);
      try {
        const detail = await fetchCommunityDetail(communityId, token);
        setSelectedCommunity(detail?.data ?? null);
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load community detail.' });
      }
    },
    [token]
  );

  const currentCommunityName = selectedCommunity?.name ?? '';

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Instructor operations</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Operate like a modern education business: manage monetisation, communications, member safety, and onboarding without
          leaving your dashboard. Signed in as {user?.name ?? user?.email ?? 'unknown user'}.
        </p>
      </header>

      {feedback && <DashboardActionFeedback {...feedback} onDismiss={() => setFeedback(null)} />}

      {loadingCommunities ? (
        <DashboardStateMessage title="Loading communities" tone="loading" />
      ) : !communities.length ? (
        <DashboardStateMessage
          title="No communities yet"
          description="Create a community to unlock instructor operations and revenue tooling."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {communities.map((community) => (
              <button
                key={community.id}
                type="button"
                onClick={() => handleSelectCommunity(community.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedCommunityId === community.id
                    ? 'bg-primary text-white shadow'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
                }`}
              >
                {community.name}
              </button>
            ))}
          </div>

          <TabNavigation activeTab={activeTab} onSelect={setActiveTab} />

          <div className="space-y-10">
            {activeTab === 'revenue' && (
              <RevenuePanel communityId={selectedCommunityId} token={token} />
            )}
            {activeTab === 'broadcast' && (
              <BroadcastPanel
                communityId={selectedCommunityId}
                token={token}
                communityName={currentCommunityName}
              />
            )}
            {activeTab === 'safety' && <SafetyPanel communityId={selectedCommunityId} token={token} />}
            {activeTab === 'subscriptions' && (
              <SubscriptionsPanel communityId={selectedCommunityId} token={token} />
            )}
            {activeTab === 'members' && <MembersPanel communityId={selectedCommunityId} token={token} />}
            {activeTab === 'manage' && (
              <ManagePanel
                communityId={selectedCommunityId}
                token={token}
                community={selectedCommunity}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

