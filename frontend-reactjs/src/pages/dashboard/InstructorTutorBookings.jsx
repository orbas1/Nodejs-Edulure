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
          <p className="mt-2 text-sm text-slate-500">Manage inbound requests and confirm upcoming mentorship sessions.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Open routing rules
        </button>
      </div>

      <section className="dashboard-panel">
        <h2 className="text-lg font-semibold text-slate-900">Pending requests</h2>
        <ul className="mt-4 space-y-4">
          {pipeline.map((item) => (
            <li key={item.id} className="dashboard-card-muted">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.status}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.learner}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Requested {item.requested}</p>
                  <button type="button" className="mt-2 rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">
                    Assign mentor
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">{item.topic}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="dashboard-panel">
        <h2 className="text-lg font-semibold text-slate-900">Confirmed sessions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {confirmed.map((item) => (
            <div key={item.id} className="dashboard-card-muted">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.date}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.topic}</p>
              <p className="text-xs text-slate-500">With {item.learner}</p>
              <div className="mt-4 flex gap-3 text-xs text-slate-500">
                <button type="button" className="rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">
                  Send prep
                </button>
                <button type="button" className="rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">
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
