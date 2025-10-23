import PropTypes from 'prop-types';
import clsx from 'clsx';

import StatusChip from '../status/StatusChip.jsx';

function formatRange(start, end, timezone) {
  try {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    const formatter = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
      timeZone: timezone || undefined
    });
    const startLabel = formatter.format(startDate);
    if (!endDate || Number.isNaN(endDate.getTime())) {
      return startLabel;
    }
    const endFormatter = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || undefined
    });
    return `${startLabel} – ${endFormatter.format(endDate)}`;
  } catch (error) {
    return start;
  }
}

function statusForSlot(slot) {
  const normalised = (slot.status || '').toLowerCase();
  if (normalised) {
    return normalised;
  }
  if (slot.capacity === 0) {
    return 'full';
  }
  if (slot.capacity !== undefined && slot.capacity <= 1) {
    return 'filling';
  }
  return 'available';
}

const STATUS_LABEL = {
  available: 'Available',
  filling: 'Filling fast',
  full: 'Full',
  busy: 'Busy',
  standby: 'Standby'
};

const STATUS_TONE = {
  available: 'success',
  filling: 'warning',
  full: 'danger',
  busy: 'warning',
  standby: 'primary'
};

export default function ScheduleGrid({
  slots,
  value,
  onSelect,
  onClear,
  title,
  hint,
  emptyLabel
}) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-600">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
        {value && onClear ? (
          <button type="button" className="dashboard-pill px-3 py-1" onClick={onClear}>
            Clear selection
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {slots.map((slot) => {
          const status = statusForSlot(slot);
          const selected = value === slot.start;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelect?.(slot)}
              className={clsx(
                'flex w-full flex-col items-start gap-3 rounded-2xl border px-4 py-3 text-left transition',
                selected
                  ? 'border-primary bg-primary/10 text-primary-dark shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5'
              )}
            >
              <div className="flex w-full items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {slot.provider?.name ?? slot.title ?? 'Technician window'}
                  </p>
                  <p className="text-xs text-slate-500">{formatRange(slot.start, slot.end, slot.timezone)}</p>
                </div>
                <StatusChip
                  status={status}
                  label={STATUS_LABEL[status] ?? status}
                  tone={STATUS_TONE[status]}
                  size="sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {slot.capacity !== undefined ? (
                  <span>
                    Capacity {slot.capacity}
                    {slot.capacity === 1 ? ' slot' : ' slots'} left
                  </span>
                ) : null}
                {slot.location ? <span>{slot.location}</span> : null}
                {slot.notes ? <span>{slot.notes}</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

ScheduleGrid.propTypes = {
  slots: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      start: PropTypes.string.isRequired,
      end: PropTypes.string,
      status: PropTypes.string,
      provider: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string
      }),
      capacity: PropTypes.number,
      location: PropTypes.string,
      notes: PropTypes.string,
      title: PropTypes.string,
      timezone: PropTypes.string
    })
  ),
  value: PropTypes.string,
  onSelect: PropTypes.func,
  onClear: PropTypes.func,
  title: PropTypes.string,
  hint: PropTypes.string,
  emptyLabel: PropTypes.string
};

ScheduleGrid.defaultProps = {
  slots: [],
  value: null,
  onSelect: null,
  onClear: null,
  title: 'Select a schedule window',
  hint: null,
  emptyLabel: 'No scheduling windows available. Add providers or sync calendars to populate availability.'
};
