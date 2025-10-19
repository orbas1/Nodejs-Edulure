import { useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import usePersistentCollection from '../../hooks/usePersistentCollection.js';

const STATUS_OPTIONS = ['Draft', 'Announced', 'Live', 'Complete'];

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

export default function InstructorCommunityWebinars() {
  const { dashboard, refresh } = useOutletContext();
  const seedWebinars = useMemo(
    () =>
      (Array.isArray(dashboard?.communities?.webinars) ? dashboard.communities.webinars : []).map((webinar) => ({
        id: webinar.id ?? `${webinar.topic}-${webinar.date}`,
        topic: webinar.topic,
        date: webinar.date ?? new Date().toISOString().slice(0, 10),
        startTime: webinar.startTime ?? '10:00',
        status: webinar.status ?? 'Draft',
        registrants: Number(webinar.registrants ?? 0),
        watchLink: webinar.watchLink ?? '',
        description: webinar.description ?? '',
        host: webinar.host ?? 'Community team'
      })),
    [dashboard?.communities?.webinars]
  );

  const {
    items: webinars,
    addItem,
    updateItem,
    removeItem,
    reset: resetWebinars
  } = usePersistentCollection('edulure.community.webinars', () => seedWebinars);

  const [draft, setDraft] = useState(createWebinarDraft);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const analytics = useMemo(() => {
    const totalRegistrants = webinars.reduce((total, webinar) => total + Number(webinar.registrants ?? 0), 0);
    const upcoming = webinars.filter((webinar) => new Date(webinar.date) >= new Date()).length;
    return { totalRegistrants, upcoming };
  }, [webinars]);

  const filteredWebinars = useMemo(() => {
    return webinars.filter((webinar) => {
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
  }, [statusFilter, searchTerm, webinars]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const payload = {
        topic: draft.topic || 'Untitled webinar',
        date: draft.date,
        startTime: draft.startTime,
        status: draft.status,
        registrants: Number.isNaN(Number(draft.registrants)) ? 0 : Number(draft.registrants),
        watchLink: draft.watchLink,
        description: draft.description,
        host: draft.host || 'Community team'
      };

      if (editingId) {
        updateItem(editingId, payload);
      } else {
        addItem(payload);
      }

      setDraft(createWebinarDraft());
      setEditingId(null);
    },
    [addItem, draft, editingId, updateItem]
  );

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

  const handleAdvanceStatus = useCallback(
    (webinar) => {
      const currentIndex = STATUS_OPTIONS.indexOf(webinar.status);
      const nextStatus = STATUS_OPTIONS[Math.min(STATUS_OPTIONS.length - 1, currentIndex + 1)];
      updateItem(webinar.id, { status: nextStatus });
    },
    [updateItem]
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Community webinars</h1>
          <p className="mt-2 text-sm text-slate-600">
            Coordinate registration flows, agendas, and promotional cadences for every live broadcast.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-pill px-4 py-2" onClick={resetWebinars}>
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
          <p className="mt-2 text-2xl font-semibold text-slate-900">{webinars.length}</p>
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
            <button type="submit" className="dashboard-primary-pill px-6 py-2">
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
                    <p>{new Date(webinar.date).toLocaleDateString()}</p>
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
                      <button type="button" className="dashboard-pill px-3 py-1" onClick={() => handleAdvanceStatus(webinar)}>
                        Advance status
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill border-transparent bg-rose-50 px-3 py-1 text-rose-600 hover:border-rose-200"
                        onClick={() => removeItem(webinar.id)}
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
            title={webinars.length === 0 ? 'No community webinars scheduled' : 'No webinars match your filters'}
            description={
              webinars.length === 0
                ? 'Use the planner above to launch your first webinar or sync with your external events tool.'
                : 'Adjust the search or status filters to continue managing your webinar pipeline.'
            }
            actionLabel={webinars.length === 0 ? 'Create webinar' : undefined}
            onAction={webinars.length === 0 ? () => setEditingId(null) : undefined}
          />
        ) : null}
      </section>
    </div>
  );
}
