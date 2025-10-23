import Joi from 'joi';

import explorerSearchService from '../services/ExplorerSearchService.js';
import explorerAnalyticsService from '../services/ExplorerAnalyticsService.js';
import savedSearchService from '../services/SavedSearchService.js';
import { success } from '../utils/httpResponse.js';

const SUPPORTED_ENTITIES = explorerSearchService.getSupportedEntities();

const flexibleObjectSchema = Joi.object().unknown(true);

function normaliseFacetEntries(rawCounts) {
  if (!rawCounts) {
    return [];
  }

  if (Array.isArray(rawCounts)) {
    return rawCounts
      .map((entry) => {
        if (entry === null || entry === undefined) {
          return null;
        }

        if (typeof entry === 'object') {
          const label =
            entry.label ?? entry.value ?? entry.key ?? entry.name ?? entry.id ?? null;
          const count = Number(entry.count ?? entry.total ?? entry.value ?? entry.hits ?? 0);
          if (!label || Number.isNaN(count)) {
            return null;
          }
          return [String(label), count];
        }

        if (typeof entry === 'string') {
          return [entry, 1];
        }

        const stringified = String(entry);
        return stringified ? [stringified, 1] : null;
      })
      .filter(Boolean);
  }

  if (typeof rawCounts === 'object') {
    return Object.entries(rawCounts)
      .map(([label, count]) => {
        const safeLabel = typeof label === 'string' ? label : String(label);
        const numeric = Number(count ?? 0);
        if (!safeLabel || Number.isNaN(numeric)) {
          return null;
        }
        return [safeLabel, numeric];
      })
      .filter(Boolean);
  }

  return [];
}

function aggregateFacetMetadata(entitySummaries = []) {
  const aggregated = new Map();

  for (const summary of entitySummaries) {
    if (!summary) {
      continue;
    }

    const metadata = summary.metadata ?? {};
    const facets = metadata.facets;
    if (!facets || typeof facets !== 'object') {
      continue;
    }

    for (const [facetKey, rawCounts] of Object.entries(facets)) {
      if (!facetKey) {
        continue;
      }

      if (!aggregated.has(facetKey)) {
        aggregated.set(facetKey, { counts: new Map(), entities: new Set() });
      }

      const bucket = aggregated.get(facetKey);
      const entries = normaliseFacetEntries(rawCounts);
      for (const [label, count] of entries) {
        if (!label) {
          continue;
        }
        const trimmedLabel = label.trim();
        if (!trimmedLabel) {
          continue;
        }
        const safeCount = Number.isFinite(count) ? count : 0;
        bucket.counts.set(trimmedLabel, (bucket.counts.get(trimmedLabel) ?? 0) + safeCount);
      }

      bucket.entities.add(summary.entityType);
    }
  }

  const result = {};
  for (const [facetKey, bucket] of aggregated.entries()) {
    const sortedCounts = [...bucket.counts.entries()].sort((a, b) => b[1] - a[1]);
    result[facetKey] = {
      counts: Object.fromEntries(sortedCounts),
      entities: Array.from(bucket.entities).sort()
    };
  }
  return result;
}

function serialiseEntitySummaries(entitySummaries = []) {
  return entitySummaries.map((summary) => {
    const metadata = summary.metadata ?? {};
    const page = Number(metadata.page ?? summary.page ?? 1);
    const perPage = Number(metadata.perPage ?? summary.perPage ?? 0);
    const facets = metadata.facets && typeof metadata.facets === 'object' ? metadata.facets : {};
    const markers = Array.isArray(metadata.markers) ? metadata.markers : [];

    return {
      entityType: summary.entityType,
      totalHits: Number(summary.totalHits ?? 0),
      displayedHits: Number(summary.displayedHits ?? 0),
      processingTimeMs: Number(summary.processingTimeMs ?? 0),
      zeroResult: Boolean(summary.isZeroResult),
      page,
      perPage,
      facets,
      markers
    };
  });
}

function buildAnalyticsPayload(context) {
  const entitySummaries = Array.isArray(context?.entitySummaries) ? context.entitySummaries : [];
  const facets = aggregateFacetMetadata(entitySummaries);
  const serialisedEntities = serialiseEntitySummaries(entitySummaries);
  const totalResults = Number(context?.totalResults ?? context?.resultTotal ?? 0);
  const totalDisplayed = Number(context?.totalDisplayed ?? 0);

  return {
    searchEventId: context?.eventUuid ?? null,
    totalResults,
    totalDisplayed,
    zeroResult:
      typeof context?.isZeroResult === 'boolean'
        ? context.isZeroResult
        : serialisedEntities.every((summary) => summary.zeroResult),
    latencyMs: Number(context?.latencyMs ?? 0),
    occurredAt: context?.createdAt ?? null,
    facets,
    entities: serialisedEntities,
    filters: context?.filters ?? {},
    globalFilters: context?.globalFilters ?? {},
    sort: context?.sortPreferences ?? context?.sort ?? {}
  };
}

function buildInlineAnalyticsFromResult(result, { filters = {}, globalFilters = {}, sort = {} } = {}) {
  if (!result) {
    return null;
  }

  const entitySummaries = Object.entries(result.results ?? {}).map(([entityType, summary]) => ({
    entityType,
    totalHits: Number(summary?.totalHits ?? summary?.total ?? summary?.estimatedTotalHits ?? 0),
    displayedHits: Number(summary?.hits?.length ?? 0),
    processingTimeMs: Number(summary?.processingTimeMs ?? 0),
    isZeroResult: Number(summary?.totalHits ?? summary?.total ?? summary?.estimatedTotalHits ?? 0) === 0,
    metadata: {
      facets: summary?.facets ?? {},
      markers: summary?.markers ?? [],
      page: summary?.page ?? result.page ?? 1,
      perPage: summary?.perPage ?? result.perPage ?? 0
    }
  }));

  const facets = aggregateFacetMetadata(entitySummaries);
  const serialisedEntities = serialiseEntitySummaries(entitySummaries);
  const totalResults = serialisedEntities.reduce((acc, summary) => acc + summary.totalHits, 0);
  const totalDisplayed = serialisedEntities.reduce((acc, summary) => acc + summary.displayedHits, 0);

  return {
    searchEventId: null,
    totalResults,
    totalDisplayed,
    zeroResult: serialisedEntities.every((summary) => summary.zeroResult),
    latencyMs: 0,
    occurredAt: null,
    facets,
    entities: serialisedEntities,
    filters,
    globalFilters,
    sort
  };
}

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

const suggestionSchema = Joi.object({
  query: Joi.string().trim().min(1).required(),
  entityTypes: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().valid(...SUPPORTED_ENTITIES)).min(1),
      Joi.string().valid(...SUPPORTED_ENTITIES)
    )
    .optional(),
  limit: Joi.number().integer().min(1).max(25).default(8)
});

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

      const analyticsPayload =
        analyticsContext && analyticsContext.eventUuid
          ? buildAnalyticsPayload(analyticsContext)
          : buildInlineAnalyticsFromResult(result, {
              filters: payload.filters,
              globalFilters: payload.globalFilters,
              sort: payload.sort
            });

      return success(res, {
        data: {
          ...result,
          analytics: analyticsPayload
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

  static async suggest(req, res, next) {
    try {
      const payload = await suggestionSchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const entityTypes = Array.isArray(payload.entityTypes)
        ? payload.entityTypes
        : payload.entityTypes
          ? [payload.entityTypes]
          : undefined;

      const suggestions = await explorerSearchService.suggest({
        query: payload.query,
        entityTypes,
        limit: payload.limit
      });

      return success(res, {
        data: suggestions,
        message: 'Search suggestions generated'
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
