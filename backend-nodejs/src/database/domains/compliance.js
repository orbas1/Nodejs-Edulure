import crypto from 'crypto';

export const TABLES = {
  AUDIT_EVENTS: 'audit_events',
  CONSENT_POLICIES: 'consent_policies',
  CONSENT_RECORDS: 'consent_records',
  DSR_REQUESTS: 'dsr_requests',
  SECURITY_INCIDENTS: 'security_incidents',
  CDC_OUTBOX: 'cdc_outbox',
  PARTITION_ARCHIVES: 'data_partition_archives'
};

const POLICY_STATUSES = ['draft', 'published', 'archived'];
const DSR_TYPES = ['access', 'erasure', 'rectification', 'portability', 'restriction'];
const DSR_STATUSES = ['pending', 'in_review', 'awaiting_user', 'completed', 'rejected', 'cancelled'];
const INCIDENT_CATEGORIES = ['scam', 'fraud', 'account_takeover', 'abuse', 'data_breach', 'other'];
const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const INCIDENT_STATUSES = [
  'new',
  'open',
  'triaged',
  'mitigating',
  'mitigated',
  'resolved',
  'dismissed',
  'false_positive'
];
const CDC_STATUSES = ['pending', 'delivered', 'failed'];

function resolveDialect(knex) {
  const client = knex?.client?.config?.client ?? knex?.client?.driverName ?? '';
  return String(client).toLowerCase();
}

function timestampWithAutoUpdate(knex, table, column = 'updated_at') {
  const dialect = resolveDialect(knex);

  if (dialect.includes('mysql')) {
    table
      .timestamp(column)
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    return;
  }

  table.timestamp(column).notNullable().defaultTo(knex.fn.now());
}

function defaultUuid(knex) {
  const dialect = resolveDialect(knex);
  if (dialect.includes('mysql')) {
    return knex.raw('(UUID())');
  }
  if (dialect.includes('pg')) {
    return knex.raw('gen_random_uuid()');
  }
  return null;
}

function addUtcDays(knex, days) {
  const dialect = resolveDialect(knex);
  if (dialect.includes('mysql')) {
    const raw = knex.raw(`(UTC_TIMESTAMP() + INTERVAL ${days} DAY)`);
    const wrapper = () => raw.toQuery();
    Object.assign(wrapper, raw, {
      isRawInstance: true,
      toSQL: (...args) => raw.toSQL(...args),
      toQuery: (...args) => raw.toQuery(...args)
    });
    return wrapper;
  }
  if (dialect.includes('pg')) {
    return knex.raw(`(NOW() AT TIME ZONE 'UTC' + INTERVAL '${days} day')`);
  }
  return knex.fn.now();
}

function addBinaryColumn(table, knex, columnName, length = 4096) {
  const dialect = resolveDialect(knex);
  if (dialect.includes('mysql')) {
    return table.specificType(columnName, `VARBINARY(${length})`).nullable();
  }
  if (dialect.includes('pg')) {
    return table.specificType(columnName, 'BYTEA').nullable();
  }
  return table.specificType(columnName, 'BLOB').nullable();
}

function jsonDefaultValue(knex, value = {}) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const dialect = resolveDialect(knex);

  if (dialect.includes('pg')) {
    return knex.raw('?::jsonb', [serialized]);
  }

  if (dialect.includes('mysql')) {
    const raw = knex.raw('(CAST(? AS JSON))', [serialized]);
    const wrapper = () => raw.toQuery();
    Object.assign(wrapper, raw, {
      isRawInstance: true,
      toSQL: (...args) => raw.toSQL(...args),
      toQuery: (...args) => raw.toQuery(...args)
    });
    return wrapper;
  }

  return serialized;
}

async function ensureTable(knex, tableName, schemaBuilder) {
  const exists = await knex.schema.hasTable(tableName);
  if (exists) {
    return;
  }
  await knex.schema.createTable(tableName, (table) => schemaBuilder(table, knex));
}

function defineAuditEventsTable(table, knex) {
  table.bigIncrements('id').primary();
  const eventUuidColumn = table.string('event_uuid', 64).notNullable();
  const eventUuidDefault = defaultUuid(knex);
  if (eventUuidDefault) {
    eventUuidColumn.defaultTo(eventUuidDefault);
  }
  eventUuidColumn.unique();
  table.string('tenant_id', 36).notNullable().defaultTo('global');
  table
    .integer('actor_id')
    .unsigned()
    .references('id')
    .inTable('users')
    .onDelete('SET NULL');
  table.string('actor_type', 80).notNullable();
  table.string('actor_role', 80).notNullable();
  table.string('event_type', 120).notNullable();
  table.string('event_severity', 32).notNullable().defaultTo('info');
  table.string('entity_type', 120).notNullable();
  table.string('entity_id', 120).notNullable();
  table.json('payload').notNullable().defaultTo(jsonDefaultValue(knex));
  addBinaryColumn(table, knex, 'ip_address_ciphertext', 256);
  table.string('ip_address_hash', 128).nullable();
  table.string('request_id', 64).nullable();
  table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('ingested_at').notNullable().defaultTo(knex.fn.now());
  table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
  table.json('metadata').notNullable().defaultTo(jsonDefaultValue(knex));
  table.index(['tenant_id', 'occurred_at'], 'audit_events_tenant_occurred_idx');
  table.index(['entity_type', 'entity_id', 'occurred_at'], 'audit_events_entity_idx');
  table.index(['event_type', 'event_severity', 'occurred_at'], 'audit_events_event_idx');
  table.index(['actor_id', 'actor_role', 'occurred_at'], 'audit_events_actor_idx');
  table.index(['ip_address_hash'], 'audit_events_ip_hash_idx');
}

function defineConsentPoliciesTable(table, knex) {
  table.increments('id').primary();
  table.string('policy_key', 120).notNullable();
  table.string('version', 32).notNullable();
  table
    .enu('status', POLICY_STATUSES, {
      useNative: true,
      enumName: 'consent_policy_status_enum'
    })
    .notNullable()
    .defaultTo('draft');
  table.timestamp('effective_at').notNullable().defaultTo(knex.fn.now());
  table.string('supersedes_version', 32);
  table.string('title', 191).notNullable();
  table.text('summary').notNullable();
  table.json('document_locations').notNullable().defaultTo(jsonDefaultValue(knex));
  table.string('content_hash', 128).notNullable();
  table.json('metadata').notNullable().defaultTo(jsonDefaultValue(knex));
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);
  table.unique(['policy_key', 'version'], 'consent_policies_unique_version');
  table.index(['policy_key', 'status'], 'consent_policies_status_idx');
  table.index(['effective_at'], 'consent_policies_effective_idx');
}

function defineConsentRecordsTable(table, knex) {
  table.bigIncrements('id').primary();
  const consentUuidColumn = table.string('consent_uuid', 64).notNullable();
  const consentUuidDefault = defaultUuid(knex);
  if (consentUuidDefault) {
    consentUuidColumn.defaultTo(consentUuidDefault);
  }
  consentUuidColumn.unique();
  table
    .integer('user_id')
    .unsigned()
    .notNullable()
    .references('id')
    .inTable('users')
    .onDelete('CASCADE');
  table.string('tenant_id', 36).notNullable().defaultTo('global');
  table
    .integer('policy_id')
    .unsigned()
    .references('id')
    .inTable(TABLES.CONSENT_POLICIES)
    .onDelete('SET NULL');
  table.string('consent_type', 120).notNullable();
  table.string('policy_version', 32).notNullable();
  table
    .enu('status', ['granted', 'revoked', 'expired'], {
      useNative: true,
      enumName: 'consent_status_enum'
    })
    .notNullable()
    .defaultTo('granted');
  table.timestamp('granted_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('revoked_at');
  table.timestamp('expires_at');
  table
    .enu('channel', ['web', 'mobile', 'api', 'support', 'import'], {
      useNative: true,
      enumName: 'consent_channel_enum'
    })
    .notNullable()
    .defaultTo('web');
  table.boolean('active').notNullable().defaultTo(true);
  addBinaryColumn(table, knex, 'evidence_ciphertext');
  table.string('evidence_checksum', 128).nullable();
  table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
  table.json('metadata').notNullable().defaultTo(jsonDefaultValue(knex));
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);
  table.unique(['tenant_id', 'user_id', 'consent_type', 'policy_version'], 'consent_records_user_policy_unique');
  table.index(['tenant_id', 'consent_type', 'status'], 'consent_records_type_status_idx');
  table.index(['user_id', 'status'], 'consent_records_user_status_idx');
  table.index(['expires_at'], 'consent_records_expires_idx');
}

function defineDsrRequestsTable(table, knex) {
  table.bigIncrements('id').primary();
  const requestUuidColumn = table.string('request_uuid', 64).notNullable();
  const requestUuidDefault = defaultUuid(knex);
  if (requestUuidDefault) {
    requestUuidColumn.defaultTo(requestUuidDefault);
  }
  requestUuidColumn.unique();
  table.string('tenant_id', 36).notNullable().defaultTo('global');
  table
    .integer('user_id')
    .unsigned()
    .references('id')
    .inTable('users')
    .onDelete('SET NULL');
  table
    .enu('request_type', DSR_TYPES, {
      useNative: true,
      enumName: 'dsr_request_type_enum'
    })
    .notNullable();
  table
    .enu('status', DSR_STATUSES, {
      useNative: true,
      enumName: 'dsr_request_status_enum'
    })
    .notNullable()
    .defaultTo('pending');
  table.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('due_at').notNullable().defaultTo(addUtcDays(knex, 30));
  table.timestamp('closed_at');
  table
    .integer('handled_by')
    .unsigned()
    .references('id')
    .inTable('users')
    .onDelete('SET NULL');
  table.boolean('escalated').notNullable().defaultTo(false);
  table.timestamp('escalated_at');
  table.string('case_reference', 64).notNullable().unique();
  table.decimal('sla_days', 5, 2).notNullable().defaultTo(30.0);
  addBinaryColumn(table, knex, 'request_ciphertext');
  addBinaryColumn(table, knex, 'response_ciphertext');
  table.string('encryption_key_version', 36).notNullable().defaultTo('v1');
  table.json('metadata').notNullable().defaultTo(jsonDefaultValue(knex));
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);
  table.index(['tenant_id', 'status', 'due_at'], 'dsr_requests_status_due_idx');
  table.index(['user_id', 'request_type', 'submitted_at'], 'dsr_requests_user_type_idx');
  table.index(['escalated', 'status'], 'dsr_requests_escalation_idx');
}

function defineSecurityIncidentsTable(table, knex) {
  table.bigIncrements('id').primary();
  const incidentUuidColumn = table.string('incident_uuid', 64).notNullable();
  const incidentUuidDefault = defaultUuid(knex);
  if (incidentUuidDefault) {
    incidentUuidColumn.defaultTo(incidentUuidDefault);
  }
  incidentUuidColumn.unique();
  table.string('tenant_id', 36).notNullable().defaultTo('global');
  table
    .integer('reporter_id')
    .unsigned()
    .references('id')
    .inTable('users')
    .onDelete('SET NULL');
  table
    .integer('assigned_to')
    .unsigned()
    .references('id')
    .inTable('users')
    .onDelete('SET NULL');
  table
    .enu('category', INCIDENT_CATEGORIES, {
      useNative: true,
      enumName: 'security_incident_category_enum'
    })
    .notNullable();
  table
    .enu('severity', INCIDENT_SEVERITIES, {
      useNative: true,
      enumName: 'security_incident_severity_enum'
    })
    .notNullable()
    .defaultTo('medium');
  table
    .enu('status', INCIDENT_STATUSES, {
      useNative: true,
      enumName: 'security_incident_status_enum'
    })
    .notNullable()
    .defaultTo('open');
  table.string('source', 120).notNullable().defaultTo('manual');
  table.string('external_case_id', 64);
  table.string('title', 191).notNullable();
  table.text('description').notNullable();
  table.json('impact_assessment').notNullable().defaultTo(jsonDefaultValue(knex));
  table.json('containment_actions').notNullable().defaultTo(jsonDefaultValue(knex));
  addBinaryColumn(table, knex, 'evidence_ciphertext');
  table.string('evidence_checksum', 128).nullable();
  table.boolean('requires_notification').notNullable().defaultTo(false);
  table.timestamp('reported_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('detected_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('triaged_at');
  table.timestamp('acknowledged_at');
  table.timestamp('resolved_at');
  table.timestamp('notified_at');
  table.json('metadata').notNullable().defaultTo(jsonDefaultValue(knex));
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);
  table.index(['tenant_id', 'severity', 'status'], 'security_incidents_status_idx');
  table.index(['requires_notification', 'status'], 'security_incidents_notification_idx');
  table.index(['detected_at'], 'security_incidents_detected_idx');
}

function defineCdcOutboxTable(table, knex) {
  table.bigIncrements('id').primary();
  const eventUuidDefault = defaultUuid(knex);
  const cdcUuidColumn = table.string('event_uuid', 64).notNullable();
  if (eventUuidDefault) {
    cdcUuidColumn.defaultTo(eventUuidDefault);
  }
  cdcUuidColumn.unique();
  table.string('domain', 80).notNullable();
  table.string('entity_name', 120).notNullable();
  table.string('entity_id', 120).notNullable();
  table.string('operation', 60).notNullable();
  table
    .enu('status', CDC_STATUSES, {
      useNative: true,
      enumName: 'cdc_event_status_enum'
    })
    .notNullable()
    .defaultTo('pending');
  table.boolean('dry_run').notNullable().defaultTo(false);
  table.string('correlation_id', 64).notNullable();
  table.json('payload').notNullable().defaultTo(jsonDefaultValue(knex));
  table.integer('retry_count').unsigned().notNullable().defaultTo(0);
  table.timestamp('next_attempt_at').defaultTo(knex.fn.now());
  table.timestamp('last_attempt_at');
  table.timestamp('processed_at');
  table.string('error_message', 500);
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);
  table.index(['status', 'next_attempt_at'], 'cdc_outbox_dispatch_idx');
  table.index(['domain', 'entity_name'], 'cdc_outbox_domain_idx');
  table.index(['correlation_id'], 'cdc_outbox_correlation_idx');
}

function definePartitionArchiveTable(table, knex) {
  table.increments('id').primary();
  table.string('table_name', 191).notNullable();
  table.string('partition_name', 128).notNullable();
  table.timestamp('range_start').notNullable();
  table.timestamp('range_end').notNullable();
  table.integer('retention_days').unsigned().notNullable().defaultTo(0);
  table.timestamp('archived_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('dropped_at');
  table.string('storage_bucket', 191).notNullable();
  table.string('storage_key', 512).notNullable();
  table.bigInteger('row_count').unsigned().notNullable().defaultTo(0);
  table.bigInteger('byte_size').unsigned().notNullable().defaultTo(0);
  table.string('checksum', 128);
  table.json('metadata').notNullable().defaultTo(jsonDefaultValue(knex));
  table.unique(['table_name', 'partition_name'], 'partition_archives_unique_partition');
  table.index(['table_name', 'archived_at'], 'partition_archives_table_archived_idx');
  table.index(['table_name', 'dropped_at'], 'partition_archives_dropped_idx');
}

async function applyPartitioning(knex, tableName, dateColumn) {
  const dialect = resolveDialect(knex);
  if (dialect.includes('mysql')) {
    return;
  }

  const policyTableExists = await knex.schema.hasTable('data_partition_policies');
  if (!policyTableExists) {
    return;
  }

  const audit = await knex('data_partition_policies').where({ table_name: tableName }).first();
  if (!audit) {
    return;
  }

  const now = new Date();
  const partitions = [];
  for (let offset = -1; offset <= 5; offset += 1) {
    const partitionDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    const nextMonth = new Date(Date.UTC(partitionDate.getUTCFullYear(), partitionDate.getUTCMonth() + 1, 1));
    const label = `${partitionDate.getUTCFullYear()}${String(partitionDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const lessThan = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`;
    partitions.push({ label: `p${label}`, lessThan });
  }

  const fragments = partitions
    .map((partition) => `PARTITION ${partition.label} VALUES LESS THAN (TO_DAYS('${partition.lessThan}'))`)
    .join(',\n');

  const partitionSql = `
    ALTER TABLE ${tableName}
    PARTITION BY RANGE (TO_DAYS(${dateColumn})) (
      ${fragments},
      PARTITION pmax VALUES LESS THAN MAXVALUE
    )
  `;

  try {
    await knex.raw(partitionSql);
  } catch (error) {
    const code = error?.code ?? '';
    if (!code.includes('ER_PARTITION_EXISTS') && !code.includes('ER_PARTITION_INITIALIZED')) {
      throw error;
    }
  }
}

async function seedPartitionPolicies(knex) {
  await ensureTable(knex, 'data_partition_policies', (table) => {
    table.increments('id').primary();
    table.string('table_name', 191).notNullable().unique();
    table.string('date_column', 64).notNullable();
    table.string('strategy', 64).notNullable();
    table.integer('retention_days').unsigned().notNullable().defaultTo(365);
    table.json('metadata').notNullable().defaultTo(jsonDefaultValue(knex));
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
  });

  const policies = [
    {
      table_name: TABLES.AUDIT_EVENTS,
      date_column: 'occurred_at',
      strategy: 'monthly_range',
      retention_days: 540,
      metadata: {
        archivePrefix: 'governance/audit-events',
        archiveGraceDays: 30,
        minActivePartitions: 6
      }
    },
    {
      table_name: TABLES.CONSENT_RECORDS,
      date_column: 'granted_at',
      strategy: 'monthly_range',
      retention_days: 720,
      metadata: {
        archivePrefix: 'governance/consent-records',
        archiveGraceDays: 60,
        minActivePartitions: 6
      }
    },
    {
      table_name: TABLES.SECURITY_INCIDENTS,
      date_column: 'detected_at',
      strategy: 'monthly_range',
      retention_days: 1095,
      metadata: {
        archivePrefix: 'governance/security-incidents',
        archiveGraceDays: 90,
        minActivePartitions: 12,
        manualApprovalRequired: true
      }
    }
  ];

  for (const policy of policies) {
    const existing = await knex('data_partition_policies').where({ table_name: policy.table_name }).first();
    if (existing) {
      await knex('data_partition_policies')
        .where({ id: existing.id })
        .update({
          date_column: policy.date_column,
          strategy: policy.strategy,
          retention_days: policy.retention_days,
          metadata: JSON.stringify(policy.metadata ?? {})
        });
    } else {
      await knex('data_partition_policies').insert({
        ...policy,
        metadata: JSON.stringify(policy.metadata ?? {})
      });
    }
  }
}

export async function applyComplianceDomainSchema(knex) {
  await seedPartitionPolicies(knex);

  await ensureTable(knex, TABLES.AUDIT_EVENTS, defineAuditEventsTable);
  await ensureTable(knex, TABLES.CONSENT_POLICIES, defineConsentPoliciesTable);
  await ensureTable(knex, TABLES.CONSENT_RECORDS, defineConsentRecordsTable);
  await ensureTable(knex, TABLES.DSR_REQUESTS, defineDsrRequestsTable);
  await ensureTable(knex, TABLES.SECURITY_INCIDENTS, defineSecurityIncidentsTable);
  await ensureTable(knex, TABLES.CDC_OUTBOX, defineCdcOutboxTable);
  await ensureTable(knex, TABLES.PARTITION_ARCHIVES, definePartitionArchiveTable);

  await applyPartitioning(knex, TABLES.AUDIT_EVENTS, 'occurred_at');
  await applyPartitioning(knex, TABLES.CONSENT_RECORDS, 'granted_at');
  await applyPartitioning(knex, TABLES.SECURITY_INCIDENTS, 'detected_at');
}

export async function rollbackComplianceDomainSchema(knex) {
  const tables = [
    TABLES.PARTITION_ARCHIVES,
    TABLES.CDC_OUTBOX,
    TABLES.SECURITY_INCIDENTS,
    TABLES.DSR_REQUESTS,
    TABLES.CONSENT_RECORDS,
    TABLES.CONSENT_POLICIES,
    TABLES.AUDIT_EVENTS
  ];
  for (const table of tables) {
    const exists = await knex.schema.hasTable(table);
    if (exists) {
      await knex.schema.dropTable(table);
    }
  }

  const partitionPolicyExists = await knex.schema.hasTable('data_partition_policies');
  if (partitionPolicyExists) {
    await knex.schema.dropTable('data_partition_policies');
  }
}

export function generateConsentPolicyChecksum(payload) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(payload ?? {}));
  return hash.digest('hex');
}

export default {
  applyComplianceDomainSchema,
  rollbackComplianceDomainSchema,
  generateConsentPolicyChecksum,
  TABLES
};
