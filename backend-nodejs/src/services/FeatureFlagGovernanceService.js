import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import FeatureFlagModel, {
  FeatureFlagAuditModel,
  FeatureFlagTenantStateModel
} from '../models/FeatureFlagModel.js';
import featureFlagManifest from '../config/featureFlagManifest.js';
import { featureFlagService } from './FeatureFlagService.js';

function stableStringify(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value.map((entry) => JSON.parse(stableStringify(entry))));
  }

  const sorted = Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = JSON.parse(stableStringify(value[key]));
      return acc;
    }, {});

  return JSON.stringify(sorted);
}

function normaliseMetadata(metadata = {}) {
  const cleaned = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) {
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

function normaliseOverrideState(state) {
  if (!state) {
    return null;
  }

  const lowered = String(state).toLowerCase();
  if (['enabled', 'on', 'true', 'force_on', 'forced_on'].includes(lowered)) {
    return 'forced_on';
  }
  if (['disabled', 'off', 'false', 'force_off', 'forced_off'].includes(lowered)) {
    return 'forced_off';
  }
  if (['inherited', 'default', 'unset', 'remove'].includes(lowered)) {
    return 'inherited';
  }
  return lowered;
}

function resolveOverrideMatch(overrides = [], tenantId, environment) {
  if (!tenantId) {
    return null;
  }
  const normalisedEnv = (environment ?? 'production').toLowerCase();
  const envMatches = overrides.filter((override) => override.environment?.toLowerCase() === normalisedEnv);
  const wildcardEnv = overrides.filter((override) => ['all', 'global', '*'].includes((override.environment ?? '').toLowerCase()));
  const candidates = [...envMatches, ...wildcardEnv];
  return (
    candidates.find((override) => override.tenantId === tenantId) ??
    candidates.find((override) => override.tenantId === '*') ??
    null
  );
}

export class FeatureFlagGovernanceService {
  constructor({
    manifest = featureFlagManifest,
    featureFlagModel = FeatureFlagModel,
    tenantStateModel = FeatureFlagTenantStateModel,
    auditModel = FeatureFlagAuditModel,
    featureFlagSvc = featureFlagService,
    loggerInstance = logger.child({ service: 'FeatureFlagGovernanceService' })
  } = {}) {
    this.manifest = Array.isArray(manifest) ? manifest : [];
    this.featureFlagModel = featureFlagModel;
    this.tenantStateModel = tenantStateModel;
    this.auditModel = auditModel;
    this.featureFlagService = featureFlagSvc;
    this.logger = loggerInstance;
    this.config = {
      syncOnBootstrap: env.featureFlags?.syncOnBootstrap ?? true,
      defaultActor: env.featureFlags?.bootstrapActor ?? 'system-bootstrap',
      defaultEnvironment: env.featureFlags?.defaultEnvironment ?? env.nodeEnv ?? 'production'
    };
  }

  normaliseDefinition(definition) {
    if (!definition || !definition.key) {
      throw new Error('Feature flag definition is missing a key.');
    }

    const metadata = normaliseMetadata({
      ...(definition.metadata ?? {}),
      owner: definition.metadata?.owner ?? definition.owner ?? null,
      tags: definition.metadata?.tags ?? definition.tags ?? [],
      runbook: definition.metadata?.runbook ?? definition.runbook ?? null,
      docs: definition.metadata?.docs ?? definition.docs ?? null,
      escalationChannel: definition.metadata?.escalationChannel ?? definition.escalationChannel ?? null,
      jiraKey: definition.metadata?.jiraKey ?? definition.jiraKey ?? null,
      experimentId: definition.metadata?.experimentId ?? definition.experimentId ?? null
    });

    const environments = Array.isArray(definition.environments) && definition.environments.length
      ? definition.environments
      : ['development', 'staging', 'production'];

    return {
      key: definition.key,
      name: definition.name,
      description: definition.description,
      enabled: definition.enabled !== false,
      killSwitch: definition.killSwitch === true,
      rolloutStrategy: definition.rolloutStrategy ?? 'boolean',
      rolloutPercentage: definition.rolloutPercentage ?? 100,
      segmentRules: definition.segmentRules ?? {},
      variants: definition.variants ?? [],
      environments,
      metadata,
      tenantDefaults: Array.isArray(definition.tenantDefaults) ? definition.tenantDefaults : []
    };
  }

  computeDiff(existing, desired) {
    const changes = {};
    const fields = ['name', 'description', 'enabled', 'killSwitch', 'rolloutStrategy', 'rolloutPercentage'];
    for (const field of fields) {
      if (existing[field] !== desired[field]) {
        changes[field] = { previous: existing[field], next: desired[field] };
      }
    }

    if (stableStringify(existing.segmentRules) !== stableStringify(desired.segmentRules)) {
      changes.segmentRules = { previous: existing.segmentRules, next: desired.segmentRules };
    }

    if (stableStringify(existing.variants) !== stableStringify(desired.variants)) {
      changes.variants = { previous: existing.variants, next: desired.variants };
    }

    if (stableStringify(existing.environments) !== stableStringify(desired.environments)) {
      changes.environments = { previous: existing.environments, next: desired.environments };
    }

    if (stableStringify(existing.metadata) !== stableStringify(desired.metadata)) {
      changes.metadata = { previous: existing.metadata, next: desired.metadata };
    }

    return { changed: Object.keys(changes).length > 0, changes };
  }

  normaliseTenantDefault(flagKey, overrideDefinition) {
    if (!overrideDefinition?.tenantId) {
      throw new Error(`Manifest tenant default for flag "${flagKey}" is missing tenantId.`);
    }

    const state = normaliseOverrideState(overrideDefinition.state ?? 'enabled');
    if (state === 'inherited' || !state) {
      throw new Error(`Manifest tenant default for flag "${flagKey}" must resolve to a concrete state.`);
    }

    const environment = (overrideDefinition.environment ?? 'production').toLowerCase();
    const metadata = normaliseMetadata({
      ...(overrideDefinition.metadata ?? {}),
      managed: true,
      notes: overrideDefinition.notes ?? overrideDefinition.metadata?.notes ?? null
    });

    return {
      tenantId: overrideDefinition.tenantId,
      environment,
      state,
      variantKey: overrideDefinition.variantKey ?? null,
      metadata
    };
  }

  async syncDefinitions({ actor = this.config.defaultActor, dryRun = false } = {}) {
    const summary = {
      actor,
      total: this.manifest.length,
      created: [],
      updated: [],
      unchanged: [],
      overridesCreated: [],
      overridesUpdated: [],
      orphaned: []
    };

    const execute = async (connection) => {
      const desiredDefinitions = this.manifest.map((entry) => this.normaliseDefinition(entry));
      const existingFlags = await this.featureFlagModel.allWithOverrides(connection);
      const existingByKey = new Map(existingFlags.map((flag) => [flag.key, flag]));
      const manifestKeys = new Set(desiredDefinitions.map((entry) => entry.key));

      for (const flag of existingFlags) {
        if (!manifestKeys.has(flag.key)) {
          summary.orphaned.push(flag.key);
        }
      }

      for (const desired of desiredDefinitions) {
        const existing = existingByKey.get(desired.key);
        if (!existing) {
          summary.created.push(desired.key);
          if (!dryRun) {
            const created = await this.featureFlagModel.insert(desired, connection);
            await this.auditModel.record(
              {
                flagId: created.id,
                changeType: 'definition-created',
                payload: { definition: desired },
                changedBy: actor
              },
              connection
            );
            await this.ensureManifestOverrides(created, desired, { actor, connection, summary, dryRun });
          }
          continue;
        }

        const diff = this.computeDiff(existing, desired);
        if (diff.changed) {
          summary.updated.push({ key: desired.key, changes: diff.changes });
          if (!dryRun) {
            const updated = await this.featureFlagModel.update(existing.id, desired, connection);
            await this.auditModel.record(
              {
                flagId: updated.id,
                changeType: 'definition-updated',
                payload: diff.changes,
                changedBy: actor
              },
              connection
            );
          }
        } else {
          summary.unchanged.push(desired.key);
        }

        if (!dryRun) {
          await this.ensureManifestOverrides(existing, desired, { actor, connection, summary, dryRun });
        }
      }

      return summary;
    };

    const result = dryRun ? await execute(db) : await db.transaction(execute);

    if (!dryRun) {
      await this.featureFlagService.refresh({ force: true, reason: 'governance-sync' });
      this.logger.info({ summary: result }, 'Feature flag manifest synchronised');
    } else {
      this.logger.info({ summary: result }, 'Feature flag manifest dry-run planned');
    }

    return result;
  }

  async ensureManifestOverrides(flag, desiredDefinition, { actor, connection, summary }) {
    const defaults = Array.isArray(desiredDefinition.tenantDefaults) ? desiredDefinition.tenantDefaults : [];
    for (const entry of defaults) {
      const normalised = this.normaliseTenantDefault(flag.key, entry);
      const existingOverride = resolveOverrideMatch(
        flag.tenantOverrides ?? [],
        normalised.tenantId,
        normalised.environment
      );

      if (!existingOverride) {
        const created = await this.tenantStateModel.upsert(
          {
            flagId: flag.id,
            tenantId: normalised.tenantId,
            environment: normalised.environment,
            state: normalised.state,
            variantKey: normalised.variantKey,
            metadata: normalised.metadata,
            updatedBy: actor
          },
          connection
        );
        summary.overridesCreated.push({
          flagKey: flag.key,
          tenantId: created.tenantId,
          environment: created.environment,
          state: created.state
        });
        await this.auditModel.record(
          {
            flagId: flag.id,
            changeType: 'tenant-override-created',
            payload: {
              tenantId: created.tenantId,
              environment: created.environment,
              state: created.state,
              metadata: created.metadata
            },
            changedBy: actor
          },
          connection
        );
        continue;
      }

      const diffNeeded =
        existingOverride.state !== normalised.state ||
        existingOverride.variantKey !== normalised.variantKey ||
        stableStringify(existingOverride.metadata) !== stableStringify(normalised.metadata);

      if (diffNeeded) {
        const updated = await this.tenantStateModel.upsert(
          {
            flagId: flag.id,
            tenantId: normalised.tenantId,
            environment: normalised.environment,
            state: normalised.state,
            variantKey: normalised.variantKey,
            metadata: normalised.metadata,
            updatedBy: actor
          },
          connection
        );
        summary.overridesUpdated.push({
          flagKey: flag.key,
          tenantId: updated.tenantId,
          environment: updated.environment,
          state: updated.state
        });
        await this.auditModel.record(
          {
            flagId: flag.id,
            changeType: 'tenant-override-updated',
            payload: {
              tenantId: updated.tenantId,
              environment: updated.environment,
              state: updated.state,
              metadata: updated.metadata
            },
            changedBy: actor
          },
          connection
        );
      }
    }
  }

  async ensureBootstrapSync({ actor = this.config.defaultActor, force = false } = {}) {
    if (!force && !this.config.syncOnBootstrap) {
      this.logger.info('Feature flag bootstrap sync disabled via configuration.');
      return { skipped: true };
    }

    const summary = await this.syncDefinitions({ actor, dryRun: false });
    return { skipped: false, summary };
  }

  async applyTenantOverride({
    flagKey,
    tenantId,
    environment = this.config.defaultEnvironment,
    state,
    variantKey = null,
    metadata = {},
    notes,
    actor = this.config.defaultActor,
    userContext = {}
  }) {
    const normalisedState = normaliseOverrideState(state);
    if (!normalisedState) {
      throw new Error('Override state is required.');
    }

    if (normalisedState === 'inherited') {
      return this.removeTenantOverride({ flagKey, tenantId, environment, actor, userContext });
    }

    if (!tenantId) {
      throw new Error('tenantId is required when applying an override.');
    }

    const lowerEnvironment = environment.toLowerCase();

    const result = await db.transaction(async (trx) => {
      const flag = await this.featureFlagModel.findByKey(flagKey, trx);
      if (!flag) {
        throw new Error(`Feature flag "${flagKey}" not found.`);
      }

      const override = await this.tenantStateModel.upsert(
        {
          flagId: flag.id,
          tenantId,
          environment: lowerEnvironment,
          state: normalisedState,
          variantKey,
          metadata: normaliseMetadata({ ...metadata, notes }),
          updatedBy: actor
        },
        trx
      );

      await this.auditModel.record(
        {
          flagId: flag.id,
          changeType: 'tenant-override-applied',
          payload: {
            tenantId,
            environment: lowerEnvironment,
            state: normalisedState,
            variantKey,
            metadata: override.metadata
          },
          changedBy: actor
        },
        trx
      );

      return { flag, override };
    });

    await this.featureFlagService.refresh({ force: true, reason: 'tenant-override-applied' });

    const evaluation = this.featureFlagService.evaluate(
      flagKey,
      {
        environment: environment.toLowerCase(),
        tenantId,
        userId: userContext.userId ?? null,
        role: userContext.role ?? null,
        attributes: userContext.attributes ?? {}
      },
      { includeDefinition: true }
    );

    return {
      override: result.override,
      evaluation
    };
  }

  async removeTenantOverride({
    flagKey,
    tenantId,
    environment = this.config.defaultEnvironment,
    actor = this.config.defaultActor,
    userContext = {}
  }) {
    if (!tenantId) {
      throw new Error('tenantId is required when removing an override.');
    }

    const lowerEnvironment = environment.toLowerCase();

    await db.transaction(async (trx) => {
      const flag = await this.featureFlagModel.findByKey(flagKey, trx);
      if (!flag) {
        throw new Error(`Feature flag "${flagKey}" not found.`);
      }

      const removed = await this.tenantStateModel.remove({
        flagId: flag.id,
        tenantId,
        environment: lowerEnvironment
      }, trx);

      if (removed) {
        await this.auditModel.record(
          {
            flagId: flag.id,
            changeType: 'tenant-override-removed',
            payload: { tenantId, environment: lowerEnvironment },
            changedBy: actor
          },
          trx
        );
      }
    });

    await this.featureFlagService.refresh({ force: true, reason: 'tenant-override-removed' });

    const evaluation = this.featureFlagService.evaluate(
      flagKey,
      {
        environment: environment.toLowerCase(),
        tenantId,
        userId: userContext.userId ?? null,
        role: userContext.role ?? null,
        attributes: userContext.attributes ?? {}
      },
      { includeDefinition: true }
    );

    return { evaluation };
  }

  async generateTenantSnapshot({
    tenantId = null,
    environment = this.config.defaultEnvironment,
    includeInactive = true,
    userContext = {}
  } = {}) {
    const lowerEnvironment = environment.toLowerCase();
    const flags = await this.featureFlagModel.allWithOverrides();

    const evaluationContext = {
      environment: lowerEnvironment,
      tenantId,
      userId: userContext.userId ?? null,
      role: userContext.role ?? null,
      attributes: userContext.attributes ?? {}
    };

    const evaluations = this.featureFlagService.evaluateAll(evaluationContext, { includeDefinition: true });
    const items = [];

    for (const flag of flags) {
      const evaluation = evaluations[flag.key] ?? {
        key: flag.key,
        enabled: false,
        reason: 'flag-not-found',
        variant: null,
        environment: lowerEnvironment,
        evaluatedAt: new Date().toISOString(),
        overridden: false,
        override: null
      };

      const override = tenantId
        ? resolveOverrideMatch(flag.tenantOverrides ?? [], tenantId, lowerEnvironment)
        : null;

      if (!includeInactive && !evaluation.enabled) {
        continue;
      }

      items.push({
        key: flag.key,
        name: flag.name,
        description: flag.description,
        enabled: evaluation.enabled,
        reason: evaluation.reason,
        variant: evaluation.variant ?? null,
        overridden: evaluation.overridden ?? false,
        override: evaluation.override ?? (override ?? null),
        rollout: {
          strategy: flag.rolloutStrategy,
          percentage: flag.rolloutPercentage,
          segmentRules: flag.segmentRules
        },
        environments: flag.environments,
        metadata: flag.metadata,
        managedTenantDefaults: (flag.tenantOverrides ?? []).filter((entry) => entry.metadata?.managed),
        evaluatedAt: evaluation.evaluatedAt
      });
    }

    const summary = {
      total: items.length,
      enabled: items.filter((item) => item.enabled).length,
      disabled: items.filter((item) => !item.enabled).length,
      overridden: items.filter((item) => item.overridden).length
    };

    return {
      tenantId,
      environment: lowerEnvironment,
      generatedAt: new Date().toISOString(),
      summary,
      flags: items
    };
  }
}

export const featureFlagGovernanceService = new FeatureFlagGovernanceService();

export default featureFlagGovernanceService;
