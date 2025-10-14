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
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('deleted_at');
      table.index(['type', 'status']);
      table.index(['created_by']);
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
      table.json('result_metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('started_at');
      table.timestamp('completed_at');
      table.index(['status', 'created_at']);
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
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['asset_id', 'format']);
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
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['asset_id', 'user_id']);
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
      table.json('payload').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['asset_id', 'event']);
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
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('occurred_at').defaultTo(knex.fn.now());
      table.index(['asset_id', 'event_type']);
      table.index(['occurred_at']);
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
