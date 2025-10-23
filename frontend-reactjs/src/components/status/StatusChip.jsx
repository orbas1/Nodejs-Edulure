import PropTypes from 'prop-types';
import clsx from 'clsx';

const STATUS_TONES = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-100 text-sky-700 ring-sky-200',
  primary: 'bg-primary/10 text-primary-dark ring-primary/30',
  success: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-100 text-amber-700 ring-amber-200',
  danger: 'bg-rose-100 text-rose-700 ring-rose-200',
  muted: 'bg-slate-50 text-slate-500 ring-slate-200'
};

const STATUS_THEME = {
  pending: 'muted',
  scheduled: 'primary',
  dispatched: 'primary',
  accepted: 'primary',
  en_route: 'info',
  on_site: 'success',
  investigating: 'warning',
  awaiting_parts: 'warning',
  paused: 'warning',
  completed: 'success',
  closed: 'neutral',
  cancelled: 'muted',
  incident: 'danger',
  overdue: 'danger'
};

const SIZE_CLASS = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm'
};

function normaliseStatus(value) {
  if (!value) return 'pending';
  return String(value).trim().toLowerCase().replace(/[^a-z_]/g, '_');
}

function humanise(label) {
  if (!label) return 'Status';
  return label
    .toString()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function StatusChip({ status, label, tone, size, className, icon: Icon }) {
  const normalised = normaliseStatus(status);
  const resolvedTone = STATUS_TONES[tone] || STATUS_TONES[STATUS_THEME[normalised] || 'neutral'];
  const resolvedLabel = label || humanise(normalised);
  const sizeClasses = SIZE_CLASS[size] ?? SIZE_CLASS.md;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide ring-1 ring-inset',
        resolvedTone,
        sizeClasses,
        className
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      <span>{resolvedLabel}</span>
    </span>
  );
}

StatusChip.propTypes = {
  status: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.string,
  tone: PropTypes.oneOf(Object.keys(STATUS_TONES)),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  icon: PropTypes.elementType
};

StatusChip.defaultProps = {
  status: 'pending',
  label: null,
  tone: null,
  size: 'md',
  className: null,
  icon: null
};
