import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorTutorSchedule() {
  const { dashboard, refresh } = useOutletContext();
  const schedule = Array.isArray(dashboard?.tutors?.availability)
    ? dashboard.tutors.availability
    : Array.isArray(dashboard?.schedules?.tutor)
      ? dashboard.schedules.tutor
      : [];
  const notifications = Array.isArray(dashboard?.tutors?.notifications)
    ? dashboard.tutors.notifications
    : [];

  if (schedule.length === 0) {
    return (
      <DashboardStateMessage
        title="Tutor availability not synced"
        description="Sync your mentors' calendars to populate availability windows across pods."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tutor schedules</h1>
          <p className="mt-2 text-sm text-slate-600">
            Ensure every mentor pod is resourced with the right availability and learners receive rapid confirmations.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-primary-pill">
            Sync with calendars
          </button>
          <button type="button" className="dashboard-pill">
            Download coverage report
          </button>
        </div>
      </div>

      {notifications.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2">
          {notifications.slice(0, 2).map((notification) => (
            <div key={notification.id} className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-700">
              <p className="text-sm font-semibold">{notification.title}</p>
              {notification.detail && <p className="mt-1 text-xs opacity-80">{notification.detail}</p>}
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {schedule.map((entry) => (
          <div key={entry.id} className="dashboard-section">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{entry.mentor}</p>
                <p className="mt-1 text-sm text-slate-600">{entry.learners}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{entry.slots}</span>
            </div>
            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Next availability</dt>
                <dd className="font-medium text-slate-900">{entry.nextAvailability ?? 'Sync calendar'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Next session</dt>
                <dd className="font-medium text-slate-900">{entry.nextSession ?? 'None scheduled'}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              {(entry.noteItems ?? entry.notes?.split?.(' • ') ?? []).map((note) => (
                <span key={note} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                  {note}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-600">
              <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                Adjust capacity
              </button>
              <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                Send digest
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
