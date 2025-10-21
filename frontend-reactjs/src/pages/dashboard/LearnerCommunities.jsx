import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DashboardSectionHeader from '../../components/dashboard/DashboardSectionHeader.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import { triggerCommunityAction } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useMountedRef from '../../hooks/useMountedRef.js';

export default function LearnerCommunities() {
  const { isLearner, section: data, refresh, loading, error } = useLearnerDashboardSection('communities');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const navigate = useNavigate();

  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const mounted = useMountedRef();

  useEffect(() => {
    if (error) {
      setStatusMessage({
        type: 'error',
        message: error.message ?? 'We were unable to load community operations.'
      });
    }
  }, [error]);

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
        description="Switch to the learner dashboard to access community operations and engagement pipelines."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading community workspace"
        description="We are gathering managed communities, pipelines, and moderator insights."
      />
    );
  }

  if (!data) {
    return (
      <DashboardStateMessage
        title="No communities configured"
        description="We could not load any community operations for this dashboard role. Try refreshing to pull the latest assignments."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const managed = data.managed ?? [];
  const pipelines = data.pipelines ?? [];
  const disableActions = useMemo(() => pendingAction !== null, [pendingAction]);

  const handleCommunityAction = useCallback(
    async (communityId, action) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage community actions.' });
        return;
      }

      setPendingAction(`${communityId}:${action}`);
      setStatusMessage({ type: 'pending', message: 'Coordinating community action…' });
      try {
        const response = await triggerCommunityAction({
          token,
          communityId: communityId ?? 'community',
          payload: { action }
        });
        if (mounted.current) {
          setStatusMessage({
            type: 'success',
            message: response?.message ?? 'Community action triggered.'
          });
        }
      } catch (actionError) {
        if (mounted.current) {
          setStatusMessage({
            type: 'error',
            message:
              actionError instanceof Error ? actionError.message : 'We were unable to trigger that community action.'
          });
        }
      } finally {
        if (mounted.current) {
          setPendingAction(null);
        }
      }
    },
    [mounted, token]
  );

  const handleCreateInitiative = useCallback(() => {
    const communityId = managed[0]?.id ?? 'community';
    handleCommunityAction(communityId, 'create-initiative');
  }, [handleCommunityAction, managed]);

  const handleViewPlaybooks = useCallback(() => {
    const communityId = managed[0]?.id ?? 'community';
    handleCommunityAction(communityId, 'view-playbooks');
  }, [handleCommunityAction, managed]);

  const handleAddPipelineStage = useCallback(() => {
    const pipelineId = pipelines[0]?.id ?? 'pipeline';
    handleCommunityAction(pipelineId, 'add-pipeline-stage');
  }, [handleCommunityAction, pipelines]);

  return (
    <div className="space-y-10">
      <DashboardSectionHeader
        eyebrow="Communities"
        title="Community mission control"
        description="Track the health of every initiative, keep moderators aligned, and ship new programmes with confidence."
        actions={
          <>
            <button
              type="button"
              className="dashboard-pill px-4 py-2"
              onClick={() => navigate('../community-chats')}
            >
              Open chat command center
            </button>
            <button
              type="button"
              className="dashboard-pill px-4 py-2"
              onClick={handleViewPlaybooks}
              disabled={disableActions}
            >
              View playbooks
            </button>
            <button
              type="button"
              className="dashboard-primary-pill"
              onClick={handleCreateInitiative}
              disabled={disableActions}
            >
              Create new initiative
            </button>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-2">
        {managed.length === 0 ? (
          <div className="dashboard-section">
            <p className="text-sm font-semibold text-slate-900">No communities assigned yet</p>
            <p className="mt-2 text-sm text-slate-600">
              Invite your team or switch roles to start curating learning communities for this Learnspace.
            </p>
          </div>
        ) : null}
        {managed.map((community) => (
          <div key={community.id} className="dashboard-section space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>{community.members} members</span>
              <span>Moderators {community.moderators}</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                Health · {community.health}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{community.name}</h2>
              <p className="mt-2 text-sm text-slate-600">Operational initiatives keeping this community energised.</p>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {community.initiatives.map((initiative) => (
                <li key={initiative} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {initiative}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <button
                type="button"
                className="dashboard-pill px-3 py-1"
                onClick={() => handleCommunityAction(community.id, 'view-analytics')}
                disabled={disableActions}
              >
                View analytics
              </button>
              <button
                type="button"
                className="dashboard-pill px-3 py-1"
                onClick={() => handleCommunityAction(community.id, 'automations')}
                disabled={disableActions}
              >
                Automations
              </button>
              <button
                type="button"
                className="dashboard-pill px-3 py-1"
                onClick={() => handleCommunityAction(community.id, 'export-health-report')}
                disabled={disableActions}
              >
                Export health report
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="dashboard-section space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Operational pipelines</h2>
            <p className="text-sm text-slate-600">
              Every ongoing community operation with the current owner, risk posture, and execution velocity.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-primary-pill"
            onClick={handleAddPipelineStage}
            disabled={disableActions}
          >
            Add pipeline stage
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pipelines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-600">
              No active pipelines yet. Configure campaign, launch, or moderation pipelines to monitor progress here.
            </div>
          ) : null}
          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="dashboard-kicker">{pipeline.title}</p>
              <p className="mt-2 text-sm text-slate-600">Owner {pipeline.owner}</p>
              <div className="mt-4 h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{ width: `${pipeline.progress}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{pipeline.progress}% completion</span>
                <span className="font-semibold text-primary">On track</span>
              </div>
            </div>
          ))}
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
