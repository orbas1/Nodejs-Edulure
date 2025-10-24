import { getEnvironmentContext, resolveEnvironmentDescriptor } from '../utils/environment.js';

const DEFAULT_ALERT_SEVERITY = 'info';

function coerceNumber(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function coerceBoolean(value, fallback = false) {
  if (value === null || value === undefined) {
    return fallback;
  }
  return Boolean(value);
}

function coerceDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function ensureArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normaliseEnvironment(environment) {
  const context = resolveEnvironmentDescriptor(environment ?? getEnvironmentContext());
  return {
    key: context.key,
    name: context.name,
    tier: context.tier,
    region: context.region,
    workspace: context.workspace
  };
}

function normaliseTimeseriesEntry(entry = {}) {
  return {
    date: coerceDate(entry.date) ?? null,
    searches: coerceNumber(entry.searches),
    uniqueUsers: coerceNumber(entry.uniqueUsers),
    clickThroughRate: coerceNumber(entry.clickThroughRate),
    zeroResultRate: coerceNumber(entry.zeroResultRate),
    averageLatencyMs: coerceNumber(entry.averageLatencyMs)
  };
}

function normaliseEntityBreakdown(entry = {}) {
  return {
    entityType: entry.entityType ?? entry.entity ?? 'unknown',
    searches: coerceNumber(entry.searches),
    clickThroughRate: coerceNumber(entry.clickThroughRate),
    zeroResultRate: coerceNumber(entry.zeroResultRate),
    displayedResults: coerceNumber(entry.displayedResults),
    clicks: coerceNumber(entry.clicks),
    averageLatencyMs: coerceNumber(entry.averageLatencyMs)
  };
}

function normaliseQuery(entry = {}) {
  if (typeof entry === 'string') {
    return { query: entry, count: 0 };
  }
  return {
    query: entry.query ?? entry.term ?? '',
    count: coerceNumber(entry.count)
  };
}

function normaliseForecastPoint(entry = {}) {
  return {
    date: coerceDate(entry.date) ?? null,
    value: coerceNumber(entry.value)
  };
}

export function normaliseExplorerSummary(payload = {}, environmentOverride) {
  const environment = normaliseEnvironment(payload.environment ?? environmentOverride);
  const totalsSource = payload.totals ?? payload.summary ?? {};
  const response = {
    environment,
    totals: {
      searches: coerceNumber(totalsSource.searches),
      uniqueUsers: coerceNumber(totalsSource.uniqueUsers),
      zeroResultRate: coerceNumber(totalsSource.zeroResultRate),
      clickThroughRate: coerceNumber(totalsSource.clickThroughRate),
      averageLatencyMs: coerceNumber(totalsSource.averageLatencyMs)
    },
    timeseries: ensureArray(payload.timeseries).map(normaliseTimeseriesEntry),
    entityBreakdown: ensureArray(payload.entityBreakdown ?? payload.entities).map(normaliseEntityBreakdown),
    topQueries: ensureArray(payload.topQueries).map(normaliseQuery),
    zeroResultQueries: ensureArray(payload.zeroResultQueries).map(normaliseQuery),
    forecasts: {
      searchVolume: ensureArray(payload.forecasts?.searchVolume).map(normaliseForecastPoint),
      clickThroughRate: ensureArray(payload.forecasts?.clickThroughRate).map(normaliseForecastPoint)
    },
    lastComputedAt: coerceDate(payload.lastComputedAt ?? payload.generatedAt ?? payload.updatedAt)
  };

  return response;
}

export function normaliseExplorerAlert(payload = {}, environmentOverride) {
  const environment = normaliseEnvironment(payload.environment ?? environmentOverride);
  const tags = ensureArray(payload.tags).map((tag) => String(tag));
  const generatedId =
    payload.id ?? payload.alertId ?? globalThis.crypto?.randomUUID?.() ?? `alert-${Date.now()}`;
  return {
    id: generatedId,
    title: payload.title ?? payload.message ?? 'Untitled alert',
    severity: (payload.severity ?? payload.level ?? DEFAULT_ALERT_SEVERITY).toLowerCase(),
    description: payload.description ?? payload.details ?? '',
    detectedAt: coerceDate(payload.detectedAt ?? payload.createdAt ?? payload.timestamp),
    acknowledged: coerceBoolean(payload.acknowledged ?? payload.isAcknowledged),
    tags,
    environment
  };
}

export function normaliseRevenueSavedView(payload = {}, environmentOverride) {
  const environment = normaliseEnvironment(payload.environment ?? environmentOverride);
  return {
    id: payload.id ?? payload.viewId ?? null,
    name: payload.name ?? payload.title ?? 'Untitled view',
    filters: payload.filters ?? {},
    createdAt: coerceDate(payload.createdAt ?? payload.insertedAt),
    updatedAt: coerceDate(payload.updatedAt ?? payload.modifiedAt),
    environment
  };
}

export function attachEnvironmentToInteraction(payload = {}, environmentOverride) {
  const environment = normaliseEnvironment(environmentOverride);
  return {
    ...payload,
    environment: environment.key,
    environmentTier: environment.tier,
    environmentRegion: environment.region,
    environmentWorkspace: environment.workspace ?? undefined
  };
}
