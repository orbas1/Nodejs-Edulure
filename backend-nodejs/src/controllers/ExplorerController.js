import Joi from 'joi';

import explorerSearchService from '../services/ExplorerSearchService.js';
import explorerAnalyticsService from '../services/ExplorerAnalyticsService.js';
import savedSearchService from '../services/SavedSearchService.js';
import { success } from '../utils/httpResponse.js';

const SUPPORTED_ENTITIES = explorerSearchService.getSupportedEntities();

const flexibleObjectSchema = Joi.object().unknown(true);

const searchSchema = Joi.object({
  query: Joi.string().allow('', null).default(''),
  entityTypes: Joi.array()
    .items(Joi.string().valid(...SUPPORTED_ENTITIES))
    .min(1)
    .default(SUPPORTED_ENTITIES),
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(50).default(12),
  filters: flexibleObjectSchema.default({}),
  globalFilters: flexibleObjectSchema.default({}),
  sort: flexibleObjectSchema.default({}),
  includeFacets: Joi.boolean().default(true),
  savedSearchId: Joi.number().integer().min(1).optional()
});

const createSavedSearchSchema = Joi.object({
  name: Joi.string().trim().min(3).max(120).required(),
  query: Joi.string().allow('', null).default(''),
  entityTypes: Joi.array()
    .items(Joi.string().valid(...SUPPORTED_ENTITIES))
    .min(1)
    .default(SUPPORTED_ENTITIES),
  filters: flexibleObjectSchema.default({}),
  globalFilters: flexibleObjectSchema.default({}),
  sort: flexibleObjectSchema.default({}),
  isPinned: Joi.boolean().default(false)
});

const updateSavedSearchSchema = Joi.object({
  name: Joi.string().trim().min(3).max(120),
  query: Joi.string().allow('', null),
  entityTypes: Joi.array().items(Joi.string().valid(...SUPPORTED_ENTITIES)).min(1),
  filters: flexibleObjectSchema,
  globalFilters: flexibleObjectSchema,
  sort: flexibleObjectSchema,
  isPinned: Joi.boolean(),
  lastUsedAt: Joi.date()
}).min(1);

export default class ExplorerController {
  static async search(req, res, next) {
    try {
      const payload = await searchSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const result = await explorerSearchService.search({
        query: payload.query,
        entityTypes: payload.entityTypes,
        page: payload.page,
        perPage: payload.perPage,
        filters: payload.filters,
        globalFilters: payload.globalFilters,
        sort: payload.sort,
        includeFacets: payload.includeFacets
      });

      if (req.user && payload.savedSearchId) {
        await savedSearchService.touchUsage(req.user.id, payload.savedSearchId).catch((error) => {
          req.log?.warn({ err: error, savedSearchId: payload.savedSearchId }, 'Failed to update saved search usage timestamp');
        });
      }

      let analyticsContext = null;
      try {
        const entitySummaries = Object.entries(result.results ?? {}).map(([entityType, summary]) => ({
          entityType,
          result: {
            ...summary,
            displayedHits: summary?.hits?.length ?? 0
          }
        }));
        const latencyMs = entitySummaries.reduce(
          (acc, { result: summary }) => acc + Number(summary?.processingTimeMs ?? 0),
          0
        );
        analyticsContext = await explorerAnalyticsService.recordSearchExecution({
          query: payload.query ?? '',
          entitySummaries,
          userId: req.user?.id,
          sessionId: req.user?.sessionId ?? req.traceId,
          traceId: req.traceId,
          filters: payload.filters,
          globalFilters: payload.globalFilters,
          sort: payload.sort,
          latencyMs,
          metadata: {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            savedSearchId: payload.savedSearchId ?? null
          }
        });
      } catch (analyticsError) {
        req.log?.warn({ err: analyticsError }, 'Failed to record explorer analytics event');
      }

      return success(res, {
        data: {
          ...result,
          analytics: analyticsContext
            ? {
                searchEventId: analyticsContext.eventUuid,
                totalResults: analyticsContext.totalResults,
                totalDisplayed: analyticsContext.totalDisplayed,
                zeroResult: analyticsContext.entitySummaries.every((summary) => summary.isZeroResult)
              }
            : null
        },
        message: 'Explorer results fetched'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async listSavedSearches(req, res, next) {
    try {
      const searches = await savedSearchService.list(req.user.id);
      return success(res, {
        data: searches,
        message: 'Saved searches fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getSavedSearch(req, res, next) {
    try {
      const savedSearch = await savedSearchService.get(req.user.id, Number(req.params.savedSearchId));
      return success(res, {
        data: savedSearch,
        message: 'Saved search fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createSavedSearch(req, res, next) {
    try {
      const payload = await createSavedSearchSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const savedSearch = await savedSearchService.create(req.user.id, payload);
      return success(res, {
        data: savedSearch,
        message: 'Saved search created',
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

  static async updateSavedSearch(req, res, next) {
    try {
      const payload = await updateSavedSearchSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const savedSearch = await savedSearchService.update(req.user.id, Number(req.params.savedSearchId), payload);
      return success(res, {
        data: savedSearch,
        message: 'Saved search updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deleteSavedSearch(req, res, next) {
    try {
      await savedSearchService.delete(req.user.id, Number(req.params.savedSearchId));
      return success(res, {
        data: null,
        message: 'Saved search deleted'
      });
    } catch (error) {
      return next(error);
    }
  }
}
