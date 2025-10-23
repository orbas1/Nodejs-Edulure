import logger from '../config/logger.js';
import ExplorerSearchEventModel from '../models/ExplorerSearchEventModel.js';
import ExplorerSearchDailyMetricModel from '../models/ExplorerSearchDailyMetricModel.js';
import savedSearchService from './SavedSearchService.js';

function normaliseDateDaysAgo(days) {
  const count = Number.isFinite(days) ? Number(days) : 14;
  const base = new Date();
  base.setUTCDate(base.getUTCDate() - Math.max(0, Math.floor(count)));
  return base;
}

function attachPreviewFromPool(previewPool, entityTypes = []) {
  if (!previewPool?.size) {
    return null;
  }
  const list = Array.isArray(entityTypes) ? entityTypes : [];
  for (const type of list) {
    const previews = previewPool.get(type);
    if (previews?.length) {
      return previews[0];
    }
  }
  const aggregate = previewPool.get('all');
  return aggregate?.length ? aggregate[0] : null;
}

function serialisePreview(preview, entityType) {
  if (!preview) {
    return null;
  }
  const id =
    preview.id ??
    preview.entityId ??
    preview.entity_id ??
    preview.entityPublicId ??
    preview.entity_public_id ??
    preview.slug ??
    null;
  const title = preview.title ?? preview.label ?? null;
  if (!title) {
    return null;
  }
  return {
    id: id != null ? String(id) : null,
    title,
    subtitle: preview.subtitle ?? null,
    thumbnailUrl: preview.thumbnailUrl ?? preview.previewImageUrl ?? null,
    monetisationTag: preview.monetisationTag ?? null,
    ratingAverage: preview.ratingAverage ?? preview.rating?.average ?? null,
    ratingCount: preview.ratingCount ?? preview.rating?.count ?? null,
    priceCurrency: preview.priceCurrency ?? preview.price?.currency ?? null,
    priceAmountMinor: preview.priceAmountMinor ?? preview.price?.amountMinor ?? null,
    badges: Array.isArray(preview.badges) ? preview.badges : [],
    entityType: entityType ?? preview.entityType ?? null
  };
}

export class SearchSuggestionService {
  constructor({
    savedSearchServiceInstance = savedSearchService,
    eventModel = ExplorerSearchEventModel,
    metricModel = ExplorerSearchDailyMetricModel,
    loggerInstance = logger
  } = {}) {
    this.savedSearchService = savedSearchServiceInstance;
    this.eventModel = eventModel;
    this.metricModel = metricModel;
    this.logger = loggerInstance.child({ service: 'SearchSuggestionService' });
  }

  async loadPreviewPool({ since, limit }) {
    try {
      const digests = await this.metricModel.listPreviewDigests({ since, limit });
      const pool = new Map();
      for (const entry of digests) {
        const entityType = entry.entityType ?? entry.digest?.entityType ?? 'all';
        if (!pool.has(entityType)) {
          pool.set(entityType, []);
        }
        pool.get(entityType).push(serialisePreview(entry.digest, entityType));
      }
      return pool;
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to load preview digests for search suggestions');
      return new Map();
    }
  }

  async buildSavedSearchSuggestions({ userId, limit, previewPool }) {
    if (!userId) {
      return [];
    }
    try {
      const searches = await this.savedSearchService.list(userId);
      const sorted = [...searches].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return bTime - aTime;
      });
      return sorted.slice(0, limit).map((search) => ({
        id: `saved:${search.id}`,
        type: 'saved-search',
        label: search.name,
        query: search.query ?? '',
        entityTypes: search.entityTypes ?? [],
        metadata: {
          lastUsedAt: search.lastUsedAt ?? null,
          isPinned: Boolean(search.isPinned)
        },
        preview: serialisePreview(attachPreviewFromPool(previewPool, search.entityTypes), search.entityTypes?.[0] ?? null)
      }));
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to load saved search suggestions');
      return [];
    }
  }

  async buildTrendingQuerySuggestions({ since, limit, previewPool }) {
    try {
      const queries = await this.eventModel.topQueries({ since, limit: limit * 2 });
      return queries.slice(0, limit).map((item) => ({
        id: `trend:${item.query}`,
        type: 'trending-query',
        label: item.query,
        query: item.query,
        entityTypes: [],
        metadata: {
          searches: Number(item.searches ?? 0)
        },
        preview: serialisePreview(attachPreviewFromPool(previewPool, ['all']), 'all')
      }));
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to load trending search suggestions');
      return [];
    }
  }

  async buildPreviewSuggestions({ since, limit, previewPool }) {
    const suggestions = [];
    for (const [entityType, previews] of previewPool.entries()) {
      if (entityType === 'all') {
        continue;
      }
      for (const preview of previews.slice(0, 3)) {
        if (!preview) {
          continue;
        }
        suggestions.push({
          id: `digest:${entityType}:${preview.id ?? preview.title}`,
          type: 'entity-preview',
          label: preview.title,
          query: preview.title ?? '',
          entityTypes: [entityType],
          metadata: {
            entityType
          },
          preview: serialisePreview(preview, entityType),
          target: {
            entityType,
            entityId: preview.id ?? null
          }
        });
        if (suggestions.length >= limit) {
          return suggestions;
        }
      }
    }
    return suggestions.slice(0, limit);
  }

  async getSuggestions({ userId, limit = 12, sinceDays = 14 } = {}) {
    const since = normaliseDateDaysAgo(sinceDays);
    const previewPool = await this.loadPreviewPool({ since, limit: limit * 3 });

    const suggestions = [];
    const saved = await this.buildSavedSearchSuggestions({ userId, limit, previewPool });
    suggestions.push(...saved);

    if (suggestions.length < limit) {
      const trending = await this.buildTrendingQuerySuggestions({
        since,
        limit: limit - suggestions.length,
        previewPool
      });
      suggestions.push(...trending);
    }

    if (suggestions.length < limit) {
      const previewSuggestions = await this.buildPreviewSuggestions({
        since,
        limit: limit - suggestions.length,
        previewPool
      });
      suggestions.push(...previewSuggestions);
    }

    return suggestions.slice(0, limit);
  }
}

const searchSuggestionService = new SearchSuggestionService();

export default searchSuggestionService;
