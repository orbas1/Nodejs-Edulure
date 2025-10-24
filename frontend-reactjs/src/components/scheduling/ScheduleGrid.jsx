import PropTypes from 'prop-types';
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  WifiIcon
} from '@heroicons/react/24/outline';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric'
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto'
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

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRange(start, end, eventTimezone, viewerTimezone) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate && !endDate) {
    return { label: 'Schedule TBC', secondary: null };
  }

  const displayTimezone = viewerTimezone || eventTimezone;
  const timeFormatter = createTimeFormatter(displayTimezone);
  let label = 'Schedule TBC';

  if (!startDate) {
    label = `Until ${dateFormatter.format(endDate)}`;
  } else if (!endDate) {
    label = `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)}`;
  }

  const sameDay =
    startDate && endDate &&
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (startDate && endDate) {
    if (sameDay) {
      label = `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`;
    } else {
      label = `${dateFormatter.format(startDate)} → ${dateFormatter.format(endDate)}`;
    }
  }

  let secondary = null;
  if (eventTimezone && viewerTimezone && eventTimezone !== viewerTimezone && startDate) {
    const eventFormatter = createTimeFormatter(eventTimezone);
    if (!endDate) {
      secondary = `${dateFormatter.format(startDate)} • ${eventFormatter.format(startDate)} (${eventTimezone})`;
    } else if (sameDay) {
      secondary = `${eventFormatter.format(startDate)} – ${eventFormatter.format(endDate)} (${eventTimezone})`;
    } else {
      secondary = `${dateFormatter.format(startDate)} → ${dateFormatter.format(endDate)} (${eventTimezone})`;
    }
  }

  return { label, secondary };
}

function selectRelativeUnit(diffMs) {
  const abs = Math.abs(diffMs);
  if (abs < 3600000) {
    return { unit: 'minute', value: Math.round(diffMs / 60000) };
  }
  if (abs < 86400000) {
    return { unit: 'hour', value: Math.round(diffMs / 3600000) };
  }
  return { unit: 'day', value: Math.round(diffMs / 86400000) };
}

function formatRelativeLabel(start, end) {
  const now = Date.now();
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (startDate && endDate && now >= startDate.getTime() && now <= endDate.getTime()) {
    return 'Live now';
  }
  if (startDate) {
    const diff = startDate.getTime() - now;
    const { unit, value } = selectRelativeUnit(diff);
    if (value === 0) {
      return diff >= 0 ? 'Starting now' : 'Started moments ago';
    }
    const formatted = relativeTimeFormatter.format(value, unit);
    return diff >= 0 ? `Starts ${formatted}` : `Started ${formatted}`;
  }
  if (endDate) {
    const diff = endDate.getTime() - now;
    const { unit, value } = selectRelativeUnit(diff);
    if (value === 0) {
      return diff >= 0 ? 'Ending now' : 'Ended moments ago';
    }
    const formatted = relativeTimeFormatter.format(value, unit);
    return diff >= 0 ? `Ends ${formatted}` : `Ended ${formatted}`;
  }
  return null;
}

function resolveOccupancy(occupancy = {}) {
  const reserved = Number.isFinite(Number(occupancy.reserved)) ? Number(occupancy.reserved) : 0;
  const capacity = Number.isFinite(Number(occupancy.capacity)) ? Number(occupancy.capacity) : 0;
  if (capacity <= 0) {
    return `${reserved} registered`;
  }
  return `${reserved}/${capacity} seats`;
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

export default function ScheduleGrid({
  events,
  onSelect,
  emptyLabel = 'No sessions scheduled',
  showAttendance = true,
  viewerTimezone
}) {
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
        const scheduleInfo = formatRange(event.startAt, event.endAt, event.timezone, viewerTimezone);
        const occupancyLabel = resolveOccupancy(event.occupancy);
        const attendanceLabel = resolveAttendance(event.attendance);
        const status = event.status ? String(event.status).toLowerCase() : 'scheduled';
        const stage = event.stage ?? 'Live classroom';
        const relativeLabel = formatRelativeLabel(event.startAt, event.endAt);
        const Wrapper = onSelect ? 'button' : 'div';
        const wrapperProps = onSelect
          ? {
              type: 'button',
              onClick: () => onSelect(event)
            }
          : {};
        const statusTone =
          status === 'live'
            ? 'bg-emerald-100 text-emerald-700'
            : status === 'completed'
              ? 'bg-slate-100 text-slate-600'
              : status === 'cancelled'
                ? 'bg-rose-100 text-rose-600'
                : 'bg-primary/10 text-primary';
        const ariaLabel = `${event.title ?? 'Scheduled session'} on ${scheduleInfo.label}`;

        return (
          <Wrapper
            key={event.id}
            {...wrapperProps}
            className={`group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition ${
              onSelect
                ? 'hover:border-primary hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                : ''
            }`}
            aria-label={ariaLabel}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{stage}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{event.title ?? 'Scheduled session'}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusTone}`}>
                  {status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CalendarDaysIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{scheduleInfo.label}</span>
              </div>
              {scheduleInfo.secondary ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ClockIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span>{scheduleInfo.secondary}</span>
                </div>
              ) : null}
              {relativeLabel ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ClockIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span>{relativeLabel}</span>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <UserGroupIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="font-semibold text-slate-900">{occupancyLabel}</span>
              </div>
              {showAttendance && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <WifiIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-semibold text-slate-900">{attendanceLabel}</span>
                </div>
              )}
            </div>
          </Wrapper>
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
      })
    })
  ),
  onSelect: PropTypes.func,
  emptyLabel: PropTypes.string,
  showAttendance: PropTypes.bool,
  viewerTimezone: PropTypes.string
};

ScheduleGrid.defaultProps = {
  events: [],
  onSelect: null,
  emptyLabel: 'No sessions scheduled',
  showAttendance: true,
  viewerTimezone: null
};
