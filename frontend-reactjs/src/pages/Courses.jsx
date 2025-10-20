import { useCallback, useEffect, useMemo, useState } from 'react';
import { AcademicCapIcon } from '@heroicons/react/24/outline';

import ExplorerSearchSection from '../components/search/ExplorerSearchSection.jsx';
import FormStepper from '../components/forms/FormStepper.jsx';
import adminControlApi from '../api/adminControlApi.js';
import { searchExplorer } from '../api/explorerApi.js';
import { listPublicCourses } from '../api/catalogueApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const EXPLORER_CONFIG = {
  entityType: 'courses',
  title: 'Search the course catalogue',
  description:
    'Locate the perfect cohort, live program or self-paced track. Save searches with governance-ready guard rails and analytics.',
  placeholder: 'Search courses by skill, instructor or outcome…',
  defaultSort: 'relevance',
  sortOptions: [
    { label: 'Relevance', value: 'relevance' },
    { label: 'Top rated', value: 'rating' },
    { label: 'Newest', value: 'newest' },
    { label: 'Price: low to high', value: 'priceLow' },
    { label: 'Price: high to low', value: 'priceHigh' }
  ],
  filterDefinitions: [
    {
      key: 'level',
      label: 'Level',
      type: 'multi',
      options: [
        { label: 'Beginner', value: 'beginner' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Advanced', value: 'advanced' },
        { label: 'Expert', value: 'expert' }
      ]
    },
    {
      key: 'deliveryFormat',
      label: 'Format',
      type: 'multi',
      options: [
        { label: 'Self paced', value: 'self_paced' },
        { label: 'Cohort', value: 'cohort' },
        { label: 'Live', value: 'live' },
        { label: 'Blended', value: 'blended' }
      ]
    },
    {
      key: 'price.amount',
      label: 'Price (USD)',
      type: 'range'
    }
  ]
};

const FORM_STEPS = [
  { id: 'overview', title: 'Overview', description: 'Title, instructor and summary' },
  { id: 'structure', title: 'Structure', description: 'Level, format, pricing and release' },
  { id: 'media', title: 'Media', description: 'Branding, syllabus and metadata' }
];

function createEmptyForm() {
  return {
    instructorId: '',
    title: '',
    slug: '',
    summary: '',
    description: '',
    level: 'beginner',
    category: 'general',
    skills: '',
    tags: '',
    languages: '',
    deliveryFormat: 'self_paced',
    thumbnailUrl: '',
    heroImageUrl: '',
    trailerUrl: '',
    promoVideoUrl: '',
    syllabusUrl: '',
    priceCurrency: 'USD',
    priceAmount: '',
    isPublished: false,
    releaseAt: '',
    status: 'draft',
    metadata: ''
  };
}

function parseListField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
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

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatPrice(amount, currency = 'USD') {
  if (amount === null || amount === undefined || amount === '') {
    return 'Free';
  }
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    return `${currency} ${amount}`;
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(numeric);
  } catch (_error) {
    return `${currency} ${numeric}`;
  }
}

function CourseHighlightCard({ course }) {
  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            <AcademicCapIcon className="h-4 w-4" /> Course
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">{course.title}</h3>
          {course.subtitle ? <p className="text-sm font-medium text-slate-500">{course.subtitle}</p> : null}
          {course.description ? (
            <p className="text-sm leading-relaxed text-slate-600">{course.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-600">
              {course.level}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              {course.deliveryFormat}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
              {course.price}
            </span>
          </div>
        </div>
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-32 w-32 flex-none rounded-2xl border border-slate-200 object-cover shadow-inner"
          />
        ) : null}
      </div>
      {course.skills?.length ? (
        <div className="flex flex-wrap gap-2">
          {course.skills.map((skill) => (
            <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              #{skill}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {course.actions?.map((action) => (
          <a
            key={action.label}
            href={action.href ?? '#'}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            {action.label}
          </a>
        ))}
      </div>
    </article>
  );
}

function mapCatalogueCourse(course) {
  if (!course) {
    return null;
  }
  return {
    id: course.id ?? course.publicId ?? course.slug ?? course.title,
    title: course.title,
    subtitle: course.summary ?? course.category ?? 'Course',
    description: course.description ?? null,
    level: course.level ?? 'beginner',
    deliveryFormat: course.deliveryFormat ?? 'self_paced',
    price: formatPrice(course.priceAmount, course.priceCurrency ?? 'USD'),
    thumbnailUrl: course.thumbnailUrl ?? course.heroImageUrl ?? null,
    skills: Array.isArray(course.skills) ? course.skills : [],
    actions: [
      course.syllabusUrl
        ? { label: 'View syllabus', href: course.syllabusUrl }
        : null,
      course.promoVideoUrl
        ? { label: 'Watch trailer', href: course.promoVideoUrl }
        : null
    ].filter(Boolean)
  };
}

function CourseForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  mode,
  currentStep,
  setCurrentStep
}) {
  const handleChange = (event) => {
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
      {currentStep === 'overview' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Instructor ID</span>
            <input
              type="number"
              name="instructorId"
              value={form.instructorId}
              onChange={handleChange}
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
              onChange={handleChange}
              placeholder="automation-blueprint"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Title</span>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Summary</span>
            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
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
              onChange={handleChange}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      {currentStep === 'structure' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Level</span>
            <select
              name="level"
              value={form.level}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Category</span>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Skills</span>
            <input
              type="text"
              name="skills"
              value={form.skills}
              onChange={handleChange}
              placeholder="Automation, Playbooks"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Tags</span>
            <input
              type="text"
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="Growth, Ops"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Languages</span>
            <input
              type="text"
              name="languages"
              value={form.languages}
              onChange={handleChange}
              placeholder="en, es"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Format</span>
            <select
              name="deliveryFormat"
              value={form.deliveryFormat}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            >
              <option value="self_paced">Self paced</option>
              <option value="cohort">Cohort</option>
              <option value="live">Live</option>
              <option value="blended">Blended</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Price</span>
            <input
              type="number"
              name="priceAmount"
              min="0"
              step="0.01"
              value={form.priceAmount}
              onChange={handleChange}
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
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Release date</span>
            <input
              type="date"
              name="releaseAt"
              value={form.releaseAt}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Status</span>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            >
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            <input
              type="checkbox"
              name="isPublished"
              checked={form.isPublished}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              disabled={disabled}
            />
            Published
          </label>
        </div>
      ) : null}

      {currentStep === 'media' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Thumbnail URL</span>
            <input
              type="url"
              name="thumbnailUrl"
              value={form.thumbnailUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Hero image URL</span>
            <input
              type="url"
              name="heroImageUrl"
              value={form.heroImageUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Trailer URL</span>
            <input
              type="url"
              name="trailerUrl"
              value={form.trailerUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Promo video URL</span>
            <input
              type="url"
              name="promoVideoUrl"
              value={form.promoVideoUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Syllabus URL</span>
            <input
              type="url"
              name="syllabusUrl"
              value={form.syllabusUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Metadata (JSON)</span>
            <textarea
              name="metadata"
              value={form.metadata}
              onChange={handleChange}
              rows={4}
              placeholder='{"enrolmentGuardrail": true}'
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
          {mode === 'edit' ? 'Update course' : 'Create course'}
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

export default function Courses() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const role = String(session?.user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';

  const [highlightCourses, setHighlightCourses] = useState([]);
  const [highlightLoading, setHighlightLoading] = useState(false);
  const [highlightError, setHighlightError] = useState(null);
  const [catalogueCourses, setCatalogueCourses] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueError, setCatalogueError] = useState(null);
  const [liveCourses, setLiveCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState(() => createEmptyForm());
  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [currentStep, setCurrentStep] = useState('overview');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadHighlights() {
      setHighlightLoading(true);
      setHighlightError(null);
      try {
        if (token) {
          const payload = {
            query: '',
            entityTypes: ['courses'],
            filters: {},
            globalFilters: {},
            sort: { courses: 'relevance' },
            page: 1,
            perPage: 6
          };

          const response = await searchExplorer(payload, { token, signal: controller.signal });
          if (!active) return;
          if (!response?.success) {
            throw new Error(response?.message ?? 'Search failed');
          }
          const hits = response.data?.results?.courses?.hits ?? [];
          setHighlightCourses(
            hits.map((hit, index) => ({
              id: hit.id ?? hit.slug ?? `course-${index}`,
              title: hit.title ?? hit.name,
              subtitle: hit.subtitle ?? hit.metrics?.subtitle,
              description: hit.description ?? hit.summary,
              level: hit.raw?.level ?? hit.metrics?.level ?? 'beginner',
              deliveryFormat: hit.raw?.deliveryFormat ?? hit.metrics?.deliveryFormat ?? 'self_paced',
              price: hit.price?.formatted ?? hit.metrics?.price ?? '$0',
              thumbnailUrl: hit.thumbnailUrl ?? hit.heroImageUrl ?? null,
              skills: hit.tags ?? hit.raw?.skills ?? [],
              actions: hit.actions ?? []
            }))
          );
          return;
        }
        throw Object.assign(new Error('Authentication required for personalised highlights'), { status: 401 });
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!token || err.status === 401 || err.status === 403) {
          try {
            const fallback = await listPublicCourses({ signal: controller.signal, params: { limit: 6 } });
            if (!active) return;
            const items = (fallback?.data ?? []).map(mapCatalogueCourse).filter(Boolean);
            setHighlightCourses(items);
            if (token && (err.status === 401 || err.status === 403)) {
              setHighlightError('Limited results shown. Reauthenticate to view personalised highlights.');
            } else {
              setHighlightError(null);
            }
            return;
          } catch (fallbackError) {
            if (controller.signal.aborted) return;
            setHighlightCourses([]);
            setHighlightError(fallbackError.message ?? 'Unable to load course highlights');
            return;
          }
        }
        setHighlightCourses([]);
        setHighlightError(err.message ?? 'Unable to load course highlights');
      } finally {
        if (active) {
          setHighlightLoading(false);
        }
      }
    }

    loadHighlights();

    return () => {
      active = false;
      controller.abort();
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setCatalogueLoading(true);
    setCatalogueError(null);

    listPublicCourses({ signal: controller.signal, params: { limit: 8 } })
      .then((response) => {
        if (!active) return;
        setCatalogueCourses(response?.data ?? []);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setCatalogueCourses([]);
        setCatalogueError(err.message ?? 'Unable to load catalogue courses');
      })
      .finally(() => {
        if (active) {
          setCatalogueLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const loadCourses = useCallback(async () => {
    if (!isAdmin || !token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await adminControlApi.listCourses({ token, params: { perPage: 50 } });
      setLiveCourses(response?.data ?? []);
    } catch (err) {
      setError(err.message ?? 'Unable to load courses');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const resetForm = useCallback(() => {
    setForm(createEmptyForm());
    setMode('create');
    setEditingId(null);
    setCurrentStep('overview');
  }, []);

  const handleEdit = (course) => {
    setMode('edit');
    setEditingId(course.id);
    setCurrentStep('overview');
    setForm({
      instructorId: course.instructorId ?? '',
      title: course.title ?? '',
      slug: course.slug ?? '',
      summary: course.summary ?? '',
      description: course.description ?? '',
      level: course.level ?? 'beginner',
      category: course.category ?? 'general',
      skills: Array.isArray(course.skills) ? course.skills.join(', ') : '',
      tags: Array.isArray(course.tags) ? course.tags.join(', ') : '',
      languages: Array.isArray(course.languages) ? course.languages.join(', ') : '',
      deliveryFormat: course.deliveryFormat ?? 'self_paced',
      thumbnailUrl: course.thumbnailUrl ?? '',
      heroImageUrl: course.heroImageUrl ?? '',
      trailerUrl: course.trailerUrl ?? '',
      promoVideoUrl: course.promoVideoUrl ?? '',
      syllabusUrl: course.syllabusUrl ?? '',
      priceCurrency: course.priceCurrency ?? 'USD',
      priceAmount: course.priceAmount ? Number(course.priceAmount) / 100 : '',
      isPublished: Boolean(course.isPublished),
      releaseAt: toDateInput(course.releaseAt),
      status: course.status ?? 'draft',
      metadata: course.metadata ? JSON.stringify(course.metadata, null, 2) : ''
    });
  };

  const handleDelete = async (courseId) => {
    if (!isAdmin || !token) return;
    if (!window.confirm('Delete this course?')) return;
    try {
      await adminControlApi.deleteCourse({ token, id: courseId });
      setSuccessMessage('Course removed');
      await loadCourses();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to delete course');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        instructorId: Number(form.instructorId),
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        level: form.level,
        category: form.category.trim() || 'general',
        skills: parseListField(form.skills),
        tags: parseListField(form.tags),
        languages: parseListField(form.languages),
        deliveryFormat: form.deliveryFormat,
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        heroImageUrl: form.heroImageUrl.trim() || null,
        trailerUrl: form.trailerUrl.trim() || null,
        promoVideoUrl: form.promoVideoUrl.trim() || null,
        syllabusUrl: form.syllabusUrl.trim() || null,
        priceCurrency: form.priceCurrency.trim() || 'USD',
        priceAmount: form.priceAmount !== '' ? Number(form.priceAmount) : 0,
        isPublished: Boolean(form.isPublished),
        releaseAt: form.releaseAt ? new Date(form.releaseAt).toISOString() : null,
        status: form.status,
        metadata: parseMetadata(form.metadata)
      };

      if (mode === 'edit' && editingId) {
        await adminControlApi.updateCourse({ token, id: editingId, payload });
        setSuccessMessage('Course updated');
      } else {
        await adminControlApi.createCourse({ token, payload });
        setSuccessMessage('Course created');
      }
      await loadCourses();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to save course');
    } finally {
      setSubmitting(false);
    }
  };

  const adminPanel = useMemo(() => {
    if (!isAdmin) {
      return (
        <div className="rounded-4xl border border-slate-200 bg-white/80 p-8 text-sm text-slate-600">
          <p className="text-lg font-semibold text-slate-900">Course operations locked</p>
          <p className="mt-2 text-sm text-slate-600">
            Only administrators can publish catalogue updates. Request access from your organisation owner or send this request to compliance.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-4xl border border-slate-200 bg-white/90 p-8 shadow-xl">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Course console</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {mode === 'edit' ? 'Update course' : 'Create course'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Deploy new cohorts, update pricing or refresh metadata with a guarded workflow. Every CRUD operation writes to the production database and keeps the learner dashboard in sync.
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
          <CourseForm
            form={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            submitting={submitting}
            mode={mode}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
          />
        </div>
        <div className="mt-10 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Catalogue entries</p>
          {loading ? <p className="text-sm text-slate-500">Loading catalogue…</p> : null}
          {!loading && liveCourses.length === 0 ? (
            <p className="text-sm text-slate-500">No courses published yet.</p>
          ) : null}
          <div className="grid gap-3">
            {liveCourses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{course.title}</p>
                    <p className="text-xs text-slate-500">Status {course.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(course)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(course.id)}
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Format {course.deliveryFormat} · Level {course.level} · Published {course.isPublished ? 'yes' : 'no'}
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
    liveCourses,
    loading,
    handleSubmit,
    resetForm,
    successMessage,
    error
  ]);

  return (
    <div className="bg-slate-100 pb-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-6 py-16">
        <header className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Course operations
          </span>
          <h1 className="text-4xl font-semibold text-slate-900">Courses, fully instrumented</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Build, update and scale every cohort from one surface. The course marketplace, explorer search and production-ready CRUD console live together so your team can ship confidently.
          </p>
        </header>

        <section className="space-y-10">
          <ExplorerSearchSection {...EXPLORER_CONFIG} />
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Highlighted programs</h2>
            {highlightLoading ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Refreshing…</span>
            ) : null}
          </div>
          {highlightError ? (
            <p className="text-sm font-semibold text-rose-500">{highlightError}</p>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            {highlightCourses.map((course) => (
              <CourseHighlightCard key={course.id} course={course} />
            ))}
            {!highlightLoading && highlightCourses.length === 0 ? (
              <p className="text-sm text-slate-500">
                Sign in to load curated course highlights or publish a course using the console below.
              </p>
            ) : null}
            {highlightLoading ? <p className="text-sm text-slate-500">Loading courses…</p> : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Latest catalogue launches</h2>
            {catalogueLoading ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Refreshing…</span>
            ) : null}
          </div>
          {catalogueError ? (
            <p className="text-sm font-semibold text-rose-500">{catalogueError}</p>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            {catalogueCourses.map((course) => {
              const mapped = mapCatalogueCourse(course);
              if (!mapped) return null;
              return <CourseHighlightCard key={mapped.id} course={mapped} />;
            })}
            {!catalogueLoading && catalogueCourses.length === 0 ? (
              <p className="text-sm text-slate-500">No published courses yet. Check back soon.</p>
            ) : null}
          </div>
        </section>

        <section>{adminPanel}</section>
      </div>
    </div>
  );
}
