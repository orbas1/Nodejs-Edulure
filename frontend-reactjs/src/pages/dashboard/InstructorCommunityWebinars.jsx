import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCommunities } from '../../api/communityApi.js';
import {
  createCommunityWebinar,
  deleteCommunityWebinar,
  listCommunityWebinars,
  updateCommunityWebinar
} from '../../api/communityProgrammingApi.js';

const STATUS_OPTIONS = ['Draft', 'Announced', 'Live', 'Complete', 'Cancelled'];

const createWebinarDraft = () => ({
  topic: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '10:00',
  status: 'Draft',
  registrants: 0,
  watchLink: '',
  description: '',
  host: ''
});

function normaliseWebinar(webinar) {
  const iso = typeof webinar.startAt === 'string' ? webinar.startAt : new Date().toISOString();
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 16) || '10:00';
  const statusValue = String(webinar.status ?? 'draft').toLowerCase();
  const statusLabel = statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
  return {
    id: webinar.id ?? `${webinar.topic}-${date}-${time}`,
    topic: webinar.topic ?? 'Untitled webinar',
    host: webinar.host ?? 'Community team',
    description: webinar.description ?? '',
    watchLink: webinar.watchUrl ?? webinar.watchLink ?? '',
    registrants: Number(webinar.registrantCount ?? webinar.registrants ?? 0),
    startAt: iso,
    date,
    startTime: time,
    status: statusLabel,
    statusValue,
    permissions: webinar.permissions ?? { canEdit: true }
  };
}

function buildStartAt(date, time) {
  if (!date) return new Date().toISOString();
  const safeTime = time && time.length >= 4 ? time : '10:00';
  return new Date(`${date}T${safeTime}`.replace('Z', '')).toISOString();
}

export default function InstructorCommunityWebinars() {
  const { dashboard, refresh } = useOutletContext();
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [communitiesState, setCommunitiesState] = useState({ items: [], loading: false, error: null });
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);

  const [webinarsState, setWebinarsState] = useState({ items: [], loading: false, error: null });
  const [draft, setDraft] = useState(createWebinarDraft);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadCommunities = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setCommunitiesState({ items: [], loading: false, error: null });
      setSelectedCommunityId(null);
      return;
    }
    setCommunitiesState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchCommunities(token);
      const items = Array.isArray(response.data) ? response.data : [];
      setCommunitiesState({ items, loading: false, error: null });
      setSelectedCommunityId((current) => {
        if (current && items.some((community) => String(community.id) === String(current))) {
          return current;
        }
        return items[0] ? String(items[0].id) : null;
      });
    } catch (error) {
      setCommunitiesState({ items: [], loading: false, error });
      setSelectedCommunityId(null);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const loadWebinars = useCallback(
    async (communityId, { showFeedback = false } = {}) => {
      if (!token || !communityId) {
        setWebinarsState({ items: [], loading: false, error: null });
        return;
      }
      setWebinarsState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await listCommunityWebinars({
          communityId,
          token,
          params: { order: 'desc', limit: 200 }
        });
        const items = response.data.map(normaliseWebinar);
        setWebinarsState({ items, loading: false, error: null });
        if (showFeedback) {
          setFeedback({ tone: 'success', message: 'Webinars synced from community workspace.' });
        }
      } catch (error) {
        setWebinarsState({ items: [], loading: false, error });
      }
    },
    [token]
  );

  useEffect(() => {
    if (selectedCommunityId) {
      loadWebinars(selectedCommunityId);
    } else {
      setWebinarsState({ items: [], loading: false, error: null });
    }
  }, [loadWebinars, selectedCommunityId]);

  useEffect(() => {
    if (Array.isArray(dashboard?.communities?.webinars) && webinarsState.items.length === 0 && selectedCommunityId) {
      const seeded = dashboard.communities.webinars.map(normaliseWebinar);
      setWebinarsState({ items: seeded, loading: false, error: null });
    }
  }, [dashboard?.communities?.webinars, selectedCommunityId, webinarsState.items.length]);

  const analytics = useMemo(() => {
    const totalRegistrants = webinarsState.items.reduce((total, webinar) => total + Number(webinar.registrants ?? 0), 0);
    const upcoming = webinarsState.items.filter((webinar) => new Date(webinar.startAt) >= new Date()).length;
    return { totalRegistrants, upcoming, pipeline: webinarsState.items.length };
  }, [webinarsState.items]);

  const filteredWebinars = useMemo(() => {
    return webinarsState.items.filter((webinar) => {
      const matchesStatus = statusFilter === 'All' || webinar.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }
      const query = searchTerm.toLowerCase();
      return [webinar.topic, webinar.description, webinar.host]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [statusFilter, searchTerm, webinarsState.items]);

  const handleEdit = useCallback((webinar) => {
    setEditingId(webinar.id);
    setDraft({
      topic: webinar.topic,
      date: webinar.date,
      startTime: webinar.startTime,
      status: webinar.status,
      registrants: webinar.registrants,
      watchLink: webinar.watchLink,
      description: webinar.description,
      host: webinar.host
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft(createWebinarDraft());
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedCommunityId || !token) {
        setFeedback({ tone: 'error', message: 'Select a community to schedule webinars.' });
        return;
      }
      const payload = {
        topic: draft.topic || 'Untitled webinar',
        host: draft.host || 'Community team',
        startAt: buildStartAt(draft.date, draft.startTime),
        status: draft.status.toLowerCase(),
        registrantCount: Number.isNaN(Number(draft.registrants)) ? 0 : Number(draft.registrants),
        watchUrl: draft.watchLink || undefined,
        description: draft.description || undefined
      };

      setSaving(true);
      try {
        if (editingId) {
          await updateCommunityWebinar({
            communityId: selectedCommunityId,
            webinarId: editingId,
            token,
            payload
          });
          setFeedback({ tone: 'success', message: 'Webinar updated successfully.' });
        } else {
          await createCommunityWebinar({ communityId: selectedCommunityId, token, payload });
          setFeedback({ tone: 'success', message: 'Webinar added to your agenda.' });
        }
        setDraft(createWebinarDraft());
        setEditingId(null);
        await loadWebinars(selectedCommunityId);
      } catch (error) {
        setFeedback({
          tone: 'error',
          message: error?.message ?? 'Unable to save webinar. Please try again.'
        });
      } finally {
        setSaving(false);
      }
    },
    [draft, editingId, loadWebinars, selectedCommunityId, token]
  );

  const handleAdvanceStatus = useCallback(
    async (webinar) => {
      if (!webinar?.id || !selectedCommunityId || !token) return;
      const currentIndex = STATUS_OPTIONS.indexOf(webinar.status);
      const nextStatus = STATUS_OPTIONS[Math.min(STATUS_OPTIONS.length - 1, currentIndex + 1)];
      try {
        await updateCommunityWebinar({
          communityId: selectedCommunityId,
          webinarId: webinar.id,
          token,
          payload: { status: nextStatus.toLowerCase() }
        });
        await loadWebinars(selectedCommunityId);
        setFeedback({ tone: 'success', message: 'Webinar status advanced.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update status.' });
      }
    },
    [loadWebinars, selectedCommunityId, token]
  );

  const handleDelete = useCallback(
    async (webinarId) => {
      if (!selectedCommunityId || !token) return;
      try {
        await deleteCommunityWebinar({ communityId: selectedCommunityId, webinarId, token });
        await loadWebinars(selectedCommunityId);
        setFeedback({ tone: 'success', message: 'Webinar removed from the agenda.' });
        if (editingId === webinarId) {
          handleCancelEdit();
        }
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to delete webinar.' });
      }
    },
    [editingId, handleCancelEdit, loadWebinars, selectedCommunityId, token]
  );

  const handleReset = useCallback(() => {
    setStatusFilter('All');
    setSearchTerm('');
    setDraft(createWebinarDraft());
    setEditingId(null);
    if (selectedCommunityId) {
      loadWebinars(selectedCommunityId, { showFeedback: true });
    }
  }, [loadWebinars, selectedCommunityId]);

  const isAuthenticatedInstructor = Boolean(token && isAuthenticated);

  if (!isAuthenticatedInstructor) {
    return (
      <DashboardStateMessage
        title="Instructor session required"
        description="Sign in with an instructor account to manage community webinars and sync live data."
        actionLabel="Back"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Community webinars</h1>
          <p className="mt-2 text-sm text-slate-600">
            Coordinate registration flows, agendas, and promotional cadences for every live broadcast.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-pill px-4 py-2" onClick={handleReset}>
            Reset agenda
          </button>
          <button type="button" className="dashboard-primary-pill" onClick={() => refresh?.()}>
            Refresh from events API
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total registrants</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{analytics.totalRegistrants}</p>
          <p className="mt-1 text-xs text-slate-500">Confirmed attendees across the webinar calendar.</p>
        </div>
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming sessions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{analytics.upcoming}</p>
          <p className="mt-1 text-xs text-slate-500">Future webinars scheduled after today.</p>
        </div>
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pipeline size</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{analytics.pipeline}</p>
          <p className="mt-1 text-xs text-slate-500">Active programmes being tracked in this workspace.</p>
        </div>
      </section>

      <section className="dashboard-section space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Webinar planner</p>
            <h2 className="text-lg font-semibold text-slate-900">Create or import a webinar</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="dashboard-input h-10"
              value={selectedCommunityId ?? ''}
              onChange={(event) => setSelectedCommunityId(event.target.value || null)}
            >
              {communitiesState.items.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name ?? `Community ${community.id}`}
                </option>
              ))}
            </select>
            <select
              className="dashboard-input h-10"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by topic or host"
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
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Webinar topic
              <input
                type="text"
                required
                value={draft.topic}
                onChange={(event) => setDraft((previous) => ({ ...previous, topic: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Host or facilitator
              <input
                type="text"
                required
                value={draft.host}
                onChange={(event) => setDraft((previous) => ({ ...previous, host: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-1 text-sm text-slate-600">
              Date
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraft((previous) => ({ ...previous, date: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Start time
              <input
                type="time"
                value={draft.startTime}
                onChange={(event) => setDraft((previous) => ({ ...previous, startTime: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Status
              <select
                className="dashboard-input"
                value={draft.status}
                onChange={(event) => setDraft((previous) => ({ ...previous, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Registrants
              <input
                type="number"
                min="0"
                value={draft.registrants}
                onChange={(event) => setDraft((previous) => ({ ...previous, registrants: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm text-slate-600">
            Description
            <textarea
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
              className="dashboard-input resize-y"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Registration or watch link
            <input
              type="url"
              value={draft.watchLink}
              onChange={(event) => setDraft((previous) => ({ ...previous, watchLink: event.target.value }))}
              className="dashboard-input"
            />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="submit" className="dashboard-primary-pill px-6 py-2" disabled={saving}>
              {editingId ? 'Update webinar' : 'Add webinar to agenda'}
            </button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/70">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Topic</th>
                <th className="px-5 py-3">Schedule</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Registrants</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWebinars.map((webinar) => (
                <tr key={webinar.id} className="hover:bg-primary/5">
                  <td className="px-5 py-4 text-slate-900">
                    <p className="font-semibold">{webinar.topic}</p>
                    <p className="mt-1 text-xs text-slate-500">Host: {webinar.host}</p>
                    <p className="mt-2 text-xs text-slate-500">{webinar.description || 'No agenda uploaded yet.'}</p>
                    {webinar.watchLink ? (
                      <a
                        href={webinar.watchLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
                      >
                        View registration page
                      </a>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    <p>{new Date(webinar.startAt).toLocaleDateString()}</p>
                    <p className="mt-1 text-xs">Starts at {webinar.startTime}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    <span className="dashboard-pill px-3 py-1 uppercase tracking-wide">{webinar.status}</span>
                  </td>
                  <td className="px-5 py-4 text-right text-emerald-600">{webinar.registrants}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="dashboard-pill px-3 py-1" onClick={() => handleEdit(webinar)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1"
                        onClick={() => handleAdvanceStatus(webinar)}
                        disabled={!webinar.permissions?.canEdit}
                      >
                        Advance status
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill border-transparent bg-rose-50 px-3 py-1 text-rose-600 hover:border-rose-200"
                        onClick={() => handleDelete(webinar.id)}
                        disabled={!webinar.permissions?.canEdit}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredWebinars.length === 0 ? (
          <DashboardStateMessage
            title={webinarsState.items.length === 0 ? 'No community webinars scheduled' : 'No webinars match your filters'}
            description={
              webinarsState.items.length === 0
                ? 'Use the planner above to launch your first webinar or sync with your external events tool.'
                : 'Adjust the search or status filters to continue managing your webinar pipeline.'
            }
            actionLabel={webinarsState.items.length === 0 ? 'Create webinar' : undefined}
            onAction={webinarsState.items.length === 0 ? () => setEditingId(null) : undefined}
          />
        ) : null}

        {webinarsState.error ? (
          <DashboardStateMessage
            tone="error"
            title="Unable to load webinars"
            description={webinarsState.error?.message ?? 'Check your connection and try again.'}
            actionLabel="Retry"
            onAction={() => selectedCommunityId && loadWebinars(selectedCommunityId)}
          />
        ) : null}
      </section>
    </div>
  );
}
