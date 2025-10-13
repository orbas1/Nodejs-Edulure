import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorCommunityManage() {
  const { dashboard, refresh } = useOutletContext();
  const manageDeck = dashboard?.communities?.manageDeck ?? [];

  if (manageDeck.length === 0) {
    return (
      <DashboardStateMessage
        title="Community metrics unavailable"
        description="We haven't received operations data for any active communities yet. Refresh after syncing."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Community operations</h1>
          <p className="mt-2 text-sm text-slate-600">Monitor growth, health, and resourcing across every live space.</p>
        </div>
        <button
          type="button"
          className="dashboard-action"
        >
          Configure automations
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {manageDeck.map((community) => (
          <div key={community.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{community.members} members</span>
              <span>{community.trend}</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{community.title}</h2>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Health: {community.health}</p>
            <div className="mt-4 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark" style={{ width: '80%' }} />
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs text-slate-600">
              <button type="button" className="dashboard-chip">
                View rituals
              </button>
              <button type="button" className="dashboard-chip">
                Staffing
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
