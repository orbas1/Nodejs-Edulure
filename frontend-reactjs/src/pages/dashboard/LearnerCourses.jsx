import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import { createCourseGoal, exportTutorSchedule } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LearnerCourses() {
  const { isLearner, section: data, refresh, loading, error } = useLearnerDashboardSection('courses');
  const navigate = useNavigate();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [activeCourses, setActiveCourses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    setActiveCourses(Array.isArray(data?.active) ? data.active : []);
    setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : []);
  }, [data]);

  useEffect(() => {
    if (error) {
      setStatusMessage({
        type: 'error',
        message: error.message ?? 'We were unable to load your course workspace.'
      });
    }
  }, [error]);

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
        description="Switch to your learner dashboard to manage active programs and personalised course recommendations."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading learner courses"
        description="We are pulling your programmes, cohorts, and personalised recommendations."
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

  const disableActions = useMemo(() => pendingAction !== null, [pendingAction]);

  const handleCreateGoal = useCallback(async () => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to create a new learning goal.' });
      return;
    }

    const [primaryCourse] = activeCourses;
    if (!primaryCourse) {
      setStatusMessage({ type: 'error', message: 'Enroll in a course to create a learning goal.' });
      return;
    }

    setPendingAction('goal');
    setStatusMessage({ type: 'pending', message: 'Creating learning goal…' });
    try {
      const response = await createCourseGoal({
        token,
        courseId: primaryCourse.id ?? primaryCourse.slug ?? 'course',
        payload: { target: 'Complete next module', dueDate: new Date().toISOString() }
      });
      setStatusMessage({
        type: 'success',
        message: response?.message ?? 'Learning goal created.'
      });
      setActiveCourses((current) =>
        current.map((course) =>
          course.id === primaryCourse.id
            ? { ...course, goalStatus: 'In progress', goalReference: response?.data?.reference }
            : course
        )
      );
    } catch (goalError) {
      setStatusMessage({
        type: 'error',
        message:
          goalError instanceof Error ? goalError.message : 'We were unable to create your learning goal.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [activeCourses, token]);

  const handleSyncCalendar = useCallback(async () => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to sync your course calendar.' });
      return;
    }

    setPendingAction('calendar');
    setStatusMessage({ type: 'pending', message: 'Preparing calendar sync…' });
    try {
      const response = await exportTutorSchedule({ token });
      const url = response?.data?.meta?.downloadUrl ?? null;
      setStatusMessage({
        type: 'success',
        message: url ? `Calendar export ready. Download from ${url}.` : 'Calendar sync prepared.'
      });
    } catch (calendarError) {
      setStatusMessage({
        type: 'error',
        message:
          calendarError instanceof Error ? calendarError.message : 'We were unable to prepare your calendar sync.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [token]);

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
            onClick={handleCreateGoal}
            disabled={disableActions}
          >
            Add learning goal
          </button>
          <button
            type="button"
            className="dashboard-pill"
            onClick={handleSyncCalendar}
            disabled={disableActions}
          >
            Sync calendar
          </button>
        </div>
      </div>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Active programs</h2>
        <div className="mt-5 space-y-4">
          {activeCourses.map((course) => (
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
                    {course.goalStatus ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary">
                        Goal · {course.goalStatus}
                      </p>
                    ) : null}
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

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-3xl border px-5 py-4 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : statusMessage.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-primary/20 bg-primary/5 text-primary'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}
    </div>
  );
}
