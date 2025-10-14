import DashboardSectionHeader from '../../components/dashboard/DashboardSectionHeader.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';

export default function LearnerCommunities() {
  const { isLearner, section: data, refresh } = useLearnerDashboardSection('communities');

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner workspace required"
        description="Switch to the learner dashboard to access community operations and engagement pipelines."
      />
    );
  }

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
    <div className="space-y-10">
      <DashboardSectionHeader
        eyebrow="Communities"
        title="Community mission control"
        description="Track the health of every initiative, keep moderators aligned, and ship new programmes with confidence."
        actions={
          <>
            <button type="button" className="dashboard-pill px-4 py-2">
              View playbooks
            </button>
            <button type="button" className="dashboard-primary-pill">
              Create new initiative
            </button>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-2">
        {managed.length === 0 ? (
          <div className="dashboard-section">
            <p className="text-sm font-semibold text-slate-900">No communities assigned yet</p>
            <p className="mt-2 text-sm text-slate-600">
              Invite your team or switch roles to start curating learning communities for this workspace.
            </p>
          </div>
        ) : null}
        {managed.map((community) => (
          <div key={community.id} className="dashboard-section space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>{community.members} members</span>
              <span>Moderators {community.moderators}</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                Health · {community.health}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{community.name}</h2>
              <p className="mt-2 text-sm text-slate-600">Operational initiatives keeping this community energised.</p>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {community.initiatives.map((initiative) => (
                <li key={initiative} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {initiative}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <button type="button" className="dashboard-pill px-3 py-1">
                View analytics
              </button>
              <button type="button" className="dashboard-pill px-3 py-1">
                Automations
              </button>
              <button type="button" className="dashboard-pill px-3 py-1">
                Export health report
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="dashboard-section space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Operational pipelines</h2>
            <p className="text-sm text-slate-600">
              Every ongoing community operation with the current owner, risk posture, and execution velocity.
            </p>
          </div>
          <button type="button" className="dashboard-primary-pill">
            Add pipeline stage
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pipelines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-600">
              No active pipelines yet. Configure campaign, launch, or moderation pipelines to monitor progress here.
            </div>
          ) : null}
          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="dashboard-kicker">{pipeline.title}</p>
              <p className="mt-2 text-sm text-slate-600">Owner {pipeline.owner}</p>
              <div className="mt-4 h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{ width: `${pipeline.progress}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{pipeline.progress}% completion</span>
                <span className="font-semibold text-primary">On track</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
