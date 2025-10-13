import PropTypes from 'prop-types';

function OutstandingTasks({ tasks }) {
  return (
    <div className="dashboard-card-muted p-4">
      <p className="dashboard-kicker">Outstanding tasks</p>
      {tasks.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {tasks.map((task) => (
            <li key={task} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-rose-400" />
              <span>{task}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-emerald-600">All modules are production ready.</p>
      )}
    </div>
  );
}

OutstandingTasks.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.string)
};

OutstandingTasks.defaultProps = {
  tasks: []
};

function UpcomingMilestones({ items }) {
  return (
    <div className="dashboard-card-muted p-4">
      <p className="dashboard-kicker">Upcoming milestones</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-3 text-sm text-slate-600">
          {items.map((item) => (
            <li key={item.id}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{item.type}</span>
                <span>{item.due}</span>
              </div>
              <p className="mt-1 font-medium text-slate-900">{item.title}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-600">No release milestones scheduled.</p>
      )}
    </div>
  );
}

UpcomingMilestones.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      type: PropTypes.string,
      due: PropTypes.string,
      title: PropTypes.string
    })
  )
};

UpcomingMilestones.defaultProps = {
  items: []
};

function BlueprintModulesTable({ modules }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Module</th>
            <th className="px-4 py-3">Release</th>
            <th className="px-4 py-3">Lessons</th>
            <th className="px-4 py-3">Assignments</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Gaps</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {modules.map((module) => (
            <tr key={module.id} className="hover:bg-primary/5">
              <td className="px-4 py-3 text-slate-900">{module.title}</td>
              <td className="px-4 py-3">{module.release}</td>
              <td className="px-4 py-3">{module.lessons}</td>
              <td className="px-4 py-3">{module.assignments}</td>
              <td className="px-4 py-3">{module.duration}</td>
              <td className="px-4 py-3 text-xs text-slate-500">
                {module.outstanding.length > 0 ? module.outstanding.join(', ') : 'Ready'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

BlueprintModulesTable.propTypes = {
  modules: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      release: PropTypes.string,
      lessons: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      assignments: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      duration: PropTypes.string,
      outstanding: PropTypes.arrayOf(PropTypes.string)
    })
  )
};

BlueprintModulesTable.defaultProps = {
  modules: []
};

export default function CourseBlueprintCard({ blueprint }) {
  return (
    <div className="dashboard-section space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="dashboard-kicker">{blueprint.stage}</p>
          <h2 className="text-xl font-semibold text-slate-900">{blueprint.name}</h2>
          {blueprint.summary ? (
            <p className="mt-2 text-sm text-slate-600">{blueprint.summary}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="dashboard-pill px-3 py-1">Learners {blueprint.learners}</span>
            <span className="dashboard-pill px-3 py-1">Offer {blueprint.price}</span>
            <span className="dashboard-pill px-3 py-1">{blueprint.moduleCount} modules</span>
          </div>
        </div>
        <div className="text-right">
          <p className="dashboard-kicker">Readiness</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{blueprint.readiness}%</p>
          <p className="mt-1 text-xs text-slate-600">{blueprint.readinessLabel}</p>
          <p className="mt-3 text-xs text-slate-500">Content load {blueprint.totalDurationLabel}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <BlueprintModulesTable modules={blueprint.modules} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <OutstandingTasks tasks={blueprint.outstanding} />
          <UpcomingMilestones items={blueprint.upcoming} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <button type="button" className="dashboard-primary-pill">
          Open production board
        </button>
        <button type="button" className="dashboard-pill">
          Share with tutors
        </button>
        <button type="button" className="dashboard-pill">
          Export syllabus
        </button>
      </div>
    </div>
  );
}

CourseBlueprintCard.propTypes = {
  blueprint: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    stage: PropTypes.string,
    name: PropTypes.string,
    summary: PropTypes.string,
    learners: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    price: PropTypes.string,
    moduleCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    readiness: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    readinessLabel: PropTypes.string,
    totalDurationLabel: PropTypes.string,
    modules: BlueprintModulesTable.propTypes.modules,
    outstanding: OutstandingTasks.propTypes.tasks,
    upcoming: UpcomingMilestones.propTypes.items
  }).isRequired
};
