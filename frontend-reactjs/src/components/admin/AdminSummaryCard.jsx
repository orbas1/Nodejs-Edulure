import PropTypes from 'prop-types';
import clsx from 'clsx';

const toneStyles = {
  neutral: {
    container: 'border-slate-200 bg-white/95',
    label: 'text-slate-500',
    value: 'text-slate-900',
    helper: 'text-slate-500'
  },
  info: {
    container: 'border-sky-200 bg-sky-50/80',
    label: 'text-sky-700',
    value: 'text-slate-900',
    helper: 'text-sky-700/80'
  },
  positive: {
    container: 'border-emerald-200 bg-emerald-50/80',
    label: 'text-emerald-700',
    value: 'text-emerald-900',
    helper: 'text-emerald-700/80'
  },
  warning: {
    container: 'border-amber-200 bg-amber-50/80',
    label: 'text-amber-700',
    value: 'text-amber-900',
    helper: 'text-amber-700/80'
  },
  danger: {
    container: 'border-rose-200 bg-rose-50/80',
    label: 'text-rose-700',
    value: 'text-rose-900',
    helper: 'text-rose-700/80'
  }
};

function TrendBadge({ value, tone }) {
  if (!value) {
    return null;
  }
  const badgeTone = toneStyles[tone] ?? toneStyles.neutral;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        tone === 'neutral' ? 'border-slate-200 text-slate-500' : `border-transparent ${badgeTone.label}`
      )}
    >
      {value}
    </span>
  );
}

TrendBadge.propTypes = {
  value: PropTypes.node,
  tone: PropTypes.oneOf(['neutral', 'info', 'positive', 'warning', 'danger'])
};

TrendBadge.defaultProps = {
  value: null,
  tone: 'neutral'
};

export default function AdminSummaryCard({
  label,
  value,
  helper,
  tone,
  trend,
  footer,
  icon,
  orientation,
  className
}) {
  const resolvedTone = toneStyles[tone] ?? toneStyles.neutral;
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={clsx(
        'flex h-full flex-col justify-between rounded-2xl border p-4 shadow-sm transition-colors',
        resolvedTone.container,
        className
      )}
    >
      <div className={clsx('flex', isHorizontal ? 'items-center justify-between gap-4' : 'flex-col gap-2')}>
        <div className="space-y-1">
          <p className={clsx('text-xs font-semibold uppercase tracking-wide', resolvedTone.label)}>{label}</p>
          <p className={clsx('text-xl font-semibold', resolvedTone.value)}>
            {icon ? <span className="mr-2 inline-flex items-center text-base">{icon}</span> : null}
            {value}
          </p>
        </div>
        {trend ? <TrendBadge value={trend.value} tone={trend.tone ?? tone} /> : null}
      </div>
      {helper ? <p className={clsx('mt-2 text-xs leading-relaxed', resolvedTone.helper)}>{helper}</p> : null}
      {footer ? <div className="mt-3 text-xs text-slate-500">{footer}</div> : null}
    </div>
  );
}

AdminSummaryCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  helper: PropTypes.node,
  tone: PropTypes.oneOf(['neutral', 'info', 'positive', 'warning', 'danger']),
  trend: PropTypes.shape({
    value: PropTypes.node,
    tone: PropTypes.oneOf(['neutral', 'info', 'positive', 'warning', 'danger'])
  }),
  footer: PropTypes.node,
  icon: PropTypes.node,
  orientation: PropTypes.oneOf(['vertical', 'horizontal']),
  className: PropTypes.string
};

AdminSummaryCard.defaultProps = {
  helper: null,
  tone: 'neutral',
  trend: null,
  footer: null,
  icon: null,
  orientation: 'vertical',
  className: undefined
};
