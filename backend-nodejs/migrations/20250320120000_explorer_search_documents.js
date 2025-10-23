import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('explorer_search_documents');
  if (hasTable) {
    return;
  }

  await knex.schema.createTable('explorer_search_documents', (table) => {
    table.increments('id').primary();
    table.string('entity_type', 64).notNullable();
    table.string('entity_id', 191).notNullable();
    table.string('slug', 255);
    table.string('title', 255).notNullable();
    table.string('subtitle', 255);
    table.text('description');
    table.json('tags').notNullable().defaultTo(jsonDefault(knex, []));
    table.json('categories').notNullable().defaultTo(jsonDefault(knex, []));
    table.json('languages').notNullable().defaultTo(jsonDefault(knex, []));
    table.string('price_currency', 3);
    table.bigInteger('price_amount').unsigned();
    table.decimal('rating_average', 6, 3);
    table.integer('rating_count').unsigned();
    table.integer('member_count').unsigned();
    table.integer('trend_score').unsigned();
    table.integer('enrolment_count').unsigned();
    table.integer('reading_time_minutes').unsigned();
    table.integer('hourly_rate_amount').unsigned();
    table.string('hourly_rate_currency', 3);
    table.integer('response_time_minutes').unsigned();
    table.timestamp('event_start_at');
    table.string('event_timezone', 60);
    table.boolean('event_is_ticketed');
    table.text('search_terms').notNullable().defaultTo('');
    table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
    table.json('metrics').notNullable().defaultTo(jsonDefault(knex, {}));
    table.string('preview_media_url', 500);
    table.string('preview_media_type', 40);
    table.text('preview_media_placeholder');
    table.decimal('geo_latitude', 10, 7);
    table.decimal('geo_longitude', 10, 7);
    table.string('geo_country', 2);
    table.decimal('popularity_score', 14, 4).notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['entity_type', 'entity_id'], 'explorer_search_documents_entity_unique');
    table.index(['entity_type', 'popularity_score'], 'explorer_search_documents_popularity_idx');
    table.index(['entity_type', 'search_terms'], 'explorer_search_documents_terms_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('explorer_search_documents');
}
