import { useMemo } from 'react';
import PropTypes from 'prop-types';

import InstructorMetricsSection from './sections/InstructorMetricsSection.jsx';
import InstructorPipelineSection from './sections/InstructorPipelineSection.jsx';
import InstructorProductionSection from './sections/InstructorProductionSection.jsx';
import InstructorProfileSection from './sections/InstructorProfileSection.jsx';
import InstructorRevenueSection from './sections/InstructorRevenueSection.jsx';

export default function InstructorOverview({ dashboard, profile }) {
  const metrics = dashboard.metrics ?? [];
  const enrollmentMetrics = useMemo(
    () =>
      (dashboard.analytics?.enrollment ?? []).map((metric) => ({
        label: metric.label,
        value: `${metric.current}`,
        change: `${metric.current >= metric.previous ? '+' : '−'}${Math.abs(metric.current - metric.previous)}`,
        trend: metric.current >= metric.previous ? 'up' : 'down'
      })),
    [dashboard.analytics?.enrollment]
  );

  const revenueSlices = dashboard.analytics?.revenueStreams ?? [];
  const pipeline = dashboard.courses?.pipeline ?? [];
  const production = dashboard.courses?.production ?? [];

  return (
    <div className="space-y-10">
      <InstructorMetricsSection metrics={metrics} />

      <section className="grid gap-6 lg:grid-cols-5">
        <InstructorProfileSection profile={profile} stats={enrollmentMetrics} />
        <InstructorRevenueSection revenueSlices={revenueSlices} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <InstructorPipelineSection pipeline={pipeline} />
        <InstructorProductionSection production={production} />
      </section>
    </div>
  );
}

InstructorOverview.propTypes = {
  dashboard: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired
};
