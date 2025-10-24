import db from '../config/database.js';
import {
  ensureNonEmptyString,
  normaliseOptionalString,
  safeJsonParse,
  safeJsonStringify
} from '../utils/modelUtils.js';

const TABLE = 'environment_descriptors';

function normaliseEnvironmentName(value) {
  return ensureNonEmptyString(value, {
    fieldName: 'environmentName',
    maxLength: 120
  }).trim().toLowerCase();
}

function normaliseString(value, { fieldName, maxLength = 255 } = {}) {
  const normalised = normaliseOptionalString(value, { maxLength });
  if (!normalised) {
    return null;
  }
  return normalised;
}

function normaliseStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique = new Set();
  for (const entry of values) {
    if (entry === null || entry === undefined) {
      continue;
    }
    const trimmed = String(entry).trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

function normaliseNotes(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((entry) => (entry === null || entry === undefined ? '' : String(entry).trim()))
    .filter(Boolean);
}

function normaliseMetadata(value) {
  const parsed = safeJsonParse(value, {});
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed;
}

function sanitiseRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    environmentName: row.environment_name,
    domain: row.domain ?? null,
    awsAccountAlias: row.aws_account_alias ?? null,
    awsRegion: row.aws_region ?? null,
    awsVpcId: row.aws_vpc_id ?? null,
    awsPrivateSubnetTags: safeJsonParse(row.aws_private_subnet_tags, []),
    awsPublicSubnetTags: safeJsonParse(row.aws_public_subnet_tags, []),
    blueprintParameter: row.blueprint_parameter ?? null,
    blueprintRuntimeEndpoint: row.blueprint_runtime_endpoint ?? null,
    blueprintServiceName: row.blueprint_service_name ?? null,
    terraformWorkspace: row.terraform_workspace ?? null,
    dockerComposeFile: row.docker_compose_file ?? null,
    dockerComposeCommand: row.docker_compose_command ?? null,
    dockerComposeProfiles: safeJsonParse(row.docker_compose_profiles, []),
    observabilityDashboardPath: row.observability_dashboard_path ?? null,
    observabilityCloudwatchDashboard: row.observability_cloudwatch_dashboard ?? null,
    contactsPrimary: row.contacts_primary ?? null,
    contactsOnCall: row.contacts_on_call ?? null,
    contactsAdditional: safeJsonParse(row.contacts_additional, []),
    changeWindows: safeJsonParse(row.change_windows, []),
    notes: safeJsonParse(row.notes, []),
    metadata: normaliseMetadata(row.metadata),
    recordedAt: row.recorded_at instanceof Date ? row.recorded_at : new Date(row.recorded_at),
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at)
  };
}

export default class EnvironmentDescriptorModel {
  static tableName = TABLE;

  static deserialize(row) {
    return sanitiseRecord(row);
  }

  static serialize(payload) {
    const environmentName = normaliseEnvironmentName(payload.environmentName);
    const domain = normaliseString(payload.domain, { fieldName: 'domain', maxLength: 255 });
    const awsAccountAlias = normaliseString(payload.awsAccountAlias, {
      fieldName: 'awsAccountAlias',
      maxLength: 160
    });
    const awsRegion = normaliseString(payload.awsRegion, { fieldName: 'awsRegion', maxLength: 80 });
    const awsVpcId = normaliseString(payload.awsVpcId, { fieldName: 'awsVpcId', maxLength: 160 });
    const awsPrivateSubnetTags = normaliseStringArray(payload.awsPrivateSubnetTags);
    const awsPublicSubnetTags = normaliseStringArray(payload.awsPublicSubnetTags);
    const blueprintParameter = normaliseString(payload.blueprintParameter, {
      fieldName: 'blueprintParameter',
      maxLength: 255
    });
    const blueprintRuntimeEndpoint = normaliseString(payload.blueprintRuntimeEndpoint, {
      fieldName: 'blueprintRuntimeEndpoint',
      maxLength: 255
    });
    const blueprintServiceName = normaliseString(payload.blueprintServiceName, {
      fieldName: 'blueprintServiceName',
      maxLength: 160
    });
    const terraformWorkspace = normaliseString(payload.terraformWorkspace, {
      fieldName: 'terraformWorkspace',
      maxLength: 255
    });
    const dockerComposeFile = normaliseString(payload.dockerComposeFile, {
      fieldName: 'dockerComposeFile',
      maxLength: 255
    });
    const dockerComposeCommand = normaliseString(payload.dockerComposeCommand, {
      fieldName: 'dockerComposeCommand',
      maxLength: 255
    });
    const dockerComposeProfiles = normaliseStringArray(payload.dockerComposeProfiles);
    const observabilityDashboardPath = normaliseString(payload.observabilityDashboardPath, {
      fieldName: 'observabilityDashboardPath',
      maxLength: 255
    });
    const observabilityCloudwatchDashboard = normaliseString(payload.observabilityCloudwatchDashboard, {
      fieldName: 'observabilityCloudwatchDashboard',
      maxLength: 255
    });
    const contactsPrimary = normaliseString(payload.contactsPrimary, {
      fieldName: 'contactsPrimary',
      maxLength: 255
    });
    const contactsOnCall = normaliseString(payload.contactsOnCall, {
      fieldName: 'contactsOnCall',
      maxLength: 255
    });
    const contactsAdditional = normaliseStringArray(payload.contactsAdditional);
    const changeWindows = normaliseStringArray(payload.changeWindows);
    const notes = normaliseNotes(payload.notes);
    const metadata = normaliseMetadata(payload.metadata);

    return {
      environment_name: environmentName,
      domain,
      aws_account_alias: awsAccountAlias,
      aws_region: awsRegion,
      aws_vpc_id: awsVpcId,
      aws_private_subnet_tags: safeJsonStringify(awsPrivateSubnetTags, '[]'),
      aws_public_subnet_tags: safeJsonStringify(awsPublicSubnetTags, '[]'),
      blueprint_parameter: blueprintParameter,
      blueprint_runtime_endpoint: blueprintRuntimeEndpoint,
      blueprint_service_name: blueprintServiceName,
      terraform_workspace: terraformWorkspace,
      docker_compose_file: dockerComposeFile,
      docker_compose_command: dockerComposeCommand,
      docker_compose_profiles: safeJsonStringify(dockerComposeProfiles, '[]'),
      observability_dashboard_path: observabilityDashboardPath,
      observability_cloudwatch_dashboard: observabilityCloudwatchDashboard,
      contacts_primary: contactsPrimary,
      contacts_on_call: contactsOnCall,
      contacts_additional: safeJsonStringify(contactsAdditional, '[]'),
      change_windows: safeJsonStringify(changeWindows, '[]'),
      notes: safeJsonStringify(notes, '[]'),
      metadata: safeJsonStringify(metadata, '{}')
    };
  }

  static async upsert(payload, connection = db) {
    const insertPayload = this.serialize(payload);

    const result = await connection(this.tableName)
      .insert(insertPayload)
      .onConflict(['environment_name'])
      .merge({
        domain: insertPayload.domain,
        aws_account_alias: insertPayload.aws_account_alias,
        aws_region: insertPayload.aws_region,
        aws_vpc_id: insertPayload.aws_vpc_id,
        aws_private_subnet_tags: insertPayload.aws_private_subnet_tags,
        aws_public_subnet_tags: insertPayload.aws_public_subnet_tags,
        blueprint_parameter: insertPayload.blueprint_parameter,
        blueprint_runtime_endpoint: insertPayload.blueprint_runtime_endpoint,
        blueprint_service_name: insertPayload.blueprint_service_name,
        terraform_workspace: insertPayload.terraform_workspace,
        docker_compose_file: insertPayload.docker_compose_file,
        docker_compose_command: insertPayload.docker_compose_command,
        docker_compose_profiles: insertPayload.docker_compose_profiles,
        observability_dashboard_path: insertPayload.observability_dashboard_path,
        observability_cloudwatch_dashboard: insertPayload.observability_cloudwatch_dashboard,
        contacts_primary: insertPayload.contacts_primary,
        contacts_on_call: insertPayload.contacts_on_call,
        contacts_additional: insertPayload.contacts_additional,
        change_windows: insertPayload.change_windows,
        notes: insertPayload.notes,
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
      .orderBy('environment_name', 'asc');
    return rows.map((row) => this.deserialize(row)).filter(Boolean);
  }

  static async findByEnvironment(environmentName, connection = db) {
    if (!environmentName) {
      return null;
    }

    const normalised = normaliseEnvironmentName(environmentName);
    const row = await connection(this.tableName)
      .select('*')
      .where({ environment_name: normalised })
      .first();
    return this.deserialize(row);
  }

  static async deleteMissingEnvironments(allowedEnvironmentNames = [], connection = db) {
    const environments = Array.isArray(allowedEnvironmentNames)
      ? allowedEnvironmentNames.map((value) => value && String(value).trim().toLowerCase()).filter(Boolean)
      : [];

    if (environments.length === 0) {
      return connection(this.tableName).del();
    }

    return connection(this.tableName)
      .whereNotIn('environment_name', environments)
      .del();
  }
}
