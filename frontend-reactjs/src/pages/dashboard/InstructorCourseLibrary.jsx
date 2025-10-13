import PropTypes from 'prop-types';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import CourseLibraryHeader from './instructor/courseLibrary/CourseLibraryHeader.jsx';
import CourseLibraryTable from './instructor/courseLibrary/CourseLibraryTable.jsx';

export default function InstructorCourseLibrary({ onUploadAsset }) {
  const { dashboard, refresh } = useOutletContext();
  const library = dashboard?.courses?.library ?? [];

  if (library.length === 0) {
    return (
      <DashboardStateMessage
        title="No recorded assets"
        description="Upload or migrate recorded sessions to build your evergreen course library."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <CourseLibraryHeader onUpload={onUploadAsset} />
      <CourseLibraryTable assets={library} />
    </div>
  );
}

InstructorCourseLibrary.propTypes = {
  onUploadAsset: PropTypes.func
};

InstructorCourseLibrary.defaultProps = {
  onUploadAsset: undefined
};
