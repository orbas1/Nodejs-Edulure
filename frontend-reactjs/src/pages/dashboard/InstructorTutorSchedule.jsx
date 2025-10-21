import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  DocumentArrowDownIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import useMountedRef from '../../hooks/useMountedRef.js';

const STORAGE_KEY = 'edulure:tutor-schedule';
const TAG_DELIMITERS = /(?:\r?\n|[•,])/u;

function normaliseTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(TAG_DELIMITERS)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function serialiseState(state) {
  try {
    return JSON.stringify(state);
  } catch (_error) {
    return null;
  }
}

function parsePersisted(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    const notifications = Array.isArray(parsed.notifications) ? parsed.notifications : [];
    return {
      entries,
      notifications,
      lastSyncedAt: parsed.lastSyncedAt ?? null
    };
  } catch (_error) {
    return null;
  }
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tutor-${Math.random().toString(36).slice(2, 10)}`;
}

function mapScheduleEntry(entry) {
  if (!entry) {
    return null;
  }
  const id = entry.id ?? generateId();
  return {
    id,
    mentor: entry.mentor ?? 'Mentor',
    learners: entry.learners ?? 'No learners assigned',
    slots: entry.slots ?? '0 open slots',
    nextAvailability: entry.nextAvailability ?? '',
    nextSession: entry.nextSession ?? '',
    timezone: entry.timezone ?? 'Etc/UTC',
    location: entry.location ?? 'Virtual',
    mediums: Array.isArray(entry.mediums) ? entry.mediums : [],
    tags: normaliseTags(entry.noteItems ?? entry.notes),
    lastUpdatedAt: entry.lastUpdatedAt ?? entry.updatedAt ?? null
  };
}

function mapNotification(notification) {
  if (!notification) return null;
  return {
    id: notification.id ?? generateId(),
    title: notification.title ?? 'Operational update',
    detail: notification.detail ?? null,
    category: notification.category ?? 'operations',
    createdAt: notification.createdAt ?? notification.timestamp ?? new Date().toISOString()
  };
}

function loadInitialState(dashboard) {
  const schedule = Array.isArray(dashboard?.tutors?.availability)
    ? dashboard.tutors.availability
    : Array.isArray(dashboard?.schedules?.tutor)
      ? dashboard.schedules.tutor
      : [];
  const notifications = Array.isArray(dashboard?.tutors?.notifications)
    ? dashboard.tutors.notifications
    : [];

  const entries = schedule.map(mapScheduleEntry).filter(Boolean);
  const alerts = notifications.map(mapNotification).filter(Boolean);

  if (!entries.length) {
    return null;
  }

  return {
    entries,
    notifications: alerts,
    lastSyncedAt: new Date().toISOString()
  };
}

function ScheduleForm({ draft, onCancel, onSubmit, submitting }) {
  const [formState, setFormState] = useState(draft);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormState(draft);
    setErrors({});
  }, [draft]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!formState.mentor.trim()) {
      nextErrors.mentor = 'Mentor name is required';
    }
    if (!formState.slots.trim()) {
      nextErrors.slots = 'Provide current capacity information';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      ...formState,
      tags: normaliseTags(formState.tags)
    };
    onSubmit(payload);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit} aria-label="Tutor schedule form">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="dashboard-label" htmlFor="mentor">
            Mentor name
          </label>
          <input
            id="mentor"
            name="mentor"
            value={formState.mentor}
            onChange={handleChange}
            className="dashboard-input"
            placeholder="Jordan Mentor"
          />
          {errors.mentor && <p className="dashboard-error">{errors.mentor}</p>}
        </div>
        <div>
          <label className="dashboard-label" htmlFor="learners">
            Learner pod
          </label>
          <input
            id="learners"
            name="learners"
            value={formState.learners}
            onChange={handleChange}
            className="dashboard-input"
            placeholder="12 founders"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="dashboard-label" htmlFor="slots">
            Capacity summary
          </label>
          <input
            id="slots"
            name="slots"
            value={formState.slots}
            onChange={handleChange}
            className="dashboard-input"
            placeholder="4 open slots"
          />
          {errors.slots && <p className="dashboard-error">{errors.slots}</p>}
        </div>
        <div>
          <label className="dashboard-label" htmlFor="timezone">
            Timezone
          </label>
          <input
            id="timezone"
            name="timezone"
            value={formState.timezone}
            onChange={handleChange}
            className="dashboard-input"
            placeholder="America/New_York"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="dashboard-label" htmlFor="nextAvailability">
            Next availability window
          </label>
          <input
            id="nextAvailability"
            name="nextAvailability"
            value={formState.nextAvailability}
            onChange={handleChange}
            className="dashboard-input"
            placeholder="Tue 10:00 UTC"
          />
        </div>
        <div>
          <label className="dashboard-label" htmlFor="nextSession">
            Next confirmed session
          </label>
          <input
            id="nextSession"
            name="nextSession"
            value={formState.nextSession}
            onChange={handleChange}
            className="dashboard-input"
            placeholder="Thu 14:00 UTC"
          />
        </div>
      </div>
      <div>
        <label className="dashboard-label" htmlFor="location">
          Location
        </label>
        <input
          id="location"
          name="location"
          value={formState.location}
          onChange={handleChange}
          className="dashboard-input"
          placeholder="Virtual classroom"
        />
      </div>
      <div>
        <label className="dashboard-label" htmlFor="mediums">
          Delivery channels
        </label>
        <input
          id="mediums"
          name="mediums"
          value={Array.isArray(formState.mediums) ? formState.mediums.join(', ') : formState.mediums}
          onChange={handleChange}
          className="dashboard-input"
          placeholder="Zoom, Loom recap"
        />
        <p className="mt-1 text-xs text-slate-500">Separate channels with commas.</p>
      </div>
      <div>
        <label className="dashboard-label" htmlFor="tags">
          Highlights &amp; notes
        </label>
        <textarea
          id="tags"
          name="tags"
          value={Array.isArray(formState.tags) ? formState.tags.join('\n') : formState.tags ?? ''}
          onChange={handleChange}
          rows={3}
          className="dashboard-input resize-y"
          placeholder="Async feedback window\nCapstone week"
        />
        <p className="mt-1 text-xs text-slate-500">Add one highlight per line.</p>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="dashboard-pill px-5">
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="dashboard-primary-pill px-6 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save schedule'}
        </button>
      </div>
    </form>
  );
}

export default function InstructorTutorSchedule() {
  const { dashboard, refresh } = useOutletContext();

  const seed = useMemo(() => loadInitialState(dashboard), [dashboard]);
  const [state, setState] = useState(() => {
    const persisted = typeof window !== 'undefined' ? parsePersisted(localStorage.getItem(STORAGE_KEY)) : null;
    if (persisted?.entries?.length) {
      return persisted;
    }
    return seed ?? { entries: [], notifications: [], lastSyncedAt: null };
  });
  const [editor, setEditor] = useState({ mode: 'idle', targetId: null, draft: null });
  const [saving, setSaving] = useState(false);
  const [notificationDraft, setNotificationDraft] = useState({ title: '', detail: '' });
  const mounted = useMountedRef();

  useEffect(() => {
    if (state.entries.length === 0 && seed?.entries?.length) {
      setState(seed);
    }
  }, [seed, state.entries.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const serialised = serialiseState(state);
    if (serialised) {
      localStorage.setItem(STORAGE_KEY, serialised);
    }
  }, [state]);

  const handleReset = () => {
    if (!seed) return;
    setState({ ...seed, lastSyncedAt: new Date().toISOString() });
  };

  const handleEdit = (entry) => {
    setEditor({
      mode: 'edit',
      targetId: entry.id,
      draft: {
        ...entry,
        mediums: Array.isArray(entry.mediums) ? entry.mediums : normaliseTags(entry.mediums)
      }
    });
  };

  const handleCreate = () => {
    setEditor({
      mode: 'create',
      targetId: null,
      draft: {
        id: generateId(),
        mentor: '',
        learners: '',
        slots: '',
        nextAvailability: '',
        nextSession: '',
        timezone: 'Etc/UTC',
        location: 'Virtual classroom',
        mediums: ['Zoom'],
        tags: []
      }
    });
  };

  const handleDelete = (id) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.filter((entry) => entry.id !== id)
    }));
  };

  const handleSubmit = (payload) => {
    setSaving(true);
    setTimeout(() => {
      if (!mounted.current) {
        return;
      }
      setState((prev) => {
        const tags = normaliseTags(payload.tags);
        const entry = {
          ...payload,
          id: payload.id ?? generateId(),
          mediums: Array.isArray(payload.mediums)
            ? payload.mediums.map((item) => item.trim()).filter(Boolean)
            : normaliseTags(payload.mediums),
          tags
        };
        if (editor.mode === 'edit' && editor.targetId) {
          return {
            ...prev,
            entries: prev.entries.map((item) => (item.id === editor.targetId ? entry : item)),
            lastSyncedAt: new Date().toISOString()
          };
        }
        return {
          ...prev,
          entries: [entry, ...prev.entries],
          lastSyncedAt: new Date().toISOString()
        };
      });
      setSaving(false);
      setEditor({ mode: 'idle', targetId: null, draft: null });
    }, 250);
  };

  const handleDismissNotification = (id) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((notification) => notification.id !== id)
    }));
  };

  const handleCreateNotification = (event) => {
    event.preventDefault();
    if (!notificationDraft.title.trim()) return;
    const payload = {
      id: generateId(),
      title: notificationDraft.title.trim(),
      detail: notificationDraft.detail.trim() || null,
      category: 'operations',
      createdAt: new Date().toISOString()
    };
    setState((prev) => ({
      ...prev,
      notifications: [payload, ...prev.notifications]
    }));
    setNotificationDraft({ title: '', detail: '' });
  };

  if (!state.entries.length) {
    return (
      <DashboardStateMessage
        title="Tutor availability not synced"
        description="Sync your mentors' calendars to populate availability windows across pods."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tutor schedules</h1>
          <p className="mt-2 text-sm text-slate-600">
            Ensure every mentor pod is resourced with the right availability and learners receive rapid confirmations.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {state.lastSyncedAt ? `Last synced ${new Date(state.lastSyncedAt).toLocaleString()}` : 'Workspace data loaded.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="dashboard-primary-pill inline-flex items-center gap-2"
            onClick={handleCreate}
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            New availability
          </button>
          <button
            type="button"
            className="dashboard-pill inline-flex items-center gap-2"
            onClick={() => refresh?.()}
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            Refresh data
          </button>
          <button
            type="button"
            className="dashboard-pill inline-flex items-center gap-2"
            onClick={handleReset}
          >
            <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />
            Load workspace
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {state.entries.map((entry) => (
            <article key={entry.id} className="dashboard-section space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{entry.mentor}</p>
                  <p className="mt-1 text-sm text-slate-600">{entry.learners || 'Unassigned learners'}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {entry.slots}
                </span>
              </div>
              <dl className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next availability</dt>
                  <dd className="font-medium text-slate-900">{entry.nextAvailability || 'Sync calendar'}</dd>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next session</dt>
                  <dd className="font-medium text-slate-900">{entry.nextSession || 'None scheduled'}</dd>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timezone</dt>
                  <dd className="font-medium text-slate-900">{entry.timezone}</dd>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</dt>
                  <dd className="font-medium text-slate-900">{entry.location}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {entry.mediums?.map((medium) => (
                  <span key={`${entry.id}-${medium}`} className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                    {medium}
                  </span>
                ))}
                {entry.tags?.map((tag) => (
                  <span key={`${entry.id}-${tag}`} className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  className="dashboard-pill inline-flex items-center gap-2 px-3 py-1"
                  onClick={() => handleEdit(entry)}
                >
                  <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  className="dashboard-pill inline-flex items-center gap-2 px-3 py-1 text-rose-600 hover:border-rose-200"
                  onClick={() => handleDelete(entry.id)}
                >
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                  Remove
                </button>
              </div>
              {editor.mode === 'edit' && editor.targetId === entry.id && editor.draft && (
                <div className="rounded-3xl border border-primary/30 bg-white/80 p-4 shadow-inner">
                  <h3 className="text-sm font-semibold text-primary">Update availability</h3>
                  <ScheduleForm
                    draft={editor.draft}
                    onCancel={() => setEditor({ mode: 'idle', targetId: null, draft: null })}
                    onSubmit={handleSubmit}
                    submitting={saving}
                  />
                </div>
              )}
            </article>
          ))}
          {editor.mode === 'create' && editor.draft && (
            <div className="rounded-3xl border border-dashed border-primary/50 bg-primary/5 p-5">
              <h2 className="text-base font-semibold text-primary">Create new availability window</h2>
              <p className="mt-1 text-sm text-primary/80">
                Publish new mentor pods or concierge availability directly to the tutor experience.
              </p>
              <div className="mt-4">
                <ScheduleForm
                  draft={editor.draft}
                  onCancel={() => setEditor({ mode: 'idle', targetId: null, draft: null })}
                  onSubmit={handleSubmit}
                  submitting={saving}
                />
              </div>
            </div>
          )}
        </div>
        <aside className="space-y-5">
          <section className="dashboard-section space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Operational alerts</h2>
              <p className="text-sm text-slate-600">Broadcast roster updates and remediation tasks to your pods.</p>
            </div>
            <form className="space-y-3" onSubmit={handleCreateNotification}>
              <div>
                <label className="dashboard-label" htmlFor="notification-title">
                  Alert title
                </label>
                <input
                  id="notification-title"
                  name="title"
                  value={notificationDraft.title}
                  onChange={(event) =>
                    setNotificationDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="dashboard-input"
                  placeholder="Capstone prep week"
                />
              </div>
              <div>
                <label className="dashboard-label" htmlFor="notification-detail">
                  Detail
                </label>
                <textarea
                  id="notification-detail"
                  name="detail"
                  rows={2}
                  value={notificationDraft.detail}
                  onChange={(event) =>
                    setNotificationDraft((prev) => ({ ...prev, detail: event.target.value }))
                  }
                  className="dashboard-input resize-y"
                  placeholder="Send async recap within 24h of live session."
                />
              </div>
              <button
                type="submit"
                className="dashboard-primary-pill w-full"
                disabled={!notificationDraft.title.trim()}
              >
                Publish alert
              </button>
            </form>
            <div className="space-y-3">
              {state.notifications.length === 0 ? (
                <p className="text-sm text-slate-500">No active notifications.</p>
              ) : (
                state.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{notification.title}</p>
                        {notification.detail && (
                          <p className="mt-1 text-xs opacity-80">{notification.detail}</p>
                        )}
                        <p className="mt-2 text-[11px] uppercase tracking-wide opacity-60">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                        onClick={() => handleDismissNotification(notification.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Download coverage report</h3>
            <p className="mt-2 text-sm text-slate-600">
              Export a synchronised .ics file for every mentor pod to share with concierge teams.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-800"
            >
              <DocumentArrowDownIcon className="h-5 w-5" aria-hidden="true" />
              Export availability
            </button>
          </section>
        </aside>
      </section>
    </div>
  );
}

ScheduleForm.propTypes = {
  draft: PropTypes.shape({
    id: PropTypes.string,
    mentor: PropTypes.string,
    learners: PropTypes.string,
    slots: PropTypes.string,
    nextAvailability: PropTypes.string,
    nextSession: PropTypes.string,
    timezone: PropTypes.string,
    location: PropTypes.string,
    mediums: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
    tags: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string])
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool
};

ScheduleForm.defaultProps = {
  submitting: false
};
