import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function LearnerCommunities() {
  const { dashboard, refresh } = useOutletContext();
  const data = dashboard?.communities;

  if (!data) {
    return (
      <DashboardStateMessage
        title="No communities configured"
        description="We could not load any community operations for this dashboard role. Try refreshing to pull the latest assignments."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const managed = data.managed ?? [];
  const pipelines = data.pipelines ?? [];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Community management</h1>
            <p className="mt-2 text-sm text-slate-600">
              Track health, initiatives, and operations for every community you steward.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-action"
          >
            Create new initiative
          </button>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {managed.map((community) => (
            <div key={community.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{community.members} members</span>
                <span>Moderators {community.moderators}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">{community.name}</h2>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Community health {community.health}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-500">
                {community.initiatives.map((initiative) => (
                  <li key={initiative} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    {initiative}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-600">
                <button type="button" className="dashboard-chip">
                  View analytics
                </button>
                <button type="button" className="dashboard-chip">
                  Automations
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pipelines</h2>
            <p className="text-sm text-slate-600">Every ongoing community operation, with the current owner and progress.</p>
          </div>
          <button
            type="button"
            className="dashboard-action"
          >
            Add pipeline stage
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{pipeline.title}</p>
              <p className="mt-2 text-sm text-slate-600">Owner {pipeline.owner}</p>
              <div className="mt-4 h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{ width: `${pipeline.progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{pipeline.progress}% completion</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
