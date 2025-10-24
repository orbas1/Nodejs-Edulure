export async function up(knex) {
  await knex.schema.alterTable('platform_settings', (table) => {
    table.integer('version').unsigned().notNullable().defaultTo(1);
  });

  await knex('platform_settings').update({ version: 1 });
}

export async function down(knex) {
  await knex.schema.alterTable('platform_settings', (table) => {
    table.dropColumn('version');
  });
}
