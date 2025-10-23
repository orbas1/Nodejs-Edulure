import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { creationStudioApi } from '../../api/creationStudioApi.js';
import CreationStudioSummary from './instructor/creationStudio/CreationStudioSummary.jsx';
import CreationProjectList from './instructor/creationStudio/CreationProjectList.jsx';
import CreationWizardStepper from './instructor/creationStudio/CreationWizardStepper.jsx';
import CreationContentWorkspace from './instructor/creationStudio/CreationContentWorkspace.jsx';
import CreationAssetLibrary from './instructor/creationStudio/CreationAssetLibrary.jsx';
import withInstructorDashboardAccess from './instructor/withInstructorDashboardAccess.jsx';
import CreationCollaboratorsPanel from './instructor/creationStudio/CreationCollaboratorsPanel.jsx';
import CreationAnalyticsDashboard from './instructor/creationStudio/CreationAnalyticsDashboard.jsx';
import {
  calculateProjectSummary,
  determineStepStates,
  findActiveSessionForUser
} from './instructor/creationStudio/creationStudioUtils.js';

const INITIAL_FILTERS = { search: '', type: 'all' };

function InstructorCreationStudio() {
  const { session } = useAuth();
  const { role, refresh } = useOutletContext();
  const token = session?.tokens?.accessToken ?? null;
  const currentUserId = session?.user?.id ?? null;

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [projects, setProjects] = useState([]);
  const [projectError, setProjectError] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const [projectDetail, setProjectDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);

  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);

  const [creationLoading, setCreationLoading] = useState(false);
  const [creationError, setCreationError] = useState(null);

  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsMeta, setRecommendationsMeta] = useState(null);
  const [recommendationsEvaluation, setRecommendationsEvaluation] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(null);

  const [editorBlocks, setEditorBlocks] = useState([]);
  const [editorDirty, setEditorDirty] = useState(false);
  const [saveDrafting, setSaveDrafting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const [checklist, setChecklist] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState(null);
  const [pendingChecklistIds, setPendingChecklistIds] = useState([]);

  const [earnings, setEarnings] = useState(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState(null);

  const summary = useMemo(() => calculateProjectSummary(projects), [projects]);

  const selectedProject = useMemo(
    () => projects.find((project) => (project.publicId ?? project.id) === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const wizardSteps = useMemo(
    () => (projectDetail ? determineStepStates(projectDetail) : []),
    [projectDetail]
  );

  const activeSession = useMemo(
    () => (projectDetail ? findActiveSessionForUser(projectDetail.activeSessions, currentUserId) : null),
    [projectDetail, currentUserId]
  );

  useEffect(() => {
    if (!projectDetail) {
      setEditorBlocks([]);
      setEditorDirty(false);
      setLastSavedAt(null);
      return;
    }

    const candidateBlocks = Array.isArray(projectDetail.contentBlocks) && projectDetail.contentBlocks.length
      ? projectDetail.contentBlocks
      : Array.isArray(projectDetail.metadata?.blocks)
      ? projectDetail.metadata.blocks
      : [];

    setEditorBlocks(candidateBlocks);
    setEditorDirty(false);
    setLastSavedAt(projectDetail.contentUpdatedAt ?? projectDetail.updatedAt ?? null);
  }, [projectDetail]);

  const loadProjects = useCallback(() => {
    if (!token) return;
    const controller = new AbortController();
    setProjectsLoading(true);
    setProjectError(null);
    creationStudioApi
      .listProjects({
        token,
        filters: {
          search: filters.search ? filters.search.trim() : undefined,
          type: filters.type && filters.type !== 'all' ? [filters.type] : undefined
        },
        pagination: { limit: 40 },
        signal: controller.signal
      })
      .then(({ projects: payload }) => {
        setProjects(payload);
        if (payload.length > 0) {
          const nextSelected = payload[0].publicId ?? payload[0].id;
          setSelectedProjectId((current) => current ?? nextSelected);
        } else {
          setSelectedProjectId(null);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setProjectError(error instanceof Error ? error : new Error('Failed to load projects'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setProjectsLoading(false);
        }
      });
    return () => controller.abort();
  }, [filters.search, filters.type, token]);

  const loadTemplates = useCallback(() => {
    if (!token) return;
    const controller = new AbortController();
    setTemplatesLoading(true);
    setTemplatesError(null);
    creationStudioApi
      .listTemplates({ token, signal: controller.signal })
      .then((payload) => setTemplates(payload))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setTemplatesError(error instanceof Error ? error : new Error('Failed to load templates'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setTemplatesLoading(false);
        }
      });
    return () => controller.abort();
  }, [token]);

  const loadRecommendations = useCallback(() => {
    if (!token) {
      setRecommendations([]);
      setRecommendationsMeta(null);
      setRecommendationsEvaluation(null);
      return undefined;
    }

    const controller = new AbortController();
    setRecommendationsLoading(true);
    setRecommendationsError(null);

    creationStudioApi
      .fetchRecommendations({ token, includeHistory: true, signal: controller.signal })
      .then((payload) => {
        setRecommendations(payload.recommendations ?? []);
        setRecommendationsMeta(payload.meta ?? null);
        setRecommendationsEvaluation(payload.evaluation ?? null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setRecommendationsError(
          error instanceof Error ? error : new Error('Failed to load recommendations')
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRecommendationsLoading(false);
        }
      });

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    const abort = loadProjects();
    return () => {
      if (typeof abort === 'function') abort();
    };
  }, [loadProjects]);

  useEffect(() => {
    const abort = loadTemplates();
    return () => {
      if (typeof abort === 'function') abort();
    };
  }, [loadTemplates]);

  useEffect(() => {
    const abort = loadRecommendations();
    return () => {
      if (typeof abort === 'function') abort();
    };
  }, [loadRecommendations, projects.length]);

  useEffect(() => {
    if (!token || !selectedProjectId) {
      setChecklist([]);
      setChecklistError(null);
      setChecklistLoading(false);
      setPendingChecklistIds([]);
      return;
    }

    const controller = new AbortController();
    setChecklistLoading(true);
    setChecklistError(null);

    creationStudioApi
      .getProjectChecklist(selectedProjectId, { token, signal: controller.signal })
      .then((payload) => {
        const tasks = Array.isArray(payload?.tasks) ? payload.tasks : Array.isArray(payload) ? payload : [];
        setChecklist(tasks);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setChecklistError(error instanceof Error ? error : new Error('Failed to load checklist'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setChecklistLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedProjectId, token]);

  useEffect(() => {
    if (!token || !selectedProjectId) {
      setEarnings(null);
      setEarningsError(null);
      setEarningsLoading(false);
      return;
    }

    const controller = new AbortController();
    setEarningsLoading(true);
    setEarningsError(null);

    creationStudioApi
      .fetchProjectEarnings(selectedProjectId, { token, signal: controller.signal, range: '30d' })
      .then((payload) => setEarnings(payload ?? null))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setEarningsError(error instanceof Error ? error : new Error('Failed to load earnings'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setEarningsLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedProjectId, token]);

  useEffect(() => {
    if (!token || !selectedProjectId) {
      setProjectDetail(null);
      return;
    }
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    creationStudioApi
      .getProject(selectedProjectId, { token, signal: controller.signal })
      .then((project) => setProjectDetail(project))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setDetailError(error instanceof Error ? error : new Error('Failed to load project detail'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      });
    return () => controller.abort();
  }, [token, selectedProjectId]);

  const handleSelectProject = useCallback((project) => {
    setSelectedProjectId(project.publicId ?? project.id);
  }, []);

  const handleFilterChange = useCallback((nextFilters) => {
    setFilters(nextFilters);
  }, []);

  const handleStartSession = useCallback(async () => {
    if (!token || !selectedProjectId) return;
    setSessionLoading(true);
    setSessionError(null);
    try {
      await creationStudioApi.startCollaborationSession(
        selectedProjectId,
        {
          entryPoint: 'web_creation_studio',
          clientVersion: 'web-1.50.0'
        },
        { token }
      );
      await creationStudioApi.getProject(selectedProjectId, { token }).then((project) => setProjectDetail(project));
    } catch (error) {
      setSessionError(error instanceof Error ? error : new Error('Failed to start session'));
    } finally {
      setSessionLoading(false);
    }
  }, [selectedProjectId, token]);

  const handleEndSession = useCallback(async (session) => {
    if (!token || !selectedProjectId || !session) return;
    setSessionLoading(true);
    setSessionError(null);
    try {
      const sessionId = session.id ?? session.publicId;
      await creationStudioApi.endCollaborationSession(selectedProjectId, sessionId, { token });
      await creationStudioApi.getProject(selectedProjectId, { token }).then((project) => setProjectDetail(project));
    } catch (error) {
      setSessionError(error instanceof Error ? error : new Error('Failed to end session'));
    } finally {
      setSessionLoading(false);
    }
  }, [selectedProjectId, token]);

  const handleCreateProject = useCallback(
    async (payload) => {
      if (!token) throw new Error('Authentication required');
      setCreationLoading(true);
      setCreationError(null);
      try {
        const project = await creationStudioApi.createProject(payload, { token });
        setProjects((prev) => [project, ...prev]);
        setSelectedProjectId(project.publicId ?? project.id);
      } catch (error) {
        const normalised = error instanceof Error ? error : new Error('Failed to create project');
        setCreationError(normalised);
        throw normalised;
      } finally {
        setCreationLoading(false);
      }
    },
    [token]
  );

  const handleBlocksChange = useCallback((nextBlocks) => {
    setEditorBlocks(nextBlocks);
    setEditorDirty(true);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!token || !selectedProjectId) {
      return;
    }

    setSaveDrafting(true);
    setSaveError(null);

    try {
      const response = await creationStudioApi.saveProjectContent(
        selectedProjectId,
        {
          blocks: editorBlocks,
          summary: projectDetail?.summary ?? ''
        },
        { token }
      );

      const savedBlocks = Array.isArray(response?.blocks) ? response.blocks : editorBlocks;
      setEditorBlocks(savedBlocks);
      setEditorDirty(false);
      setLastSavedAt(response?.updatedAt ?? new Date().toISOString());
    } catch (error) {
      setSaveError(error instanceof Error ? error : new Error('Failed to save content draft'));
    } finally {
      setSaveDrafting(false);
    }
  }, [editorBlocks, projectDetail?.summary, selectedProjectId, token]);

  const handleToggleChecklistTask = useCallback(
    async (taskId, completed) => {
      if (!token || !selectedProjectId) {
        return;
      }

      setPendingChecklistIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
      setChecklistError(null);

      try {
        const payload = await creationStudioApi.updateProjectChecklist(
          selectedProjectId,
          { taskId, completed },
          { token }
        );

        const tasks = Array.isArray(payload?.tasks) ? payload.tasks : Array.isArray(payload) ? payload : checklist;
        setChecklist(tasks);
      } catch (error) {
        setChecklistError(error instanceof Error ? error : new Error('Failed to update checklist'));
      } finally {
        setPendingChecklistIds((prev) => prev.filter((id) => id !== taskId));
      }
    },
    [checklist, selectedProjectId, token]
  );

  if (role !== 'instructor') {
    return (
      <DashboardStateMessage
        title="Creation studio is instructor only"
        description="Switch to an instructor Learnspace to access the studio workflows."
        actionLabel="Return"
        onAction={() => refresh?.()}
      />
    );
  }

  if (!token) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Authentication required"
        description="Please log in again to continue working in the creation studio."
      />
    );
  }

  return (
    <div className="space-y-10">
      <CreationStudioSummary
        summary={summary}
        recommendations={recommendations}
        recommendationsMeta={recommendationsMeta}
        recommendationsEvaluation={recommendationsEvaluation}
        recommendationsLoading={recommendationsLoading}
        recommendationsError={recommendationsError}
      />

      <CreationAnalyticsDashboard token={token} />

      <CreationProjectList
        projects={projects}
        selectedId={selectedProjectId}
        onSelect={handleSelectProject}
        loading={projectsLoading}
        error={projectError}
        onRetry={loadProjects}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {detailError && (
        <DashboardStateMessage
          variant="error"
          title="Unable to load project detail"
          description={detailError.message}
          actionLabel="Retry"
          onAction={() => setSelectedProjectId((id) => (id ? `${id}` : null))}
        />
      )}

      {detailLoading && !projectDetail ? (
        <DashboardStateMessage
          variant="loading"
          title="Loading project"
          description="Fetching latest collaborators, outline and asset readiness."
        />
      ) : projectDetail ? (
        <CreationWizardStepper
          project={projectDetail}
          steps={wizardSteps}
          activeSession={activeSession}
          sessionLoading={sessionLoading}
          sessionError={sessionError}
          onStartSession={handleStartSession}
          onEndSession={() => handleEndSession(activeSession)}
        />
      ) : null}

      {projectDetail ? (
        <CreationContentWorkspace
          project={projectDetail}
          blocks={editorBlocks}
          onBlocksChange={handleBlocksChange}
          onSave={handleSaveDraft}
          saving={saveDrafting}
          dirty={editorDirty}
          saveError={saveError}
          lastSavedAt={lastSavedAt}
          checklist={checklist}
          checklistLoading={checklistLoading}
          checklistError={checklistError}
          onToggleTask={handleToggleChecklistTask}
          checklistPending={pendingChecklistIds}
          monetisationGuidance={
            projectDetail.metadata?.monetisationGuidance ??
            projectDetail.metadata?.monetizationGuidance ??
            []
          }
          earnings={earnings}
          earningsLoading={earningsLoading}
          earningsError={earningsError}
        />
      ) : null}

      <CreationCollaboratorsPanel
        collaborators={projectDetail?.collaborators ?? selectedProject?.collaborators ?? []}
        sessions={projectDetail?.activeSessions ?? []}
        currentUserId={currentUserId}
        sessionLoading={sessionLoading}
        onTerminateSelfSession={handleEndSession}
      />

      {templatesLoading ? (
        <DashboardStateMessage
          variant="loading"
          title="Loading template library"
          description="Fetching curated blueprints and governance tags."
        />
      ) : templatesError ? (
        <DashboardStateMessage
          variant="error"
          title="Failed to load template library"
          description={templatesError.message}
          actionLabel="Retry"
          onAction={loadTemplates}
        />
      ) : (
        <CreationAssetLibrary
          templates={templates}
          onCreateProject={handleCreateProject}
          creating={creationLoading}
          creationError={creationError}
        />
      )}
    </div>
  );
}

export default withInstructorDashboardAccess(InstructorCreationStudio);
