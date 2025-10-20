import { useCallback, useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import {
  createGrowthInitiative,
  updateGrowthInitiative,
  deleteGrowthInitiative,
  createGrowthExperiment,
  updateGrowthExperiment,
  deleteGrowthExperiment
} from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const INITIATIVE_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' }
];

const EXPERIMENT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
];

const emptyInitiativeForm = {
  id: null,
  slug: '',
  title: '',
  status: 'planning',
  objective: '',
  primaryMetric: '',
  baselineValue: '',
  targetValue: '',
  currentValue: '',
  startAt: '',
  endAt: '',
  tags: ''
};

const emptyExperimentForm = {
  id: null,
  name: '',
  status: 'draft',
  hypothesis: '',
  metric: '',
  baselineValue: '',
  targetValue: '',
  resultValue: '',
  startAt: '',
  endAt: '',
  segments: ''
};

function InitiativeForm({ form, onChange, onSubmit, onCancel, submitting }) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Slug
          <input
            required
            name="slug"
            value={form.slug}
            onChange={onChange}
            placeholder="summer-accelerator"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Title
          <input
            required
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="Summer cohort growth sprint"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Status
          <select
            name="status"
            value={form.status}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {INITIATIVE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Baseline
          <input
            name="baselineValue"
            type="number"
            step="0.01"
            value={form.baselineValue}
            onChange={onChange}
            placeholder="35"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Target
          <input
            name="targetValue"
            type="number"
            step="0.01"
            value={form.targetValue}
            onChange={onChange}
            placeholder="50"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Current value
          <input
            name="currentValue"
            type="number"
            step="0.01"
            value={form.currentValue}
            onChange={onChange}
            placeholder="42"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Primary metric
          <input
            name="primaryMetric"
            value={form.primaryMetric}
            onChange={onChange}
            placeholder="Weekly active learners"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Start date
          <input
            name="startAt"
            type="date"
            value={form.startAt}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          End date
          <input
            name="endAt"
            type="date"
            value={form.endAt}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        Objective
        <textarea
          name="objective"
          value={form.objective}
          onChange={onChange}
          rows={3}
          placeholder="Launch summer referral sprint to unlock 50% cohort growth."
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        Tags
        <input
          name="tags"
          value={form.tags}
          onChange={onChange}
          placeholder="referrals, paid ads, conversion"
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="dashboard-primary-pill px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save initiative'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="dashboard-pill px-5 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

InitiativeForm.defaultProps = {
  submitting: false
};

function ExperimentForm({ form, onChange, onSubmit, onCancel, submitting }) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Name
          <input
            required
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Referral landing page test"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Status
          <select
            name="status"
            value={form.status}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {EXPERIMENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Baseline
          <input
            name="baselineValue"
            type="number"
            step="0.01"
            value={form.baselineValue}
            onChange={onChange}
            placeholder="2.3"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Target
          <input
            name="targetValue"
            type="number"
            step="0.01"
            value={form.targetValue}
            onChange={onChange}
            placeholder="3.5"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Result
          <input
            name="resultValue"
            type="number"
            step="0.01"
            value={form.resultValue}
            onChange={onChange}
            placeholder="3.1"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        Metric tracked
        <input
          name="metric"
          value={form.metric}
          onChange={onChange}
          placeholder="Conversion rate"
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        Hypothesis
        <textarea
          name="hypothesis"
          value={form.hypothesis}
          onChange={onChange}
          rows={3}
          placeholder="If we simplify the referral landing page, conversion will increase by 35%."
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Start date
          <input
            name="startAt"
            type="date"
            value={form.startAt}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          End date
          <input
            name="endAt"
            type="date"
            value={form.endAt}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        Segments (comma separated)
        <input
          name="segments"
          value={form.segments}
          onChange={onChange}
          placeholder="referrals, alumni, partner network"
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="dashboard-primary-pill px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save experiment'}
        </button>
        <button type="button" onClick={onCancel} className="dashboard-pill px-5 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

ExperimentForm.defaultProps = {
  submitting: false
};

export default function LearnerGrowth() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const { isLearner, section: growth, loading, error, refresh } = useLearnerDashboardSection('growth');

  const [statusMessage, setStatusMessage] = useState(null);
  const [initiativeForm, setInitiativeForm] = useState(emptyInitiativeForm);
  const [initiativeFormVisible, setInitiativeFormVisible] = useState(false);
  const [initiativeSubmitting, setInitiativeSubmitting] = useState(false);
  const [experimentForm, setExperimentForm] = useState(emptyExperimentForm);
  const [experimentParentId, setExperimentParentId] = useState(null);
  const [experimentSubmitting, setExperimentSubmitting] = useState(false);

  const initiatives = useMemo(() => Array.isArray(growth?.initiatives) ? growth.initiatives : [], [growth?.initiatives]);
  const metrics = useMemo(() => Array.isArray(growth?.metrics) ? growth.metrics : [], [growth?.metrics]);

  const resetInitiativeForm = useCallback(() => {
    setInitiativeForm(emptyInitiativeForm);
    setInitiativeFormVisible(false);
    setInitiativeSubmitting(false);
  }, []);

  const handleInitiativeFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setInitiativeForm((current) => ({ ...current, [name]: value }));
  }, []);

  const openInitiativeForm = useCallback((initiative) => {
    if (initiative) {
      setInitiativeForm({
        id: initiative.id,
        slug: initiative.slug ?? '',
        title: initiative.title ?? '',
        status: initiative.status ?? 'planning',
        objective: initiative.objective ?? '',
        primaryMetric: initiative.primaryMetric ?? '',
        baselineValue: initiative.baselineValue ?? '',
        targetValue: initiative.targetValue ?? '',
        currentValue: initiative.currentValue ?? '',
        startAt: initiative.startAt ? initiative.startAt.slice(0, 10) : '',
        endAt: initiative.endAt ? initiative.endAt.slice(0, 10) : '',
        tags: Array.isArray(initiative.tags) ? initiative.tags.join(', ') : ''
      });
    } else {
      setInitiativeForm(emptyInitiativeForm);
    }
    setInitiativeFormVisible(true);
  }, []);

  const handleInitiativeSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to manage growth initiatives.' });
      return;
    }
    setInitiativeSubmitting(true);
    const payload = {
      slug: initiativeForm.slug.trim(),
      title: initiativeForm.title.trim(),
      status: initiativeForm.status,
      objective: initiativeForm.objective?.trim() || undefined,
      primaryMetric: initiativeForm.primaryMetric?.trim() || undefined,
      baselineValue: initiativeForm.baselineValue ? Number(initiativeForm.baselineValue) : undefined,
      targetValue: initiativeForm.targetValue ? Number(initiativeForm.targetValue) : undefined,
      currentValue: initiativeForm.currentValue ? Number(initiativeForm.currentValue) : undefined,
      startAt: initiativeForm.startAt || undefined,
      endAt: initiativeForm.endAt || undefined,
      tags: initiativeForm.tags
        ? initiativeForm.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : []
    };
    try {
      if (initiativeForm.id) {
        await updateGrowthInitiative({ token, initiativeId: initiativeForm.id, payload });
        setStatusMessage({ type: 'success', message: 'Growth initiative updated.' });
      } else {
        await createGrowthInitiative({ token, payload });
        setStatusMessage({ type: 'success', message: 'Growth initiative created.' });
      }
      resetInitiativeForm();
      await refresh?.();
    } catch (submitError) {
      setStatusMessage({
        type: 'error',
        message:
          submitError instanceof Error ? submitError.message : 'Unable to save the growth initiative. Please try again.'
      });
    } finally {
      setInitiativeSubmitting(false);
    }
  }, [initiativeForm, resetInitiativeForm, refresh, token]);

  const handleInitiativeDelete = useCallback(
    async (initiative) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage growth initiatives.' });
        return;
      }
      setStatusMessage({ type: 'pending', message: `Removing ${initiative.title}…` });
      try {
        await deleteGrowthInitiative({ token, initiativeId: initiative.id });
        setStatusMessage({ type: 'success', message: `${initiative.title} removed.` });
        await refresh?.();
      } catch (deleteError) {
        setStatusMessage({
          type: 'error',
          message:
            deleteError instanceof Error ? deleteError.message : 'Unable to remove the growth initiative at this time.'
        });
      }
    },
    [refresh, token]
  );

  const openExperimentForm = useCallback((initiativeId, experiment) => {
    setExperimentParentId(initiativeId);
    if (experiment) {
      setExperimentForm({
        id: experiment.id,
        name: experiment.name ?? '',
        status: experiment.status ?? 'draft',
        hypothesis: experiment.hypothesis ?? '',
        metric: experiment.metric ?? '',
        baselineValue: experiment.baselineValue ?? '',
        targetValue: experiment.targetValue ?? '',
        resultValue: experiment.resultValue ?? '',
        startAt: experiment.startAt ? experiment.startAt.slice(0, 10) : '',
        endAt: experiment.endAt ? experiment.endAt.slice(0, 10) : '',
        segments: Array.isArray(experiment.segments) ? experiment.segments.join(', ') : ''
      });
    } else {
      setExperimentForm(emptyExperimentForm);
    }
  }, []);

  const resetExperimentForm = useCallback(() => {
    setExperimentForm(emptyExperimentForm);
    setExperimentParentId(null);
    setExperimentSubmitting(false);
  }, []);

  const handleExperimentFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setExperimentForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleExperimentSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token || !experimentParentId) {
        setStatusMessage({ type: 'error', message: 'Select an initiative before creating experiments.' });
        return;
      }
      setExperimentSubmitting(true);
      const payload = {
        name: experimentForm.name.trim(),
        status: experimentForm.status,
        hypothesis: experimentForm.hypothesis?.trim() || undefined,
        metric: experimentForm.metric?.trim() || undefined,
        baselineValue: experimentForm.baselineValue ? Number(experimentForm.baselineValue) : undefined,
        targetValue: experimentForm.targetValue ? Number(experimentForm.targetValue) : undefined,
        resultValue: experimentForm.resultValue ? Number(experimentForm.resultValue) : undefined,
        startAt: experimentForm.startAt || undefined,
        endAt: experimentForm.endAt || undefined,
        segments: experimentForm.segments
          ? experimentForm.segments
              .split(',')
              .map((segment) => segment.trim())
              .filter(Boolean)
          : []
      };
      try {
        if (experimentForm.id) {
          await updateGrowthExperiment({
            token,
            initiativeId: experimentParentId,
            experimentId: experimentForm.id,
            payload
          });
          setStatusMessage({ type: 'success', message: 'Experiment updated.' });
        } else {
          await createGrowthExperiment({ token, initiativeId: experimentParentId, payload });
          setStatusMessage({ type: 'success', message: 'Experiment created.' });
        }
        resetExperimentForm();
        await refresh?.();
      } catch (submitError) {
        setStatusMessage({
          type: 'error',
          message: submitError instanceof Error ? submitError.message : 'Unable to save the experiment.'
        });
      } finally {
        setExperimentSubmitting(false);
      }
    },
    [experimentForm, experimentParentId, refresh, resetExperimentForm, token]
  );

  const handleExperimentDelete = useCallback(
    async (initiativeId, experiment) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage growth experiments.' });
        return;
      }
      setStatusMessage({ type: 'pending', message: `Removing experiment ${experiment.name}…` });
      try {
        await deleteGrowthExperiment({ token, initiativeId, experimentId: experiment.id });
        setStatusMessage({ type: 'success', message: `${experiment.name} removed.` });
        await refresh?.();
      } catch (deleteError) {
        setStatusMessage({
          type: 'error',
          message: deleteError instanceof Error ? deleteError.message : 'Unable to remove the experiment right now.'
        });
      }
    },
    [refresh, token]
  );

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
        description="Switch to the learner dashboard to orchestrate growth experiments and initiatives."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading growth workspace"
        description="We are assembling your experiments, initiatives, and performance metrics."
      />
    );
  }

  if (error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load growth data"
        description={error.message ?? 'Growth metrics are unavailable right now. Please refresh to try again.'}
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  if (!growth || initiatives.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Launch your first growth initiative</h1>
          <p className="mt-2 text-sm text-slate-600">
            Pair your experiments with tracked objectives and automate the analytics feed for the learner success team.
          </p>
          <button type="button" onClick={() => openInitiativeForm(null)} className="dashboard-primary-pill mt-4">
            Create initiative
          </button>
        </div>
        {statusMessage ? (
          <p
            className={`rounded-2xl px-4 py-3 text-sm ${
              statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-700'
                : statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : statusMessage.type === 'pending'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
            }`}
          >
            {statusMessage.message}
          </p>
        ) : null}
        {initiativeFormVisible ? (
          <div className="dashboard-section">
            <h2 className="text-lg font-semibold text-slate-900">
              {initiativeForm.id ? 'Edit initiative' : 'New initiative'}
            </h2>
            <InitiativeForm
              form={initiativeForm}
              onChange={handleInitiativeFieldChange}
              onSubmit={handleInitiativeSubmit}
              onCancel={resetInitiativeForm}
              submitting={initiativeSubmitting}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="dashboard-kicker text-primary">Growth workspace</p>
          <h1 className="dashboard-title">Experiment on your learner pipeline</h1>
          <p className="dashboard-subtitle">
            Track initiatives, align experiments, and keep the revenue team updated on what is shipping next.
          </p>
        </div>
        <button type="button" onClick={() => openInitiativeForm(null)} className="dashboard-primary-pill">
          New initiative
        </button>
      </header>

      {statusMessage ? (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm ${
            statusMessage.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : statusMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : statusMessage.type === 'pending'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}

      {metrics.length ? (
        <section className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-3xl border border-slate-200 bg-white/60 p-6 shadow-sm"
            >
              <p className="dashboard-kicker">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value ?? '—'}</p>
            </div>
          ))}
        </section>
      ) : null}

      {initiativeFormVisible ? (
        <section className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">
            {initiativeForm.id ? 'Edit initiative' : 'New initiative'}
          </h2>
          <InitiativeForm
            form={initiativeForm}
            onChange={handleInitiativeFieldChange}
            onSubmit={handleInitiativeSubmit}
            onCancel={resetInitiativeForm}
            submitting={initiativeSubmitting}
          />
        </section>
      ) : null}

      <section className="space-y-6">
        {initiatives.map((initiative) => (
          <article
            key={initiative.id}
            className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="dashboard-kicker">{initiative.slug}</p>
                <h2 className="text-xl font-semibold text-slate-900">{initiative.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{initiative.objective || 'Define your initiative objective.'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                    {initiative.status}
                  </span>
                  {initiative.primaryMetric ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                      Metric · {initiative.primaryMetric}
                    </span>
                  ) : null}
                  {Array.isArray(initiative.tags) && initiative.tags.length
                    ? initiative.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600"
                        >
                          {tag}
                        </span>
                      ))
                    : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="dashboard-pill px-4 py-2 text-sm"
                  onClick={() => openInitiativeForm(initiative)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="dashboard-pill border-rose-200 bg-rose-50 text-rose-600 px-4 py-2 text-sm"
                  onClick={() => handleInitiativeDelete(initiative)}
                >
                  Archive
                </button>
              </div>
            </div>

            <dl className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <dt className="dashboard-kicker">Baseline</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {initiative.baselineValue ?? '—'}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <dt className="dashboard-kicker">Target</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {initiative.targetValue ?? '—'}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <dt className="dashboard-kicker">Current</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {initiative.currentValue ?? '—'}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <dt className="dashboard-kicker">Timeline</dt>
                <dd className="mt-1 text-sm text-slate-600">
                  {initiative.startAt ? initiative.startAt.slice(0, 10) : 'TBC'} –{' '}
                  {initiative.endAt ? initiative.endAt.slice(0, 10) : 'TBC'}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Experiments</h3>
                <button
                  type="button"
                  onClick={() => openExperimentForm(initiative.id, null)}
                  className="dashboard-pill px-4 py-2 text-sm"
                >
                  Add experiment
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {(initiative.experiments ?? []).map((experiment) => (
                  <div
                    key={experiment.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{experiment.name}</p>
                        <p className="text-xs text-slate-500">{experiment.metric || 'No metric assigned'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                          {experiment.status}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                          Baseline · {experiment.baselineValue ?? '—'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                          Target · {experiment.targetValue ?? '—'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                          Result · {experiment.resultValue ?? '—'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      {experiment.hypothesis || 'Document your hypothesis to rally the growth squad.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="dashboard-pill px-4 py-1.5 text-xs"
                        onClick={() => openExperimentForm(initiative.id, experiment)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill border-rose-200 bg-rose-50 px-4 py-1.5 text-xs text-rose-600"
                        onClick={() => handleExperimentDelete(initiative.id, experiment)}
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
                {experimentParentId === initiative.id ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <ExperimentForm
                      form={experimentForm}
                      onChange={handleExperimentFieldChange}
                      onSubmit={handleExperimentSubmit}
                      onCancel={resetExperimentForm}
                      submitting={experimentSubmitting}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
