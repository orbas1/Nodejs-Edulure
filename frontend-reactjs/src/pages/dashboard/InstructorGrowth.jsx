import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCommunities } from '../../api/communityApi.js';
import withInstructorDashboardAccess from './instructor/withInstructorDashboardAccess.jsx';
import {
  createCommunityGrowthExperiment,
  deleteCommunityGrowthExperiment,
  listCommunityGrowthExperiments,
  updateCommunityGrowthExperiment
} from '../../api/communityProgrammingApi.js';

const STATUS_OPTIONS = ['Ideation', 'Design', 'Building', 'Live', 'Completed', 'Archived'];

const createExperimentDraft = () => ({
  title: '',
  ownerName: '',
  status: 'Ideation',
  targetMetric: '',
  baselineValue: '',
  targetValue: '',
  impactScore: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  hypothesis: '',
  notes: '',
  experimentUrl: ''
});

const createLoadState = () => ({
  items: [],
  pagination: { total: 0, count: 0, limit: 0, offset: 0 },
  loading: false,
  error: null
});

const normalisePagination = (pagination, fallbackCount = 0) => ({
  total: typeof pagination?.total === 'number' ? pagination.total : fallbackCount,
  count: typeof pagination?.count === 'number' ? pagination.count : fallbackCount,
  limit:
    typeof pagination?.limit === 'number'
      ? pagination.limit
      : fallbackCount > 0
        ? fallbackCount
        : 0,
  offset: typeof pagination?.offset === 'number' ? pagination.offset : 0
});

function normaliseExperiment(experiment) {
  const statusValue = String(experiment.status ?? 'ideation').toLowerCase();
  const statusLabel = statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
  return {
    id: experiment.id ?? `${experiment.title}-${statusLabel}`,
    title: experiment.title ?? 'Untitled initiative',
    ownerName: experiment.ownerName ?? '',
    status: statusLabel,
    statusValue,
    targetMetric: experiment.targetMetric ?? '',
    baselineValue: experiment.baselineValue != null ? Number(experiment.baselineValue) : '',
    targetValue: experiment.targetValue != null ? Number(experiment.targetValue) : '',
    impactScore: experiment.impactScore != null ? Number(experiment.impactScore) : '',
    startDate: experiment.startDate ?? '',
    endDate: experiment.endDate ?? '',
    hypothesis: experiment.hypothesis ?? '',
    notes: experiment.notes ?? '',
    experimentUrl: experiment.experimentUrl ?? '',
    permissions: experiment.permissions ?? { canEdit: true }
  };
}

function formatMetric(value) {
  if (value === '' || value === null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(2);
}

function InstructorGrowth() {
  const { refresh } = useOutletContext();
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [communitiesState, setCommunitiesState] = useState({ items: [], loading: false, error: null });
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);

  const [experimentsState, setExperimentsState] = useState(createLoadState);
  const [draft, setDraft] = useState(createExperimentDraft);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadCommunities = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setCommunitiesState({ items: [], loading: false, error: null });
      setSelectedCommunityId(null);
      return;
    }
    setCommunitiesState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchCommunities(token);
      const items = Array.isArray(response.data) ? response.data : [];
      setCommunitiesState({ items, loading: false, error: null });
      setSelectedCommunityId((current) => {
        if (current && items.some((community) => String(community.id) === String(current))) {
          return current;
        }
        return items[0] ? String(items[0].id) : null;
      });
    } catch (error) {
      setCommunitiesState({ items: [], loading: false, error });
      setSelectedCommunityId(null);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const loadExperiments = useCallback(
    async (communityId, { showFeedback = false } = {}) => {
      if (!token || !communityId) {
        setExperimentsState(createLoadState());
        return;
      }
      setExperimentsState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await listCommunityGrowthExperiments({
          communityId,
          token,
          params: { order: 'desc', limit: 200 }
        });
        const items = response.data.map(normaliseExperiment);
        setExperimentsState({
          items,
          pagination: normalisePagination(response.pagination, items.length),
          loading: false,
          error: null
        });
        if (showFeedback) {
          setFeedback({ tone: 'success', message: 'Growth experiments refreshed from workspace telemetry.' });
        }
      } catch (error) {
        setExperimentsState({
          items: [],
          pagination: normalisePagination(null, 0),
          loading: false,
          error
        });
      }
    },
    [token]
  );

  useEffect(() => {
    if (selectedCommunityId) {
      loadExperiments(selectedCommunityId);
    } else {
      setExperimentsState(createLoadState());
    }
  }, [loadExperiments, selectedCommunityId]);

  const experimentSummary = useMemo(() => {
    const totals = experimentsState.items.reduce(
      (acc, experiment) => {
        const status = experiment.status;
        acc.byStatus[status] = (acc.byStatus[status] ?? 0) + 1;
        if (experiment.status === 'Live') {
          acc.liveCount += 1;
        }
        if (experiment.status === 'Completed') {
          acc.completedCount += 1;
        }
        return acc;
      },
      { byStatus: {}, liveCount: 0, completedCount: 0 }
    );
    const totalExperiments = experimentsState.pagination.total ?? experimentsState.items.length;
    return { ...totals, totalExperiments };
  }, [experimentsState.items, experimentsState.pagination.total]);

  const filteredExperiments = useMemo(() => {
    return experimentsState.items.filter((experiment) => {
      const matchesStatus = statusFilter === 'All' || experiment.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }
      const query = searchTerm.toLowerCase();
      return [experiment.title, experiment.ownerName, experiment.targetMetric]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [experimentsState.items, searchTerm, statusFilter]);

  const handleEdit = useCallback((experiment) => {
    setEditingId(experiment.id);
    setDraft({
      title: experiment.title,
      ownerName: experiment.ownerName,
      status: experiment.status,
      targetMetric: experiment.targetMetric,
      baselineValue: experiment.baselineValue,
      targetValue: experiment.targetValue,
      impactScore: experiment.impactScore,
      startDate: experiment.startDate || '',
      endDate: experiment.endDate || '',
      hypothesis: experiment.hypothesis,
      notes: experiment.notes,
      experimentUrl: experiment.experimentUrl
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft(createExperimentDraft());
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedCommunityId || !token) {
        setFeedback({ tone: 'error', message: 'Select a community to manage growth experiments.' });
        return;
      }
      const payload = {
        title: draft.title || 'Untitled initiative',
        ownerName: draft.ownerName || undefined,
        status: draft.status.toLowerCase(),
        targetMetric: draft.targetMetric || undefined,
        baselineValue: draft.baselineValue === '' ? null : Number(draft.baselineValue),
        targetValue: draft.targetValue === '' ? null : Number(draft.targetValue),
        impactScore: draft.impactScore === '' ? null : Number(draft.impactScore),
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        hypothesis: draft.hypothesis || undefined,
        notes: draft.notes || undefined,
        experimentUrl: draft.experimentUrl || undefined
      };

      setSaving(true);
      try {
        if (editingId) {
          await updateCommunityGrowthExperiment({
            communityId: selectedCommunityId,
            experimentId: editingId,
            token,
            payload
          });
          setFeedback({ tone: 'success', message: 'Experiment updated successfully.' });
        } else {
          await createCommunityGrowthExperiment({ communityId: selectedCommunityId, token, payload });
          setFeedback({ tone: 'success', message: 'Experiment added to the pipeline.' });
        }
        setDraft(createExperimentDraft());
        setEditingId(null);
        await loadExperiments(selectedCommunityId);
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to save experiment. Please try again.' });
      } finally {
        setSaving(false);
      }
    },
    [draft, editingId, loadExperiments, selectedCommunityId, token]
  );

  const handleDelete = useCallback(
    async (experimentId) => {
      if (!selectedCommunityId || !token) return;
      try {
        await deleteCommunityGrowthExperiment({ communityId: selectedCommunityId, experimentId, token });
        await loadExperiments(selectedCommunityId);
        setFeedback({ tone: 'success', message: 'Experiment removed from the growth pipeline.' });
        if (editingId === experimentId) {
          handleCancelEdit();
        }
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to delete experiment.' });
      }
    },
    [editingId, handleCancelEdit, loadExperiments, selectedCommunityId, token]
  );

  const handleReset = useCallback(() => {
    setStatusFilter('All');
    setSearchTerm('');
    setDraft(createExperimentDraft());
    setEditingId(null);
    if (selectedCommunityId) {
      loadExperiments(selectedCommunityId, { showFeedback: true });
    }
  }, [loadExperiments, selectedCommunityId]);

  const isAuthenticatedInstructor = Boolean(token && isAuthenticated);

  if (!isAuthenticatedInstructor) {
    return (
      <DashboardStateMessage
        title="Instructor session required"
        description="Sign in with an instructor account to manage growth initiatives."
        actionLabel="Back"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Growth experiments</h1>
          <p className="mt-2 text-sm text-slate-600">
            Run disciplined experiments, track hypotheses, and quantify impact across your instructor growth engine.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-pill px-4 py-2" onClick={handleReset}>
            Reset filters
          </button>
          <button type="button" className="dashboard-primary-pill" onClick={() => refresh?.()}>
            Refresh metrics
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active experiments</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{experimentSummary.totalExperiments}</p>
          <p className="mt-1 text-xs text-slate-500">Total experiments tracked across the selected community.</p>
        </div>
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Live cohort</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{experimentSummary.liveCount}</p>
          <p className="mt-1 text-xs text-slate-500">Experiments currently in live measurement.</p>
        </div>
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{experimentSummary.completedCount}</p>
          <p className="mt-1 text-xs text-slate-500">Experiments with published learnings ready for rollout.</p>
        </div>
      </section>

      <section className="dashboard-section space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Experiment planner</p>
            <h2 className="text-lg font-semibold text-slate-900">Design or import a growth experiment</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="dashboard-input h-10"
              value={selectedCommunityId ?? ''}
              onChange={(event) => setSelectedCommunityId(event.target.value || null)}
            >
              {communitiesState.items.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name ?? `Community ${community.id}`}
                </option>
              ))}
            </select>
            <select
              className="dashboard-input h-10"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title or owner"
              className="dashboard-input h-10"
            />
            {editingId ? (
              <button type="button" className="dashboard-pill px-4 py-2" onClick={handleCancelEdit}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </header>

        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white/60 p-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Experiment title
              <input
                type="text"
                required
                value={draft.title}
                onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Experiment owner
              <input
                type="text"
                value={draft.ownerName}
                onChange={(event) => setDraft((previous) => ({ ...previous, ownerName: event.target.value }))}
                className="dashboard-input"
                placeholder="Optional"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-600">
              Status
              <select
                className="dashboard-input"
                value={draft.status}
                onChange={(event) => setDraft((previous) => ({ ...previous, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Start date
              <input
                type="date"
                value={draft.startDate}
                onChange={(event) => setDraft((previous) => ({ ...previous, startDate: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              End date
              <input
                type="date"
                value={draft.endDate}
                onChange={(event) => setDraft((previous) => ({ ...previous, endDate: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-600">
              Target metric
              <input
                type="text"
                value={draft.targetMetric}
                onChange={(event) => setDraft((previous) => ({ ...previous, targetMetric: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Baseline value
              <input
                type="number"
                value={draft.baselineValue}
                onChange={(event) => setDraft((previous) => ({ ...previous, baselineValue: event.target.value }))}
                className="dashboard-input"
                step="0.01"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Target value
              <input
                type="number"
                value={draft.targetValue}
                onChange={(event) => setDraft((previous) => ({ ...previous, targetValue: event.target.value }))}
                className="dashboard-input"
                step="0.01"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Impact score (1-5)
              <input
                type="number"
                value={draft.impactScore}
                onChange={(event) => setDraft((previous) => ({ ...previous, impactScore: event.target.value }))}
                className="dashboard-input"
                min="0"
                max="10"
                step="0.1"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Experiment URL
              <input
                type="url"
                value={draft.experimentUrl}
                onChange={(event) => setDraft((previous) => ({ ...previous, experimentUrl: event.target.value }))}
                className="dashboard-input"
                placeholder="https://"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm text-slate-600">
            Hypothesis
            <textarea
              rows={3}
              value={draft.hypothesis}
              onChange={(event) => setDraft((previous) => ({ ...previous, hypothesis: event.target.value }))}
              className="dashboard-input resize-y"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Notes
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(event) => setDraft((previous) => ({ ...previous, notes: event.target.value }))}
              className="dashboard-input resize-y"
            />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="submit" className="dashboard-primary-pill px-6 py-2" disabled={saving}>
              {editingId ? 'Update experiment' : 'Add experiment to pipeline'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {filteredExperiments.map((experiment) => (
            <article key={experiment.id} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{experiment.status}</p>
                  <h3 className="text-lg font-semibold text-slate-900">{experiment.title}</h3>
                  <p className="text-xs text-slate-500">Owner: {experiment.ownerName || 'Unassigned'}</p>
                  <p className="text-sm text-slate-600">{experiment.hypothesis || 'No hypothesis recorded yet.'}</p>
                  <div className="grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                    <div>
                      <p className="font-semibold text-slate-700">Metric</p>
                      <p>{experiment.targetMetric || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Baseline → Target</p>
                      <p>
                        {formatMetric(experiment.baselineValue)} → {formatMetric(experiment.targetValue)}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Impact score</p>
                      <p>{formatMetric(experiment.impactScore)}</p>
                    </div>
                  </div>
                  <div className="grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                    <div>
                      <p className="font-semibold text-slate-700">Start</p>
                      <p>{experiment.startDate || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">End</p>
                      <p>{experiment.endDate || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <button type="button" className="dashboard-pill px-3 py-1" onClick={() => handleEdit(experiment)}>
                      Edit experiment
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill border-transparent bg-rose-50 px-3 py-1 text-rose-600 hover:border-rose-200"
                      onClick={() => handleDelete(experiment.id)}
                      disabled={!experiment.permissions?.canEdit}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 text-xs text-slate-500">
                  {experiment.experimentUrl ? (
                    <a
                      href={experiment.experimentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-primary hover:border-primary/40"
                    >
                      View experiment hub
                      <span aria-hidden="true">→</span>
                    </a>
                  ) : null}
                  {experiment.notes ? (
                    <p className="max-w-xs text-right text-slate-500">{experiment.notes}</p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredExperiments.length === 0 ? (
          <DashboardStateMessage
            title={
              experimentSummary.totalExperiments === 0
                ? 'No growth experiments yet'
                : 'No experiments match your filters'
            }
            description={
              experimentSummary.totalExperiments === 0
                ? 'Use the planner above to log your first experiment and start tracking impact.'
                : 'Try a different status filter or clear your search to continue managing experiments.'
            }
            actionLabel={experimentSummary.totalExperiments === 0 ? 'Create experiment' : undefined}
            onAction={experimentSummary.totalExperiments === 0 ? () => setEditingId(null) : undefined}
          />
        ) : null}

        {experimentsState.error ? (
          <DashboardStateMessage
            tone="error"
            title="Unable to load growth experiments"
            description={experimentsState.error?.message ?? 'Check your connection and try again.'}
            actionLabel="Retry"
            onAction={() => selectedCommunityId && loadExperiments(selectedCommunityId)}
          />
        ) : null}
      </section>
    </div>
  );
}

export default withInstructorDashboardAccess(InstructorGrowth);
