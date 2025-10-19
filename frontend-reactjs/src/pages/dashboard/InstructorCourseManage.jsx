import PropTypes from 'prop-types';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import CourseManagementHeader from './instructor/courseManagement/CourseManagementHeader.jsx';
import CoursePipelineSection from './instructor/courseManagement/CoursePipelineSection.jsx';
import CourseProductionSection from './instructor/courseManagement/CourseProductionSection.jsx';
import CohortAnalyticsSection from './instructor/courseManagement/CohortAnalyticsSection.jsx';
import CourseCatalogueSection from './instructor/courseManagement/CourseCatalogueSection.jsx';
import AssignmentPipelineSection from './instructor/courseManagement/AssignmentPipelineSection.jsx';
import AuthoringWorkspaceSection from './instructor/courseManagement/AuthoringWorkspaceSection.jsx';
import LearnerManagementSection from './instructor/courseManagement/LearnerManagementSection.jsx';

export default function InstructorCourseManage({ onCreateBrief }) {
  const { dashboard, refresh } = useOutletContext();
  const workspace = dashboard?.courses ?? {};

  const pipeline = workspace.pipeline ?? [];
  const production = workspace.production ?? [];
  const catalogue = workspace.catalogue ?? [];
  const analytics = workspace.analytics ?? null;
  const assignments = workspace.assignments ?? null;
  const authoring = workspace.authoring ?? null;
  const learners = workspace.learners ?? null;

  const hasData = [
    pipeline.length,
    production.length,
    catalogue.length,
    analytics?.cohortHealth?.length ?? 0,
    assignments?.summary?.total ?? 0,
    assignments?.queues?.upcoming?.length ?? 0,
    authoring?.drafts?.length ?? 0,
    authoring?.activeSessions?.length ?? 0,
    learners?.roster?.length ?? 0,
    learners?.riskAlerts?.length ?? 0
  ].some((value) => Number(value) > 0);

  if (!hasData) {
    return (
      <DashboardStateMessage
        title="Course operations pending"
        description="No cohorts or production tasks are currently tracked. Refresh once you've synced course data."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <CourseManagementHeader onCreateBrief={onCreateBrief} />
      <CoursePipelineSection pipeline={pipeline} />
      <CourseProductionSection production={production} />
      <AssignmentPipelineSection assignments={assignments} />
      <CourseCatalogueSection catalogue={catalogue} />
      <CohortAnalyticsSection analytics={analytics} />
      <AuthoringWorkspaceSection authoring={authoring} />
      <LearnerManagementSection learners={learners} />
    </div>
  );
}

InstructorCourseManage.propTypes = {
  onCreateBrief: PropTypes.func
};

InstructorCourseManage.defaultProps = {
  onCreateBrief: undefined
};
