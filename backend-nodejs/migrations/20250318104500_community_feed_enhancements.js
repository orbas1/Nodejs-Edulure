import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasMediaAssetColumn = await knex.schema.hasColumn('community_posts', 'media_asset_id');
  if (!hasMediaAssetColumn) {
    await knex.schema.alterTable('community_posts', (table) => {
      table
        .integer('media_asset_id')
        .unsigned()
        .references('id')
        .inTable('content_assets')
        .onDelete('SET NULL');
      table.timestamp('pinned_at');
      table.json('preview_metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.index(['media_asset_id']);
      table.index(['community_id', 'pinned_at'], 'community_posts_pinned_idx');
    });
  }

  const hasImpressionsTable = await knex.schema.hasTable('community_feed_impressions');
  if (!hasImpressionsTable) {
    await knex.schema.createTable('community_feed_impressions', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('experiment_id')
        .unsigned()
        .references('id')
        .inTable('community_growth_experiments')
        .onDelete('SET NULL');
      table
        .integer('actor_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.integer('momentum_score').notNullable().defaultTo(0);
      table.integer('posts_sampled').unsigned().notNullable().defaultTo(0);
      table.json('trending_tags').notNullable().defaultTo(jsonDefault(knex, []));
      table.timestamp('range_start').notNullable();
      table.timestamp('range_end').notNullable();
      table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
      table.index(['community_id', 'recorded_at'], 'community_feed_impressions_comm_recorded_idx');
      table.index(['experiment_id']);
    });
  }
}

export async function down(knex) {
  const hasImpressionsTable = await knex.schema.hasTable('community_feed_impressions');
  if (hasImpressionsTable) {
    await knex.schema.dropTable('community_feed_impressions');
  }

  const hasMediaAssetColumn = await knex.schema.hasColumn('community_posts', 'media_asset_id');
  if (hasMediaAssetColumn) {
    await knex.schema.alterTable('community_posts', (table) => {
      table.dropIndex(['community_id', 'pinned_at'], 'community_posts_pinned_idx');
      table.dropIndex(['media_asset_id']);
    });

    await knex.schema.alterTable('community_posts', (table) => {
      table.dropColumn('media_asset_id');
      table.dropColumn('pinned_at');
      table.dropColumn('preview_metadata');
    });
  }
}
