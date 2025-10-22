import { jsonDefault } from './_helpers/utils.js';
const JSON_EMPTY_OBJECT = (knex) => jsonDefault(knex, {});
const JSON_EMPTY_ARRAY = (knex) => jsonDefault(knex, []);

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('creation_recommendation_logs');
  if (!hasTable) {
    await knex.schema.createTable('creation_recommendation_logs', (table) => {
      table.increments('id').primary();
      table.string('tenant_id', 120).notNullable().defaultTo('global');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('recommendation_type', 60).notNullable();
      table.string('algorithm_version', 24).notNullable();
      table.string('feature_flag_key', 120).notNullable();
      table.string('feature_flag_state', 32).notNullable();
      table.string('feature_flag_variant', 64);
      table.json('context').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.json('results').notNullable().defaultTo(JSON_EMPTY_ARRAY(knex));
      table.json('explainability').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.timestamp('generated_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'recommendation_type']);
      table.index(['user_id', 'recommendation_type']);
      table.index(['feature_flag_key', 'feature_flag_state'], 'idx_cr_logs_flag_state');
      table.index(['generated_at']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('creation_recommendation_logs');
}
