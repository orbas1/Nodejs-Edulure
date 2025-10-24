import db from '../config/database.js';
import { ensureNonEmptyString, safeJsonParse, safeJsonStringify } from '../utils/modelUtils.js';

const TABLE = 'environment_blueprints';

function normaliseKey(value, { fieldName, maxLength = 120, transform } = {}) {
  const normalised = ensureNonEmptyString(value, { fieldName, maxLength });
  if (typeof transform === 'function') {
    return transform(normalised);
  }
  return normalised;
}

function normaliseEnvironmentName(value) {
  return normaliseKey(value, {
    fieldName: 'environmentName',
    maxLength: 120,
    transform: (input) => input.trim().toLowerCase()
  });
}

function normaliseProvider(value) {
  return normaliseKey(value, {
    fieldName: 'environmentProvider',
    maxLength: 120,
    transform: (input) => input.trim().toLowerCase()
  });
}

function normaliseAlarmOutputs(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set();
  for (const entry of value) {
    if (entry === null || entry === undefined) {
      continue;
    }
    const trimmed = String(entry).trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }

  return Array.from(unique).sort();
}

function normaliseMetadata(value) {
  const parsed = safeJsonParse(value, {});
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed;
}

export default class EnvironmentBlueprintModel {
  static tableName = TABLE;

  static deserialize(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      blueprintKey: row.blueprint_key,
      environmentName: row.environment_name,
      environmentProvider: row.environment_provider,
      serviceName: row.service_name,
      blueprintVersion: row.blueprint_version,
      blueprintHash: row.blueprint_hash,
      modulePath: row.module_path,
      moduleHash: row.module_hash,
      ssmParameterName: row.ssm_parameter_name,
      runtimeEndpoint: row.runtime_endpoint,
      observabilityDashboardPath: row.observability_dashboard_path,
      observabilityDashboardHash: row.observability_dashboard_hash,
      alarmOutputs: safeJsonParse(row.alarm_outputs, []),
      metadata: normaliseMetadata(row.metadata),
      recordedAt: row.recorded_at instanceof Date ? row.recorded_at : new Date(row.recorded_at),
      createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at)
    };
  }

  static serialize(payload) {
    const blueprintKey = normaliseKey(payload.blueprintKey, {
      fieldName: 'blueprintKey',
      maxLength: 120,
      transform: (input) => input.trim()
    });
    const environmentName = normaliseEnvironmentName(payload.environmentName);
    const environmentProvider = normaliseProvider(payload.environmentProvider ?? 'aws');
    const serviceName = normaliseKey(payload.serviceName ?? blueprintKey, {
      fieldName: 'serviceName',
      maxLength: 160,
      transform: (input) => input.trim()
    });
    const blueprintVersion = normaliseKey(payload.blueprintVersion ?? '1.0', {
      fieldName: 'blueprintVersion',
      maxLength: 40,
      transform: (input) => input.trim()
    });
    const blueprintHash = normaliseKey(payload.blueprintHash, {
      fieldName: 'blueprintHash',
      maxLength: 128,
      transform: (input) => input.trim()
    });
    const modulePath = normaliseKey(payload.modulePath, {
      fieldName: 'modulePath',
      maxLength: 255,
      transform: (input) => input.trim()
    });
    const moduleHash = normaliseKey(payload.moduleHash, {
      fieldName: 'moduleHash',
      maxLength: 128,
      transform: (input) => input.trim()
    });
    const ssmParameterName = normaliseKey(payload.ssmParameterName, {
      fieldName: 'ssmParameterName',
      maxLength: 255,
      transform: (input) => input.trim()
    });
    const runtimeEndpoint = normaliseKey(payload.runtimeEndpoint, {
      fieldName: 'runtimeEndpoint',
      maxLength: 255,
      transform: (input) => input.trim()
    });
    const observabilityDashboardPath = normaliseKey(payload.observabilityDashboardPath, {
      fieldName: 'observabilityDashboardPath',
      maxLength: 255,
      transform: (input) => input.trim()
    });
    const observabilityDashboardHash = normaliseKey(payload.observabilityDashboardHash, {
      fieldName: 'observabilityDashboardHash',
      maxLength: 128,
      transform: (input) => input.trim()
    });
    const alarmOutputs = normaliseAlarmOutputs(payload.alarmOutputs);
    const metadata = normaliseMetadata(payload.metadata);

    return {
      blueprint_key: blueprintKey,
      environment_name: environmentName,
      environment_provider: environmentProvider,
      service_name: serviceName,
      blueprint_version: blueprintVersion,
      blueprint_hash: blueprintHash,
      module_path: modulePath,
      module_hash: moduleHash,
      ssm_parameter_name: ssmParameterName,
      runtime_endpoint: runtimeEndpoint,
      observability_dashboard_path: observabilityDashboardPath,
      observability_dashboard_hash: observabilityDashboardHash,
      alarm_outputs: safeJsonStringify(alarmOutputs, '[]'),
      metadata: safeJsonStringify(metadata, '{}')
    };
  }

  static async upsert(payload, connection = db) {
    const insertPayload = this.serialize(payload);

    const result = await connection(this.tableName)
      .insert(insertPayload)
      .onConflict(['blueprint_key', 'environment_name'])
      .merge({
        blueprint_version: insertPayload.blueprint_version,
        blueprint_hash: insertPayload.blueprint_hash,
        module_path: insertPayload.module_path,
        module_hash: insertPayload.module_hash,
        ssm_parameter_name: insertPayload.ssm_parameter_name,
        runtime_endpoint: insertPayload.runtime_endpoint,
        observability_dashboard_path: insertPayload.observability_dashboard_path,
        observability_dashboard_hash: insertPayload.observability_dashboard_hash,
        alarm_outputs: insertPayload.alarm_outputs,
        metadata: insertPayload.metadata,
        recorded_at: connection.fn.now(),
        updated_at: connection.fn.now()
      })
      .returning('*');

    const row = Array.isArray(result) ? result[0] : result;
    return this.deserialize(row);
  }

  static async listAll(connection = db) {
    const rows = await connection(this.tableName)
      .select('*')
      .orderBy(['blueprint_key', 'environment_name']);
    return rows.map((row) => this.deserialize(row)).filter(Boolean);
  }

  static async listByBlueprint(blueprintKey, connection = db) {
    const rows = await connection(this.tableName)
      .select('*')
      .where({ blueprint_key: blueprintKey })
      .orderBy('environment_name', 'asc');
    return rows.map((row) => this.deserialize(row)).filter(Boolean);
  }

  static async deleteMissingEnvironments(blueprintKey, allowedEnvironmentNames = [], connection = db) {
    if (!blueprintKey) {
      return 0;
    }

    const normalisedKey = ensureNonEmptyString(blueprintKey, { fieldName: 'blueprintKey', maxLength: 120 });
    const environments = Array.isArray(allowedEnvironmentNames)
      ? allowedEnvironmentNames.map((value) => value && String(value).trim().toLowerCase()).filter(Boolean)
      : [];

    if (environments.length === 0) {
      return connection(this.tableName).where({ blueprint_key: normalisedKey }).del();
    }

    return connection(this.tableName)
      .where({ blueprint_key: normalisedKey })
      .whereNotIn('environment_name', environments)
      .del();
  }
}
