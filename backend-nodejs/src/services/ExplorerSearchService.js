import logger from '../config/logger.js';
import ExplorerSearchDocumentModel from '../models/ExplorerSearchDocumentModel.js';
import { buildBounds } from '../utils/geo.js';
import AdsPlacementService from './AdsPlacementService.js';

function normaliseArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry) => entry !== null && entry !== undefined);
  }
  return [value];
}

function toLower(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value).toLowerCase();
}

function intersects(values, expected) {
  const haystack = new Set(normaliseArray(values).map(toLower));
  for (const candidate of normaliseArray(expected)) {
    if (haystack.has(toLower(candidate))) {
      return true;
    }
  }
  return false;
}

function matchesRange(value, range) {
  if (value === null || value === undefined) {
    return false;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return false;
  }
  if (range.min !== undefined && range.min !== null && numeric < Number(range.min)) {
    return false;
  }
  if (range.max !== undefined && range.max !== null && numeric > Number(range.max)) {
    return false;
  }
  if (range.equals !== undefined && range.equals !== null && numeric !== Number(range.equals)) {
    return false;
  }
  if (range.not !== undefined && range.not !== null && numeric === Number(range.not)) {
    return false;
  }
  return true;
}

function normaliseBoolean(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  const normalised = toLower(value);
  if (['true', '1', 'yes', 'on'].includes(normalised)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalised)) {
    return false;
  }
  return null;
}

const SORT_COMPARATORS = {
  communities: {
    trending: (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0),
    members: (a, b) => (b.metrics?.memberCount ?? 0) - (a.metrics?.memberCount ?? 0),
    newest: (a, b) => new Date(b.metadata?.createdAt ?? 0) - new Date(a.metadata?.createdAt ?? 0)
  },
  courses: {
    relevance: (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0),
    rating: (a, b) => (b.rating?.average ?? 0) * (b.rating?.count ?? 1) - (a.rating?.average ?? 0) * (a.rating?.count ?? 1),
    newest: (a, b) => new Date(b.metadata?.releaseAt ?? 0) - new Date(a.metadata?.releaseAt ?? 0),
    priceLow: (a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0),
    priceHigh: (a, b) => (b.price?.amount ?? 0) - (a.price?.amount ?? 0)
  },
  ebooks: {
    relevance: (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0),
    newest: (a, b) => new Date(b.metadata?.releaseAt ?? 0) - new Date(a.metadata?.releaseAt ?? 0),
    rating: (a, b) => (b.rating?.average ?? 0) * (b.rating?.count ?? 1) - (a.rating?.average ?? 0) * (a.rating?.count ?? 1),
    readingTime: (a, b) => (a.metrics?.readingTimeMinutes ?? 0) - (b.metrics?.readingTimeMinutes ?? 0)
  },
  tutors: {
    relevance: (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0),
    rating: (a, b) => (b.rating?.average ?? 0) * (b.rating?.count ?? 1) - (a.rating?.average ?? 0) * (a.rating?.count ?? 1),
    priceLow: (a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0),
    priceHigh: (a, b) => (b.price?.amount ?? 0) - (a.price?.amount ?? 0),
    responseTime: (a, b) => (a.metrics?.responseTimeMinutes ?? Infinity) - (b.metrics?.responseTimeMinutes ?? Infinity)
  },
  profiles: {
    relevance: (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0),
    newest: (a, b) => new Date(b.metadata?.createdAt ?? 0) - new Date(a.metadata?.createdAt ?? 0),
    followers: (a, b) => (b.metrics?.followerCount ?? 0) - (a.metrics?.followerCount ?? 0)
  },
  ads: {
    performance: (a, b) => (b.metrics?.performanceScore ?? 0) - (a.metrics?.performanceScore ?? 0),
    spend: (a, b) => (b.metrics?.spendTotalCents ?? 0) - (a.metrics?.spendTotalCents ?? 0),
    newest: (a, b) => new Date(b.metadata?.createdAt ?? 0) - new Date(a.metadata?.createdAt ?? 0)
  },
  events: {
    upcoming: (a, b) => new Date(a.metrics?.startAt ?? 0) - new Date(b.metrics?.startAt ?? 0),
    newest: (a, b) => new Date(b.metadata?.createdAt ?? 0) - new Date(a.metadata?.createdAt ?? 0),
    popularity: (a, b) => (b.metrics?.reservedSeats ?? 0) - (a.metrics?.reservedSeats ?? 0)
  }
};

const FILTER_PATHS = {
  communities: {
    visibility: (doc) => doc.metadata?.visibility,
    category: (doc) => doc.metadata?.category,
    timezone: (doc) => doc.metadata?.timezone,
    country: (doc) => doc.metadata?.country,
    languages: (doc) => doc.metadata?.languages ?? doc.languages,
    tags: (doc) => doc.tags,
    isFeatured: (doc) => doc.metadata?.isFeatured
  },
  courses: {
    level: (doc) => doc.metadata?.level,
    category: (doc) => doc.metadata?.category,
    deliveryFormat: (doc) => doc.metadata?.deliveryFormat,
    languages: (doc) => doc.metadata?.languages ?? doc.languages,
    tags: (doc) => doc.tags,
    'price.amount': (doc) => doc.price?.amount
  },
  ebooks: {
    categories: (doc) => doc.categories,
    languages: (doc) => doc.languages,
    readingTimeMinutes: (doc) => doc.metrics?.readingTimeMinutes
  },
  tutors: {
    isVerified: (doc) => doc.metadata?.isVerified,
    languages: (doc) => doc.languages,
    skills: (doc) => doc.metadata?.skills ?? doc.tags,
    country: (doc) => doc.metadata?.country,
    'hourlyRate.amount': (doc) => doc.price?.amount
  },
  profiles: {
    role: (doc) => doc.metadata?.role,
    badges: (doc) => doc.metadata?.badges,
    languages: (doc) => doc.metadata?.languages ?? doc.languages
  },
  ads: {
    status: (doc) => doc.metadata?.status,
    objective: (doc) => doc.metadata?.objective,
    'targeting.audiences': (doc) => doc.metadata?.targetingAudiences,
    'targeting.locations': (doc) => doc.metadata?.targetingLocations,
    'targeting.languages': (doc) => doc.metadata?.targetingLanguages
  },
  events: {
    type: (doc) => doc.metadata?.type,
    timezone: (doc) => doc.metadata?.timezone,
    isTicketed: (doc) => doc.metrics?.isTicketed,
    topics: (doc) => doc.metadata?.topics
  }
};

const FACET_EXTRACTORS = {
  communities: {
    category: (doc) => doc.metadata?.category,
    visibility: (doc) => doc.metadata?.visibility,
    languages: (doc) => doc.metadata?.languages ?? doc.languages
  },
  courses: {
    level: (doc) => doc.metadata?.level,
    deliveryFormat: (doc) => doc.metadata?.deliveryFormat,
    category: (doc) => doc.metadata?.category,
    languages: (doc) => doc.metadata?.languages ?? doc.languages
  },
  ebooks: {
    categories: (doc) => doc.categories,
    languages: (doc) => doc.languages
  },
  tutors: {
    languages: (doc) => doc.languages,
    skills: (doc) => doc.metadata?.skills ?? doc.tags,
    country: (doc) => doc.metadata?.country,
    verified: (doc) => (doc.metadata?.isVerified ? 'yes' : 'no')
  },
  profiles: {
    role: (doc) => doc.metadata?.role,
    badges: (doc) => doc.metadata?.badges
  },
  ads: {
    status: (doc) => doc.metadata?.status,
    objective: (doc) => doc.metadata?.objective
  },
  events: {
    type: (doc) => doc.metadata?.type,
    timezone: (doc) => doc.metadata?.timezone,
    ticketed: (doc) => (doc.metrics?.isTicketed ? 'yes' : 'no')
  }
};

function extractFacetCounts(docs, extractor) {
  const counts = new Map();
  for (const doc of docs) {
    const value = extractor(doc);
    const values = normaliseArray(value).filter((entry) => entry !== null && entry !== undefined && entry !== '');
    for (const entry of values) {
      const key = String(entry);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

export class ExplorerSearchService {
  constructor({ documentModel = ExplorerSearchDocumentModel, loggerInstance = logger } = {}) {
    this.documentModel = documentModel;
    this.logger = loggerInstance?.child ? loggerInstance.child({ service: 'ExplorerSearchService' }) : logger;
  }

  getSupportedEntities() {
    return ['communities', 'courses', 'ebooks', 'tutors', 'profiles', 'ads', 'events'];
  }

  normaliseEntityTypes(entities) {
    const supported = this.getSupportedEntities();
    if (!entities || !Array.isArray(entities) || !entities.length) {
      return supported;
    }
    const filtered = entities
      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
      .filter((entry) => entry && supported.includes(entry));
    return filtered.length ? filtered : supported;
  }

  applyQueryFilter(documents, query) {
    if (!query) {
      return documents;
    }
    const tokens = query
      .split(/[\s,]+/)
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean);
    if (!tokens.length) {
      return documents;
    }
    return documents.filter((doc) => tokens.every((token) => doc.searchTerms.includes(token)));
  }

  applyFilters(entity, documents, filters = {}, globalFilters = {}) {
    const mapping = FILTER_PATHS[entity] ?? {};
    const merged = { ...globalFilters, ...filters };

    const entries = Object.entries(merged).filter(([_, value]) => {
      if (value === null || value === undefined) {
        return false;
      }
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }
      if (typeof value === 'object' && !Array.isArray(value)) {
        return Object.values(value).some((item) => item !== null && item !== undefined && item !== '');
      }
      if (value === '') {
        return false;
      }
      return true;
    });

    if (!entries.length) {
      return documents;
    }

    return documents.filter((doc) => {
      for (const [key, expected] of entries) {
        const resolver = mapping[key];
        const resolvedValue = typeof resolver === 'function' ? resolver(doc) : doc[key];
        if (Array.isArray(expected)) {
          if (!intersects(resolvedValue, expected)) {
            return false;
          }
          continue;
        }
        if (typeof expected === 'object' && expected !== null) {
          if (!matchesRange(resolvedValue, expected)) {
            return false;
          }
          continue;
        }
        if (typeof expected === 'boolean') {
          const actual = normaliseBoolean(resolvedValue);
          if (actual === null || actual !== expected) {
            return false;
          }
          continue;
        }
        const normalisedExpected = toLower(expected);
        if (Array.isArray(resolvedValue)) {
          if (!resolvedValue.some((value) => toLower(value) === normalisedExpected)) {
            return false;
          }
        } else if (toLower(resolvedValue) !== normalisedExpected) {
          return false;
        }
      }
      return true;
    });
  }

  applySort(entity, documents, sortPreference) {
    const comparators = SORT_COMPARATORS[entity] ?? {};
    const comparator = sortPreference ? comparators[sortPreference] : comparators[Object.keys(comparators)[0]];
    if (!comparator) {
      return documents.slice().sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0));
    }
    return documents.slice().sort(comparator);
  }

  buildFacets(entity, documents) {
    const extractors = FACET_EXTRACTORS[entity];
    if (!extractors) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(extractors)
        .map(([key, extractor]) => [key, extractFacetCounts(documents, extractor)])
        .filter(([_, counts]) => Object.keys(counts).length > 0)
    );
  }

  toHit(entity, doc) {
    const previewMedia = doc.previewMedia ?? {};
    const base = {
      id: doc.entityId,
      entityType: entity,
      title: doc.title,
      subtitle: doc.subtitle ?? null,
      description: doc.description ?? null,
      tags: doc.tags ?? [],
      imageUrl: previewMedia.url ?? null,
      previewImage: previewMedia.url ?? null,
      thumbnailUrl: previewMedia.url ?? null,
      coverImageUrl: previewMedia.url ?? null,
      previewMedia: {
        url: previewMedia.url ?? null,
        type: previewMedia.type ?? null,
        placeholder: previewMedia.placeholder ?? null
      },
      previewPlaceholder: previewMedia.placeholder ?? null,
      price: doc.price ?? null,
      rating: doc.rating ?? null,
      metrics: doc.metrics ?? {},
      raw: doc.raw ?? {},
      metadata: doc.metadata ?? {},
      geo: doc.geo
        ? {
            latitude: doc.geo.latitude ?? null,
            longitude: doc.geo.longitude ?? null,
            country: doc.geo.country ?? null,
            label: doc.title,
            context: entity
          }
        : null,
      actions: []
    };

    switch (entity) {
      case 'communities': {
        base.actions = [
          {
            label: 'View community',
            href: `/communities/${doc.metadata?.slug ?? doc.entityId}`
          }
        ];
        base.metrics = {
          ...doc.metrics,
          members: doc.metrics?.memberCount ?? 0,
          trendScore: doc.metrics?.trendScore ?? 0,
          visibility: doc.metadata?.visibility ?? 'public'
        };
        return base;
      }
      case 'courses': {
        base.actions = [
          {
            label: 'View course',
            href: `/courses/${doc.metadata?.slug ?? doc.entityId}`
          }
        ];
        base.metrics = {
          ...doc.metrics,
          enrolments: doc.metrics?.enrolments ?? 0,
          releaseAt: doc.metrics?.releaseAt ?? null,
          skills: doc.metrics?.skills ?? [],
          level: doc.metrics?.level ?? null,
          deliveryFormat: doc.metrics?.deliveryFormat ?? null
        };
        return base;
      }
      case 'ebooks': {
        base.actions = [
          {
            label: 'Open e-book',
            href: `/ebooks/${doc.metadata?.slug ?? doc.entityId}`
          }
        ];
        base.metrics = {
          ...doc.metrics,
          readingTimeMinutes: doc.metrics?.readingTimeMinutes ?? 0,
          authors: doc.metrics?.authors ?? [],
          releaseAt: doc.metrics?.releaseAt ?? null
        };
        return base;
      }
      case 'tutors': {
        base.actions = [
          {
            label: 'Hire tutor',
            href: `/tutors/${doc.metadata?.slug ?? doc.entityId}`
          }
        ];
        base.metrics = {
          ...doc.metrics,
          completedSessions: doc.metrics?.completedSessions ?? 0,
          responseTimeMinutes: doc.metrics?.responseTimeMinutes ?? null,
          languages: doc.metrics?.languages ?? [],
          skills: doc.metrics?.skills ?? [],
          country: doc.metadata?.country ?? null
        };
        return base;
      }
      case 'profiles': {
        base.actions = [
          {
            label: 'View profile',
            href: `/profiles/${doc.entityId}`
          }
        ];
        base.metrics = {
          ...doc.metrics,
          followerCount: doc.metrics?.followerCount ?? 0,
          role: doc.metrics?.role ?? null
        };
        return base;
      }
      case 'ads': {
        base.actions = [
          {
            label: 'Open campaign',
            href: doc.metrics?.ctaUrl ?? `/ads/${doc.metadata?.slug ?? doc.entityId}`
          }
        ];
        base.metrics = {
          ...doc.metrics,
          performanceScore: doc.metrics?.performanceScore ?? 0,
          ctr: doc.metrics?.ctr ?? 0,
          spendTotalCents: doc.metrics?.spendTotalCents ?? 0,
          objective: doc.metrics?.objective ?? null
        };
        return base;
      }
      case 'events': {
        base.actions = [
          {
            label: 'View event',
            href: `/events/${doc.metadata?.slug ?? doc.entityId}`
          }
        ];
        base.metrics = {
          ...doc.metrics,
          startAt: doc.metrics?.startAt ?? null,
          timezone: doc.metrics?.timezone ?? null,
          capacity: doc.metrics?.capacity ?? 0,
          isTicketed: doc.metrics?.isTicketed ?? false
        };
        return base;
      }
      default:
        return base;
    }
  }

  resolveSuggestionUrl(entity, doc) {
    switch (entity) {
      case 'communities':
        return `/communities/${doc.metadata?.slug ?? doc.entityId}`;
      case 'courses':
        return `/courses/${doc.metadata?.slug ?? doc.entityId}`;
      case 'ebooks':
        return `/ebooks/${doc.metadata?.slug ?? doc.entityId}`;
      case 'tutors':
        return `/tutors/${doc.metadata?.slug ?? doc.entityId}`;
      case 'profiles':
        return `/profiles/${doc.entityId}`;
      case 'ads':
        return `/ads/${doc.metadata?.slug ?? doc.entityId}`;
      case 'events':
        return `/events/${doc.metadata?.slug ?? doc.entityId}`;
      default:
        return '#';
    }
  }

  buildMarkers(entitiesResults) {
    const markers = [];
    for (const result of entitiesResults) {
      for (const hit of result.hits) {
        if (hit.geo && hit.geo.latitude !== null && hit.geo.longitude !== null) {
          markers.push(hit.geo);
        }
      }
    }
    return {
      items: markers,
      bounds: buildBounds(markers)
    };
  }

  async search({
    query,
    entityTypes,
    page = 1,
    perPage = 12,
    filters = {},
    globalFilters = {},
    sort = {},
    includeFacets = true
  } = {}) {
    const resolvedEntities = this.normaliseEntityTypes(entityTypes);
    const documents = await this.documentModel.listByEntities(resolvedEntities);

    const results = [];
    for (const entity of resolvedEntities) {
      const entityStart = Date.now();
      const entityDocuments = documents.filter((doc) => doc.entityType === entity);
      const matchedQuery = this.applyQueryFilter(entityDocuments, query);
      const entityFilters = filters?.[entity] ?? filters ?? {};
      const filtered = this.applyFilters(entity, matchedQuery, entityFilters, globalFilters);
      const sortPreference = typeof sort === 'object' ? sort[entity] ?? sort : sort;
      const sorted = this.applySort(entity, filtered, sortPreference);
      const totalHits = sorted.length;
      const offset = Math.max(0, (page - 1) * perPage);
      const hits = sorted.slice(offset, offset + perPage).map((doc) => this.toHit(entity, doc));
      const facets = includeFacets ? this.buildFacets(entity, filtered) : {};
      const processingTimeMs = Date.now() - entityStart;

      results.push({
        entity,
        hits,
        rawHits: sorted.slice(offset, offset + perPage).map((doc) => doc.raw ?? {}),
        totalHits,
        processingTimeMs,
        query,
        page,
        perPage,
        sort: sortPreference ?? null,
        filter: entityFilters,
        facets,
        markers: hits.map((hit) => hit.geo).filter(Boolean)
      });
    }

    const totals = results.reduce((acc, result) => {
      acc[result.entity] = result.totalHits;
      return acc;
    }, {});

    const markers = this.buildMarkers(results);

    const analytics = {
      searchEventId: `doc-${Date.now().toString(36)}`,
      totalResults: results.reduce((acc, result) => acc + result.totalHits, 0),
      totalDisplayed: results.reduce((acc, result) => acc + result.hits.length, 0),
      zeroResult: results.every((result) => result.totalHits === 0)
    };

    const adsPlacements = await AdsPlacementService.placementsForSearch({
      query,
      entities: resolvedEntities
    });

    return {
      query,
      page,
      perPage,
      entities: resolvedEntities,
      results: Object.fromEntries(results.map((result) => [result.entity, result])),
      totals,
      markers,
      adsPlacements,
      analytics
    };
  }

  async suggest({ query, entityTypes, limit = 6 } = {}) {
    const resolvedEntities = this.normaliseEntityTypes(entityTypes);
    const suggestions = await this.documentModel.suggest({ query, entityTypes: resolvedEntities, limit });
    return suggestions.map((doc) => ({
      entityType: doc.entityType,
      entityId: doc.entityId,
      title: doc.title,
      subtitle: doc.subtitle ?? null,
      description: doc.description ?? null,
      url: this.resolveSuggestionUrl(doc.entityType, doc),
      previewImage: doc.previewMedia?.url ?? null
    }));
  }
}

export default new ExplorerSearchService();
