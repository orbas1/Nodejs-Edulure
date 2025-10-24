import { jsonDefault } from './_helpers/utils.js';
import { addTimestamps, ensureUpdatedAtTrigger } from './_helpers/schema.js';

export async function up(knex) {
  const hasProgressLogs = await knex.schema.hasTable('learner_module_progress_logs');
  if (!hasProgressLogs) {
    await knex.schema.createTable('learner_module_progress_logs', (table) => {
      table.string('id', 36).primary();
      table
        .integer('enrollment_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_enrollments')
        .onDelete('CASCADE');
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
      table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('synced_at');
      table.string('device_id', 64).notNullable();
      table.integer('completed_lessons').unsigned().notNullable().defaultTo(0);
      table.text('notes');
      table
        .enum('sync_state', ['pending', 'syncing', 'synced', 'conflict'])
        .notNullable()
        .defaultTo('pending');
      table.integer('revision').unsigned().notNullable().defaultTo(0);
      table.string('conflict_reason', 255);
      table.json('remote_snapshot').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.unique(['enrollment_id', 'module_id', 'occurred_at', 'device_id'], 'uniq_progress_log_occurrence');
      table.index(['course_id', 'module_id', 'occurred_at'], 'idx_progress_module_timeline');
      table.index(['enrollment_id', 'sync_state'], 'idx_progress_enrollment_state');
    });
    await ensureUpdatedAtTrigger(knex, 'learner_module_progress_logs');
  }

  const hasDownloads = await knex.schema.hasTable('learner_lesson_downloads');
  if (!hasDownloads) {
    await knex.schema.createTable('learner_lesson_downloads', (table) => {
      table.string('id', 36).primary();
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
      table
        .integer('lesson_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('course_lessons')
        .onDelete('CASCADE');
      table
        .enum('status', ['queued', 'running', 'completed', 'failed', 'cancelled'])
        .notNullable()
        .defaultTo('queued');
      table.integer('progress_percent').unsigned().notNullable().defaultTo(0);
      table.string('manifest_url', 500);
      table.string('checksum_sha256', 96);
      table.string('error_message', 255);
      table.timestamp('enqueued_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('started_at');
      table.timestamp('completed_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.unique(['user_id', 'lesson_id'], 'uniq_download_per_lesson');
      table.index(['user_id', 'status'], 'idx_download_user_status');
      table.index(['course_id', 'module_id'], 'idx_download_course_module');
    });
    await ensureUpdatedAtTrigger(knex, 'learner_lesson_downloads');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('learner_lesson_downloads');
  await knex.schema.dropTableIfExists('learner_module_progress_logs');
}
