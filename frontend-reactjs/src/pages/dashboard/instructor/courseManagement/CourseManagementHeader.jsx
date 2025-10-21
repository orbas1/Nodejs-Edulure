import PropTypes from 'prop-types';

export default function CourseManagementHeader({ onCreateBrief }) {
  const canCreate = typeof onCreateBrief === 'function';
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Course portfolio</h1>
        <p className="mt-2 text-sm text-slate-600">
          Oversee cohort status, production sprints, and staffing needs.
        </p>
      </div>
      <button
        type="button"
        className="dashboard-primary-pill px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onCreateBrief}
        disabled={!canCreate}
      >
        Create launch brief
      </button>
    </div>
  );
}

CourseManagementHeader.propTypes = {
  onCreateBrief: PropTypes.func
};

CourseManagementHeader.defaultProps = {
  onCreateBrief: undefined
};
