import Joi from 'joi';

import AdsService from '../services/AdsService.js';
import { paginated, success } from '../utils/httpResponse.js';

const objectiveEnum = ['awareness', 'traffic', 'leads', 'conversions'];
const statusEnum = ['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'];

const placementContextEnum = ['global_feed', 'community_feed', 'search', 'course_live'];

const listSchema = Joi.object({
  status: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  search: Joi.string().max(120).allow('', null),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(50).optional()
});

const targetingSchema = Joi.object({
  keywords: Joi.array().items(Joi.string().trim().max(80)).default([]),
  audiences: Joi.array().items(Joi.string().trim().max(120)).default([]),
  locations: Joi.array().items(Joi.string().trim().max(120)).default([]),
  languages: Joi.array().items(Joi.string().trim().length(2).uppercase()).default(['EN'])
});

const creativeSchema = Joi.object({
  headline: Joi.string().trim().min(6).max(160).required(),
  description: Joi.string().allow('', null).max(500),
  url: Joi.string().uri().required()
});

const budgetSchema = Joi.object({
  currency: Joi.string().length(3).uppercase().default('USD'),
  dailyCents: Joi.number().integer().min(1000).max(20_000_000).required()
});

const placementSchema = Joi.array()
  .items(
    Joi.alternatives().try(
      Joi.string().valid(...placementContextEnum),
      Joi.object({
        context: Joi.string()
          .valid(...placementContextEnum)
          .required(),
        slot: Joi.string().trim().max(120).allow('', null),
        surface: Joi.string().trim().max(120).allow('', null),
        label: Joi.string().trim().max(160).allow('', null)
      })
    )
  )
  .default([]);

const brandSafetySchema = Joi.object({
  categories: Joi.array()
    .items(Joi.string().valid('standard', 'education', 'financial', 'youth', 'sensitive'))
    .default(['standard']),
  excludedTopics: Joi.array().items(Joi.string().trim().max(80)).default([]),
  reviewNotes: Joi.string().trim().max(500).allow('', null)
}).default({ categories: ['standard'], excludedTopics: [], reviewNotes: null });

const previewSchema = Joi.object({
  theme: Joi.string().valid('light', 'dark').default('light'),
  accent: Joi.string().valid('primary', 'indigo', 'emerald', 'amber').default('primary')
}).default({ theme: 'light', accent: 'primary' });

const scheduleSchema = Joi.object({
  startAt: Joi.date().iso().optional(),
  endAt: Joi.date().iso().optional()
}).optional();

const createSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  objective: Joi.string()
    .valid(...objectiveEnum)
    .required(),
  status: Joi.string()
    .valid('draft', 'scheduled', 'active', 'paused')
    .default('draft'),
  budget: budgetSchema.required(),
  targeting: targetingSchema.default({}),
  creative: creativeSchema.required(),
  schedule: scheduleSchema,
  placements: placementSchema,
  brandSafety: brandSafetySchema,
  preview: previewSchema,
  metadata: Joi.object().optional(),
  startAt: Joi.date().iso().optional(),
  endAt: Joi.date().iso().optional()
}).custom((value, helpers) => {
  const startAt = value.startAt ?? value.schedule?.startAt ?? null;
  const endAt = value.endAt ?? value.schedule?.endAt ?? null;
  if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
    return helpers.error('any.invalid', { message: 'End date must be after the start date' });
  }
  return value;
});

const updateSchema = Joi.object({
  name: Joi.string().trim().max(200).optional(),
  objective: Joi.string()
    .valid(...objectiveEnum)
    .optional(),
  status: Joi.string()
    .valid(...statusEnum)
    .optional(),
  budget: budgetSchema.optional(),
  targeting: targetingSchema.optional(),
  creative: creativeSchema.optional(),
  schedule: Joi.object({
    startAt: Joi.date().iso().optional(),
    endAt: Joi.date().iso().optional()
  }).optional(),
  placements: placementSchema.optional(),
  brandSafety: brandSafetySchema.optional(),
  preview: previewSchema.optional(),
  metadata: Joi.object().optional()
});

const metricsSchema = Joi.object({
  metricDate: Joi.date().iso().optional(),
  impressions: Joi.number().integer().min(0).required(),
  clicks: Joi.number().integer().min(0).required(),
  conversions: Joi.number().integer().min(0).required(),
  spendCents: Joi.number().integer().min(0).required(),
  revenueCents: Joi.number().integer().min(0).optional(),
  metadata: Joi.object().optional()
});

const insightSchema = Joi.object({
  windowDays: Joi.number().integer().min(1).max(60).default(14)
});

function parseStatus(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  const list = String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

export default class AdsController {
  static async list(req, res, next) {
    try {
      const query = await listSchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const actor = { id: req.user.id, role: req.user.role };
      const result = await AdsService.listCampaigns({
        actor,
        filters: {
          status: parseStatus(query.status),
          search: query.search ?? undefined
        },
        pagination: { page: query.page, limit: query.limit }
      });

      return paginated(res, {
        data: result.data,
        pagination: result.pagination,
        message: 'Campaigns retrieved'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const payload = await createSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      const actor = { id: req.user.id, role: req.user.role };
      const campaign = await AdsService.createCampaign(actor, payload);

      return success(res, {
        data: campaign,
        message: 'Campaign created',
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

  static async get(req, res, next) {
    try {
      const actor = { id: req.user.id, role: req.user.role };
      const campaign = await AdsService.getCampaign(req.params.campaignId, actor);
      return success(res, {
        data: campaign,
        message: 'Campaign fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const payload = await updateSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = { id: req.user.id, role: req.user.role };
      const campaign = await AdsService.updateCampaign(req.params.campaignId, actor, payload);
      return success(res, {
        data: campaign,
        message: 'Campaign updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async pause(req, res, next) {
    try {
      const actor = { id: req.user.id, role: req.user.role };
      const campaign = await AdsService.pauseCampaign(req.params.campaignId, actor, 'manual_pause');
      return success(res, {
        data: campaign,
        message: 'Campaign paused'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async resume(req, res, next) {
    try {
      const actor = { id: req.user.id, role: req.user.role };
      const campaign = await AdsService.resumeCampaign(req.params.campaignId, actor);
      return success(res, {
        data: campaign,
        message: 'Campaign resumed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async recordMetrics(req, res, next) {
    try {
      const payload = await metricsSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = { id: req.user.id, role: req.user.role };
      const campaign = await AdsService.recordDailyMetrics(req.params.campaignId, actor, payload);
      return success(res, {
        data: campaign,
        message: 'Metrics recorded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async insights(req, res, next) {
    try {
      const query = await insightSchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = { id: req.user.id, role: req.user.role };
      const insights = await AdsService.getInsights(req.params.campaignId, actor, query);
      return success(res, {
        data: insights,
        message: 'Campaign insights generated'
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
