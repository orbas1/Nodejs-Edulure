import logger from '../config/logger.js';
import { buildBounds, resolveCountryCoordinates } from '../utils/geo.js';
import AdsPlacementService from './AdsPlacementService.js';
import SearchDocumentModel, { SUPPORTED_ENTITIES as MODEL_SUPPORTED_ENTITIES } from '../models/SearchDocumentModel.js';

const ENTITY_CONFIG = {
  communities: {
    defaultSort: 'trending'
  },
  courses: {
    defaultSort: 'relevance'
  },
  ebooks: {
    defaultSort: 'relevance'
  },
  tutors: {
    defaultSort: 'relevance'
  }
};

function formatCurrency(price) {
  if (!price || !Number.isFinite(price.amountMinor)) {
    return null;
  }
  const currency = price.currency ?? 'USD';
  const amount = price.amountMinor / 100;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2
  });
  return formatter.format(amount);
}

function formatNumber(value) {
  if (!Number.isFinite(Number(value))) {
    return null;
  }
  return new Intl.NumberFormat('en-US').format(Number(value));
}

function formatRating(rating) {
  if (!rating || !Number.isFinite(rating.average)) {
    return null;
  }
  const average = Number(rating.average).toFixed(1);
  const count = Number.isFinite(rating.count) && rating.count > 0 ? ` · ${formatNumber(rating.count)} ratings` : '';
  return `${average}★${count}`;
}

function sanitiseArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set();
  const output = [];
  values.forEach((value) => {
    if (!value) {
      return;
    }
    const entry = typeof value === 'string' ? value.trim() : value;
    if (!entry || seen.has(entry)) {
      return;
    }
    seen.add(entry);
    output.push(entry);
  });
  return output;
}

function deriveGeo(entity, hit) {
  const candidate = hit.metadata?.geo ?? hit.metadata?.location ?? {};
  if (Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude)) {
    return {
      latitude: Number(candidate.latitude),
      longitude: Number(candidate.longitude),
      label: hit.title,
      entity
    };
  }
  const country = hit.country ?? hit.metadata?.country ?? null;
  if (!country) {
    return null;
  }
  const coordinates = resolveCountryCoordinates(country);
  if (!coordinates) {
    return null;
  }
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    label: hit.title,
    entity
  };
}

function formatDocument(entity, hit) {
  const base = {
    id: hit.entityId,
    entityType: entity,
    entityId: hit.entityId,
    title: hit.title ?? hit.metadata?.title ?? null,
    subtitle: hit.subtitle ?? null,
    description: hit.description ?? null,
    thumbnailUrl: hit.thumbnailUrl ?? hit.metadata?.thumbnailUrl ?? null,
    keywords: hit.keywords ?? [],
    metadata: hit.metadata ?? {},
    popularityScore: hit.popularityScore,
    freshnessScore: hit.freshnessScore,
    slug: hit.slug ?? null,
    publishedAt: hit.publishedAt,
    raw: hit,
    url: null,
    actions: [],
    tags: [],
    metrics: {},
    geo: null
  };

  switch (entity) {
    case 'communities': {
      base.title = hit.metadata?.name ?? hit.title;
      base.subtitle = [hit.metadata?.visibility ?? null, formatNumber(hit.memberCount) && `${formatNumber(hit.memberCount)} members`]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.description ?? hit.metadata?.summary ?? null;
      base.tags = sanitiseArray([hit.category, ...(hit.metadata?.topics ?? []), ...(hit.metadata?.tags ?? [])]);
      base.metrics = {
        members: formatNumber(hit.memberCount),
        posts: formatNumber(hit.postCount)
      };
      base.actions = [{ label: 'View community', href: `/communities/${hit.slug ?? hit.entityId}` }];
      base.url = `/communities/${hit.slug ?? hit.entityId}`;
      base.geo = deriveGeo(entity, hit);
      return base;
    }
    case 'courses': {
      base.subtitle = [hit.level, formatCurrency(hit.price), formatRating(hit.rating)]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.description ?? hit.metadata?.summary ?? null;
      base.tags = sanitiseArray(hit.metadata?.tags ?? []);
      base.metrics = {
        enrolments: formatNumber(hit.metadata?.enrolmentCount ?? hit.metadata?.enrolment_count),
        releaseAt: hit.metadata?.releaseAt ?? hit.publishedAt
      };
      base.actions = [{ label: 'View course', href: `/courses/${hit.slug ?? hit.entityId}` }];
      base.url = `/courses/${hit.slug ?? hit.entityId}`;
      return base;
    }
    case 'ebooks': {
      base.subtitle = [formatCurrency(hit.price), formatRating(hit.rating)]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.description ?? hit.metadata?.description ?? null;
      base.tags = sanitiseArray(hit.metadata?.tags ?? hit.metadata?.categories ?? []);
      base.metrics = {
        readingTimeMinutes: hit.metadata?.readingTimeMinutes
      };
      base.actions = [{ label: 'Open ebook', href: `/ebooks/${hit.slug ?? hit.entityId}` }];
      base.url = `/ebooks/${hit.slug ?? hit.entityId}`;
      return base;
    }
    case 'tutors': {
      base.title = hit.metadata?.displayName ?? hit.title;
      base.subtitle = [
        hit.metadata?.headline ?? hit.subtitle,
        formatCurrency(hit.price),
        formatRating(hit.rating),
        hit.isVerified ? 'Verified' : null
      ]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.description ?? hit.metadata?.bio ?? null;
      base.tags = sanitiseArray(hit.metadata?.skills ?? []);
      base.metrics = {
        completedSessions: formatNumber(hit.completedSessions),
        responseTimeMinutes: Number(hit.responseTimeMinutes ?? 0),
        isVerified: Boolean(hit.isVerified)
      };
      base.actions = [{ label: 'Hire tutor', href: `/tutors/${hit.slug ?? hit.entityId}` }];
      base.url = `/tutors/${hit.slug ?? hit.entityId}`;
      base.geo = deriveGeo(entity, hit);
      return base;
    }
    default: {
      return base;
    }
  }
}

export class ExplorerSearchService {
  constructor({
    documentModel = SearchDocumentModel,
    adsService = AdsPlacementService,
    loggerInstance = logger
  } = {}) {
    this.model = documentModel;
    this.adsService = adsService;
    this.logger = loggerInstance;
  }

  getSupportedEntities() {
    return this.model.getSupportedEntities();
  }

  normaliseEntityTypes(entities) {
    if (!Array.isArray(entities) || !entities.length) {
      return MODEL_SUPPORTED_ENTITIES;
    }
    const filtered = entities
      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
      .filter((entry) => entry && MODEL_SUPPORTED_ENTITIES.includes(entry));
    return filtered.length ? filtered : MODEL_SUPPORTED_ENTITIES;
  }

  buildFilters(entity, filters = {}, globalFilters = {}) {
    const merged = { ...globalFilters };
    const entityFilters = filters?.[entity] ?? filters ?? {};
    for (const [key, value] of Object.entries(entityFilters)) {
      if (value === undefined || value === null) {
        continue;
      }
      merged[key] = value;
    }
    return merged;
  }

  resolveSort(entity, sortPreference) {
    if (!sortPreference) {
      return ENTITY_CONFIG[entity]?.defaultSort ?? null;
    }
    if (typeof sortPreference === 'string') {
      return sortPreference;
    }
    if (Array.isArray(sortPreference)) {
      return sortPreference;
    }
    if (typeof sortPreference === 'object' && sortPreference[entity]) {
      return sortPreference[entity];
    }
    return ENTITY_CONFIG[entity]?.defaultSort ?? null;
  }

  async searchEntity(entity, { query, page, perPage, filters, globalFilters, sort, includeFacets }) {
    const effectiveFilters = this.buildFilters(entity, filters, globalFilters);
    const sortDirective = this.resolveSort(entity, sort);
    const result = await this.model.search(entity, {
      query,
      filters: effectiveFilters,
      sort: sortDirective,
      page,
      perPage,
      includeFacets
    });

    const hits = result.hits.map((hit) => formatDocument(entity, hit));
    const markers = hits.map((hit) => hit.geo).filter(Boolean);

    return {
      entity,
      hits,
      totalHits: result.total,
      processingTimeMs: result.processingTimeMs,
      query,
      page: result.page,
      perPage: result.perPage,
      sort: sortDirective,
      filter: effectiveFilters,
      facets: result.facets,
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
    const markerList = results.flatMap((result) => result.markers);
    const bounds = buildBounds(markerList);

    let adsPlacements = null;
    try {
      adsPlacements = await this.adsService.placementsForSearch({ query, entities: resolvedEntities });
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to load ads placements for explorer search');
    }

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
        items: markerList,
        bounds
      },
      adsPlacements
    };
  }
}

export const explorerSearchService = new ExplorerSearchService();

export default explorerSearchService;
