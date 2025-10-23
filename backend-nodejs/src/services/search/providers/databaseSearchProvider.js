import db from '../../../config/database.js';
import logger from '../../../config/logger.js';
import { env } from '../../../config/env.js';
import { recordSearchOperation } from '../../../observability/metrics.js';
import { SUPPORTED_ENTITIES, getEntityConfig } from '../entityConfig.js';

const DEFAULT_PAGE_SIZE = env.search?.defaultPageSize ?? 10;
const MAX_PAGE_SIZE = env.search?.maxPageSize ?? 50;

function safeJsonParse(value, fallback) {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normaliseEntities(entities) {
  if (!Array.isArray(entities) || !entities.length) {
    return SUPPORTED_ENTITIES;
  }
  const resolved = entities
    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
    .filter((entry) => entry && SUPPORTED_ENTITIES.includes(entry));
  return resolved.length ? resolved : SUPPORTED_ENTITIES;
}

function normalisePage(page) {
  const parsed = Number(page);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function normalisePerPage(perPage) {
  const parsed = Number(perPage);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.floor(parsed), MAX_PAGE_SIZE);
}

function normaliseFilters(filters = {}) {
  if (!filters || typeof filters !== 'object') {
    return {};
  }
  const entries = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      const sanitised = value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
        .filter((entry) => entry !== undefined && entry !== null && entry !== '');
      if (sanitised.length) {
        entries[key] = sanitised;
      }
      continue;
    }
    if (typeof value === 'object') {
      const bucket = {};
      for (const [innerKey, innerValue] of Object.entries(value)) {
        if (innerValue !== undefined && innerValue !== null && innerValue !== '') {
          bucket[innerKey] = innerValue;
        }
      }
      if (Object.keys(bucket).length) {
        entries[key] = bucket;
      }
      continue;
    }
    entries[key] = value;
  }
  return entries;
}

function buildBooleanQuery(query) {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token}*`)
    .join(' ');
}

function applyFilters(builder, filters) {
  const entries = Object.entries(filters ?? {});
  entries.forEach(([key, value]) => {
    const jsonPath = `$.${key}`;
    if (Array.isArray(value)) {
      const values = value.filter((entry) => entry !== undefined && entry !== null && entry !== '');
      if (!values.length) {
        return;
      }
      builder.andWhere((subQuery) => {
        values.forEach((candidate) => {
          subQuery.orWhereRaw('JSON_CONTAINS(JSON_EXTRACT(filters, ?), ?)', [
            jsonPath,
            JSON.stringify(candidate)
          ]);
        });
      });
      return;
    }
    if (typeof value === 'object') {
      const { min, max, equals, not } = value;
      if (min !== undefined) {
        subNumericComparison(builder, jsonPath, '>=', min);
      }
      if (max !== undefined) {
        subNumericComparison(builder, jsonPath, '<=', max);
      }
      if (equals !== undefined) {
        builder.andWhereRaw('JSON_EXTRACT(filters, ?) = ?', [jsonPath, JSON.stringify(equals)]);
      }
      if (not !== undefined) {
        builder.andWhereRaw('JSON_EXTRACT(filters, ?) != ?', [jsonPath, JSON.stringify(not)]);
      }
      return;
    }
    builder.andWhereRaw('JSON_EXTRACT(filters, ?) = ?', [jsonPath, JSON.stringify(value)]);
  });
}

function subNumericComparison(builder, path, operator, rawValue) {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) {
    return;
  }
  builder.andWhereRaw(
    `CAST(JSON_UNQUOTE(JSON_EXTRACT(filters, ?)) AS DECIMAL(18,4)) ${operator} ?`,
    [path, numeric]
  );
}

function applySort(builder, entityConfig, sortKey) {
  if (!sortKey) {
    return { applied: null };
  }
  const descriptor = entityConfig.sorts?.[sortKey];
  if (!descriptor) {
    return { applied: null };
  }
  if (descriptor.type === 'relevance') {
    builder.orderBy('relevance', descriptor.direction === 'asc' ? 'asc' : 'desc');
    builder.orderBy('updated_at', 'desc');
    return { applied: sortKey };
  }
  if (descriptor.type === 'json') {
    builder.orderByRaw(`JSON_EXTRACT(metadata, ?) ${descriptor.direction === 'asc' ? 'ASC' : 'DESC'}`, [
      descriptor.path
    ]);
    builder.orderBy('relevance', 'desc');
    builder.orderBy('updated_at', 'desc');
    return { applied: sortKey };
  }
  return { applied: null };
}

function computeFacets(rows, entityConfig) {
  const facets = {};
  const facetKeys = entityConfig.facets ?? [];
  if (!facetKeys.length || !rows.length) {
    return facets;
  }

  facetKeys.forEach((key) => {
    facets[key] = {};
  });

  rows.forEach((row) => {
    const filters = safeJsonParse(row.filters, {});
    facetKeys.forEach((key) => {
      const value = filters?.[key];
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (!entry && entry !== 0) return;
          const formatted = typeof entry === 'string' ? entry : JSON.stringify(entry);
          facets[key][formatted] = (facets[key][formatted] ?? 0) + 1;
        });
        return;
      }
      if (value || value === 0 || value === false) {
        const formatted = typeof value === 'string' ? value : JSON.stringify(value);
        facets[key][formatted] = (facets[key][formatted] ?? 0) + 1;
      }
    });
  });

  return facets;
}

function parseHitRow(row) {
  const metadata = safeJsonParse(row.metadata, {});
  const payload = metadata?.payload ?? {};
  const filters = safeJsonParse(row.filters, {});
  const media = safeJsonParse(row.media, {});
  const geo = safeJsonParse(row.geo, {});

  const hit = {
    id: payload.id ?? row.entity_id,
    entityType: row.entity_type,
    raw: payload,
    ...payload,
    filters,
    media,
    geo,
    relevance: Number(row.relevance ?? 1),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };

  if (media?.imageUrl && !hit.imageUrl) {
    hit.imageUrl = media.imageUrl;
  }
  if (media?.thumbnailUrl && !hit.thumbnailUrl) {
    hit.thumbnailUrl = media.thumbnailUrl;
  }

  return hit;
}

export class DatabaseSearchProvider {
  constructor({ dbClient = db, loggerInstance = logger.child({ module: 'database-search-provider' }) } = {}) {
    this.db = dbClient;
    this.logger = loggerInstance;
  }

  getSupportedEntities() {
    return SUPPORTED_ENTITIES;
  }

  async search({
    query = '',
    entityTypes,
    page = 1,
    perPage = DEFAULT_PAGE_SIZE,
    filters = {},
    globalFilters = {},
    sort = {},
    includeFacets = true
  } = {}) {
    const entities = normaliseEntities(entityTypes);
    const resolvedPage = normalisePage(page);
    const resolvedPerPage = normalisePerPage(perPage);
    const results = await Promise.all(
      entities.map((entity) =>
        this.searchEntity({
          entity,
          query,
          page: resolvedPage,
          perPage: resolvedPerPage,
          filters,
          globalFilters,
          sort,
          includeFacets
        })
      )
    );

    const byEntity = Object.fromEntries(results.map((entry) => [entry.entity, entry]));
    const totals = results.reduce((acc, entry) => {
      acc[entry.entity] = entry.totalHits;
      return acc;
    }, {});

    const markers = results.flatMap((entry) => entry.markers);

    return {
      query,
      page: resolvedPage,
      perPage: resolvedPerPage,
      entities,
      results: byEntity,
      totals,
      markers: {
        items: markers,
        bounds: computeBounds(markers)
      }
    };
  }

  async searchEntity({
    entity,
    query,
    page,
    perPage,
    filters,
    globalFilters,
    sort,
    includeFacets
  }) {
    const entityConfig = getEntityConfig(entity);
    if (!entityConfig) {
      throw new Error(`Unsupported search entity "${entity}"`);
    }

    const entityFilters = normaliseFilters(filters?.[entity] ?? filters ?? {});
    const mergedFilters = { ...normaliseFilters(globalFilters), ...entityFilters };
    const offset = (page - 1) * perPage;

    const booleanQuery = query ? buildBooleanQuery(query) : null;

    const baseQuery = this.db('search_documents')
      .where({ entity_type: entity })
      .select(
        'entity_type',
        'entity_id',
        'title',
        'summary',
        'filters',
        'metadata',
        'media',
        'geo',
        'created_at',
        'updated_at'
      );

    if (booleanQuery) {
      baseQuery.select(
        this.db.raw('MATCH(search_vector) AGAINST (? IN BOOLEAN MODE) AS relevance', [booleanQuery])
      );
      baseQuery.andWhere((builder) => {
        builder.whereRaw('MATCH(search_vector) AGAINST (? IN BOOLEAN MODE)', [booleanQuery]);
        builder.orWhereRaw('LOWER(search_vector) LIKE ?', [`%${query.toLowerCase()}%`]);
      });
    } else {
      baseQuery.select(this.db.raw('1 AS relevance'));
    }

    applyFilters(baseQuery, mergedFilters);

    const totalRow = await recordSearchOperation(`search.total.${entity}`, async () =>
      baseQuery.clone().clearSelect().clearOrder().count({ total: '*' }).first()
    );
    const totalHits = Number(totalRow?.total ?? 0);

    const orderedQuery = baseQuery.clone();
    const sortPreference = Array.isArray(sort) ? sort[0] : sort?.[entity] ?? sort;
    const appliedSort = applySort(orderedQuery, entityConfig, sortPreference).applied ?? null;

    if (!appliedSort) {
      orderedQuery.orderBy('relevance', 'desc');
      orderedQuery.orderBy('updated_at', 'desc');
    }

    orderedQuery.limit(perPage).offset(offset);

    const rows = await recordSearchOperation(`search.results.${entity}`, () => orderedQuery);

    const hits = rows.map(parseHitRow);
    const markers = hits
      .map((hit) => hit.geo)
      .filter((entry) => entry && typeof entry.lat === 'number' && typeof entry.lng === 'number');

    const facets = includeFacets
      ? computeFacets(
          await baseQuery
            .clone()
            .clearSelect()
            .select('filters')
            .limit(200),
          entityConfig
        )
      : {};

    return {
      entity,
      hits,
      totalHits,
      page,
      perPage,
      query,
      sort: appliedSort,
      facets,
      markers,
      processingTimeMs: 0
    };
  }
}

function computeBounds(markers) {
  if (!markers.length) {
    return null;
  }
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  markers.forEach((marker) => {
    if (typeof marker.lat !== 'number' || typeof marker.lng !== 'number') {
      return;
    }
    minLat = Math.min(minLat, marker.lat);
    maxLat = Math.max(maxLat, marker.lat);
    minLng = Math.min(minLng, marker.lng);
    maxLng = Math.max(maxLng, marker.lng);
  });
  if (
    minLat === Number.POSITIVE_INFINITY ||
    maxLat === Number.NEGATIVE_INFINITY ||
    minLng === Number.POSITIVE_INFINITY ||
    maxLng === Number.NEGATIVE_INFINITY
  ) {
    return null;
  }
  return {
    north: maxLat,
    south: minLat,
    east: maxLng,
    west: minLng
  };
}

export const __testables = {
  normaliseEntities,
  normalisePage,
  normalisePerPage,
  normaliseFilters,
  buildBooleanQuery,
  computeBounds
};

export const databaseSearchProvider = new DatabaseSearchProvider();

export default databaseSearchProvider;
