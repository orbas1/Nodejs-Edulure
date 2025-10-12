import Joi from 'joi';

import { verifyAccessToken } from '../config/jwtKeyStore.js';
import explorerAnalyticsService from '../services/ExplorerAnalyticsService.js';
import { success } from '../utils/httpResponse.js';

const summarySchema = Joi.object({
  range: Joi.string()
    .pattern(/^(7|14|30)d$/)
    .default('7d')
});

const interactionSchema = Joi.object({
  searchEventId: Joi.string().uuid().required(),
  entityType: Joi.string().trim().min(2).max(80).required(),
  resultId: Joi.alternatives().try(Joi.string().trim().min(1).max(191), Joi.number().integer()).required(),
  interactionType: Joi.string().valid('click', 'detail_view', 'bookmark').default('click'),
  position: Joi.number().integer().min(0).optional()
});

const alertsSchema = Joi.object({
  includeResolved: Joi.boolean().default(false)
});

function parseRange(rangeString) {
  if (!rangeString) {
    return 7;
  }
  const days = Number(rangeString.replace('d', ''));
  return Number.isFinite(days) && days > 0 ? days : 7;
}

function resolveOptionalUser(req) {
  if (req.user?.id) {
    return req.user.id;
  }
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  try {
    const payload = verifyAccessToken(token);
    return payload?.sub ?? null;
  } catch (_error) {
    return null;
  }
}

export default class AnalyticsController {
  static async getExplorerSummary(req, res, next) {
    try {
      const { range } = await summarySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const rangeDays = parseRange(range);
      const summary = await explorerAnalyticsService.getExplorerSummary({ rangeDays });
      return success(res, {
        data: summary,
        message: 'Explorer analytics summary generated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async getExplorerAlerts(req, res, next) {
    try {
      const payload = await alertsSchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const alerts = await explorerAnalyticsService.getExplorerAlerts({ includeResolved: payload.includeResolved });
      return success(res, {
        data: alerts,
        message: 'Explorer analytics alerts fetched'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async recordExplorerInteraction(req, res, next) {
    try {
      const payload = await interactionSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const userId = resolveOptionalUser(req);
      const interaction = await explorerAnalyticsService.recordInteraction({
        eventUuid: payload.searchEventId,
        entityType: payload.entityType,
        resultId: payload.resultId,
        interactionType: payload.interactionType,
        position: payload.position,
        userId
      });
      return success(res, {
        data: interaction,
        message: 'Explorer interaction recorded',
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
}
