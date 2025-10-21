const JSON_EMPTY_OBJECT = JSON.stringify({});
const JSON_EMPTY_ARRAY = JSON.stringify([]);

export async function up(knex) {
  await knex.schema.createTable('integration_webhook_subscriptions', (table) => {
    table.increments('id').primary();
    table
      .uuid('public_id')
      .notNullable()
      .defaultTo(knex.raw('(UUID())'));
    table.string('name', 128).notNullable();
    table.string('target_url', 2048).notNullable();
    table.boolean('enabled').notNullable().defaultTo(true);
    table.json('event_types').notNullable().defaultTo(JSON_EMPTY_ARRAY);
    table.json('static_headers').notNullable().defaultTo(JSON_EMPTY_OBJECT);
    table.string('signing_secret', 128).notNullable();
    table
      .integer('delivery_timeout_ms')
      .unsigned()
      .notNullable()
      .defaultTo(5000);
    table.integer('max_attempts').unsigned().notNullable().defaultTo(6);
    table.integer('retry_backoff_seconds').unsigned().notNullable().defaultTo(60);
    table.integer('circuit_breaker_threshold').unsigned().notNullable().defaultTo(5);
    table.integer('circuit_breaker_duration_seconds').unsigned().notNullable().defaultTo(900);
    table.integer('consecutive_failures').unsigned().notNullable().defaultTo(0);
    table.timestamp('last_failure_at').nullable();
    table.timestamp('circuit_open_until').nullable();
    table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['public_id']);
    table.index(
      ['enabled', 'circuit_open_until'],
      'integration_webhook_subscriptions_enabled_circuit_idx'
    );
    table.index(['target_url'], 'integration_webhook_subscriptions_target_idx');
  });

  await knex.schema.createTable('integration_webhook_events', (table) => {
    table.increments('id').primary();
    table
      .uuid('event_uuid')
      .notNullable()
      .defaultTo(knex.raw('(UUID())'));
    table.string('event_type', 128).notNullable();
    table.string('status', 24).notNullable().defaultTo('queued');
    table.string('source', 64).notNullable();
    table.string('correlation_id', 64).notNullable();
    table.json('payload').notNullable();
    table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT);
    table.timestamp('first_queued_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_attempt_at').nullable();
    table.timestamp('delivered_at').nullable();
    table.timestamp('failed_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['event_uuid']);
    table.index(['event_type', 'status'], 'integration_webhook_events_type_status_idx');
    table.index(['correlation_id'], 'integration_webhook_events_correlation_idx');
    table.index(['status', 'created_at'], 'integration_webhook_events_status_created_idx');
  });

  await knex.schema.createTable('integration_webhook_deliveries', (table) => {
    table.increments('id').primary();
    table
      .uuid('delivery_uuid')
      .notNullable()
      .defaultTo(knex.raw('(UUID())'));
    table
      .integer('event_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('integration_webhook_events')
      .onDelete('CASCADE');
    table
      .integer('subscription_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('integration_webhook_subscriptions')
      .onDelete('CASCADE');
    table.string('status', 24).notNullable().defaultTo('pending');
    table.integer('attempt_count').unsigned().notNullable().defaultTo(0);
    table.integer('max_attempts').unsigned().notNullable().defaultTo(6);
    table.timestamp('next_attempt_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_attempt_at').nullable();
    table.integer('response_code').nullable();
    table.text('response_body').nullable();
    table.string('error_code', 64).nullable();
    table.text('error_message').nullable();
    table.json('delivery_headers').notNullable().defaultTo(JSON_EMPTY_OBJECT);
    table.timestamp('delivered_at').nullable();
    table.timestamp('failed_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['delivery_uuid']);
    table.index(['status', 'next_attempt_at'], 'integration_webhook_deliveries_status_next_idx');
    table.index(['event_id', 'status'], 'integration_webhook_deliveries_event_status_idx');
    table.index(
      ['subscription_id', 'status'],
      'integration_webhook_deliveries_subscription_status_idx'
    );
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('integration_webhook_deliveries');
  await knex.schema.dropTableIfExists('integration_webhook_events');
  await knex.schema.dropTableIfExists('integration_webhook_subscriptions');
}
