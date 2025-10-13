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
          <h1 className="text-2xl font-semibold text-slate-900">Course management</h1>
          <p className="mt-2 text-sm text-slate-500">
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
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-slate-900"
          >
            Sync calendar
          </button>
        </div>
      </div>

      <section className="dashboard-panel">
        <h2 className="text-lg font-semibold text-slate-900">Active programs</h2>
        <div className="mt-5 space-y-4">
          {active.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => navigate(`${course.id}`)}
              className="w-full dashboard-card text-left transition hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{course.status}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{course.title}</p>
                  <p className="text-xs text-slate-500">With {course.instructor}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>{course.progress}% complete</p>
                  <p className="text-xs text-slate-500">Next: {course.nextLesson}</p>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Personalized recommendations</h2>
            <p className="text-sm text-slate-500">Based on your momentum, communities, and mentor sessions.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-slate-900"
          >
            Adjust filters
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {recommendations.map((rec) => (
            <div key={rec.id} className="dashboard-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rating {rec.rating}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{rec.title}</p>
              <p className="mt-2 text-sm text-slate-500">{rec.summary}</p>
              <div className="mt-5 flex items-center gap-3 text-xs text-slate-500">
                <button type="button" className="rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">
                  Preview syllabus
                </button>
                <button type="button" className="rounded-full border border-slate-300 px-3 py-1 hover:border-primary/50">
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
