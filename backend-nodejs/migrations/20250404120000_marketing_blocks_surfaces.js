import { jsonDefault } from './_helpers/schema.js';

export async function up(knex) {
  const hasSurfacesColumn = await knex.schema.hasColumn('marketing_blocks', 'surfaces');
  if (!hasSurfacesColumn) {
    await knex.schema.alterTable('marketing_blocks', (table) => {
      table.json('surfaces').notNullable().defaultTo(jsonDefault(knex, '[]'));
    });
  }

  const hasPayloadColumn = await knex.schema.hasColumn('marketing_blocks', 'payload');
  if (!hasPayloadColumn) {
    await knex.schema.alterTable('marketing_blocks', (table) => {
      table.json('payload').notNullable().defaultTo(jsonDefault(knex, '{}'));
    });
  }
}

export async function down(knex) {
  const hasPayloadColumn = await knex.schema.hasColumn('marketing_blocks', 'payload');
  if (hasPayloadColumn) {
    await knex.schema.alterTable('marketing_blocks', (table) => {
      table.dropColumn('payload');
    });
  }

  const hasSurfacesColumn = await knex.schema.hasColumn('marketing_blocks', 'surfaces');
  if (hasSurfacesColumn) {
    await knex.schema.alterTable('marketing_blocks', (table) => {
      table.dropColumn('surfaces');
    });
  }
}
