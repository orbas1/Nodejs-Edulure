import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('search_documents');
  if (!hasTable) {
    return;
  }

  await knex.schema.alterTable('search_documents', (table) => {
    table.text('preview_summary');
    table.string('preview_image_url', 500);
    table.json('preview_highlights').notNullable().defaultTo(jsonDefault(knex, []));
    table.json('cta_links').notNullable().defaultTo(jsonDefault(knex, []));
    table.json('badges').notNullable().defaultTo(jsonDefault(knex, []));
    table.string('monetisation_tag', 120);
  });
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('search_documents');
  if (!hasTable) {
    return;
  }

  await knex.schema.alterTable('search_documents', (table) => {
    table.dropColumn('preview_summary');
    table.dropColumn('preview_image_url');
    table.dropColumn('preview_highlights');
    table.dropColumn('cta_links');
    table.dropColumn('badges');
    table.dropColumn('monetisation_tag');
  });
}
