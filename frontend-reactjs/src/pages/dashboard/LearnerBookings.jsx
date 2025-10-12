import { useOutletContext } from 'react-router-dom';

export default function LearnerBookings() {
  const { dashboard } = useOutletContext();
  const data = dashboard?.tutorBookings;

  if (!data) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tutor bookings</h1>
          <p className="mt-2 text-sm text-slate-400">Coordinate sessions, briefs, and follow-ups with your mentor team.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Request new session
        </button>
      </div>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Upcoming bookings</h2>
            <p className="text-sm text-slate-400">Briefs received, waiting on acceptance, or confirmed sessions.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
          >
            Export agenda
          </button>
        </div>
        <div className="mt-5 space-y-4">
          {data.active.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.status}</p>
                  <p className="text-sm font-semibold text-white">{item.topic}</p>
                  <p className="text-xs text-slate-500">Mentor {item.mentor}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>{item.date}</p>
                  <button type="button" className="mt-2 rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                    Share prep notes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Completed sessions</h2>
        <table className="mt-4 w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3">Mentor</th>
              <th className="pb-3">Topic</th>
              <th className="pb-3">Date</th>
              <th className="pb-3 text-right">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/60">
            {data.history.map((item) => (
              <tr key={item.id} className="hover:bg-slate-900/40">
                <td className="py-3">{item.mentor}</td>
                <td className="py-3 text-slate-400">{item.topic}</td>
                <td className="py-3 text-slate-400">{item.date}</td>
                <td className="py-3 text-right text-emerald-400">{item.rating}★</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
