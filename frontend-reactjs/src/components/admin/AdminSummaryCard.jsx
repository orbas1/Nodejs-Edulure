import PropTypes from 'prop-types';

const toneStyles = {
  default: 'border-slate-200 bg-white',
  positive: 'border-emerald-200 bg-emerald-50/60',
  warning: 'border-amber-200 bg-amber-50/70',
  danger: 'border-rose-200 bg-rose-50/70'
};

const toneAccent = {
  default: 'text-slate-500',
  positive: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600'
};

export default function AdminSummaryCard({
  label,
  value,
  helper,
  tone = 'default',
  trendLabel,
  metadata,
  onAction,
  actionLabel
}) {
  const resolvedTone = toneStyles[tone] ?? toneStyles.default;
  const accentTone = toneAccent[tone] ?? toneAccent.default;

  return (
    <div
      className={`rounded-3xl border px-5 py-4 shadow-sm transition ${resolvedTone}`}
      role="group"
      aria-labelledby={`${label.replace(/\s+/g, '-').toLowerCase()}-metric`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            id={`${label.replace(/\s+/g, '-').toLowerCase()}-metric`}
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold text-slate-900" aria-live="polite">
            {value}
          </p>
        </div>
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary hover:text-primary"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {helper ? (
        <p className="mt-2 text-xs text-slate-500" aria-live="polite">
          {helper}
        </p>
      ) : null}
      {trendLabel ? (
        <p className={`mt-3 text-xs font-semibold ${accentTone}`} aria-live="polite">
          {trendLabel}
        </p>
      ) : null}
      {metadata ? (
        <dl className="mt-3 space-y-1 text-xs text-slate-500">
          {metadata.map((entry) => (
            <div key={entry.label} className="flex items-center justify-between gap-2">
              <dt className="truncate" title={entry.label}>
                {entry.label}
              </dt>
              <dd className="font-medium text-slate-700">{entry.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

AdminSummaryCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  helper: PropTypes.node,
  tone: PropTypes.oneOf(['default', 'positive', 'warning', 'danger']),
  trendLabel: PropTypes.node,
  metadata: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.node.isRequired
    })
  ),
  onAction: PropTypes.func,
  actionLabel: PropTypes.string
};

AdminSummaryCard.defaultProps = {
  helper: null,
  tone: 'default',
  trendLabel: null,
  metadata: null,
  onAction: null,
  actionLabel: null
};
