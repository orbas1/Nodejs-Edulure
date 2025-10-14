import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import LearnerEbooks from './LearnerEbooks.jsx';
import InstructorEbooks from './InstructorEbooks.jsx';

export default function DashboardEbooksSwitch() {
  const { role, refresh } = useOutletContext();

  if (role === 'instructor') {
    return <InstructorEbooks />;
  }

  if (role === 'learner') {
    return <LearnerEbooks />;
  }

  return (
    <DashboardStateMessage
      title="E-book workspace unavailable"
      description="Only learner and instructor dashboards can access the e-book experiences. Switch to an eligible workspace to continue."
      actionLabel="Refresh dashboards"
      onAction={() => refresh?.()}
    />
  );
}
