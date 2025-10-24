import {
  addTimestamps,
  defaultUuid,
  ensureUpdatedAtTrigger,
  ensureUuidExtension,
  jsonDefault
} from './_helpers/schema.js';

const DOWNLOAD_STATES = ['queued', 'in_progress', 'completed', 'failed'];
const ASSESSMENT_STATES = ['queued', 'syncing', 'completed', 'failed'];
const ACTION_STATES = ['queued', 'processing', 'completed', 'failed'];
const ACTION_TYPES = ['announcement', 'attendance', 'grading', 'schedule', 'note'];

export async function up(knex) {
  await ensureUuidExtension(knex);

  const hasDownloads = await knex.schema.hasTable('learning_offline_downloads');
  if (!hasDownloads) {
    await knex.schema.createTable('learning_offline_downloads', (table) => {
      table.uuid('id').primary().defaultTo(defaultUuid(knex));
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('asset_public_id', 72).notNullable();
      table
        .integer('asset_id')
        .unsigned()
        .references('id')
        .inTable('content_assets')
        .onDelete('SET NULL');
      table
        .integer('course_id')
        .unsigned()
        .references('id')
        .inTable('courses')
        .onDelete('SET NULL');
      table
        .integer('module_id')
        .unsigned()
        .references('id')
        .inTable('course_modules')
        .onDelete('SET NULL');
      table.string('course_public_id', 72);
      table.string('module_slug', 160);
      table.string('filename', 255).notNullable();
      table
        .enu('state', DOWNLOAD_STATES, {
          useNative: true,
          enumName: 'learning_offline_download_state'
        })
        .notNullable()
        .defaultTo('queued');
      table.decimal('progress_ratio', 7, 4).notNullable().defaultTo(0);
      table.string('file_path', 500);
      table.text('error_message');
      table.timestamp('queued_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('last_progress_at');
      table.timestamp('completed_at');
      table.timestamp('failed_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.unique(['user_id', 'asset_public_id'], 'uq_learning_offline_download_asset');
      table.index(['user_id', 'state'], 'idx_learning_offline_download_user_state');
      table.index(['asset_public_id'], 'idx_learning_offline_download_asset');
    });

    await ensureUpdatedAtTrigger(knex, 'learning_offline_downloads');
  }

  const hasAssessmentQueue = await knex.schema.hasTable('learning_offline_assessment_submissions');
  if (!hasAssessmentQueue) {
    await knex.schema.createTable('learning_offline_assessment_submissions', (table) => {
      table.uuid('id').primary().defaultTo(defaultUuid(knex));
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('client_submission_id', 120).notNullable();
      table
        .integer('assignment_id')
        .unsigned()
        .references('id')
        .inTable('course_assignments')
        .onDelete('SET NULL');
      table.string('assessment_key', 160).notNullable();
      table
        .enu('state', ASSESSMENT_STATES, {
          useNative: true,
          enumName: 'learning_offline_assessment_state'
        })
        .notNullable()
        .defaultTo('queued');
      table.json('payload').notNullable().defaultTo(jsonDefault(knex, {}));
      table.text('error_message');
      table.timestamp('queued_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('synced_at');
      table.timestamp('last_attempt_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.unique(['user_id', 'client_submission_id'], 'uq_learning_offline_assessment_client');
      table.index(['user_id', 'state'], 'idx_learning_offline_assessment_user_state');
      table.index(['assessment_key'], 'idx_learning_offline_assessment_key');
    });

    await ensureUpdatedAtTrigger(knex, 'learning_offline_assessment_submissions');
  }

  const hasSnapshots = await knex.schema.hasTable('learning_offline_module_snapshots');
  if (!hasSnapshots) {
    await knex.schema.createTable('learning_offline_module_snapshots', (table) => {
      table.uuid('id').primary().defaultTo(defaultUuid(knex));
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('course_id')
        .unsigned()
        .references('id')
        .inTable('courses')
        .onDelete('SET NULL');
      table
        .integer('module_id')
        .unsigned()
        .references('id')
        .inTable('course_modules')
        .onDelete('SET NULL');
      table.string('course_public_id', 72).notNullable();
      table.string('module_slug', 160).notNullable();
      table.decimal('completion_ratio', 7, 4).notNullable().defaultTo(0);
      table.text('notes');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('captured_at').notNullable().defaultTo(knex.fn.now());
      addTimestamps(table, knex);
      table.unique(['user_id', 'course_public_id', 'module_slug'], 'uq_learning_offline_snapshot_scope');
      table.index(['user_id', 'captured_at'], 'idx_learning_offline_snapshot_user_captured');
    });

    await ensureUpdatedAtTrigger(knex, 'learning_offline_module_snapshots');
  }

  const hasInstructorQueue = await knex.schema.hasTable('instructor_action_queue');
  if (!hasInstructorQueue) {
    await knex.schema.createTable('instructor_action_queue', (table) => {
      table.uuid('id').primary().defaultTo(defaultUuid(knex));
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('client_action_id', 120).notNullable();
      table
        .enu('action_type', ACTION_TYPES, {
          useNative: true,
          enumName: 'instructor_action_type'
        })
        .notNullable();
      table
        .enu('state', ACTION_STATES, {
          useNative: true,
          enumName: 'instructor_action_state'
        })
        .notNullable()
        .defaultTo('queued');
      table.json('payload').notNullable().defaultTo(jsonDefault(knex, {}));
      table.text('error_message');
      table.timestamp('queued_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('processed_at');
      table.timestamp('completed_at');
      table.timestamp('failed_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.unique(['user_id', 'client_action_id'], 'uq_instructor_action_client');
      table.index(['user_id', 'state'], 'idx_instructor_action_user_state');
      table.index(['action_type'], 'idx_instructor_action_type');
    });

    await ensureUpdatedAtTrigger(knex, 'instructor_action_queue');
  }
}

export async function down(knex) {
  const tables = [
    'instructor_action_queue',
    'learning_offline_module_snapshots',
    'learning_offline_assessment_submissions',
    'learning_offline_downloads'
  ];

  for (const tableName of tables) {
    const exists = await knex.schema.hasTable(tableName);
    if (exists) {
      await knex.schema.dropTable(tableName);
    }
  }

  const enums = [
    'instructor_action_state',
    'instructor_action_type',
    'learning_offline_assessment_state',
    'learning_offline_download_state'
  ];

  if (typeof knex.client?.query === 'function' && enums.length > 0) {
    for (const enumName of enums) {
      try {
        await knex.raw(`DROP TYPE IF EXISTS "${enumName}" CASCADE`);
      } catch (error) {
        // ignore clean-up errors (e.g., non-Postgres dialects)
        if (process.env.NODE_ENV !== 'test') {
          console.warn(`Failed to drop enum ${enumName}:`, error.message);
        }
      }
    }
  }
}
