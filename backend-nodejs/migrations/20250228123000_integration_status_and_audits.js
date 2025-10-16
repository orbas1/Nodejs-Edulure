export async function up(knex) {
  await knex.schema.createTable('integration_statuses', (table) => {
    table.increments('id').primary();
    table.string('integration', 32).notNullable();
    table.string('environment', 32).notNullable().defaultTo('production');
    table.string('status', 24).notNullable().defaultTo('unknown');
    table.string('status_summary', 255).nullable();
    table
      .integer('latest_sync_run_id')
      .unsigned()
      .references('id')
      .inTable('integration_sync_runs')
      .onDelete('SET NULL');
    table
      .integer('primary_api_key_id')
      .unsigned()
      .references('id')
      .inTable('integration_api_keys')
      .onDelete('SET NULL');
    table.timestamp('last_success_at').nullable();
    table.timestamp('last_failure_at').nullable();
    table.integer('open_incident_count').unsigned().notNullable().defaultTo(0);
    table.integer('consecutive_failures').unsigned().notNullable().defaultTo(0);
    table.json('metadata').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['integration', 'environment'], 'integration_statuses_integration_env_unique');
    table.index(['status', 'updated_at'], 'integration_statuses_status_updated_idx');
    table.index(['primary_api_key_id'], 'integration_statuses_api_key_idx');
  });

  await knex.schema.createTable('integration_status_events', (table) => {
    table.increments('id').primary();
    table
      .integer('status_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('integration_statuses')
      .onDelete('CASCADE');
    table.string('integration', 32).notNullable();
    table.string('environment', 32).notNullable().defaultTo('production');
    table.string('status', 24).notNullable();
    table.string('status_summary', 255).nullable();
    table
      .integer('sync_run_id')
      .unsigned()
      .references('id')
      .inTable('integration_sync_runs')
      .onDelete('SET NULL');
    table
      .integer('api_key_id')
      .unsigned()
      .references('id')
      .inTable('integration_api_keys')
      .onDelete('SET NULL');
    table.integer('consecutive_failures').unsigned().notNullable().defaultTo(0);
    table.integer('open_incident_count').unsigned().notNullable().defaultTo(0);
    table.string('triggered_by', 64).nullable();
    table.string('correlation_id', 64).nullable();
    table.text('notes').nullable();
    table.json('metadata').nullable();
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());

    table.index(['integration', 'recorded_at'], 'integration_status_events_integration_idx');
    table.index(['status', 'recorded_at'], 'integration_status_events_status_idx');
  });

  await knex.schema.createTable('integration_external_call_audits', (table) => {
    table.increments('id').primary();
    table.string('integration', 32).notNullable();
    table.string('provider', 64).notNullable();
    table.string('environment', 32).notNullable().defaultTo('production');
    table
      .integer('api_key_id')
      .unsigned()
      .references('id')
      .inTable('integration_api_keys')
      .onDelete('SET NULL');
    table.string('request_method', 16).notNullable();
    table.string('request_path', 255).notNullable();
    table.integer('status_code').unsigned().nullable();
    table.string('outcome', 32).notNullable();
    table.string('direction', 16).notNullable();
    table.integer('duration_ms').unsigned().nullable();
    table.string('request_id', 128).nullable();
    table.string('correlation_id', 64).nullable();
    table.string('triggered_by', 64).nullable();
    table.string('error_code', 64).nullable();
    table.text('error_message').nullable();
    table.json('metadata').nullable();
    table.timestamp('called_at').notNullable().defaultTo(knex.fn.now());

    table.index(['integration', 'called_at'], 'integration_call_audits_integration_idx');
    table.index(['outcome', 'called_at'], 'integration_call_audits_outcome_idx');
    table.index(['api_key_id', 'called_at'], 'integration_call_audits_key_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('integration_external_call_audits');
  await knex.schema.dropTableIfExists('integration_status_events');
  await knex.schema.dropTableIfExists('integration_statuses');
}
