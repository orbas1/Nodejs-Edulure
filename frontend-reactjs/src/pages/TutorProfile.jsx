import { useCallback, useEffect, useMemo, useState } from 'react';
import { GlobeAltIcon, UserGroupIcon } from '@heroicons/react/24/outline';

import ExplorerSearchSection from '../components/search/ExplorerSearchSection.jsx';
import FormStepper from '../components/forms/FormStepper.jsx';
import adminControlApi from '../api/adminControlApi.js';
import { searchExplorer } from '../api/explorerApi.js';
import { createTutorBookingRequest } from '../api/learnerDashboardApi.js';
import { listPublicTutors } from '../api/catalogueApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const EXPLORER_CONFIG = {
  entityType: 'tutors',
  title: 'Search verified tutors',
  description:
    'Scout tutors by expertise, response time and availability. Saved searches keep your learner support squad in sync.',
  placeholder: 'Search tutors by expertise, language or timezone…',
  defaultSort: 'relevance',
  sortOptions: [
    { label: 'Relevance', value: 'relevance' },
    { label: 'Top rated', value: 'rating' },
    { label: 'Price: low to high', value: 'priceLow' },
    { label: 'Price: high to low', value: 'priceHigh' },
    { label: 'Fastest response', value: 'responseTime' }
  ],
  filterDefinitions: [
    { key: 'isVerified', label: 'Verified only', type: 'boolean' },
    {
      key: 'languages',
      label: 'Languages',
      type: 'multi',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Spanish', value: 'es' },
        { label: 'Japanese', value: 'ja' },
        { label: 'French', value: 'fr' }
      ]
    },
    {
      key: 'skills',
      label: 'Skills',
      type: 'multi',
      options: [
        { label: 'Automation', value: 'automation' },
        { label: 'Curriculum design', value: 'curriculum' },
        { label: 'Growth marketing', value: 'growth' },
        { label: 'Product analytics', value: 'analytics' }
      ]
    }
  ]
};

const FORM_STEPS = [
  { id: 'profile', title: 'Profile', description: 'Identity, headline and story' },
  { id: 'capability', title: 'Capability', description: 'Skills, languages, availability' },
  { id: 'commercials', title: 'Commercials', description: 'Rates, verification and metadata' }
];

function createEmptyForm() {
  return {
    userId: '',
    displayName: '',
    headline: '',
    bio: '',
    skills: '',
    languages: '',
    country: '',
    timezones: '',
    availabilityPreferences: '',
    hourlyRateCurrency: 'USD',
    hourlyRateAmount: '',
    isVerified: false,
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

function formatRate(amount, currency = 'USD') {
  if (amount === null || amount === undefined || amount === '') {
    return 'Contact for pricing';
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

function TutorCard({ tutor, onRequest }) {
  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            <UserGroupIcon className="h-4 w-4" /> Tutor
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">{tutor.displayName}</h3>
          {tutor.headline ? <p className="text-sm font-medium text-slate-500">{tutor.headline}</p> : null}
          {tutor.bio ? <p className="text-sm leading-relaxed text-slate-600">{tutor.bio}</p> : null}
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {tutor.languages?.length ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                {tutor.languages.join(', ')}
              </span>
            ) : null}
            {tutor.timezones?.length ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-600">
                {tutor.timezones.join(', ')}
              </span>
            ) : null}
            {tutor.country ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
                {tutor.country}
              </span>
            ) : null}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <GlobeAltIcon className="h-4 w-4" /> Hourly rate
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{tutor.hourlyRate}</p>
          <p className="text-xs text-slate-500">{tutor.isVerified ? 'Verified expert' : 'Pending verification'}</p>
        </div>
      </div>
      {tutor.skills?.length ? (
        <div className="flex flex-wrap gap-2">
          {tutor.skills.map((skill) => (
            <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              #{skill}
            </span>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onRequest}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark"
      >
        Request session
      </button>
    </article>
  );
}

function mapCatalogueTutor(tutor) {
  if (!tutor) {
    return null;
  }
  return {
    id: tutor.id ?? tutor.publicId ?? tutor.userId ?? tutor.displayName,
    displayName: tutor.displayName,
    headline: tutor.headline ?? null,
    bio: tutor.bio ?? null,
    skills: Array.isArray(tutor.skills) ? tutor.skills : [],
    languages: Array.isArray(tutor.languages) ? tutor.languages : ['en'],
    country: tutor.country ?? null,
    timezones: Array.isArray(tutor.timezones) ? tutor.timezones : ['Etc/UTC'],
    hourlyRate: formatRate(tutor.hourlyRateAmount, tutor.hourlyRateCurrency ?? 'USD'),
    isVerified: Boolean(tutor.isVerified)
  };
}

function TutorForm({ form, onChange, onSubmit, onCancel, submitting, mode, currentStep, setCurrentStep }) {
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
      {currentStep === 'profile' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">User ID</span>
            <input
              type="number"
              name="userId"
              value={form.userId}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Display name</span>
            <input
              type="text"
              name="displayName"
              value={form.displayName}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Headline</span>
            <input
              type="text"
              name="headline"
              value={form.headline}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Bio</span>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      {currentStep === 'capability' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Skills</span>
            <input
              type="text"
              name="skills"
              value={form.skills}
              onChange={handleChange}
              placeholder="Automation, Ops"
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
            <span className="text-sm font-semibold text-slate-700">Country (ISO)</span>
            <input
              type="text"
              name="country"
              value={form.country}
              onChange={handleChange}
              placeholder="US"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Timezones</span>
            <input
              type="text"
              name="timezones"
              value={form.timezones}
              onChange={handleChange}
              placeholder="America/New_York, Europe/London"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Availability preferences (JSON)</span>
            <textarea
              name="availabilityPreferences"
              value={form.availabilityPreferences}
              onChange={handleChange}
              rows={4}
              placeholder='{"preferredDays": ["Mon","Wed"], "hoursPerWeek": 10}'
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      {currentStep === 'commercials' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Hourly rate</span>
            <input
              type="number"
              name="hourlyRateAmount"
              value={form.hourlyRateAmount}
              min="0"
              step="0.01"
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Currency</span>
            <input
              type="text"
              name="hourlyRateCurrency"
              value={form.hourlyRateCurrency}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            <input
              type="checkbox"
              name="isVerified"
              checked={form.isVerified}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              disabled={disabled}
            />
            Verified tutor
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Metadata (JSON)</span>
            <textarea
              name="metadata"
              value={form.metadata}
              onChange={handleChange}
              rows={4}
              placeholder='{"specialNotes": "Requires NDA"}'
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
          {mode === 'edit' ? 'Update tutor' : 'Create tutor'}
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

export default function TutorProfile() {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken;
  const role = String(session?.user?.role ?? '').toLowerCase();
  const isAdmin = role === 'admin';

  const [highlightTutors, setHighlightTutors] = useState([]);
  const [highlightLoading, setHighlightLoading] = useState(false);
  const [highlightError, setHighlightError] = useState(null);
  const [featuredTutors, setFeaturedTutors] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredError, setFeaturedError] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState(() => createEmptyForm());
  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [currentStep, setCurrentStep] = useState('profile');
  const [submitting, setSubmitting] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingTopic, setBookingTopic] = useState('');
  const [bookingTutorId, setBookingTutorId] = useState('');
  const [bookingStatus, setBookingStatus] = useState(null);

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
            entityTypes: ['tutors'],
            filters: {},
            globalFilters: {},
            sort: { tutors: 'relevance' },
            page: 1,
            perPage: 6
          };

          const response = await searchExplorer(payload, { token, signal: controller.signal });
          if (!active) return;
          if (!response?.success) {
            throw new Error(response?.message ?? 'Search failed');
          }
          const hits = response.data?.results?.tutors?.hits ?? [];
          setHighlightTutors(
            hits.map((hit, index) => ({
              id: hit.id ?? hit.slug ?? `tutor-${index}`,
              displayName: hit.title ?? hit.name,
              headline: hit.subtitle ?? hit.metrics?.headline,
              bio: hit.description ?? hit.summary,
              skills: hit.tags ?? hit.metrics?.skills ?? [],
              languages: hit.languages ?? hit.metrics?.languages ?? [],
              country: hit.raw?.country ?? hit.geo?.country ?? null,
              timezones: hit.metrics?.timezones ?? [],
              hourlyRate: hit.price?.formatted ?? hit.metrics?.hourlyRate ?? '$0',
              isVerified: Boolean(hit.metrics?.isVerified ?? hit.isVerified)
            }))
          );
          return;
        }
        throw Object.assign(new Error('Authentication required for personalised tutor scouting'), { status: 401 });
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!token || err.status === 401 || err.status === 403) {
          try {
            const fallback = await listPublicTutors({ signal: controller.signal, params: { limit: 6 } });
            if (!active) return;
            const items = (fallback?.data ?? []).map(mapCatalogueTutor).filter(Boolean);
            setHighlightTutors(items);
            if (token && (err.status === 401 || err.status === 403)) {
              setHighlightError('Limited tutor results shown. Reauthenticate to view verified partner insights.');
            } else {
              setHighlightError(null);
            }
            return;
          } catch (fallbackError) {
            if (controller.signal.aborted) return;
            setHighlightTutors([]);
            setHighlightError(fallbackError.message ?? 'Unable to load tutors');
            return;
          }
        }
        setHighlightTutors([]);
        setHighlightError(err.message ?? 'Unable to load tutors');
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
    setFeaturedLoading(true);
    setFeaturedError(null);

    listPublicTutors({ signal: controller.signal, params: { limit: 8 } })
      .then((response) => {
        if (!active) return;
        setFeaturedTutors(response?.data ?? []);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setFeaturedTutors([]);
        setFeaturedError(err.message ?? 'Unable to load featured tutors');
      })
      .finally(() => {
        if (active) {
          setFeaturedLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const loadTutors = useCallback(async () => {
    if (!isAdmin || !token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await adminControlApi.listTutors({ token, params: { perPage: 50 } });
      setTutors(response?.data ?? []);
    } catch (err) {
      setError(err.message ?? 'Unable to load tutors');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    loadTutors();
  }, [loadTutors]);

  const resetForm = useCallback(() => {
    setForm(createEmptyForm());
    setMode('create');
    setEditingId(null);
    setCurrentStep('profile');
  }, []);

  const handleEdit = (tutor) => {
    setMode('edit');
    setEditingId(tutor.id);
    setCurrentStep('profile');
    setForm({
      userId: tutor.userId ?? '',
      displayName: tutor.displayName ?? '',
      headline: tutor.headline ?? '',
      bio: tutor.bio ?? '',
      skills: Array.isArray(tutor.skills) ? tutor.skills.join(', ') : '',
      languages: Array.isArray(tutor.languages) ? tutor.languages.join(', ') : '',
      country: tutor.country ?? '',
      timezones: Array.isArray(tutor.timezones) ? tutor.timezones.join(', ') : '',
      availabilityPreferences: tutor.availabilityPreferences
        ? JSON.stringify(tutor.availabilityPreferences, null, 2)
        : '',
      hourlyRateCurrency: tutor.hourlyRateCurrency ?? 'USD',
      hourlyRateAmount: tutor.hourlyRateAmount ? Number(tutor.hourlyRateAmount) / 100 : '',
      isVerified: Boolean(tutor.isVerified),
      metadata: tutor.metadata ? JSON.stringify(tutor.metadata, null, 2) : ''
    });
  };

  const handleDelete = async (tutorId) => {
    if (!isAdmin || !token) return;
    if (!window.confirm('Delete this tutor profile?')) return;
    try {
      await adminControlApi.deleteTutor({ token, id: tutorId });
      setSuccessMessage('Tutor removed');
      await loadTutors();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to delete tutor');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        userId: Number(form.userId),
        displayName: form.displayName.trim(),
        headline: form.headline.trim() || null,
        bio: form.bio.trim() || null,
        skills: parseListField(form.skills),
        languages: parseListField(form.languages),
        country: form.country.trim() || null,
        timezones: parseListField(form.timezones),
        availabilityPreferences: parseMetadata(form.availabilityPreferences),
        hourlyRateCurrency: form.hourlyRateCurrency.trim() || 'USD',
        hourlyRateAmount: form.hourlyRateAmount !== '' ? Number(form.hourlyRateAmount) : 0,
        isVerified: Boolean(form.isVerified),
        metadata: parseMetadata(form.metadata)
      };

      if (mode === 'edit' && editingId) {
        await adminControlApi.updateTutor({ token, id: editingId, payload });
        setSuccessMessage('Tutor updated');
      } else {
        await adminControlApi.createTutor({ token, payload });
        setSuccessMessage('Tutor created');
      }
      await loadTutors();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to save tutor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingRequest = async (tutor) => {
    if (!isAuthenticated || !token) {
      setBookingStatus('Sign in to request a tutor session.');
      return;
    }
    try {
      const payload = {
        tutorId: tutor.id ?? tutor.publicId ?? bookingTutorId,
        topic: bookingTopic || `Session with ${tutor.displayName}`,
        message: bookingMessage
      };
      await createTutorBookingRequest({ token, payload });
      setBookingStatus('Tutor booking request submitted. We will confirm shortly.');
      setBookingTutorId('');
      setBookingTopic('');
      setBookingMessage('');
    } catch (err) {
      setBookingStatus(err.message ?? 'Unable to submit tutor booking request');
    }
  };

  const adminPanel = useMemo(() => {
    if (!isAdmin) {
      return (
        <div className="rounded-4xl border border-slate-200 bg-white/80 p-8 text-sm text-slate-600">
          <p className="text-lg font-semibold text-slate-900">Tutor management locked</p>
          <p className="mt-2 text-sm text-slate-600">
            Only administrators can update tutor profiles. Request elevated permissions or share this workflow with your operations lead.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-4xl border border-slate-200 bg-white/90 p-8 shadow-xl">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Tutor console</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {mode === 'edit' ? 'Update tutor' : 'Create tutor'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Control tutor supply, verification and availability signals from one guarded workflow. All CRUD operations sync to the learner helpdesk.
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
          <TutorForm
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
          <p className="text-sm font-semibold text-slate-700">Tutor roster</p>
          {loading ? <p className="text-sm text-slate-500">Loading tutors…</p> : null}
          {!loading && tutors.length === 0 ? (
            <p className="text-sm text-slate-500">No tutors registered yet.</p>
          ) : null}
          <div className="grid gap-3">
            {tutors.map((tutor) => (
              <div
                key={tutor.id}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{tutor.displayName}</p>
                    <p className="text-xs text-slate-500">Verified {tutor.isVerified ? 'yes' : 'no'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(tutor)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tutor.id)}
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Skills {Array.isArray(tutor.skills) ? tutor.skills.join(', ') : '—'} · Rate {(tutor.hourlyRateAmount ?? 0) / 100}
                  {tutor.hourlyRateCurrency}
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
    tutors,
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
            Tutor network
          </span>
          <h1 className="text-4xl font-semibold text-slate-900">Tutor profiles, ready for production</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Discover experts, route learner requests and govern availability from a single operational surface. Everything below is backed by production-ready CRUD workflows.
          </p>
        </header>

        <section className="space-y-10">
          <ExplorerSearchSection {...EXPLORER_CONFIG} />
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Highlighted tutors</h2>
            {highlightLoading ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Refreshing…</span>
            ) : null}
          </div>
          {highlightError ? (
            <p className="text-sm font-semibold text-rose-500">{highlightError}</p>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            {highlightTutors.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} onRequest={() => handleBookingRequest(tutor)} />
            ))}
            {!highlightLoading && highlightTutors.length === 0 ? (
              <p className="text-sm text-slate-500">Sign in to view curated tutors or publish profiles using the console below.</p>
            ) : null}
            {highlightLoading ? <p className="text-sm text-slate-500">Loading tutors…</p> : null}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Request a live session</h3>
            <p className="mt-2 text-sm text-slate-600">
              Learners can request bespoke sessions. Provide a topic and optional message and we will route it to the best tutor.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={bookingTutorId}
                onChange={(event) => setBookingTutorId(event.target.value)}
                placeholder="Tutor ID or slug"
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="text"
                value={bookingTopic}
                onChange={(event) => setBookingTopic(event.target.value)}
                placeholder="Session topic"
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <textarea
              value={bookingMessage}
              onChange={(event) => setBookingMessage(event.target.value)}
              rows={3}
              placeholder="Any specific agenda or materials?"
              className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() =>
                handleBookingRequest({
                  id: bookingTutorId,
                  displayName: bookingTutorId || 'Tutor',
                  hourlyRate: '',
                  isVerified: false
                })
              }
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark"
            >
              Request session
            </button>
            {bookingStatus ? (
              <p className="mt-3 rounded-2xl bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white">{bookingStatus}</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Trusted tutor roster</h2>
            {featuredLoading ? (
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Refreshing…</span>
            ) : null}
          </div>
          {featuredError ? (
            <p className="text-sm font-semibold text-rose-500">{featuredError}</p>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            {featuredTutors.map((tutor) => {
              const mapped = mapCatalogueTutor(tutor);
              if (!mapped) return null;
              return <TutorCard key={mapped.id} tutor={mapped} onRequest={() => handleBookingRequest(mapped)} />;
            })}
            {!featuredLoading && featuredTutors.length === 0 ? (
              <p className="text-sm text-slate-500">No public tutor profiles yet. Check back soon.</p>
            ) : null}
          </div>
        </section>

        <section>{adminPanel}</section>
      </div>
    </div>
  );
}
