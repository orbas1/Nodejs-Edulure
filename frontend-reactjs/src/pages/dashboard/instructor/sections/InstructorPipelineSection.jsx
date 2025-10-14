import PropTypes from 'prop-types';
import { CalendarDaysIcon, UsersIcon } from '@heroicons/react/24/outline';

const pipelineItemPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  stage: PropTypes.string.isRequired,
  startDate: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  learners: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
});

function PipelineCard({ cohort }) {
  return (
    <li className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm ring-1 ring-inset ring-slate-100">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{cohort.stage}</span>
        <span className="inline-flex items-center gap-1 text-slate-500">
          <CalendarDaysIcon className="h-4 w-4" />
          Launch {cohort.startDate}
        </span>
      </div>
      <p className="mt-3 text-base font-semibold text-slate-900">{cohort.name}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
        <UsersIcon className="h-4 w-4" />
        {cohort.learners} learners waiting
      </p>
    </li>
  );
}

PipelineCard.propTypes = {
  cohort: pipelineItemPropType.isRequired
};

export default function InstructorPipelineSection({ pipeline }) {
  return (
    <section className="dashboard-section flex h-full flex-col">
      <div>
        <p className="dashboard-kicker">Launch radar</p>
        <p className="mt-2 text-sm text-slate-600">Align your production squads around cohorts approaching public launch.</p>
      </div>

      {pipeline.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {pipeline.map((cohort) => (
            <PipelineCard key={cohort.id ?? cohort.name} cohort={cohort} />
          ))}
        </ul>
      ) : (
        <div className="mt-6 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
          Publish an upcoming cohort to populate the launch radar and automate comms with learners on the waitlist.
        </div>
      )}
    </section>
  );
}

InstructorPipelineSection.propTypes = {
  pipeline: PropTypes.arrayOf(pipelineItemPropType)
};

InstructorPipelineSection.defaultProps = {
  pipeline: []
};
