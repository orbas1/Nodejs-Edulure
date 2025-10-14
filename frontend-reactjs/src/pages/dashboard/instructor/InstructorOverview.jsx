import { useMemo } from 'react';
import PropTypes from 'prop-types';

import VerificationStatusCard from '../../../components/dashboard/VerificationStatusCard.jsx';
import InstructorMetricsSection from './sections/InstructorMetricsSection.jsx';
import InstructorPipelineSection from './sections/InstructorPipelineSection.jsx';
import InstructorProductionSection from './sections/InstructorProductionSection.jsx';
import InstructorProfileSection from './sections/InstructorProfileSection.jsx';
import InstructorRevenueSection from './sections/InstructorRevenueSection.jsx';

function normaliseNumber(value) {
  const numeric = Number.parseFloat(value);
  if (Number.isFinite(numeric)) return numeric;
  return 0;
}

function formatChange(current, previous) {
  const delta = current - previous;
  const prefix = delta >= 0 ? '+' : '−';
  return `${prefix}${Math.abs(delta)}`;
}

export default function InstructorOverview({ dashboard, profile, onRefresh }) {
  const metrics = useMemo(() => {
    if (!Array.isArray(dashboard.metrics)) return [];
    return dashboard.metrics.filter((metric) => metric && metric.label && metric.value !== undefined);
  }, [dashboard.metrics]);

  const enrollmentMetrics = useMemo(() => {
    const enrollment = Array.isArray(dashboard.analytics?.enrollment) ? dashboard.analytics.enrollment : [];
    return enrollment.map((metric) => {
      const current = normaliseNumber(metric.current);
      const previous = normaliseNumber(metric.previous);
      const displayValue = metric.current ?? current;
      return {
        label: metric.label ?? 'Metric',
        value: `${displayValue}`,
        change: formatChange(current, previous),
        trend: current >= previous ? 'up' : 'down'
      };
    });
  }, [dashboard.analytics?.enrollment]);

  const revenueSlices = useMemo(() => {
    const raw = Array.isArray(dashboard.analytics?.revenueStreams) ? dashboard.analytics.revenueStreams : [];
    const totals = raw.reduce((sum, slice) => sum + normaliseNumber(slice.value ?? slice.percent), 0);
    return raw
      .filter((slice) => slice?.name)
      .map((slice) => {
        const amount = normaliseNumber(slice.value ?? slice.percent);
        const percent = totals > 0 ? Math.round((amount / totals) * 100) : amount;
        return {
          name: slice.name,
          value: slice.displayValue ?? slice.value ?? slice.percent ?? amount,
          percent: Math.max(0, Math.min(100, percent))
        };
      });
  }, [dashboard.analytics?.revenueStreams]);

  const pipeline = useMemo(() => {
    const raw = Array.isArray(dashboard.courses?.pipeline) ? dashboard.courses.pipeline : [];
    return raw
      .filter((item) => item && (item.id ?? item.name))
      .map((item) => ({
        ...item,
        startDate: item.startDate ?? 'TBD',
        learners: item.learners ?? '0'
      }));
  }, [dashboard.courses?.pipeline]);

  const production = useMemo(() => {
    const raw = Array.isArray(dashboard.courses?.production) ? dashboard.courses.production : [];
    return raw.filter((item) => item && (item.id ?? item.asset));
  }, [dashboard.courses?.production]);

  return (
    <div className="space-y-10">
      <InstructorMetricsSection metrics={metrics} />

      <section className="grid gap-6 xl:grid-cols-5">
        <InstructorProfileSection profile={profile} stats={enrollmentMetrics} />
        <InstructorRevenueSection revenueSlices={revenueSlices} />
      </section>

      <VerificationStatusCard verification={profile?.verification ?? null} onRefresh={onRefresh} />

      <section className="grid gap-6 lg:grid-cols-2">
        <InstructorPipelineSection pipeline={pipeline} />
        <InstructorProductionSection production={production} />
      </section>
    </div>
  );
}

InstructorOverview.propTypes = {
  dashboard: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired,
  onRefresh: PropTypes.func
};

InstructorOverview.defaultProps = {
  onRefresh: null
};
