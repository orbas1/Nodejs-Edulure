import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import LearnerLiveClasses from './LearnerLiveClasses.jsx';
import InstructorLiveClasses from './InstructorLiveClasses.jsx';

export default function DashboardLiveClassesSwitch() {
  const { role, refresh } = useOutletContext();
  if (role === 'instructor') {
    return <InstructorLiveClasses />;
  }
  if (role === 'learner') {
    return <LearnerLiveClasses />;
  }
  return (
    <DashboardStateMessage
      variant="error"
      title="Live classes unavailable"
      description="Live classes are only available for learner and instructor Learnspaces. Switch roles or refresh your session."
      actionLabel="Refresh"
      onAction={() => refresh?.()}
    />
  );
}
