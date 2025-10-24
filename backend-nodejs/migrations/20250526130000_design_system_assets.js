import { jsonDefault } from './_helpers/utils.js';

const TOKENS_TABLE = 'design_system_tokens';
const RESEARCH_TABLE = 'ux_research_insights';

function addTimestamps(table, knex) {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  table
    .timestamp('updated_at')
    .notNullable()
    .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
}

export async function up(knex) {
  const hasTokens = await knex.schema.hasTable(TOKENS_TABLE);
  if (!hasTokens) {
    await knex.schema.createTable(TOKENS_TABLE, (table) => {
      table.increments('id').primary();
      table.string('token_key', 160).notNullable();
      table.string('token_value', 255).notNullable();
      table
        .enum('source', ['base', 'media', 'data'])
        .notNullable()
        .defaultTo('base');
      table.string('context', 255);
      table.string('selector', 255).notNullable().defaultTo(':root');
      table.string('token_category', 120).notNullable().defaultTo('general');
      table.integer('display_order').unsigned().notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.unique(['token_key', 'source', 'selector', 'context'], 'design_system_tokens_unique');
      table.index(['token_key'], 'idx_design_system_tokens_key');
      table.index(['token_category'], 'idx_design_system_tokens_category');
    });
  }

  const hasResearch = await knex.schema.hasTable(RESEARCH_TABLE);
  if (!hasResearch) {
    await knex.schema.createTable(RESEARCH_TABLE, (table) => {
      table.increments('id').primary();
      table.string('slug', 160).notNullable();
      table.string('title', 255).notNullable();
      table
        .enum('status', ['planned', 'scheduled', 'in_progress', 'completed'])
        .notNullable()
        .defaultTo('planned');
      table.date('recorded_at').notNullable();
      table.string('owner', 160).notNullable();
      table.text('summary').notNullable();
      table.json('tokens_impacted').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('documents').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('participants').notNullable().defaultTo(jsonDefault(knex, []));
      table.string('evidence_url', 255);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.unique(['slug'], 'ux_research_insights_slug_unique');
      table.index(['status'], 'idx_ux_research_insights_status');
      table.index(['recorded_at'], 'idx_ux_research_insights_recorded_at');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists(RESEARCH_TABLE);
  await knex.schema.dropTableIfExists(TOKENS_TABLE);
}
