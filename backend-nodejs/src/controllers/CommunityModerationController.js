import Joi from 'joi';

import CommunityModerationService from '../services/CommunityModerationService.js';
import { paginated, success } from '../utils/httpResponse.js';

const flaggedSourceEnum = [
  'user_report',
  'automated_detection',
  'ai_assistant',
  'external_signal',
  'manual_audit'
];

const evidenceSchema = Joi.object({
  type: Joi.string().max(40).required(),
  value: Joi.string().max(2000).required()
});

const flagPostSchema = Joi.object({
  postId: Joi.number().integer().min(1).required(),
  reason: Joi.string().max(500).required(),
  riskScore: Joi.number().integer().min(0).max(100).default(0),
  flaggedSource: Joi.string()
    .valid(...flaggedSourceEnum)
    .default('user_report'),
  evidence: Joi.array().items(evidenceSchema).default([]),
  tags: Joi.array().items(Joi.string().max(60)).default([]),
  notes: Joi.string().max(1000).allow('', null)
});

const moderationQuerySchema = Joi.object({
  status: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  severity: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  flaggedSource: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  search: Joi.string().max(200).allow('', null),
  from: Joi.date().optional(),
  to: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(25)
});

const caseActionSchema = Joi.object({
  action: Joi.string()
    .valid('assign', 'escalate', 'approve', 'reject', 'suppress', 'restore', 'comment')
    .required(),
  notes: Joi.string().allow('', null).max(1000),
  riskScore: Joi.number().integer().min(0).max(100).optional(),
  assignedTo: Joi.number().integer().min(1).optional(),
  archivePost: Joi.boolean().optional(),
  restoreStatus: Joi.string().valid('draft', 'scheduled', 'published', 'archived').optional(),
  followUpAt: Joi.date().iso().optional(),
  followUpReason: Joi.string().max(255).allow('', null),
  acknowledgeSuggestion: Joi.string().max(120).optional()
});

const scamReportSchema = Joi.object({
  entityType: Joi.string()
    .valid('user', 'community_post', 'community', 'project', 'payment', 'message')
    .required(),
  entityId: Joi.string().max(120).required(),
  communityId: Joi.number().integer().min(1).optional(),
  reason: Joi.string().max(500).required(),
  description: Joi.string().max(2000).allow('', null),
  riskScore: Joi.number().integer().min(0).max(100).default(0),
  evidence: Joi.array().items(evidenceSchema).default([]),
  context: Joi.object().default({}),
  channel: Joi.string().max(60).default('in_app')
});

const scamReportStatusEnum = [
  'pending',
  'triage',
  'investigating',
  'escalated',
  'action_required',
  'resolved',
  'dismissed',
  'ignored'
];

const scamUpdateSchema = Joi.object({
  status: Joi.string().valid(...scamReportStatusEnum).optional(),
  riskScore: Joi.number().integer().min(0).max(100).optional(),
  handledBy: Joi.number().integer().min(1).allow(null).optional(),
  resolvedAt: Joi.date().iso().allow(null).optional(),
  reason: Joi.string().max(500).optional(),
  description: Joi.string().max(2000).allow('', null).optional(),
  metadata: Joi.object().optional()
}).min(1);

const scamQuerySchema = Joi.object({
  status: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  communityId: Joi.number().integer().min(1).optional(),
  entityType: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  search: Joi.string().max(200).allow('', null),
  from: Joi.date().optional(),
  to: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(25)
});

const analyticsEventSchema = Joi.object({
  communityId: Joi.number().integer().min(1).optional(),
  entityType: Joi.string().max(120).required(),
  entityId: Joi.string().max(120).required(),
  eventType: Joi.string().max(160).required(),
  riskScore: Joi.number().integer().min(0).max(100).optional(),
  metrics: Joi.object().default({}),
  source: Joi.string().max(120).default('manual'),
  occurredAt: Joi.date().iso().optional()
});

const analyticsSummarySchema = Joi.object({
  communityId: Joi.number().integer().min(1).optional(),
  from: Joi.date().optional(),
  to: Joi.date().optional()
});

function normaliseFilter(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value;
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default class CommunityModerationController {
  static async flagPost(req, res, next) {
    try {
      const payload = await flagPostSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      const result = await CommunityModerationService.flagPostForReview({
        actor: { id: req.user.id, role: req.user.role },
        communityId: Number(req.params.communityId),
        payload
      });

      return success(res, {
        data: result,
        message: 'Post submitted to moderation queue',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async listCases(req, res, next) {
    try {
      const query = await moderationQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const filters = {
        status: normaliseFilter(query.status),
        severity: normaliseFilter(query.severity),
        flaggedSource: normaliseFilter(query.flaggedSource),
        search: query.search ?? undefined,
        from: query.from ?? undefined,
        to: query.to ?? undefined,
        communityId: Number(req.params.communityId)
      };

      const result = await CommunityModerationService.listCases(
        { id: req.user.id, role: req.user.role },
        filters,
        { page: query.page, perPage: query.perPage }
      );

      return paginated(res, {
        data: result.items,
        pagination: result.pagination,
        message: 'Moderation cases retrieved'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async getCase(req, res, next) {
    try {
      const result = await CommunityModerationService.getCase(
        { id: req.user.id, role: req.user.role },
        req.params.caseId
      );
      return success(res, {
        data: result,
        message: 'Moderation case retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async listCaseActions(req, res, next) {
    try {
      const actions = await CommunityModerationService.listCaseActions(
        { id: req.user.id, role: req.user.role },
        req.params.caseId
      );
      return success(res, {
        data: actions,
        message: 'Case actions fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async applyCaseAction(req, res, next) {
    try {
      const payload = await caseActionSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      const result = await CommunityModerationService.applyCaseAction(
        req.params.caseId,
        { id: req.user.id, role: req.user.role },
        payload
      );

      return success(res, {
        data: result,
        message: 'Moderation action applied'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async submitScamReport(req, res, next) {
    try {
      const payload = await scamReportSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      const report = await CommunityModerationService.submitScamReport(
        { id: req.user.id, role: req.user.role },
        payload
      );

      return success(res, {
        data: report,
        message: 'Scam report submitted',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async listScamReports(req, res, next) {
    try {
      const query = await scamQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const filters = {
        status: normaliseFilter(query.status),
        communityId: query.communityId ?? undefined,
        entityType: normaliseFilter(query.entityType),
        search: query.search ?? undefined,
        from: query.from ?? undefined,
        to: query.to ?? undefined
      };

      const result = await CommunityModerationService.listScamReports(
        { id: req.user.id, role: req.user.role },
        filters,
        { page: query.page, perPage: query.perPage }
      );

      return paginated(res, {
        data: result.items,
        pagination: result.pagination,
        message: 'Scam reports fetched'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateScamReport(req, res, next) {
    try {
      const { reportId } = req.params;
      const payload = await scamUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      const updated = await CommunityModerationService.updateScamReport(
        { id: req.user.id, role: req.user.role },
        reportId,
        payload
      );

      return success(res, {
        data: updated,
        message: 'Scam report updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async recordAnalyticsEvent(req, res, next) {
    try {
      const payload = await analyticsEventSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      const record = await CommunityModerationService.recordAnalyticsEvent(
        { id: req.user.id, role: req.user.role },
        payload
      );

      return success(res, {
        data: record,
        message: 'Analytics event recorded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async getAnalyticsSummary(req, res, next) {
    try {
      const payload = await analyticsSummarySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const summary = await CommunityModerationService.getAnalyticsSummary(
        { id: req.user.id, role: req.user.role },
        {
          communityId: payload.communityId ?? (req.params.communityId ? Number(req.params.communityId) : undefined),
          from: payload.from ?? undefined,
          to: payload.to ?? undefined
        }
      );

      return success(res, {
        data: summary,
        message: 'Moderation analytics summary generated'
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
