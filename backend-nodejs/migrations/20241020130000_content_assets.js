import { applyTableDefaults, updatedAtDefault } from './_helpers/tableDefaults.js';
import { jsonDefault } from './_helpers/utils.js';

const ensureJsonColumn = (table, columnName, knex, { nullable = false, defaultValue = {} } = {}) => {
  const column = table.specificType(columnName, 'json');
  if (nullable) {
    column.nullable();
  } else {
    column.notNullable();
  }

  column.defaultTo(jsonDefault(knex, defaultValue));
  return column;
};

export async function up(knex) {
  const hasContentAssets = await knex.schema.hasTable('content_assets');
  if (!hasContentAssets) {
    await knex.schema.createTable('content_assets', (table) => {
      table.increments('id').primary();
      table.string('public_id', 36).notNullable().unique();
      table
        .enu('type', ['powerpoint', 'ebook', 'pdf', 'document', 'video'])
        .notNullable();
      table.string('original_filename', 255).notNullable();
      table.string('storage_key', 255).notNullable();
      table.string('storage_bucket', 120).notNullable();
      table.string('converted_key', 255);
      table.string('converted_bucket', 120);
      table
        .enu('status', ['draft', 'uploading', 'processing', 'ready', 'failed', 'archived'])
        .notNullable()
        .defaultTo('draft');
      table
        .enu('visibility', ['workspace', 'private', 'public'])
        .notNullable()
        .defaultTo('workspace');
      table.string('checksum', 128);
      table.bigInteger('size_bytes');
      table.string('mime_type', 120);
      table
        .integer('created_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('published_at');
      ensureJsonColumn(table, 'metadata', knex);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.timestamp('deleted_at');
      table.index(['type', 'status'], 'idx_content_assets_type_status');
      table.index(['created_by'], 'idx_content_assets_created_by');
      table.index(['published_at'], 'idx_content_assets_published_at');
      table.index(['deleted_at'], 'idx_content_assets_deleted_at');
      applyTableDefaults(table);
    });
  }

  const hasAssetIngestionJobs = await knex.schema.hasTable('asset_ingestion_jobs');
  if (!hasAssetIngestionJobs) {
    await knex.schema.createTable('asset_ingestion_jobs', (table) => {
      table.increments('id').primary();
      table
        .integer('asset_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('content_assets')
        .onDelete('CASCADE');
      table
        .enu('job_type', ['powerpoint-conversion', 'ebook-normalisation'])
        .notNullable();
      table
        .enu('status', ['pending', 'processing', 'completed', 'failed'])
        .notNullable()
        .defaultTo('pending');
      table.integer('attempts').unsigned().defaultTo(0);
      table.text('last_error');
      ensureJsonColumn(table, 'result_metadata', knex);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.timestamp('started_at');
      table.timestamp('completed_at');
      table.index(['status', 'created_at'], 'idx_asset_ingestion_jobs_status_created_at');
      table.index(['asset_id', 'job_type'], 'idx_asset_ingestion_jobs_asset_type');
      applyTableDefaults(table);
    });
  }

  const hasAssetConversionOutputs = await knex.schema.hasTable('asset_conversion_outputs');
  if (!hasAssetConversionOutputs) {
    await knex.schema.createTable('asset_conversion_outputs', (table) => {
      table.increments('id').primary();
      table
        .integer('asset_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('content_assets')
        .onDelete('CASCADE');
      table.string('format', 60).notNullable();
      table.string('storage_key', 255).notNullable();
      table.string('storage_bucket', 120).notNullable();
      table.string('checksum', 128);
      table.bigInteger('size_bytes');
      ensureJsonColumn(table, 'metadata', knex);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.unique(['asset_id', 'format']);
      table.index(['asset_id'], 'idx_asset_conversion_outputs_asset');
      applyTableDefaults(table);
    });
  }

  const hasEbookProgress = await knex.schema.hasTable('ebook_read_progress');
  if (!hasEbookProgress) {
    await knex.schema.createTable('ebook_read_progress', (table) => {
      table.increments('id').primary();
      table
        .integer('asset_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('content_assets')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.decimal('progress_percent', 5, 2).notNullable().defaultTo(0);
      table.string('last_location', 255);
      table.integer('time_spent_seconds').unsigned().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));
      table.unique(['asset_id', 'user_id'], 'ebook_progress_unique_user_asset');
      table.index(['asset_id', 'updated_at'], 'idx_ebook_progress_asset_updated');
      applyTableDefaults(table);
    });
  }

  const hasContentAuditLogs = await knex.schema.hasTable('content_audit_logs');
  if (!hasContentAuditLogs) {
    await knex.schema.createTable('content_audit_logs', (table) => {
      table.increments('id').primary();
      table
        .integer('asset_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('content_assets')
        .onDelete('CASCADE');
      table.string('event', 120).notNullable();
      table
        .integer('performed_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      ensureJsonColumn(table, 'payload', knex);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index(['asset_id', 'event'], 'idx_content_audit_logs_event');
      table.index(['created_at'], 'idx_content_audit_logs_created_at');
      applyTableDefaults(table);
    });
  }

  const hasContentAssetEvents = await knex.schema.hasTable('content_asset_events');
  if (!hasContentAssetEvents) {
    await knex.schema.createTable('content_asset_events', (table) => {
      table.increments('id').primary();
      table
        .integer('asset_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('content_assets')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('event_type', 40).notNullable();
      ensureJsonColumn(table, 'metadata', knex);
      table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
      table.index(['asset_id', 'event_type'], 'idx_content_asset_events_type');
      table.index(['occurred_at'], 'idx_content_asset_events_occurred_at');
      applyTableDefaults(table);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('content_asset_events');
  await knex.schema.dropTableIfExists('content_audit_logs');
  await knex.schema.dropTableIfExists('ebook_read_progress');
  await knex.schema.dropTableIfExists('asset_conversion_outputs');
  await knex.schema.dropTableIfExists('asset_ingestion_jobs');
  await knex.schema.dropTableIfExists('content_assets');
}
