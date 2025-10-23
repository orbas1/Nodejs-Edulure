import { httpClient } from './httpClient.js';

function toIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normaliseCollaborator(collaborator) {
  if (!collaborator) return null;
  return {
    id: collaborator.id ?? null,
    userId: collaborator.userId ?? collaborator.user_id ?? null,
    role: collaborator.role ?? 'viewer',
    permissions: Array.isArray(collaborator.permissions)
      ? collaborator.permissions
      : toArray(collaborator.permissions),
    addedAt: toIsoDate(collaborator.addedAt ?? collaborator.added_at),
    removedAt: toIsoDate(collaborator.removedAt ?? collaborator.removed_at)
  };
}

function normaliseSession(session) {
  if (!session) return null;
  return {
    id: session.publicId ?? session.id ?? null,
    projectId: session.projectId ?? session.project_id ?? null,
    participantId: session.participantId ?? session.participant_id ?? null,
    role: session.role ?? 'viewer',
    capabilities: Array.isArray(session.capabilities)
      ? session.capabilities
      : toArray(session.capabilities),
    metadata: typeof session.metadata === 'object' && session.metadata !== null ? session.metadata : {},
    joinedAt: toIsoDate(session.joinedAt ?? session.joined_at),
    lastHeartbeatAt: toIsoDate(session.lastHeartbeatAt ?? session.last_heartbeat_at),
    leftAt: toIsoDate(session.leftAt ?? session.left_at),
    wasTerminated: Boolean(session.wasTerminated ?? session.was_terminated)
  };
}

function normaliseOutlineItem(item) {
  if (!item) return null;
  return {
    id: item.id ?? item.key ?? null,
    label: item.label ?? item.title ?? 'Untitled section',
    description: item.description ?? item.summary ?? '',
    durationMinutes: Number.isFinite(Number(item.durationMinutes))
      ? Number(item.durationMinutes)
      : Number.isFinite(Number(item.duration_minutes))
      ? Number(item.duration_minutes)
      : null,
    children: Array.isArray(item.children) ? item.children.map(normaliseOutlineItem).filter(Boolean) : []
  };
}

function normaliseAnalyticsTargets(targets) {
  const safe = typeof targets === 'object' && targets !== null ? targets : {};
  return {
    keywords: toArray(safe.keywords),
    audiences: toArray(safe.audiences),
    markets: toArray(safe.markets),
    goals: toArray(safe.goals)
  };
}

function ensureBlockId(id, index) {
  if (id) return `${id}`;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `block-${index}-${Date.now()}`;
}

function normaliseBlock(block, index = 0) {
  if (!block) return null;
  const type = block.type ?? block.kind ?? 'paragraph';
  const data = typeof block.data === 'object' && block.data !== null ? block.data : {};
  const resolvedType = ['heading', 'paragraph', 'media', 'callout', 'list'].includes(type) ? type : 'paragraph';

  const defaults = {
    heading: { text: '', level: 2 },
    paragraph: { text: '' },
    media: { url: '', caption: '' },
    callout: { text: '', tone: 'info' },
    list: { items: [] }
  };

  const resolvedData = { ...defaults[resolvedType], ...data };
  if (resolvedType === 'list') {
    if (!Array.isArray(resolvedData.items)) {
      resolvedData.items = toArray(resolvedData.items);
    }
    if (resolvedData.items.length === 0) {
      resolvedData.items = [''];
    }
  }

  return {
    id: ensureBlockId(block.id ?? block.blockId ?? block.key, index),
    type: resolvedType,
    data: resolvedData
  };
}

function serialiseBlock(block, index = 0) {
  if (!block) return null;
  const normalised = normaliseBlock(block, index);
  return {
    id: normalised.id,
    type: normalised.type,
    data: normalised.data
  };
}

function serialiseBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((block, index) => serialiseBlock(block, index)).filter(Boolean);
}

function normaliseChecklistTask(task, index = 0) {
  if (!task) return null;
  return {
    id: `${task.id ?? task.taskId ?? index}`,
    label: task.label ?? task.title ?? 'Task',
    description: task.description ?? '',
    milestoneKey: task.milestoneKey ?? task.milestone_key ?? null,
    completed: Boolean(task.completed ?? task.isComplete ?? task.done),
    completedAt: toIsoDate(task.completedAt ?? task.completed_at),
    dueAt: toIsoDate(task.dueAt ?? task.due_at),
    blockedReason: task.blockedReason ?? task.blocked_reason ?? null
  };
}

function normaliseChecklist(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map(normaliseChecklistTask).filter(Boolean);
}

function normaliseProjectEarnings(payload) {
  if (!payload) return null;
  const summary = typeof payload.summary === 'object' && payload.summary !== null ? payload.summary : payload;

  const nextPayout = summary.nextPayout ?? summary.next_payout ?? null;
  const normalisedNextPayout = nextPayout
    ? {
        expectedAt: toIsoDate(nextPayout.expectedAt ?? nextPayout.expected_at),
        displayAmount: nextPayout.displayAmount ?? nextPayout.amount_display ?? null
      }
    : null;

  const topProducts = Array.isArray(summary.topProducts ?? summary.top_products)
    ? (summary.topProducts ?? summary.top_products).map((product) => ({
        id: product.id ?? product.productId ?? product.sku ?? null,
        name: product.name ?? 'Unnamed',
        contributionPercent: Number(product.contributionPercent ?? product.contribution_percent ?? 0)
      }))
    : [];

  return {
    grossCents: Number(summary.grossCents ?? summary.gross_cents ?? 0),
    netCents: Number(summary.netCents ?? summary.net_cents ?? 0),
    currency: summary.currency ?? 'USD',
    changePercentage: Number(summary.changePercentage ?? summary.change_percent ?? 0),
    bookings: Number(summary.bookings ?? summary.totalBookings ?? 0),
    averageSellingPriceCents: Number(
      summary.averageSellingPriceCents ?? summary.avgSellingPriceCents ?? summary.average_selling_price_cents ?? 0
    ),
    averageSellingPriceDisplay:
      summary.averageSellingPriceDisplay ?? summary.avgSellingPriceDisplay ?? summary.average_selling_price_display ?? null,
    nextPayout: normalisedNextPayout,
    topProducts
  };
}

function normaliseComplianceNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes
    .map((note) => ({
      type: note?.type ?? 'policy',
      message: note?.message ?? ''
    }))
    .filter((note) => note.message);
}

function normaliseVersion(version) {
  if (!version) return null;
  return {
    versionNumber: Number(version.versionNumber ?? version.version_number ?? 0),
    createdAt: toIsoDate(version.createdAt ?? version.created_at),
    snapshot: typeof version.snapshot === 'object' && version.snapshot !== null ? version.snapshot : {},
    changeSummary: typeof version.changeSummary === 'object' && version.changeSummary !== null
      ? version.changeSummary
      : {}
  };
}

function normaliseProject(project) {
  if (!project) return null;
  const metadata = typeof project.metadata === 'object' && project.metadata !== null ? project.metadata : {};
  const outline = Array.isArray(project.contentOutline)
    ? project.contentOutline
    : Array.isArray(project.content_outline)
    ? project.content_outline
    : [];
  const rawBlocks = Array.isArray(project.contentBlocks)
    ? project.contentBlocks
    : Array.isArray(metadata.blocks)
    ? metadata.blocks
    : [];

  const collaborators = Array.isArray(project.collaborators)
    ? project.collaborators.map(normaliseCollaborator).filter(Boolean)
    : [];

  const activeSessions = Array.isArray(project.activeSessions)
    ? project.activeSessions.map(normaliseSession).filter(Boolean)
    : [];

  const monetisationGuidance = Array.isArray(metadata.monetisationGuidance)
    ? metadata.monetisationGuidance
    : Array.isArray(metadata.monetizationGuidance)
    ? metadata.monetizationGuidance
    : [];

  return {
    id: project.publicId ?? project.id ?? null,
    publicId: project.publicId ?? project.id ?? null,
    ownerId: project.ownerId ?? project.owner_id ?? null,
    type: project.type ?? 'course',
    status: project.status ?? 'draft',
    title: project.title ?? 'Untitled project',
    summary: project.summary ?? '',
    metadata,
    contentOutline: outline.map(normaliseOutlineItem).filter(Boolean),
    complianceNotes: normaliseComplianceNotes(project.complianceNotes ?? project.compliance_notes),
    analyticsTargets: normaliseAnalyticsTargets(project.analyticsTargets ?? project.analytics_targets),
    publishingChannels: toArray(project.publishingChannels ?? project.publishing_channels),
    reviewRequestedAt: toIsoDate(project.reviewRequestedAt ?? project.review_requested_at),
    approvedAt: toIsoDate(project.approvedAt ?? project.approved_at),
    publishedAt: toIsoDate(project.publishedAt ?? project.published_at),
    archivedAt: toIsoDate(project.archivedAt ?? project.archived_at),
    createdAt: toIsoDate(project.createdAt ?? project.created_at),
    updatedAt: toIsoDate(project.updatedAt ?? project.updated_at),
    latestVersion: normaliseVersion(project.latestVersion ?? project.latest_version),
    collaborators,
    collaboratorCount: Number.isFinite(Number(project.collaboratorCount))
      ? Number(project.collaboratorCount)
      : collaborators.length,
    activeSessions,
    contentBlocks: rawBlocks.map((block, index) => normaliseBlock(block, index)).filter(Boolean),
    contentUpdatedAt: toIsoDate(project.contentUpdatedAt ?? project.content_updated_at),
    monetisationGuidance
  };
}

function normaliseTemplate(template) {
  if (!template) return null;
  const schema = typeof template.schema === 'object' && template.schema !== null ? template.schema : {};
  return {
    id: template.publicId ?? template.id ?? null,
    publicId: template.publicId ?? template.id ?? null,
    type: template.type ?? 'course',
    title: template.title ?? 'Untitled template',
    description: template.description ?? '',
    schema,
    version: Number(template.version ?? 1),
    isDefault: Boolean(template.isDefault ?? template.is_default),
    governanceTags: toArray(template.governanceTags ?? template.governance_tags),
    createdBy: template.createdBy ?? template.created_by ?? null,
    publishedAt: toIsoDate(template.publishedAt ?? template.published_at),
    retiredAt: toIsoDate(template.retiredAt ?? template.retired_at),
    createdAt: toIsoDate(template.createdAt ?? template.created_at),
    updatedAt: toIsoDate(template.updatedAt ?? template.updated_at)
  };
}

function normalisePagination(pagination) {
  const safe = typeof pagination === 'object' && pagination !== null ? pagination : {};
  const page = Number.isFinite(Number(safe.page)) ? Number(safe.page) : 1;
  const limit = Number.isFinite(Number(safe.limit ?? safe.pageSize)) ? Number(safe.limit ?? safe.pageSize) : safe.pageSize ?? 20;
  const total = Number.isFinite(Number(safe.total)) ? Number(safe.total) : 0;
  return {
    page,
    pageSize: limit,
    total,
    totalPages: Number.isFinite(Number(safe.totalPages)) ? Number(safe.totalPages) : limit > 0 ? Math.ceil(total / limit) : 1
  };
}

export async function listProjects({ token, filters = {}, pagination = {}, signal } = {}) {
  if (!token) throw new Error('Authentication token is required to list projects');
  const params = {};
  if (filters.search) params.search = filters.search;
  if (filters.status?.length) params.status = filters.status.join(',');
  if (filters.type?.length) params.type = filters.type.join(',');
  if (filters.includeArchived) params.includeArchived = true;
  if (pagination.page) params.page = pagination.page;
  if (pagination.limit) params.limit = pagination.limit;

  const response = await httpClient.get('/creation/projects', {
    token,
    params,
    signal,
    cache: {
      ttl: 1000 * 30,
      tags: [`creation:projects:${token}`]
    }
  });

  const projects = Array.isArray(response.data) ? response.data.map(normaliseProject).filter(Boolean) : [];
  return {
    projects,
    pagination: normalisePagination(response.pagination ?? response.meta?.pagination)
  };
}

function normaliseSignal(signal) {
  if (!signal) {
    return null;
  }
  return {
    code: signal.code ?? 'unknown',
    weight: Number(signal.weight ?? 0),
    detail: typeof signal.detail === 'object' && signal.detail !== null ? signal.detail : {}
  };
}

function normaliseRecommendation(recommendation) {
  if (!recommendation) {
    return null;
  }

  return {
    projectId: recommendation.projectId ?? null,
    projectPublicId: recommendation.projectPublicId ?? recommendation.project_id ?? null,
    projectTitle: recommendation.projectTitle ?? recommendation.project_title ?? 'Untitled project',
    projectType: recommendation.projectType ?? recommendation.project_type ?? 'course',
    collaboratorCount: Number.isFinite(Number(recommendation.collaboratorCount))
      ? Number(recommendation.collaboratorCount)
      : Number.isFinite(Number(recommendation.collaborator_count))
      ? Number(recommendation.collaborator_count)
      : 0,
    priority: recommendation.priority ?? 'medium',
    action: {
      code: recommendation.action?.code ?? 'action',
      label: recommendation.action?.label ?? 'Action required',
      instructions: recommendation.action?.instructions ?? ''
    },
    score: Number(recommendation.score ?? 0),
    recommendedAt: toIsoDate(recommendation.recommendedAt ?? recommendation.recommended_at),
    signals: Array.isArray(recommendation.signals)
      ? recommendation.signals.map(normaliseSignal).filter(Boolean)
      : []
  };
}

function normaliseEvaluation(evaluation) {
  if (!evaluation) {
    return { enabled: false };
  }
  return {
    key: evaluation.key ?? 'creation.recommendations',
    enabled: Boolean(evaluation.enabled),
    reason: evaluation.reason ?? null,
    variant: evaluation.variant ?? null,
    bucket: evaluation.bucket ?? null,
    strategy: evaluation.strategy ?? null,
    evaluatedAt: toIsoDate(evaluation.evaluatedAt ?? evaluation.evaluated_at)
  };
}

function normaliseHistoryItem(item) {
  if (!item) return null;
  return {
    id: item.id ?? null,
    generatedAt: toIsoDate(item.generatedAt ?? item.generated_at),
    algorithmVersion: item.algorithmVersion ?? item.algorithm_version ?? null,
    tenantId: item.tenantId ?? item.tenant_id ?? 'global',
    featureFlagState: item.featureFlagState ?? item.feature_flag_state ?? null,
    featureFlagVariant: item.featureFlagVariant ?? item.feature_flag_variant ?? null,
    recommendationCount: Number.isFinite(Number(item.recommendationCount))
      ? Number(item.recommendationCount)
      : Number.isFinite(Number(item.recommendation_count))
      ? Number(item.recommendation_count)
      : 0,
    context: typeof item.context === 'object' && item.context !== null ? item.context : {}
  };
}

function normaliseMeta(meta) {
  if (!meta) {
    return {
      algorithmVersion: null,
      generatedAt: null,
      tenantId: 'global',
      totalProjectsEvaluated: 0,
      history: []
    };
  }

  return {
    algorithmVersion: meta.algorithmVersion ?? meta.algorithm_version ?? null,
    generatedAt: toIsoDate(meta.generatedAt ?? meta.generated_at),
    tenantId: meta.tenantId ?? meta.tenant_id ?? 'global',
    totalProjectsEvaluated: Number.isFinite(Number(meta.totalProjectsEvaluated))
      ? Number(meta.totalProjectsEvaluated)
      : Number.isFinite(Number(meta.total_projects_evaluated))
      ? Number(meta.total_projects_evaluated)
      : 0,
    history: Array.isArray(meta.history) ? meta.history.map(normaliseHistoryItem).filter(Boolean) : []
  };
}

export async function getProject(publicId, { token, signal } = {}) {
  if (!token) throw new Error('Authentication token is required to fetch a project');
  if (!publicId) throw new Error('Project identifier is required');
  const response = await httpClient.get(`/creation/projects/${publicId}`, {
    token,
    signal,
    cache: {
      ttl: 1000 * 15,
      tags: [`creation:project:${publicId}:${token}`]
    }
  });
  return normaliseProject(response.data);
}

export async function createProject(payload, { token } = {}) {
  if (!token) throw new Error('Authentication token is required to create a project');
  if (!payload?.title) throw new Error('Project title is required');
  const response = await httpClient.post('/creation/projects', payload, {
    token,
    cache: {
      invalidateTags: [
        `creation:projects:${token}`,
        'creation:recommendations',
        'creation:recommendations:self',
        'creation:analytics',
        'creation:analytics:self'
      ]
    }
  });
  return normaliseProject(response.data);
}

export async function listTemplates({ token, filters = {}, signal } = {}) {
  if (!token) throw new Error('Authentication token is required to list templates');
  const params = {};
  if (filters.type?.length) params.type = filters.type.join(',');
  if (filters.includeRetired) params.includeRetired = true;
  if (filters.isDefault !== undefined) params.isDefault = Boolean(filters.isDefault);

  const response = await httpClient.get('/creation/templates', {
    token,
    params,
    signal,
    cache: {
      ttl: 1000 * 60,
      tags: [`creation:templates:${token}`]
    }
  });
  const templates = Array.isArray(response.data) ? response.data.map(normaliseTemplate).filter(Boolean) : [];
  return templates;
}

export async function startCollaborationSession(publicId, payload = {}, { token } = {}) {
  if (!token) throw new Error('Authentication token is required to start a collaboration session');
  if (!publicId) throw new Error('Project identifier is required');
  const response = await httpClient.post(`/creation/projects/${publicId}/sessions`, payload, {
    token,
    cache: {
      invalidateTags: [
        `creation:project:${publicId}:${token}`,
        'creation:recommendations',
        'creation:recommendations:self',
        'creation:analytics',
        'creation:analytics:self'
      ]
    }
  });
  return normaliseSession(response.data);
}

export async function endCollaborationSession(publicId, sessionId, { token, terminate = false } = {}) {
  if (!token) throw new Error('Authentication token is required to end a collaboration session');
  if (!publicId) throw new Error('Project identifier is required');
  if (!sessionId) throw new Error('Session identifier is required');
  const response = await httpClient.post(`/creation/projects/${publicId}/sessions/${sessionId}/end`, { terminate }, {
    token,
    cache: {
      invalidateTags: [
        `creation:project:${publicId}:${token}`,
        'creation:recommendations',
        'creation:recommendations:self',
        'creation:analytics',
        'creation:analytics:self'
      ]
    }
  });
  return normaliseSession(response.data);
}

export async function fetchAnalyticsSummary({ token, range = '30d', ownerId, signal } = {}) {
  if (!token) throw new Error('Authentication token is required to load analytics');
  const params = { range };
  if (ownerId) params.ownerId = ownerId;
  const response = await httpClient.get('/creation/analytics/summary', {
    token,
    params,
    signal,
    cache: {
      ttl: 1000 * 60,
      tags: [
        `creation:analytics:${range}:${ownerId ?? 'self'}`,
        `creation:analytics:${ownerId ?? 'self'}`,
        'creation:analytics'
      ]
    }
  });
  return response.data;
}

export async function saveProjectContent(publicId, payload = {}, { token, signal } = {}) {
  if (!token) throw new Error('Authentication token is required to save project content');
  if (!publicId) throw new Error('Project identifier is required');

  const response = await httpClient.put(
    `/creation/projects/${publicId}/content`,
    {
      blocks: serialiseBlocks(payload.blocks ?? []),
      summary: payload.summary,
      metadata: payload.metadata
    },
    {
      token,
      signal,
      cache: {
        invalidateTags: [
          `creation:project:${publicId}:${token}`,
          `creation:projects:${token}`,
          'creation:recommendations',
          'creation:recommendations:self',
          'creation:analytics',
          'creation:analytics:self'
        ]
      }
    }
  );

  const data = response.data ?? response;
  const blocks = Array.isArray(data?.blocks)
    ? data.blocks.map((block, index) => normaliseBlock(block, index)).filter(Boolean)
    : serialiseBlocks(payload.blocks ?? []);

  return {
    blocks,
    summary: data?.summary ?? payload.summary ?? '',
    metadata: typeof data?.metadata === 'object' && data.metadata !== null ? data.metadata : payload.metadata ?? {},
    updatedAt: toIsoDate(data?.updatedAt ?? data?.updated_at)
  };
}

export async function getProjectChecklist(publicId, { token, signal } = {}) {
  if (!token) throw new Error('Authentication token is required to load project checklist');
  if (!publicId) throw new Error('Project identifier is required');

  const response = await httpClient.get(`/creation/projects/${publicId}/checklist`, {
    token,
    signal,
    cache: {
      ttl: 1000 * 30,
      tags: [`creation:project:${publicId}:${token}`, `creation:checklist:${publicId}:${token}`]
    }
  });

  const data = response.data ?? response;
  const tasks = Array.isArray(data?.tasks) ? normaliseChecklist(data.tasks) : normaliseChecklist(data);
  return {
    tasks,
    updatedAt: toIsoDate(data?.updatedAt ?? data?.updated_at)
  };
}

export async function updateProjectChecklist(publicId, payload = {}, { token, signal } = {}) {
  if (!token) throw new Error('Authentication token is required to update project checklist');
  if (!publicId) throw new Error('Project identifier is required');
  if (!payload?.taskId) throw new Error('Checklist task identifier is required');

  const response = await httpClient.patch(
    `/creation/projects/${publicId}/checklist`,
    {
      taskId: payload.taskId,
      completed: Boolean(payload.completed)
    },
    {
      token,
      signal,
      cache: {
        invalidateTags: [
          `creation:project:${publicId}:${token}`,
          `creation:checklist:${publicId}:${token}`,
          'creation:recommendations'
        ]
      }
    }
  );

  const data = response.data ?? response;
  const tasks = Array.isArray(data?.tasks) ? normaliseChecklist(data.tasks) : normaliseChecklist(data);
  return {
    tasks,
    updatedAt: toIsoDate(data?.updatedAt ?? data?.updated_at)
  };
}

export async function fetchProjectEarnings(publicId, { token, signal, range = '30d' } = {}) {
  if (!token) throw new Error('Authentication token is required to load project earnings');
  if (!publicId) throw new Error('Project identifier is required');

  const params = {};
  if (range) params.range = range;

  const response = await httpClient.get(`/creation/projects/${publicId}/earnings`, {
    token,
    signal,
    params,
    cache: {
      ttl: 1000 * 60,
      tags: [`creation:earnings:${publicId}:${range}:${token}`]
    }
  });

  return normaliseProjectEarnings(response.data ?? response);
}

export async function fetchRecommendations({ token, limit, includeHistory = false, ownerId, signal } = {}) {
  if (!token) throw new Error('Authentication token is required to load recommendations');
  const params = {};
  if (limit) params.limit = limit;
  if (includeHistory) params.includeHistory = true;
  if (ownerId) params.ownerId = ownerId;

  const response = await httpClient.get('/creation/recommendations', {
    token,
    params,
    signal,
    cache: {
      ttl: 1000 * 30,
      tags: [
        `creation:recommendations:${ownerId ?? 'self'}`,
        'creation:recommendations'
      ]
    }
  });

  const payload = response.data ?? {};
  const recommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations.map(normaliseRecommendation).filter(Boolean)
    : [];

  return {
    recommendations,
    evaluation: normaliseEvaluation(payload.evaluation),
    meta: normaliseMeta(payload.meta)
  };
}

export const creationStudioApi = {
  listProjects,
  getProject,
  createProject,
  listTemplates,
  startCollaborationSession,
  endCollaborationSession,
  fetchAnalyticsSummary,
  fetchRecommendations,
  saveProjectContent,
  getProjectChecklist,
  updateProjectChecklist,
  fetchProjectEarnings
};

export default creationStudioApi;
