import { env } from '../config/env.js';

function toRegExp(pattern, flags = 'i', context) {
  if (pattern instanceof RegExp) {
    return pattern;
  }
  if (typeof pattern !== 'string' || !pattern.trim()) {
    throw new Error(`Invalid pattern for ${context}: expected non-empty string`);
  }
  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    throw new Error(`Failed to compile pattern "${pattern}" for ${context}: ${error.message}`);
  }
}

function normaliseHttpIndicator(indicator = {}, context) {
  if (indicator.type && indicator.type !== 'http') {
    throw new Error(`Unsupported indicator type "${indicator.type}" for ${context}. Only "http" is supported.`);
  }

  const pattern = indicator.routePattern ?? indicator.pattern;
  if (typeof pattern !== 'string' || !pattern.trim()) {
    throw new Error(`SLO ${context} must define a non-empty "indicator.routePattern" string.`);
  }

  const flags = typeof indicator.routePatternFlags === 'string' && indicator.routePatternFlags.trim()
    ? indicator.routePatternFlags.trim()
    : 'i';

  const methodsSource = indicator.methodWhitelist ?? indicator.methods ?? [];
  const methodWhitelist = Array.isArray(methodsSource)
    ? Array.from(
        new Set(
          methodsSource
            .map((method) => (typeof method === 'string' ? method.trim().toUpperCase() : null))
            .filter(Boolean)
        )
      )
    : [];

  const excludeSource = indicator.excludeRoutePatterns ?? indicator.excludes ?? [];
  const excludeRoutePatterns = Array.isArray(excludeSource)
    ? excludeSource
        .map((value) => {
          if (typeof value === 'string') {
            return { pattern: value, flags };
          }
          if (value && typeof value === 'object' && typeof value.pattern === 'string') {
            return { pattern: value.pattern, flags: value.flags ?? flags };
          }
          return null;
        })
        .filter(Boolean)
    : [];

  const failureStatusCodesSource = indicator.failureStatusCodes ?? indicator.failureCodes ?? [];
  const failureStatusCodes = Array.isArray(failureStatusCodesSource)
    ? Array.from(
        new Set(
          failureStatusCodesSource
            .map((code) => Number.parseInt(code, 10))
            .filter((code) => Number.isInteger(code) && code >= 100 && code <= 599)
        )
      )
    : [];

  const successStatusCodesSource = indicator.successStatusCodes ?? indicator.successCodes ?? [];
  const successStatusCodes = Array.isArray(successStatusCodesSource)
    ? Array.from(
        new Set(
          successStatusCodesSource
            .map((code) => Number.parseInt(code, 10))
            .filter((code) => Number.isInteger(code) && code >= 100 && code <= 599)
        )
      )
    : [];

  const treat4xxAsFailures = Boolean(indicator.treat4xxAsFailures ?? indicator.count4xxAsFailures ?? false);

  return {
    type: 'http',
    pattern,
    flags,
    methodWhitelist,
    excludeRoutePatterns,
    treat4xxAsFailures,
    failureStatusCodes,
    successStatusCodes
  };
}

function normaliseAlerting(alerting = {}, defaults, context) {
  const burnRateWarning = Number.isFinite(alerting.burnRateWarning)
    ? Number(alerting.burnRateWarning)
    : defaults.warningBurnRate;
  const burnRateCritical = Number.isFinite(alerting.burnRateCritical)
    ? Number(alerting.burnRateCritical)
    : defaults.criticalBurnRate;
  const minRequests = Number.isFinite(alerting.minRequests)
    ? Math.max(0, Math.trunc(alerting.minRequests))
    : defaults.minRequests;

  if (burnRateWarning <= 0) {
    throw new Error(`SLO ${context} must configure a positive burnRateWarning.`);
  }
  if (burnRateCritical <= 0) {
    throw new Error(`SLO ${context} must configure a positive burnRateCritical.`);
  }
  if (burnRateCritical < burnRateWarning) {
    throw new Error(
      `SLO ${context} has burnRateCritical (${burnRateCritical}) below burnRateWarning (${burnRateWarning}).`
    );
  }

  return {
    burnRateWarning,
    burnRateCritical,
    minRequests
  };
}

function normaliseSloDefinition(definition, index, defaults) {
  if (!definition || typeof definition !== 'object') {
    throw new Error(`SLO definition at index ${index} must be an object.`);
  }

  const rawId = definition.id ?? definition.slug ?? definition.name ?? `slo-${index + 1}`;
  const id = String(rawId)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');

  if (!id) {
    throw new Error(`SLO definition at index ${index} must provide an identifier or name.`);
  }

  const name = String(definition.name ?? definition.title ?? id).trim();
  const description = String(definition.description ?? name).trim();
  const targetAvailability = typeof definition.targetAvailability === 'number'
    ? Math.min(0.9999, Math.max(0.001, definition.targetAvailability))
    : defaults.defaultTargetAvailability;
  const windowMinutes = Number.isFinite(definition.windowMinutes)
    ? Math.max(5, Math.trunc(definition.windowMinutes))
    : defaults.defaultWindowMinutes;

  const indicator = normaliseHttpIndicator(definition.indicator, id);
  const alerting = normaliseAlerting(definition.alerting ?? {}, defaults, id);
  const tags = Array.isArray(definition.tags)
    ? Array.from(
        new Set(
          definition.tags
            .map((tag) => (typeof tag === 'string' ? tag.trim() : null))
            .filter(Boolean)
        )
      )
    : [];
  const metadata = definition.metadata && typeof definition.metadata === 'object' ? definition.metadata : undefined;

  return {
    id,
    name,
    description,
    targetAvailability,
    windowMinutes,
    indicator,
    alerting,
    tags,
    metadata
  };
}

function computePercentile(values, percentile) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = percentile * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) {
    return Number(sorted[lower].toFixed(3));
  }
  const weight = rank - lower;
  const interpolated = sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
  return Number(interpolated.toFixed(3));
}

function clampAvailability(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return Number(Math.min(1, Math.max(0, value)).toFixed(6));
}

class SloRegistry {
  constructor({ bucketSizeMs = 60000, latencySampleSize = 512 } = {}) {
    this.bucketSizeMs = Math.max(60000, bucketSizeMs);
    this.latencySampleSize = Math.max(32, latencySampleSize);
    this.definitions = new Map();
    this.state = new Map();
  }

  reset() {
    this.definitions.clear();
    this.state.clear();
  }

  register(definition) {
    const defaultTargetAvailability =
      typeof definition.targetAvailability === 'number'
        ? definition.targetAvailability
        : env.observability.slo.defaults.targetAvailability;
    const defaultWindowMinutes = Number.isFinite(definition.windowMinutes)
      ? Math.trunc(definition.windowMinutes)
      : env.observability.slo.defaults.windowMinutes;

    const normalised = normaliseSloDefinition(definition, this.definitions.size, {
      defaultTargetAvailability,
      defaultWindowMinutes,
      warningBurnRate:
        definition.alerting?.burnRateWarning ?? env.observability.slo.defaults.warningBurnRate,
      criticalBurnRate:
        definition.alerting?.burnRateCritical ?? env.observability.slo.defaults.criticalBurnRate,
      minRequests: definition.alerting?.minRequests ?? env.observability.slo.defaults.minRequests
    });

    if (this.definitions.has(normalised.id)) {
      throw new Error(`Duplicate SLO identifier "${normalised.id}" detected.`);
    }

    this.definitions.set(normalised.id, {
      ...normalised,
      indicator: {
        ...normalised.indicator,
        matcher: toRegExp(normalised.indicator.pattern, normalised.indicator.flags, `SLO ${normalised.id} routePattern`),
        excludeMatchers: normalised.indicator.excludeRoutePatterns.map((entry) => ({
          pattern: entry.pattern,
          regex: toRegExp(entry.pattern, entry.flags, `SLO ${normalised.id} excludeRoutePatterns`)
        }))
      }
    });
  }

  recordHttpObservation({ route, method, statusCode, durationMs, timestamp = Date.now() }) {
    const normalisedRoute = typeof route === 'string' ? route : '';
    const normalisedMethod = typeof method === 'string' ? method.trim().toUpperCase() : '';
    const normalisedStatus = Number(statusCode);

    if (!normalisedRoute || !normalisedMethod || !Number.isInteger(normalisedStatus)) {
      return;
    }

    for (const definition of this.definitions.values()) {
      if (definition.indicator.type !== 'http') {
        continue;
      }
      if (!this.matchesHttpIndicator(definition, { route: normalisedRoute, method: normalisedMethod, statusCode: normalisedStatus })) {
        continue;
      }
      this.applyObservation(definition.id, {
        statusCode: normalisedStatus,
        durationMs: Number.isFinite(durationMs) && durationMs >= 0 ? Number(durationMs) : null,
        timestamp
      });
    }
  }

  matchesHttpIndicator(definition, { route, method, statusCode }) {
    const indicator = definition.indicator;
    if (indicator.matcher.global) {
      indicator.matcher.lastIndex = 0;
    }
    if (!indicator.matcher.test(route)) {
      return false;
    }

    if (
      Array.isArray(indicator.excludeMatchers) &&
      indicator.excludeMatchers.some((entry) => {
        if (entry.regex.global) {
          entry.regex.lastIndex = 0;
        }
        return entry.regex.test(route);
      })
    ) {
      return false;
    }

    if (indicator.methodWhitelist.length > 0) {
      if (!indicator.methodWhitelist.includes(method)) {
        return false;
      }
    }

    if (indicator.successStatusCodes.length > 0 && indicator.successStatusCodes.includes(statusCode)) {
      return true;
    }

    if (indicator.failureStatusCodes.length > 0 && indicator.failureStatusCodes.includes(statusCode)) {
      return true;
    }

    return true;
  }

  determineFailure(definition, statusCode) {
    const indicator = definition.indicator;
    if (indicator.successStatusCodes.includes(statusCode)) {
      return false;
    }
    if (indicator.failureStatusCodes.includes(statusCode)) {
      return true;
    }
    if (indicator.treat4xxAsFailures && statusCode >= 400 && statusCode < 500) {
      return true;
    }
    return statusCode >= 500;
  }

  applyObservation(id, { statusCode, durationMs, timestamp }) {
    const state = this.state.get(id) ?? {
      buckets: new Map(),
      sample: [],
      totalSamples: 0,
      observedSince: timestamp,
      lastUpdatedAt: timestamp
    };

    const bucketKey = Math.floor(timestamp / this.bucketSizeMs) * this.bucketSizeMs;
    const bucket = state.buckets.get(bucketKey) ?? { success: 0, error: 0 };
    state.buckets.set(bucketKey, bucket);

    const definition = this.definitions.get(id);
    const isFailure = this.determineFailure(definition, statusCode);
    if (isFailure) {
      bucket.error += 1;
    } else {
      bucket.success += 1;
    }

    if (Number.isFinite(durationMs) && durationMs >= 0) {
      this.addLatencySample(state, durationMs);
    }

    state.lastUpdatedAt = timestamp;
    if (timestamp < state.observedSince) {
      state.observedSince = timestamp;
    }

    this.pruneBuckets(state, definition, timestamp);
    this.state.set(id, state);
  }

  addLatencySample(state, durationMs) {
    state.totalSamples += 1;
    if (state.sample.length < this.latencySampleSize) {
      state.sample.push(durationMs);
      return;
    }

    const replacementIndex = Math.floor(Math.random() * state.totalSamples);
    if (replacementIndex < this.latencySampleSize) {
      state.sample[replacementIndex] = durationMs;
    }
  }

  pruneBuckets(state, definition, timestamp) {
    const threshold = timestamp - definition.windowMinutes * 60 * 1000;
    for (const [bucketKey] of state.buckets) {
      if (bucketKey < threshold) {
        state.buckets.delete(bucketKey);
      }
    }
  }

  getSummaries({ includeDefinition = false } = {}) {
    const now = Date.now();
    const summaries = [];
    for (const definition of this.definitions.values()) {
      summaries.push(this.getSummary(definition.id, { includeDefinition, now }));
    }
    return {
      generatedAt: new Date(now).toISOString(),
      slo: summaries
    };
  }

  getSummary(id, { includeDefinition = false, now = Date.now() } = {}) {
    const definition = this.definitions.get(id);
    if (!definition) {
      return null;
    }

    const state = this.state.get(id);
    if (!state) {
      return this.serializeSnapshot(definition, { includeDefinition, now, totals: { success: 0, error: 0 } });
    }

    const totals = { success: 0, error: 0 };
    const windowStart = now - definition.windowMinutes * 60 * 1000;
    for (const [bucketKey, counts] of state.buckets) {
      if (bucketKey >= windowStart) {
        totals.success += counts.success;
        totals.error += counts.error;
      }
    }

    return this.serializeSnapshot(definition, {
      includeDefinition,
      now,
      state,
      totals
    });
  }

  serializeSnapshot(definition, { includeDefinition, now, state, totals }) {
    const totalRequests = totals.success + totals.error;
    const availability = totalRequests > 0 ? totals.success / totalRequests : null;
    const errorBudget = totalRequests > 0 ? (1 - definition.targetAvailability) * totalRequests : null;
    const errorBudgetRemaining = errorBudget !== null ? Math.max(0, errorBudget - totals.error) : null;
    const burnRate = errorBudget && errorBudget > 0 ? Number((totals.error / errorBudget).toFixed(4)) : 0;
    const observedMinutes = state
      ? Math.ceil((now - Math.min(state.observedSince ?? now, now)) / 60000)
      : 0;
    const latencySamples = state?.sample ?? [];
    const latency = latencySamples.length
      ? {
          p50Ms: computePercentile(latencySamples, 0.5),
          p95Ms: computePercentile(latencySamples, 0.95),
          p99Ms: computePercentile(latencySamples, 0.99),
          averageMs: Number(
            (
              latencySamples.reduce((acc, value) => acc + value, 0) /
              latencySamples.length
            ).toFixed(3)
          ),
          maxMs: Number(Math.max(...latencySamples).toFixed(3)),
          minMs: Number(Math.min(...latencySamples).toFixed(3)),
          sampleSize: latencySamples.length
        }
      : null;

    const status = this.deriveStatus(definition, {
      availability,
      burnRate,
      totalRequests
    });

    const annotations = this.generateAnnotations(status, burnRate, definition.alerting);

    const snapshot = {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      targetAvailability: Number(definition.targetAvailability.toFixed(6)),
      windowMinutes: definition.windowMinutes,
      status,
      measuredAvailability: clampAvailability(availability),
      successCount: totals.success,
      errorCount: totals.error,
      totalRequests,
      errorBudget: errorBudget !== null ? Number(errorBudget.toFixed(3)) : null,
      errorBudgetRemaining: errorBudgetRemaining !== null ? Number(errorBudgetRemaining.toFixed(3)) : null,
      burnRate,
      latency,
      windowStart: new Date(now - definition.windowMinutes * 60 * 1000).toISOString(),
      windowEnd: new Date(now).toISOString(),
      updatedAt: state?.lastUpdatedAt ? new Date(state.lastUpdatedAt).toISOString() : null,
      observedMinutes,
      tags: definition.tags,
      annotations
    };

    if (includeDefinition) {
      snapshot.definition = {
        indicator: {
          type: definition.indicator.type,
          routePattern: definition.indicator.pattern,
          routePatternFlags: definition.indicator.flags,
          methodWhitelist: definition.indicator.methodWhitelist,
          excludeRoutePatterns: definition.indicator.excludeRoutePatterns.map((entry) => entry.pattern),
          treat4xxAsFailures: definition.indicator.treat4xxAsFailures,
          failureStatusCodes: definition.indicator.failureStatusCodes,
          successStatusCodes: definition.indicator.successStatusCodes
        },
        alerting: definition.alerting,
        metadata: definition.metadata ?? null,
        tags: definition.tags
      };
    }

    return snapshot;
  }

  deriveStatus(definition, { availability, burnRate, totalRequests }) {
    if (totalRequests === 0 || availability === null) {
      return 'no_data';
    }

    if (totalRequests < definition.alerting.minRequests) {
      return 'insufficient_data';
    }

    if (burnRate >= definition.alerting.burnRateCritical) {
      return 'critical';
    }

    if (burnRate >= definition.alerting.burnRateWarning) {
      return 'warning';
    }

    if (availability < definition.targetAvailability) {
      return 'breaching';
    }

    return 'healthy';
  }

  generateAnnotations(status, burnRate, alerting) {
    const annotations = [];
    if (status === 'critical') {
      annotations.push({
        severity: 'critical',
        code: 'burn-rate-critical',
        message: `Burn rate ${burnRate.toFixed(2)} exceeds critical threshold ${alerting.burnRateCritical}.`
      });
    } else if (status === 'warning') {
      annotations.push({
        severity: 'warning',
        code: 'burn-rate-warning',
        message: `Burn rate ${burnRate.toFixed(2)} exceeds warning threshold ${alerting.burnRateWarning}.`
      });
    } else if (status === 'breaching') {
      annotations.push({
        severity: 'warning',
        code: 'availability-breach',
        message: 'Availability dipped below target while error budget remains under thresholds.'
      });
    }
    return annotations;
  }
}

const sloConfig = env.observability.slo;

export const sloRegistry = new SloRegistry({
  bucketSizeMs: sloConfig.bucketMinutes * 60 * 1000,
  latencySampleSize: sloConfig.latencySampleSize
});

for (const definition of sloConfig.definitions) {
  sloRegistry.register(definition);
}

export function recordHttpSloObservation(event) {
  sloRegistry.recordHttpObservation(event);
}

export function getSloSummaries(options) {
  return sloRegistry.getSummaries(options);
}

export function getSloSummary(id, options) {
  return sloRegistry.getSummary(id, options);
}

export function resetSloRegistry(definitions = sloConfig.definitions) {
  sloRegistry.reset();
  for (const definition of definitions) {
    sloRegistry.register(definition);
  }
}

export default sloRegistry;
