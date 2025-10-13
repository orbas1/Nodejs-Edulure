import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorCourseManage() {
  const { dashboard, refresh } = useOutletContext();
  const pipeline = dashboard?.courses?.pipeline ?? [];
  const production = dashboard?.courses?.production ?? [];

  if (pipeline.length === 0 && production.length === 0) {
    return (
      <DashboardStateMessage
        title="Course operations pending"
        description="No cohorts or production tasks are currently tracked. Refresh once you've synced course data."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Course portfolio</h1>
          <p className="mt-2 text-sm text-slate-600">Oversee cohort status, production sprints, and staffing needs.</p>
        </div>
        <button
          type="button"
          className="dashboard-primary-pill px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Create launch brief
        </button>
      </div>

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

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Production sprint</h2>
        <ul className="mt-4 space-y-4">
          {production.map((asset) => (
            <li key={asset.id} className="dashboard-card-muted p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{asset.status}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{asset.asset}</p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p>Owner {asset.owner}</p>
                  <button type="button" className="mt-2 dashboard-pill px-3 py-1 hover:border-primary/50">
                    Open task
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
