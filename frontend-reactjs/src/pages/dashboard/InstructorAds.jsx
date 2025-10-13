import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorAds() {
  const { dashboard, refresh } = useOutletContext();
  const ads = dashboard?.ads;

  if (!ads) {
    return (
      <DashboardStateMessage
        title="Ads workspace offline"
        description="Performance data hasn't synced from your ad accounts yet. Refresh after connecting channels."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edulure Ads</h1>
          <p className="mt-2 text-sm text-slate-500">Optimize spend, experiment with creative, and monitor ROAS in real time.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Launch campaign
        </button>
      </div>

      <section className="dashboard-panel">
        <h2 className="text-lg font-semibold text-slate-900">Active campaigns</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {ads.active.map((campaign) => (
            <div key={campaign.id} className="dashboard-card-muted">
              <p className="text-xs uppercase tracking-wide text-slate-500">{campaign.format}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{campaign.name}</p>
              <p className="mt-1 text-sm text-slate-500">Spend {campaign.spend}</p>
              <p className="mt-2 text-xs text-emerald-400">{campaign.performance}</p>
              <div className="mt-4 flex gap-3 text-xs text-slate-500">
                <button type="button" className="rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">
                  View insights
                </button>
                <button type="button" className="rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">
                  Pause
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-panel">
        <h2 className="text-lg font-semibold text-slate-900">Experiments</h2>
        <ul className="mt-4 space-y-4">
          {ads.experiments.map((experiment) => (
            <li key={experiment.id} className="dashboard-card-muted">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{experiment.status}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{experiment.name}</p>
                </div>
                <p className="text-xs text-slate-500">{experiment.hypothesis}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
