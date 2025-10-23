import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('scheduler_checkpoints');
  if (hasTable) {
    return;
  }

  await knex.schema.createTable('scheduler_checkpoints', (table) => {
    table.increments('id').primary();
    table.string('job_key', 160).notNullable().unique();
    table.timestamp('last_run_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('next_run_at');
    table.string('last_status', 32).notNullable().defaultTo('unknown');
    table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
    table.text('last_error');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
  });

  await knex.schema.alterTable('scheduler_checkpoints', (table) => {
    table.index(['job_key', 'last_run_at'], 'scheduler_checkpoints_job_last_run_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('scheduler_checkpoints');
}
