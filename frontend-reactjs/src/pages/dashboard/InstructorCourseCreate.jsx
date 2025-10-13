import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

const readinessNarrative = (score) => {
  if (score >= 80) return 'Launch-ready';
  if (score >= 50) return 'In build';
  if (score > 0) return 'Needs production';
  return 'Kick-off required';
};

export default function InstructorCourseCreate() {
  const { dashboard, refresh } = useOutletContext();
  const blueprints = dashboard?.courses?.creationBlueprints ?? [];

  const overview = useMemo(() => {
    if (blueprints.length === 0) {
      return {
        averageReadiness: 0,
        modules: 0,
        outstanding: 0
      };
    }
    const readinessTotal = blueprints.reduce((sum, blueprint) => sum + Number(blueprint.readiness ?? 0), 0);
    const modules = blueprints.reduce((sum, blueprint) => sum + Number(blueprint.moduleCount ?? 0), 0);
    const outstanding = blueprints.reduce((sum, blueprint) => sum + (blueprint.outstanding?.length ?? 0), 0);
    return {
      averageReadiness: Math.round(readinessTotal / blueprints.length),
      modules,
      outstanding
    };
  }, [blueprints]);

  if (blueprints.length === 0) {
    return (
      <DashboardStateMessage
        title="No blueprints configured"
        description="Create your first course structure to orchestrate lesson beats, assignments, and launch cadences."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Course creation hub</h1>
          <p className="dashboard-subtitle">
            Structure each cohort with production-ready blueprints, module pacing, and readiness insights.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-primary-pill">
            Generate outline
          </button>
          <button type="button" className="dashboard-pill">
            Import from Notion
          </button>
          <button type="button" className="dashboard-pill">
            Sync from LMS
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="dashboard-section">
          <p className="dashboard-kicker">Active blueprints</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{blueprints.length}</p>
          <p className="mt-1 text-xs text-slate-600">Cohorts with production scaffolding</p>
        </div>
        <div className="dashboard-section">
          <p className="dashboard-kicker">Average readiness</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{overview.averageReadiness}%</p>
          <p className="mt-1 text-xs text-slate-600">{readinessNarrative(overview.averageReadiness)}</p>
        </div>
        <div className="dashboard-section">
          <p className="dashboard-kicker">Modules in build</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{overview.modules}</p>
          <p className="mt-1 text-xs text-slate-600">{overview.outstanding} outstanding tasks</p>
        </div>
      </section>

      <section className="space-y-6">
        {blueprints.map((blueprint) => (
          <div key={blueprint.id} className="dashboard-section space-y-6">
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
              <div className="lg:col-span-3 overflow-hidden rounded-3xl border border-slate-200">
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
                    {blueprint.modules.map((module) => (
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

              <div className="lg:col-span-2 space-y-4">
                <div className="dashboard-card-muted p-4">
                  <p className="dashboard-kicker">Outstanding tasks</p>
                  {blueprint.outstanding.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {blueprint.outstanding.map((task) => (
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

                <div className="dashboard-card-muted p-4">
                  <p className="dashboard-kicker">Upcoming milestones</p>
                  {blueprint.upcoming.length > 0 ? (
                    <ul className="mt-3 space-y-3 text-sm text-slate-600">
                      {blueprint.upcoming.map((item) => (
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
        ))}
      </section>
    </div>
  );
}
