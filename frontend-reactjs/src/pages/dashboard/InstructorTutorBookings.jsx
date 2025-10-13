import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorTutorBookings() {
  const { dashboard, refresh } = useOutletContext();
  const bookings = dashboard?.bookings;

  if (!bookings) {
    return (
      <DashboardStateMessage
        title="No tutor booking data"
        description="There are no inbound mentor requests or confirmed sessions yet. Refresh to fetch the latest pipeline."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const pipeline = bookings.pipeline ?? [];
  const confirmed = bookings.confirmed ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tutor bookings</h1>
          <p className="mt-2 text-sm text-slate-600">Manage inbound requests and confirm upcoming mentorship sessions.</p>
        </div>
        <button
          type="button"
          className="dashboard-action"
        >
          Open routing rules
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Pending requests</h2>
        <ul className="mt-4 space-y-4">
          {pipeline.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.status}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.learner}</p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p>Requested {item.requested}</p>
                  <button type="button" className="mt-2 dashboard-chip">
                    Assign mentor
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{item.topic}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Confirmed sessions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {confirmed.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.date}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.topic}</p>
              <p className="text-xs text-slate-600">With {item.learner}</p>
              <div className="mt-4 flex gap-3 text-xs text-slate-600">
                <button type="button" className="dashboard-chip">
                  Send prep
                </button>
                <button type="button" className="dashboard-chip">
                  Reschedule
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
