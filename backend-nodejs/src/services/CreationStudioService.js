import db from '../config/database.js';
import logger from '../config/logger.js';
import CreationProjectModel from '../models/CreationProjectModel.js';
import CreationTemplateModel from '../models/CreationTemplateModel.js';
import CreationProjectCollaboratorModel from '../models/CreationProjectCollaboratorModel.js';
import CreationCollaborationSessionModel from '../models/CreationCollaborationSessionModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import AdsCampaignModel from '../models/AdsCampaignModel.js';

const log = logger.child({ service: 'CreationStudioService' });

const ROLE_PRIORITY = {
  user: 0,
  instructor: 1,
  admin: 2
};

const DEFAULT_PERMISSIONS = {
  owner: [
    'project:read',
    'project:edit',
    'project:submit',
    'project:approve',
    'project:publish',
    'collaboration:manage',
    'session:start',
    'ads:draft'
  ],
  editor: ['project:read', 'project:edit', 'project:submit', 'session:start', 'ads:draft'],
  commenter: ['project:read', 'session:start', 'comment:create'],
  viewer: ['project:read']
};

const STATUS_TRANSITIONS = {
  draft: ['draft', 'ready_for_review', 'archived'],
  ready_for_review: ['draft', 'in_review', 'archived'],
  in_review: ['changes_requested', 'approved', 'archived'],
  changes_requested: ['draft', 'ready_for_review', 'archived'],
  approved: ['published', 'archived', 'changes_requested'],
  published: ['archived'],
  archived: ['draft']
};

const PROJECT_TYPES = new Set(['course', 'ebook', 'community', 'ads_asset']);

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function dedupe(list) {
  return Array.from(new Set(list));
}

function mergePermissions(role, custom = []) {
  const base = new Set(DEFAULT_PERMISSIONS[role] ?? []);
  for (const permission of custom ?? []) {
    base.add(permission);
  }
  return Array.from(base);
}

function ensureRole(actor, minimumRole) {
  const actorPriority = ROLE_PRIORITY[actor?.role] ?? -1;
  const requiredPriority = ROLE_PRIORITY[minimumRole] ?? Infinity;
  if (actorPriority < requiredPriority) {
    const error = new Error('You do not have permission to perform this action');
    error.status = 403;
    throw error;
  }
}

function validateProjectType(type) {
  if (!PROJECT_TYPES.has(type)) {
    const error = new Error('Unsupported project type');
    error.status = 422;
    throw error;
  }
}

function assertTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return;
  }
  const allowed = STATUS_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    const error = new Error(`Cannot transition project from ${currentStatus} to ${nextStatus}`);
    error.status = 409;
    throw error;
  }
}

function hasPermission(actor, collaborator, permission) {
  if (actor.role === 'admin') {
    return true;
  }
  if (!collaborator) {
    return false;
  }
  return collaborator.permissions.includes(permission);
}

function applyTemplateToProject(template, projectPayload = {}) {
  if (!template) {
    return projectPayload;
  }
  const schema = template.schema ?? {};
  const draft = { ...projectPayload };
  if (!draft.contentOutline && Array.isArray(schema.outline)) {
    draft.contentOutline = schema.outline;
  }
  if (!draft.metadata && schema.defaults) {
    draft.metadata = schema.defaults;
  }
  if (!draft.analyticsTargets && schema.analyticsTargets) {
    draft.analyticsTargets = schema.analyticsTargets;
  }
  if (!draft.publishingChannels && schema.publishingChannels) {
    draft.publishingChannels = schema.publishingChannels;
  }
  if (!draft.summary && schema.summaryTemplate) {
    draft.summary = schema.summaryTemplate;
  }
  return draft;
}

async function hydrateProject(project, { includeCollaborators = true, includeSessions = false } = {}) {
  const hydrated = { ...project };
  if (includeCollaborators) {
    hydrated.collaborators = await CreationProjectCollaboratorModel.listByProject(project.id);
  }
  hydrated.latestVersion = await CreationProjectModel.latestVersion(project.id);
  if (includeSessions) {
    hydrated.activeSessions = await CreationCollaborationSessionModel.listActiveByProject(project.id);
  }
  return hydrated;
}

async function resolveCollaborator(project, actor, connection = db) {
  if (!actor) {
    const error = new Error('Actor required');
    error.status = 401;
    throw error;
  }
  if (actor.role === 'admin') {
    return {
      role: 'owner',
      permissions: mergePermissions('owner')
    };
  }

  if (project.ownerId === actor.id) {
    return {
      role: 'owner',
      permissions: mergePermissions('owner')
    };
  }

  const collaborator = await CreationProjectCollaboratorModel.findByProjectAndUser(project.id, actor.id, connection);
  if (!collaborator || collaborator.removedAt) {
    const error = new Error('You do not have access to this project');
    error.status = 403;
    throw error;
  }
  return {
    ...collaborator,
    permissions: mergePermissions(collaborator.role, collaborator.permissions)
  };
}

function buildChangeSummary(original, updated, actor) {
  const diff = {};
  for (const [key, value] of Object.entries(updated)) {
    if (['updatedAt', 'latestVersion', 'collaborators', 'activeSessions', 'collaboratorCount'].includes(key)) continue;
    const before = original[key];
    const after = value;
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diff[key] = { before, after };
    }
  }
  if (Object.keys(diff).length === 0) {
    return null;
  }
  return {
    changedBy: actor.id,
    changedAt: new Date().toISOString(),
    diff
  };
}

export default class CreationStudioService {
  static async listProjects({ actor, filters = {}, pagination = {} } = {}) {
    ensureRole(actor, 'user');

    const page = Math.max(1, Number(pagination.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(pagination.limit ?? 20)));
    const offset = (page - 1) * limit;

    let projectIds;
    let includeArchived = Boolean(filters.includeArchived);
    const statusFilter = filters.status ? toArray(filters.status) : undefined;
    const typeFilter = filters.type ? toArray(filters.type) : undefined;
    const search = filters.search ?? undefined;

    const queryOptions = {
      includeArchived,
      status: statusFilter,
      type: typeFilter,
      search,
      limit,
      offset
    };

    if (actor.role === 'admin') {
      if (filters.ownerId) {
        queryOptions.ownerId = filters.ownerId;
      }
    } else {
      projectIds = await CreationProjectCollaboratorModel.listActiveProjectIdsForUser(actor.id);
      if (!projectIds.length) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        };
      }
      queryOptions.projectIds = dedupe(projectIds);
    }

    const [projects, total] = await Promise.all([
      CreationProjectModel.list(queryOptions),
      CreationProjectModel.count(queryOptions)
    ]);

    const hydrated = await Promise.all(projects.map((project) => hydrateProject(project, { includeCollaborators: true })));

    return {
      data: hydrated.map((project) => ({
        ...project,
        // expose collaborator count for list views
        collaboratorCount: project.collaborators ? project.collaborators.length : undefined
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getProject(publicId, actor) {
    ensureRole(actor, 'user');
    const project = await CreationProjectModel.findByPublicId(publicId);
    if (!project) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }

    await resolveCollaborator(project, actor);
    return hydrateProject(project, { includeCollaborators: true, includeSessions: true });
  }

  static async createProject(actor, payload) {
    ensureRole(actor, 'instructor');
    validateProjectType(payload.type);

    return db.transaction(async (trx) => {
      let template;
      if (payload.templateId) {
        template = await CreationTemplateModel.findByPublicId(payload.templateId, trx);
        if (!template) {
          const error = new Error('Template not found');
          error.status = 404;
          throw error;
        }
      }

      const projectDraft = applyTemplateToProject(template, {
        ownerId: actor.id,
        type: payload.type,
        title: payload.title,
        summary: payload.summary,
        metadata: payload.metadata,
        contentOutline: payload.contentOutline,
        analyticsTargets: payload.analyticsTargets,
        publishingChannels: payload.publishingChannels,
        complianceNotes: payload.complianceNotes
      });

      const project = await CreationProjectModel.create(projectDraft, trx);

      await CreationProjectCollaboratorModel.add(
        {
          projectId: project.id,
          userId: actor.id,
          role: 'owner',
          permissions: mergePermissions('owner')
        },
        trx
      );

      await CreationProjectModel.insertVersion(
        {
          projectId: project.id,
          versionNumber: 1,
          snapshot: project,
          changeSummary: {
            reason: 'initial_create',
            templateApplied: template ? template.publicId : null
          },
          createdBy: actor.id
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'creation_project',
          entityId: project.publicId,
          eventType: 'creation.project.created',
          payload: {
            actorId: actor.id,
            templateId: template ? template.publicId : null,
            type: project.type
          },
          performedBy: actor.id
        },
        trx
      );

      log.info({ projectId: project.publicId, actorId: actor.id }, 'Creation project created');

      return hydrateProject(project, { includeCollaborators: true });
    });
  }

  static async updateProject(publicId, actor, updates) {
    ensureRole(actor, 'instructor');
    const project = await CreationProjectModel.findByPublicId(publicId);
    if (!project) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }

    const collaborator = await resolveCollaborator(project, actor);
    if (!hasPermission(actor, collaborator, 'project:edit')) {
      const error = new Error('You do not have permission to update this project');
      error.status = 403;
      throw error;
    }

    const nextStatus = updates.status ?? project.status;
    if (nextStatus !== project.status) {
      assertTransition(project.status, nextStatus);
      if (['ready_for_review', 'in_review'].includes(nextStatus) && !hasPermission(actor, collaborator, 'project:submit')) {
        const error = new Error('You do not have permission to change the project review state');
        error.status = 403;
        throw error;
      }
      if (['approved', 'published'].includes(nextStatus) && !hasPermission(actor, collaborator, 'project:publish')) {
        const error = new Error('You do not have permission to publish this project');
        error.status = 403;
        throw error;
      }
    }

    if (updates.type && updates.type !== project.type) {
      validateProjectType(updates.type);
    }

    return db.transaction(async (trx) => {
      const updated = await CreationProjectModel.updateById(
        project.id,
        {
          title: updates.title,
          summary: updates.summary,
          metadata: updates.metadata,
          contentOutline: updates.contentOutline,
          analyticsTargets: updates.analyticsTargets,
          publishingChannels: updates.publishingChannels,
          complianceNotes: updates.complianceNotes,
          status: nextStatus,
          reviewRequestedAt:
            nextStatus === 'ready_for_review' && !project.reviewRequestedAt
              ? new Date().toISOString()
              : updates.reviewRequestedAt,
          approvedAt:
            nextStatus === 'approved' && !project.approvedAt ? new Date().toISOString() : updates.approvedAt,
          publishedAt:
            nextStatus === 'published' && !project.publishedAt ? new Date().toISOString() : updates.publishedAt,
          archivedAt: nextStatus === 'archived' ? new Date().toISOString() : updates.archivedAt
        },
        trx
      );

      const hydrated = await hydrateProject(updated, { includeCollaborators: true });

      const changeSummary = buildChangeSummary(project, hydrated, actor);
      if (changeSummary) {
        const latestVersion = hydrated.latestVersion?.versionNumber ?? 1;
        await CreationProjectModel.insertVersion(
          {
            projectId: project.id,
            versionNumber: latestVersion + 1,
            snapshot: hydrated,
            changeSummary,
            createdBy: actor.id
          },
          trx
        );
      }

      await DomainEventModel.record(
        {
          entityType: 'creation_project',
          entityId: updated.publicId,
          eventType: 'creation.project.updated',
          payload: {
            actorId: actor.id,
            status: updated.status,
            changeSummary: changeSummary ?? null
          },
          performedBy: actor.id
        },
        trx
      );

      log.info({ projectId: updated.publicId, actorId: actor.id }, 'Creation project updated');

      return hydrateProject(updated, { includeCollaborators: true });
    });
  }

  static async addCollaborator(publicId, actor, payload) {
    ensureRole(actor, 'instructor');
    const project = await CreationProjectModel.findByPublicId(publicId);
    if (!project) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }

    const collaborator = await resolveCollaborator(project, actor);
    if (!hasPermission(actor, collaborator, 'collaboration:manage')) {
      const error = new Error('You do not have permission to manage collaborators');
      error.status = 403;
      throw error;
    }

    if (payload.role) {
      if (!DEFAULT_PERMISSIONS[payload.role]) {
        const error = new Error('Unsupported collaborator role');
        error.status = 422;
        throw error;
      }
    }

    return db.transaction(async (trx) => {
      const record = await CreationProjectCollaboratorModel.add(
        {
          projectId: project.id,
          userId: payload.userId,
          role: payload.role ?? 'editor',
          permissions: mergePermissions(payload.role ?? 'editor', payload.permissions)
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'creation_project',
          entityId: project.publicId,
          eventType: 'creation.project.collaborator_added',
          payload: {
            actorId: actor.id,
            collaboratorId: payload.userId,
            role: record.role
          },
          performedBy: actor.id
        },
        trx
      );

      log.info({ projectId: project.publicId, collaboratorId: payload.userId }, 'Collaborator added to project');
      return {
        ...record,
        permissions: mergePermissions(record.role, record.permissions)
      };
    });
  }

  static async removeCollaborator(publicId, actor, userId) {
    ensureRole(actor, 'instructor');
    const project = await CreationProjectModel.findByPublicId(publicId);
    if (!project) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }

    if (project.ownerId === userId) {
      const error = new Error('Cannot remove the project owner');
      error.status = 409;
      throw error;
    }

    const collaborator = await resolveCollaborator(project, actor);
    if (!hasPermission(actor, collaborator, 'collaboration:manage')) {
      const error = new Error('You do not have permission to manage collaborators');
      error.status = 403;
      throw error;
    }

    await CreationProjectCollaboratorModel.remove(project.id, userId);
    await DomainEventModel.record({
      entityType: 'creation_project',
      entityId: project.publicId,
      eventType: 'creation.project.collaborator_removed',
      payload: {
        actorId: actor.id,
        collaboratorId: userId
      },
      performedBy: actor.id
    });

    log.info({ projectId: project.publicId, collaboratorId: userId }, 'Collaborator removed from project');
  }

  static async listTemplates({ actor, filters = {} } = {}) {
    ensureRole(actor, 'instructor');
    const type = filters.type ? toArray(filters.type) : undefined;
    const templates = await CreationTemplateModel.list({
      type,
      isDefault: filters.isDefault,
      includeRetired: Boolean(filters.includeRetired)
    });
    return templates;
  }

  static async createTemplate(actor, payload) {
    ensureRole(actor, 'instructor');
    validateProjectType(payload.type);
    if (!payload.title) {
      const error = new Error('Template title is required');
      error.status = 422;
      throw error;
    }
    if (!payload.schema || typeof payload.schema !== 'object') {
      const error = new Error('Template schema is required');
      error.status = 422;
      throw error;
    }

    return db.transaction(async (trx) => {
      if (payload.isDefault) {
        await trx('creation_templates').where({ type: payload.type, is_default: true }).update({ is_default: false });
      }

      const template = await CreationTemplateModel.create(
        {
          type: payload.type,
          title: payload.title,
          description: payload.description,
          schema: payload.schema,
          version: payload.version ?? 1,
          isDefault: Boolean(payload.isDefault),
          createdBy: actor.id,
          governanceTags: payload.governanceTags,
          publishedAt: payload.publishedAt ?? new Date().toISOString()
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'creation_template',
          entityId: template.publicId,
          eventType: 'creation.template.created',
          payload: {
            actorId: actor.id,
            type: template.type,
            isDefault: template.isDefault
          },
          performedBy: actor.id
        },
        trx
      );

      log.info({ templateId: template.publicId, actorId: actor.id }, 'Creation template created');
      return template;
    });
  }

  static async updateTemplate(publicId, actor, payload) {
    ensureRole(actor, 'instructor');
    const template = await CreationTemplateModel.findByPublicId(publicId);
    if (!template) {
      const error = new Error('Template not found');
      error.status = 404;
      throw error;
    }

    return db.transaction(async (trx) => {
      if (payload.isDefault === true) {
        await trx('creation_templates').where({ type: template.type, is_default: true }).update({ is_default: false });
      }

      const updated = await CreationTemplateModel.updateById(
        template.id,
        {
          title: payload.title,
          description: payload.description,
          schema: payload.schema,
          version: payload.version,
          isDefault: payload.isDefault,
          governanceTags: payload.governanceTags,
          retiredAt: payload.retiredAt,
          publishedAt: payload.publishedAt
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'creation_template',
          entityId: updated.publicId,
          eventType: 'creation.template.updated',
          payload: {
            actorId: actor.id,
            isDefault: updated.isDefault,
            version: updated.version
          },
          performedBy: actor.id
        },
        trx
      );

      log.info({ templateId: updated.publicId, actorId: actor.id }, 'Creation template updated');
      return updated;
    });
  }

  static async startCollaborationSession(publicId, actor, payload = {}) {
    ensureRole(actor, 'user');
    const project = await CreationProjectModel.findByPublicId(publicId);
    if (!project) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }

    const collaborator = await resolveCollaborator(project, actor);
    if (!hasPermission(actor, collaborator, 'session:start')) {
      const error = new Error('You do not have permission to collaborate on this project');
      error.status = 403;
      throw error;
    }

    return db.transaction(async (trx) => {
      const existing = await CreationCollaborationSessionModel.findActiveByParticipant(project.id, actor.id, trx);
      if (existing) {
        await CreationCollaborationSessionModel.markHeartbeat(existing.id, trx);
        return existing;
      }

      const session = await CreationCollaborationSessionModel.create(
        {
          projectId: project.id,
          participantId: actor.id,
          role: collaborator.role,
          capabilities: mergePermissions(collaborator.role, collaborator.permissions),
          metadata: {
            entryPoint: payload.entryPoint ?? 'studio',
            clientVersion: payload.clientVersion ?? null
          }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'creation_project',
          entityId: project.publicId,
          eventType: 'creation.project.session_started',
          payload: {
            actorId: actor.id,
            sessionId: session.publicId,
            entryPoint: payload.entryPoint ?? 'studio'
          },
          performedBy: actor.id
        },
        trx
      );

      log.info({ projectId: project.publicId, sessionId: session.publicId }, 'Collaboration session started');
      return session;
    });
  }

  static async endCollaborationSession(publicId, actor, sessionId, { terminate = false } = {}) {
    ensureRole(actor, 'user');
    const project = await CreationProjectModel.findByPublicId(publicId);
    if (!project) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }

    const collaborator = await resolveCollaborator(project, actor);
    if (!hasPermission(actor, collaborator, 'session:start')) {
      const error = new Error('You do not have permission to manage sessions');
      error.status = 403;
      throw error;
    }

    const session = await CreationCollaborationSessionModel.findByPublicId(sessionId);
    if (!session || session.projectId !== project.id) {
      const error = new Error('Session not found');
      error.status = 404;
      throw error;
    }

    if (session.participantId !== actor.id && !hasPermission(actor, collaborator, 'collaboration:manage')) {
      const error = new Error('You cannot terminate another collaborator session');
      error.status = 403;
      throw error;
    }

    const ended = await CreationCollaborationSessionModel.endSession(session.id, { wasTerminated: terminate });

    await DomainEventModel.record({
      entityType: 'creation_project',
      entityId: project.publicId,
      eventType: 'creation.project.session_ended',
      payload: {
        actorId: actor.id,
        sessionId,
        terminate
      },
      performedBy: actor.id
    });

    log.info({ projectId: project.publicId, sessionId, terminate }, 'Collaboration session ended');
    return ended;
  }

  static async promoteProjectToAdsCampaign(publicId, actor, payload = {}) {
    ensureRole(actor, 'instructor');
    const project = await CreationProjectModel.findByPublicId(publicId);
    if (!project) {
      const error = new Error('Project not found');
      error.status = 404;
      throw error;
    }

    const collaborator = await resolveCollaborator(project, actor);
    if (!hasPermission(actor, collaborator, 'ads:draft')) {
      const error = new Error('You do not have permission to create ads from this project');
      error.status = 403;
      throw error;
    }

    const campaignName = payload.name ?? `${project.title} campaign`; // keep friendly but real
    const targeting = payload.targeting ?? {
      keywords: project.analyticsTargets?.keywords ?? [],
      audiences: project.analyticsTargets?.audiences ?? [],
      locations: project.analyticsTargets?.markets ?? []
    };

    const creativeUrl = payload.creative?.url ?? project.metadata?.landingPage ?? null;
    if (!creativeUrl) {
      const error = new Error('Campaign creative URL is required');
      error.status = 422;
      throw error;
    }

    const budget = payload.budget ?? { currency: 'USD', dailyCents: 2000 };

    const campaign = await AdsCampaignModel.create({
      createdBy: actor.id,
      name: campaignName,
      objective: payload.objective ?? 'traffic',
      status: 'draft',
      budgetCurrency: budget.currency,
      budgetDailyCents: budget.dailyCents,
      spendCurrency: budget.currency,
      targetingKeywords: targeting.keywords,
      targetingAudiences: targeting.audiences,
      targetingLocations: targeting.locations,
      targetingLanguages: targeting.languages ?? ['en'],
      creativeHeadline: payload.creative?.headline ?? project.summary?.slice(0, 160) ?? project.title,
      creativeDescription: payload.creative?.description ?? project.summary?.slice(0, 500) ?? null,
      creativeUrl,
      metadata: {
        sourceProjectId: project.publicId,
        sourceProjectType: project.type,
        analyticsTargets: project.analyticsTargets ?? {}
      }
    });

    await DomainEventModel.record({
      entityType: 'creation_project',
      entityId: project.publicId,
      eventType: 'creation.project.promoted_to_campaign',
      payload: {
        actorId: actor.id,
        campaignId: campaign.publicId
      },
      performedBy: actor.id
    });

    log.info({ projectId: project.publicId, campaignId: campaign.publicId }, 'Project promoted to ads campaign');
    return campaign;
  }
}

