import crypto from 'crypto';

export const TABLES = {
  CONSENT_LEDGER: 'telemetry_consent_ledger',
  EVENT_BATCHES: 'telemetry_event_batches',
  EVENTS: 'telemetry_events',
  FRESHNESS_MONITORS: 'telemetry_freshness_monitors',
  LINEAGE_RUNS: 'telemetry_lineage_runs'
};

export const CONSENT_STATUSES = ['granted', 'revoked', 'expired'];
export const EVENT_STATUSES = ['pending', 'suppressed', 'exported', 'failed', 'duplicate'];
export const BATCH_STATUSES = ['pending', 'exporting', 'exported', 'failed'];
export const FRESHNESS_STATUSES = ['healthy', 'warning', 'critical'];
export const LINEAGE_STATUSES = ['running', 'success', 'failed'];

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

function jsonDefault() {
  return JSON.stringify({});
}

function arrayDefault() {
  return JSON.stringify([]);
}

function createConsentLedgerTable(table, knex) {
  table.bigIncrements('id').primary();
  table
    .integer('user_id')
    .unsigned()
    .notNullable()
    .references('id')
    .inTable('users')
    .onDelete('CASCADE');
  table.string('tenant_id', 64).notNullable().defaultTo('global');
  table.string('consent_scope', 120).notNullable();
  table.string('consent_version', 32).notNullable();
  table
    .enu('status', CONSENT_STATUSES, {
      useNative: true,
      enumName: 'telemetry_consent_status_enum'
    })
    .notNullable()
    .defaultTo('granted');
  table.boolean('is_active').notNullable().defaultTo(true);
  table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('effective_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('expires_at');
  table.timestamp('revoked_at');
  table.string('recorded_by', 120);
  table.json('evidence').notNullable().defaultTo(jsonDefault());
  table.json('metadata').notNullable().defaultTo(jsonDefault());
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);

  table.unique(
    ['tenant_id', 'user_id', 'consent_scope', 'consent_version'],
    'telemetry_consent_unique_version'
  );
  table.index(['tenant_id', 'consent_scope', 'is_active'], 'telemetry_consent_scope_active_idx');
  table.index(['user_id', 'consent_scope'], 'telemetry_consent_user_scope_idx');
}

function createEventBatchesTable(table, knex) {
  table.bigIncrements('id').primary();
  table
    .uuid('batch_uuid')
    .notNullable()
    .defaultTo(knex.raw('(UUID())'))
    .unique();
  table
    .enu('status', BATCH_STATUSES, {
      useNative: true,
      enumName: 'telemetry_batch_status_enum'
    })
    .notNullable()
    .defaultTo('pending');
  table.string('destination', 64).notNullable().defaultTo('s3');
  table.integer('events_count').unsigned().notNullable().defaultTo(0);
  table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('completed_at');
  table.string('file_key', 512);
  table.string('checksum', 128);
  table.text('error_message');
  table.json('metadata').notNullable().defaultTo(jsonDefault());
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);

  table.index(['status', 'started_at'], 'telemetry_batches_status_idx');
}

function createEventsTable(table, knex) {
  table.bigIncrements('id').primary();
  table
    .uuid('event_uuid')
    .notNullable()
    .defaultTo(knex.raw('(UUID())'))
    .unique();
  table.string('tenant_id', 64).notNullable().defaultTo('global');
  table.string('schema_version', 32).notNullable().defaultTo('v1');
  table.string('event_name', 191).notNullable();
  table.string('event_version', 32);
  table.string('event_source', 80).notNullable();
  table.timestamp('occurred_at').notNullable();
  table.timestamp('received_at').notNullable().defaultTo(knex.fn.now());
  table
    .integer('user_id')
    .unsigned()
    .references('id')
    .inTable('users')
    .onDelete('SET NULL');
  table.string('session_id', 128);
  table.string('device_id', 128);
  table.string('correlation_id', 64);
  table.string('consent_scope', 120).notNullable();
  table
    .enu('consent_status', CONSENT_STATUSES, {
      useNative: true,
      enumName: 'telemetry_consent_status_enum'
    })
    .notNullable()
    .defaultTo('granted');
  table
    .enu('ingestion_status', EVENT_STATUSES, {
      useNative: true,
      enumName: 'telemetry_event_status_enum'
    })
    .notNullable()
    .defaultTo('pending');
  table.integer('ingestion_attempts').unsigned().notNullable().defaultTo(0);
  table.timestamp('last_ingestion_attempt');
  table
    .bigInteger('export_batch_id')
    .unsigned()
    .references('id')
    .inTable(TABLES.EVENT_BATCHES)
    .onDelete('SET NULL');
  table.string('dedupe_hash', 128).notNullable();
  table.json('payload').notNullable().defaultTo(jsonDefault());
  table.json('context').notNullable().defaultTo(jsonDefault());
  table.json('metadata').notNullable().defaultTo(jsonDefault());
  table.json('tags').notNullable().defaultTo(arrayDefault());
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);

  table.unique(['dedupe_hash'], 'telemetry_events_dedupe_unique');
  table.index(['tenant_id', 'event_name', 'occurred_at'], 'telemetry_events_name_time_idx');
  table.index(['ingestion_status', 'occurred_at'], 'telemetry_events_status_time_idx');
  table.index(['consent_scope', 'consent_status'], 'telemetry_events_consent_idx');
}

function createFreshnessMonitorsTable(table, knex) {
  table.increments('id').primary();
  table.string('pipeline_key', 191).notNullable().unique();
  table.timestamp('last_event_at');
  table
    .enu('status', FRESHNESS_STATUSES, {
      useNative: true,
      enumName: 'telemetry_freshness_status_enum'
    })
    .notNullable()
    .defaultTo('healthy');
  table.integer('threshold_minutes').unsigned().notNullable().defaultTo(15);
  table.integer('lag_seconds').unsigned().notNullable().defaultTo(0);
  table.json('metadata').notNullable().defaultTo(jsonDefault());
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);
}

function createLineageRunsTable(table, knex) {
  table.bigIncrements('id').primary();
  table
    .uuid('run_uuid')
    .notNullable()
    .defaultTo(knex.raw('(UUID())'))
    .unique();
  table.string('tool', 80).notNullable();
  table.string('model_name', 191).notNullable();
  table
    .enu('status', LINEAGE_STATUSES, {
      useNative: true,
      enumName: 'telemetry_lineage_status_enum'
    })
    .notNullable()
    .defaultTo('running');
  table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('completed_at');
  table.json('input').notNullable().defaultTo(jsonDefault());
  table.json('output').notNullable().defaultTo(jsonDefault());
  table.text('error_message');
  table.json('metadata').notNullable().defaultTo(jsonDefault());
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);

  table.index(['model_name', 'status', 'started_at'], 'telemetry_lineage_model_status_idx');
}

export async function applyTelemetryDomainSchema(knex) {
  const consentExists = await knex.schema.hasTable(TABLES.CONSENT_LEDGER);
  if (!consentExists) {
    await knex.schema.createTable(TABLES.CONSENT_LEDGER, (table) => createConsentLedgerTable(table, knex));
  }

  const batchesExists = await knex.schema.hasTable(TABLES.EVENT_BATCHES);
  if (!batchesExists) {
    await knex.schema.createTable(TABLES.EVENT_BATCHES, (table) => createEventBatchesTable(table, knex));
  }

  const eventsExists = await knex.schema.hasTable(TABLES.EVENTS);
  if (!eventsExists) {
    await knex.schema.createTable(TABLES.EVENTS, (table) => createEventsTable(table, knex));
  }

  const freshnessExists = await knex.schema.hasTable(TABLES.FRESHNESS_MONITORS);
  if (!freshnessExists) {
    await knex.schema.createTable(TABLES.FRESHNESS_MONITORS, (table) => createFreshnessMonitorsTable(table, knex));
  }

  const lineageExists = await knex.schema.hasTable(TABLES.LINEAGE_RUNS);
  if (!lineageExists) {
    await knex.schema.createTable(TABLES.LINEAGE_RUNS, (table) => createLineageRunsTable(table, knex));
  }
}

export async function rollbackTelemetryDomainSchema(knex) {
  const dropOrder = [
    TABLES.EVENTS,
    TABLES.EVENT_BATCHES,
    TABLES.CONSENT_LEDGER,
    TABLES.FRESHNESS_MONITORS,
    TABLES.LINEAGE_RUNS
  ];

  for (const table of dropOrder) {
    const exists = await knex.schema.hasTable(table);
    if (exists) {
      await knex.schema.dropTable(table);
    }
  }
}

export function generateTelemetryDedupeHash({
  eventName,
  eventVersion,
  occurredAt,
  userId,
  sessionId,
  correlationId,
  payload
}) {
  const hasher = crypto.createHash('sha256');
  hasher.update(String(eventName ?? ''));
  hasher.update('|');
  hasher.update(String(eventVersion ?? ''));
  hasher.update('|');
  hasher.update(new Date(occurredAt ?? 0).toISOString());
  hasher.update('|');
  hasher.update(String(userId ?? 'anonymous'));
  hasher.update('|');
  hasher.update(String(sessionId ?? ''));
  hasher.update('|');
  hasher.update(String(correlationId ?? ''));
  hasher.update('|');
  hasher.update(JSON.stringify(payload ?? {}));
  return hasher.digest('hex');
}
