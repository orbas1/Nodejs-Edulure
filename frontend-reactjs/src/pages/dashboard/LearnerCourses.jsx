import { useNavigate } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';

export default function LearnerCourses() {
  const { isLearner, section: data, refresh } = useLearnerDashboardSection('courses');
  const navigate = useNavigate();

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner workspace required"
        description="Switch to your learner dashboard to manage active programs and personalised course recommendations."
      />
    );
  }

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
          <h1 className="dashboard-title">Course management</h1>
          <p className="dashboard-subtitle">
            Continue your pathways, track progress, and dive deep into lessons without leaving the control center.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="dashboard-primary-pill">
            Add learning goal
          </button>
          <button type="button" className="dashboard-pill">
            Sync calendar
          </button>
        </div>
      </div>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Active programs</h2>
        <div className="mt-5 space-y-4">
          {active.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => navigate(`${course.id}`)}
              className="w-full text-left"
            >
              <div className="dashboard-card-muted p-5 transition hover:border-primary/40 hover:bg-primary/5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="dashboard-kicker">{course.status}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{course.title}</p>
                    <p className="text-xs text-slate-600">With {course.instructor}</p>
                  </div>
                  <div className="text-right text-sm text-slate-600">
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
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Personalized recommendations</h2>
            <p className="text-sm text-slate-600">Based on your momentum, communities, and mentor sessions.</p>
          </div>
          <button type="button" className="dashboard-pill">
            Adjust filters
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {recommendations.map((rec) => (
            <div key={rec.id} className="dashboard-card-muted p-5">
              <p className="dashboard-kicker">Rating {rec.rating}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{rec.title}</p>
              <p className="mt-2 text-sm text-slate-600">{rec.summary}</p>
              <div className="mt-5 flex items-center gap-3 text-xs text-slate-600">
                <button type="button" className="dashboard-pill px-3 py-1">
                  Preview syllabus
                </button>
                <button type="button" className="dashboard-pill px-3 py-1">
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
