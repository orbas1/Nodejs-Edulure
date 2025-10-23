import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';
import ModerationQueue from '../../../components/moderation/ModerationQueue.jsx';
import ModerationWorkspace from '../../../components/moderation/ModerationWorkspace.jsx';
import { resolveCommunityIncident } from '../../../api/communityApi.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import useModerationCases from '../../../hooks/useModerationCases.js';
import useRoleGuard from '../../../hooks/useRoleGuard.js';

export default function CommunitySafety({ dashboard, onRefresh }) {
  const { allowed, explanation } = useRoleGuard(['community', 'admin']);
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const initialIncidents = useMemo(
    () => (Array.isArray(dashboard?.safety?.incidents) ? dashboard.safety.incidents : []),
    [dashboard?.safety?.incidents]
  );
  const initialBacklog = useMemo(
    () => (Array.isArray(dashboard?.safety?.backlog) ? dashboard.safety.backlog : []),
    [dashboard?.safety?.backlog]
  );
  const moderators = useMemo(
    () => (Array.isArray(dashboard?.safety?.moderators) ? dashboard.safety.moderators : []),
    [dashboard?.safety?.moderators]
  );
  const [incidents, setIncidents] = useState(initialIncidents);
  const [backlog, setBacklog] = useState(initialBacklog);
  const [error, setError] = useState(null);

  const derivedCommunityId = useMemo(() => {
    if (dashboard?.safety?.targetCommunityId) {
      return dashboard.safety.targetCommunityId;
    }
    if (dashboard?.communityId) {
      return dashboard.communityId;
    }
    if (dashboard?.safety?.communityId) {
      return dashboard.safety.communityId;
    }
    if (incidents[0]?.communityId) {
      return incidents[0].communityId;
    }
    if (backlog[0]?.communityId) {
      return backlog[0].communityId;
    }
    return null;
  }, [backlog, dashboard?.communityId, dashboard?.safety?.communityId, dashboard?.safety?.targetCommunityId, incidents]);

  const {
    cases: moderationCasesList,
    loading: casesLoading,
    selectedCaseId,
    setSelectedCaseId,
    selectedCase,
    selectedCaseActions,
    performAction,
    undoLastAction,
    lastAction
  } = useModerationCases({ communityId: derivedCommunityId, pollIntervalMs: 90_000 });

  useEffect(() => {
    setIncidents(initialIncidents);
  }, [initialIncidents]);

  useEffect(() => {
    setBacklog(initialBacklog);
  }, [initialBacklog]);

  const resolveTargetCommunity = (fallbackIncident) =>
    dashboard?.safety?.targetCommunityId ??
    fallbackIncident?.communityId ??
    incidents[0]?.communityId ??
    backlog[0]?.communityId ??
    window.prompt('Target community ID');

  const handleResolve = useCallback(
    async (item) => {
      if (!token) {
        setError('You must be signed in to resolve incidents.');
        return;
      }
      const communityId = resolveTargetCommunity(item);
      if (!communityId) {
        setError('Community identifier is required to resolve incidents.');
        return;
      }
      setError(null);
      const note = window.prompt('Resolution summary (optional)') ?? '';
      try {
        await resolveCommunityIncident({
          communityId,
          incidentId: item.id,
          token,
          payload: note ? { resolutionSummary: note } : {}
        });
        setIncidents((prev) => prev.filter((incident) => incident.id !== item.id));
        setBacklog((prev) => prev.filter((task) => task.id !== item.id));
      } catch (err) {
        setError(err?.message || 'Failed to resolve incident.');
      }
    },
    [backlog, incidents, token]
  );

  const caseIdSet = useMemo(
    () => new Set(moderationCasesList.map((item) => item.publicId)),
    [moderationCasesList]
  );

  const queueItems = useMemo(
    () =>
      moderationCasesList.map((item) => ({
        id: item.publicId,
        subject: item.post?.title ?? `Post ${item.post?.id ?? item.publicId}`,
        summary: item.reason ?? item.metadata?.summary ?? 'Awaiting triage summary.',
        reporter: item.reporter ?? null,
        severity: item.severity,
        status: item.status?.toUpperCase(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : null,
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : null,
        tags: [
          item.flaggedSource,
          ...(Array.isArray(item.metadata?.flags)
            ? item.metadata.flags
                .map((flag) => flag.reason ?? flag.flaggedSource ?? null)
                .filter(Boolean)
            : [])
        ].filter(Boolean),
        quickActions: [
          { id: 'approve', label: 'Approve', variant: 'primary' },
          { id: 'reject', label: 'Reject', variant: 'default' },
          { id: 'suppress', label: 'Suppress', variant: 'default' }
        ]
      })),
    [moderationCasesList]
  );

  const fallbackQueue = useMemo(() => {
    if (!incidents?.length) {
      return [];
    }
    return incidents.map((incident) => ({
      id: incident.id,
      subject: incident.summary,
      summary: incident.communityName,
      reporter: { name: incident.owner },
      severity: incident.severity,
      status: 'ESCALATION',
      updatedAt: incident.openedAt ? new Date(incident.openedAt).toLocaleString() : '—',
      tags: ['incident'],
      quickActions: [{ id: 'resolve', label: 'Resolve', variant: 'default' }],
      rawIncident: incident
    }));
  }, [incidents]);

  const displayQueue = queueItems.length > 0 ? queueItems : fallbackQueue;

  const handleQueueSelect = useCallback(
    (item) => {
      if (!item?.id) {
        return;
      }
      if (caseIdSet.has(item.id)) {
        setSelectedCaseId(item.id);
      }
    },
    [caseIdSet, setSelectedCaseId]
  );

  const handleQuickAction = useCallback(
    (actionId, item) => {
      if (actionId === 'resolve' && item?.rawIncident) {
        handleResolve(item.rawIncident);
        return;
      }
      if (!item?.id || !caseIdSet.has(item.id)) {
        return;
      }
      const actionMap = {
        approve: 'approve',
        reject: 'reject',
        suppress: 'suppress'
      };
      const action = actionMap[actionId] ?? actionId;
      performAction({ caseId: item.id, action });
    },
    [caseIdSet, performAction]
  );

  if (!allowed) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Community privileges required"
        description={explanation ?? 'Switch to a community workspace to triage safety incidents.'}
      />
    );
  }

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Safety telemetry unavailable"
        description="We were unable to load community safety signals. Refresh or ensure moderation data sources are connected."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Safety and governance</h1>
          <p className="dashboard-subtitle">
            Monitor incidents, escalations, and moderator coverage to uphold your community policies.
          </p>
        </div>
        <button type="button" className="dashboard-primary-pill" onClick={onRefresh}>
          Refresh safety signals
        </button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <ModerationQueue
          title="Moderation queue"
          items={displayQueue}
          selectedId={selectedCaseId}
          onSelect={handleQueueSelect}
          onQuickAction={handleQuickAction}
          loading={casesLoading}
          emptyState="No moderation cases waiting for review."
        />
        <ModerationWorkspace
          caseData={selectedCase}
          actions={selectedCaseActions}
          onPerformAction={performAction}
          onUndo={undoLastAction}
          undoDisabled={!lastAction}
          lastAction={lastAction}
        />
      </div>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Escalation backlog</p>
          <h2 className="text-lg font-semibold text-slate-900">Operational queue</h2>
        </div>
        <ul className="space-y-4">
          {backlog.map((task) => (
            <li key={task.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-amber-900">{task.title}</p>
                  <p className="mt-1 text-xs text-amber-600">{task.community}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-amber-600">
                  <span className="dashboard-pill border-amber-200 px-3 py-1">Owner: {task.owner}</span>
                  <span className="dashboard-pill border-amber-200 px-3 py-1">Status: {task.status}</span>
                  <span className="dashboard-pill border-amber-200 px-3 py-1">Due: {task.due}</span>
                  <button
                    type="button"
                    className="dashboard-pill border-amber-300 px-3 py-1 text-amber-700"
                    onClick={() => handleResolve(task)}
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {backlog.length === 0 ? (
          <DashboardStateMessage
            title="No backlog"
            description="Escalations and operational tasks will appear here as workflows trigger."
          />
        ) : null}
        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-700"
          >
            {error}
          </div>
        ) : null}
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Moderator roster</p>
          <h2 className="text-lg font-semibold text-slate-900">Coverage and time zones</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {moderators.map((moderator) => (
            <div key={moderator.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{moderator.community}</p>
              <p className="mt-1 text-xs text-slate-500">{moderator.role}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="dashboard-pill px-3 py-1">{moderator.timezone}</span>
                <span className="dashboard-pill px-3 py-1">{moderator.coverage}</span>
              </div>
            </div>
          ))}
          {moderators.length === 0 ? (
            <DashboardStateMessage
              title="No moderators configured"
              description="Assign moderators or stewards to each community to maintain safety coverage."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

CommunitySafety.propTypes = {
  dashboard: PropTypes.object,
  onRefresh: PropTypes.func
};

CommunitySafety.defaultProps = {
  dashboard: null,
  onRefresh: undefined
};
