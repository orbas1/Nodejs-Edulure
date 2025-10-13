import PropTypes from 'prop-types';

export default function CourseLibraryHeader({ onUpload }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Recorded content library</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage evergreen assets, refresh cadences, and distribution channels.
        </p>
      </div>
      <button type="button" className="dashboard-primary-pill" onClick={onUpload}>
        Upload new asset
      </button>
    </div>
  );
}

CourseLibraryHeader.propTypes = {
  onUpload: PropTypes.func
};

CourseLibraryHeader.defaultProps = {
  onUpload: undefined
};
