import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('saved_searches', 'delivery_channels');
  if (!hasColumn) {
    await knex.schema.alterTable('saved_searches', (table) => {
      table.json('delivery_channels').notNullable().defaultTo(jsonDefault(knex, []));
    });
    await knex('saved_searches').update({ delivery_channels: JSON.stringify([]) });
  }
}

export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('saved_searches', 'delivery_channels');
  if (hasColumn) {
    await knex.schema.alterTable('saved_searches', (table) => {
      table.dropColumn('delivery_channels');
    });
  }
}
