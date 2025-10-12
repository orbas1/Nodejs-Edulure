exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('saved_searches');
  if (!hasTable) {
    await knex.schema.createTable('saved_searches', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('name', 120).notNullable();
      table.string('search_query', 500).notNullable();
      table.json('entity_types').notNullable().defaultTo('[]');
      table.json('filters').notNullable().defaultTo('{}');
      table.json('global_filters').notNullable().defaultTo('{}');
      table.json('sort_preferences').notNullable().defaultTo('{}');
      table.timestamp('last_used_at');
      table.boolean('is_pinned').notNullable().defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id', 'name']);
      table.index(['user_id', 'created_at']);
      table.index(['user_id', 'last_used_at']);
    });
  }
};

exports.down = async function down(knex) {
  const hasTable = await knex.schema.hasTable('saved_searches');
  if (hasTable) {
    await knex.schema.dropTable('saved_searches');
  }
};
