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
          <h1 className="text-2xl font-semibold text-slate-900">E-book production</h1>
          <p className="mt-2 text-sm text-slate-600">Coordinate drafts, editing, and release planning for upcoming titles.</p>
        </div>
        <button
          type="button"
          className="dashboard-action"
        >
          Create new manuscript
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <ul className="space-y-4">
          {pipelines.map((pipeline) => (
            <li key={pipeline.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{pipeline.stage}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{pipeline.title}</p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p>Owner {pipeline.owner}</p>
                  <button type="button" className="mt-2 dashboard-chip">
                    Open workspace
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
