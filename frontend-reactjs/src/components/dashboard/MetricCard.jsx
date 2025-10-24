import PropTypes from 'prop-types';
import clsx from 'clsx';

const toneClass = {
  info: 'bg-sky-100 text-sky-700',
  notice: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  alert: 'bg-amber-100 text-amber-700',
  critical: 'bg-rose-100 text-rose-700'
};

function normaliseStatus(status) {
  if (!status) {
    return null;
  }
  if (typeof status === 'string') {
    return { label: status, tone: 'info' };
  }
  return {
    label: status.label ?? null,
    tone: status.tone ?? 'info'
  };
}

export default function MetricCard({ metric, streaming }) {
  const status = normaliseStatus(metric.status);
  const assistiveText = metric.assistiveText ?? null;

  return (
    <div
      className={clsx(
        'dashboard-section relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-lg',
        streaming && 'dashboard-skeleton-streaming'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-kicker">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
        </div>
        {status?.label ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              toneClass[status.tone] ?? toneClass.info
            }`}
          >
            {status.label}
          </span>
        ) : null}
      </div>
      {metric.change ? (
        <p
          className={`mt-1 text-sm font-medium ${
            metric.trend === 'down' ? 'text-rose-500' : metric.trend === 'flat' ? 'text-slate-500' : 'text-emerald-500'
          }`}
        >
          {metric.change}
        </p>
      ) : null}
      {metric.caption ? <p className="mt-2 text-sm text-slate-600">{metric.caption}</p> : null}
      {assistiveText ? <p className="mt-3 text-xs text-slate-400">{assistiveText}</p> : null}
    </div>
  );
}

MetricCard.propTypes = {
  metric: PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    change: PropTypes.string,
    trend: PropTypes.oneOf(['up', 'down', 'flat']),
    caption: PropTypes.node,
    status: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        label: PropTypes.node,
        tone: PropTypes.oneOf(['info', 'notice', 'success', 'alert', 'critical'])
      })
    ]),
    assistiveText: PropTypes.node
  }).isRequired,
  streaming: PropTypes.bool
};

MetricCard.defaultProps = {
  streaming: false
};
