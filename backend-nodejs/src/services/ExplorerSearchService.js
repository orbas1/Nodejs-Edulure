import db from '../config/database.js';
import logger from '../config/logger.js';
import searchConfiguration from '../config/search.js';
import { buildBounds, resolveCountryCoordinates } from '../utils/geo.js';
import AdsPlacementService from './AdsPlacementService.js';

const ENTITY_CONFIG = {
  communities: {
    facets: ['visibility', 'category', 'languages', 'country', 'tags'],
    filters: {
      visibility: { path: 'visibility', type: 'string' },
      category: { path: 'category', type: 'string' },
      timezone: { path: 'timezone', type: 'string' },
      languages: { path: 'languages', type: 'array' },
      country: { path: 'country', type: 'string' },
      tags: { path: 'tags', type: 'array' }
    },
    sorts: {
      trending: { expression: "(d.metadata->>'trendScore')::numeric", direction: 'desc', nulls: 'last' },
      members: { expression: "(d.metadata->>'memberCount')::numeric", direction: 'desc', nulls: 'last' },
      newest: { expression: 'd.updated_at', direction: 'desc' }
    },
    defaultSort: 'trending'
  },
  courses: {
    facets: ['category', 'level', 'deliveryFormat', 'languages', 'tags'],
    filters: {
      level: { path: 'level', type: 'string' },
      category: { path: 'category', type: 'string' },
      deliveryFormat: { path: 'deliveryFormat', type: 'string' },
      languages: { path: 'languages', type: 'array' },
      skills: { path: 'skills', type: 'array' },
      tags: { path: 'tags', type: 'array' },
      'price.currency': { path: 'price.currency', type: 'string' },
      'price.amount': { path: 'price.amount', type: 'range' }
    },
    sorts: {
      relevance: { type: 'rank' },
      rating: { expression: "(d.metadata->'rating'->>'average')::numeric", direction: 'desc', nulls: 'last' },
      newest: {
        expression: "COALESCE((d.metadata->>'releaseAt')::timestamptz, d.updated_at)",
        direction: 'desc',
        nulls: 'last'
      },
      priceLow: { expression: "(d.filters->>'price.amount')::numeric", direction: 'asc', nulls: 'last' },
      priceHigh: { expression: "(d.filters->>'price.amount')::numeric", direction: 'desc', nulls: 'last' }
    },
    defaultSort: 'relevance'
  },
  ebooks: {
    facets: ['categories', 'languages', 'tags'],
    filters: {
      categories: { path: 'categories', type: 'array' },
      languages: { path: 'languages', type: 'array' },
      tags: { path: 'tags', type: 'array' }
    },
    sorts: {
      relevance: { type: 'rank' },
      rating: { expression: "(d.metadata->'rating'->>'average')::numeric", direction: 'desc', nulls: 'last' },
      newest: { expression: 'd.updated_at', direction: 'desc' },
      readingTime: { expression: "(d.metadata->>'readingTimeMinutes')::numeric", direction: 'asc', nulls: 'last' }
    },
    defaultSort: 'relevance'
  },
  tutors: {
    facets: ['languages', 'skills', 'country', 'isVerified'],
    filters: {
      languages: { path: 'languages', type: 'array' },
      skills: { path: 'skills', type: 'array' },
      country: { path: 'country', type: 'string' },
      isVerified: { path: 'isVerified', type: 'boolean' },
      'hourlyRate.amount': { path: 'hourlyRate.amount', type: 'range' }
    },
    sorts: {
      relevance: { type: 'rank' },
      rating: { expression: "(d.metadata->'rating'->>'average')::numeric", direction: 'desc', nulls: 'last' },
      priceLow: { expression: "(d.filters->>'hourlyRate.amount')::numeric", direction: 'asc', nulls: 'last' },
      priceHigh: { expression: "(d.filters->>'hourlyRate.amount')::numeric", direction: 'desc', nulls: 'last' },
      responseTime: { expression: "(d.metadata->>'responseTimeMinutes')::numeric", direction: 'asc', nulls: 'last' }
    },
    defaultSort: 'relevance'
  },
  ads: {
    facets: ['objective', 'status'],
    filters: {
      objective: { path: 'objective', type: 'string' },
      status: { path: 'status', type: 'string' }
    },
    sorts: {
      performance: { expression: "(d.metadata->>'performanceScore')::numeric", direction: 'desc', nulls: 'last' },
      spend: { expression: "(d.metadata->'spend'->>'amount')::numeric", direction: 'desc', nulls: 'last' },
      newest: { expression: 'd.updated_at', direction: 'desc' }
    },
    defaultSort: 'performance'
  },
  events: {
    facets: ['status', 'visibility', 'timezone'],
    filters: {
      status: { path: 'status', type: 'string' },
      visibility: { path: 'visibility', type: 'string' },
      timezone: { path: 'timezone', type: 'string' }
    },
    sorts: {
      upcoming: {
        expression: "COALESCE((d.metadata->>'startAt')::timestamptz, d.updated_at)",
        direction: 'asc',
        nulls: 'last'
      },
      newest: { expression: 'd.updated_at', direction: 'desc' }
    },
    defaultSort: 'upcoming'
  },
  tickets: {
    facets: ['category', 'priority', 'status', 'channel'],
    filters: {
      category: { path: 'category', type: 'string' },
      priority: { path: 'priority', type: 'string' },
      status: { path: 'status', type: 'string' },
      channel: { path: 'channel', type: 'string' }
    },
    sorts: {
      newest: { expression: 'd.updated_at', direction: 'desc' }
    },
    defaultSort: 'newest'
  }
};

const SUPPORTED_ENTITIES = Object.keys(ENTITY_CONFIG);

function sanitiseArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter((value) => typeof value === 'string' && value.length > 0);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatCurrency(value) {
  if (!value || !isFiniteNumber(value.amount)) {
    return null;
  }
  const currency = value.currency ?? 'USD';
  const amount = Number(value.amount);
  const normalised = amount >= 100 ? amount / 100 : amount;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: normalised >= 100 ? 0 : 2
    }).format(normalised);
  } catch (_error) {
    return `${currency} ${normalised}`;
  }
}

function formatNumber(value) {
  if (!isFiniteNumber(value)) {
    return null;
  }
  return new Intl.NumberFormat('en-US').format(value);
}

function formatRating(rating) {
  if (!rating || !isFiniteNumber(rating.average)) {
    return null;
  }
  const average = Number(rating.average).toFixed(1);
  const count = rating.count ? ` · ${formatNumber(Number(rating.count))} ratings` : '';
  return `${average}★${count}`;
}

function deriveGeo(entity, hit) {
  if (!hit) {
    return null;
  }
  const meta = hit.metadata ?? {};
  const filters = hit.filters ?? {};

  const resolveCountry = () => {
    if (typeof meta.country === 'string' && meta.country) return meta.country;
    const filterCountry = filters.country;
    if (typeof filterCountry === 'string' && filterCountry) return filterCountry;
    if (Array.isArray(filterCountry) && filterCountry.length > 0) {
      return filterCountry[0];
    }
    if (typeof meta.communityCountry === 'string' && meta.communityCountry) {
      return meta.communityCountry;
    }
    return null;
  };

  if (entity === 'communities') {
    const country = resolveCountry();
    const resolved = resolveCountryCoordinates(country);
    if (resolved) {
      return {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        label: hit.title,
        country: resolved.code,
        context: 'community'
      };
    }
  }

  if (entity === 'tutors') {
    const country = resolveCountry();
    const resolved = resolveCountryCoordinates(country);
    if (resolved) {
      return {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        label: hit.title,
        country: resolved.code,
        context: 'tutor'
      };
    }
  }

  if (entity === 'events') {
    const country = meta.communityCountry ?? resolveCountry();
    const resolved = resolveCountryCoordinates(country);
    if (resolved) {
      return {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        label: hit.title,
        country: resolved.code,
        context: 'event'
      };
    }
  }

  return null;
}

function formatHit(entity, hit) {
  const meta = hit.metadata ?? {};
  const media = hit.media ?? {};
  const filters = hit.filters ?? {};
  const tags = Array.isArray(hit.tags) ? hit.tags : [];
  const geoSource = { ...hit, metadata: meta, filters };

  const base = {
    id: hit.id,
    entityType: entity,
    raw: hit
  };

  const pickImage = (...keys) => {
    for (const key of keys) {
      if (!key) continue;
      if (typeof media[key] === 'string' && media[key]) {
        return media[key];
      }
      if (typeof meta[key] === 'string' && meta[key]) {
        return meta[key];
      }
      if (typeof hit[key] === 'string' && hit[key]) {
        return hit[key];
      }
    }
    return null;
  };

  base.imageUrl = pickImage('coverImageUrl', 'thumbnailUrl', 'heroImageUrl', 'avatarUrl');

  switch (entity) {
    case 'communities': {
      base.title = hit.title;
      base.subtitle = hit.subtitle ?? meta.tagline ?? null;
      base.description = hit.summary ?? hit.description ?? null;
      const communityTags = sanitiseArray(tags);
      base.tags = communityTags;
      base.metrics = {
        members: meta.memberCount ? formatNumber(Number(meta.memberCount)) : null,
        trendScore: meta.trendScore ? Number(meta.trendScore) : null
      };
      base.actions = [{ label: 'View community', href: `/communities/${hit.slug ?? hit.id}` }];
      base.geo = deriveGeo(entity, geoSource);
      return base;
    }
    case 'courses': {
      const price = meta.price ?? { amount: filters['price.amount'], currency: filters['price.currency'] };
      base.title = hit.title;
      base.subtitle = [meta.level, formatCurrency(price), formatRating(meta.rating)]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.summary ?? hit.description ?? null;
      const skills = sanitiseArray(meta.skills ?? tags);
      base.tags = skills;
      base.metrics = {
        enrolments: meta.enrolmentCount ? formatNumber(Number(meta.enrolmentCount)) : null,
        releaseAt: meta.releaseAt ?? null
      };
      base.actions = [{ label: 'View course', href: `/courses/${hit.slug ?? hit.id}` }];
      base.geo = null;
      return base;
    }
    case 'ebooks': {
      base.title = hit.title;
      base.subtitle = [formatCurrency(meta.price), formatRating(meta.rating)]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.summary ?? hit.description ?? null;
      base.tags = sanitiseArray(tags);
      base.metrics = {
        readingTimeMinutes: meta.readingTimeMinutes ? Number(meta.readingTimeMinutes) : null
      };
      base.actions = [{ label: 'Open ebook', href: `/ebooks/${hit.slug ?? hit.id}` }];
      base.geo = null;
      return base;
    }
    case 'tutors': {
      const hourly = meta.hourlyRate ?? {
        amount: filters['hourlyRate.amount'],
        currency: filters['hourlyRate.currency']
      };
      base.title = hit.title;
      base.subtitle = [hit.subtitle, formatCurrency(hourly), formatRating(meta.rating)]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.summary ?? hit.description ?? null;
      base.tags = sanitiseArray(filters.skills ?? tags);
      base.metrics = {
        completedSessions: meta.completedSessions ? formatNumber(Number(meta.completedSessions)) : null,
        responseTimeMinutes: meta.responseTimeMinutes ? Number(meta.responseTimeMinutes) : null
      };
      base.actions = [{ label: 'Hire tutor', href: `/tutors/${hit.id}` }];
      base.geo = deriveGeo(entity, geoSource);
      return base;
    }
    case 'ads': {
      base.title = hit.title;
      base.subtitle = [hit.subtitle, `${meta.ctr ? Number(meta.ctr).toFixed(2) : '0.00'}% CTR`]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.summary ?? hit.description ?? null;
      base.tags = sanitiseArray(tags);
      base.metrics = {
        performanceScore: meta.performanceScore ? Number(meta.performanceScore) : null,
        spendTotal: meta.spend ? formatCurrency({ currency: meta.spend.currency, amount: meta.spend.amount }) : null
      };
      base.actions = [{ label: 'Open campaign', href: `/ads/${hit.slug ?? hit.id}` }];
      base.geo = null;
      return base;
    }
    case 'events': {
      base.title = hit.title;
      base.subtitle = [hit.subtitle, meta.status, meta.timezone].filter(Boolean).join(' · ');
      base.description = hit.summary ?? hit.description ?? null;
      base.tags = sanitiseArray(tags);
      base.metrics = {
        startAt: meta.startAt ?? null,
        attendance: meta.attendance ?? null
      };
      base.actions = [{ label: 'View event', href: `/events/${hit.slug ?? hit.id}` }];
      base.geo = deriveGeo(entity, geoSource);
      return base;
    }
    case 'tickets': {
      base.title = hit.title;
      base.subtitle = [filters.priority, filters.status].filter(Boolean).join(' · ');
      base.description = hit.summary ?? hit.description ?? null;
      base.tags = sanitiseArray(tags);
      base.metrics = {
        channel: filters.channel ?? null
      };
      base.actions = [{ label: 'View ticket', href: `/support/tickets/${hit.slug ?? hit.id}` }];
      base.geo = null;
      return base;
    }
    default:
      base.title = hit.title ?? `Result ${hit.id}`;
      base.description = hit.summary ?? hit.description ?? null;
      base.tags = sanitiseArray(tags);
      base.geo = null;
      return base;
  }
}

export class ExplorerSearchService {
  constructor({ dbClient = db, loggerInstance = logger, configuration = searchConfiguration } = {}) {
    this.db = dbClient;
    this.logger = loggerInstance.child({ module: 'explorer-search' });
    this.schema = configuration.schema ?? 'search';
    this.dictionary = configuration.dictionary ?? 'simple';
    this.maxPerPage = configuration.maxPerPage ?? 50;
    this.facetMaxBuckets = configuration.facetMaxBuckets ?? 25;
  }

  getSupportedEntities() {
    return SUPPORTED_ENTITIES;
  }

  normaliseEntityTypes(entities) {
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return SUPPORTED_ENTITIES;
    }
    const filtered = entities
      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
      .filter((entry) => entry && SUPPORTED_ENTITIES.includes(entry));
    return filtered.length ? filtered : SUPPORTED_ENTITIES;
  }

  createBaseQuery(entity) {
    return this.db.withSchema(this.schema).from({ d: 'documents' }).where('d.entity_type', entity);
  }

  applySearchTerm(query, searchTerm, { includeRank = true } = {}) {
    const term = typeof searchTerm === 'string' ? searchTerm.trim() : '';
    if (!term) {
      if (includeRank) {
        query.select(this.db.raw('1.0 as rank'));
      }
      return false;
    }
    query.whereRaw('d.search_vector @@ websearch_to_tsquery(?, ?)', [this.dictionary, term]);
    if (includeRank) {
      query.select(
        this.db.raw('ts_rank_cd(d.search_vector, websearch_to_tsquery(?, ?)) as rank', [this.dictionary, term])
      );
    }
    return true;
  }

  resolveFilters(entity, filters = {}, globalFilters = {}) {
    const entityFilters = typeof filters === 'object' && !Array.isArray(filters) ? filters[entity] ?? filters : {};
    const global = typeof globalFilters === 'object' && !Array.isArray(globalFilters)
      ? globalFilters[entity] ?? globalFilters
      : {};
    return { ...global, ...entityFilters };
  }

  applyFilters(query, entity, filters = {}, globalFilters = {}) {
    const config = ENTITY_CONFIG[entity];
    if (!config) {
      return;
    }

    const resolved = this.resolveFilters(entity, filters, globalFilters);
    for (const [rawKey, rawValue] of Object.entries(resolved)) {
      if (rawValue === null || rawValue === undefined || rawValue === '' || rawValue === false) {
        continue;
      }
      const definition = config.filters?.[rawKey] ?? { path: rawKey };
      this.applyFilterCondition(query, definition.path ?? rawKey, rawValue, definition.type ?? 'string');
    }
  }

  applyFilterCondition(query, path, value, type) {
    if (Array.isArray(value) || type === 'array') {
      const values = Array.isArray(value) ? value : [value];
      const cleaned = sanitiseArray(values);
      if (!cleaned.length) {
        return;
      }
      query.whereRaw(
        `EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(d.filters -> ?, '[]'::jsonb)) AS f(value) WHERE f.value = ANY(?::text[]))`,
        [path, cleaned]
      );
      return;
    }

    if (type === 'range' && typeof value === 'object') {
      const { min, max } = value;
      if (min !== null && min !== undefined) {
        query.whereRaw("(d.filters ->> ?)::numeric >= ?", [path, min]);
      }
      if (max !== null && max !== undefined) {
        query.whereRaw("(d.filters ->> ?)::numeric <= ?", [path, max]);
      }
      return;
    }

    if (type === 'boolean') {
      const boolValue = typeof value === 'boolean' ? value : value === 'true' || value === '1';
      query.whereRaw('(d.filters ->> ?)::boolean = ?', [path, boolValue]);
      return;
    }

    query.whereRaw('d.filters ->> ? = ?', [path, value]);
  }

  applySort(query, entity, sortPreference, hasQuery) {
    const config = ENTITY_CONFIG[entity];
    if (!config) {
      query.orderBy('d.updated_at', 'desc');
      return;
    }

    let sortKey = null;
    if (typeof sortPreference === 'string' && config.sorts?.[sortPreference]) {
      sortKey = sortPreference;
    } else if (typeof sortPreference === 'object' && sortPreference?.[entity]) {
      sortKey = sortPreference[entity];
    }

    if (!sortKey || !config.sorts?.[sortKey]) {
      sortKey = config.defaultSort;
    }

    const descriptor = config.sorts?.[sortKey];
    if (descriptor?.type === 'rank') {
      query.orderByRaw('rank DESC');
    } else if (descriptor?.expression) {
      const direction = (descriptor.direction ?? 'asc').toUpperCase();
      const nulls = descriptor.nulls ? ` NULLS ${descriptor.nulls.toUpperCase()}` : '';
      query.orderByRaw(`${descriptor.expression} ${direction}${nulls}`);
      if (hasQuery) {
        query.orderByRaw('rank DESC');
      }
    }

    query.orderBy('d.updated_at', 'desc');
  }

  async computeFacets(baseQuery, entity, facets) {
    if (!facets || facets.length === 0) {
      return {};
    }

    const sql = baseQuery.clone().clearSelect().clearOrder().select('d.filters').toSQL();
    const facetResults = {};

    for (const facet of facets) {
      const rows = await this.db
        .with('base', this.db.raw(sql.sql, sql.bindings))
        .select(this.db.raw('value, COUNT(*)::int as count'))
        .from(
          this.db.raw(
            `SELECT CASE
               WHEN jsonb_typeof(filters -> ?) = 'array'
                 THEN jsonb_array_elements_text(filters -> ?)
               ELSE filters ->> ?
             END AS value
             FROM base`,
            [facet, facet, facet]
          )
        )
        .whereNotNull('value')
        .andWhereRaw("value <> ''")
        .groupBy('value')
        .orderBy('count', 'desc')
        .limit(this.facetMaxBuckets);

      facetResults[facet] = Object.fromEntries(rows.map((row) => [row.value, Number(row.count)]));
    }

    return facetResults;
  }

  async searchEntity(entity, { query, page, perPage, filters, globalFilters, sort, includeFacets }) {
    const config = ENTITY_CONFIG[entity];
    if (!config) {
      throw new Error(`Explorer search entity "${entity}" is not configured`);
    }

    const effectivePerPage = Math.min(Math.max(perPage, 1), this.maxPerPage);
    const offset = (page - 1) * effectivePerPage;

    const dataQuery = this.createBaseQuery(entity);
    const countQuery = this.createBaseQuery(entity);
    const facetsQuery = this.createBaseQuery(entity);

    const hasQuery = this.applySearchTerm(dataQuery, query);
    this.applySearchTerm(countQuery, query, { includeRank: false });
    this.applySearchTerm(facetsQuery, query, { includeRank: false });

    this.applyFilters(dataQuery, entity, filters, globalFilters);
    this.applyFilters(countQuery, entity, filters, globalFilters);
    this.applyFilters(facetsQuery, entity, filters, globalFilters);

    this.applySort(dataQuery, entity, sort, hasQuery);

    dataQuery
      .select({
        id: 'd.entity_id',
        slug: 'd.slug',
        title: 'd.title',
        subtitle: 'd.subtitle',
        summary: 'd.summary',
        description: 'd.description',
        tags: 'd.tags',
        filters: 'd.filters',
        metadata: 'd.metadata',
        media: 'd.media',
        updatedAt: 'd.updated_at'
      })
      .offset(offset)
      .limit(effectivePerPage);

    const [rows, countResult, facets] = await Promise.all([
      dataQuery,
      countQuery.clearSelect().clearOrder().count({ total: '*' }).first(),
      includeFacets ? this.computeFacets(facetsQuery, entity, config.facets) : Promise.resolve({})
    ]);

    const totalHits = Number(countResult?.total ?? 0);

    const mappedRows = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      summary: row.summary,
      description: row.description,
      tags: Array.isArray(row.tags) ? row.tags : [],
      filters: row.filters ?? {},
      metadata: row.metadata ?? {},
      media: row.media ?? {},
      updatedAt: row.updatedAt ?? row.updated_at ?? null,
      rank: row.rank ?? null
    }));

    const hits = mappedRows.map((row) => formatHit(entity, row));
    const markers = hits.map((hit) => hit.geo).filter(Boolean);

    return {
      entity,
      hits,
      rawHits: mappedRows,
      totalHits,
      processingTimeMs: 0,
      query,
      page,
      perPage: effectivePerPage,
      sort,
      facets,
      markers
    };
  }

  async search({
    query,
    entityTypes,
    page = 1,
    perPage = 10,
    filters = {},
    globalFilters = {},
    sort = {},
    includeFacets = true
  } = {}) {
    const resolvedEntities = this.normaliseEntityTypes(entityTypes);
    const tasks = resolvedEntities.map((entity) =>
      this.searchEntity(entity, { query, page, perPage, filters, globalFilters, sort, includeFacets })
    );

    const results = await Promise.all(tasks);
    const byEntity = Object.fromEntries(results.map((result) => [result.entity, result]));
    const allMarkers = results.flatMap((result) => result.markers);
    const bounds = buildBounds(allMarkers);

    const adsPlacements = await AdsPlacementService.placementsForSearch({
      query,
      entities: resolvedEntities
    });

    return {
      query,
      page,
      perPage,
      entities: resolvedEntities,
      results: byEntity,
      totals: resolvedEntities.reduce((acc, entity) => {
        acc[entity] = byEntity[entity]?.totalHits ?? 0;
        return acc;
      }, {}),
      markers: {
        items: allMarkers,
        bounds
      },
      adsPlacements
    };
  }
}

export const explorerSearchService = new ExplorerSearchService();

export default explorerSearchService;
