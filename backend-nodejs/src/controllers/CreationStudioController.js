import Joi from 'joi';

import CreationStudioService from '../services/CreationStudioService.js';
import CreationAnalyticsService from '../services/CreationAnalyticsService.js';
import CreationRecommendationService from '../services/CreationRecommendationService.js';
import { paginated, success } from '../utils/httpResponse.js';

const typeEnum = ['course', 'ebook', 'community', 'ads_asset'];
const statusEnum = [
  'draft',
  'ready_for_review',
  'in_review',
  'changes_requested',
  'approved',
  'published',
  'archived'
];

const listSchema = Joi.object({
  search: Joi.string().max(120).allow(null, ''),
  status: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  type: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  includeArchived: Joi.boolean().default(false),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

const projectPayloadSchema = Joi.object({
  title: Joi.string().trim().max(240).required(),
  summary: Joi.string().trim().allow(null, '').max(2000),
  type: Joi.string()
    .valid(...typeEnum)
    .required(),
  metadata: Joi.object().default({}),
  contentOutline: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().max(64).required(),
        label: Joi.string().max(200).required(),
        description: Joi.string().allow('', null).max(2000),
        durationMinutes: Joi.number().integer().min(0).optional(),
        children: Joi.array().items(Joi.link('#outlineItem')).optional()
      })
        .id('outlineItem')
        .required()
    )
    .default([]),
  analyticsTargets: Joi.object({
    keywords: Joi.array().items(Joi.string().max(80)).default([]),
    audiences: Joi.array().items(Joi.string().max(120)).default([]),
    markets: Joi.array().items(Joi.string().max(120)).default([]),
    goals: Joi.array().items(Joi.string().max(120)).default([])
  })
    .default({}),
  publishingChannels: Joi.array().items(Joi.string().trim().max(120)).default([]),
  complianceNotes: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid('legal', 'copyright', 'policy', 'security').default('policy'),
        message: Joi.string().max(500).required()
      })
    )
    .default([]),
  templateId: Joi.string().uuid().optional()
});

const projectUpdateSchema = projectPayloadSchema
  .fork(['title', 'type'], (schema) => schema.optional())
  .keys({
    status: Joi.string()
      .valid(...statusEnum)
      .optional()
  });

const collaboratorSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  role: Joi.string().valid('owner', 'editor', 'commenter', 'viewer').default('editor'),
  permissions: Joi.array().items(Joi.string().max(120)).default([])
});

const templateCreateSchema = Joi.object({
  type: Joi.string()
    .valid(...typeEnum)
    .required(),
  title: Joi.string().max(200).required(),
  description: Joi.string().allow('', null).max(500),
  schema: Joi.object().required(),
  version: Joi.number().integer().min(1).default(1),
  isDefault: Joi.boolean().default(false),
  governanceTags: Joi.array().items(Joi.string().max(80)).default([]),
  publishedAt: Joi.date().iso().optional()
});

const templateUpdateSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  description: Joi.string().allow('', null).max(500).optional(),
  schema: Joi.object().optional(),
  version: Joi.number().integer().min(1).optional(),
  isDefault: Joi.boolean().optional(),
  governanceTags: Joi.array().items(Joi.string().max(80)).optional(),
  retiredAt: Joi.date().iso().allow(null).optional(),
  publishedAt: Joi.date().iso().optional()
});

const promotionSchema = Joi.object({
  name: Joi.string().max(200).optional(),
  objective: Joi.string().valid('awareness', 'traffic', 'leads', 'conversions').optional(),
  targeting: Joi.object({
    keywords: Joi.array().items(Joi.string().max(80)).optional(),
    audiences: Joi.array().items(Joi.string().max(120)).optional(),
    locations: Joi.array().items(Joi.string().max(120)).optional(),
    languages: Joi.array().items(Joi.string().length(2).uppercase()).optional()
  }).optional(),
  budget: Joi.object({
    currency: Joi.string().length(3).uppercase().required(),
    dailyCents: Joi.number().integer().min(500).max(50_000_000).required()
  }).optional(),
  creative: Joi.object({
    headline: Joi.string().min(6).max(160).optional(),
    description: Joi.string().allow('', null).max(500).optional(),
    url: Joi.string().uri().required()
  }).optional()
});

const sessionStartSchema = Joi.object({
  entryPoint: Joi.string().max(120).default('studio'),
  clientVersion: Joi.string().max(32).allow(null, '')
});

const analyticsQuerySchema = Joi.object({
  range: Joi.string().valid('7d', '30d', '90d', '365d').default('30d'),
  ownerId: Joi.number().integer().positive().optional()
});

const recommendationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(20).default(5),
  includeHistory: Joi.boolean().default(false),
  ownerId: Joi.number().integer().positive().optional()
});

function parseCommaSeparated(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default class CreationStudioController {
  static async listProjects(req, res, next) {
    try {
      const query = await listSchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const actor = { id: req.user.id, role: req.user.role };
      const result = await CreationStudioService.listProjects({
        actor,
        filters: {
          search: query.search ?? undefined,
          status: parseCommaSeparated(query.status),
          type: parseCommaSeparated(query.type),
          includeArchived: query.includeArchived
        },
        pagination: { page: query.page, limit: query.limit }
      });

      return paginated(res, {
        data: result.data,
        pagination: result.pagination,
        message: 'Projects retrieved'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async analyticsSummary(req, res, next) {
    try {
      const query = await analyticsQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const actor = { id: req.user.id, role: req.user.role };
      const summary = await CreationAnalyticsService.getSummary(actor, query);

      return success(res, {
        data: summary,
        message: 'Creation analytics summary generated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async recommendations(req, res, next) {
    try {
      const query = await recommendationQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const actor = {
        id: req.user.id,
        role: req.user.role,
        tenantId: req.user?.tenantId ?? null
      };

      const payload = await CreationRecommendationService.generate(actor, {
        limit: query.limit,
        includeHistory: query.includeHistory,
        ownerId: query.ownerId,
        tenantId: actor.tenantId,
        headersTenantId: req.headers['x-tenant-id'] ?? null
      });

      return success(res, {
        data: payload,
        message: 'Creation recommendations generated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async createProject(req, res, next) {
    try {
      const payload = await projectPayloadSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      const actor = { id: req.user.id, role: req.user.role };
      const project = await CreationStudioService.createProject(actor, payload);

      return success(res, {
        status: 201,
        data: project,
        message: 'Project created'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async getProject(req, res, next) {
    try {
      const actor = { id: req.user.id, role: req.user.role };
      const project = await CreationStudioService.getProject(req.params.projectId, actor);
      return success(res, {
        data: project,
        message: 'Project fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateProject(req, res, next) {
    try {
      const payload = await projectUpdateSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = { id: req.user.id, role: req.user.role };
      const expectedUpdatedAt = req.headers['if-unmodified-since'] ?? req.headers['x-creation-updated-at'] ?? null;
      const project = await CreationStudioService.updateProject(
        req.params.projectId,
        actor,
        payload,
        { expectedUpdatedAt }
      );
      return success(res, {
        data: project,
        message: 'Project updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async addCollaborator(req, res, next) {
    try {
      const payload = await collaboratorSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = { id: req.user.id, role: req.user.role };
      const collaborator = await CreationStudioService.addCollaborator(req.params.projectId, actor, payload);
      return success(res, {
        data: collaborator,
        message: 'Collaborator added'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async removeCollaborator(req, res, next) {
    try {
      const userId = Number.parseInt(req.params.userId, 10);
      if (!Number.isInteger(userId) || userId <= 0) {
        const error = new Error('Invalid collaborator identifier');
        error.status = 422;
        throw error;
      }
      const actor = { id: req.user.id, role: req.user.role };
      await CreationStudioService.removeCollaborator(req.params.projectId, actor, userId);
      return success(res, {
        data: { userId },
        message: 'Collaborator removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async listTemplates(req, res, next) {
    try {
      const actor = { id: req.user.id, role: req.user.role };
      const type = parseCommaSeparated(req.query.type);
      const templates = await CreationStudioService.listTemplates({
        actor,
        filters: {
          type,
          isDefault: req.query.isDefault === 'true' ? true : req.query.isDefault === 'false' ? false : undefined,
          includeRetired: req.query.includeRetired === 'true'
        }
      });
      return success(res, {
        data: templates,
        message: 'Templates retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createTemplate(req, res, next) {
    try {
      const payload = await templateCreateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = { id: req.user.id, role: req.user.role };
      const template = await CreationStudioService.createTemplate(actor, payload);
      return success(res, {
        status: 201,
        data: template,
        message: 'Template created'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateTemplate(req, res, next) {
    try {
      const payload = await templateUpdateSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = { id: req.user.id, role: req.user.role };
      const template = await CreationStudioService.updateTemplate(req.params.templateId, actor, payload);
      return success(res, {
        data: template,
        message: 'Template updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async startSession(req, res, next) {
    try {
      const payload = await sessionStartSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = { id: req.user.id, role: req.user.role };
      const session = await CreationStudioService.startCollaborationSession(req.params.projectId, actor, payload);
      return success(res, {
        data: session,
        message: 'Session started'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async endSession(req, res, next) {
    try {
      const terminate = req.body?.terminate === true || req.body?.terminate === 'true';
      const actor = { id: req.user.id, role: req.user.role };
      const session = await CreationStudioService.endCollaborationSession(req.params.projectId, actor, req.params.sessionId, {
        terminate
      });
      return success(res, {
        data: session,
        message: 'Session ended'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async promoteToCampaign(req, res, next) {
    try {
      const payload = await promotionSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = { id: req.user.id, role: req.user.role };
      const campaign = await CreationStudioService.promoteProjectToAdsCampaign(req.params.projectId, actor, payload);
      return success(res, {
        status: 201,
        data: campaign,
        message: 'Campaign draft created'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }
}

