import { useOutletContext } from 'react-router-dom';

export default function InstructorAds() {
  const { dashboard } = useOutletContext();
  const ads = dashboard?.ads;

  if (!ads) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edulure Ads</h1>
          <p className="mt-2 text-sm text-slate-400">Optimize spend, experiment with creative, and monitor ROAS in real time.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Launch campaign
        </button>
      </div>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Active campaigns</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {ads.active.map((campaign) => (
            <div key={campaign.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{campaign.format}</p>
              <p className="mt-2 text-lg font-semibold text-white">{campaign.name}</p>
              <p className="mt-1 text-sm text-slate-400">Spend {campaign.spend}</p>
              <p className="mt-2 text-xs text-emerald-400">{campaign.performance}</p>
              <div className="mt-4 flex gap-3 text-xs text-slate-400">
                <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                  View insights
                </button>
                <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                  Pause
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Experiments</h2>
        <ul className="mt-4 space-y-4">
          {ads.experiments.map((experiment) => (
            <li key={experiment.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{experiment.status}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{experiment.name}</p>
                </div>
                <p className="text-xs text-slate-400">{experiment.hypothesis}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
