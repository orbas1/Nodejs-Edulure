import logger from '../config/logger.js';
import { buildBounds, resolveCountryCoordinates } from '../utils/geo.js';
import AdsPlacementService from './AdsPlacementService.js';
import SearchDocumentModel, { SUPPORTED_ENTITIES as MODEL_SUPPORTED_ENTITIES } from '../models/SearchDocumentModel.js';
import ExplorerSearchDailyMetricModel from '../models/ExplorerSearchDailyMetricModel.js';
import { createSearchProviderRegistry } from './SearchProviderRegistry.js';
import { createDatabaseSearchProvider } from './search/DatabaseSearchProvider.js';

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

function pickFirstUrl(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const value = typeof candidate === 'string' ? candidate.trim() : null;
    if (value) {
      return value;
    }
  }
  return null;
}

function resolvePreviewMedia(hit) {
  const previewCandidate =
    hit.preview ??
    hit.previewMedia ??
    hit.metadata?.preview ??
    hit.metadata?.previewMedia ??
    null;

  const thumbnail = pickFirstUrl(hit.thumbnailUrl, hit.metadata?.thumbnailUrl, hit.metadata?.imageUrl);
  if (previewCandidate && typeof previewCandidate === 'object') {
    const previewUrl = pickFirstUrl(
      previewCandidate.url,
      previewCandidate.src,
      previewCandidate.href,
      previewCandidate.previewUrl
    );
    const posterUrl = pickFirstUrl(
      previewCandidate.poster,
      previewCandidate.posterUrl,
      previewCandidate.thumbnail,
      previewCandidate.thumbnailUrl,
      thumbnail
    );

    if (previewUrl || posterUrl) {
      const meta = {};
      if (previewCandidate.duration) {
        const numericDuration = Number(previewCandidate.duration);
        if (Number.isFinite(numericDuration) && numericDuration > 0) {
          meta.duration = numericDuration;
        }
      }
      if (previewCandidate.aspectRatio || previewCandidate.ratio) {
        meta.aspectRatio = previewCandidate.aspectRatio ?? previewCandidate.ratio;
      }

      return {
        type: previewCandidate.type ?? (previewUrl && previewUrl.endsWith('.mp4') ? 'video' : 'image'),
        url: previewUrl ?? posterUrl ?? null,
        posterUrl: posterUrl ?? previewUrl ?? null,
        fromCache: Boolean(previewCandidate.fromCache ?? previewCandidate.cached ?? false),
        meta: Object.keys(meta).length ? meta : null
      };
    }
  }

  if (thumbnail) {
    return {
      type: 'image',
      url: thumbnail,
      posterUrl: thumbnail,
      fromCache: false
    };
  }

  return null;
}

function applyPreviewEnhancements(document, cachedPreview) {
  if (!cachedPreview) {
    return document;
  }

  const target = document;
  const cachedThumbnail = pickFirstUrl(cachedPreview.thumbnailUrl, cachedPreview.posterUrl);
  const cachedUrl = pickFirstUrl(cachedPreview.previewUrl, cachedPreview.url, cachedThumbnail);

  if (!target.thumbnailUrl && cachedThumbnail) {
    target.thumbnailUrl = cachedThumbnail;
  }

  if (!target.previewMedia && cachedUrl) {
    target.previewMedia = {
      type: cachedPreview.previewType ?? (cachedPreview.previewUrl ? 'video' : 'image'),
      url: cachedUrl,
      posterUrl: cachedThumbnail ?? cachedUrl,
      fromCache: true,
      meta: cachedPreview.metrics ?? null
    };
  } else if (target.previewMedia && !target.previewMedia.posterUrl && cachedThumbnail) {
    target.previewMedia.posterUrl = cachedThumbnail;
  }

  const metadata = { ...(target.previewMetadata ?? {}) };
  metadata.cachedFrom = cachedPreview.capturedAt ?? metadata.cachedFrom ?? null;
  metadata.cacheSource = cachedPreview.source ?? metadata.cacheSource ?? 'metrics';
  if (cachedPreview.metrics) {
    metadata.metrics = cachedPreview.metrics;
  }
  target.previewMetadata = metadata;

  return target;
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
    geo: null,
    previewMedia: null,
    previewMetadata: null
  };

  base.previewMedia = resolvePreviewMedia(hit);
  if (base.previewMedia) {
    const metadata = { source: base.previewMedia.fromCache ? 'cache' : 'document' };
    if (base.previewMedia.meta?.aspectRatio) {
      metadata.aspectRatio = base.previewMedia.meta.aspectRatio;
    }
    if (base.previewMedia.meta?.duration) {
      metadata.duration = base.previewMedia.meta.duration;
    }
    base.previewMetadata = metadata;
    if (!base.previewMedia.meta) {
      delete base.previewMedia.meta;
    }
  }

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
    loggerInstance = logger,
    providerRegistry = null,
    previewMetricModel = ExplorerSearchDailyMetricModel
  } = {}) {
    this.adsService = adsService;
    this.logger = loggerInstance;
    this.previewMetricModel = previewMetricModel;
    this.providerRegistry = providerRegistry ??
      createSearchProviderRegistry([
        (registry) =>
          registry.register(
            'database',
            createDatabaseSearchProvider({ documentModel }),
            { defaultProvider: true }
          )
      ]);
  }

  getSupportedEntities() {
    const supported = this.providerRegistry.getSupportedEntities();
    if (!supported.length) {
      return [...MODEL_SUPPORTED_ENTITIES];
    }
    return supported;
  }

  normaliseEntityTypes(entities) {
    const supportedEntities = this.getSupportedEntities();
    if (!Array.isArray(entities) || !entities.length) {
      return supportedEntities;
    }
    const filtered = entities
      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
      .filter((entry) => entry && supportedEntities.includes(entry));
    return filtered.length ? filtered : supportedEntities;
  }

  buildFilters(entity, filters = {}, globalFilters = {}) {
    const merged = { ...globalFilters };
    const supportedEntities = this.getSupportedEntities();
    const looksLikeEntityMap =
      filters &&
      typeof filters === 'object' &&
      !Array.isArray(filters) &&
      Object.keys(filters).some((key) => supportedEntities.includes(key));
    const entityFilters = looksLikeEntityMap ? filters?.[entity] ?? {} : filters ?? {};
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

  async searchEntity(
    entity,
    { query, page, perPage, filters, globalFilters, sort, includeFacets },
    { previewCache } = {}
  ) {
    const effectiveFilters = this.buildFilters(entity, filters, globalFilters);
    const sortDirective = this.resolveSort(entity, sort);
    const result = await this.providerRegistry.search(entity, {
      query,
      filters: effectiveFilters,
      sort: sortDirective,
      page,
      perPage,
      includeFacets
    });

    const resolvedPreviewCache = previewCache instanceof Map ? previewCache : new Map();
    const hits = result.hits
      .map((hit) => formatDocument(entity, hit))
      .map((hit) => {
        if (resolvedPreviewCache.size) {
          const cached = resolvedPreviewCache.get(String(hit.entityId));
          if (cached) {
            return applyPreviewEnhancements(hit, cached);
          }
        }
        return hit;
      });
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
    const previewCache = await this.loadPreviewCache(resolvedEntities);

    const tasks = resolvedEntities.map((entity) =>
      this.searchEntity(
        entity,
        { query, page, perPage, filters, globalFilters, sort, includeFacets },
        { previewCache: previewCache.get(entity) }
      )
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

  async loadPreviewCache(entities) {
    if (!entities?.length || !this.previewMetricModel?.getRecentPreviewDigest) {
      return new Map();
    }

    const tasks = entities.map(async (entity) => {
      try {
        const digest = await this.previewMetricModel.getRecentPreviewDigest(entity, { limit: 30 });
        return [entity, digest];
      } catch (error) {
        this.logger?.warn?.({ err: error, entity }, 'Failed to load explorer preview digest');
        return [entity, new Map()];
      }
    });

    const entries = await Promise.all(tasks);
    return new Map(entries);
  }
}

export const explorerSearchService = new ExplorerSearchService();

export default explorerSearchService;
