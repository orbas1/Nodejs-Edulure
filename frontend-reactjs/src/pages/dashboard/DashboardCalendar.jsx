
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  PlayCircleIcon,
  SparklesIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { BoltIcon, CheckCircleIcon, MegaphoneIcon } from '@heroicons/react/24/solid';

import CalendarEventDialog from '../../components/calendar/CalendarEventDialog.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { loadPersistentState, savePersistentState, deletePersistentState } from '../../utils/persistentState.js';

const STORAGE_KEY = 'edulure.dashboard.calendar.v1';
const EVENT_TYPE_LABELS = {
  classroom: 'Classroom',
  livestream: 'Live stream',
  podcast: 'Podcast',
  event: 'Community event'
};

const DEFAULT_SEEDED_EVENTS = [
  {
    id: 'seed-classroom',
    title: 'Revenue architecture studio: Foundations',
    description:
      'Live cohort classroom establishing the trust, pricing, and rev-ops guardrails for the upcoming launch window.',
    type: 'classroom',
    startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    location: 'Virtual classroom stage',
    facilitator: 'Tara Chen',
    capacity: '250 seats',
    resources: 'Pre-read: Trust dashboards primer. Homework: Map your pipeline attrition in Notion.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'seed-livestream',
    title: 'Community live stream: Operator AMA with Sequoia Arc',
    description:
      'Live fireside with venture operators exploring the blended classroom + community revenue stack.',
    type: 'livestream',
    startAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(),
    location: 'Stage One — community live stream',
    facilitator: 'Leo Okafor',
    capacity: 'Unlimited live viewers',
    resources: 'Promo feed post scheduled. Capture highlight reel for podcasts.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'seed-podcast',
    title: 'Community podcast: Designing async accountability',
    description:
      'A polished podcast conversation unpacking how classroom rituals extend into async communities and pods.',
    type: 'podcast',
    startAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000).toISOString(),
    location: 'Studio B — on-demand production',
    facilitator: 'Mira Shah',
    capacity: 'Editorial team (8)',
    resources: 'Outline, guest bios, and podcast checklist stored in the creation studio.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

const DURATION_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return 'TBC';
  return TIME_FORMATTER.format(date);
}

function calculateDurationMinutes(startAt, endAt) {
  const start = toDate(startAt);
  const end = toDate(endAt);
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (60 * 1000)));
}

function normaliseSeededEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return DEFAULT_SEEDED_EVENTS;
  }
  return events.map((event) => ({
    ...event,
    id: event.id ?? `seed-${Math.random().toString(36).slice(2, 8)}`,
    type: event.type ?? 'event',
    startAt: event.startAt ?? event.date ?? new Date().toISOString(),
    endAt:
      event.endAt ??
      (event.startAt ? new Date(new Date(event.startAt).getTime() + 60 * 60 * 1000).toISOString() : new Date().toISOString()),
    createdAt: event.createdAt ?? new Date().toISOString(),
    updatedAt: event.updatedAt ?? new Date().toISOString()
  }));
}

function toICSDate(date) {
  const iso = toDate(date)?.toISOString();
  if (!iso) return '';
  return iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICS(text = '') {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');
}

function computeStatus(event) {
  const now = Date.now();
  const start = toDate(event.startAt)?.getTime() ?? now;
  const end = toDate(event.endAt)?.getTime() ?? start;
  if (end < now) return 'completed';
  if (start <= now && end >= now) return 'live';
  return 'scheduled';
}

function groupEventsByDay(events) {
  const map = new Map();
  events.forEach((event) => {
    const start = toDate(event.startAt) ?? new Date();
    const key = start.toISOString().slice(0, 10);
    const current = map.get(key) ?? [];
    current.push(event);
    map.set(key, current);
  });
  return Array.from(map.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([day, dayEvents]) => ({
      day,
      events: dayEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    }));
}

function computeLeaderboard(events) {
  const scores = new Map();
  events.forEach((event) => {
    if (!event.facilitator) return;
    const current = scores.get(event.facilitator) ?? {
      facilitator: event.facilitator,
      sessions: 0,
      minutes: 0,
      livestreams: 0,
      classrooms: 0,
      score: 0
    };
    current.sessions += 1;
    const duration = calculateDurationMinutes(event.startAt, event.endAt);
    current.minutes += duration;
    if (event.type === 'livestream') {
      current.livestreams += 1;
    }
    if (event.type === 'classroom') {
      current.classrooms += 1;
    }
    current.score = current.sessions * 120 + current.minutes + current.livestreams * 80 + current.classrooms * 60;
    scores.set(event.facilitator, current);
  });
  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}

function buildRunwayInsights(events) {
  const now = Date.now();
  const upcoming = events.filter((event) => toDate(event.startAt)?.getTime() >= now);
  if (!upcoming.length) {
    return [
      {
        title: 'Calendar is ready for a refill',
        description:
          'There are no upcoming activations. Schedule a classroom, live stream, or community podcast to keep momentum high.'
      }
    ];
  }
  const nextEvent = upcoming[0];
  const timeUntil = toDate(nextEvent.startAt).getTime() - now;
  const hoursUntil = Math.round(timeUntil / (1000 * 60 * 60));
  return [
    {
      title: `${EVENT_TYPE_LABELS[nextEvent.type] ?? 'Activation'} launches next`,
      description: `${nextEvent.title} kicks off in about ${hoursUntil} hours. Double-check assets and facilitators.`
    },
    {
      title: 'Promote to the community feed',
      description:
        'Pair the upcoming sessions with a community feed announcement and DM the top leaderboard contributors to maximise attendance.'
    }
  ];
}

export default function DashboardCalendar() {
  const { role, dashboard, refresh } = useOutletContext();
  const seededEvents = useMemo(
    () => normaliseSeededEvents(dashboard?.calendar),
    [dashboard?.calendar]
  );

  const [events, setEvents] = useState(() => {
    const persisted = loadPersistentState(STORAGE_KEY, []);
    if (Array.isArray(persisted) && persisted.length) {
      return persisted;
    }
    return normaliseSeededEvents(seededEvents);
  });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('upcoming');
  const [dialogMode, setDialogMode] = useState('create');
  const [activeEvent, setActiveEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    savePersistentState(STORAGE_KEY, events);
  }, [events]);

  useEffect(() => {
    if (!announcement) return undefined;
    const timeout = window.setTimeout(() => setAnnouncement(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [announcement]);

  const now = Date.now();

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        if (typeFilter !== 'all' && event.type !== typeFilter) {
          return false;
        }
        if (phaseFilter === 'upcoming' && toDate(event.endAt)?.getTime() < now) {
          return false;
        }
        if (phaseFilter === 'past' && toDate(event.startAt)?.getTime() >= now) {
          return false;
        }
        if (!search) {
          return true;
        }
        const haystack = [event.title, event.description, event.facilitator, event.location]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events, typeFilter, phaseFilter, search, now]);

  const groupedEvents = useMemo(() => groupEventsByDay(filteredEvents), [filteredEvents]);
  const leaderboard = useMemo(() => computeLeaderboard(events), [events]);
  const insights = useMemo(() => buildRunwayInsights(filteredEvents), [filteredEvents]);

  const totalDuration = useMemo(
    () => filteredEvents.reduce((sum, event) => sum + calculateDurationMinutes(event.startAt, event.endAt), 0),
    [filteredEvents]
  );

  const summary = useMemo(() => {
    const upcomingCount = events.filter((event) => toDate(event.startAt)?.getTime() >= now).length;
    const liveStreams = events.filter((event) => event.type === 'livestream').length;
    const classrooms = events.filter((event) => event.type === 'classroom').length;
    return { upcomingCount, liveStreams, classrooms };
  }, [events, now]);

  const openCreateDialog = useCallback(() => {
    setDialogMode('create');
    setActiveEvent(null);
    setIsDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((event) => {
    setDialogMode('edit');
    setActiveEvent(event);
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setActiveEvent(null);
  }, []);

  const handleSubmit = useCallback(
    (form) => {
      const timestamp = new Date().toISOString();
      if (dialogMode === 'edit' && form.id) {
        setEvents((prev) =>
          prev.map((event) =>
            event.id === form.id
              ? {
                  ...event,
                  ...form,
                  updatedAt: timestamp,
                  status: computeStatus(form)
                }
              : event
          )
        );
        setAnnouncement('Scheduled item updated successfully.');
      } else {
        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt-${Date.now()}`;
        const payload = {
          ...form,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
          status: computeStatus(form)
        };
        setEvents((prev) => [...prev, payload]);
        setAnnouncement('New calendar item created and saved locally.');
      }
      closeDialog();
    },
    [dialogMode, closeDialog]
  );

  const handleDelete = useCallback((id) => {
    const confirmed = window.confirm('Remove this scheduled item from the calendar?');
    if (!confirmed) return;
    setEvents((prev) => prev.filter((event) => event.id !== id));
    setAnnouncement('Calendar item removed.');
  }, []);

  const handleDuplicate = useCallback((event) => {
    const copy = {
      ...event,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt-${Date.now()}`,
      startAt: toDate(event.startAt)
        ? new Date(toDate(event.startAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : event.startAt,
      endAt: toDate(event.endAt)
        ? new Date(toDate(event.endAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : event.endAt,
      title: `${event.title} (copy)`
    };
    setEvents((prev) => [...prev, copy]);
    setAnnouncement('Duplicated event into next week.');
  }, []);

  const handleClear = useCallback(() => {
    const confirmed = window.confirm('This will clear the locally stored calendar for this device. Continue?');
    if (!confirmed) return;
    setEvents([]);
    deletePersistentState(STORAGE_KEY);
    setAnnouncement('Calendar cleared.');
  }, []);

  const handleExport = useCallback(() => {
    if (!events.length) {
      setAnnouncement('Nothing to export yet. Add an event first.');
      return;
    }
    const nowStamp = toICSDate(new Date());
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Edulure//CommunityCalendar//EN'
    ];
    events.forEach((event) => {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}@edulure`);
      lines.push(`DTSTAMP:${nowStamp}`);
      lines.push(`DTSTART:${toICSDate(event.startAt)}`);
      lines.push(`DTEND:${toICSDate(event.endAt)}`);
      lines.push(`SUMMARY:${escapeICS(event.title)}`);
      lines.push(`DESCRIPTION:${escapeICS(event.description ?? '')}`);
      if (event.location) {
        lines.push(`LOCATION:${escapeICS(event.location)}`);
      }
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');

    const blob = new Blob([lines.join('\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'edulure-community-calendar.ics';
    link.click();
    URL.revokeObjectURL(url);
    setAnnouncement('Calendar export generated.');
  }, [events]);

  const handlePromote = useCallback((event) => {
    setAnnouncement(`Promotion drafted for “${event.title}”. Push to the community feed once finalised.`);
  }, []);

  return (
    <div className="space-y-10">
      <CalendarEventDialog
        isOpen={isDialogOpen}
        mode={dialogMode}
        initialData={activeEvent ?? undefined}
        onSubmit={handleSubmit}
        onClose={closeDialog}
      />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">{role === 'instructor' ? 'Program calendar' : 'Learning calendar'}</h1>
          <p className="dashboard-subtitle">
            Orchestrate live classrooms, community broadcasts, podcasts, and events with crystal-clear ownership.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-pill" onClick={handleExport}>
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" aria-hidden="true" /> Export (.ics)
          </button>
          <button type="button" className="dashboard-pill" onClick={() => refresh?.()}>
            <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden="true" /> Sync data
          </button>
          <button type="button" className="dashboard-primary-pill" onClick={openCreateDialog}>
            <SparklesIcon className="mr-2 h-4 w-4" aria-hidden="true" /> Create event
          </button>
        </div>
      </header>

      {announcement ? (
        <div
          role="status"
          className="rounded-3xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm text-primary"
        >
          {announcement}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" /> Upcoming activations
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.upcomingCount}</p>
          <p className="mt-1 text-sm text-slate-500">Scheduled sessions waiting to launch.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <PlayCircleIcon className="h-4 w-4" aria-hidden="true" /> Live stream cadence
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.liveStreams}</p>
          <p className="mt-1 text-sm text-slate-500">Recurring broadcasts to energise the feed.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <UserGroupIcon className="h-4 w-4" aria-hidden="true" /> Classroom track
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.classrooms}</p>
          <p className="mt-1 text-sm text-slate-500">High-impact classroom or cohort experiences.</p>
        </div>
      </section>

      <section className="dashboard-section space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Operational runway</p>
            <h2 className="text-lg font-semibold text-slate-900">Activation insights</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Format
              <select
                className="dashboard-input"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">All formats</option>
                <option value="classroom">Classroom</option>
                <option value="livestream">Live stream</option>
                <option value="podcast">Podcast</option>
                <option value="event">Community event</option>
              </select>
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Phase
              <select
                className="dashboard-input"
                value={phaseFilter}
                onChange={(event) => setPhaseFilter(event.target.value)}
              >
                <option value="upcoming">Upcoming</option>
                <option value="past">Completed</option>
                <option value="all">All time</option>
              </select>
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Search
              <input
                className="dashboard-input"
                placeholder="Filter by title, host, or channel"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((insight) => (
            <div key={insight.title} className="rounded-3xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
              <p className="mt-2 text-sm text-slate-600">{insight.description}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <ClockIcon className="h-4 w-4" aria-hidden="true" /> Scheduled minutes
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {DURATION_FORMATTER.format(totalDuration)} minutes planned
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Covering every classroom, live stream, podcast, and community event in the selected filters.
          </p>
        </div>
      </section>

      <section className="dashboard-section space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="dashboard-kicker">Execution timeline</p>
            <h2 className="text-lg font-semibold text-slate-900">What the community will experience</h2>
          </div>
          <button type="button" className="dashboard-pill" onClick={handleClear}>
            Clear calendar
          </button>
        </div>

        {groupedEvents.length === 0 ? (
          <DashboardStateMessage
            title="Calendar is clear"
            description="No commitments found for this filter range. Create an event or reset your filters."
            actionLabel="Reset filters"
            onAction={() => {
              setSearch('');
              setTypeFilter('all');
              setPhaseFilter('upcoming');
            }}
          />
        ) : (
          <div className="space-y-6">
            {groupedEvents.map((group) => (
              <div key={group.day} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{group.day}</p>
                    <p className="text-sm text-slate-500">{group.events.length} activation(s)</p>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  {group.events.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-2xl border border-slate-200 p-4 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="dashboard-pill bg-primary/10 text-primary">
                              {EVENT_TYPE_LABELS[event.type] ?? 'Event'}
                            </span>
                            <span className="dashboard-pill capitalize text-slate-500">{computeStatus(event)}</span>
                          </div>
                          <h3 className="mt-3 text-base font-semibold text-slate-900">{event.title}</h3>
                          <p className="mt-2 text-sm text-slate-600">{event.description}</p>
                          <dl className="mt-3 grid gap-3 text-xs text-slate-500 md:grid-cols-2">
                            <div className="flex items-center gap-2">
                              <ClockIcon className="h-4 w-4" aria-hidden="true" />
                              <div>
                                <dt className="font-semibold text-slate-700">Timing</dt>
                                <dd>
                                  {formatDateTime(event.startAt)} → {formatDateTime(event.endAt)}
                                </dd>
                              </div>
                            </div>
                            {event.location ? (
                              <div className="flex items-center gap-2">
                                <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                                <div>
                                  <dt className="font-semibold text-slate-700">Location</dt>
                                  <dd>{event.location}</dd>
                                </div>
                              </div>
                            ) : null}
                            {event.facilitator ? (
                              <div className="flex items-center gap-2">
                                <BoltIcon className="h-4 w-4 text-amber-500" aria-hidden="true" />
                                <div>
                                  <dt className="font-semibold text-slate-700">Facilitator</dt>
                                  <dd>{event.facilitator}</dd>
                                </div>
                              </div>
                            ) : null}
                            {event.capacity ? (
                              <div className="flex items-center gap-2">
                                <UserGroupIcon className="h-4 w-4" aria-hidden="true" />
                                <div>
                                  <dt className="font-semibold text-slate-700">Capacity</dt>
                                  <dd>{event.capacity}</dd>
                                </div>
                              </div>
                            ) : null}
                          </dl>
                          {event.resources ? (
                            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                              <p className="font-semibold text-slate-700">Resources</p>
                              <p className="mt-1 whitespace-pre-line">{event.resources}</p>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-2 text-sm text-slate-500">
                          <button
                            type="button"
                            className="dashboard-pill"
                            onClick={() => openEditDialog(event)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="dashboard-pill"
                            onClick={() => handleDuplicate(event)}
                          >
                            Duplicate +7 days
                          </button>
                          <button
                            type="button"
                            className="dashboard-pill"
                            onClick={() => handlePromote(event)}
                          >
                            Draft feed promo
                          </button>
                          <button
                            type="button"
                            className="dashboard-pill text-rose-600"
                            onClick={() => handleDelete(event.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section space-y-6">
        <div className="flex flex-col gap-2">
          <p className="dashboard-kicker">Leaderboard</p>
          <h2 className="text-lg font-semibold text-slate-900">Facilitator scoreboard (last 30 days)</h2>
          <p className="text-sm text-slate-600">
            Reward the hosts who keep the classroom, community feed, and live streams energised. Scores blend number of
            sessions, minutes hosted, and live broadcast cadence.
          </p>
        </div>
        {leaderboard.length === 0 ? (
          <DashboardStateMessage
            title="No hosts ranked yet"
            description="Add facilitators to your events to populate this leaderboard."
          />
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.facilitator}
                className="flex items-center justify-between rounded-3xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{entry.facilitator}</p>
                    <p className="text-xs text-slate-500">
                      {entry.sessions} sessions · {DURATION_FORMATTER.format(entry.minutes)} minutes · {entry.livestreams} live
                      streams
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-500" aria-hidden="true" /> {entry.score}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section space-y-6">
        <div className="flex flex-col gap-2">
          <p className="dashboard-kicker">Promotion checklist</p>
          <h2 className="text-lg font-semibold text-slate-900">Keep the community loop tight</h2>
          <p className="text-sm text-slate-600">
            Pair each scheduled activation with the right operational follow-up — from community feed promos to podcast repurposing.
          </p>
        </div>
        <ul className="space-y-3">
          {filteredEvents.map((event) => (
            <li key={`task-${event.id}`} className="flex flex-col gap-3 rounded-3xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {EVENT_TYPE_LABELS[event.type] ?? 'Event'} · {formatDateTime(event.startAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="dashboard-pill">
                  <MegaphoneIcon className="mr-2 h-4 w-4 text-primary" aria-hidden="true" /> Announce in community feed
                </span>
                <span className="dashboard-pill">
                  <PlayCircleIcon className="mr-2 h-4 w-4 text-primary" aria-hidden="true" /> Repurpose for podcast clips
                </span>
                <span className="dashboard-pill">
                  <BoltIcon className="mr-2 h-4 w-4 text-primary" aria-hidden="true" /> Update classroom syllabus
                </span>
              </div>
            </li>
          ))}
          {filteredEvents.length === 0 ? (
            <DashboardStateMessage
              title="No promotion tasks"
              description="Once you schedule upcoming sessions they will appear here for follow-up."
            />
          ) : null}
        </ul>
      </section>
    </div>
  );
}
