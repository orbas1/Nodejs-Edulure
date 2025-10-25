import logger from '../config/logger.js';
import { buildBounds, resolveCountryCoordinates } from '../utils/geo.js';
import AdsPlacementService from './AdsPlacementService.js';
import { SUPPORTED_ENTITIES as MODEL_SUPPORTED_ENTITIES } from '../models/SearchDocumentModel.js';
import { resolveSearchProvider } from './searchProviders.js';
import { getEntityDefaultSort } from '../config/searchRankingConfig.js';
import { describeClusterLabel } from '../utils/learningClusters.js';

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

function toTitleCase(value) {
  if (!value && value !== 0) {
    return '';
  }
  return String(value)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function deriveClusterDescriptor(hit = {}) {
  const metadata = hit.metadata ?? {};
  const clusterKey =
    hit.clusterKey ??
    metadata.clusterKey ??
    metadata.cluster?.key ??
    metadata.cluster ??
    null;
  if (!clusterKey) {
    return null;
  }
  const labelCandidate = metadata.cluster?.label ?? describeClusterLabel(clusterKey);
  return { key: clusterKey, label: labelCandidate || describeClusterLabel(clusterKey) };
}

function resolvePersonaLabel(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const persona =
    metadata.persona ??
    metadata.personaLabel ??
    metadata.audience?.persona ??
    metadata.audience?.primary ??
    metadata.primaryPersona ??
    (Array.isArray(metadata.personaTags) ? metadata.personaTags[0] : null) ??
    (Array.isArray(metadata.tags) ? metadata.tags[0] : null) ??
    (Array.isArray(metadata.topics) ? metadata.topics[0] : null);
  return persona ? toTitleCase(persona) : null;
}

function computeMomentumDescriptor(popularityScore, freshnessScore, metadataMomentum = null) {
  if (metadataMomentum && typeof metadataMomentum === 'object') {
    const score = Number(metadataMomentum.score ?? metadataMomentum.value ?? metadataMomentum.numeric);
    const label = metadataMomentum.label ?? null;
    if (label && Number.isFinite(score)) {
      return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        label,
        trend: metadataMomentum.trend ?? (score >= 75 ? 'accelerating' : score >= 50 ? 'steady' : 'building')
      };
    }
  }

  const popularity = Number(popularityScore ?? 0);
  const freshness = Number(freshnessScore ?? 0);
  const popularityValid = Number.isFinite(popularity);
  const freshnessValid = Number.isFinite(freshness);
  if (!popularityValid && !freshnessValid) {
    return null;
  }
  const total = (popularityValid ? popularity : 0) + (freshnessValid ? freshness : 0);
  const divisor = (popularityValid ? 1 : 0) + (freshnessValid ? 1 : 0) || 1;
  const score = Math.max(0, Math.min(100, Math.round(total / divisor)));
  let label;
  let trend;
  if (score >= 75) {
    label = `High momentum (${score})`;
    trend = 'accelerating';
  } else if (score >= 50) {
    label = `Steady momentum (${score})`;
    trend = 'steady';
  } else {
    label = `Emerging momentum (${score})`;
    trend = 'building';
  }
  return { score, label, trend };
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

function ensureArray(value) {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normaliseBadge(entry) {
  if (!entry && entry !== 0) {
    return null;
  }
  if (typeof entry === 'string') {
    const label = entry.trim();
    if (!label) {
      return null;
    }
    return { type: 'info', label };
  }
  if (typeof entry === 'object') {
    const labelCandidate = entry.label ?? entry.title ?? entry.text ?? entry.value ?? entry.name ?? null;
    const label = typeof labelCandidate === 'string' ? labelCandidate.trim() : null;
    if (!label) {
      return null;
    }
    const typeCandidate = entry.type ?? entry.key ?? 'info';
    const type = typeof typeCandidate === 'string' ? typeCandidate.trim() : 'info';
    const badge = { type, label };
    if (entry.tone && typeof entry.tone === 'string') {
      badge.tone = entry.tone;
    }
    return badge;
  }
  return null;
}

function buildBadges(...sources) {
  const badges = [];
  const seen = new Set();
  sources.forEach((source) => {
    ensureArray(source).forEach((entry) => {
      const badge = normaliseBadge(entry);
      if (!badge) {
        return;
      }
      const key = `${badge.type.toLowerCase()}|${badge.label.toLowerCase()}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      badges.push(badge);
    });
  });
  return badges;
}

function normaliseAction(entry, fallbackHref = null) {
  if (!entry && entry !== 0) {
    return null;
  }
  if (typeof entry === 'string') {
    const label = entry.trim();
    if (!label) {
      return null;
    }
    return { label, href: fallbackHref, type: 'secondary' };
  }
  if (typeof entry === 'object') {
    const labelCandidate = entry.label ?? entry.title ?? entry.text ?? entry.name ?? entry.value ?? null;
    const label = typeof labelCandidate === 'string' ? labelCandidate.trim() : null;
    if (!label) {
      return null;
    }
    const hrefCandidate = entry.href ?? entry.url ?? entry.link ?? entry.permalink ?? null;
    const href = hrefCandidate ? String(hrefCandidate).trim() : fallbackHref ?? null;
    const typeCandidate = entry.type ?? entry.variant ?? entry.intent ?? 'secondary';
    const type = typeof typeCandidate === 'string' ? typeCandidate.trim().toLowerCase() : 'secondary';
    const normalizedType = ['primary', 'secondary', 'tertiary'].includes(type) ? type : 'secondary';
    const action = {
      id: entry.id ?? entry.key ?? entry.href ?? null,
      label,
      href,
      type: normalizedType
    };
    return action;
  }
  return null;
}

function buildActions(links, fallback = null) {
  const actions = [];
  const seen = new Set();
  const fallbackAction = fallback
    ? {
        id: fallback.id ?? null,
        label: fallback.label ?? 'Open',
        href: fallback.href ?? null,
        type: fallback.type ?? 'primary'
      }
    : null;

  ensureArray(links).forEach((entry) => {
    const action = normaliseAction(entry, fallbackAction?.href ?? null);
    if (!action) {
      return;
    }
    const key = `${action.label.toLowerCase()}|${action.href ?? ''}|${action.type}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    actions.push(action);
  });

  if (fallbackAction) {
    const fallbackKey = `${fallbackAction.label.toLowerCase()}|${fallbackAction.href ?? ''}|${fallbackAction.type}`;
    if (!seen.has(fallbackKey)) {
      actions.push(fallbackAction);
      seen.add(fallbackKey);
    }
  }

  return actions;
}

function buildHighlights(...sources) {
  const highlights = [];
  const seen = new Set();
  sources.forEach((source) => {
    ensureArray(source).forEach((entry) => {
      if (!entry && entry !== 0) {
        return;
      }
      const label = typeof entry === 'string' ? entry.trim() : String(entry).trim();
      if (!label) {
        return;
      }
      const key = label.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      highlights.push(label);
    });
  });
  return highlights;
}

function resolveThumbnail(hit = {}) {
  return (
    hit.thumbnailUrl ??
    hit.previewImageUrl ??
    hit.metadata?.preview?.imageUrl ??
    hit.metadata?.preview?.media?.[0]?.url ??
    hit.metadata?.thumbnailUrl ??
    hit.metadata?.coverImageUrl ??
    hit.metadata?.media?.[0]?.url ??
    hit.metadata?.assets?.[0]?.url ??
    null
  );
}

function describeFreshness(refreshedAt) {
  if (!refreshedAt) {
    return null;
  }

  const reference = refreshedAt instanceof Date ? refreshedAt : new Date(refreshedAt);
  if (Number.isNaN(reference.getTime())) {
    return null;
  }

  const deltaSeconds = Math.max(0, Math.round((Date.now() - reference.getTime()) / 1000));
  let label;

  if (deltaSeconds < 60) {
    label = 'Refreshed moments ago';
  } else if (deltaSeconds < 3_600) {
    const minutes = Math.round(deltaSeconds / 60);
    label = `Refreshed ${minutes}m ago`;
  } else if (deltaSeconds < 86_400) {
    const hours = Math.round(deltaSeconds / 3_600);
    label = `Refreshed ${hours}h ago`;
  } else {
    const days = Math.round(deltaSeconds / 86_400);
    label = `Refreshed ${days}d ago`;
  }

  return {
    refreshedAt: reference.toISOString(),
    deltaSeconds,
    label
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
    thumbnailUrl: resolveThumbnail(hit),
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

  const clusterDescriptor = deriveClusterDescriptor(hit);
  if (clusterDescriptor) {
    base.cluster = clusterDescriptor;
  }

  const personaLabel = resolvePersonaLabel(hit.metadata);
  if (personaLabel) {
    base.persona = personaLabel;
  }

  let fallbackAction = null;
  let defaultBadges = [];
  let fallbackHighlights = [];
  let monetisationTag = hit.monetisationTag ?? hit.metadata?.monetisation?.tag ?? null;
  const badgeExtras = [];
  const freshness = describeFreshness(hit.refreshedAt ?? hit.metadata?.refreshedAt ?? hit.updatedAt);

  if (freshness) {
    base.freshness = freshness;
    badgeExtras.push({ type: 'freshness', label: freshness.label, tone: 'indigo' });
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
      base.url = `/communities/${hit.slug ?? hit.entityId}`;
      fallbackAction = { label: 'View community', href: base.url, type: 'primary' };
      fallbackHighlights = [
        hit.memberCount ? `${formatNumber(hit.memberCount)} members` : null,
        hit.postCount ? `${formatNumber(hit.postCount)} posts` : null
      ];
      defaultBadges = [
        hit.metadata?.visibility ? { type: 'visibility', label: hit.metadata.visibility } : null,
        hit.country ? { type: 'region', label: hit.country } : null
      ];
      if (!monetisationTag) {
        monetisationTag = hit.metadata?.visibility === 'private' ? 'Private community' : 'Open community';
      }
      base.geo = deriveGeo(entity, hit);
      break;
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
      base.url = `/courses/${hit.slug ?? hit.entityId}`;
      fallbackAction = { label: 'View course', href: base.url, type: 'primary' };
      fallbackHighlights = [
        hit.level ? `Level: ${hit.level}` : null,
        hit.metadata?.deliveryFormat ? `${hit.metadata.deliveryFormat} format` : null,
        hit.metadata?.enrolmentCount ? `${formatNumber(hit.metadata.enrolmentCount)} learners` : null
      ];
      defaultBadges = [
        hit.level ? { type: 'level', label: hit.level } : null,
        hit.metadata?.deliveryFormat ? { type: 'format', label: hit.metadata.deliveryFormat } : null
      ];
      if (!monetisationTag) {
        monetisationTag = hit.price?.amountMinor > 0 ? 'Premium course' : 'Free course';
      }
      break;
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
      base.url = `/ebooks/${hit.slug ?? hit.entityId}`;
      fallbackAction = { label: 'Open ebook', href: base.url, type: 'primary' };
      fallbackHighlights = [
        hit.metadata?.readingTimeMinutes ? `${hit.metadata.readingTimeMinutes} min read` : null,
        hit.metadata?.languages?.[0] ? `Language: ${hit.metadata.languages[0]}` : null
      ];
      defaultBadges = [
        hit.metadata?.categories?.[0] ? { type: 'category', label: hit.metadata.categories[0] } : null,
        hit.metadata?.languages?.[0] ? { type: 'language', label: hit.metadata.languages[0] } : null
      ];
      if (!monetisationTag) {
        monetisationTag = hit.price?.amountMinor > 0 ? 'Premium ebook' : 'Free ebook';
      }
      break;
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
      base.url = `/tutors/${hit.slug ?? hit.entityId}`;
      fallbackAction = { label: 'Hire tutor', href: base.url, type: 'primary' };
      fallbackHighlights = [
        hit.completedSessions ? `${formatNumber(hit.completedSessions)} sessions` : null,
        hit.responseTimeMinutes ? `Responds in ${hit.responseTimeMinutes}m` : null,
        hit.metadata?.languages?.[0] ? `Speaks ${hit.metadata.languages[0]}` : null
      ];
      defaultBadges = [
        hit.isVerified ? { type: 'verified', label: 'Verified' } : null,
        ...(hit.metadata?.skills ?? []).slice(0, 2).map((skill) => ({ type: 'skill', label: skill }))
      ];
      if (!monetisationTag) {
        monetisationTag = hit.isVerified ? 'Verified tutor' : 'Expert tutor';
      }
      base.geo = deriveGeo(entity, hit);
      break;
    }
    default: {
      break;
    }
  }
  const combinedActions = buildActions(
    [
      hit.actions,
      hit.ctaLinks,
      hit.preview?.ctaLinks,
      hit.metadata?.preview?.ctaLinks,
      hit.metadata?.ctaLinks
    ].flatMap((source) => ensureArray(source)),
    fallbackAction
  );
  base.actions = combinedActions;

  if (!base.url && combinedActions.length) {
    const primaryAction = combinedActions.find((action) => action.type === 'primary');
    base.url = primaryAction?.href ?? combinedActions[0].href ?? null;
  }

  const highlights = buildHighlights(
    hit.highlights,
    hit.previewHighlights,
    hit.preview?.highlights,
    hit.metadata?.preview?.highlights,
    fallbackHighlights
  );
  base.highlights = highlights;

  base.preview = {
    summary: hit.previewSummary ?? hit.preview?.summary ?? base.description,
    image: hit.previewImageUrl ?? hit.preview?.image ?? hit.preview?.imageUrl ?? base.thumbnailUrl,
    highlights,
    ctaLinks: combinedActions
  };

  base.badges = buildBadges(
    hit.badges,
    hit.preview?.badges,
    hit.metadata?.badges,
    hit.metadata?.preview?.badges,
    defaultBadges,
    badgeExtras
  );

  base.monetisationTag = monetisationTag ?? null;

  const momentum = computeMomentumDescriptor(hit.popularityScore, hit.freshnessScore, hit.metadata?.momentum);
  if (momentum) {
    base.momentum = momentum;
    base.metrics.momentum = momentum.label;
    base.metrics.momentumScore = momentum.score;
    base.momentumTrend = momentum.trend;
  }

  return base;
}

export class ExplorerSearchService {
  constructor({
    provider,
    documentModel,
    adsService = AdsPlacementService,
    loggerInstance = logger
  } = {}) {
    const backend = documentModel ?? provider ?? resolveSearchProvider();
    this.backend = backend;
    this.adsService = adsService;
    this.logger = loggerInstance;
    const supportedSource = documentModel ?? backend;
    const declaredEntities =
      supportedSource && typeof supportedSource.getSupportedEntities === 'function'
        ? supportedSource.getSupportedEntities()
        : null;
    this.supportedEntities = Array.isArray(declaredEntities)
      ? declaredEntities
      : MODEL_SUPPORTED_ENTITIES;
  }

  getSupportedEntities() {
    return this.supportedEntities;
  }

  normaliseEntityTypes(entities) {
    if (!Array.isArray(entities) || !entities.length) {
      return this.supportedEntities;
    }
    const filtered = entities
      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
      .filter((entry) => entry && this.supportedEntities.includes(entry));
    return filtered.length ? filtered : this.supportedEntities;
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
      return getEntityDefaultSort(entity);
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
    return getEntityDefaultSort(entity);
  }

  async searchEntity(entity, { query, page, perPage, filters, globalFilters, sort, includeFacets }) {
    const effectiveFilters = this.buildFilters(entity, filters, globalFilters);
    const sortDirective = this.resolveSort(entity, sort);
    const result = await this.backend.search(entity, {
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
      this.searchEntity(entity, { query, page, perPage, filters, globalFilters, sort, includeFacets }).catch((error) => {
        this.logger.warn({ err: error, entity }, 'Explorer search entity query failed, returning empty result');
        const fallbackFilters = this.buildFilters(entity, filters, globalFilters);
        const fallbackSort = this.resolveSort(entity, sort);
        return {
          entity,
          hits: [],
          totalHits: 0,
          processingTimeMs: 0,
          query,
          page,
          perPage,
          sort: fallbackSort,
          filter: fallbackFilters,
          facets: {},
          markers: []
        };
      })
    );

    const results = await Promise.all(tasks);
    const byEntity = Object.fromEntries(results.map((result) => [result.entity, result]));
    const markerList = results.flatMap((result) => result.markers);
    const bounds = buildBounds(markerList);

    const refreshSummary = resolvedEntities.reduce((acc, entity) => {
      const entityResult = byEntity[entity];
      if (!entityResult?.hits?.length) {
        return acc;
      }

      const freshest = entityResult.hits.reduce((current, hit) => {
        const refreshedAt = hit.freshness?.refreshedAt ?? null;
        if (!refreshedAt) {
          return current;
        }

        const timestamp = new Date(refreshedAt).getTime();
        if (!Number.isFinite(timestamp)) {
          return current;
        }

        if (!current || timestamp > current.timestamp) {
          return { timestamp, summary: { ...hit.freshness, entityType: entity } };
        }

        return current;
      }, null);

      if (freshest?.summary) {
        acc[entity] = freshest.summary;
      }

      return acc;
    }, {});

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
      refreshSummary,
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
