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
          <p className="mt-2 text-sm text-slate-500">Coordinate sessions, briefs, and follow-ups with your mentor team.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Request new session
        </button>
      </div>

      <section className="dashboard-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Upcoming bookings</h2>
            <p className="text-sm text-slate-500">Briefs received, waiting on acceptance, or confirmed sessions.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-slate-900"
          >
            Export agenda
          </button>
        </div>
        <div className="mt-5 space-y-4">
          {active.map((item) => (
            <div key={item.id} className="dashboard-card-muted">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.status}</p>
                  <p className="text-sm font-semibold text-slate-900">{item.topic}</p>
                  <p className="text-xs text-slate-500">Mentor {item.mentor}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{item.date}</p>
                  <button type="button" className="mt-2 rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">
                    Share prep notes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-panel">
        <h2 className="text-lg font-semibold text-slate-900">Completed sessions</h2>
        <table className="mt-4 w-full text-left text-sm text-slate-600">
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
              <tr key={item.id} className="hover:bg-primary/5">
                <td className="py-3">{item.mentor}</td>
                <td className="py-3 text-slate-500">{item.topic}</td>
                <td className="py-3 text-slate-500">{item.date}</td>
                <td className="py-3 text-right text-emerald-400">{item.rating}★</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
