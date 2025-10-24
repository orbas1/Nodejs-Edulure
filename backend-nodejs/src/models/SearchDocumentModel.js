import db from '../config/database.js';
import { describeClusterLabel, normaliseClusterKey } from '../utils/learningClusters.js';

const TABLE = 'search_documents';

const BASE_COLUMNS = [
  'id',
  'entity_type as entityType',
  'entity_id as entityId',
  'entity_public_id as entityPublicId',
  'slug',
  'title',
  'subtitle',
  'description',
  'thumbnail_url as thumbnailUrl',
  'keywords',
  'cluster_key as clusterKey',
  'metadata',
  'category',
  'level',
  'country',
  'language_codes as languageCodes',
  'tag_slugs as tagSlugs',
  'price_currency as priceCurrency',
  'price_amount_minor as priceAmountMinor',
  'rating_average as ratingAverage',
  'rating_count as ratingCount',
  'member_count as memberCount',
  'post_count as postCount',
  'completed_sessions as completedSessions',
  'response_time_minutes as responseTimeMinutes',
  'is_verified as isVerified',
  'popularity_score as popularityScore',
  'freshness_score as freshnessScore',
  'is_active as isActive',
  'published_at as publishedAt',
  'indexed_at as indexedAt',
  'refreshed_at as refreshedAt',
  'created_at as createdAt',
  'updated_at as updatedAt',
  'preview_summary as previewSummary',
  'preview_image_url as previewImageUrl',
  'preview_highlights as previewHighlights',
  'cta_links as ctaLinks',
  'badges',
  'monetisation_tag as monetisationTag'
];

const SUPPORTED_ENTITIES = ['communities', 'courses', 'ebooks', 'tutors'];

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }
  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return { ...fallback, ...parsed };
    }
  } catch (_error) {
    // ignore
  }
  return structuredClone(fallback);
}

function parseJsonArray(value, fallback = []) {
  if (value === null || value === undefined) {
    return [...fallback];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null && item !== undefined);
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item !== null && item !== undefined);
    }
  } catch (_error) {
    // ignore
  }
  return [...fallback];
}

function parseTokens(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on', 'y'].includes(normalised)) {
      return true;
    }
    if (['false', '0', 'no', 'off', 'n'].includes(normalised)) {
      return false;
    }
  }
  return false;
}

function sanitisePage(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function sanitisePerPage(value, fallback = 10) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.min(50, Math.floor(numeric));
}

function applyQueryFilter(queryBuilder, searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return;
  }
  const trimmed = searchTerm.trim();
  if (!trimmed) {
    return;
  }
  const likeTerm = `%${trimmed.toLowerCase()}%`;
  const jsonPattern = `%${trimmed}%`;
  queryBuilder.andWhere((builder) => {
    builder
      .whereRaw('LOWER(title) LIKE ?', [likeTerm])
      .orWhereRaw('LOWER(subtitle) LIKE ?', [likeTerm])
      .orWhereRaw('LOWER(description) LIKE ?', [likeTerm])
      .orWhereRaw('LOWER(slug) LIKE ?', [likeTerm])
      .orWhereRaw('LOWER(entity_id) LIKE ?', [likeTerm])
      .orWhereRaw("JSON_SEARCH(keywords, 'one', ?, NULL, '$[*]') IS NOT NULL", [jsonPattern])
      .orWhereRaw("JSON_SEARCH(metadata, 'one', ?, NULL, '$') IS NOT NULL", [jsonPattern]);
  });
}

function normaliseArrayInput(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return [];
  }
  if (Array.isArray(rawValue)) {
    return rawValue.filter((value) => value !== null && value !== undefined && value !== '');
  }
  return [rawValue];
}

function applyEqualityFilter(builder, column, rawValue) {
  const values = normaliseArrayInput(rawValue).map((value) =>
    typeof value === 'string' ? value.trim() : value
  );
  if (!values.length) {
    return;
  }
  builder.andWhere((inner) => {
    values.forEach((value, index) => {
      const method = index === 0 ? 'where' : 'orWhere';
      inner[method](column, value);
    });
  });
}

function applyTokenFilter(builder, column, rawValue) {
  const values = normaliseArrayInput(rawValue)
    .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    .filter(Boolean);
  if (!values.length) {
    return;
  }
  builder.andWhere((inner) => {
    values.forEach((value, index) => {
      const method = index === 0 ? 'whereRaw' : 'orWhereRaw';
      inner[method](`FIND_IN_SET(?, ${column}) > 0`, [value]);
    });
  });
}

function applyNumericRangeFilter(builder, column, rawValue, { scale = 1 } = {}) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return;
  }
  if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    const { min, max } = rawValue;
    if (min !== undefined && min !== null && min !== '') {
      const numericMin = Number(min) * scale;
      if (Number.isFinite(numericMin)) {
        builder.andWhere(column, '>=', Math.floor(numericMin));
      }
    }
    if (max !== undefined && max !== null && max !== '') {
      const numericMax = Number(max) * scale;
      if (Number.isFinite(numericMax)) {
        builder.andWhere(column, '<=', Math.floor(numericMax));
      }
    }
    return;
  }
  const values = normaliseArrayInput(rawValue);
  if (!values.length) {
    return;
  }
  builder.andWhere((inner) => {
    values.forEach((value, index) => {
      const numeric = Number(value) * scale;
      if (!Number.isFinite(numeric)) {
        return;
      }
      const method = index === 0 ? 'where' : 'orWhere';
      inner[method](column, Math.floor(numeric));
    });
  });
}

function applyMetadataEqualityFilter(builder, path, rawValue) {
  const values = normaliseArrayInput(rawValue)
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter((value) => value !== null && value !== undefined && value !== '');
  if (!values.length) {
    return;
  }
  builder.andWhere((inner) => {
    values.forEach((value, index) => {
      const method = index === 0 ? 'whereRaw' : 'orWhereRaw';
      inner[method]('JSON_UNQUOTE(JSON_EXTRACT(metadata, ?)) = ?', [path, value]);
    });
  });
}

function applyMetadataArrayFilter(builder, path, rawValue) {
  const values = normaliseArrayInput(rawValue)
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter(Boolean);
  if (!values.length) {
    return;
  }
  builder.andWhere((inner) => {
    values.forEach((value, index) => {
      const method = index === 0 ? 'whereRaw' : 'orWhereRaw';
      inner[method](`JSON_SEARCH(metadata, 'one', ?, NULL, ?) IS NOT NULL`, [value, path]);
    });
  });
}

function applyFilters(queryBuilder, entityType, filters = {}) {
  if (!filters || typeof filters !== 'object') {
    return;
  }
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    switch (key) {
      case 'category':
        applyEqualityFilter(queryBuilder, 'category', value);
        break;
      case 'level':
        applyEqualityFilter(queryBuilder, 'level', value);
        break;
      case 'languages':
      case 'language':
        applyTokenFilter(queryBuilder, 'language_codes', value);
        break;
      case 'tags':
      case 'topics':
      case 'skills':
        applyTokenFilter(queryBuilder, 'tag_slugs', value);
        break;
      case 'price': {
        if (value && typeof value === 'object') {
          if (value.currency !== undefined) {
            applyEqualityFilter(queryBuilder, 'price_currency', value.currency);
          }
          if (value.amount !== undefined) {
            applyNumericRangeFilter(queryBuilder, 'price_amount_minor', value.amount, { scale: 100 });
          } else {
            applyNumericRangeFilter(queryBuilder, 'price_amount_minor', value, { scale: 100 });
          }
        } else {
          applyNumericRangeFilter(queryBuilder, 'price_amount_minor', value, { scale: 100 });
        }
        break;
      }
      case 'priceCurrency':
      case 'price_currency':
        applyEqualityFilter(queryBuilder, 'price_currency', value);
        break;
      case 'priceAmount':
      case 'price_amount':
        applyNumericRangeFilter(queryBuilder, 'price_amount_minor', value, { scale: 100 });
        break;
      case 'isVerified':
      case 'verified':
        queryBuilder.andWhere('is_verified', value ? 1 : 0);
        break;
      case 'memberCount':
      case 'members':
        applyNumericRangeFilter(queryBuilder, 'member_count', value);
        break;
      case 'postCount':
        applyNumericRangeFilter(queryBuilder, 'post_count', value);
        break;
      case 'completedSessions':
        applyNumericRangeFilter(queryBuilder, 'completed_sessions', value);
        break;
      case 'responseTimeMinutes':
      case 'responseTime':
        applyNumericRangeFilter(queryBuilder, 'response_time_minutes', value);
        break;
      case 'country':
        applyEqualityFilter(queryBuilder, 'country', value);
        break;
      case 'visibility':
        applyMetadataEqualityFilter(queryBuilder, '$.visibility', value);
        break;
      case 'timezones':
        applyMetadataArrayFilter(queryBuilder, '$.timezones[*]', value);
        break;
      default:
        if (typeof value === 'object' && !Array.isArray(value)) {
          applyFilters(queryBuilder, entityType, value);
        }
        break;
    }
  }
  if (entityType === 'tutors') {
    if (filters.languages) {
      applyTokenFilter(queryBuilder, 'language_codes', filters.languages);
    }
    if (filters.skills) {
      applyTokenFilter(queryBuilder, 'tag_slugs', filters.skills);
    }
    if (filters.country) {
      applyEqualityFilter(queryBuilder, 'country', filters.country);
    }
  }
}

const SORT_MAPPING = {
  courses: {
    relevance: [
      { column: 'popularity_score', direction: 'desc' },
      { column: 'freshness_score', direction: 'desc' }
    ],
    rating: [
      { column: 'rating_average', direction: 'desc' },
      { column: 'rating_count', direction: 'desc' }
    ],
    newest: [{ column: 'published_at', direction: 'desc' }],
    priceLow: [{ column: 'price_amount_minor', direction: 'asc' }],
    priceHigh: [{ column: 'price_amount_minor', direction: 'desc' }]
  },
  communities: {
    trending: [
      { column: 'popularity_score', direction: 'desc' },
      { column: 'member_count', direction: 'desc' }
    ],
    members: [{ column: 'member_count', direction: 'desc' }],
    newest: [{ column: 'published_at', direction: 'desc' }]
  },
  ebooks: {
    relevance: [
      { column: 'popularity_score', direction: 'desc' },
      { column: 'freshness_score', direction: 'desc' }
    ],
    rating: [
      { column: 'rating_average', direction: 'desc' },
      { column: 'rating_count', direction: 'desc' }
    ],
    newest: [{ column: 'published_at', direction: 'desc' }],
    readingTime: [{ column: 'metadata->>$.readingTimeMinutes', direction: 'asc' }],
    priceLow: [{ column: 'price_amount_minor', direction: 'asc' }],
    priceHigh: [{ column: 'price_amount_minor', direction: 'desc' }]
  },
  tutors: {
    relevance: [
      { column: 'popularity_score', direction: 'desc' },
      { column: 'freshness_score', direction: 'desc' }
    ],
    rating: [
      { column: 'rating_average', direction: 'desc' },
      { column: 'rating_count', direction: 'desc' }
    ],
    priceLow: [{ column: 'price_amount_minor', direction: 'asc' }],
    priceHigh: [{ column: 'price_amount_minor', direction: 'desc' }],
    responseTime: [{ column: 'response_time_minutes', direction: 'asc' }]
  }
};

function applySort(queryBuilder, entityType, sortPreference) {
  const mapping = SORT_MAPPING[entityType] ?? {};
  const directives = Array.isArray(sortPreference)
    ? sortPreference
    : typeof sortPreference === 'string'
      ? mapping[sortPreference] || mapping.relevance
      : null;

  const resolved = directives && directives.length ? directives : mapping.relevance;
  if (!resolved) {
    queryBuilder.orderBy('updated_at', 'desc');
    return;
  }
  resolved.forEach((directive) => {
    if (typeof directive === 'string') {
      const [column, direction = 'asc'] = directive.split(':');
      queryBuilder.orderBy(column, direction);
    } else if (directive && directive.column) {
      queryBuilder.orderBy(directive.column, directive.direction ?? 'asc');
    }
  });
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  const metadata = parseJson(row.metadata, {});
  const clusterKey = normaliseClusterKey(
    row.clusterKey ?? metadata.clusterKey ?? metadata.cluster?.key ?? metadata.cluster ?? null
  );
  const clusterLabel = describeClusterLabel(clusterKey);
  metadata.clusterKey = clusterKey;
  metadata.cluster =
    metadata.cluster && typeof metadata.cluster === 'object'
      ? {
          key: metadata.cluster.key ?? clusterKey,
          label: metadata.cluster.label ?? clusterLabel
        }
      : { key: clusterKey, label: clusterLabel };
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    entityPublicId: row.entityPublicId,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? null,
    description: row.description ?? null,
    thumbnailUrl: row.thumbnailUrl ?? null,
    keywords: parseJsonArray(row.keywords, []),
    metadata,
    clusterKey,
    category: row.category ?? null,
    level: row.level ?? null,
    country: row.country ?? null,
    languageCodes: parseTokens(row.languageCodes),
    tagSlugs: parseTokens(row.tagSlugs),
    price: {
      currency: row.priceCurrency ?? 'USD',
      amountMinor: Number(row.priceAmountMinor ?? 0)
    },
    rating: {
      average: Number(row.ratingAverage ?? 0),
      count: Number(row.ratingCount ?? 0)
    },
    memberCount: Number(row.memberCount ?? 0),
    postCount: Number(row.postCount ?? 0),
    completedSessions: Number(row.completedSessions ?? 0),
    responseTimeMinutes: Number(row.responseTimeMinutes ?? 0),
    isVerified: toBoolean(row.isVerified),
    popularityScore: Number(row.popularityScore ?? 0),
    freshnessScore: Number(row.freshnessScore ?? 0),
    isActive: toBoolean(row.isActive ?? true),
    publishedAt: toDate(row.publishedAt),
    indexedAt: toDate(row.indexedAt),
    refreshedAt: toDate(row.refreshedAt),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
    previewSummary: row.previewSummary ?? null,
    previewImageUrl: row.previewImageUrl ?? null,
    previewHighlights: parseJsonArray(row.previewHighlights, []),
    ctaLinks: parseJsonArray(row.ctaLinks, []),
    badges: parseJsonArray(row.badges, []),
    monetisationTag: row.monetisationTag ?? null
  };
}

function countValues(rows, selector) {
  const counts = {};
  rows.forEach((row) => {
    const value = selector(row);
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (!entry) {
          return;
        }
        counts[entry] = (counts[entry] ?? 0) + 1;
      });
      return;
    }
    if (!value) {
      return;
    }
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return counts;
}

function buildFacets(rows, entityType) {
  if (!rows.length) {
    return {};
  }
  const facets = {};
  switch (entityType) {
    case 'courses': {
      facets.category = countValues(rows, (row) => row.category);
      facets.level = countValues(rows, (row) => row.level);
      facets.languages = countValues(rows, (row) => parseTokens(row.languageCodes));
      facets.tags = countValues(rows, (row) => parseTokens(row.tagSlugs));
      facets.priceCurrency = countValues(rows, (row) => row.priceCurrency ?? 'USD');
      break;
    }
    case 'communities': {
      facets.visibility = countValues(rows, (row) => parseJson(row.metadata, {}).visibility ?? null);
      facets.languages = countValues(rows, (row) => parseTokens(row.languageCodes));
      facets.tags = countValues(rows, (row) => parseTokens(row.tagSlugs));
      break;
    }
    case 'ebooks': {
      facets.categories = countValues(rows, (row) => parseTokens(row.tagSlugs));
      facets.languages = countValues(rows, (row) => parseTokens(row.languageCodes));
      facets.priceCurrency = countValues(rows, (row) => row.priceCurrency ?? 'USD');
      break;
    }
    case 'tutors': {
      facets.languages = countValues(rows, (row) => parseTokens(row.languageCodes));
      facets.skills = countValues(rows, (row) => parseTokens(row.tagSlugs));
      facets.country = countValues(rows, (row) => row.country ?? null);
      facets.isVerified = countValues(rows, (row) => (toBoolean(row.isVerified) ? 'true' : 'false'));
      break;
    }
    default:
      break;
  }
  return facets;
}

export default class SearchDocumentModel {
  static getSupportedEntities() {
    return [...SUPPORTED_ENTITIES];
  }

  static async search(
    entityType,
    { query, filters = {}, sort, page = 1, perPage = 12, includeFacets = true } = {},
    connection = db
  ) {
    if (!SUPPORTED_ENTITIES.includes(entityType)) {
      throw new Error(`Unsupported search entity: ${entityType}`);
    }

    const safePage = sanitisePage(page);
    const safePerPage = sanitisePerPage(perPage);
    const offset = (safePage - 1) * safePerPage;

    const executor = connection ?? db;

    const baseQuery = executor(TABLE).where('entity_type', entityType).andWhere('is_active', 1);
    applyFilters(baseQuery, entityType, filters);
    applyQueryFilter(baseQuery, query);

    const countQuery = baseQuery.clone().clearOrder().count({ total: '*' }).first();

    const rowsQuery = baseQuery.clone().select(BASE_COLUMNS);
    applySort(rowsQuery, entityType, sort);
    rowsQuery.offset(offset).limit(safePerPage);

    const facetsPromise = includeFacets
      ? baseQuery
          .clone()
          .clearSelect()
          .clearOrder()
          .select([
            'category',
            'level',
            'country',
            'language_codes as languageCodes',
            'tag_slugs as tagSlugs',
            'price_currency as priceCurrency',
            'is_verified as isVerified',
            'metadata'
          ])
          .then((rows) => buildFacets(rows, entityType))
      : Promise.resolve({});

    const startTime = Date.now();
    const [rows, totalRow, facets] = await Promise.all([rowsQuery, countQuery, facetsPromise]);
    const processingTimeMs = Date.now() - startTime;

    const hits = rows.map((row) => deserialize(row));
    const total = Number(totalRow?.total ?? 0);

    return {
      entityType,
      hits,
      total,
      page: safePage,
      perPage: safePerPage,
      facets,
      processingTimeMs
    };
  }
}

export { SUPPORTED_ENTITIES };
