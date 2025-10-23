import PropTypes from 'prop-types';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const STATUS_TONES = {
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-slate-200 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-600'
};

const TAG_TONES = {
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-sky-100 text-sky-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-600'
};

function resolveStatusTone(tone) {
  return STATUS_TONES[tone] ?? STATUS_TONES.primary;
}

function resolveTagTone(tone) {
  return TAG_TONES[tone] ?? TAG_TONES.neutral;
}

export default function ScheduleCard({
  title,
  subtitle,
  statusLabel,
  statusTone,
  metrics,
  tagGroups,
  actions,
  children,
  headerAccessory,
  footer
}) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {headerAccessory}
          {statusLabel ? (
            <span
              className={classNames(
                'rounded-full px-3 py-1 text-xs font-semibold',
                resolveStatusTone(statusTone)
              )}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
      </div>

      {metrics?.length ? (
        <dl className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {metric.label}
              </dt>
              <dd className="font-medium text-slate-900">{metric.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {children}

      {tagGroups?.length ? (
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {tagGroups.flatMap((group, groupIndex) =>
            (group.items ?? []).map((item) => (
              <span
                key={`${groupIndex}-${item}`}
                className={classNames('rounded-full px-3 py-1', resolveTagTone(group.tone))}
              >
                {item}
              </span>
            ))
          )}
        </div>
      ) : null}

      {actions?.length ? (
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={classNames(
                'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 transition',
                action.tone === 'danger'
                  ? 'border-rose-200 text-rose-600 hover:border-rose-400 hover:bg-rose-50'
                  : action.tone === 'primary'
                    ? 'border-primary/40 text-primary hover:border-primary hover:bg-primary/10'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              {action.icon ? <action.icon className="h-4 w-4" aria-hidden="true" /> : null}
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {footer ? <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">{footer}</div> : null}
    </article>
  );
}

ScheduleCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  statusLabel: PropTypes.string,
  statusTone: PropTypes.oneOf(['primary', 'neutral', 'success', 'warning', 'danger']),
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  ),
  tagGroups: PropTypes.arrayOf(
    PropTypes.shape({
      tone: PropTypes.oneOf(['primary', 'neutral', 'info', 'success', 'warning', 'danger']),
      items: PropTypes.arrayOf(PropTypes.string)
    })
  ),
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func,
      tone: PropTypes.oneOf(['neutral', 'primary', 'danger']),
      icon: PropTypes.elementType
    })
  ),
  children: PropTypes.node,
  headerAccessory: PropTypes.node,
  footer: PropTypes.node
};

ScheduleCard.defaultProps = {
  subtitle: undefined,
  statusLabel: undefined,
  statusTone: 'primary',
  metrics: [],
  tagGroups: [],
  actions: [],
  children: null,
  headerAccessory: null,
  footer: null
};

