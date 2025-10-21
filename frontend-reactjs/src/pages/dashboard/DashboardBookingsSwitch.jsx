import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import LearnerBookings from './LearnerBookings.jsx';
import InstructorTutorBookings from './InstructorTutorBookings.jsx';

export default function DashboardBookingsSwitch() {
  const { role, refresh } = useOutletContext();

  if (role === 'instructor') {
    return <InstructorTutorBookings />;
  }

  if (role === 'learner') {
    return <LearnerBookings />;
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
