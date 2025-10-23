import db from '../config/database.js';

function parseJsonColumn(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toDomain(row, overrides = []) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    enabled: Boolean(row.enabled),
    killSwitch: Boolean(row.kill_switch),
    rolloutStrategy: row.rollout_strategy,
    rolloutPercentage: row.rollout_percentage,
    segmentRules: parseJsonColumn(row.segment_rules, {}),
    variants: parseJsonColumn(row.variants, []),
    environments: parseJsonColumn(row.environments, []),
    metadata: parseJsonColumn(row.metadata, {}),
    tenantOverrides: overrides,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toTenantOverride(row) {
  return {
    id: row.id,
    flagId: row.flag_id,
    tenantId: row.tenant_id,
    environment: row.environment,
    state: row.override_state,
    variantKey: row.variant_key ?? null,
    metadata: parseJsonColumn(row.metadata, {}),
    updatedBy: row.updated_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRowPayload(definition) {
  return {
    key: definition.key,
    name: definition.name,
    description: definition.description,
    enabled: definition.enabled ?? true,
    kill_switch: definition.killSwitch ?? false,
    rollout_strategy: definition.rolloutStrategy ?? 'boolean',
    rollout_percentage: definition.rolloutPercentage ?? 100,
    segment_rules: JSON.stringify(definition.segmentRules ?? {}),
    variants: JSON.stringify(definition.variants ?? []),
    environments: JSON.stringify(definition.environments ?? []),
    metadata: JSON.stringify(definition.metadata ?? {})
  };
}

function sortOverrides(overrides = []) {
  return overrides
    .slice()
    .sort((a, b) => {
      if (a.environment === b.environment) {
        return a.tenantId.localeCompare(b.tenantId);
      }
      return a.environment.localeCompare(b.environment);
    });
}

export default class FeatureFlagModel {
  static async all(connection = db) {
    return this.allWithOverrides(connection);
  }

  static async findByKey(key, connection = db) {
    const row = await connection('feature_flags').where({ key }).first();
    if (!row) {
      return null;
    }

    const overrides = await connection('feature_flag_tenant_states')
      .where({ flag_id: row.id })
      .orderBy(['environment', 'tenant_id']);

    return toDomain(row, overrides.map(toTenantOverride));
  }

  static async allWithOverrides(connection = db) {
    const rows = await connection('feature_flags').select('*').orderBy('key');
    const ids = rows.map((row) => row.id);

    const overrides = ids.length
      ? await connection('feature_flag_tenant_states')
          .whereIn('flag_id', ids)
          .orderBy(['flag_id', 'environment', 'tenant_id'])
      : [];

    const grouped = overrides.reduce((acc, row) => {
      if (!acc.has(row.flag_id)) {
        acc.set(row.flag_id, []);
      }
      acc.get(row.flag_id).push(toTenantOverride(row));
      return acc;
    }, new Map());

    return rows.map((row) => toDomain(row, sortOverrides(grouped.get(row.id) ?? [])));
  }

  static async insert(definition, connection = db) {
    const payload = toRowPayload(definition);
    await connection('feature_flags').insert(payload);
    return this.findByKey(definition.key, connection);
  }

  static async update(id, definition, connection = db) {
    const payload = toRowPayload(definition);
    await connection('feature_flags').where({ id }).update({ ...payload, updated_at: connection.fn.now() });
    return this.findByKey(definition.key, connection);
  }
}

export class FeatureFlagAuditModel {
  static async record({ flagId, changeType, payload, changedBy = null }, connection = db) {
    return connection('feature_flag_audits').insert({
      flag_id: flagId,
      change_type: changeType,
      payload: JSON.stringify(payload ?? {}),
      changed_by: changedBy ?? null
    });
  }

  static async listForFlag(flagId, { limit = 20 } = {}, connection = db) {
    const rows = await connection('feature_flag_audits')
      .where({ flag_id: flagId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      flagId: row.flag_id,
      changeType: row.change_type,
      changedBy: row.changed_by ?? null,
      payload: parseJsonColumn(row.payload, {}),
      createdAt: row.created_at
    }));
  }

  static async listRecent({ limit = 25, since } = {}, connection = db) {
    const resolvedLimit = Math.max(1, Math.min(100, Number.parseInt(limit ?? 25, 10) || 25));
    const query = connection('feature_flag_audits as ffa')
      .leftJoin('feature_flags as ff', 'ff.id', 'ffa.flag_id')
      .select([
        'ffa.id',
        'ffa.flag_id as flagId',
        'ffa.change_type as changeType',
        'ffa.payload',
        'ffa.changed_by as changedBy',
        'ffa.created_at as createdAt',
        'ff.key as flagKey',
        'ff.name as flagName'
      ])
      .orderBy('ffa.created_at', 'desc')
      .limit(resolvedLimit);

    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        query.where('ffa.created_at', '>=', sinceDate);
      }
    }

    const rows = await query;
    return rows.map((row) => ({
      id: row.id,
      flagId: row.flagId,
      flagKey: row.flagKey ?? null,
      flagName: row.flagName ?? null,
      changeType: row.changeType,
      changedBy: row.changedBy ?? null,
      payload: parseJsonColumn(row.payload, {}),
      createdAt: row.createdAt
    }));
  }
}

export class FeatureFlagTenantStateModel {
  static async find({ flagId, tenantId, environment }, connection = db) {
    const row = await connection('feature_flag_tenant_states')
      .where({ flag_id: flagId, tenant_id: tenantId, environment })
      .first();
    return row ? toTenantOverride(row) : null;
  }

  static async upsert({ flagId, tenantId, environment, state, variantKey = null, metadata = {}, updatedBy }, connection = db) {
    const payload = {
      flag_id: flagId,
      tenant_id: tenantId,
      environment,
      override_state: state,
      variant_key: variantKey ?? null,
      metadata: JSON.stringify(metadata ?? {}),
      updated_by: updatedBy ?? null
    };

    const existing = await connection('feature_flag_tenant_states')
      .where({ flag_id: flagId, tenant_id: tenantId, environment })
      .first();

    if (existing) {
      await connection('feature_flag_tenant_states')
        .where({ id: existing.id })
        .update({ ...payload, updated_at: connection.fn.now() });
    } else {
      await connection('feature_flag_tenant_states').insert(payload);
    }

    return this.find({ flagId, tenantId, environment }, connection);
  }

  static async remove({ flagId, tenantId, environment }, connection = db) {
    return connection('feature_flag_tenant_states')
      .where({ flag_id: flagId, tenant_id: tenantId, environment })
      .del();
  }

  static async listForTenant(tenantId, { environment } = {}, connection = db) {
    let query = connection('feature_flag_tenant_states').where({ tenant_id: tenantId });
    if (environment) {
      query = query.andWhere({ environment });
    }
    const rows = await query.orderBy(['environment', 'flag_id']);
    return rows.map(toTenantOverride);
  }

  static async listForFlag(flagId, connection = db) {
    const rows = await connection('feature_flag_tenant_states')
      .where({ flag_id: flagId })
      .orderBy(['environment', 'tenant_id']);
    return rows.map(toTenantOverride);
  }
}
