import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import LearnerProgressCard from '../../components/dashboard/LearnerProgressCard.jsx';
import SkeletonPanel from '../../components/loaders/SkeletonPanel.jsx';
import usePersistentCollection from '../../hooks/usePersistentCollection.js';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import {
  createCourseGoal,
  exportTutorSchedule
} from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useMountedRef from '../../hooks/useMountedRef.js';
import LearnerSurveyPrompt from './learner/sections/LearnerSurveyPrompt.jsx';
import LearnerMonetizationSection from './learner/sections/LearnerMonetizationSection.jsx';
import LearnerGoalsSection from './learner/sections/LearnerGoalsSection.jsx';

function normaliseSurveyPrompt(source) {
  if (!source) return null;
  if (Array.isArray(source)) {
    const next = source.find((entry) => !entry?.completed && !entry?.dismissed) ?? source[0];
    return normaliseSurveyPrompt(next);
  }
  const id = source.id ?? source.surveyId ?? source.slug;
  if (!id) return null;
  return {
    id,
    title: source.title ?? source.headline ?? 'Share quick feedback',
    question: source.question ?? source.prompt ?? source.subtitle ?? '',
    scaleLabels: Array.isArray(source.scaleLabels)
      ? source.scaleLabels
      : Array.isArray(source.labels)
        ? source.labels
        : [],
    tags: Array.isArray(source.tags) ? source.tags : [],
    location: source.location ?? 'learner-dashboard',
    context: source.context ?? {}
  };
}

function normaliseMonetization(data) {
  const source = data ?? {};
  const spotlight = source.spotlight
    ? {
        title: source.spotlight.title ?? source.spotlight.headline ?? 'Grow with premium bundles',
        description:
          source.spotlight.description ?? source.spotlight.summary ??
          'Promote premium communities, tutoring, and resource bundles.'
      }
    : source.summary
      ? { title: source.summary.title ?? 'Grow with premium bundles', description: source.summary.description ?? '' }
      : null;
  const offers = Array.isArray(source.offers) ? source.offers : Array.isArray(source.recommendations) ? source.recommendations : [];
  return {
    spotlight,
    offers,
    hasContent: Boolean(spotlight) || offers.length > 0
  };
}

function normaliseGoals(goalsSource) {
  const source = goalsSource ?? {};
  const list = Array.isArray(source)
    ? source
    : Array.isArray(source.items)
      ? source.items
      : Array.isArray(source.goals)
        ? source.goals
        : [];
  const goals = list
    .filter((entry) => entry && (entry.title || entry.name))
    .map((entry) => ({
      id: entry.id ?? entry.goalId ?? entry.slug ?? entry.title ?? entry.name,
      title: entry.title ?? entry.name ?? 'Learning goal',
      description: entry.description ?? entry.summary ?? '',
      progress: entry.progress ?? entry.completion ?? 0,
      dueDate: entry.dueDate ?? entry.targetDate ?? null,
      tags: Array.isArray(entry.tags) ? entry.tags : []
    }));
  const summary = source.summary ?? source.headline ?? null;
  return { goals, summary };
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

export default function LearnerCourses() {
  const { isLearner, section: data, refresh, loading, error } = useLearnerDashboardSection('courses');
  const navigate = useNavigate();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const mounted = useMountedRef();
  const isLoading = Boolean(loading);

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
  const [orderForm, setOrderForm] = useState({
    title: '',
    amount: '',
    status: 'Processing',
    reference: '',
    purchaseDate: new Date().toISOString().slice(0, 10)
  });
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderFeedback, setOrderFeedback] = useState(null);

  useEffect(() => {
    setActiveCourses(Array.isArray(data?.active) ? data.active : []);
    setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : []);
  }, [data]);

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

  if (!data && !isLoading) {
    return (
      <DashboardStateMessage
        title="Learner courses not available"
        description="We couldn't find any active or recommended courses for your learner dashboard. Refresh to pull the latest schedule."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const disableActions = useMemo(() => pendingAction !== null || isLoading, [pendingAction, isLoading]);
  const ordersSorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aTime = new Date(a.purchaseDate ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.purchaseDate ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
  }, [orders]);

  const placeholderCourses = useMemo(
    () => Array.from({ length: 3 }).map((_, index) => ({ id: `course-placeholder-${index}` })),
    []
  );
  const placeholderRecommendations = useMemo(
    () => Array.from({ length: 2 }).map((_, index) => ({ id: `recommendation-placeholder-${index}` })),
    []
  );
  const displayActiveCourses = useMemo(
    () => (isLoading ? placeholderCourses : activeCourses),
    [activeCourses, isLoading, placeholderCourses]
  );
  const displayRecommendations = useMemo(
    () => (isLoading ? placeholderRecommendations : recommendations),
    [isLoading, placeholderRecommendations, recommendations]
  );
  const goalsData = useMemo(
    () => normaliseGoals(data?.goals ?? data?.learningGoals ?? []),
    [data?.goals, data?.learningGoals]
  );
  const surveyPrompt = useMemo(
    () => normaliseSurveyPrompt(data?.survey ?? data?.feedback?.survey ?? data?.feedback?.surveys ?? null),
    [data?.feedback?.survey, data?.feedback?.surveys, data?.survey]
  );
  const monetization = useMemo(
    () => normaliseMonetization(data?.monetization ?? null),
    [data?.monetization]
  );

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
    (course) => {
      if (!course?.id) {
        return;
      }
      navigate(`${course.id}`);
    },
    [navigate]
  );

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
          {displayActiveCourses.length ? (
            displayActiveCourses.map((course, index) => (
              <SkeletonPanel
                key={course.id ?? `course-${index}`}
                isLoading={isLoading}
                variant="muted"
                className="transition hover:border-primary/40 hover:bg-primary/5"
                hasHeading
              >
                {!isLoading ? (
                  <LearnerProgressCard
                    course={course}
                    onResume={!disableActions ? () => handleOpenCourse(course) : undefined}
                    onViewDetails={!disableActions ? () => handleOpenCourse(course) : undefined}
                    compact
                  />
                ) : null}
              </SkeletonPanel>
            ))
          ) : (
            <p className="text-sm text-slate-500">Add a course or community program to see progress here.</p>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Personalized recommendations</h2>
            <p className="text-sm text-slate-600">Based on your momentum, communities, and mentor sessions.</p>
          </div>
          <button type="button" className="dashboard-pill" disabled={isLoading}>
            Adjust filters
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {displayRecommendations.length ? (
            displayRecommendations.map((rec, index) => (
              <SkeletonPanel key={rec.id ?? `rec-${index}`} isLoading={isLoading} variant="muted">
                {!isLoading ? (
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <p className="dashboard-kicker">{rec.rating ? `Rating ${rec.rating}` : 'Recommended for you'}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{rec.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{rec.summary}</p>
                    </div>
                    <div className="mt-5 flex items-center gap-3 text-xs text-slate-600">
                      <button type="button" className="dashboard-pill px-3 py-1" disabled={disableActions}>
                        Preview syllabus
                      </button>
                      <button type="button" className="dashboard-pill px-3 py-1" disabled={disableActions}>
                        Add to queue
                      </button>
                    </div>
                  </div>
                ) : null}
              </SkeletonPanel>
            ))
          ) : (
            <p className="text-sm text-slate-500">Complete lessons to unlock refreshed recommendations.</p>
          )}
        </div>
      </section>

      {(goalsData.goals.length || surveyPrompt || monetization.hasContent) && (
        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {goalsData.goals.length ? (
            <LearnerGoalsSection
              goals={goalsData.goals}
              summary={goalsData.summary ?? 'Track the milestones you set across courses and cohorts.'}
              className="lg:col-span-2"
            />
          ) : null}
          {surveyPrompt ? (
            <LearnerSurveyPrompt
              survey={surveyPrompt}
              loading={isLoading && !surveyPrompt}
              onDismiss={() => refresh?.()}
            />
          ) : null}
          {monetization.hasContent ? (
            <LearnerMonetizationSection
              spotlight={monetization.spotlight}
              offers={monetization.offers}
            />
          ) : null}
        </section>
      )}

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
