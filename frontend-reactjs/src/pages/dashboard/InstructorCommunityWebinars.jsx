import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorCommunityWebinars() {
  const { dashboard, refresh } = useOutletContext();
  const webinars = dashboard?.communities?.webinars ?? [];

  if (webinars.length === 0) {
    return (
      <DashboardStateMessage
        title="No community webinars scheduled"
        description="Add upcoming webinars or sync from your events platform to track registrants and conversion."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Community webinars</h1>
          <p className="mt-2 text-sm text-slate-400">Coordinate registration flows, agendas, and promotional cadences.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Launch new webinar
        </button>
      </div>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3">Topic</th>
              <th className="pb-3">Date</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Registrants</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/60">
            {webinars.map((webinar) => (
              <tr key={webinar.id} className="hover:bg-slate-900/40">
                <td className="py-3 text-white">{webinar.topic}</td>
                <td className="py-3 text-slate-400">{webinar.date}</td>
                <td className="py-3 text-slate-400">{webinar.status}</td>
                <td className="py-3 text-right text-emerald-400">{webinar.registrants}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
