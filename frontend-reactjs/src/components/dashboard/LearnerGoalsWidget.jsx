import PropTypes from 'prop-types';
import clsx from 'clsx';

import CourseProgressBar from '../course/CourseProgressBar.jsx';

export default function LearnerGoalsWidget({ goals, onAddGoal, className }) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return (
      <section className={clsx('dashboard-card-muted rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600', className)}>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="dashboard-kicker">Learning goals</p>
            <h2 className="text-lg font-semibold text-slate-900">Plan your week</h2>
            <p className="text-sm text-slate-600">Add a target to see recommended lesson counts and time commitments.</p>
          </div>
          {onAddGoal ? (
            <button type="button" className="dashboard-pill" onClick={onAddGoal}>
              Create goal
            </button>
          ) : null}
        </header>
      </section>
    );
  }

  return (
    <section className={clsx('dashboard-card-muted rounded-xl border border-slate-200/60 bg-white/90 p-5', className)}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="dashboard-kicker text-xs font-semibold uppercase tracking-wide text-slate-500">Weekly learning goals</p>
          <h2 className="text-lg font-semibold text-slate-900">Stay on track</h2>
          <p className="text-sm text-slate-600">
            Your suggested pace balances remaining lessons with the next milestone so you can finish confidently.
          </p>
        </div>
        {onAddGoal ? (
          <button type="button" className="dashboard-pill px-3 py-1 text-xs" onClick={onAddGoal}>
            Add goal
          </button>
        ) : null}
      </header>

      <div className="mt-6 space-y-4">
        {goals.map((goal) => (
          <article key={goal.id} className="rounded-lg border border-slate-200/70 bg-white/70 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{goal.title}</p>
                {goal.subtitle ? <p className="text-xs text-slate-500">{goal.subtitle}</p> : null}
              </div>
              {goal.status ? (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-700">
                  {goal.status}
                </span>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              <CourseProgressBar
                value={goal.progressPercent}
                tone={goal.progressPercent >= 100 ? 'emerald' : 'primary'}
                srLabel={`${goal.title} progress`}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  {goal.remainingLessons > 0
                    ? `${goal.remainingLessons} lesson${goal.remainingLessons === 1 ? '' : 's'} remaining`
                    : 'All lessons complete'}
                </span>
                {goal.dueLabel ? <span>Target: {goal.dueLabel}</span> : null}
              </div>
              {goal.focusMinutesPerWeek ? (
                <p className="text-xs text-slate-500">
                  Dedicate approximately <span className="font-semibold text-slate-700">{goal.focusMinutesPerWeek} minutes</span>{' '}
                  this week to hit your goal.
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

LearnerGoalsWidget.propTypes = {
  goals: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      subtitle: PropTypes.string,
      status: PropTypes.string,
      remainingLessons: PropTypes.number,
      focusMinutesPerWeek: PropTypes.number,
      dueLabel: PropTypes.string,
      progressPercent: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    })
  ),
  onAddGoal: PropTypes.func,
  className: PropTypes.string
};

LearnerGoalsWidget.defaultProps = {
  goals: [],
  onAddGoal: null,
  className: ''
};
