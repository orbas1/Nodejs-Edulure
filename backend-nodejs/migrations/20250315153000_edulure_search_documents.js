import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('search_documents');
  if (hasTable) {
    return;
  }

  await knex.schema.createTable('search_documents', (table) => {
    table.increments('id').primary();
    table.string('entity_type', 64).notNullable();
    table.string('entity_id', 80).notNullable();
    table.string('title', 255).notNullable();
    table.text('summary');
    table.text('search_vector', 'longtext').notNullable();
    table.json('filters').notNullable().defaultTo(jsonDefault(knex, {}));
    table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
    table.json('media').notNullable().defaultTo(jsonDefault(knex, {}));
    table.json('geo').notNullable().defaultTo(jsonDefault(knex, {}));
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['entity_type', 'entity_id'], 'search_documents_entity_unique');
    table.index(['entity_type', 'updated_at'], 'search_documents_entity_updated_idx');
    table.index(['entity_type', 'created_at'], 'search_documents_entity_created_idx');
    table.index(['entity_type', 'title'], 'search_documents_entity_title_idx');
  });

  await knex.schema.raw(
    'ALTER TABLE ?? ADD FULLTEXT INDEX ?? (??)',
    ['search_documents', 'search_documents_search_vector_fulltext', 'search_vector']
  );
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('search_documents');
}
