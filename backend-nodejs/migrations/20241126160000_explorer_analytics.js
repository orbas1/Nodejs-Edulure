exports.up = async function up(knex) {
  const hasEvents = await knex.schema.hasTable('explorer_search_events');
  if (!hasEvents) {
    await knex.schema.createTable('explorer_search_events', (table) => {
      table.increments('id').primary();
      table.uuid('event_uuid').notNullable().defaultTo(knex.raw('(UUID())'));
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.uuid('session_id').notNullable();
      table.string('trace_id', 128);
      table.string('query', 500).notNullable();
      table.integer('result_total').unsigned().notNullable().defaultTo(0);
      table.boolean('is_zero_result').notNullable().defaultTo(false);
      table.integer('latency_ms').unsigned().notNullable().defaultTo(0);
      table.json('filters').notNullable().defaultTo('{}');
      table.json('global_filters').notNullable().defaultTo('{}');
      table.json('sort_preferences').notNullable().defaultTo('{}');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['event_uuid']);
      table.index(['created_at']);
      table.index(['is_zero_result']);
      table.index(['user_id']);
    });
  }

  const hasEventEntities = await knex.schema.hasTable('explorer_search_event_entities');
  if (!hasEventEntities) {
    await knex.schema.createTable('explorer_search_event_entities', (table) => {
      table.increments('id').primary();
      table
        .integer('event_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('explorer_search_events')
        .onDelete('CASCADE');
      table.string('entity_type', 80).notNullable();
      table.integer('total_hits').unsigned().notNullable().defaultTo(0);
      table.integer('displayed_hits').unsigned().notNullable().defaultTo(0);
      table.integer('processing_time_ms').unsigned().notNullable().defaultTo(0);
      table.boolean('is_zero_result').notNullable().defaultTo(false);
      table.integer('click_count').unsigned().notNullable().defaultTo(0);
      table.integer('conversion_count').unsigned().notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['event_id', 'entity_type']);
      table.index(['entity_type']);
      table.index(['is_zero_result']);
    });
  }

  const hasInteractions = await knex.schema.hasTable('explorer_search_event_interactions');
  if (!hasInteractions) {
    await knex.schema.createTable('explorer_search_event_interactions', (table) => {
      table.increments('id').primary();
      table
        .integer('event_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('explorer_search_events')
        .onDelete('CASCADE');
      table.string('entity_type', 80).notNullable();
      table.string('result_id', 191).notNullable();
      table.string('interaction_type', 60).notNullable();
      table.integer('position').unsigned().defaultTo(null);
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['event_id']);
      table.index(['entity_type']);
      table.index(['interaction_type']);
    });
  }

  const hasDailyMetrics = await knex.schema.hasTable('explorer_search_daily_metrics');
  if (!hasDailyMetrics) {
    await knex.schema.createTable('explorer_search_daily_metrics', (table) => {
      table.increments('id').primary();
      table.date('metric_date').notNullable();
      table.string('entity_type', 80).notNullable();
      table.bigInteger('searches').unsigned().notNullable().defaultTo(0);
      table.bigInteger('zero_results').unsigned().notNullable().defaultTo(0);
      table.bigInteger('displayed_results').unsigned().notNullable().defaultTo(0);
      table.bigInteger('total_results').unsigned().notNullable().defaultTo(0);
      table.bigInteger('clicks').unsigned().notNullable().defaultTo(0);
      table.bigInteger('conversions').unsigned().notNullable().defaultTo(0);
      table.integer('average_latency_ms').unsigned().notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo('{}');
      table.unique(['metric_date', 'entity_type']);
      table.index(['metric_date']);
      table.index(['entity_type']);
    });
  }

  const hasAlerts = await knex.schema.hasTable('analytics_alerts');
  if (!hasAlerts) {
    await knex.schema.createTable('analytics_alerts', (table) => {
      table.increments('id').primary();
      table.string('alert_code', 120).notNullable();
      table.string('severity', 40).notNullable();
      table.string('message', 500).notNullable();
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('detected_at').defaultTo(knex.fn.now());
      table.timestamp('resolved_at').defaultTo(null);
      table.index(['alert_code']);
      table.index(['resolved_at']);
    });
  }

  const hasForecasts = await knex.schema.hasTable('analytics_forecasts');
  if (!hasForecasts) {
    await knex.schema.createTable('analytics_forecasts', (table) => {
      table.increments('id').primary();
      table.string('forecast_code', 120).notNullable();
      table.date('target_date').notNullable();
      table.decimal('metric_value', 14, 4).notNullable();
      table.decimal('lower_bound', 14, 4).notNullable();
      table.decimal('upper_bound', 14, 4).notNullable();
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('generated_at').defaultTo(knex.fn.now());
      table.unique(['forecast_code', 'target_date']);
      table.index(['forecast_code']);
      table.index(['target_date']);
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('analytics_forecasts');
  await knex.schema.dropTableIfExists('analytics_alerts');
  await knex.schema.dropTableIfExists('explorer_search_daily_metrics');
  await knex.schema.dropTableIfExists('explorer_search_event_interactions');
  await knex.schema.dropTableIfExists('explorer_search_event_entities');
  await knex.schema.dropTableIfExists('explorer_search_events');
};
