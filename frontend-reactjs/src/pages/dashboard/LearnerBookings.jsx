import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function LearnerBookings() {
  const { dashboard, refresh } = useOutletContext();
  const data = dashboard?.tutorBookings;

  if (!data) {
    return (
      <DashboardStateMessage
        title="No learner bookings"
        description="We couldn't locate any upcoming or historical tutor bookings. Refresh to retrieve the latest mentor agenda."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const active = data.active ?? [];
  const history = data.history ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tutor bookings</h1>
          <p className="mt-2 text-sm text-slate-600">Coordinate sessions, briefs, and follow-ups with your mentor team.</p>
        </div>
        <button
          type="button"
          className="dashboard-action"
        >
          Request new session
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Upcoming bookings</h2>
            <p className="text-sm text-slate-600">Briefs received, waiting on acceptance, or confirmed sessions.</p>
          </div>
          <button
            type="button"
            className="dashboard-chip-lg"
          >
            Export agenda
          </button>
        </div>
        <div className="mt-5 space-y-4">
          {active.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.status}</p>
                  <p className="text-sm font-semibold text-slate-900">{item.topic}</p>
                  <p className="text-xs text-slate-500">Mentor {item.mentor}</p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p>{item.date}</p>
                  <button type="button" className="mt-2 dashboard-chip">
                    Share prep notes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Completed sessions</h2>
        <table className="mt-4 w-full text-left text-sm text-slate-500">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3">Mentor</th>
              <th className="pb-3">Topic</th>
              <th className="pb-3">Date</th>
              <th className="pb-3 text-right">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="py-3">{item.mentor}</td>
                <td className="py-3 text-slate-600">{item.topic}</td>
                <td className="py-3 text-slate-600">{item.date}</td>
                <td className="py-3 text-right text-emerald-400">{item.rating}★</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
