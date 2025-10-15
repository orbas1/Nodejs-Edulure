import Joi from 'joi';

import LiveFeedService from '../services/LiveFeedService.js';
import { success } from '../utils/httpResponse.js';

const contextEnum = ['global', 'community'];
const rangeEnum = ['7d', '30d', '90d', '180d', '365d'];
const placementContextEnum = ['global_feed', 'community_feed', 'search', 'course_live'];

const feedQuerySchema = Joi.object({
  context: Joi.string()
    .valid(...contextEnum)
    .default('global'),
  community: Joi.alternatives().try(Joi.string().max(160), Joi.number().integer()).optional(),
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(50).default(20),
  includeAnalytics: Joi.boolean().default(true),
  includeHighlights: Joi.boolean().default(true),
  range: Joi.string()
    .valid(...rangeEnum)
    .default('30d'),
  search: Joi.string().max(200).allow('', null),
  postType: Joi.string().max(64).allow('', null)
});

const placementsQuerySchema = Joi.object({
  context: Joi.string()
    .valid(...placementContextEnum)
    .default('global_feed'),
  limit: Joi.number().integer().min(1).max(10).default(3),
  keywords: Joi.alternatives().try(Joi.string().max(300), Joi.array().items(Joi.string().max(80))).optional()
});

const analyticsQuerySchema = Joi.object({
  context: Joi.string()
    .valid(...contextEnum)
    .default('global'),
  community: Joi.alternatives().try(Joi.string().max(160), Joi.number().integer()).optional(),
  range: Joi.string()
    .valid(...rangeEnum)
    .default('30d'),
  search: Joi.string().max(200).allow('', null),
  postType: Joi.string().max(64).allow('', null)
});

function buildActor(req) {
  return { id: req.user.id, role: req.user.role };
}

function normaliseKeywords(input) {
  if (!input) return undefined;
  if (Array.isArray(input)) {
    return input.map((value) => String(value).trim()).filter(Boolean);
  }
  return String(input)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export default class FeedController {
  static async getFeed(req, res, next) {
    try {
      const query = await feedQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const actor = buildActor(req);
      const payload = await LiveFeedService.getFeed({
        actor,
        context: query.context,
        community: query.community,
        page: query.page,
        perPage: query.perPage,
        includeAnalytics: query.includeAnalytics,
        includeHighlights: query.includeHighlights,
        range: query.range,
        filters: {
          search: query.search,
          postType: query.postType
        }
      });

      return success(res, {
        data: payload,
        message: 'Live feed snapshot generated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async getAnalytics(req, res, next) {
    try {
      const query = await analyticsQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const actor = buildActor(req);
      const analytics = await LiveFeedService.getAnalytics({
        actor,
        context: query.context,
        community: query.community,
        range: query.range,
        filters: {
          search: query.search,
          postType: query.postType
        }
      });

      return success(res, {
        data: analytics,
        message: 'Feed analytics generated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async getPlacements(req, res, next) {
    try {
      const query = await placementsQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const placements = await LiveFeedService.getPlacements({
        context: query.context,
        limit: query.limit,
        metadata: {
          keywords: normaliseKeywords(query.keywords)
        }
      });

      return success(res, {
        data: placements,
        message: 'Eligible placements generated'
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
