import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  PlayCircleIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

import ExplorerSearchSection from '../components/search/ExplorerSearchSection.jsx';
import FormStepper from '../components/forms/FormStepper.jsx';
import adminControlApi from '../api/adminControlApi.js';
import {
  checkInToLiveSession,
  joinLiveSession
} from '../api/learnerDashboardApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { listPublicLiveClassrooms } from '../api/catalogueApi.js';
import useAutoDismissMessage from '../hooks/useAutoDismissMessage.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import { isAbortError } from '../utils/errors.js';
import LearningClusterSummary from '../components/learning/LearningClusterSummary.jsx';
import { getLiveClassroomCluster, summariseLearningClusters } from '../utils/learningClusters.js';

const EXPLORER_CONFIG = {
  entityType: 'events',
  title: 'Discover live classrooms',
  description:
    'Search across workshops, AMAs and cohort rituals. Saved searches give your programming team live analytics and guardrails.',
  placeholder: 'Search by topic, facilitator or timezone…',
  defaultSort: 'upcoming',
  sortOptions: [
    { label: 'Next up', value: 'upcoming' },
    { label: 'Newest', value: 'newest' },
    { label: 'Most popular', value: 'popularity' }
  ],
  filterDefinitions: [
    {
      key: 'type',
      label: 'Format',
      type: 'multi',
      options: [
        { label: 'Workshop', value: 'workshop' },
        { label: 'Webinar', value: 'webinar' },
        { label: 'Coaching', value: 'coaching' },
        { label: 'Office hours', value: 'office_hours' }
      ]
    },
    {
      key: 'isTicketed',
      label: 'Ticketed',
      type: 'boolean'
    },
    {
      key: 'timezone',
      label: 'Timezone',
      type: 'select',
      options: [
        { label: 'UTC', value: 'Etc/UTC' },
        { label: 'Pacific', value: 'America/Los_Angeles' },
        { label: 'Eastern', value: 'America/New_York' },
        { label: 'London', value: 'Europe/London' }
      ]
    }
  ]
};

const FORM_STEPS = [
  {
    id: 'basics',
    title: 'Basics',
    description: 'Title, summary and format'
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'Timezone, capacity and ticketing'
  },
  {
    id: 'metadata',
    title: 'Metadata',
    description: 'Topics, slug and JSON metadata'
  }
];

function createEmptyForm() {
  return {
    title: '',
    summary: '',
    description: '',
    type: 'workshop',
    status: 'draft',
    isTicketed: false,
    priceAmount: '',
    priceCurrency: 'USD',
    capacity: 50,
    reservedSeats: 0,
    timezone: 'Etc/UTC',
    startAt: '',
    endAt: '',
    communityId: '',
    instructorId: '',
    topics: '',
    slug: '',
    metadata: '',
    clusterKey: 'general'
  };
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function normaliseTopics(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return String(input)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function LiveClassroomCard({ classroom, onJoin, onCheckIn }) {
  const joinDisabled = !onJoin;
  const checkInDisabled = !onCheckIn;
  const statusColour = {
    draft: 'bg-slate-200 text-slate-600',
    scheduled: 'bg-sky-100 text-sky-600',
    live: 'bg-emerald-100 text-emerald-600',
    completed: 'bg-primary/10 text-primary',
    cancelled: 'bg-rose-100 text-rose-600'
  }[classroom.status ?? 'draft'];
  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            <VideoCameraIcon className="h-4 w-4" /> Live classroom
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">{classroom.title}</h3>
          {classroom.summary ? <p className="text-sm text-slate-600">{classroom.summary}</p> : null}
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${statusColour}`}>
              {classroom.status}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              Capacity {classroom.capacity ?? 0}
            </span>
            {classroom.isTicketed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-600">
                Ticketed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-600">
                Open access
              </span>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <CalendarDaysIcon className="h-4 w-4" /> Schedule
          </p>
          <p className="mt-2 font-semibold text-slate-800">
            {classroom.startAt
              ? new Date(classroom.startAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })
              : 'TBC'}
          </p>
          {classroom.endAt ? (
            <p className="text-xs text-slate-500">
              Ends {new Date(classroom.endAt).toLocaleString(undefined, { timeStyle: 'short' })}
            </p>
          ) : null}
          {classroom.timezone ? (
            <p className="mt-1 text-xs text-slate-500">Timezone {classroom.timezone}</p>
          ) : null}
        </div>
      </div>
      {classroom.description ? (
        <p className="text-sm leading-relaxed text-slate-600">{classroom.description}</p>
      ) : null}
      {classroom.topics?.length ? (
        <div className="flex flex-wrap gap-2">
          {classroom.topics.map((topic) => (
            <span key={topic} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              #{topic}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onJoin ?? undefined}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark"
          disabled={joinDisabled}
        >
          <PlayCircleIcon className="h-4 w-4" /> Join session
        </button>
        <button
          type="button"
          onClick={onCheckIn ?? undefined}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          disabled={checkInDisabled}
        >
          <ArrowPathIcon className="h-4 w-4" /> Check in
        </button>
      </div>
    </article>
  );
}

function LiveClassroomForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  currentStep,
  setCurrentStep,
  mode
}) {
  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    onChange({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const disabled = submitting;

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <FormStepper steps={FORM_STEPS} currentStep={currentStep} onSelect={setCurrentStep} />
      {currentStep === 'basics' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Title</span>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Slug</span>
            <input
              type="text"
              name="slug"
              value={form.slug}
              onChange={handleInputChange}
              placeholder="automation-command-simulation"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Summary</span>
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleInputChange}
              rows={2}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Format</span>
            <select
              name="type"
              value={form.type}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            >
              <option value="workshop">Workshop</option>
              <option value="webinar">Webinar</option>
              <option value="coaching">Coaching</option>
              <option value="office_hours">Office hours</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Status</span>
            <select
              name="status"
              value={form.status}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      ) : null}

      {currentStep === 'schedule' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Start</span>
            <input
              type="datetime-local"
              name="startAt"
              value={form.startAt}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">End</span>
            <input
              type="datetime-local"
              name="endAt"
              value={form.endAt}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Timezone</span>
            <input
              type="text"
              name="timezone"
              value={form.timezone}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Capacity</span>
            <input
              type="number"
              name="capacity"
              min="0"
              value={form.capacity}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Reserved seats</span>
            <input
              type="number"
              name="reservedSeats"
              min="0"
              value={form.reservedSeats}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            <input
              type="checkbox"
              name="isTicketed"
              checked={form.isTicketed}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              disabled={disabled}
            />
            Ticketed session
          </label>
          {form.isTicketed ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Ticket price</span>
                <input
                  type="number"
                  name="priceAmount"
                  min="0"
                  step="0.01"
                  value={form.priceAmount}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={disabled}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Currency</span>
                <input
                  type="text"
                  name="priceCurrency"
                  value={form.priceCurrency}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={disabled}
                />
              </label>
            </>
          ) : null}
        </div>
      ) : null}

      {currentStep === 'metadata' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Community ID</span>
            <input
              type="number"
              name="communityId"
              value={form.communityId}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Instructor ID</span>
            <input
              type="number"
              name="instructorId"
              value={form.instructorId}
              onChange={handleInputChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Topics</span>
            <input
              type="text"
              name="topics"
              value={form.topics}
              onChange={handleInputChange}
              placeholder="Automation, Live Ops"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Metadata (JSON)</span>
            <textarea
              name="metadata"
              value={form.metadata}
              onChange={handleInputChange}
              rows={4}
              placeholder='{"featureFlag": "live"}'
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:opacity-50"
          disabled={disabled}
        >
          {mode === 'edit' ? 'Update live classroom' : 'Create live classroom'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          disabled={disabled}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function LiveClassrooms() {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken;
  const role = String(session?.user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';

  const [liveClassrooms, setLiveClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState(() => createEmptyForm());
  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [currentStep, setCurrentStep] = useState('basics');
  const [submitting, setSubmitting] = useState(false);
  const [clusterFilter, setClusterFilter] = useState('all');

  const classroomClusterSummary = useMemo(
    () => summariseLearningClusters({ liveClassrooms }),
    [liveClassrooms]
  );

  const filteredLiveClassrooms = useMemo(() => {
    if (clusterFilter === 'all') {
      return liveClassrooms;
    }
    return liveClassrooms.filter((session) => getLiveClassroomCluster(session).key === clusterFilter);
  }, [clusterFilter, liveClassrooms]);

  const featuredLiveClass = useMemo(() => {
    if (filteredLiveClassrooms.length) {
      return filteredLiveClassrooms[0];
    }
    return liveClassrooms[0] ?? null;
  }, [filteredLiveClassrooms, liveClassrooms]);
  const liveKeywords = useMemo(() => {
    if (!featuredLiveClass) {
      return [];
    }
    const tags = new Set();
    if (featuredLiveClass.topic) {
      tags.add(featuredLiveClass.topic);
    }
    (featuredLiveClass.tags ?? []).forEach((tag) => {
      if (typeof tag === 'string') {
        tags.add(tag);
      }
    });
    return Array.from(tags);
  }, [featuredLiveClass]);

  const liveMetaDescription = useMemo(() => {
    if (featuredLiveClass?.description) {
      return featuredLiveClass.description;
    }
    if (featuredLiveClass?.title) {
      return `Join ${featuredLiveClass.title} and other Edulure live classrooms with secure check-ins, waitlists, and instructor analytics.`;
    }
    return 'Host and attend Edulure live classrooms with secure streaming, attendance tracking, and multi-role collaboration tools.';
  }, [featuredLiveClass]);

  usePageMetadata({
    title: featuredLiveClass?.title ? `${featuredLiveClass.title} · Live classrooms` : 'Edulure live classrooms',
    description: liveMetaDescription,
    canonicalPath: featuredLiveClass?.slug ? `/live/${featuredLiveClass.slug}` : '/live',
    image: featuredLiveClass?.heroImageUrl ?? undefined,
    keywords: liveKeywords,
    analytics: {
      page_type: 'live_classrooms',
      session_count: filteredLiveClassrooms.length,
      cluster_filter: clusterFilter
    }
  });

  const loadLiveClassrooms = useCallback(
    async ({ signal } = {}) => {
      if (signal?.aborted) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (isAdmin && token) {
          const response = await adminControlApi.listLiveStreams({
            token,
            params: { perPage: 50 },
            signal
          });
          if (signal?.aborted) {
            return;
          }
          setLiveClassrooms(response?.data ?? []);
        } else {
          const response = await listPublicLiveClassrooms({ params: { limit: 12 }, signal });
          if (signal?.aborted) {
            return;
          }
          setLiveClassrooms(response?.data ?? []);
        }
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) {
          return;
        }
        setLiveClassrooms([]);
        setError(err.message ?? 'Unable to load live classrooms');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [isAdmin, token]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadLiveClassrooms({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [loadLiveClassrooms]);

  useAutoDismissMessage(successMessage, () => setSuccessMessage(''));

  const resetForm = useCallback(() => {
    setForm(createEmptyForm());
    setMode('create');
    setEditingId(null);
    setCurrentStep('basics');
  }, []);

  const handleClusterSelect = useCallback((key) => {
    setClusterFilter((current) => {
      if (key === 'all') {
        return 'all';
      }
      return current === key ? 'all' : key;
    });
  }, []);

  const handleEdit = (classroom) => {
    setMode('edit');
    setEditingId(classroom.id);
    setCurrentStep('basics');
    setForm({
      title: classroom.title ?? '',
      summary: classroom.summary ?? '',
      description: classroom.description ?? '',
      type: classroom.type ?? 'workshop',
      status: classroom.status ?? 'draft',
      isTicketed: Boolean(classroom.isTicketed),
      priceAmount: classroom.priceAmount ? Number(classroom.priceAmount) / 100 : '',
      priceCurrency: classroom.priceCurrency ?? 'USD',
      capacity: classroom.capacity ?? 0,
      reservedSeats: classroom.reservedSeats ?? 0,
      timezone: classroom.timezone ?? 'Etc/UTC',
      startAt: toDateTimeLocal(classroom.startAt),
      endAt: toDateTimeLocal(classroom.endAt),
      communityId: classroom.communityId ?? '',
      instructorId: classroom.instructorId ?? '',
      topics: Array.isArray(classroom.topics) ? classroom.topics.join(', ') : '',
      slug: classroom.slug ?? '',
      metadata: classroom.metadata ? JSON.stringify(classroom.metadata, null, 2) : '',
      clusterKey: classroom.clusterKey ?? getLiveClassroomCluster(classroom).key
    });
  };

  const handleDelete = async (classroomId) => {
    if (!isAdmin || !token) return;
    if (!window.confirm('Remove this live classroom?')) return;
    try {
      await adminControlApi.deleteLiveStream({ token, id: classroomId });
      setSuccessMessage('Live classroom removed');
      await loadLiveClassrooms();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to delete live classroom');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        type: form.type,
        status: form.status,
        isTicketed: Boolean(form.isTicketed),
        priceCurrency: form.priceCurrency.trim() || 'USD',
        priceAmount:
          form.isTicketed && form.priceAmount !== '' ? Number(form.priceAmount) : form.isTicketed ? 0 : undefined,
        capacity: Number(form.capacity ?? 0),
        reservedSeats: Number(form.reservedSeats ?? 0),
        timezone: form.timezone.trim() || 'Etc/UTC',
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        communityId: form.communityId ? Number(form.communityId) : null,
        instructorId: form.instructorId ? Number(form.instructorId) : null,
        topics: normaliseTopics(form.topics),
        metadata: parseMetadata(form.metadata)
      };

      const predictedSession = {
        title: payload.title,
        summary: payload.summary,
        description: payload.description,
        type: payload.type,
        topics: payload.topics
      };
      const manualCluster = form.clusterKey?.toLowerCase().trim();
      const heuristicCluster = getLiveClassroomCluster(predictedSession).key;
      payload.clusterKey = manualCluster && manualCluster !== 'general' ? manualCluster : heuristicCluster;

      if (mode === 'edit' && editingId) {
        await adminControlApi.updateLiveStream({ token, id: editingId, payload });
        setSuccessMessage('Live classroom updated');
      } else {
        await adminControlApi.createLiveStream({ token, payload });
        setSuccessMessage('Live classroom created');
      }
      await loadLiveClassrooms();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to save live classroom');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (classroom) => {
    if (!isAuthenticated || !token) {
      setError('You must be signed in to join a session.');
      return;
    }
    try {
      const sessionId = classroom.publicId ?? classroom.id;
      await joinLiveSession({ token, sessionId });
      setSuccessMessage('Session joined. Check your email for the meeting link.');
    } catch (err) {
      setError(err.message ?? 'Unable to join session');
    }
  };

  const handleCheckIn = async (classroom) => {
    if (!isAuthenticated || !token) {
      setError('Sign in to check in to the session.');
      return;
    }
    try {
      const sessionId = classroom.publicId ?? classroom.id;
      await checkInToLiveSession({ token, sessionId });
      setSuccessMessage('Check-in recorded. Enjoy the classroom!');
    } catch (err) {
      setError(err.message ?? 'Unable to check in');
    }
  };

  const adminPanel = useMemo(() => {
    if (!isAdmin) {
      return (
        <div className="rounded-4xl border border-slate-200 bg-white/80 p-8 text-sm text-slate-600">
          <p className="text-lg font-semibold text-slate-900">Operational controls locked</p>
          <p className="mt-2 text-sm text-slate-600">
            Only administrators can create or update production live classrooms. Request elevated access from the governance team
            or coordinate with your workspace owner.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-4xl border border-slate-200 bg-white/90 p-8 shadow-xl">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Operational console</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {mode === 'edit' ? 'Update live classroom' : 'Create live classroom'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Configure schedules, guard rails and pricing in a guarded workflow. Every change is persisted to the production
              database with audit-ready logging.
            </p>
            {successMessage ? (
              <p className="mt-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600">
                {successMessage}
              </p>
            ) : null}
            {error ? (
              <p className="mt-2 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">{error}</p>
            ) : null}
          </div>
          <LiveClassroomForm
            form={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            submitting={submitting}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            mode={mode}
          />
        </div>
        <div className="mt-10 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Scheduled classrooms</p>
          {loading ? <p className="text-sm text-slate-500">Loading scheduled classrooms…</p> : null}
          {!loading && filteredLiveClassrooms.length === 0 ? (
            <p className="text-sm text-slate-500">
              {clusterFilter === 'all' ? 'No live classrooms scheduled yet.' : 'No sessions match this learning cluster yet.'}
            </p>
          ) : null}
          <div className="grid gap-4">
            {filteredLiveClassrooms.map((classroom) => (
              <div
                key={classroom.id}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{classroom.title}</p>
                    <p className="text-xs text-slate-500">
                      Starts{' '}
                      {classroom.startAt
                        ? new Date(classroom.startAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        : 'TBC'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(classroom)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(classroom.id)}
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Capacity {classroom.capacity ?? 0} · Reserved {classroom.reservedSeats ?? 0} · Status {classroom.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [
    isAdmin,
    mode,
    form,
    submitting,
    currentStep,
    liveClassrooms,
    loading,
    handleSubmit,
    resetForm,
    successMessage,
    error
  ]);

  return (
    <div className="bg-slate-100 pb-24 pt-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6">
        <section className="space-y-10">
          <ExplorerSearchSection {...EXPLORER_CONFIG} />
        </section>

        <section className="space-y-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Learning clusters</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Compare sessions by learning cluster</h2>
            <p className="mt-2 text-sm text-slate-600">
              Toggle between operations, growth, enablement and community programming to calibrate your live calendar.
            </p>
          </div>
          <LearningClusterSummary
            clusters={classroomClusterSummary.clusters}
            activeKey={clusterFilter}
            onSelect={handleClusterSelect}
          />
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Upcoming live classrooms</h2>
            {successMessage && !isAdmin ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">{successMessage}</span>
            ) : null}
          </div>
          {!isAdmin && error ? (
            <p className="text-sm font-semibold text-rose-500">{error}</p>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredLiveClassrooms.map((classroom) => (
              <LiveClassroomCard
                key={classroom.id}
                classroom={classroom}
                onJoin={() => handleJoin(classroom)}
                onCheckIn={() => handleCheckIn(classroom)}
              />
            ))}
            {!loading && filteredLiveClassrooms.length === 0 ? (
              <p className="text-sm text-slate-500">
                {clusterFilter === 'all'
                  ? 'No live classrooms scheduled yet. Administrators can create sessions below to populate this surface.'
                  : 'No live classrooms match this learning cluster just yet.'}
              </p>
            ) : null}
            {loading ? <p className="text-sm text-slate-500">Loading live classrooms…</p> : null}
          </div>
        </section>

        <section>{adminPanel}</section>
      </div>
    </div>
  );
}
