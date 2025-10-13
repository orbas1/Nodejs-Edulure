import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorCommunityPodcasts() {
  const { dashboard, refresh } = useOutletContext();
  const podcasts = dashboard?.communities?.podcasts ?? [];

  if (podcasts.length === 0) {
    return (
      <DashboardStateMessage
        title="No podcast episodes in production"
        description="Spin up a new series or import from your studio integrations to monitor production progress here."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Community podcast studio</h1>
          <p className="mt-2 text-sm text-slate-400">Track production stages and release cadence for every episode.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Schedule recording
        </button>
      </div>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <ul className="space-y-4">
          {podcasts.map((episode) => (
            <li key={episode.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{episode.stage}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{episode.episode}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Release {episode.release}</p>
                  <button type="button" className="mt-2 rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                    Open production board
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
