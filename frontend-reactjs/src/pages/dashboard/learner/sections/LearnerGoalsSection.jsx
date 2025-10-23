import PropTypes from 'prop-types';
import clsx from 'clsx';

function formatProgress(progress) {
  if (progress === undefined || progress === null) {
    return '0%';
  }
  const numeric = Number(progress);
  if (!Number.isFinite(numeric)) {
    return `${progress}`;
  }
  return `${Math.min(100, Math.max(0, Math.round(numeric)))}%`;
}

function formatDate(value) {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (_error) {
    return value;
  }
}

const goalShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  progress: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  dueDate: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string)
});

function GoalRow({ goal }) {
  const progress = Math.min(100, Math.max(0, Number(goal.progress ?? 0)));
  return (
    <li className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">{goal.title}</p>
          {goal.description ? (
            <p className="text-xs text-slate-500">{goal.description}</p>
          ) : null}
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className="font-semibold text-slate-600">{formatProgress(goal.progress)}</p>
          {goal.dueDate ? <p>Due {formatDate(goal.dueDate)}</p> : null}
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {goal.tags?.length ? (
        <ul className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary/80">
          {goal.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-primary/10 px-2 py-1">
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

GoalRow.propTypes = {
  goal: goalShape.isRequired
};

export default function LearnerGoalsSection({ goals, summary, className }) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return null;
  }

  return (
    <section className={clsx('dashboard-section space-y-5', className)}>
      <div>
        <p className="dashboard-kicker">Learning goals</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">Stay on track this month</h3>
        {summary ? <p className="mt-1 text-sm text-slate-600">{summary}</p> : null}
      </div>
      <ul className="space-y-3">
        {goals.map((goal) => (
          <GoalRow key={goal.id ?? goal.title} goal={goal} />
        ))}
      </ul>
    </section>
  );
}

LearnerGoalsSection.propTypes = {
  goals: PropTypes.arrayOf(goalShape),
  summary: PropTypes.string,
  className: PropTypes.string
};

LearnerGoalsSection.defaultProps = {
  goals: [],
  summary: '',
  className: ''
};
