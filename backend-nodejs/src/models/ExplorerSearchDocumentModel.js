import db from '../config/database.js';

function clone(value) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return value;
  }
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return clone(fallback);
  }
  if (typeof value === 'object') {
    if (Array.isArray(fallback)) {
      return Array.isArray(value) ? [...value] : clone(fallback);
    }
    const base = fallback && typeof fallback === 'object' ? clone(fallback) : {};
    return { ...base, ...value };
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : clone(fallback);
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const base = fallback && typeof fallback === 'object' ? clone(fallback) : {};
      return { ...base, ...parsed };
    }
    return clone(fallback);
  } catch (_error) {
    return clone(fallback);
  }
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toBoolean(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  const lower = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(lower)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(lower)) {
    return false;
  }
  return null;
}

function normaliseArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
      .filter((entry) => entry !== null && entry !== undefined && entry !== '');
  }
  try {
    const parsed = JSON.parse(value);
    return normaliseArray(parsed);
  } catch (_error) {
    return String(value)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
}

function toDomain(row) {
  if (!row) {
    return null;
  }
  const tags = parseJson(row.tags, []);
  const categories = parseJson(row.categories, []);
  const languages = parseJson(row.languages, []);
  const metadata = parseJson(row.metadata, {});
  const metrics = parseJson(row.metrics, {});
  const priceAmount = toNumber(row.price_amount);
  const ratingAverage = toNumber(row.rating_average);
  const ratingCount = toNumber(row.rating_count, 0);
  const preview = {
    url: row.preview_media_url ?? null,
    type: row.preview_media_type ?? null,
    placeholder: row.preview_media_placeholder ?? null
  };
  const geo = row.geo_latitude !== null && row.geo_latitude !== undefined && row.geo_longitude !== null && row.geo_longitude !== undefined
    ? {
        latitude: toNumber(row.geo_latitude),
        longitude: toNumber(row.geo_longitude),
        country: row.geo_country ?? null
      }
    : row.geo_country
    ? { latitude: null, longitude: null, country: row.geo_country }
    : null;

  return {
    entityType: row.entity_type,
    entityId: row.entity_id,
    slug: row.slug ?? null,
    title: row.title,
    subtitle: row.subtitle ?? null,
    description: row.description ?? null,
    tags,
    categories,
    languages,
    price: row.price_currency
      ? {
          currency: row.price_currency,
          amount: priceAmount
        }
      : null,
    rating:
      ratingAverage !== null
        ? {
            average: ratingAverage,
            count: ratingCount ?? 0
          }
        : null,
    metrics,
    metadata,
    previewMedia: preview,
    geo,
    searchTerms: row.search_terms ?? '',
    popularityScore: toNumber(row.popularity_score, 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    raw: {
      priceAmount,
      priceCurrency: row.price_currency ?? null,
      ratingAverage,
      ratingCount,
      memberCount: toNumber(row.member_count, 0),
      trendScore: toNumber(row.trend_score, 0),
      enrolmentCount: toNumber(row.enrolment_count, 0),
      readingTimeMinutes: toNumber(row.reading_time_minutes, 0),
      hourlyRateAmount: toNumber(row.hourly_rate_amount),
      hourlyRateCurrency: row.hourly_rate_currency ?? null,
      responseTimeMinutes: toNumber(row.response_time_minutes),
      eventStartAt: row.event_start_at ?? null,
      eventTimezone: row.event_timezone ?? null,
      eventIsTicketed: toBoolean(row.event_is_ticketed)
    }
  };
}

function toRow(document) {
  const row = {
    entity_type: document.entityType,
    entity_id: document.entityId,
    slug: document.slug ?? null,
    title: document.title ?? '',
    subtitle: document.subtitle ?? null,
    description: document.description ?? null,
    tags: JSON.stringify(document.tags ?? []),
    categories: JSON.stringify(document.categories ?? []),
    languages: JSON.stringify(document.languages ?? []),
    price_currency: document.price?.currency ?? null,
    price_amount: document.price?.amount ?? null,
    rating_average: document.rating?.average ?? null,
    rating_count: document.rating?.count ?? null,
    member_count: document.metrics?.memberCount ?? null,
    trend_score: document.metrics?.trendScore ?? null,
    enrolment_count: document.metrics?.enrolments ?? null,
    reading_time_minutes: document.metrics?.readingTimeMinutes ?? null,
    hourly_rate_amount: document.metrics?.hourlyRateAmount ?? null,
    hourly_rate_currency: document.metrics?.hourlyRateCurrency ?? null,
    response_time_minutes: document.metrics?.responseTimeMinutes ?? null,
    event_start_at: document.metrics?.startAt ?? null,
    event_timezone: document.metadata?.timezone ?? null,
    event_is_ticketed: document.metrics?.isTicketed ?? null,
    search_terms: document.searchTerms ?? '',
    metadata: JSON.stringify(document.metadata ?? {}),
    metrics: JSON.stringify(document.metrics ?? {}),
    preview_media_url: document.previewMedia?.url ?? null,
    preview_media_type: document.previewMedia?.type ?? null,
    preview_media_placeholder: document.previewMedia?.placeholder ?? null,
    geo_latitude: document.geo?.latitude ?? null,
    geo_longitude: document.geo?.longitude ?? null,
    geo_country: document.geo?.country ?? null,
    popularity_score: document.popularityScore ?? 0
  };
  return row;
}

function buildMergePayload(row, connection) {
  const payload = {};
  for (const column of Object.keys(row)) {
    if (column === 'created_at') {
      continue;
    }
    if (column === 'updated_at') {
      payload[column] = connection.raw('CURRENT_TIMESTAMP');
      continue;
    }
    payload[column] = connection.raw(`VALUES(${column})`);
  }
  return payload;
}

export default class ExplorerSearchDocumentModel {
  static async upsertMany(documents, connection = db) {
    if (!documents?.length) {
      return 0;
    }
    const rows = documents.map((document) => ({
      ...toRow(document),
      created_at: connection.fn.now(),
      updated_at: connection.fn.now()
    }));
    const mergePayload = buildMergePayload(rows[0], connection);
    await connection('explorer_search_documents')
      .insert(rows)
      .onConflict(['entity_type', 'entity_id'])
      .merge(mergePayload);
    return rows.length;
  }

  static async deleteByEntityTypes(entityTypes, connection = db) {
    if (!entityTypes?.length) {
      return 0;
    }
    return connection('explorer_search_documents').whereIn('entity_type', entityTypes).del();
  }

  static async listByEntities(entityTypes, connection = db) {
    const query = connection('explorer_search_documents').select('*');
    if (entityTypes?.length) {
      query.whereIn('entity_type', entityTypes);
    }
    const rows = await query;
    return rows.map(toDomain);
  }

  static async suggest({ query, entityTypes, limit = 5 }, connection = db) {
    const builder = connection('explorer_search_documents')
      .select('*')
      .orderBy('popularity_score', 'desc')
      .limit(Math.max(1, Math.min(limit, 25)));

    if (entityTypes?.length) {
      builder.whereIn('entity_type', entityTypes);
    }

    const trimmedQuery = query?.trim();
    if (trimmedQuery) {
      const tokens = trimmedQuery
        .split(/[\s,]+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean);
      if (tokens.length) {
        builder.andWhere((qb) => {
          for (const token of tokens) {
            qb.andWhere('search_terms', 'like', `%${token}%`);
          }
        });
      }
    }

    const rows = await builder;
    return rows.map(toDomain);
  }

  static async countByEntity(connection = db) {
    const rows = await connection('explorer_search_documents')
      .select('entity_type')
      .count({ total: '*' })
      .groupBy('entity_type');
    return rows.reduce((acc, row) => {
      acc[row.entity_type] = Number(row.total ?? 0);
      return acc;
    }, {});
  }

  static async exportSnapshot(connection = db) {
    const rows = await connection('explorer_search_documents')
      .select('entity_type', 'entity_id', 'title', 'updated_at', 'popularity_score')
      .orderBy(['entity_type', 'entity_id']);
    return rows.map((row) => ({
      entityType: row.entity_type,
      entityId: row.entity_id,
      title: row.title,
      updatedAt: row.updated_at,
      popularityScore: toNumber(row.popularity_score, 0)
    }));
  }
}

export { toRow as explorerSearchDocumentToRow, toDomain as explorerSearchDocumentToDomain };
