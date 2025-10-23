import PropTypes from 'prop-types';
import clsx from 'clsx';

import MetricCard from '../../../../components/dashboard/MetricCard.jsx';
import SkeletonPanel from '../../../../components/loaders/SkeletonPanel.jsx';

export default function LearnerMetricsSection({ metrics, loading, className }) {
  const safeMetrics = Array.isArray(metrics)
    ? metrics.filter((metric) => metric?.label && metric?.value !== undefined)
    : [];

  if (loading) {
    const placeholderCount = safeMetrics.length > 0 ? safeMetrics.length : 4;
    return (
      <section className={clsx('grid gap-5 md:grid-cols-2 xl:grid-cols-4', className)}>
        {Array.from({ length: placeholderCount }).map((_, index) => (
          <SkeletonPanel key={`metric-skeleton-${index}`} isLoading hasHeading lines={4} />
        ))}
      </section>
    );
  }

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
  loading: PropTypes.bool,
  className: PropTypes.string
};

LearnerMetricsSection.defaultProps = {
  metrics: [],
  loading: false,
  className: ''
};
