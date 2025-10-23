import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircleIcon, QueueListIcon } from '@heroicons/react/24/outline';

import CourseCard from '../../components/courses/CourseCard.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import usePersistentCollection from '../../hooks/usePersistentCollection.js';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import { createCourseGoal, exportTutorSchedule } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useMountedRef from '../../hooks/useMountedRef.js';
import {
  normalizeCourseDownloads,
  normalizeCoursePreview,
  normalizeCourseProgress,
  normalizeCourseRating,
  normalizeCourseTags,
  normalizeUpsellBadges,
  parseCourseMetadata
} from '../../utils/courseResources.js';

function formatCoursePrice(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    const amount = Number(value.amount ?? value.value);
    const code = value.currency ?? currency;
    if (Number.isFinite(amount)) {
      try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
      } catch (_error) {
        return `${code} ${amount}`;
      }
    }
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(numeric);
  } catch (_error) {
    return `${currency} ${numeric}`;
  }
}

function normalizeActiveCourseCard(course, index = 0) {
  const metadata = parseCourseMetadata(course?.metadata);
  const preview = normalizeCoursePreview(metadata, {
    previewUrl: course?.previewUrl ?? course?.promoVideoUrl ?? course?.trailerUrl ?? null,
    previewThumbnailUrl: course?.previewThumbnailUrl ?? course?.thumbnailUrl ?? null,
    nextLesson: course?.nextLesson ?? metadata.nextLesson ?? null,
    previewDuration: course?.previewDuration,
    previewAction: course?.previewAction
  });
  const downloads = normalizeCourseDownloads(metadata, {
    downloads: course?.downloads ?? course?.resources ?? metadata.downloads,
    attachments: course?.attachments,
    syllabusUrl: course?.syllabusUrl ?? metadata.syllabusUrl
  });
  const upsellBadges = normalizeUpsellBadges(metadata, course ?? {});
  const tags = normalizeCourseTags(metadata, course ?? {});
  const { rating, ratingCount } = normalizeCourseRating(course ?? {}, metadata);
  const progress = normalizeCourseProgress(course ?? {}, metadata);
  const price = formatCoursePrice(course?.price ?? metadata.price, metadata.priceCurrency ?? course?.priceCurrency ?? 'USD');

  return {
    id: course?.id ?? course?.slug ?? course?.publicId ?? `active-course-${index}`,
    title: course?.title ?? metadata.title ?? 'Course',
    subtitle: course?.instructor ? `With ${course.instructor}` : metadata.subtitle ?? course?.category ?? null,
    description: course?.summary ?? metadata.description ?? '',
    status: course?.status ?? metadata.status ?? 'Active',
    level: course?.level ?? metadata.level ?? null,
    deliveryFormat: course?.deliveryFormat ?? metadata.deliveryFormat ?? null,
    price,
    priceCurrency: metadata.priceCurrency ?? course?.priceCurrency ?? 'USD',
    progress,
    nextLesson: course?.nextLesson ?? metadata.nextLesson ?? preview.title ?? null,
    goalStatus: course?.goalStatus ?? metadata.goalStatus ?? null,
    goalReference: course?.goalReference ?? metadata.goalReference ?? null,
    rating: rating ?? course?.rating ?? null,
    ratingCount: ratingCount ?? course?.ratingCount ?? null,
    thumbnailUrl: course?.thumbnailUrl ?? metadata.thumbnailUrl ?? preview.thumbnailUrl ?? null,
    previewThumbnailUrl: preview.thumbnailUrl,
    previewTitle: preview.title,
    previewUrl: preview.url,
    previewDuration: preview.duration,
    previewAction: preview.action,
    downloads,
    upsellBadges,
    tags,
    skills: Array.isArray(course?.skills) ? course.skills : metadata.skills ?? [],
    slug: course?.slug ?? metadata.slug ?? null,
    raw: course ?? {}
  };
}

function normalizeRecommendationCourse(course, index = 0) {
  const metadata = parseCourseMetadata(course?.metadata);
  const preview = normalizeCoursePreview(metadata, {
    previewUrl: course?.previewUrl ?? course?.promoVideoUrl ?? course?.trailerUrl ?? null,
    previewThumbnailUrl: course?.previewThumbnailUrl ?? course?.thumbnailUrl ?? null,
    nextLesson: metadata.nextLesson ?? course?.nextSession ?? null,
    previewDuration: course?.previewDuration,
    previewAction: course?.previewAction
  });
  const downloads = normalizeCourseDownloads(metadata, {
    downloads: course?.downloads ?? metadata.downloads,
    attachments: course?.attachments ?? metadata.attachments,
    syllabusUrl: course?.syllabusUrl ?? metadata.syllabusUrl
  });
  const upsellBadges = normalizeUpsellBadges(metadata, course ?? {});
  const tags = normalizeCourseTags(metadata, course ?? {});
  const { rating, ratingCount } = normalizeCourseRating(course ?? {}, metadata);
  const price = formatCoursePrice(
    course?.price ?? course?.priceAmount ?? metadata.price,
    metadata.priceCurrency ?? course?.priceCurrency ?? 'USD'
  );

  return {
    id: course?.id ?? course?.slug ?? course?.publicId ?? `recommendation-${index}`,
    title: course?.title ?? metadata.title ?? 'Recommended course',
    subtitle: course?.subtitle ?? metadata.subtitle ?? course?.category ?? null,
    description: course?.summary ?? metadata.description ?? '',
    status: course?.status ?? metadata.status ?? 'Recommended',
    level: course?.level ?? metadata.level ?? null,
    deliveryFormat: course?.deliveryFormat ?? metadata.deliveryFormat ?? null,
    price,
    priceCurrency: metadata.priceCurrency ?? course?.priceCurrency ?? 'USD',
    rating: course?.rating ?? rating ?? null,
    ratingCount: course?.ratingCount ?? ratingCount ?? null,
    thumbnailUrl: course?.thumbnailUrl ?? metadata.thumbnailUrl ?? preview.thumbnailUrl ?? null,
    previewThumbnailUrl: preview.thumbnailUrl,
    previewTitle: preview.title,
    previewUrl: preview.url,
    previewDuration: preview.duration,
    previewAction: preview.action,
    downloads,
    upsellBadges,
    tags,
    skills: Array.isArray(course?.skills) ? course.skills : metadata.skills ?? [],
    nextLesson: course?.nextSession ?? metadata.nextLesson ?? null,
    slug: course?.slug ?? metadata.slug ?? null,
    raw: course ?? {}
  };
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

  const normalizedActiveCourses = useMemo(
    () => activeCourses.map((course, index) => normalizeActiveCourseCard(course, index)),
    [activeCourses]
  );
  const normalizedRecommendations = useMemo(
    () => recommendations.map((course, index) => normalizeRecommendationCourse(course, index)),
    [recommendations]
  );

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

  const handleCreateGoal = useCallback(
    async (targetCourse) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to create a new learning goal.' });
        return;
      }

      const [fallbackCourse] = activeCourses;
      const courseTarget = targetCourse ?? fallbackCourse;
      if (!courseTarget) {
        setStatusMessage({ type: 'error', message: 'Enroll in a course to create a learning goal.' });
        return;
      }

      setPendingAction('goal');
      setStatusMessage({
        type: 'pending',
        message: `Creating learning goal for ${courseTarget.title ?? 'your course'}…`
      });
      try {
        const response = await createCourseGoal({
          token,
          courseId: courseTarget.id ?? courseTarget.slug ?? 'course',
          payload: { target: 'Complete next module', dueDate: new Date().toISOString() }
        });
        if (mounted.current) {
          setStatusMessage({
            type: 'success',
            message: response?.message ?? 'Learning goal created.'
          });
          setActiveCourses((current) =>
            current.map((course) =>
              course.id === courseTarget.id
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
    },
    [activeCourses, mounted, setActiveCourses, token]
  );

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

  const handleResumeCourseCard = useCallback(
    (course) => {
      const target = course?.raw ?? course;
      const courseId = target?.id ?? target?.slug ?? target?.publicId;
      if (!courseId) {
        return;
      }
      navigate(String(courseId));
    },
    [navigate]
  );

  const handlePreviewCourseCard = useCallback(
    (course) => {
      if (course?.previewAction) {
        course.previewAction(course.raw ?? course);
        return;
      }
      if (course?.previewUrl) {
        window.open(course.previewUrl, '_blank', 'noopener,noreferrer');
        setStatusMessage({
          type: 'success',
          message: `Opening preview for ${course.title ?? 'course'} in a new tab.`
        });
        return;
      }
      setStatusMessage({
        type: 'pending',
        message: 'Preview not available yet. We will notify you once it is ready.'
      });
    },
    [setStatusMessage]
  );

  const handleGoalAction = useCallback(
    (course) => {
      if (course.goalReference) {
        setStatusMessage({
          type: 'success',
          message: `Goal ${course.goalReference} is already tracking. Keep going!`
        });
        return;
      }
      if (course.goalStatus) {
        setStatusMessage({
          type: 'pending',
          message: `Current goal status: ${course.goalStatus}. Update it from the course workspace to keep momentum.`
        });
        return;
      }
      handleCreateGoal(course.raw ?? course);
    },
    [handleCreateGoal, setStatusMessage]
  );

  const handleAddRecommendation = useCallback(
    (course) => {
      setStatusMessage({
        type: 'success',
        message: `${course.title ?? 'Course'} has been added to your queue. We will remind you when enrolment opens.`
      });
    },
    [setStatusMessage]
  );

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
          {normalizedActiveCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              variant="dashboard"
              onSelect={() => handleResumeCourseCard(course)}
              primaryAction={{
                label: 'Resume course',
                icon: PlayCircleIcon,
                onClick: () => handleResumeCourseCard(course)
              }}
              secondaryActions={[
                course.previewUrl || course.previewAction
                  ? {
                      label: 'Preview next lesson',
                      icon: PlayCircleIcon,
                      onClick: () => handlePreviewCourseCard(course)
                    }
                  : null,
                course.goalStatus || course.goalReference
                  ? {
                      label: course.goalStatus ? `Goal · ${course.goalStatus}` : 'View goal',
                      onClick: () => handleGoalAction(course)
                    }
                  : {
                      label: 'Create goal',
                      onClick: () => handleGoalAction(course)
                    }
              ].filter(Boolean)}
            />
          ))}
          {normalizedActiveCourses.length === 0 ? (
            <p className="text-sm text-slate-500">
              You do not have any active programs yet. Explore the recommendations below to begin your next journey.
            </p>
          ) : null}
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
          {normalizedRecommendations.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              variant="recommendation"
              onSelect={() => handlePreviewCourseCard(course)}
              primaryAction={{
                label: 'Add to queue',
                icon: QueueListIcon,
                onClick: () => handleAddRecommendation(course)
              }}
              secondaryActions={[
                course.previewUrl || course.previewAction
                  ? {
                      label: 'Preview syllabus',
                      icon: PlayCircleIcon,
                      onClick: () => handlePreviewCourseCard(course)
                    }
                  : null,
                course.slug
                  ? { label: 'View details', href: `/courses/${course.slug}` }
                  : null
              ].filter(Boolean)}
            />
          ))}
          {normalizedRecommendations.length === 0 ? (
            <p className="text-sm text-slate-500">
              No personalised recommendations yet. Engage with communities and tutoring to unlock new suggestions.
            </p>
          ) : null}
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
