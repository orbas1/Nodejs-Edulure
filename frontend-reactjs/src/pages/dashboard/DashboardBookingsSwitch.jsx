import { useEffect } from 'react';

import DashboardSwitcherHeader from '../../components/dashboard/DashboardSwitcherHeader.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import useDashboardSurface from '../../hooks/useDashboardSurface.js';
import LearnerBookings from './LearnerBookings.jsx';
import InstructorTutorBookings from './InstructorTutorBookings.jsx';

export default function DashboardBookingsSwitch() {
  const { role, surface, trackView, refresh } = useDashboardSurface('bookings', {
    origin: 'dashboard-bookings-switch'
  });

  useEffect(() => {
    trackView();
  }, [trackView]);

  if (role === 'instructor') {
    return (
      <div className="space-y-6">
        <DashboardSwitcherHeader surface={surface} onRefresh={refresh} />
        <InstructorTutorBookings />
      </div>
    );
  }

  if (role === 'learner') {
    return (
      <div className="space-y-6">
        <DashboardSwitcherHeader surface={surface} onRefresh={refresh} />
        <LearnerBookings />
      </div>
    );
  }

  return (
    <DashboardStateMessage
      title="Bookings workspace unavailable"
      description="Learner and instructor dashboards can manage bookings. Switch to an eligible Learnspace to continue."
      actionLabel="Refresh dashboards"
      onAction={() => refresh?.()}
    />
  );
}
