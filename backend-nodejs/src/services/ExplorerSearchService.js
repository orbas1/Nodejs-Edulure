import logger from '../config/logger.js';
import { recordSearchOperation } from '../observability/metrics.js';
import { searchClusterService } from './SearchClusterService.js';
import { buildBounds, resolveCountryCoordinates } from '../utils/geo.js';
import AdsPlacementService from './AdsPlacementService.js';
import { ENTITY_CONFIG, SUPPORTED_ENTITIES } from './search/entityConfig.js';

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatCurrency(value) {
  if (!value || !isFiniteNumber(value.amount)) {
    return null;
  }
  const currency = value.currency ?? 'USD';
  const amount = value.amount >= 100 ? value.amount / 100 : value.amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
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
  const average = rating.average.toFixed(1);
  const count = rating.count ? ` · ${formatNumber(rating.count)} ratings` : '';
  return `${average}★${count}`;
}

function sanitiseArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter((value) => value !== null && value !== undefined && value !== '');
}

function mergeFilterValue(baseValue, overrideValue) {
  if (overrideValue === undefined || overrideValue === null) {
    return baseValue;
  }
  if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
    return overrideValue.length ? overrideValue : baseValue;
  }
  if (typeof baseValue === 'object' && typeof overrideValue === 'object' && !Array.isArray(baseValue)) {
    return { ...baseValue, ...overrideValue };
  }
  return overrideValue;
}

function deriveGeo(entity, hit) {
  if (!hit) {
    return null;
  }
  if (entity === 'communities') {
    const country = hit.country ?? hit.metadata?.country ?? null;
    const resolved = resolveCountryCoordinates(country);
    if (resolved) {
      return {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        label: hit.name,
        country: resolved.code,
        context: 'community'
      };
    }
  }
  if (entity === 'tutors') {
    const resolved = resolveCountryCoordinates(hit.country ?? hit.metadata?.country ?? null);
    if (resolved) {
      return {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        label: hit.displayName,
        country: resolved.code,
        context: 'tutor'
      };
    }
  }
  if (entity === 'events') {
    const resolved = resolveCountryCoordinates(hit.country ?? hit.communityCountry ?? null);
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
  const base = {
    id: hit.id,
    entityType: entity,
    raw: hit
  };
  const pickImage = (...keys) => {
    for (const key of keys) {
      if (!key) continue;
      const camelValue = hit[key];
      if (typeof camelValue === 'string' && camelValue) {
        return camelValue;
      }
      const snakeKey = key.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`);
      const snakeValue = hit[snakeKey];
      if (typeof snakeValue === 'string' && snakeValue) {
        return snakeValue;
      }
      if (hit.raw) {
        const rawCamel = hit.raw[key];
        if (typeof rawCamel === 'string' && rawCamel) {
          return rawCamel;
        }
        const rawSnake = hit.raw[snakeKey];
        if (typeof rawSnake === 'string' && rawSnake) {
          return rawSnake;
        }
      }
    }
    return null;
  };

  base.imageUrl = pickImage('coverImageUrl', 'thumbnailUrl', 'avatarUrl', 'imageUrl');
  switch (entity) {
    case 'communities': {
      base.title = hit.name;
      base.subtitle = hit.tagline ?? hit.description?.slice(0, 140) ?? null;
      base.description = hit.description;
      base.tags = sanitiseArray([hit.category, ...(hit.topics ?? [])]);
      base.metrics = {
        members: formatNumber(hit.memberCount),
        trendScore: hit.trendScore
      };
      base.actions = [{ label: 'View community', href: `/communities/${hit.slug}` }];
      base.geo = deriveGeo(entity, hit);
      return base;
    }
    case 'courses': {
      base.title = hit.title;
      base.subtitle = [hit.level, formatCurrency(hit.price), formatRating(hit.rating)]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.summary ?? hit.description?.slice(0, 140) ?? null;
      base.tags = sanitiseArray(hit.skills ?? []);
      base.metrics = {
        enrolments: formatNumber(hit.enrolmentCount),
        releaseAt: hit.releaseAt
      };
      base.actions = [{ label: 'View course', href: `/courses/${hit.slug}` }];
      base.geo = null;
      return base;
    }
    case 'ebooks': {
      base.title = hit.title;
      base.subtitle = [formatCurrency(hit.price), formatRating(hit.rating)]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.description?.slice(0, 160) ?? null;
      base.tags = sanitiseArray(hit.tags ?? []);
      base.metrics = {
        readingTimeMinutes: hit.readingTimeMinutes
      };
      base.actions = [{ label: 'Open ebook', href: `/ebooks/${hit.slug}` }];
      base.geo = null;
      return base;
    }
    case 'tutors': {
      base.title = hit.displayName;
      base.subtitle = [hit.headline, formatCurrency(hit.hourlyRate), formatRating(hit.rating)]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.bio?.slice(0, 160) ?? null;
      base.tags = sanitiseArray(hit.skills ?? []);
      base.metrics = {
        completedSessions: formatNumber(hit.completedSessions),
        responseTimeMinutes: hit.responseTimeMinutes
      };
      base.actions = [{ label: 'Hire tutor', href: `/tutors/${hit.id}` }];
      base.geo = deriveGeo(entity, hit);
      return base;
    }
    case 'profiles': {
      base.title = hit.displayName;
      base.subtitle = [hit.headline, hit.role, formatNumber(hit.followerCount) && `${formatNumber(hit.followerCount)} followers`]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.bio?.slice(0, 160) ?? null;
      base.tags = sanitiseArray(hit.skills ?? []);
      base.metrics = {
        followers: formatNumber(hit.followerCount)
      };
      base.actions = [{ label: 'View profile', href: `/profiles/${hit.id}` }];
      base.geo = deriveGeo(entity, hit);
      return base;
    }
    case 'ads': {
      base.title = hit.name;
      base.subtitle = [hit.objective, formatCurrency(hit.budget), `${hit.ctr ? hit.ctr.toFixed(2) : '0.00'}% CTR`]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.creative?.description ?? null;
      base.tags = sanitiseArray(hit.targeting?.keywords ?? []);
      base.metrics = {
        performanceScore: hit.performanceScore,
        spendTotal: formatCurrency(hit.spend)
      };
      base.actions = [{ label: 'Open campaign', href: `/ads/${hit.id}` }];
      base.geo = null;
      return base;
    }
    case 'events': {
      base.title = hit.title;
      base.subtitle = [hit.communityName, hit.type, hit.timezone]
        .filter(Boolean)
        .join(' · ');
      base.description = hit.description?.slice(0, 160) ?? null;
      base.tags = sanitiseArray(hit.topics ?? []);
      base.metrics = {
        startAt: hit.startAt,
        isTicketed: hit.isTicketed
      };
      base.actions = [{ label: 'View event', href: `/events/${hit.slug ?? hit.id}` }];
      base.geo = deriveGeo(entity, hit);
      return base;
    }
    default:
      return { ...base, title: hit.title ?? hit.name ?? `Result ${hit.id}` };
  }
}

export class ExplorerSearchService {
  constructor({ clusterService = searchClusterService, loggerInstance = logger } = {}) {
    this.clusterService = clusterService;
    this.logger = loggerInstance;
  }

  getSupportedEntities() {
    return SUPPORTED_ENTITIES;
  }

  normaliseEntityTypes(entities) {
    if (!entities || !Array.isArray(entities) || !entities.length) {
      return SUPPORTED_ENTITIES;
    }
    const filtered = entities
      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
      .filter((entry) => entry && SUPPORTED_ENTITIES.includes(entry));
    return filtered.length ? filtered : SUPPORTED_ENTITIES;
  }

  buildSort(entity, sortPreference) {
    const config = ENTITY_CONFIG[entity];
    if (!config) {
      return undefined;
    }
    if (!sortPreference || (Array.isArray(sortPreference) && sortPreference.length === 0)) {
      const defaultKey = config.defaultSort;
      const defaultSort = config.sorts[defaultKey];
      return defaultSort && defaultSort.length ? defaultSort : undefined;
    }
    if (typeof sortPreference === 'string') {
      if (config.sorts[sortPreference]) {
        const candidate = config.sorts[sortPreference];
        return candidate && candidate.length ? candidate : undefined;
      }
      if (sortPreference.includes(':')) {
        return [sortPreference];
      }
    }
    if (Array.isArray(sortPreference)) {
      return sortPreference;
    }
    if (typeof sortPreference === 'object' && sortPreference.field) {
      const direction = sortPreference.direction ?? 'asc';
      return [`${sortPreference.field}:${direction}`];
    }
    return undefined;
  }

  buildFilters(entity, filters = {}, globalFilters = {}) {
    const merged = { ...globalFilters };
    const entityFilters = filters?.[entity] ?? filters ?? {};
    for (const [key, value] of Object.entries(entityFilters)) {
      merged[key] = mergeFilterValue(merged[key], value);
    }
    return merged;
  }

  async searchEntity(entity, { query, page, perPage, filters, globalFilters, sort, includeFacets }) {
    const client = this.clusterService.searchClient;
    if (!client) {
      const error = new Error('Search cluster is not initialised');
      error.status = 503;
      throw error;
    }

    const effectiveFilters = this.buildFilters(entity, filters, globalFilters);
    const response = await recordSearchOperation('explorer_query', () =>
      client.search({
        entity,
        query,
        page,
        perPage,
        filters,
        globalFilters,
        sort,
        includeFacets
      })
    );

    const hits = Array.isArray(response.hits)
      ? response.hits.map((hit) => formatHit(entity, hit))
      : [];
    const markers = hits.map((hit) => hit.geo).filter(Boolean);

    return {
      entity,
      hits,
      rawHits: response.rawHits ?? response.hits ?? [],
      totalHits: response.totalHits ?? hits.length,
      processingTimeMs: response.processingTimeMs ?? 0,
      query: response.query ?? query,
      page,
      perPage,
      sort: response.sortDirectives ?? this.buildSort(entity, sort?.[entity] ?? sort),
      filter: effectiveFilters,
      facets: includeFacets ? response.facets ?? {} : {},
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
