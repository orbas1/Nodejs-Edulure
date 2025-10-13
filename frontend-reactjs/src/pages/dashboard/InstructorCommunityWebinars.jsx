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
          <h1 className="text-2xl font-semibold text-slate-900">Community webinars</h1>
          <p className="mt-2 text-sm text-slate-600">Coordinate registration flows, agendas, and promotional cadences.</p>
        </div>
        <button
          type="button"
          className="dashboard-action"
        >
          Launch new webinar
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <table className="w-full text-left text-sm text-slate-500">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3">Topic</th>
              <th className="pb-3">Date</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Registrants</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {webinars.map((webinar) => (
              <tr key={webinar.id} className="hover:bg-slate-50">
                <td className="py-3 text-slate-900">{webinar.topic}</td>
                <td className="py-3 text-slate-600">{webinar.date}</td>
                <td className="py-3 text-slate-600">{webinar.status}</td>
                <td className="py-3 text-right text-emerald-400">{webinar.registrants}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
