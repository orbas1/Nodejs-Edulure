import PropTypes from 'prop-types';

import MetricCard from '../../../../components/dashboard/MetricCard.jsx';

export default function InstructorMetricsSection({ metrics, title, subtitle, onMetricSelect, emptyLabel }) {
  if (metrics.length === 0) {
    return emptyLabel ? (
      <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">{emptyLabel}</div>
    ) : null;
  }

  const interactive = typeof onMetricSelect === 'function';

  return (
    <section className="space-y-4">
      {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
      {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const key = metric.id ?? metric.label;
          if (!interactive) {
            return <MetricCard key={key} metric={metric} />;
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => onMetricSelect(metric)}
              className="w-full text-left transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <MetricCard metric={metric} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

InstructorMetricsSection.propTypes = {
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      change: PropTypes.string,
      trend: PropTypes.oneOf(['up', 'down'])
    })
  ),
  title: PropTypes.string,
  subtitle: PropTypes.string,
  onMetricSelect: PropTypes.func,
  emptyLabel: PropTypes.string
};

InstructorMetricsSection.defaultProps = {
  metrics: [],
  title: undefined,
  subtitle: undefined,
  onMetricSelect: undefined,
  emptyLabel: 'Metrics will appear once the instructor dashboard syncs performance data.'
};
