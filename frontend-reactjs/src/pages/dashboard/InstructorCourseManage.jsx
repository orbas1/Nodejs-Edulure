import PropTypes from 'prop-types';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import CourseManagementHeader from './instructor/courseManagement/CourseManagementHeader.jsx';
import CoursePipelineSection from './instructor/courseManagement/CoursePipelineSection.jsx';
import CourseProductionSection from './instructor/courseManagement/CourseProductionSection.jsx';

export default function InstructorCourseManage({ onCreateBrief }) {
  const { dashboard, refresh } = useOutletContext();
  const pipeline = dashboard?.courses?.pipeline ?? [];
  const production = dashboard?.courses?.production ?? [];

  if (pipeline.length === 0 && production.length === 0) {
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
    </div>
  );
}

InstructorCourseManage.propTypes = {
  onCreateBrief: PropTypes.func
};

InstructorCourseManage.defaultProps = {
  onCreateBrief: undefined
};
