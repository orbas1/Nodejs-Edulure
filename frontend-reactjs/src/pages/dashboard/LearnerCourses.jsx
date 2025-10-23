import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import LearnerProgressCard from '../../components/dashboard/LearnerProgressCard.jsx';
import { CourseModuleNavigator } from '../../components/course/CourseModuleNavigator.jsx';
import usePersistentCollection from '../../hooks/usePersistentCollection.js';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import { createCourseGoal, exportTutorSchedule } from '../../api/learnerDashboardApi.js';
import useLearnerProgress from '../../hooks/useLearnerProgress.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useMountedRef from '../../hooks/useMountedRef.js';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

function formatRelativeTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSeconds <= 30) return 'just now';
  if (diffSeconds < 120) return 'about a minute ago';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
  if (diffSeconds < 7200) return 'about an hour ago';
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
  if (diffSeconds < 172800) return 'yesterday';
  return `${Math.floor(diffSeconds / 86400)} days ago`;
}

export default function LearnerCourses() {
  const { isLearner, section: data, refresh, loading, error } = useLearnerDashboardSection('courses');
  const navigate = useNavigate();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const mounted = useMountedRef();

  const storageKey = useMemo(
    () => `edulure.learner.orders.v1:${session?.user?.id ?? 'anonymous'}`,
    [session?.user?.id]
  );
  const initialOrders = useMemo(() => (Array.isArray(data?.orders) ? data.orders : []), [data?.orders]);
  const {
    items: orders,
    addItem: addOrder,
    updateItem: updateOrder,
    removeItem: removeOrder,
    replaceItems: replaceOrders,
    reset: resetOrders
  } = usePersistentCollection(storageKey, initialOrders);

  const [activeCourses, setActiveCourses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [orderForm, setOrderForm] = useState({
    title: '',
    amount: '',
    status: 'Processing',
    reference: '',
    purchaseDate: new Date().toISOString().slice(0, 10)
  });
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderFeedback, setOrderFeedback] = useState(null);
  const {
    progress: courseProgressSummaries,
    loading: progressLoading,
    error: progressError,
    refresh: refreshLearnerProgress,
    stale: progressStale,
    lastUpdatedAt: progressLastUpdatedAt,
    source: progressSource
  } = useLearnerProgress();

  useEffect(() => {
    setActiveCourses(Array.isArray(data?.active) ? data.active : []);
    setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : []);
  }, [data]);

  useEffect(() => {
    if (!expandedCourseId) {
      return;
    }
    const exists = Array.isArray(activeCourses)
      ? activeCourses.some((course) => course?.id === expandedCourseId)
      : false;
    if (!exists) {
      setExpandedCourseId(null);
    }
  }, [activeCourses, expandedCourseId]);

  useEffect(() => {
    if (!Array.isArray(data?.orders) || data.orders.length === 0) {
      return;
    }
    const missing = data.orders.filter(
      (order) => order?.id && !orders.some((existing) => existing.id === order.id)
    );
    if (missing.length) {
      replaceOrders([...orders, ...missing]);
    }
  }, [data?.orders, orders, replaceOrders]);

  useEffect(() => {
    if (error) {
      setStatusMessage({
        type: 'error',
        message: error.message ?? 'We were unable to load your course workspace.'
      });
    }
  }, [error]);

  useEffect(() => {
    if (progressError) {
      setStatusMessage({
        type: 'warning',
        message: progressError.message ?? 'Progress data may be out of date. Refresh to try again.'
      });
    }
  }, [progressError]);

  useEffect(() => {
    if (!orderFeedback) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setOrderFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [orderFeedback]);

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
  const ordersSorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aTime = new Date(a.purchaseDate ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.purchaseDate ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
  }, [orders]);

  const progressByCourseId = useMemo(() => {
    const map = new Map();
    if (Array.isArray(courseProgressSummaries)) {
      courseProgressSummaries.forEach((summary) => {
        if (summary?.courseId) {
          map.set(summary.courseId, summary);
        }
      });
    }
    return map;
  }, [courseProgressSummaries]);

  const goalsByCourseId = useMemo(() => {
    const map = new Map();
    if (Array.isArray(data?.goals)) {
      data.goals.forEach((goal) => {
        if (!goal) {
          return;
        }
        const key = goal.courseId ?? goal.id ?? null;
        if (key) {
          map.set(key, goal);
        }
      });
    }
    return map;
  }, [data?.goals]);

  const revenueByCourseId = useMemo(() => {
    const map = new Map();
    const promotions = Array.isArray(data?.promotions) ? data.promotions : [];
    promotions.forEach((promotion) => {
      if (!promotion) {
        return;
      }
      const key = promotion.courseId ?? promotion.id ?? null;
      if (key) {
        map.set(key, promotion);
      }
    });
    return map;
  }, [data?.promotions]);

  const enrichedCourses = useMemo(
    () =>
      activeCourses.map((course) => {
        const summary = progressByCourseId.get(course.id);
        const goal = goalsByCourseId.get(course.courseId ?? course.id) ?? null;
        const promotion = revenueByCourseId.get(course.courseId ?? course.id) ?? null;
        const rawProgress = summary?.progressPercent ?? course.progress ?? goal?.progressPercent ?? 0;
        const progressPercent = Number.isFinite(Number(rawProgress))
          ? Math.max(0, Math.min(100, Number(rawProgress)))
          : 0;
        let nextLessonLabel = course.nextLesson ?? goal?.nextStep ?? 'Keep your streak going';
        if (summary?.nextLesson) {
          const moduleTitle = Array.isArray(summary.modules)
            ? summary.modules.find((module) => module.id === summary.nextLesson.moduleId)?.title ?? null
            : null;
          nextLessonLabel = moduleTitle
            ? `${moduleTitle} · ${summary.nextLesson.title}`
            : summary.nextLesson.title ?? nextLessonLabel;
        }
        return {
          ...course,
          goal,
          revenueOpportunity: promotion,
          progressPercent,
          nextLessonLabel,
          completedLessons: summary?.completedLessons ?? course.completedLessons ?? null,
          totalLessons: summary?.totalLessons ?? course.totalLessons ?? null,
          modules: Array.isArray(summary?.modules) ? summary.modules : [],
          summaryNextLesson: summary?.nextLesson ?? null
        };
      }),
    [activeCourses, goalsByCourseId, progressByCourseId, revenueByCourseId]
  );

  const showProgressSkeletons = progressLoading && enrichedCourses.length === 0;

  const resetOrderForm = useCallback(() => {
    setOrderForm({
      title: '',
      amount: '',
      status: 'Processing',
      reference: '',
      purchaseDate: new Date().toISOString().slice(0, 10)
    });
    setEditingOrderId(null);
  }, []);

  const handleOrderChange = useCallback((event) => {
    const { name, value } = event.target;
    setOrderForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleEditOrder = useCallback((order) => {
    setEditingOrderId(order.id);
    setOrderForm({
      title: order.title ?? '',
      amount: order.amount != null ? String(order.amount) : '',
      status: order.status ?? 'Processing',
      reference: order.reference ?? '',
      purchaseDate: order.purchaseDate ? order.purchaseDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
    });
  }, []);

  const handleOrderSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const rawAmount = Number.parseFloat(orderForm.amount);
      const amount = Number.isFinite(rawAmount) ? Math.round(rawAmount * 100) / 100 : 0;
      const payload = {
        title: orderForm.title.trim() || 'Course order',
        amount,
        status: orderForm.status,
        reference: orderForm.reference.trim() || undefined,
        purchaseDate: orderForm.purchaseDate || new Date().toISOString().slice(0, 10)
      };
      if (editingOrderId) {
        updateOrder(editingOrderId, payload);
        setOrderFeedback('Order updated.');
      } else {
        addOrder(payload);
        setOrderFeedback('Order added to your records.');
      }
      resetOrderForm();
    },
    [addOrder, editingOrderId, orderForm, resetOrderForm, updateOrder]
  );

  const handleDeleteOrder = useCallback(
    (id) => {
      const confirmed = window.confirm('Remove this course order from your history?');
      if (!confirmed) return;
      removeOrder(id);
      setOrderFeedback('Order removed.');
    },
    [removeOrder]
  );

  const handleToggleOrderStatus = useCallback(
    (order) => {
      const nextStatus = order.status === 'Paid' ? 'Processing' : 'Paid';
      updateOrder(order.id, { status: nextStatus });
      setOrderFeedback(
        nextStatus === 'Paid' ? 'Marked order as paid.' : 'Order moved back to processing.'
      );
    },
    [updateOrder]
  );

  const handleResetOrders = useCallback(() => {
    const confirmed = window.confirm('Clear the locally stored course orders on this device?');
    if (!confirmed) return;
    resetOrders();
    setOrderFeedback('Order history cleared.');
    resetOrderForm();
  }, [resetOrders, resetOrderForm]);

  const handleOpenCourse = useCallback(
    (courseId) => {
      if (!courseId) return;
      navigate(`${courseId}`);
    },
    [navigate]
  );

  const toggleExpandedCourse = useCallback((courseId) => {
    setExpandedCourseId((current) => (current === courseId ? null : courseId));
  }, []);

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
      if (mounted.current) {
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
      }
    } catch (goalError) {
      if (mounted.current) {
        setStatusMessage({
          type: 'error',
          message:
            goalError instanceof Error ? goalError.message : 'We were unable to create your learning goal.'
        });
      }
    } finally {
      if (mounted.current) {
        setPendingAction(null);
      }
    }
  }, [activeCourses, mounted, setActiveCourses, token]);

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
      if (mounted.current) {
        setStatusMessage({
          type: 'success',
          message: url ? `Calendar export ready. Download from ${url}.` : 'Calendar sync prepared.'
        });
      }
    } catch (calendarError) {
      if (mounted.current) {
        setStatusMessage({
          type: 'error',
          message:
            calendarError instanceof Error ? calendarError.message : 'We were unable to prepare your calendar sync.'
        });
      }
    } finally {
      if (mounted.current) {
        setPendingAction(null);
      }
    }
  }, [mounted, token]);

  const progressSnapshotLabel = progressLastUpdatedAt ? formatRelativeTimestamp(progressLastUpdatedAt) : null;
  const progressUsingCache = progressSource !== 'network' && progressSource !== 'initial';
  let progressStatusMessage = null;
  if (progressUsingCache) {
    progressStatusMessage = progressSnapshotLabel
      ? `Showing offline snapshot from ${progressSnapshotLabel}. Refresh to sync.`
      : 'Showing offline snapshot stored on this device. Refresh to sync.';
  } else if (progressStale && progressSnapshotLabel) {
    progressStatusMessage = `Progress snapshot from ${progressSnapshotLabel}. Refresh if you worked offline.`;
  } else if (progressSnapshotLabel) {
    progressStatusMessage = `Progress synced ${progressSnapshotLabel}.`;
  }
  const progressStatusTone = progressUsingCache || progressStale ? 'text-amber-600' : 'text-slate-400';

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Active programs</h2>
          <button
            type="button"
            className="dashboard-pill px-3 py-1 text-xs font-semibold"
            onClick={() => refreshLearnerProgress()}
            disabled={progressLoading}
          >
            {progressLoading ? 'Syncing…' : 'Refresh progress'}
          </button>
        </div>
        <div className="mt-3 space-y-1 text-xs">
          <p className="text-slate-500">
            {progressLoading
              ? 'Updating lesson completions…'
              : `Tracking ${enrichedCourses.length} active ${enrichedCourses.length === 1 ? 'program' : 'programs'}.`}
          </p>
          {progressStatusMessage ? (
            <p className={progressStatusTone}>{progressStatusMessage}</p>
          ) : null}
        </div>
        <div className="mt-4 space-y-4">
          {showProgressSkeletons
            ? Array.from({ length: Math.max(1, Math.min(3, activeCourses.length || 2)) }).map((_, index) => (
                <LearnerProgressCard key={`progress-skeleton-${index}`} loading />
              ))
            : enrichedCourses.map((course) => {
                const expanded = expandedCourseId === course.id;
                const goal = course.goal ?? null;
                const revenue = course.revenueOpportunity
                  ? {
                      headline:
                        course.revenueOpportunity.headline ??
                        course.revenueOpportunity.title ??
                        'Unlock learner rewards',
                      caption:
                        course.revenueOpportunity.caption ??
                        course.revenueOpportunity.body ??
                        null,
                      action:
                        course.revenueOpportunity.actionLabel && course.revenueOpportunity.actionHref
                          ? {
                              label: course.revenueOpportunity.actionLabel,
                              href: course.revenueOpportunity.actionHref
                            }
                          : course.revenueOpportunity.action?.label && course.revenueOpportunity.action?.href
                            ? {
                                label: course.revenueOpportunity.action.label,
                                href: course.revenueOpportunity.action.href
                              }
                            : null
                    }
                  : null;

                const goalPayload = goal
                  ? {
                      statusLabel: goal.status ?? goal.statusLabel ?? null,
                      dueLabel: goal.dueLabel ?? goal.dueDate ?? null,
                      focusMinutesPerWeek: Number.isFinite(Number(goal.focusMinutesPerWeek))
                        ? Number(goal.focusMinutesPerWeek)
                        : null,
                      nextStep: goal.nextStep ?? goal.upNext ?? null
                    }
                  : null;

                return (
                  <LearnerProgressCard
                    key={course.id}
                    title={course.title}
                    status={course.status}
                    instructor={course.instructor}
                    progressPercent={course.progressPercent}
                    nextLabel={course.nextLessonLabel}
                    goal={goalPayload}
                    revenue={revenue}
                    primaryAction={{
                      label: 'Open course',
                      onClick: () => handleOpenCourse(course.id),
                      disabled: disableActions
                    }}
                    secondaryAction={{
                      label: expanded ? 'Hide modules' : 'View modules',
                      onClick: () => toggleExpandedCourse(course.id),
                      disabled: disableActions
                    }}
                    meta={
                      progressLastUpdatedAt
                        ? { lastUpdatedLabel: formatRelativeTimestamp(progressLastUpdatedAt) }
                        : null
                    }
                  >
                    {course.completedLessons != null && course.totalLessons != null ? (
                      <p className="text-xs text-slate-500">
                        {course.completedLessons}/{course.totalLessons} lessons completed
                      </p>
                    ) : null}
                    {expanded ? (
                      <div className="mt-4 space-y-4">
                        <CourseModuleNavigator
                          modules={course.modules}
                          activeLessonId={course.summaryNextLesson?.id ?? null}
                          emptyLabel="Modules will appear here once this course publishes its curriculum."
                          onLessonSelect={() => handleOpenCourse(course.id)}
                        />
                      </div>
                    ) : null}
                  </LearnerProgressCard>
                );
              })}
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

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Course orders & receipts</h2>
            <p className="text-sm text-slate-600">
              Log purchases, scholarships, and independent enrolments so finance conversations stay tidy.
            </p>
          </div>
          <button type="button" className="dashboard-pill" onClick={handleResetOrders}>
            Clear history
          </button>
        </div>

        <form
          onSubmit={handleOrderSubmit}
          className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5"
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Course
            <input
              type="text"
              name="title"
              value={orderForm.title}
              onChange={handleOrderChange}
              required
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Amount
            <input
              type="number"
              name="amount"
              min="0"
              step="0.01"
              value={orderForm.amount}
              onChange={handleOrderChange}
              required
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Purchase date
            <input
              type="date"
              name="purchaseDate"
              value={orderForm.purchaseDate}
              onChange={handleOrderChange}
              required
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Status
            <select
              name="status"
              value={orderForm.status}
              onChange={handleOrderChange}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="Processing">Processing</option>
              <option value="Paid">Paid</option>
              <option value="Refunded">Refunded</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Reference
            <input
              type="text"
              name="reference"
              value={orderForm.reference}
              onChange={handleOrderChange}
              placeholder="Optional"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <div className="flex items-center justify-end gap-2 md:col-span-2 lg:col-span-5">
            {editingOrderId ? (
              <button type="button" className="dashboard-pill" onClick={resetOrderForm}>
                Cancel edit
              </button>
            ) : null}
            <button type="submit" className="dashboard-primary-pill">
              {editingOrderId ? 'Save order' : 'Add order'}
            </button>
          </div>
        </form>

        {orderFeedback ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
          >
            {orderFeedback}
          </p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          {ordersSorted.length ? (
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {ordersSorted.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{order.title}</td>
                    <td className="px-4 py-3">{CURRENCY_FORMATTER.format(order.amount ?? 0)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          order.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : order.status === 'Refunded'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {order.purchaseDate ? new Date(order.purchaseDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{order.reference ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="dashboard-pill"
                          onClick={() => handleToggleOrderStatus(order)}
                        >
                          {order.status === 'Paid' ? 'Mark processing' : 'Mark paid'}
                        </button>
                        <button
                          type="button"
                          className="dashboard-pill"
                          onClick={() => handleEditOrder(order)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="dashboard-pill text-rose-600 hover:border-rose-200 hover:text-rose-700"
                          onClick={() => handleDeleteOrder(order.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-slate-500">
              No course orders recorded yet. Capture purchases or scholarships to see them here.
            </p>
          )}
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
