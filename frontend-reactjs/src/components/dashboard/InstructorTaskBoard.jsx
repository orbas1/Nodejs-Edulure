import PropTypes from 'prop-types';
import clsx from 'clsx';

import AnalyticsStat from '../shared/AnalyticsStat.jsx';

function normaliseTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map((task, index) => ({
      id: task.id ?? `task-${index}`,
      title: task.title ?? task.label ?? 'Task',
      description: task.description ?? task.summary ?? '',
      status: task.status ?? 'pending',
      dueAt: task.dueAt ?? task.deadline ?? null,
      category: task.category ?? 'General',
      impact: task.impact ?? null
    }))
    .filter((task) => task.title);
}

export default function InstructorTaskBoard({ tasks, metrics, onTaskSelect, className }) {
  const safeTasks = normaliseTasks(tasks);
  const safeMetrics = Array.isArray(metrics)
    ? metrics.filter((metric) => metric?.label && metric?.value !== undefined)
    : [];

  return (
    <section className={clsx('rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm', className)}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="dashboard-kicker text-xs font-semibold uppercase tracking-wide text-slate-500">
            Instructor task board
          </p>
          <h2 className="text-lg font-semibold text-slate-900">Ship the next learning milestone</h2>
          <p className="text-sm text-slate-600">
            Prioritise cohort setup, production checklists, and monetisation workflows from one board.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {safeMetrics.map((metric) => (
            <AnalyticsStat key={metric.label} label={metric.label} value={metric.value} change={metric.change} trend={metric.trend} tone="muted" />
          ))}
        </div>
      </header>

      <ol className="mt-6 space-y-3">
        {safeTasks.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm text-slate-600">
            No actionable tasks right now. As new learners enroll, production and compliance work will appear here.
          </li>
        ) : null}
        {safeTasks.map((task) => (
          <li
            key={task.id}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 transition hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                {task.description ? <p className="text-xs text-slate-500">{task.description}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{task.category}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{task.status}</span>
                {task.dueAt ? (
                  <time
                    dateTime={task.dueAt}
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700"
                    aria-label="Due date"
                  >
                    Due {new Date(task.dueAt).toLocaleDateString()}
                  </time>
                ) : null}
              </div>
            </div>
            {task.impact ? (
              <p className="text-xs text-slate-500">Impact: {task.impact}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onTaskSelect?.(task)}
                className="inline-flex items-center gap-2 rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
              >
                View details
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

InstructorTaskBoard.propTypes = {
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
      status: PropTypes.string,
      dueAt: PropTypes.string,
      category: PropTypes.string,
      impact: PropTypes.string
    })
  ),
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      change: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      trend: PropTypes.oneOf(['up', 'down'])
    })
  ),
  onTaskSelect: PropTypes.func,
  className: PropTypes.string
};

InstructorTaskBoard.defaultProps = {
  tasks: [],
  metrics: [],
  onTaskSelect: null,
  className: ''
};
