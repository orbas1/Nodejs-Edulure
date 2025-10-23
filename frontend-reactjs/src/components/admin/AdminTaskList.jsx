import PropTypes from 'prop-types';

const severityTone = {
  info: 'border-slate-200 bg-white',
  warning: 'border-amber-200 bg-amber-50/70',
  danger: 'border-rose-200 bg-rose-50/70'
};

const severityAccent = {
  info: 'text-slate-500',
  warning: 'text-amber-700',
  danger: 'text-rose-700'
};

export default function AdminTaskList({ tasks, onNavigate }) {
  if (!tasks?.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
        All critical operator tasks are up to date. Check back after the next telemetry refresh.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {tasks.map((task) => {
        const tone = severityTone[task.severity] ?? severityTone.info;
        const accent = severityAccent[task.severity] ?? severityAccent.info;

        const handleClick = () => {
          if (typeof onNavigate === 'function' && task.sectionId) {
            onNavigate(task.sectionId);
          }
        };

        return (
          <li
            key={task.id}
            className={`rounded-3xl border px-4 py-3 shadow-sm transition ${tone}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`text-sm font-semibold ${accent}`}>{task.label}</p>
                {task.helper ? (
                  <p className="text-xs text-slate-500">{task.helper}</p>
                ) : null}
              </div>
              {task.sectionId ? (
                <button
                  type="button"
                  onClick={handleClick}
                  className="self-start rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary hover:text-primary"
                >
                  Review
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

AdminTaskList.propTypes = {
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      helper: PropTypes.string,
      sectionId: PropTypes.string,
      severity: PropTypes.oneOf(['info', 'warning', 'danger'])
    })
  ),
  onNavigate: PropTypes.func
};

AdminTaskList.defaultProps = {
  tasks: [],
  onNavigate: null
};
