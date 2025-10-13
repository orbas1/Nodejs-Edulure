import PropTypes from 'prop-types';

const pipelineItemPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  stage: PropTypes.string.isRequired,
  startDate: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  learners: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
});

function PipelineCard({ cohort }) {
  return (
    <li className="dashboard-card-muted p-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{cohort.stage}</span>
        <span>Launch {cohort.startDate}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{cohort.name}</p>
      <p className="text-xs text-slate-500">{cohort.learners} learners waiting</p>
    </li>
  );
}

PipelineCard.propTypes = {
  cohort: pipelineItemPropType.isRequired
};

export default function InstructorPipelineSection({ pipeline }) {
  if (pipeline.length === 0) return null;

  return (
    <section className="dashboard-section">
      <p className="dashboard-kicker">Launch radar</p>
      <ul className="mt-4 space-y-4">
        {pipeline.map((cohort) => (
          <PipelineCard key={cohort.id} cohort={cohort} />
        ))}
      </ul>
    </section>
  );
}

InstructorPipelineSection.propTypes = {
  pipeline: PropTypes.arrayOf(pipelineItemPropType)
};

InstructorPipelineSection.defaultProps = {
  pipeline: []
};
