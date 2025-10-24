import { buildEnvironmentColumns, getEnvironmentDescriptor } from '../src/utils/environmentContext.js';

const DEFAULT_ENVIRONMENT_DESCRIPTOR = getEnvironmentDescriptor();
const DEFAULT_ENVIRONMENT_COLUMNS = buildEnvironmentColumns(DEFAULT_ENVIRONMENT_DESCRIPTOR);

export async function up(knex) {
  const exists = await knex.schema.hasTable('enablement_guides');
  if (exists) {
    return;
  }

  await knex.schema.createTable('enablement_guides', (table) => {
    table.increments('id').primary();
    table.string('slug', 160).notNullable().unique();
    table.string('title', 240).notNullable();
    table.string('summary', 512).notNullable();
    table.text('excerpt').notNullable();
    table.string('owner', 160).notNullable();
    table.json('audience').notNullable().defaultTo(JSON.stringify([]));
    table.json('products').notNullable().defaultTo(JSON.stringify([]));
    table.json('tags').notNullable().defaultTo(JSON.stringify([]));
    table.json('capabilities').notNullable().defaultTo(JSON.stringify([]));
    table.json('deliverables').notNullable().defaultTo(JSON.stringify([]));
    table.integer('reading_time_minutes').unsigned().notNullable().defaultTo(5);
    table.integer('time_to_complete_minutes').unsigned().notNullable().defaultTo(0);
    table.integer('word_count').unsigned().notNullable().defaultTo(0);
    table.string('content_hash', 128).notNullable();
    table.string('source_path', 512).notNullable();
    table.json('metadata').notNullable().defaultTo(JSON.stringify({}));
    table.timestamp('published_at');
    table.timestamp('last_indexed_at').notNullable().defaultTo(knex.fn.now());
    table.string('search_text', 2048).notNullable();
    table
      .string('environment_key', 80)
      .notNullable()
      .defaultTo(DEFAULT_ENVIRONMENT_COLUMNS.environment_key);
    table
      .string('environment_name', 160)
      .notNullable()
      .defaultTo(DEFAULT_ENVIRONMENT_COLUMNS.environment_name);
    table
      .string('environment_tier', 60)
      .defaultTo(DEFAULT_ENVIRONMENT_COLUMNS.environment_tier);
    table
      .string('environment_region', 120)
      .defaultTo(DEFAULT_ENVIRONMENT_COLUMNS.environment_region);
    table
      .string('environment_workspace', 160)
      .defaultTo(DEFAULT_ENVIRONMENT_COLUMNS.environment_workspace ?? null);
    table.timestamps(true, true);

    table.index(['environment_key', 'slug'], 'enablement_guides_env_slug_idx');
    table.index(['environment_key', 'owner'], 'enablement_guides_env_owner_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('enablement_guides');
}
