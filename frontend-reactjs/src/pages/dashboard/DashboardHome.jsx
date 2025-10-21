import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';
import InstructorOverview from './instructor/InstructorOverview.jsx';
import LearnerOverview from './learner/LearnerOverview.jsx';
import CommunityOverview from './community/CommunityOverview.jsx';
import AdminExecutiveOverview from './admin/AdminExecutiveOverview.jsx';

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

  if (role === 'admin') {
    return <AdminExecutiveOverview />;
  }

  if (role === 'instructor') {
    return <InstructorOverview dashboard={dashboard} profile={profile} onRefresh={refresh} />;
  }

  if (role === 'community') {
    return <CommunityOverview dashboard={dashboard} onRefresh={refresh} />;
  }

  if (role === 'learner') {
    return <LearnerOverview dashboard={dashboard} profile={profile} onRefresh={refresh} />;
  }

  return (
    <DashboardStateMessage
      title="Role not supported"
      description="This overview is tailored for learner, instructor, community, or admin Learnspaces. Switch roles or refresh to continue."
      actionLabel="Refresh dashboards"
      onAction={() => refresh?.()}
    />
  );
}
