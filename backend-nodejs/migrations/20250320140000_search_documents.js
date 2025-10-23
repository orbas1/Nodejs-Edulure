import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasDocumentsTable = await knex.schema.hasTable('search_documents');
  if (!hasDocumentsTable) {
    await knex.schema.createTable('search_documents', (table) => {
      table.increments('id').primary();
      table.string('entity_type', 64).notNullable();
      table.string('entity_id', 64).notNullable();
      table.uuid('entity_public_id');
      table.string('slug', 240);
      table.string('title', 240).notNullable();
      table.string('subtitle', 240);
      table.text('description');
      table.string('thumbnail_url', 500);
      table.json('keywords').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.string('category', 120);
      table.string('level', 60);
      table.string('country', 4);
      table.string('language_codes', 255);
      table.string('tag_slugs', 500);
      table.string('price_currency', 3).notNullable().defaultTo('USD');
      table.integer('price_amount_minor').unsigned().notNullable().defaultTo(0);
      table.decimal('rating_average', 8, 4).notNullable().defaultTo(0);
      table.integer('rating_count').unsigned().notNullable().defaultTo(0);
      table.integer('member_count').unsigned().notNullable().defaultTo(0);
      table.integer('post_count').unsigned().notNullable().defaultTo(0);
      table.integer('completed_sessions').unsigned().notNullable().defaultTo(0);
      table.integer('response_time_minutes').unsigned().notNullable().defaultTo(0);
      table.boolean('is_verified').notNullable().defaultTo(false);
      table.decimal('popularity_score', 12, 4).notNullable().defaultTo(0);
      table.decimal('freshness_score', 12, 4).notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('published_at');
      table.timestamp('indexed_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('refreshed_at');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['entity_type', 'entity_id'], 'search_documents_entity_unique');
      table.index(['entity_type', 'is_active'], 'idx_search_documents_type_active');
      table.index(['entity_type', 'category'], 'idx_search_documents_category');
      table.index(['entity_type', 'level'], 'idx_search_documents_level');
      table.index(['entity_type', 'price_currency'], 'idx_search_documents_price_currency');
      table.index(['entity_type', 'country'], 'idx_search_documents_country');
      table.index(['entity_type', 'is_verified'], 'idx_search_documents_verified');
      table.index(['popularity_score'], 'idx_search_documents_popularity');
      table.index(['freshness_score'], 'idx_search_documents_freshness');
      table.index(['updated_at'], 'idx_search_documents_updated_at');
    });
  }

  const hasQueueTable = await knex.schema.hasTable('search_document_refresh_queue');
  if (!hasQueueTable) {
    await knex.schema.createTable('search_document_refresh_queue', (table) => {
      table.increments('id').primary();
      table.string('entity_type', 64).notNullable();
      table.string('entity_id', 64).notNullable();
      table
        .enu('priority', ['low', 'normal', 'high'])
        .notNullable()
        .defaultTo('normal');
      table.string('reason', 120).notNullable().defaultTo('unspecified');
      table.timestamp('run_at').notNullable().defaultTo(knex.fn.now());
      table.integer('attempts').unsigned().notNullable().defaultTo(0);
      table.timestamp('last_attempt_at');
      table.text('last_error');
      table.timestamp('processed_at');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['entity_type', 'entity_id'], 'search_document_refresh_unique');
      table.index(['priority', 'run_at'], 'idx_search_document_refresh_priority');
      table.index(['processed_at'], 'idx_search_document_refresh_processed');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('search_document_refresh_queue');
  await knex.schema.dropTableIfExists('search_documents');
}
