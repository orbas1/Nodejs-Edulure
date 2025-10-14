import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';
import InstructorOverview from './instructor/InstructorOverview.jsx';
import LearnerOverview from './learner/LearnerOverview.jsx';
import CommunityOverview from './community/CommunityOverview.jsx';

export default function DashboardHome() {
  const { role, dashboard, refresh } = useOutletContext();
  const { profile } = useDashboard();

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Dashboard data unavailable"
        description="We don't have any overview data for this Learnspace yet. Refresh once data sources are connected."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  if (!profile) {
    return (
      <DashboardStateMessage
        title="Profile data missing"
        description="We couldn't load your learner profile. Refresh to retry the sync."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  if (role === 'instructor') {
    return <InstructorOverview dashboard={dashboard} profile={profile} onRefresh={refresh} />;
  }

  if (role === 'community') {
    return <CommunityOverview dashboard={dashboard} onRefresh={refresh} />;
  }

  return <LearnerOverview dashboard={dashboard} profile={profile} onRefresh={refresh} />;
}
