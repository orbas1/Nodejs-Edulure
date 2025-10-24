import PropTypes from 'prop-types';
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  WifiIcon,
  ArrowTopRightOnSquareIcon
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

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRange(start, end, timezone) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate && !endDate) {
    return 'Schedule TBC';
  }

  const timeFormatter = createTimeFormatter(timezone);
  if (!endDate) {
    return `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)}`;
  }

  const sameDay =
    startDate && endDate &&
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

function normaliseResourceList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
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
        const occupancyLabel = resolveOccupancy(event.occupancy);
        const attendanceLabel = resolveAttendance(event.attendance);
        const status = event.status ? String(event.status).toLowerCase() : 'scheduled';
        const stage = event.stage ?? 'Live classroom';
        const facilitator = event.facilitator ?? event.host ?? event.organizer?.name ?? null;
        const joinUrl = event.joinUrl ?? event.ctaUrl ?? null;
        const joinLabel = event.joinLabel ?? event.ctaLabel ?? 'Join session';
        const resources = normaliseResourceList(event.resources);
        const Wrapper = onSelect ? 'button' : 'div';
        const wrapperProps = onSelect
          ? {
              type: 'button',
              onClick: () => onSelect(event)
            }
          : {};

        return (
          <Wrapper
            key={event.id}
            {...wrapperProps}
            className={`group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition ${
              onSelect
                ? 'hover:border-primary hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                : ''
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{stage}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{event.title ?? 'Scheduled session'}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    status === 'live'
                      ? 'bg-emerald-100 text-emerald-700'
                      : status === 'completed'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-primary/10 text-primary'
                  }`}
                >
                  {status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CalendarDaysIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{scheduleLabel}</span>
              </div>
              {event.timezone && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ClockIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span>{event.timezone}</span>
                </div>
              )}
              {facilitator ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <UserGroupIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span>{facilitator}</span>
                </div>
              ) : null}
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
              {resources.length ? (
                <div className="flex flex-wrap gap-2">
                  {resources.slice(0, 3).map((resource) => (
                    <span key={resource} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                      {resource}
                    </span>
                  ))}
                  {resources.length > 3 ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                      +{resources.length - 3} more
                    </span>
                  ) : null}
                </div>
              ) : null}
              {joinUrl ? (
                <a
                  href={joinUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-[11px] font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  {joinLabel}
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : null}
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
      }),
      joinUrl: PropTypes.string,
      joinLabel: PropTypes.string,
      resources: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
      facilitator: PropTypes.string,
      host: PropTypes.string,
      organizer: PropTypes.shape({
        name: PropTypes.string
      })
    })
  ),
  onSelect: PropTypes.func,
  emptyLabel: PropTypes.string,
  showAttendance: PropTypes.bool
};
