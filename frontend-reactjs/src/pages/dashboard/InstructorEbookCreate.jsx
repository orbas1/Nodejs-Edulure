import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorEbookCreate() {
  const { dashboard, refresh } = useOutletContext();
  const pipelines = dashboard?.ebooks?.creationPipelines ?? [];

  if (pipelines.length === 0) {
    return (
      <DashboardStateMessage
        title="No e-book projects in flight"
        description="Kick off a new manuscript or import an existing project plan to track production tasks."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">E-book production</h1>
          <p className="dashboard-subtitle">Coordinate drafts, editing, and release planning for upcoming titles.</p>
        </div>
        <button type="button" className="dashboard-primary-pill">
          Create new manuscript
        </button>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {pipelines.map((pipeline) => (
          <div key={pipeline.id} className="dashboard-section space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="dashboard-kicker">{pipeline.stage}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{pipeline.title}</p>
                <p className="mt-2 text-xs text-slate-500">Last updated {pipeline.lastUpdated}</p>
                {pipeline.reference ? (
                  <p className="mt-1 text-xs text-slate-500">Reference {pipeline.reference}</p>
                ) : null}
              </div>
              <div className="text-right text-xs text-slate-600">
                <p className="text-2xl font-semibold text-slate-900">{pipeline.progress}%</p>
                <p className="mt-1">Progress</p>
                <p className="mt-2">Owner {pipeline.owner}</p>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                style={{ width: `${Math.min(Math.max(Number(pipeline.progress ?? 0), 0), 100)}%` }}
              />
            </div>
            {pipeline.latestActivity ? (
              <p className="text-xs text-slate-500">Latest activity · {pipeline.latestActivity}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              {pipeline.nextActions?.map((action) => (
                <span key={action} className="dashboard-pill px-3 py-1">
                  {action}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              <button type="button" className="dashboard-primary-pill">
                Open workspace
              </button>
              <button type="button" className="dashboard-pill">
                Share with editors
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
