import { useOutletContext } from 'react-router-dom';

export default function InstructorTutorSchedule() {
  const { dashboard } = useOutletContext();
  const schedule = dashboard?.schedules?.tutor ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tutor schedules</h1>
          <p className="mt-2 text-sm text-slate-400">Ensure every mentor pod is resourced with the right availability.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Sync with calendars
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {schedule.map((entry) => (
          <div key={entry.id} className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{entry.mentor}</span>
              <span>{entry.slots}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Learners assigned: {entry.learners}</p>
            <p className="mt-2 text-xs text-slate-500">{entry.notes}</p>
            <div className="mt-4 flex gap-3 text-xs text-slate-400">
              <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                Adjust capacity
              </button>
              <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                Send digest
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
