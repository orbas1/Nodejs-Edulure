const TABLE_NAME = 'domain_event_dispatch_queue';

const STATUS_ENUM = [
  'pending',
  'delivering',
  'delivered',
  'failed',
  'discarded'
];

export async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME);
  if (exists) {
    return;
  }

  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary();
    table
      .integer('domain_event_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('domain_events')
      .onDelete('CASCADE');
    table
      .enu('status', STATUS_ENUM, {
        useNative: true,
        enumName: 'domain_event_dispatch_status'
      })
      .notNullable()
      .defaultTo('pending');
    table.string('delivery_channel', 120).notNullable().defaultTo('webhook');
    table
      .integer('attempts')
      .unsigned()
      .notNullable()
      .defaultTo(0);
    table
      .integer('max_attempts')
      .unsigned()
      .notNullable()
      .defaultTo(12);
    table.timestamp('available_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('locked_at');
    table.string('locked_by', 120);
    table.timestamp('delivered_at');
    table.timestamp('failed_at');
    table.string('last_error', 500);
    table.timestamp('last_error_at');
    table.string('payload_checksum', 128).notNullable();
    table.json('metadata').notNullable().defaultTo('{}');
    table.boolean('dry_run').notNullable().defaultTo(false);
    table.string('trace_id', 64);
    table.string('correlation_id', 64);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['status', 'available_at'], 'dedq_status_available_idx');
    table.index(['locked_by', 'locked_at'], 'dedq_lock_idx');
    table.index(['domain_event_id'], 'dedq_event_idx');
    table.index(['dry_run', 'status'], 'dedq_dryrun_status_idx');
  });
}

export async function down(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME);
  if (!exists) {
    return;
  }

  await knex.schema.dropTable(TABLE_NAME);
}
