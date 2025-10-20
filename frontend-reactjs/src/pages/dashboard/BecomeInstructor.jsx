import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchInstructorApplication,
  saveInstructorApplication,
  submitInstructorApplication
} from '../../api/learnerDashboardApi.js';

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FORMAT_OPTIONS = ['Live cohort', 'Async cohort', 'On-demand library', 'Workshops', 'Office hours'];

const STEPS = [
  { id: 'motivation', title: 'Motivation & expertise', description: 'Share your teaching story and experience.', stage: 'intake' },
  { id: 'portfolio', title: 'Portfolio & proof', description: 'Link to signature outcomes, communities, and testimonials.', stage: 'portfolio' },
  { id: 'availability', title: 'Availability & delivery', description: 'Confirm when and how you want to run cohorts.', stage: 'logistics' },
  { id: 'review', title: 'Review & submit', description: 'Finalise details and submit to the partnerships team.', stage: 'review' }
];

function parseCommaSeparated(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseMultiline(value) {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function buildFormState(application) {
  if (!application) {
    return {
      id: null,
      status: 'draft',
      stage: 'intake',
      motivation: '',
      experienceYears: '',
      teachingFocus: '',
      portfolioUrl: '',
      marketingAssets: '',
      availabilityTimezone: '',
      availabilityNotes: '',
      availabilityPreferredDays: [],
      availabilitySessionFormats: []
    };
  }

  return {
    id: application.id ?? null,
    status: application.status ?? 'draft',
    stage: application.stage ?? 'intake',
    motivation: application.motivation ?? '',
    experienceYears: application.experienceYears != null ? String(application.experienceYears) : '',
    teachingFocus: Array.isArray(application.teachingFocus) ? application.teachingFocus.join(', ') : '',
    portfolioUrl: application.portfolioUrl ?? '',
    marketingAssets: Array.isArray(application.marketingAssets) ? application.marketingAssets.join('\n') : '',
    availabilityTimezone: application.availability?.timezone ?? '',
    availabilityNotes: application.availability?.notes ?? '',
    availabilityPreferredDays: Array.isArray(application.availability?.preferredDays)
      ? [...application.availability.preferredDays]
      : [],
    availabilitySessionFormats: Array.isArray(application.availability?.sessionFormats)
      ? [...application.availability.sessionFormats]
      : []
  };
}

export default function BecomeInstructor() {
  const { isLearner, section: teach, loading, error, refresh } = useLearnerDashboardSection('teach');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const initialForm = useMemo(() => buildFormState(teach?.application), [teach?.application]);
  const [form, setForm] = useState(initialForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const loadApplication = useCallback(async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const response = await fetchInstructorApplication({ token });
      const application = response?.data ?? response ?? null;
      if (application) {
        setForm(buildFormState(application));
      }
    } catch (loadError) {
      if (loadError?.status === 404) {
        setForm(buildFormState(null));
      } else {
        setStatusMessage({
          type: 'error',
          message: loadError instanceof Error ? loadError.message : 'Unable to load your application right now.'
        });
      }
    } finally {
      setSyncing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!teach?.application && token) {
      loadApplication();
    }
  }, [loadApplication, teach?.application, token]);

  const currentStep = STEPS[stepIndex] ?? STEPS[0];

  const handleFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }, []);

  const toggleArrayValue = useCallback((key, value) => {
    setForm((current) => {
      const existing = new Set(current[key]);
      if (existing.has(value)) {
        existing.delete(value);
      } else {
        existing.add(value);
      }
      return { ...current, [key]: Array.from(existing) };
    });
  }, []);

  const buildPayload = useCallback(
    () => ({
      status: form.status ?? 'draft',
      stage: currentStep.stage,
      motivation: form.motivation?.trim() || null,
      experienceYears: Number(form.experienceYears || 0),
      teachingFocus: parseCommaSeparated(form.teachingFocus),
      portfolioUrl: form.portfolioUrl?.trim() || null,
      marketingAssets: parseMultiline(form.marketingAssets),
      availability: {
        timezone: form.availabilityTimezone?.trim() || null,
        notes: form.availabilityNotes?.trim() || null,
        preferredDays: form.availabilityPreferredDays,
        sessionFormats: form.availabilitySessionFormats
      }
    }),
    [currentStep.stage, form]
  );

  const handleSave = useCallback(
    async (options = {}) => {
      const submit = Boolean(options.submit);
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to continue your instructor application.' });
        return;
      }
      setSyncing(true);
      try {
        const payload = buildPayload();
        if (submit) {
          const acknowledgement = await submitInstructorApplication({ token, payload });
          setStatusMessage({
            type: 'success',
            message: acknowledgement?.message ?? 'Application submitted. Expect a response within 48 hours.'
          });
        } else {
          const response = await saveInstructorApplication({ token, payload });
          setStatusMessage({
            type: 'success',
            message: response?.message ?? 'Application progress saved.'
          });
        }
        await Promise.all([refresh?.(), loadApplication()]);
        if (submit) {
          setStepIndex(STEPS.length - 1);
        }
      } catch (saveError) {
        setStatusMessage({
          type: 'error',
          message: saveError instanceof Error ? saveError.message : 'Unable to update your application right now.'
        });
      } finally {
        setSyncing(false);
      }
    },
    [buildPayload, loadApplication, refresh, token]
  );

  const goToStep = useCallback((index) => {
    setStepIndex(Math.min(Math.max(index, 0), STEPS.length - 1));
  }, []);

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner dashboard required"
        description="Switch to a learner Learnspace to access the instructor application wizard."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading instructor accelerator"
        description="Retrieving your application workspace."
      />
    );
  }

  if (error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load application"
        description={error.message ?? 'Refresh to try again.'}
        actionLabel="Retry"
        onAction={() => refresh?.()}
      />
    );
  }

  const nextSteps = Array.isArray(teach?.nextSteps) ? teach.nextSteps : [];

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-primary/20 bg-primary/5 p-8 text-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="dashboard-kicker text-primary">Instructor accelerator</p>
            <h1 className="text-3xl font-semibold text-slate-900">Turn your playbooks into premium cohorts</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              Apply for the Edulure instructor network to access production resources, cohort strategists, and the marketing
              engine powering our most successful programs.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-right">
            <span className="text-xs uppercase tracking-wide text-slate-500">Application status</span>
            <span className="text-lg font-semibold text-slate-900">{form.status ?? 'draft'}</span>
            <span className="text-xs text-slate-500">Stage · {form.stage ?? 'intake'}</span>
          </div>
        </div>
      </header>

      <nav aria-label="Application progress" className="rounded-3xl border border-slate-200 bg-white/70 p-6">
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map((step, index) => {
            const isActive = index === stepIndex;
            const isComplete = index < stepIndex || form.stage === 'submitted';
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary-dark'
                      : isComplete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <span className="block text-xs font-semibold uppercase tracking-wide">Step {index + 1}</span>
                  <span className="mt-1 block font-semibold">{step.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{step.description}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {statusMessage ? (
        <div
          role="status"
          className={`rounded-3xl border px-4 py-3 text-sm ${
            statusMessage.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}

      <section className="dashboard-section">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{currentStep.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{currentStep.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="dashboard-pill px-5 py-2 text-sm"
              disabled={syncing}
              onClick={() => handleSave({ submit: false })}
            >
              {syncing ? 'Saving…' : 'Save progress'}
            </button>
            {stepIndex === STEPS.length - 1 ? (
              <button
                type="button"
                className="dashboard-primary-pill px-5 py-2 text-sm"
                disabled={syncing}
                onClick={() => handleSave({ submit: true })}
              >
                {syncing ? 'Submitting…' : 'Submit application'}
              </button>
            ) : (
              <button
                type="button"
                className="dashboard-primary-pill px-5 py-2 text-sm"
                onClick={() => goToStep(stepIndex + 1)}
              >
                Continue
              </button>
            )}
          </div>
        </header>

        <div className="mt-6 space-y-6">
          {currentStep.id === 'motivation' ? (
            <Fragment>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Why do you want to teach with Edulure?
                <textarea
                  name="motivation"
                  value={form.motivation}
                  onChange={handleFieldChange}
                  rows={4}
                  placeholder="Share the transformation you want to create and how you support learners today."
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Years of experience
                  <input
                    name="experienceYears"
                    type="number"
                    min="0"
                    value={form.experienceYears}
                    onChange={handleFieldChange}
                    placeholder="6"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Teaching focus (comma separated)
                  <input
                    name="teachingFocus"
                    value={form.teachingFocus}
                    onChange={handleFieldChange}
                    placeholder="Product strategy, Research leadership"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
            </Fragment>
          ) : null}

          {currentStep.id === 'portfolio' ? (
            <Fragment>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Portfolio or flagship cohort URL
                <input
                  name="portfolioUrl"
                  value={form.portfolioUrl}
                  onChange={handleFieldChange}
                  placeholder="https://yourportfolio.example.com"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Marketing assets (one per line)
                <textarea
                  name="marketingAssets"
                  value={form.marketingAssets}
                  onChange={handleFieldChange}
                  rows={4}
                  placeholder="Testimonial video\nLaunch landing page"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
            </Fragment>
          ) : null}

          {currentStep.id === 'availability' ? (
            <Fragment>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Primary timezone
                  <input
                    name="availabilityTimezone"
                    value={form.availabilityTimezone}
                    onChange={handleFieldChange}
                    placeholder="UTC-5"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Additional notes
                  <input
                    name="availabilityNotes"
                    value={form.availabilityNotes}
                    onChange={handleFieldChange}
                    placeholder="Peak availability after 3pm ET"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
              <fieldset className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Preferred cohort days
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => (
                    <label key={day} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={form.availabilityPreferredDays.includes(day)}
                        onChange={() => toggleArrayValue('availabilityPreferredDays', day)}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Delivery formats
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {FORMAT_OPTIONS.map((format) => (
                    <label key={format} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={form.availabilitySessionFormats.includes(format)}
                        onChange={() => toggleArrayValue('availabilitySessionFormats', format)}
                      />
                      {format}
                    </label>
                  ))}
                </div>
              </fieldset>
            </Fragment>
          ) : null}

          {currentStep.id === 'review' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Snapshot</h3>
                <p className="mt-2 text-sm text-slate-600">{form.motivation || 'Add a motivation statement before submitting.'}</p>
                <dl className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Experience</dt>
                    <dd className="text-sm text-slate-900">{form.experienceYears || 'Not provided'} years</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teaching focus</dt>
                    <dd className="text-sm text-slate-900">{form.teachingFocus || 'Add your core focus areas'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Portfolio</dt>
                    <dd className="text-sm text-primary">
                      {form.portfolioUrl ? (
                        <a href={form.portfolioUrl} target="_blank" rel="noreferrer" className="hover:text-primary-dark">
                          {form.portfolioUrl}
                        </a>
                      ) : (
                        'Add a portfolio link'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Availability</dt>
                    <dd className="text-sm text-slate-900">
                      {form.availabilityTimezone || 'Add timezone'} · {form.availabilityPreferredDays.join(', ') || 'Select days'}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Marketing assets</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {parseMultiline(form.marketingAssets).map((asset) => (
                    <li key={asset}>{asset}</li>
                  ))}
                  {parseMultiline(form.marketingAssets).length === 0 && (
                    <li>Add launch assets or testimonials to accelerate review.</li>
                  )}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Next steps from Edulure</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {nextSteps.length
            ? nextSteps.map((step) => (
                <li key={step} className="rounded-2xl bg-slate-50 px-4 py-3">
                  {step}
                </li>
              ))
            : [
                'Our partnerships team will contact you within 48 hours after submission.',
                'Prepare examples of curriculum artefacts and cohort outcomes for the interview.'
              ].map((step) => (
                <li key={step} className="rounded-2xl bg-slate-50 px-4 py-3">
                  {step}
                </li>
              ))}
        </ul>
      </section>
    </div>
  );
}
