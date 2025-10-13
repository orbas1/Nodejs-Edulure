import PropTypes from 'prop-types';

export default function CoursePipelineSection({ pipeline }) {
  if (!pipeline.length) {
    return null;
  }

  return (
    <section className="dashboard-section">
      <h2 className="text-lg font-semibold text-slate-900">Cohort pipeline</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {pipeline.map((cohort) => (
          <div key={cohort.id} className="dashboard-card-muted p-5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{cohort.stage}</span>
              <span>Launch {cohort.startDate}</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{cohort.name}</h3>
            <p className="text-sm text-slate-600">{cohort.learners} learners in pipeline</p>
            <div className="mt-4 flex gap-3 text-xs text-slate-600">
              <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                Review funnel
              </button>
              <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                Assign tutors
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

CoursePipelineSection.propTypes = {
  pipeline: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      stage: PropTypes.string,
      startDate: PropTypes.string,
      name: PropTypes.string,
      learners: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  )
};

CoursePipelineSection.defaultProps = {
  pipeline: []
};
