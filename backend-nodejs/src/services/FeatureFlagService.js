import crypto from 'crypto';
import * as promClient from 'prom-client';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import ConfigurationEntryModel from '../models/ConfigurationEntryModel.js';
import FeatureFlagModel from '../models/FeatureFlagModel.js';
import { metricsRegistry } from '../observability/metrics.js';
import { distributedRuntimeCache } from './DistributedRuntimeCache.js';

function selectVariant(variants, bucket) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null;
  }

  const totalWeight = variants.reduce((sum, variant) => sum + Number(variant.weight ?? 0), 0);
  if (totalWeight <= 0) {
    return variants[0]?.key ?? null;
  }

  const normalizedBucket = ((bucket - 1) % totalWeight) + 1;
  let running = 0;
  for (const variant of variants) {
    running += Number(variant.weight ?? 0);
    if (normalizedBucket <= running) {
      return variant.key ?? null;
    }
  }

  return variants[variants.length - 1]?.key ?? null;
}

function computeBucket(flagKey, identifier) {
  if (!identifier) {
    return 100;
  }

  const hash = crypto.createHash('sha1').update(`${flagKey}:${identifier}`).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  return bucket + 1;
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinSchedule(schedule) {
  if (!schedule) {
    return true;
  }

  const now = new Date();
  const start = parseDate(schedule.start) ?? new Date(0);
  const end = parseDate(schedule.end) ?? null;

  if (start && now < start) {
    return false;
  }
  if (end && now > end) {
    return false;
  }
  return true;
}

const environmentAliases = {
  test: ['development']
};

function isEnvironmentAllowed(flagEnvironments, environment) {
  if (!Array.isArray(flagEnvironments) || flagEnvironments.length === 0) {
    return true;
  }

  if (flagEnvironments.includes(environment)) {
    return true;
  }

  const aliases = environmentAliases[environment] ?? [];
  return aliases.some((alias) => flagEnvironments.includes(alias));
}

function compareVersions(current, minimum) {
  if (!current || !minimum) {
    return true;
  }

  const normalise = (input) =>
    String(input)
      .split('.')
      .map((segment) => Number.parseInt(segment, 10) || 0);

  const currentSegments = normalise(current);
  const minimumSegments = normalise(minimum);
  const maxLength = Math.max(currentSegments.length, minimumSegments.length);

  for (let i = 0; i < maxLength; i += 1) {
    const currentValue = currentSegments[i] ?? 0;
    const minimumValue = minimumSegments[i] ?? 0;
    if (currentValue > minimumValue) {
      return true;
    }
    if (currentValue < minimumValue) {
      return false;
    }
  }
  return true;
}

function getAudienceExposureSet(audience = 'public') {
  switch (audience) {
    case 'internal':
      return new Set(['public', 'ops', 'internal', 'private']);
    case 'ops':
      return new Set(['public', 'ops']);
    case 'public':
    default:
      return new Set(['public']);
  }
}

function convertConfigValue(entry) {
  switch (entry.valueType) {
    case 'number':
      return Number(entry.value);
    case 'boolean':
      return entry.value === true || entry.value === 'true' || entry.value === '1';
    case 'json':
      try {
        return JSON.parse(entry.value);
      } catch (_error) {
        return null;
      }
    default:
      return entry.value;
  }
}

const featureFlagEvaluationMetricName = 'edulure_feature_flag_evaluations_total';
let featureFlagEvaluationMetric = metricsRegistry.getSingleMetric(featureFlagEvaluationMetricName);
if (!featureFlagEvaluationMetric) {
  featureFlagEvaluationMetric = new promClient.Counter({
    name: featureFlagEvaluationMetricName,
    help: 'Number of feature flag evaluations performed by the API',
    labelNames: ['flag_key', 'result', 'strategy', 'environment']
  });
  metricsRegistry.registerMetric(featureFlagEvaluationMetric);
}

const runtimeConfigMetricName = 'edulure_runtime_config_reads_total';
let runtimeConfigReadsMetric = metricsRegistry.getSingleMetric(runtimeConfigMetricName);
if (!runtimeConfigReadsMetric) {
  runtimeConfigReadsMetric = new promClient.Counter({
    name: runtimeConfigMetricName,
    help: 'Number of runtime configuration reads performed by the API',
    labelNames: ['config_key', 'environment', 'audience', 'result']
  });
  metricsRegistry.registerMetric(runtimeConfigReadsMetric);
}

export class FeatureFlagService {
  constructor({ loadFlags, cacheTtlMs, refreshIntervalMs, loggerInstance, distributedCache = null }) {
    this.loadFlags = loadFlags;
    this.cacheTtlMs = cacheTtlMs;
    this.refreshIntervalMs = refreshIntervalMs;
    this.logger = loggerInstance;
    this.distributedCache = distributedCache ?? null;
    this.cache = { flags: new Map(), expiresAt: 0, version: null, source: 'init' };
    this.refreshPromise = null;
    this.interval = null;
  }

  async start() {
    const hydrated = await this.tryHydrateFromDistributedCache('startup');
    if (!hydrated) {
      await this.refresh({ force: true, reason: 'startup' });
    }

    if (this.refreshIntervalMs > 0) {
      this.interval = setInterval(() => {
        this.refresh({ force: true, reason: 'interval' }).catch((error) => {
          this.logger.error({ err: error }, 'Failed to refresh feature flag cache');
        });
      }, this.refreshIntervalMs);
      this.interval.unref?.();
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = null;
  }

  applyFlags(flags, metadata = {}) {
    const map = new Map();
    if (Array.isArray(flags)) {
      for (const flag of flags) {
        if (flag && flag.key) {
          map.set(flag.key, flag);
        }
      }
    }

    this.cache.flags = map;
    this.cache.expiresAt = Date.now() + this.cacheTtlMs;
    this.cache.version = metadata.version ?? Date.now();
    this.cache.source = metadata.source ?? 'unknown';
  }

  async tryHydrateFromDistributedCache(reason = 'scheduled') {
    if (!this.distributedCache) {
      return false;
    }

    try {
      const snapshot = await this.distributedCache.readFeatureFlags();
      if (!snapshot || !Array.isArray(snapshot.value)) {
        return false;
      }

      this.applyFlags(snapshot.value, {
        version: snapshot.version ?? Date.now(),
        source: 'distributed'
      });

      this.logger.debug(
        { reason, count: snapshot.value.length, version: snapshot.version ?? null },
        'Feature flag cache hydrated from distributed snapshot'
      );
      return true;
    } catch (error) {
      this.logger.warn({ err: error, reason }, 'Failed to hydrate feature flag cache from distributed snapshot');
      return false;
    }
  }

  async refresh({ force = false, reason = 'scheduled' } = {}) {
    const now = Date.now();
    if (!force && this.cache.expiresAt > now) {
      return;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      if (!force) {
        const hydrated = await this.tryHydrateFromDistributedCache(reason);
        if (hydrated) {
          return;
        }
      }

      let lockToken = null;

      try {
        if (this.distributedCache) {
          lockToken = await this.distributedCache.acquireFeatureFlagLock();
          if (!lockToken) {
            const adopted = await this.tryHydrateFromDistributedCache(`${reason}-lock-contention`);
            if (adopted) {
              return;
            }
          }
        }

        const flags = await this.loadFlags();
        this.applyFlags(flags, { version: Date.now(), source: 'primary' });
        this.logger.debug(
          { count: this.cache.flags.size, reason, source: 'primary' },
          'Feature flag cache refreshed from primary store'
        );

        if (this.distributedCache) {
          await this.distributedCache.writeFeatureFlags(flags);
        }
      } catch (error) {
        this.logger.error({ err: error, reason }, 'Failed to refresh feature flag cache');
        throw error;
      } finally {
        if (lockToken && this.distributedCache) {
          await this.distributedCache.releaseFeatureFlagLock(lockToken);
        }
      }
    })();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  listFlags() {
    return Array.from(this.cache.flags.values());
  }

  evaluateAll(context = {}, { includeDefinition = false } = {}) {
    const results = {};
    for (const flag of this.cache.flags.values()) {
      results[flag.key] = this.evaluate(flag.key, context, { includeDefinition });
    }
    return results;
  }

  evaluate(flagKey, context = {}, { includeDefinition = false } = {}) {
    const now = Date.now();
    if (this.cache.expiresAt <= now) {
      this.refresh().catch((error) => {
        this.logger.error({ err: error, flag: flagKey }, 'Failed to refresh feature flag cache lazily');
      });
    }

    const flag = this.cache.flags.get(flagKey);
    if (!flag) {
      featureFlagEvaluationMetric.inc({ flag_key: flagKey, result: 'missing', strategy: 'unknown', environment: context.environment ?? env.nodeEnv });
      return {
        key: flagKey,
        enabled: false,
        reason: 'flag-not-found',
        variant: null,
        strategy: 'unknown',
        evaluatedAt: new Date().toISOString()
      };
    }

    const evaluation = this.evaluateDefinition(flag, context);
    if (includeDefinition) {
      evaluation.definition = flag;
    }
    return evaluation;
  }

  evaluateDefinition(flag, context) {
    const environment = context.environment ?? env.nodeEnv;
    const traceId = context.traceId ?? null;
    const targetIdentifier =
      context.targetId ?? context.userId ?? context.sessionId ?? context.tenantId ?? context.accountId ?? traceId ?? null;
    const bucket = computeBucket(flag.key, targetIdentifier);

    let enabled = true;
    let reason = 'enabled';

    if (flag.killSwitch) {
      enabled = false;
      reason = 'kill-switch';
    }

    if (enabled && !flag.enabled) {
      enabled = false;
      reason = 'disabled';
    }

    if (enabled && Array.isArray(flag.environments) && flag.environments.length > 0) {
      if (!isEnvironmentAllowed(flag.environments, environment)) {
        enabled = false;
        reason = 'environment-not-allowed';
      }
    }

    const rules = flag.segmentRules ?? {};

    if (enabled && rules.schedule && !isWithinSchedule(rules.schedule)) {
      enabled = false;
      reason = 'outside-schedule';
    }

    if (enabled) {
      if (flag.rolloutStrategy === 'percentage') {
        enabled = bucket <= Number(flag.rolloutPercentage ?? 0);
        reason = enabled ? 'enabled' : 'percentage-threshold';
      } else if (flag.rolloutStrategy === 'segment') {
        const matchesSegments = this.matchesSegmentRules(rules, context, bucket);
        enabled = matchesSegments;
        if (!enabled) {
          reason = 'segment-mismatch';
        }
      } else if (flag.rolloutStrategy === 'schedule') {
        const percentage = Number(flag.rolloutPercentage ?? 100);
        enabled = bucket <= percentage;
        reason = enabled ? 'enabled' : 'schedule-threshold';
      }
    }

    const variant = enabled ? selectVariant(flag.variants, bucket) : null;

    featureFlagEvaluationMetric.inc({
      flag_key: flag.key,
      result: enabled ? 'enabled' : reason,
      strategy: flag.rolloutStrategy,
      environment
    });

    return {
      key: flag.key,
      enabled,
      reason,
      variant,
      bucket,
      strategy: flag.rolloutStrategy,
      evaluatedAt: new Date().toISOString()
    };
  }

  matchesSegmentRules(rules, context, bucket) {
    if (!rules || typeof rules !== 'object') {
      return true;
    }

    const role = context.role ?? context.userRole ?? null;
    if (Array.isArray(rules.allowedRoles) && rules.allowedRoles.length > 0) {
      if (!role || !rules.allowedRoles.includes(role)) {
        return false;
      }
    }

    if (Array.isArray(rules.deniedRoles) && rules.deniedRoles.length > 0) {
      if (role && rules.deniedRoles.includes(role)) {
        return false;
      }
    }

    const tenantId = context.tenantId ?? null;
    if (Array.isArray(rules.allowedTenants) && rules.allowedTenants.length > 0) {
      if (!tenantId || !rules.allowedTenants.includes(tenantId)) {
        return false;
      }
    }

    if (Array.isArray(rules.deniedTenants) && rules.deniedTenants.length > 0) {
      if (tenantId && rules.deniedTenants.includes(tenantId)) {
        return false;
      }
    }

    if (Array.isArray(rules.allowedUsers) && rules.allowedUsers.length > 0) {
      const userId = context.userId ?? null;
      if (!userId || !rules.allowedUsers.includes(userId)) {
        return false;
      }
    }

    if (rules.minAppVersion) {
      const currentVersion = context.appVersion ?? context.attributes?.appVersion ?? null;
      if (!compareVersions(currentVersion, rules.minAppVersion)) {
        return false;
      }
    }

    if (rules.percentage !== undefined) {
      const percentage = Number(rules.percentage);
      if (!(bucket <= percentage)) {
        return false;
      }
    }

    if (rules.allowedAttributes && typeof rules.allowedAttributes === 'object') {
      const attributes = context.attributes ?? {};
      for (const [key, allowedValues] of Object.entries(rules.allowedAttributes)) {
        const value = attributes[key];
        if (Array.isArray(allowedValues) && allowedValues.length > 0) {
          if (!allowedValues.includes(value)) {
            return false;
          }
        }
      }
    }

    if (rules.customEvaluator && typeof rules.customEvaluator === 'string') {
      this.logger.warn({ rule: rules.customEvaluator }, 'Custom feature flag evaluator reference ignored in runtime service');
    }

    return true;
  }
}

export class RuntimeConfigService {
  constructor({ loadEntries, cacheTtlMs, refreshIntervalMs, loggerInstance, distributedCache = null }) {
    this.loadEntries = loadEntries;
    this.cacheTtlMs = cacheTtlMs;
    this.refreshIntervalMs = refreshIntervalMs;
    this.logger = loggerInstance;
    this.distributedCache = distributedCache ?? null;
    this.cache = { entries: new Map(), expiresAt: 0, version: null, source: 'init' };
    this.refreshPromise = null;
    this.interval = null;
  }

  async start() {
    const hydrated = await this.tryHydrateFromDistributedCache('startup');
    if (!hydrated) {
      await this.refresh({ force: true, reason: 'startup' });
    }

    if (this.refreshIntervalMs > 0) {
      this.interval = setInterval(() => {
        this.refresh({ force: true, reason: 'interval' }).catch((error) => {
          this.logger.error({ err: error }, 'Failed to refresh runtime configuration cache');
        });
      }, this.refreshIntervalMs);
      this.interval.unref?.();
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = null;
  }

  buildEntryMap(entries) {
    const map = new Map();
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (!entry || !entry.key) {
          continue;
        }

        if (!map.has(entry.key)) {
          map.set(entry.key, []);
        }

        map.get(entry.key).push(entry);
      }
    }

    for (const entryList of map.values()) {
      entryList.sort((a, b) => {
        if (a.environmentScope === b.environmentScope) {
          return 0;
        }
        if (a.environmentScope === 'global') {
          return 1;
        }
        if (b.environmentScope === 'global') {
          return -1;
        }
        return a.environmentScope.localeCompare(b.environmentScope);
      });
    }

    return map;
  }

  applyEntries(entries, metadata = {}) {
    const map = this.buildEntryMap(entries);
    this.cache.entries = map;
    this.cache.expiresAt = Date.now() + this.cacheTtlMs;
    this.cache.version = metadata.version ?? Date.now();
    this.cache.source = metadata.source ?? 'unknown';
  }

  async tryHydrateFromDistributedCache(reason = 'scheduled') {
    if (!this.distributedCache) {
      return false;
    }

    try {
      const snapshot = await this.distributedCache.readRuntimeConfig();
      if (!snapshot || !Array.isArray(snapshot.value)) {
        return false;
      }

      this.applyEntries(snapshot.value, {
        version: snapshot.version ?? Date.now(),
        source: 'distributed'
      });

      this.logger.debug(
        { reason, keys: this.cache.entries.size, version: snapshot.version ?? null },
        'Runtime configuration cache hydrated from distributed snapshot'
      );
      return true;
    } catch (error) {
      this.logger.warn({ err: error, reason }, 'Failed to hydrate runtime configuration cache from distributed snapshot');
      return false;
    }
  }

  async refresh({ force = false, reason = 'scheduled' } = {}) {
    const now = Date.now();
    if (!force && this.cache.expiresAt > now) {
      return;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      if (!force) {
        const hydrated = await this.tryHydrateFromDistributedCache(reason);
        if (hydrated) {
          return;
        }
      }

      let lockToken = null;

      try {
        if (this.distributedCache) {
          lockToken = await this.distributedCache.acquireRuntimeConfigLock();
          if (!lockToken) {
            const adopted = await this.tryHydrateFromDistributedCache(`${reason}-lock-contention`);
            if (adopted) {
              return;
            }
          }
        }

        const entries = await this.loadEntries();
        this.applyEntries(entries, { version: Date.now(), source: 'primary' });
        this.logger.debug(
          { keys: this.cache.entries.size, reason, source: 'primary' },
          'Runtime configuration cache refreshed from primary store'
        );

        if (this.distributedCache) {
          await this.distributedCache.writeRuntimeConfig(entries);
        }
      } catch (error) {
        this.logger.error({ err: error, reason }, 'Failed to refresh runtime configuration cache');
        throw error;
      } finally {
        if (lockToken && this.distributedCache) {
          await this.distributedCache.releaseRuntimeConfigLock(lockToken);
        }
      }
    })();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  getValue(key, { environment = env.nodeEnv, audience = 'public', includeSensitive = false, defaultValue = null } = {}) {
    if (this.cache.expiresAt <= Date.now()) {
      this.refresh().catch((error) => {
        this.logger.error({ err: error, key }, 'Failed to refresh runtime configuration cache lazily');
      });
    }

    const entry = this.resolveEntry(key, environment, audience, includeSensitive);
    if (!entry) {
      runtimeConfigReadsMetric.inc({
        config_key: key,
        environment,
        audience,
        result: 'missing'
      });
      return defaultValue;
    }

    runtimeConfigReadsMetric.inc({
      config_key: key,
      environment,
      audience,
      result: 'hit'
    });

    if (entry.sensitive && !includeSensitive) {
      return null;
    }

    return convertConfigValue(entry);
  }

  listForAudience(environment = env.nodeEnv, { audience = 'public', includeSensitive = false } = {}) {
    const exposures = getAudienceExposureSet(audience);
    const result = {};
    for (const [key, entries] of this.cache.entries.entries()) {
      const entry = this.findEntry(entries, environment, exposures, includeSensitive);
      if (entry) {
        result[key] = {
          value: entry.sensitive && !includeSensitive ? null : convertConfigValue(entry),
          sensitive: entry.sensitive,
          exposureLevel: entry.exposureLevel,
          environmentScope: entry.environmentScope,
          description: entry.description
        };
      }
    }
    return result;
  }

  resolveEntry(key, environment, audience, includeSensitive) {
    const entries = this.cache.entries.get(key);
    if (!entries) {
      return null;
    }

    const exposures = getAudienceExposureSet(audience);
    return this.findEntry(entries, environment, exposures, includeSensitive);
  }

  findEntry(entries, environment, exposures, includeSensitive) {
    const searchScopes = [environment, 'global'];
    for (const scope of searchScopes) {
      const scopedEntry = entries.find((entry) => entry.environmentScope === scope && exposures.has(entry.exposureLevel));
      if (scopedEntry) {
        if (scopedEntry.exposureLevel === 'private' && !includeSensitive) {
          continue;
        }
        if (scopedEntry.sensitive && !includeSensitive) {
          continue;
        }
        return scopedEntry;
      }
    }
    return null;
  }
}

export const featureFlagService = new FeatureFlagService({
  loadFlags: () => FeatureFlagModel.all(),
  cacheTtlMs: env.runtimeConfig.featureFlagCacheTtlMs,
  refreshIntervalMs: env.runtimeConfig.featureFlagRefreshIntervalMs,
  loggerInstance: logger.child({ service: 'FeatureFlagService' }),
  distributedCache: distributedRuntimeCache
});

export const runtimeConfigService = new RuntimeConfigService({
  loadEntries: () => ConfigurationEntryModel.all(),
  cacheTtlMs: env.runtimeConfig.configCacheTtlMs,
  refreshIntervalMs: env.runtimeConfig.configRefreshIntervalMs,
  loggerInstance: logger.child({ service: 'RuntimeConfigService' }),
  distributedCache: distributedRuntimeCache
});
