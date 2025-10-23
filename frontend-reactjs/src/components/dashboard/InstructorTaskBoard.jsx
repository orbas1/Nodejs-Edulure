import PropTypes from 'prop-types';
import { useMemo } from 'react';

function deriveTasks(experiments) {
  if (!Array.isArray(experiments)) return [];
  return experiments
    .map((experiment) => {
      if (!experiment) return null;
      const status = String(experiment.status ?? '').toLowerCase();
      const tasks = [];
      if (!experiment.targetMetric) {
        tasks.push('Add a primary metric');
      }
      if (!experiment.hypothesis) {
        tasks.push('Document the hypothesis');
      }
      if (!experiment.baselineValue && experiment.baselineValue !== 0) {
        tasks.push('Record a baseline');
      }
      if (status === 'ideation' || status === 'design') {
        tasks.push('Move to build phase');
      }
      if (!tasks.length && status === 'live') {
        tasks.push('Review live checkpoints');
      }
      if (!tasks.length) {
        return null;
      }
      return {
        id: experiment.id,
        title: experiment.title ?? 'Untitled experiment',
        owner: experiment.ownerName ?? 'Unassigned',
        status,
        tasks,
        priority: status === 'live' ? 'high' : status === 'design' ? 'medium' : 'low'
      };
    })
    .filter(Boolean)
    .slice(0, 5);
}

export default function InstructorTaskBoard({ experiments, onSelectTask, isBusy }) {
  const tasks = useMemo(() => deriveTasks(experiments), [experiments]);

  if (tasks.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Task board</h2>
        <p className="mt-2 text-sm text-slate-600">
          All experiments are in good shape. Keep iterating on growth initiatives to surface the next actions here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Task board</p>
          <h2 className="text-lg font-semibold text-slate-900">Review experiment follow-ups</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{tasks.length} tasks</span>
      </div>
      <ul className="mt-5 space-y-3">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                <p className="text-xs text-slate-500">Owner {task.owner}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  task.priority === 'high'
                    ? 'bg-rose-100 text-rose-700'
                    : task.priority === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-600'
                }`}
              >
                {task.priority} priority
              </span>
            </div>
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
              {task.tasks.map((item) => (
                <li key={`${task.id}-${item}`}>{item}</li>
              ))}
            </ul>
            {typeof onSelectTask === 'function' ? (
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => onSelectTask(task.id)}
                disabled={isBusy}
              >
                Open experiment
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

InstructorTaskBoard.propTypes = {
  experiments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string,
      ownerName: PropTypes.string,
      status: PropTypes.string,
      targetMetric: PropTypes.string,
      hypothesis: PropTypes.string,
      baselineValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  ),
  onSelectTask: PropTypes.func,
  isBusy: PropTypes.bool
};

InstructorTaskBoard.defaultProps = {
  experiments: [],
  onSelectTask: undefined,
  isBusy: false
};
