import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { syncCourseGoal, syncCourseCalendar } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';

export default function LearnerCourses() {
  const { isLearner, section: data, refresh, refreshAfterAction } = useLearnerDashboardSection('courses');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
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

  const handleAddGoal = async () => {
    if (!token) {
      setStatus({ type: 'error', message: 'Sign in to add a personalised learning goal.' });
      return;
    }
    setPendingAction('goal');
    setStatus({ type: 'pending', message: 'Syncing your learning goal…' });
    try {
      const result = await refreshAfterAction(() =>
        syncCourseGoal({
          token,
          payload: {
            title: 'Stay on pace for graduation',
            description: 'Complete current cohort milestones on schedule',
            targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      );
      const goalTitle = result?.goal?.title ?? 'Learning goal';
      setStatus({ type: 'success', message: `${goalTitle} synced successfully.` });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to sync your goal right now.'
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleSyncCalendar = async () => {
    if (!token) {
      setStatus({ type: 'error', message: 'Sign in to sync your learning calendar.' });
      return;
    }
    setPendingAction('calendar');
    setStatus({ type: 'pending', message: 'Connecting your learning calendar…' });
    try {
      const result = await refreshAfterAction(() =>
        syncCourseCalendar({
          token,
          payload: { provider: 'google', calendarId: 'primary' }
        })
      );
      const provider = result?.provider ?? 'calendar';
      setStatus({ type: 'success', message: `Calendar synced with ${provider}.` });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to sync your calendar right now.'
      });
    } finally {
      setPendingAction(null);
    }
  };

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
          <button
            type="button"
            className="dashboard-primary-pill"
            onClick={handleAddGoal}
            disabled={pendingAction === 'goal'}
            aria-busy={pendingAction === 'goal'}
          >
            {pendingAction === 'goal' ? 'Syncing…' : 'Add learning goal'}
          </button>
          <button
            type="button"
            className="dashboard-pill"
            onClick={handleSyncCalendar}
            disabled={pendingAction === 'calendar'}
            aria-busy={pendingAction === 'calendar'}
          >
            {pendingAction === 'calendar' ? 'Connecting…' : 'Sync calendar'}
          </button>
        </div>
      </div>

      {status ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-3xl border px-5 py-4 text-sm ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : status.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-primary/20 bg-primary/5 text-primary'
          }`}
        >
          {status.message}
        </div>
      ) : null}

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
