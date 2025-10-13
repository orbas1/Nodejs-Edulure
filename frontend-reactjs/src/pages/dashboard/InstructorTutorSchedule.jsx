import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function InstructorTutorSchedule() {
  const { dashboard, refresh } = useOutletContext();
  const schedule = dashboard?.schedules?.tutor ?? [];

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
          <p className="mt-2 text-sm text-slate-600">Ensure every mentor pod is resourced with the right availability.</p>
        </div>
        <button type="button" className="dashboard-primary-pill">
          Sync with calendars
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {schedule.map((entry) => (
          <div key={entry.id} className="dashboard-section">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{entry.mentor}</span>
              <span>{entry.slots}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">Learners assigned: {entry.learners}</p>
            <p className="mt-2 text-xs text-slate-500">{entry.notes}</p>
            <div className="mt-4 flex gap-3 text-xs text-slate-600">
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
