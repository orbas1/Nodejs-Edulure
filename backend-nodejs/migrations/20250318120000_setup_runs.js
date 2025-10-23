import { addTimestamps, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

const JSON_EMPTY_OBJECT = (knex) => jsonDefault(knex, '{}');
const JSON_EMPTY_ARRAY = (knex) => jsonDefault(knex, '[]');

export async function up(knex) {
  const hasSetupRuns = await knex.schema.hasTable('setup_runs');
  if (!hasSetupRuns) {
    await knex.schema.createTable('setup_runs', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique('setup_runs_public_id_unique');
      table.string('preset_id', 100);
      table
        .enum('status', ['running', 'succeeded', 'failed'])
        .notNullable()
        .defaultTo('running');
      table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.timestamp('heartbeat_at');
      table.json('last_error');
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      addTimestamps(table, knex);
      table.index(['status'], 'idx_setup_runs_status');
      table.index(['created_at'], 'idx_setup_runs_created_at');
    });
    await ensureUpdatedAtTrigger(knex, 'setup_runs');
  }

  const hasSetupRunTasks = await knex.schema.hasTable('setup_run_tasks');
  if (!hasSetupRunTasks) {
    await knex.schema.createTable('setup_run_tasks', (table) => {
      table.increments('id').primary();
      table
        .integer('run_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('setup_runs')
        .onDelete('CASCADE');
      table.string('task_id', 120).notNullable();
      table.string('label', 255).notNullable();
      table.integer('order_index').unsigned().notNullable().defaultTo(0);
      table
        .enum('status', ['pending', 'running', 'succeeded', 'failed'])
        .notNullable()
        .defaultTo('pending');
      table.json('logs').notNullable().defaultTo(JSON_EMPTY_ARRAY(knex));
      table.json('error').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.timestamp('started_at');
      table.timestamp('completed_at');
      addTimestamps(table, knex);
      table.unique(['run_id', 'task_id'], 'setup_run_tasks_unique_task');
      table.index(['run_id', 'order_index'], 'idx_setup_run_tasks_run_order');
      table.index(['status'], 'idx_setup_run_tasks_status');
    });
    await ensureUpdatedAtTrigger(knex, 'setup_run_tasks');
  }
}

export async function down(knex) {
  const hasSetupRunTasks = await knex.schema.hasTable('setup_run_tasks');
  if (hasSetupRunTasks) {
    await knex.schema.dropTable('setup_run_tasks');
  }

  const hasSetupRuns = await knex.schema.hasTable('setup_runs');
  if (hasSetupRuns) {
    await knex.schema.dropTable('setup_runs');
  }
}
