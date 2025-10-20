const JSON_EMPTY_OBJECT = JSON.stringify({});
const JSON_EMPTY_ARRAY = JSON.stringify([]);

export async function up(knex) {
  await knex.schema.createTable('integration_sync_runs', (table) => {
    table.increments('id').primary();
    table.string('integration', 32).notNullable();
    table.string('sync_type', 32).notNullable();
    table.string('status', 24).notNullable().defaultTo('pending');
    table.string('triggered_by', 32).notNullable().defaultTo('scheduler');
    table.string('correlation_id', 64).notNullable();
    table.integer('retry_attempt').unsigned().notNullable().defaultTo(0);
    table.timestamp('window_start_at').nullable();
    table.timestamp('window_end_at').nullable();
    table.timestamp('started_at').nullable();
    table.timestamp('finished_at').nullable();
    table.integer('records_pushed').unsigned().notNullable().defaultTo(0);
    table.integer('records_pulled').unsigned().notNullable().defaultTo(0);
    table.integer('records_failed').unsigned().notNullable().defaultTo(0);
    table.integer('records_skipped').unsigned().notNullable().defaultTo(0);
    table.text('last_error').nullable();
    table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['integration', 'correlation_id'], 'integration_runs_correlation_unique');
    table.index(['integration', 'status', 'created_at'], 'integration_runs_status_created_idx');
    table.index(['integration', 'sync_type', 'created_at'], 'integration_runs_type_created_idx');
  });

  await knex.schema.createTable('integration_sync_results', (table) => {
    table.increments('id').primary();
    table
      .integer('sync_run_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('integration_sync_runs')
      .onDelete('CASCADE');
    table.string('integration', 32).notNullable();
    table.string('entity_type', 64).notNullable();
    table.string('entity_id', 64).notNullable();
    table.string('external_id', 128).nullable();
    table.string('direction', 16).notNullable();
    table.string('operation', 32).notNullable();
    table.string('status', 24).notNullable();
    table.integer('retry_count').unsigned().notNullable().defaultTo(0);
    table.text('message').nullable();
    table.json('payload').notNullable().defaultTo(JSON_EMPTY_OBJECT);
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());

    table.index(['integration', 'entity_type', 'entity_id'], 'integration_results_entity_idx');
    table.index(['integration', 'status', 'occurred_at'], 'integration_results_status_idx');
  });

  await knex.schema.createTable('integration_reconciliation_reports', (table) => {
    table.increments('id').primary();
    table.string('integration', 32).notNullable();
    table.date('report_date').notNullable();
    table.string('status', 24).notNullable().defaultTo('completed');
    table.integer('mismatch_count').unsigned().notNullable().defaultTo(0);
    table.json('missing_in_platform').notNullable().defaultTo(JSON_EMPTY_ARRAY);
    table.json('missing_in_integration').notNullable().defaultTo(JSON_EMPTY_ARRAY);
    table.json('extra_context').notNullable().defaultTo(JSON_EMPTY_OBJECT);
    table.timestamp('generated_at').notNullable().defaultTo(knex.fn.now());
    table.string('correlation_id', 64).notNullable();

    table.unique(['integration', 'report_date'], 'integration_reports_date_unique');
    table.index(['integration', 'generated_at'], 'integration_reports_generated_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('integration_reconciliation_reports');
  await knex.schema.dropTableIfExists('integration_sync_results');
  await knex.schema.dropTableIfExists('integration_sync_runs');
}
