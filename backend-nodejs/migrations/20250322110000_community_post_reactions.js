import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('community_post_reactions');
  if (!hasTable) {
    await knex.schema.createTable('community_post_reactions', (table) => {
      table.increments('id').primary();
      table
        .integer('post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_posts')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('reaction', 32).notNullable();
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('reacted_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      table.unique(['post_id', 'user_id', 'reaction'], 'community_post_reactions_unique');
      table.index(['post_id', 'reaction'], 'community_post_reactions_post_reaction_idx');
      table.index(['user_id'], 'community_post_reactions_user_idx');
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('community_post_reactions');
  if (hasTable) {
    await knex.schema.dropTable('community_post_reactions');
  }
}
