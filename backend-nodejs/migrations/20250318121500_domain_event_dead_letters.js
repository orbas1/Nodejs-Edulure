const TABLE_NAME = 'domain_event_dead_letters';

export async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME);
  if (exists) {
    return;
  }

  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary();
    table
      .integer('dispatch_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('domain_event_dispatch_queue')
      .onDelete('CASCADE');
    table
      .integer('event_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('domain_events')
      .onDelete('CASCADE');
    table.string('event_type', 255).notNullable();
    table.integer('attempt_count').unsigned().notNullable();
    table.string('failure_reason', 120).notNullable();
    table.text('failure_message', 'mediumtext');
    table.json('event_payload');
    table.json('metadata');
    table.timestamp('failed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['dispatch_id'], 'dead_letters_dispatch_unique');
    table.index(['event_type'], 'dead_letters_event_type_idx');
    table.index(['failed_at'], 'dead_letters_failed_at_idx');
    table.index(['event_id'], 'dead_letters_event_id_idx');
  });

  await knex(TABLE_NAME).insert({
    dispatch_id: 0,
    event_id: 0,
    event_type: 'schema.bootstrap',
    attempt_count: 0,
    failure_reason: 'bootstrap',
    failure_message: 'Bootstrap row – remove via cleanup job when feature live.',
    failed_at: knex.fn.now(),
    event_payload: JSON.stringify({}),
    metadata: JSON.stringify({ createdBy: 'migration' })
  });

  await knex(TABLE_NAME)
    .where({ dispatch_id: 0 })
    .del();
}

export async function down(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME);
  if (!exists) {
    return;
  }
  await knex.schema.dropTable(TABLE_NAME);
}
