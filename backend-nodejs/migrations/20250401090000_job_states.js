const TABLE_NAME = 'job_states';

exports.up = async (knex) => {
  const exists = await knex.schema.hasTable(TABLE_NAME);
  if (exists) {
    return;
  }

  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary();
    table.string('job_name', 150).notNullable().unique();
    table.json('state').notNullable();
    table.string('checksum', 128).notNullable();
    table.timestamp('locked_at').nullable();
    table.string('locked_by', 120).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  const exists = await knex.schema.hasTable(TABLE_NAME);
  if (!exists) {
    return;
  }

  await knex.schema.dropTable(TABLE_NAME);
};
