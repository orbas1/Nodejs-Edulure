import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import withInstructorDashboardAccess from './instructor/withInstructorDashboardAccess.jsx';

function InstructorLessonSchedule() {
  const { dashboard, refresh } = useOutletContext();
  const lessons = dashboard?.schedules?.lessons ?? [];

  if (lessons.length === 0) {
    return (
      <DashboardStateMessage
        title="No lessons scheduled"
        description="There are no upcoming cohorts or lessons in the production calendar. Refresh after scheduling sessions."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lesson schedule</h1>
          <p className="mt-2 text-sm text-slate-600">Align facilitators, assets, and comms for every upcoming session.</p>
        </div>
        <button
          type="button"
          className="dashboard-primary-pill px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Publish updates
        </button>
      </div>

      <section className="dashboard-section">
        <ul className="space-y-4">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="dashboard-card-muted p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{lesson.course}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{lesson.topic}</p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p>{lesson.date}</p>
                  <p>Facilitator {lesson.facilitator}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
                <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                  Share prep kit
                </button>
                <button type="button" className="dashboard-pill px-3 py-1 hover:border-primary/50">
                  Assign support
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default withInstructorDashboardAccess(InstructorLessonSchedule);
