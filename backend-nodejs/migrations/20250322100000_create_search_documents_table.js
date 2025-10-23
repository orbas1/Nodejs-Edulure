import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('search_documents');
  if (hasTable) {
    return;
  }

  await knex.schema.createTable('search_documents', (table) => {
    table.increments('id').primary();
    table.string('entity_type', 64).notNullable();
    table.string('document_id', 120).notNullable();
    table.string('title', 240).notNullable();
    table.string('slug', 240);
    table.string('image_url', 500);
    table.text('summary');
    table.text('body');
    table.json('tags').notNullable().defaultTo(jsonDefault(knex, []));
    table.json('facets').notNullable().defaultTo(jsonDefault(knex, {}));
    table.json('metrics').notNullable().defaultTo(jsonDefault(knex, {}));
    table.json('document').notNullable().defaultTo(jsonDefault(knex, {}));
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    table.unique(['entity_type', 'document_id'], 'search_documents_unique_entity_document');
    table.index(['entity_type', 'updated_at'], 'idx_search_documents_entity_updated');
    table.index(['entity_type', 'title'], 'idx_search_documents_entity_title');
  });

  const dialect = String(knex?.client?.config?.client ?? '').toLowerCase();
  if (dialect.includes('mysql')) {
    await knex.schema.raw(
      'ALTER TABLE `search_documents` ADD FULLTEXT INDEX `ft_search_documents_body` (`title`, `summary`, `body`)' 
    );
  } else if (dialect.includes('maria')) {
    await knex.schema.raw(
      'ALTER TABLE `search_documents` ADD FULLTEXT INDEX `ft_search_documents_body` (`title`, `summary`, `body`)' 
    );
  }
}

export async function down(knex) {
  const dialect = String(knex?.client?.config?.client ?? '').toLowerCase();
  if (dialect.includes('mysql') || dialect.includes('maria')) {
    await knex.schema.raw('ALTER TABLE `search_documents` DROP INDEX `ft_search_documents_body`').catch(() => {});
  }
  await knex.schema.dropTableIfExists('search_documents');
}
