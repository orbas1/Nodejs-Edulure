import { addTimestamps, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

const TABLE_NAME = 'service_presets';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE_NAME);
  if (!hasTable) {
    await knex.schema.createTable(TABLE_NAME, (table) => {
      table.increments('id').primary();
      table.string('key', 64).notNullable().unique();
      table.string('label', 120).notNullable();
      table.string('description', 500);
      table.json('default_targets').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('default_job_groups').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
    });
    await ensureUpdatedAtTrigger(knex, TABLE_NAME);
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists(TABLE_NAME);
}
