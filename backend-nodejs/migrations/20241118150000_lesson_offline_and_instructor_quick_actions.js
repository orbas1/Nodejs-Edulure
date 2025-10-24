import {
  addTimestamps,
  defaultUuid,
  ensureUpdatedAtTrigger,
  ensureUuidExtension,
  jsonDefault
} from './_helpers/schema.js';

export async function up(knex) {
  await ensureUuidExtension(knex);

  const hasLessonManifests = await knex.schema.hasTable('lesson_download_manifests');
  if (!hasLessonManifests) {
    await knex.schema.createTable('lesson_download_manifests', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique().defaultTo(defaultUuid(knex));
      table
        .integer('course_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('courses')
        .onDelete('CASCADE');
      table
        .integer('module_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_modules')
        .onDelete('CASCADE');
      table.integer('version').unsigned().notNullable().defaultTo(1);
      table
        .enum('status', ['draft', 'published', 'archived', 'deprecated'])
        .notNullable()
        .defaultTo('published');
      table.string('bundle_url', 500);
      table.string('checksum_sha256', 128);
      table.bigInteger('size_bytes').unsigned().notNullable().defaultTo(0);
      table.timestamp('published_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.unique(['module_id', 'version']);
      table.index(['course_id', 'status']);
      table.index(['module_id', 'status']);
    });
    await ensureUpdatedAtTrigger(knex, 'lesson_download_manifests');
  }

  const hasLessonAssets = await knex.schema.hasTable('lesson_download_assets');
  if (!hasLessonAssets) {
    await knex.schema.createTable('lesson_download_assets', (table) => {
      table.increments('id').primary();
      table
        .integer('manifest_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('lesson_download_manifests')
        .onDelete('CASCADE');
      table.string('asset_type', 60).notNullable().defaultTo('video');
      table.string('label', 200);
      table.string('asset_url', 500).notNullable();
      table.string('checksum_sha256', 128);
      table.bigInteger('size_bytes').unsigned().notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.index(['manifest_id', 'asset_type']);
    });
    await ensureUpdatedAtTrigger(knex, 'lesson_download_assets');
  }

  const hasProgressQueue = await knex.schema.hasTable('lesson_progress_sync_queue');
  if (!hasProgressQueue) {
    await knex.schema.createTable('lesson_progress_sync_queue', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique().defaultTo(defaultUuid(knex));
      table
        .integer('enrollment_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_enrollments')
        .onDelete('CASCADE');
      table
        .integer('lesson_id')
        .unsigned()
        .references('id')
        .inTable('course_lessons')
        .onDelete('SET NULL');
      table
        .integer('module_id')
        .unsigned()
        .references('id')
        .inTable('course_modules')
        .onDelete('SET NULL');
      table
        .enum('status', ['pending', 'syncing', 'failed', 'completed'])
        .notNullable()
        .defaultTo('pending');
      table.decimal('progress_percent', 5, 2).notNullable().defaultTo(0);
      table.boolean('requires_review').notNullable().defaultTo(false);
      table.integer('attempts').unsigned().notNullable().defaultTo(0);
      table.timestamp('last_attempt_at');
      table.text('last_error');
      table.timestamp('synced_at');
      table.timestamp('completed_at');
      table.json('payload').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.index(['enrollment_id', 'status']);
      table.index(['lesson_id', 'status']);
      table.index(['module_id', 'status']);
    });
    await ensureUpdatedAtTrigger(knex, 'lesson_progress_sync_queue');
  }

  const hasQuickActions = await knex.schema.hasTable('instructor_quick_actions');
  if (!hasQuickActions) {
    await knex.schema.createTable('instructor_quick_actions', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique().defaultTo(defaultUuid(knex));
      table
        .integer('instructor_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.text('description');
      table.string('action_type', 80).notNullable().defaultTo('generic');
      table
        .enum('status', ['pending', 'in_progress', 'completed', 'failed'])
        .notNullable()
        .defaultTo('pending');
      table.integer('priority').unsigned().notNullable().defaultTo(3);
      table.timestamp('due_at');
      table.boolean('requires_sync').notNullable().defaultTo(false);
      table.timestamp('last_synced_at');
      table.timestamp('completed_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.index(['instructor_id', 'status']);
      table.index(['priority', 'due_at']);
    });
    await ensureUpdatedAtTrigger(knex, 'instructor_quick_actions');
  }

  const hasQuickActionEvents = await knex.schema.hasTable('instructor_quick_action_events');
  if (!hasQuickActionEvents) {
    await knex.schema.createTable('instructor_quick_action_events', (table) => {
      table.increments('id').primary();
      table
        .integer('action_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('instructor_quick_actions')
        .onDelete('CASCADE');
      table.string('event_key', 120).notNullable();
      table
        .integer('performed_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.json('details').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.index(['action_id', 'event_key']);
    });
    await ensureUpdatedAtTrigger(knex, 'instructor_quick_action_events');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('instructor_quick_action_events');
  await knex.schema.dropTableIfExists('instructor_quick_actions');
  await knex.schema.dropTableIfExists('lesson_progress_sync_queue');
  await knex.schema.dropTableIfExists('lesson_download_assets');
  await knex.schema.dropTableIfExists('lesson_download_manifests');
}
