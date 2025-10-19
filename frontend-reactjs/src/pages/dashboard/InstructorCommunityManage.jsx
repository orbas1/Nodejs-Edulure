import { useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import usePersistentCollection from '../../hooks/usePersistentCollection.js';

const createCommunityDraft = () => ({
  title: '',
  members: 0,
  trend: 'Stable',
  health: 'Healthy',
  moderators: 1,
  approvalsPending: 0,
  incidentsOpen: 0,
  escalationsOpen: 0,
  focus: ''
});

export default function InstructorCommunityManage() {
  const { dashboard, refresh } = useOutletContext();
  const seedCommunities = useMemo(
    () =>
      (Array.isArray(dashboard?.communities?.manageDeck) ? dashboard.communities.manageDeck : []).map((community) => ({
        id: community.id ?? `${community.title}-${community.members}`,
        title: community.title,
        members: Number(community.members ?? 0),
        trend: community.trend ?? 'Stable',
        health: community.health ?? 'Healthy',
        moderators: Number(community.moderators ?? 1),
        approvalsPending: Number(community.approvalsPending ?? 0),
        incidentsOpen: Number(community.incidentsOpen ?? 0),
        escalationsOpen: Number(community.escalationsOpen ?? 0),
        focus: community.focus ?? ''
      })),
    [dashboard?.communities?.manageDeck]
  );

  const {
    items: communities,
    addItem,
    updateItem,
    removeItem,
    reset: resetCommunities
  } = usePersistentCollection('edulure.community.operations', () => seedCommunities);

  const [draft, setDraft] = useState(createCommunityDraft);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const metrics = useMemo(() => {
    const totals = communities.reduce(
      (acc, community) => {
        acc.members += Number(community.members ?? 0);
        acc.moderators += Number(community.moderators ?? 0);
        acc.approvals += Number(community.approvalsPending ?? 0);
        acc.incidents += Number(community.incidentsOpen ?? 0);
        return acc;
      },
      { members: 0, moderators: 0, approvals: 0, incidents: 0 }
    );
    return totals;
  }, [communities]);

  const filteredCommunities = useMemo(() => {
    if (!searchTerm) {
      return communities;
    }
    const query = searchTerm.toLowerCase();
    return communities.filter((community) =>
      [community.title, community.trend, community.health, community.focus]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [communities, searchTerm]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const payload = {
        title: draft.title || 'Untitled community',
        members: Number.isNaN(Number(draft.members)) ? 0 : Number(draft.members),
        trend: draft.trend,
        health: draft.health,
        moderators: Number.isNaN(Number(draft.moderators)) ? 0 : Number(draft.moderators),
        approvalsPending: Number.isNaN(Number(draft.approvalsPending)) ? 0 : Number(draft.approvalsPending),
        incidentsOpen: Number.isNaN(Number(draft.incidentsOpen)) ? 0 : Number(draft.incidentsOpen),
        escalationsOpen: Number.isNaN(Number(draft.escalationsOpen)) ? 0 : Number(draft.escalationsOpen),
        focus: draft.focus
      };

      if (editingId) {
        updateItem(editingId, payload);
      } else {
        addItem(payload);
      }

      setDraft(createCommunityDraft());
      setEditingId(null);
    },
    [addItem, draft, editingId, updateItem]
  );

  const handleEdit = useCallback((community) => {
    setEditingId(community.id);
    setDraft({
      title: community.title,
      members: community.members,
      trend: community.trend,
      health: community.health,
      moderators: community.moderators,
      approvalsPending: community.approvalsPending,
      incidentsOpen: community.incidentsOpen,
      escalationsOpen: community.escalationsOpen,
      focus: community.focus
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft(createCommunityDraft());
  }, []);

  const handleFocusChange = useCallback(
    (community, focus) => {
      updateItem(community.id, { focus });
    },
    [updateItem]
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Community operations</h1>
          <p className="mt-2 text-sm text-slate-600">
            Monitor growth, health, and resourcing across every live space in your portfolio.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-pill px-4 py-2" onClick={resetCommunities}>
            Reset metrics
          </button>
          <button type="button" className="dashboard-primary-pill" onClick={() => refresh?.()}>
            Refresh telemetry
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total members</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{metrics.members}</p>
          <p className="mt-1 text-xs text-slate-500">Members participating across all communities.</p>
        </div>
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Moderators</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{metrics.moderators}</p>
          <p className="mt-1 text-xs text-slate-500">Active stewards keeping rituals on track.</p>
        </div>
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Approvals queue</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{metrics.approvals}</p>
          <p className="mt-1 text-xs text-slate-500">Members awaiting onboarding decisions.</p>
        </div>
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Open incidents</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{metrics.incidents}</p>
          <p className="mt-1 text-xs text-slate-500">Issues currently triaged by the operations team.</p>
        </div>
      </section>

      <section className="dashboard-section space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Community builder</p>
            <h2 className="text-lg font-semibold text-slate-900">Add or update a community space</h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search communities"
              className="dashboard-input h-10"
            />
            {editingId ? (
              <button type="button" className="dashboard-pill px-4 py-2" onClick={handleCancelEdit}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </header>

        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white/60 p-5" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm text-slate-600">
            Community name
            <input
              type="text"
              required
              value={draft.title}
              onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
              className="dashboard-input"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-600">
              Members
              <input
                type="number"
                min="0"
                value={draft.members}
                onChange={(event) => setDraft((previous) => ({ ...previous, members: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Moderators
              <input
                type="number"
                min="0"
                value={draft.moderators}
                onChange={(event) => setDraft((previous) => ({ ...previous, moderators: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Health
              <select
                className="dashboard-input"
                value={draft.health}
                onChange={(event) => setDraft((previous) => ({ ...previous, health: event.target.value }))}
              >
                <option value="Healthy">Healthy</option>
                <option value="Stable">Stable</option>
                <option value="Watch">Watch</option>
                <option value="At risk">At risk</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-600">
              Trend
              <select
                className="dashboard-input"
                value={draft.trend}
                onChange={(event) => setDraft((previous) => ({ ...previous, trend: event.target.value }))}
              >
                <option value="Growing">Growing</option>
                <option value="Stable">Stable</option>
                <option value="Declining">Declining</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Approvals pending
              <input
                type="number"
                min="0"
                value={draft.approvalsPending}
                onChange={(event) => setDraft((previous) => ({ ...previous, approvalsPending: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Focus area
              <input
                type="text"
                value={draft.focus}
                onChange={(event) => setDraft((previous) => ({ ...previous, focus: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Open incidents
              <input
                type="number"
                min="0"
                value={draft.incidentsOpen}
                onChange={(event) => setDraft((previous) => ({ ...previous, incidentsOpen: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Escalations open
              <input
                type="number"
                min="0"
                value={draft.escalationsOpen}
                onChange={(event) => setDraft((previous) => ({ ...previous, escalationsOpen: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="submit" className="dashboard-primary-pill px-6 py-2">
              {editingId ? 'Update community' : 'Add community'}
            </button>
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCommunities.map((community) => (
            <article key={community.id} className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{community.members} members</span>
                <span>{community.trend}</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{community.title}</h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">Health: {community.health}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700">Moderators</p>
                  <p className="mt-1 text-lg text-slate-900">{community.moderators}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700">Approvals</p>
                  <p className="mt-1 text-lg text-slate-900">{community.approvalsPending}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700">Incidents</p>
                  <p className="mt-1 text-lg text-slate-900">{community.incidentsOpen}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700">Escalations</p>
                  <p className="mt-1 text-lg text-slate-900">{community.escalationsOpen}</p>
                </div>
              </div>
              <label className="mt-4 block text-xs text-slate-500">
                Quarterly focus
                <input
                  type="text"
                  value={community.focus}
                  onChange={(event) => handleFocusChange(community, event.target.value)}
                  className="dashboard-input mt-1"
                  placeholder="Launch new onboarding cohort"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                <button type="button" className="dashboard-pill px-3 py-1" onClick={() => handleEdit(community)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="dashboard-pill px-3 py-1"
                  onClick={() => updateItem(community.id, { approvalsPending: Math.max(0, community.approvalsPending - 1) })}
                >
                  Approve member
                </button>
                <button
                  type="button"
                  className="dashboard-pill px-3 py-1"
                  onClick={() => updateItem(community.id, { incidentsOpen: Math.max(0, community.incidentsOpen - 1) })}
                >
                  Resolve incident
                </button>
                <button
                  type="button"
                  className="dashboard-pill border-transparent bg-rose-50 px-3 py-1 text-rose-600 hover:border-rose-200"
                  onClick={() => removeItem(community.id)}
                >
                  Archive
                </button>
              </div>
            </article>
          ))}
        </div>

        {filteredCommunities.length === 0 ? (
          <DashboardStateMessage
            title={communities.length === 0 ? 'Community metrics unavailable' : 'No communities match your filters'}
            description={
              communities.length === 0
                ? 'Add your first community using the builder or refresh once telemetry has synced from source systems.'
                : 'Clear the search input to continue managing your live communities.'
            }
            actionLabel={communities.length === 0 ? 'Add community' : undefined}
            onAction={communities.length === 0 ? () => setEditingId(null) : undefined}
          />
        ) : null}
      </section>
    </div>
  );
}
