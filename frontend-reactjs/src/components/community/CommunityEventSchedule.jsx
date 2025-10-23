import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CalendarDaysIcon, MapPinIcon, UsersIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

const FALLBACK_EVENTS = [
  {
    id: 'event-fallback-1',
    title: 'Operator summit',
    type: 'Flagship',
    startsAt: '2024-06-01T17:00:00.000Z',
    endsAt: '2024-06-01T22:00:00.000Z',
    description: 'Hybrid broadcast with breakout pods, live Q&A, and sponsor lounges.',
    registrationUrl: 'https://events.edulure.com/operator-summit',
    location: 'Hybrid · Edulure HQ + virtual',
    speakers: ['Amina Rowe', 'Mira Shah'],
    seatLimit: 500
  },
  {
    id: 'event-fallback-2',
    title: 'Async build weekend',
    type: 'Sprint',
    startsAt: '2024-05-25T12:00:00.000Z',
    endsAt: '2024-05-26T18:00:00.000Z',
    description: '72-hour async build with moderated voice rooms and sponsorship showcases.',
    registrationUrl: 'https://events.edulure.com/async-build-weekend',
    location: 'Virtual studio',
    speakers: ['Leo Okafor'],
    seatLimit: 300
  }
];

const EVENT_BADGE_MAP = {
  Flagship: 'bg-primary/10 text-primary border-primary/30',
  Sprint: 'bg-amber-50 text-amber-600 border-amber-200',
  Partner: 'bg-emerald-50 text-emerald-600 border-emerald-200'
};

function normaliseEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return FALLBACK_EVENTS;
  }

  return events
    .map((event, index) => ({
      id: event.id ?? event.slug ?? `event-${index}`,
      title: event.title ?? 'Community event',
      type: event.type ?? event.category ?? 'Program',
      startsAt: event.startsAt ?? event.startDate ?? event.start_time ?? '',
      endsAt: event.endsAt ?? event.endDate ?? event.end_time ?? '',
      description: event.description ?? '',
      registrationUrl: event.registrationUrl ?? event.url ?? '',
      location: event.location ?? '',
      speakers: Array.isArray(event.speakers)
        ? event.speakers
        : typeof event.speakers === 'string'
          ? event.speakers
              .split(',')
              .map((speaker) => speaker.trim())
              .filter(Boolean)
          : [],
      seatLimit: event.seatLimit ?? event.capacity ?? null,
      streamUrl: event.streamUrl ?? event.livestreamUrl ?? ''
    }))
    .filter((event) => event.id && event.title);
}

function formatEventTime(start, end) {
  if (!start) return 'Schedule TBC';
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return 'Schedule TBC';

  if (!end) {
    return startDate.toLocaleString();
  }

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) {
    return startDate.toLocaleString();
  }

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    const startTime = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const endTime = endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${dateFormatter.format(startDate)} – ${endTime}`;
  }

  return `${dateFormatter.format(startDate)} → ${dateFormatter.format(endDate)}`;
}

export default function CommunityEventSchedule({ events, onRegister, isLoading = false }) {
  const normalisedEvents = useMemo(() => normaliseEvents(events), [events]);

  return (
    <section className="space-y-5 rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-xl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Events & broadcasts</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Join live, async, and partner activations</h2>
          <p className="mt-2 text-sm text-slate-600">
            The schedule mirrors live classroom styling so learners know what is live, on-demand, and sponsored. Timezones adjust
            automatically based on browser preferences.
          </p>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading events…</p>
      ) : normalisedEvents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
          No upcoming events yet. Check back soon for activations.
        </div>
      ) : (
        <div className="space-y-4">
          {normalisedEvents.map((event) => {
            const badgeClass = EVENT_BADGE_MAP[event.type] ?? 'bg-slate-100 text-slate-600 border-slate-200';
            return (
              <article
                key={event.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-primary/5 to-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-0.5 ${badgeClass}`}>
                        <CalendarDaysIcon className="h-3.5 w-3.5" /> {event.type}
                      </span>
                      {event.seatLimit ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-0.5 text-slate-600">
                          <UsersIcon className="h-3.5 w-3.5" /> {event.seatLimit.toLocaleString()} seats
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                    <p className="text-xs text-slate-500">{formatEventTime(event.startsAt, event.endsAt)}</p>
                    {event.location ? (
                      <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                        <MapPinIcon className="h-4 w-4" /> {event.location}
                      </p>
                    ) : null}
                    {event.description ? <p className="text-sm text-slate-600">{event.description}</p> : null}
                    {event.speakers?.length ? (
                      <p className="text-xs text-slate-500">
                        Featuring {event.speakers.slice(0, 3).join(', ')}
                        {event.speakers.length > 3 ? ' +' : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {event.streamUrl ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                        <VideoCameraIcon className="h-4 w-4" /> Livestream ready
                      </span>
                    ) : null}
                    {event.registrationUrl ? (
                      <a
                        href={event.registrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card transition hover:bg-primary-dark"
                        onClick={() => onRegister?.(event)}
                      >
                        Save my seat
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

CommunityEventSchedule.propTypes = {
  events: PropTypes.arrayOf(PropTypes.object),
  onRegister: PropTypes.func,
  isLoading: PropTypes.bool
};

