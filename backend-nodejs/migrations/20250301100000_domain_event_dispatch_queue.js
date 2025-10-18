const TABLE_NAME = 'domain_event_dispatch_queue';

const STATUS_ENUM = ['pending', 'processing', 'delivered', 'failed'];

export async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME);
  if (exists) {
    return;
  }

  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary();
    table
      .integer('event_id')
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
    table.integer('priority').notNullable().defaultTo(0);
    table
      .integer('attempt_count')
      .unsigned()
      .notNullable()
      .defaultTo(0);
    table.timestamp('available_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('locked_at');
    table.string('locked_by', 120);
    table.timestamp('delivered_at');
    table.text('last_error');
    table.json('metadata');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['status', 'available_at'], 'dedq_status_available_idx');
    table.index(['locked_by', 'locked_at'], 'dedq_lock_idx');
    table.index(['event_id'], 'dedq_event_idx');
  });
}

export async function down(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME);
  if (!exists) {
    return;
  }

  await knex.schema.dropTable(TABLE_NAME);
}
