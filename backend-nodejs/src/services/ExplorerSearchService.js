import logger from '../config/logger.js';
import getSearchProvider from './search/searchProviders.js';
import { SUPPORTED_ENTITIES } from './search/entityConfig.js';
import AdsPlacementService from './AdsPlacementService.js';

function sanitiseArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter((value) => value !== null && value !== undefined && value !== '');
}

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

function deriveGeo(entity, hit) {
  if (!hit || typeof hit !== 'object') {
    return null;
  }
  const geo = hit.geo ?? hit.raw?.geo ?? {};
  if (typeof geo.lat === 'number' && typeof geo.lng === 'number') {
    return geo;
  }
  if (entity === 'communities' && geo?.latitude && geo?.longitude) {
    return { lat: Number(geo.latitude), lng: Number(geo.longitude) };
  }
  if (entity === 'events' && geo?.lat && geo?.lng) {
    return { lat: Number(geo.lat), lng: Number(geo.lng) };
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
      base.subtitle = [
        hit.headline,
        hit.role,
        hit.followerCount ? `${formatNumber(hit.followerCount)} followers` : null
      ]
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
  constructor({ provider = getSearchProvider(), loggerInstance = logger } = {}) {
    this.provider = provider;
    this.logger = loggerInstance;
  }

  getSupportedEntities() {
    if (typeof this.provider.getSupportedEntities === 'function') {
      return this.provider.getSupportedEntities();
    }
    return SUPPORTED_ENTITIES;
  }

  normaliseEntityTypes(entities) {
    if (!entities || !Array.isArray(entities) || !entities.length) {
      return this.getSupportedEntities();
    }
    const supported = new Set(this.getSupportedEntities());
    const filtered = entities
      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
      .filter((entry) => entry && supported.has(entry));
    return filtered.length ? filtered : this.getSupportedEntities();
  }

  async search({
    query,
    entityTypes,
    page,
    perPage,
    filters,
    globalFilters,
    sort,
    includeFacets = true
  } = {}) {
    const resolvedEntities = this.normaliseEntityTypes(entityTypes);
    const providerResult = await this.provider.search({
      query,
      entityTypes: resolvedEntities,
      page,
      perPage,
      filters,
      globalFilters,
      sort,
      includeFacets
    });

    const results = {};
    for (const entity of resolvedEntities) {
      const entityResult = providerResult.results?.[entity] ?? {
        entity,
        hits: [],
        totalHits: 0,
        facets: {},
        markers: []
      };
      const rawHits = entityResult.hits ?? [];
      results[entity] = {
        ...entityResult,
        hits: rawHits.map((hit) => formatHit(entity, hit)),
        rawHits
      };
    }

    const adsPlacements = await AdsPlacementService.placementsForSearch({
      query: providerResult.query,
      entities: resolvedEntities
    });

    return {
      query: providerResult.query,
      page: providerResult.page,
      perPage: providerResult.perPage,
      entities: resolvedEntities,
      results,
      totals: providerResult.totals ?? {},
      markers: providerResult.markers ?? { items: [], bounds: null },
      adsPlacements
    };
  }
}

export const explorerSearchService = new ExplorerSearchService();

export default explorerSearchService;
