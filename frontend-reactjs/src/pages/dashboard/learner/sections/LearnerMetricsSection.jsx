import PropTypes from 'prop-types';
import clsx from 'clsx';

import MetricCard from '../../../../components/dashboard/MetricCard.jsx';

export default function LearnerMetricsSection({ metrics, className }) {
  const safeMetrics = Array.isArray(metrics)
    ? metrics.filter((metric) => metric?.label && metric?.value !== undefined)
    : [];
  if (safeMetrics.length === 0) return null;

  return (
    <section className={clsx('grid gap-5 md:grid-cols-2 xl:grid-cols-4', className)}>
      {safeMetrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
}

LearnerMetricsSection.propTypes = {
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      change: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      trend: PropTypes.oneOf(['up', 'down'])
    })
  ),
  className: PropTypes.string
};

LearnerMetricsSection.defaultProps = {
  metrics: [],
  className: ''
};
