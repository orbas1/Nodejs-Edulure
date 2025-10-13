import PropTypes from 'prop-types';

export default function CourseCreationHeader({ onGenerateOutline, onImportFromNotion, onSyncFromLms }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="dashboard-title">Course creation hub</h1>
        <p className="dashboard-subtitle">
          Structure each cohort with production-ready blueprints, module pacing, and readiness insights.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="dashboard-primary-pill" onClick={onGenerateOutline}>
          Generate outline
        </button>
        <button type="button" className="dashboard-pill" onClick={onImportFromNotion}>
          Import from Notion
        </button>
        <button type="button" className="dashboard-pill" onClick={onSyncFromLms}>
          Sync from LMS
        </button>
      </div>
    </div>
  );
}

CourseCreationHeader.propTypes = {
  onGenerateOutline: PropTypes.func,
  onImportFromNotion: PropTypes.func,
  onSyncFromLms: PropTypes.func
};

CourseCreationHeader.defaultProps = {
  onGenerateOutline: undefined,
  onImportFromNotion: undefined,
  onSyncFromLms: undefined
};
