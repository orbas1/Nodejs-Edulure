import { useOutletContext } from 'react-router-dom';

import LearnerLiveClasses from './LearnerLiveClasses.jsx';
import InstructorLiveClasses from './InstructorLiveClasses.jsx';

export default function DashboardLiveClassesSwitch() {
  const { role } = useOutletContext();
  if (role === 'instructor') {
    return <InstructorLiveClasses />;
  }
  return <LearnerLiveClasses />;
}
