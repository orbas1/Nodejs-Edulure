import {
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import useLearnerStudyPlan from '../../hooks/useLearnerStudyPlan.js';

const toneStyles = {
  positive: {
    container: 'border-emerald-200 bg-emerald-50/90',
    label: 'text-emerald-600'
  },
  warning: {
    container: 'border-amber-200 bg-amber-50',
    label: 'text-amber-600'
  },
  alert: {
    container: 'border-rose-200 bg-rose-50',
    label: 'text-rose-600'
  },
  primary: {
    container: 'border-primary/30 bg-primary/5',
    label: 'text-primary'
  },
  neutral: {
    container: 'border-slate-200 bg-slate-50',
    label: 'text-slate-500'
  },
  muted: {
    container: 'border-slate-200 bg-slate-100',
    label: 'text-slate-500'
  }
};

const statusPills = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Submitted: 'bg-sky-100 text-sky-700',
  'Awaiting grading': 'bg-sky-100 text-sky-700',
  'Due soon': 'bg-amber-100 text-amber-700',
  Overdue: 'bg-rose-100 text-rose-700',
  'Past due': 'bg-rose-100 text-rose-700',
  Scheduled: 'bg-slate-100 text-slate-600'
};

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function toLocalInputValue(value) {
  const date = toDate(value);
  if (!date) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function normaliseMaterials(materials) {
  if (!materials) return [];
  if (Array.isArray(materials)) {
    return materials.filter(Boolean);
  }
  if (typeof materials === 'string') {
    return materials
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function SummaryCard({ metric }) {
  const tone = toneStyles[metric.tone] ?? toneStyles.neutral;
  return (
    <div className={`dashboard-card border ${tone.container} p-5 transition hover:shadow-md`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone.label}`}>{metric.label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
      {metric.context ? <p className="mt-3 text-sm text-slate-600">{metric.context}</p> : null}
    </div>
  );
}

SummaryCard.propTypes = {
  metric: PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    context: PropTypes.string,
    tone: PropTypes.string
  }).isRequired
};

function StatusBadge({ status }) {
  if (!status) return null;
  const tone = statusPills[status] ?? 'bg-slate-100 text-slate-600';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

StatusBadge.propTypes = {
  status: PropTypes.string
};

StatusBadge.defaultProps = {
  status: undefined
};

function AssessmentList({ title, items, emptyLabel }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs uppercase tracking-wide text-slate-400">{items.length} items</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  {item.course ? <p className="mt-1 text-xs text-slate-500">{item.course}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.type ? <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">{item.type}</span> : null}
                    {item.mode ? <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">{item.mode}</span> : null}
                    {item.weight ? <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">{item.weight}</span> : null}
                    {item.recommended ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                        {item.recommended}
                      </span>
                    ) : null}
                    {item.score ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">{item.score}</span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {item.dueIn ? <p className="font-semibold text-primary">{item.dueIn}</p> : null}
                  {item.due ? <p>{item.due}</p> : null}
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <StatusBadge status={item.status} />
                    {item.submissionUrl ? (
                      <a
                        href={item.submissionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                      >
                        Open Learnspace
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
              {item.instructions ? (
                <p className="mt-3 text-xs leading-relaxed text-slate-500">{item.instructions}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

AssessmentList.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      course: PropTypes.string,
      type: PropTypes.string,
      due: PropTypes.string,
      dueIn: PropTypes.string,
      weight: PropTypes.string,
      status: PropTypes.string,
      mode: PropTypes.string,
      recommended: PropTypes.string,
      score: PropTypes.string,
      submissionUrl: PropTypes.string,
      instructions: PropTypes.string
    })
  ).isRequired,
  emptyLabel: PropTypes.string.isRequired
};

function CourseSnapshot({ course }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{course.name}</p>
          <p className="text-xs text-slate-500">{course.progress}</p>
        </div>
        <StatusBadge status={course.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
        <div>
          <p className="font-semibold text-slate-700">Upcoming</p>
          <p>{course.upcoming} scheduled</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Awaiting feedback</p>
          <p>{course.awaitingFeedback} submissions</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Overdue</p>
          <p>{course.overdue}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Average score</p>
          <p>{course.averageScore ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

CourseSnapshot.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    progress: PropTypes.string.isRequired,
    status: PropTypes.string,
    upcoming: PropTypes.number.isRequired,
    awaitingFeedback: PropTypes.number.isRequired,
    overdue: PropTypes.number.isRequired,
    averageScore: PropTypes.string
  }).isRequired
};

function StudyPlanManager({
  plan,
  stats,
  courses,
  events,
  onCreate,
  onUpdate,
  onRemove,
  onToggleCompletion,
  onDuplicate,
  onReset
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [formValues, setFormValues] = useState({
    focus: '',
    course: '',
    startAt: '',
    endAt: '',
    mode: 'Deep work',
    durationMinutes: '90',
    materials: '',
    submissionUrl: '',
    notes: '',
    status: 'scheduled'
  });

  const courseSuggestions = useMemo(
    () =>
      Array.isArray(courses)
        ? courses
            .map((course) => course?.title ?? course?.name)
            .filter((value, index, array) => value && array.indexOf(value) === index)
        : [],
    [courses]
  );

  const rawCourseListId = useId();
  const courseListId = useMemo(
    () => `study-plan-courses-${rawCourseListId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [rawCourseListId]
  );

  const sortedPlan = useMemo(() => {
    return [...plan].sort((a, b) => {
      const aDate = toDate(a.startAt) ?? toDate(a.endAt);
      const bDate = toDate(b.startAt) ?? toDate(b.endAt);
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.getTime() - bDate.getTime();
    });
  }, [plan]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const resetForm = useCallback(() => {
    setFormValues({
      focus: '',
      course: '',
      startAt: '',
      endAt: '',
      mode: 'Deep work',
      durationMinutes: '90',
      materials: '',
      submissionUrl: '',
      notes: '',
      status: 'scheduled'
    });
    setEditingId(null);
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setIsFormOpen(true);
  }, [resetForm]);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    resetForm();
  }, [resetForm]);

  const startEdit = useCallback((block) => {
    setEditingId(block.id);
    setFormValues({
      focus: block.focus ?? '',
      course: block.course ?? '',
      startAt: toLocalInputValue(block.startAt),
      endAt: toLocalInputValue(block.endAt),
      mode: block.mode ?? 'Deep work',
      durationMinutes: block.durationMinutes ? String(block.durationMinutes) : '',
      materials: normaliseMaterials(block.materials).join(', '),
      submissionUrl: block.submissionUrl ?? '',
      notes: block.notes ?? '',
      status: block.status ?? 'scheduled'
    });
    setIsFormOpen(true);
  }, []);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const payload = {
        focus: formValues.focus.trim() || 'Deep work block',
        course: formValues.course.trim() || null,
        startAt: formValues.startAt ? new Date(formValues.startAt).toISOString() : null,
        endAt: formValues.endAt ? new Date(formValues.endAt).toISOString() : null,
        mode: formValues.mode,
        notes: formValues.notes.trim(),
        submissionUrl: formValues.submissionUrl.trim() || null,
        status: formValues.status,
        materials: normaliseMaterials(formValues.materials)
      };
      const minutes = Number.parseInt(formValues.durationMinutes, 10);
      if (Number.isFinite(minutes) && minutes > 0) {
        payload.durationMinutes = minutes;
      }
      if (editingId) {
        onUpdate?.(editingId, payload);
        setFeedback('Study block updated.');
      } else {
        onCreate?.(payload);
        setFeedback('Study block added to your plan.');
      }
      closeForm();
    },
    [closeForm, editingId, formValues, onCreate, onUpdate]
  );

  const handleRemove = useCallback(
    (id) => {
      const target = plan.find((block) => block.id === id);
      const label = target?.focus ?? 'this study block';
      const confirmed = window.confirm(`Remove ${label} from your plan?`);
      if (!confirmed) return;
      onRemove?.(id);
      setFeedback('Study block removed.');
    },
    [onRemove, plan]
  );

  const handleDuplicate = useCallback(
    (id) => {
      onDuplicate?.(id);
      setFeedback('Study block duplicated into next week.');
    },
    [onDuplicate]
  );

  const handleToggleStatus = useCallback(
    (id) => {
      onToggleCompletion?.(id);
      setFeedback('Study block status updated.');
    },
    [onToggleCompletion]
  );

  const handleReset = useCallback(() => {
    const confirmed = window.confirm('Reset your saved study plan on this device?');
    if (!confirmed) return;
    onReset?.();
    setFeedback('Study plan reset to defaults.');
  }, [onReset]);

  return (
    <div className="dashboard-card space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-slate-900">Study schedule</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Coordinate revision blocks, prep windows, and mentor reviews without leaving the dashboard.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="dashboard-pill" onClick={handleReset}>
            Reset plan
          </button>
          <button
            type="button"
            className="dashboard-primary-pill inline-flex items-center gap-2"
            onClick={openCreateForm}
          >
            <PlusIcon className="h-4 w-4" />
            Add study block
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-primary/5 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Scheduled</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{stats.scheduled}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Completed</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{stats.completed}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Focus minutes</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{stats.totalMinutes}</p>
        </div>
      </div>

      {feedback ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm text-primary"
        >
          {feedback}
        </p>
      ) : null}

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Focus area
              <input
                type="text"
                name="focus"
                value={formValues.focus}
                onChange={handleChange}
                required
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Course
              <input
                type="text"
                name="course"
                list={courseSuggestions.length ? courseListId : undefined}
                value={formValues.course}
                onChange={handleChange}
                placeholder="Optional"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {courseSuggestions.length ? (
                <datalist id={courseListId}>
                  {courseSuggestions.map((course) => (
                    <option key={course} value={course} />
                  ))}
                </datalist>
              ) : null}
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Start
              <input
                type="datetime-local"
                name="startAt"
                value={formValues.startAt}
                onChange={handleChange}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              End
              <input
                type="datetime-local"
                name="endAt"
                value={formValues.endAt}
                onChange={handleChange}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Mode
              <select
                name="mode"
                value={formValues.mode}
                onChange={handleChange}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="Deep work">Deep work</option>
                <option value="Review">Review</option>
                <option value="Mentor session">Mentor session</option>
                <option value="Workshop">Workshop</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Duration (minutes)
              <input
                type="number"
                min="15"
                step="15"
                name="durationMinutes"
                value={formValues.durationMinutes}
                onChange={handleChange}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Status
              <select
                name="status"
                value={formValues.status}
                onChange={handleChange}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Materials & resources
            <input
              type="text"
              name="materials"
              value={formValues.materials}
              onChange={handleChange}
              placeholder="Comma-separated resources or links"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Submission link
            <input
              type="url"
              name="submissionUrl"
              value={formValues.submissionUrl}
              onChange={handleChange}
              placeholder="Optional"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Notes for future you
            <textarea
              name="notes"
              value={formValues.notes}
              onChange={handleChange}
              rows={3}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="dashboard-pill" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" className="dashboard-primary-pill">
              {editingId ? 'Save changes' : 'Create study block'}
            </button>
          </div>
        </form>
      ) : null}

      {sortedPlan.length ? (
        <ul className="space-y-4">
          {sortedPlan.map((block) => {
            const completed = block.status === 'completed';
            const materials = normaliseMaterials(block.materials);
            return (
              <li key={block.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{block.focus}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          completed ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {completed ? 'Completed' : 'Scheduled'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{block.course ?? 'Independent study'}</p>
                    <p className="mt-2 text-sm text-slate-600">{block.windowLabel ?? block.dayLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">Duration {block.durationLabel ?? `${block.durationMinutes}m`}</p>
                    {materials.length ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-primary">
                        {materials.map((material) => (
                          <span
                            key={`${block.id}-${material}`}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary shadow-sm"
                          >
                            {material}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {block.notes ? (
                      <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-500">{block.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-xs text-slate-500">
                    {block.submissionUrl ? (
                      <a
                        href={block.submissionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
                      >
                        Open submission
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button type="button" className="dashboard-pill" onClick={() => handleToggleStatus(block.id)}>
                        {completed ? 'Mark scheduled' : 'Mark completed'}
                      </button>
                      <button type="button" className="dashboard-pill" onClick={() => handleDuplicate(block.id)}>
                        Duplicate
                      </button>
                      <button type="button" className="dashboard-pill" onClick={() => startEdit(block)}>
                        <span className="inline-flex items-center gap-1">
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          Edit
                        </span>
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill text-rose-600 hover:border-rose-200 hover:text-rose-700"
                        onClick={() => handleRemove(block.id)}
                      >
                        <span className="inline-flex items-center gap-1">
                          <TrashIcon className="h-3.5 w-3.5" />
                          Remove
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          No study blocks scheduled. Add upcoming assessments to automatically generate preparation windows.
        </p>
      )}

      {events?.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked assessments</p>
          <ul className="mt-2 space-y-2 text-xs text-slate-600">
            {events.slice(0, 6).map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-700">{event.title}</span>
                <span>{event.date}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

StudyPlanManager.propTypes = {
  plan: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      focus: PropTypes.string,
      course: PropTypes.string,
      startAt: PropTypes.string,
      endAt: PropTypes.string,
      durationMinutes: PropTypes.number,
      materials: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
      submissionUrl: PropTypes.string,
      status: PropTypes.string,
      notes: PropTypes.string,
      windowLabel: PropTypes.string,
      durationLabel: PropTypes.string
    })
  ).isRequired,
  stats: PropTypes.shape({
    scheduled: PropTypes.number.isRequired,
    completed: PropTypes.number.isRequired,
    totalMinutes: PropTypes.number.isRequired
  }).isRequired,
  courses: PropTypes.array,
  events: PropTypes.array,
  onCreate: PropTypes.func,
  onUpdate: PropTypes.func,
  onRemove: PropTypes.func,
  onToggleCompletion: PropTypes.func,
  onDuplicate: PropTypes.func,
  onReset: PropTypes.func
};

StudyPlanManager.defaultProps = {
  courses: [],
  events: [],
  onCreate: undefined,
  onUpdate: undefined,
  onRemove: undefined,
  onToggleCompletion: undefined,
  onDuplicate: undefined,
  onReset: undefined
};

function AnalyticsCard({ analytics, isLearner }) {
  const cards = [];
  if (analytics.pendingReviews !== undefined) {
    cards.push({ label: 'Awaiting grading', value: String(analytics.pendingReviews) });
  }
  if (analytics.overdue !== undefined) {
    cards.push({ label: 'Overdue items', value: String(analytics.overdue) });
  }
  if (analytics.averageLeadTimeDays !== undefined && analytics.averageLeadTimeDays !== null) {
    cards.push({ label: 'Average lead time', value: `${analytics.averageLeadTimeDays} days` });
  }
  if (analytics.workloadWeight !== undefined) {
    cards.push({ label: 'Workload weight', value: `${Math.round(analytics.workloadWeight)}%` });
  }
  if (!isLearner) {
    if (analytics.completionRate !== undefined && analytics.completionRate !== null) {
      cards.push({ label: 'Grading completion', value: `${analytics.completionRate}%` });
    }
  }

  return (
    <div className="dashboard-card space-y-4 p-5">
      <div className="flex items-center gap-2">
        <ClipboardDocumentCheckIcon className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">Operational analytics</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
      {Array.isArray(analytics.byType) && analytics.byType.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">By assessment type</p>
          <ul className="mt-2 space-y-2">
            {analytics.byType.map((entry) => (
              <li key={entry.type} className="flex items-center justify-between text-sm text-slate-600">
                <span>{entry.type}</span>
                <span className="font-semibold text-slate-900">
                  {entry.count} · {entry.averageScore !== null && entry.averageScore !== undefined ? `${entry.averageScore}%` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

AnalyticsCard.propTypes = {
  analytics: PropTypes.object,
  isLearner: PropTypes.bool
};

AnalyticsCard.defaultProps = {
  analytics: {},
  isLearner: false
};

function ResourcePanel({ resources }) {
  if (!resources?.length) return null;
  return (
    <div className="dashboard-card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <BoltIcon className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">Focus resources</h3>
      </div>
      <ul className="space-y-2 text-sm text-slate-600">
        {resources.map((resource) => (
          <li key={resource} className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-primary" />
            <span>{resource}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

ResourcePanel.propTypes = {
  resources: PropTypes.arrayOf(PropTypes.string)
};

ResourcePanel.defaultProps = {
  resources: []
};

function GradingQueue({ queue, flagged }) {
  if (!queue?.length && !flagged?.length) return null;
  return (
    <div className="dashboard-card space-y-4 p-5">
      <div className="flex items-center gap-2">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-900">Grading queue</h3>
      </div>
      {queue?.length ? (
        <ul className="space-y-3 text-sm text-slate-600">
          {queue.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">{item.course}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{item.pending}</span>
                <span>{item.lastSubmission}</span>
                <span className="font-semibold text-primary">{item.due}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {flagged?.length ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Flagged submissions</p>
          <ul className="mt-2 space-y-2 text-sm text-rose-700">
            {flagged.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="font-medium">{item.title}</span>
                <span className="text-xs uppercase">{item.flagged}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

GradingQueue.propTypes = {
  queue: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      course: PropTypes.string,
      pending: PropTypes.string,
      lastSubmission: PropTypes.string,
      due: PropTypes.string
    })
  ),
  flagged: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      flagged: PropTypes.string,
      status: PropTypes.string,
      due: PropTypes.string
    })
  )
};

GradingQueue.defaultProps = {
  queue: [],
  flagged: []
};

export default function DashboardAssessments() {
  const { role, dashboard, refresh } = useOutletContext();
  const assessments = dashboard?.assessments;
  const isLearner = role === 'learner';

  const headerCopy = useMemo(() => {
    if (isLearner) {
      return {
        title: 'Assessment mission control',
        description:
          'Track deadlines, stay ahead of exam readiness, and keep every quiz submission inside a dependable operating rhythm.'
      };
    }
    return {
      title: 'Assessment operations studio',
      description:
        'Coordinate grading velocity, orchestrate assessment releases, and surface at-risk cohorts before escalation.'
    };
  }, [isLearner]);

  const schedule = assessments?.schedule ?? {};
  const studyPlanRaw = Array.isArray(schedule.studyPlan) ? schedule.studyPlan : [];
  const {
    plan: learnerStudyPlan,
    stats: studyStats,
    createBlock,
    updateBlock,
    removeBlock,
    toggleCompletion,
    duplicateBlock,
    reset: resetStudyPlan
  } = useLearnerStudyPlan(isLearner ? studyPlanRaw : []);

  if (!assessments) {
    return (
      <DashboardStateMessage
        title="Assessment data unavailable"
        description="We could not load your assessment data yet. Refresh to sync the latest deadlines and grading queues."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const overview = assessments.overview ?? [];
  const timeline = assessments.timeline ?? { upcoming: [], overdue: [], completed: [] };
  const courses = assessments.courses ?? [];
  const analytics = assessments.analytics ?? {};
  const resources = assessments.resources ?? [];
  const grading = assessments.grading ?? {};
  const events = Array.isArray(schedule.events) ? schedule.events : [];

  const timelineColumns = isLearner
    ? [
        { key: 'upcoming', title: 'Upcoming focus', empty: 'Nothing scheduled. Enjoy the clear runway.' },
        { key: 'overdue', title: 'At risk', empty: 'No overdue assessments. Great job staying current.' },
        {
          key: 'completed',
          title: 'Completed & submitted',
          empty: 'Submit work to populate your completion streak.'
        }
      ]
    : [
        { key: 'upcoming', title: 'Scheduled launches', empty: 'No assessments scheduled. Plan your next release.' },
        { key: 'overdue', title: 'Needs attention', empty: 'No overdue assessments. Pipelines are healthy.' },
        { key: 'completed', title: 'Closed & graded', empty: 'No recently graded assessments yet.' }
      ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="dashboard-title">{headerCopy.title}</h1>
          <p className="dashboard-subtitle max-w-2xl">{headerCopy.description}</p>
        </div>
        <button
          type="button"
          onClick={() => refresh?.()}
          className="dashboard-pill flex items-center gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <ClockIcon className="h-4 w-4" />
          Sync latest data
        </button>
      </header>

      {overview.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overview.map((metric) => (
            <SummaryCard key={metric.id ?? metric.label} metric={metric} />
          ))}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="dashboard-card space-y-6 p-6">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-slate-900">Timeline</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {timelineColumns.map((column) => (
                <AssessmentList
                  key={column.key}
                  title={column.title}
                  items={Array.isArray(timeline[column.key]) ? timeline[column.key] : []}
                  emptyLabel={column.empty}
                />
              ))}
            </div>
          </div>

          <div className="dashboard-card space-y-5 p-6">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-slate-900">Programmes</h2>
            </div>
            {courses.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {courses.map((course) => (
                  <CourseSnapshot key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                No course-level assessment insights are available yet. Once assessments are linked to your programmes, real-time
                readiness signals will appear here.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {isLearner ? (
            <StudyPlanManager
              plan={learnerStudyPlan}
              stats={studyStats}
              courses={courses}
              events={events}
              onCreate={createBlock}
              onUpdate={updateBlock}
              onRemove={removeBlock}
              onToggleCompletion={toggleCompletion}
              onDuplicate={duplicateBlock}
              onReset={resetStudyPlan}
            />
          ) : (
            <div className="dashboard-card space-y-4 p-6">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-slate-900">Schedule</h2>
              </div>
              {studyPlan.length ? (
                <ul className="space-y-3 text-sm text-slate-600">
                  {studyPlan.map((block) => (
                    <li key={block.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{block.focus}</p>
                          <p className="text-xs text-slate-500">{block.course}</p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{block.window}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{block.duration}</span>
                        {block.mode ? <span>{block.mode}</span> : null}
                        {block.submissionUrl ? (
                          <a
                            href={block.submissionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            Open
                            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                  No study blocks scheduled. Add upcoming assessments to automatically generate preparation windows.
                </p>
              )}
              {events.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Events</p>
                  <ul className="mt-2 space-y-2 text-xs text-slate-600">
                    {events.slice(0, 5).map((event) => (
                      <li key={event.id} className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">{event.title}</span>
                        <span>{event.date}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <AnalyticsCard analytics={analytics} isLearner={isLearner} />

          {isLearner ? <ResourcePanel resources={resources} /> : <GradingQueue queue={grading.queue} flagged={grading.flagged} />}
        </div>
      </section>
    </div>
  );
}
