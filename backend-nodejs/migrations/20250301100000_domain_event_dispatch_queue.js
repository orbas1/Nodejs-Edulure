export async function up(knex) {
  const hasTable = await knex.schema.hasTable('domain_event_dispatch_queue');
  if (!hasTable) {
    await knex.schema.createTable('domain_event_dispatch_queue', (table) => {
      table.increments('id').primary();
      table
        .integer('event_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('domain_events')
        .onDelete('CASCADE');
      table
        .enu('status', ['pending', 'processing', 'delivered', 'failed'])
        .notNullable()
        .defaultTo('pending');
      table.integer('priority').notNullable().defaultTo(0);
      table.timestamp('available_at').notNullable().defaultTo(knex.fn.now());
      table.integer('attempt_count').notNullable().defaultTo(0);
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
      table.index(['status', 'available_at']);
      table.index(['event_id']);
      table.index(['locked_by']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('domain_event_dispatch_queue');
}
