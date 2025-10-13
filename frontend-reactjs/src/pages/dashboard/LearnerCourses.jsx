import { useNavigate, useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function LearnerCourses() {
  const { dashboard, refresh } = useOutletContext();
  const navigate = useNavigate();
  const data = dashboard?.courses;

  if (!data) {
    return (
      <DashboardStateMessage
        title="Learner courses not available"
        description="We couldn't find any active or recommended courses for your learner dashboard. Refresh to pull the latest schedule."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const active = data.active ?? [];
  const recommendations = data.recommendations ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Course management</h1>
          <p className="mt-2 text-sm text-slate-400">
            Continue your pathways, track progress, and dive deep into lessons without leaving the control center.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            Add learning goal
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
          >
            Sync calendar
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">Active programs</h2>
        <div className="mt-5 space-y-4">
          {active.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => navigate(`${course.id}`)}
              className="w-full rounded-2xl border border-slate-900/60 bg-slate-900/50 p-5 text-left transition hover:border-primary/50 hover:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{course.status}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{course.title}</p>
                  <p className="text-xs text-slate-400">With {course.instructor}</p>
                </div>
                <div className="text-right text-sm text-slate-400">
                  <p>{course.progress}% complete</p>
                  <p className="text-xs text-slate-500">Next: {course.nextLesson}</p>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Personalized recommendations</h2>
            <p className="text-sm text-slate-400">Based on your momentum, communities, and mentor sessions.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
          >
            Adjust filters
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {recommendations.map((rec) => (
            <div key={rec.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/50 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rating {rec.rating}</p>
              <p className="mt-2 text-lg font-semibold text-white">{rec.title}</p>
              <p className="mt-2 text-sm text-slate-400">{rec.summary}</p>
              <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
                <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                  Preview syllabus
                </button>
                <button type="button" className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary/50">
                  Add to queue
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
