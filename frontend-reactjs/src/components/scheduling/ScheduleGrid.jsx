import PropTypes from 'prop-types';
import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  WifiIcon
} from '@heroicons/react/24/outline';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric'
});

function createTimeFormatter(timezone) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || undefined
    });
  } catch (_error) {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRange(start, end, timezone) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate && !endDate) {
    return 'Schedule TBC';
  }

  const timeFormatter = createTimeFormatter(timezone);
  if (!endDate) {
    return `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)}`;
  }

  const sameDay =
    startDate &&
    endDate &&
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (sameDay) {
    return `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`;
  }

  return `${dateFormatter.format(startDate)} → ${dateFormatter.format(endDate)}`;
}

function resolveOccupancy(occupancy = {}) {
  const reserved = Number.isFinite(Number(occupancy.reserved)) ? Number(occupancy.reserved) : 0;
  const capacity = Number.isFinite(Number(occupancy.capacity)) ? Number(occupancy.capacity) : 0;
  const label = capacity <= 0 ? `${reserved} registered` : `${reserved}/${capacity} seats`;
  const progress = capacity > 0 && reserved >= 0 ? Math.min(1, reserved / capacity) : null;
  return { label, progress };
}

function resolveAttendance(attendance = {}) {
  const total = Number.isFinite(Number(attendance.total)) ? Number(attendance.total) : 0;
  const label = attendance.lastRecordedLabel ?? null;
  if (!total && !label) {
    return 'Awaiting first checkpoint';
  }
  if (!label) {
    return `${total} checkpoint${total === 1 ? '' : 's'}`;
  }
  return `${total} checkpoint${total === 1 ? '' : 's'} • ${label}`;
}

function formatRelative(startAt) {
  const start = parseDate(startAt);
  if (!start) return null;
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (Number.isNaN(diffMinutes)) return null;
  if (diffMinutes > 0) {
    if (diffMinutes < 60) return `Starts in ${diffMinutes} min`;
    const diffHours = diffMinutes / 60;
    if (diffHours < 24) return `Starts in ${diffHours.toFixed(1)} hr`;
    const diffDays = diffHours / 24;
    return `Starts in ${diffDays.toFixed(1)} days`;
  }
  if (diffMinutes === 0) return 'Starting now';
  const diffHours = Math.abs(diffMinutes) / 60;
  if (diffHours < 24) return `Started ${diffHours.toFixed(1)} hr ago`;
  const diffDays = diffHours / 24;
  return `Started ${diffDays.toFixed(1)} days ago`;
}

function formatDuration(start, end) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return null;
  const diffMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  if (diffMinutes <= 0) return null;
  if (diffMinutes < 60) return `${diffMinutes} min session`;
  const hours = diffMinutes / 60;
  if (Number.isInteger(hours)) return `${hours} hour session`;
  return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m session`;
}

function formatTimezone(timezone) {
  if (!timezone) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    }).formatToParts(new Date());
    const name = parts.find((part) => part.type === 'timeZoneName');
    return name ? `${timezone} (${name.value})` : timezone;
  } catch (_error) {
    return timezone;
  }
}

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export default function ScheduleGrid({ events, onSelect, emptyLabel = 'No sessions scheduled', showAttendance = true }) {
  if (!Array.isArray(events) || events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => {
        const scheduleLabel = formatRange(event.startAt, event.endAt, event.timezone);
        const occupancy = resolveOccupancy(event.occupancy);
        const attendanceLabel = resolveAttendance(event.attendance);
        const status = event.status ? String(event.status).toLowerCase() : 'scheduled';
        const stage = event.stage ?? 'Live classroom';
        const durationLabel = formatDuration(event.startAt, event.endAt);
        const relativeLabel = formatRelative(event.startAt);
        const timezoneLabel = formatTimezone(event.timezone);
        const tags = Array.isArray(event.tags) ? event.tags.slice(0, 4) : [];
        const primaryAction = event.primaryAction ??
          (event.ctaLabel || event.ctaHref
            ? { label: event.ctaLabel ?? 'View details', href: event.ctaHref ?? event.href ?? '#' }
            : null);
        const secondaryAction = event.secondaryAction ?? null;

        const handleActivate = () => {
          if (onSelect) {
            onSelect(event);
          }
        };

        const handleKeyDown = (keyboardEvent) => {
          if (!onSelect) return;
          if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
            keyboardEvent.preventDefault();
            onSelect(event);
          }
        };

        const hasActions = Boolean((primaryAction || secondaryAction) && !onSelect);

        return (
          <article
            key={event.id}
            className={classNames(
              'group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition',
              onSelect &&
                'cursor-pointer hover:border-primary hover:shadow-md focus-within:border-primary/70 focus-within:shadow-md'
            )}
            onClick={handleActivate}
            onKeyDown={handleKeyDown}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={event.title ? `View schedule for ${event.title}` : undefined}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{stage}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{event.title ?? 'Scheduled session'}</p>
                </div>
                <span
                  className={classNames(
                    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                    status === 'live'
                      ? 'bg-emerald-100 text-emerald-700'
                      : status === 'completed'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-primary/10 text-primary'
                  )}
                >
                  {status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CalendarDaysIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{scheduleLabel}</span>
              </div>
              {timezoneLabel ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ClockIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span>{timezoneLabel}</span>
                </div>
              ) : null}
              {event.location ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPinIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span className="line-clamp-1">{event.location}</span>
                </div>
              ) : null}
              {(durationLabel || relativeLabel) && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {durationLabel ? <span>{durationLabel}</span> : null}
                  {relativeLabel ? (
                    <span className="rounded-full bg-primary/5 px-2 py-0.5 text-primary">{relativeLabel}</span>
                  ) : null}
                </div>
              )}
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <UserGroupIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="font-semibold text-slate-900">{occupancy.label}</span>
              </div>
              {occupancy.progress != null ? (
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/70 transition-all"
                    style={{ width: `${Math.max(6, Math.round(occupancy.progress * 100))}%` }}
                    aria-hidden="true"
                  />
                </div>
              ) : null}
              {showAttendance && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <WifiIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-semibold text-slate-900">{attendanceLabel}</span>
                </div>
              )}
            </div>
            {tags.length ? (
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
            {hasActions ? (
              <div className="mt-auto flex flex-wrap gap-3 pt-4">
                {primaryAction ? (
                  <a
                    href={primaryAction.href ?? '#'}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card transition hover:bg-primary-dark"
                  >
                    {primaryAction.label ?? 'View details'}
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                ) : null}
                {secondaryAction ? (
                  <a
                    href={secondaryAction.href ?? '#'}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                  >
                    {secondaryAction.label}
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

ScheduleGrid.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      stage: PropTypes.string,
      status: PropTypes.string,
      startAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      endAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      timezone: PropTypes.string,
      occupancy: PropTypes.shape({
        reserved: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        capacity: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      }),
      attendance: PropTypes.shape({
        total: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        lastRecordedLabel: PropTypes.string
      }),
      location: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      ctaLabel: PropTypes.string,
      ctaHref: PropTypes.string,
      href: PropTypes.string,
      primaryAction: PropTypes.shape({
        label: PropTypes.string,
        href: PropTypes.string
      }),
      secondaryAction: PropTypes.shape({
        label: PropTypes.string,
        href: PropTypes.string
      })
    })
  ),
  onSelect: PropTypes.func,
  emptyLabel: PropTypes.string,
  showAttendance: PropTypes.bool
};

ScheduleGrid.defaultProps = {
  events: [],
  onSelect: undefined,
  emptyLabel: 'No sessions scheduled',
  showAttendance: true
};
