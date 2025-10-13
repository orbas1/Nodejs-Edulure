exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('platform_settings');
  if (!hasTable) {
    await knex.schema.createTable('platform_settings', (table) => {
      table.increments('id').primary();
      table.string('key', 120).notNullable().unique();
      table.json('value').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('platform_settings');
};
