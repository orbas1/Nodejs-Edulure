import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { creationStudioApi } from '../../api/creationStudioApi.js';
import CreationStudioSummary from './instructor/creationStudio/CreationStudioSummary.jsx';
import CreationProjectList from './instructor/creationStudio/CreationProjectList.jsx';
import CreationWizardStepper from './instructor/creationStudio/CreationWizardStepper.jsx';
import CreationAssetLibrary from './instructor/creationStudio/CreationAssetLibrary.jsx';
import CreationCollaboratorsPanel from './instructor/creationStudio/CreationCollaboratorsPanel.jsx';
import CreationAnalyticsDashboard from './instructor/creationStudio/CreationAnalyticsDashboard.jsx';
import {
  calculateProjectSummary,
  determineStepStates,
  findActiveSessionForUser
} from './instructor/creationStudio/creationStudioUtils.js';

const INITIAL_FILTERS = { search: '', type: 'all' };

export default function InstructorCreationStudio() {
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
      <CreationStudioSummary summary={summary} />

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
