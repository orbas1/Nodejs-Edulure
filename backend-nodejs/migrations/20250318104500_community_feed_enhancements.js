import { jsonDefault } from './_helpers/utils.js';

const SQLITE_REGEX = /sqlite/i;

const COMMUNITY_ENGAGEMENT_VIEW_SQL = `
  CREATE VIEW reporting_community_engagement_daily AS
  SELECT
    DATE(p.published_at) AS reporting_date,
    p.community_id,
    COUNT(*) AS published_posts,
    SUM(p.comment_count) AS comment_count,
    SUM(COALESCE(JSON_LENGTH(p.tags), 0)) AS tag_applications,
    SUM(CASE WHEN p.visibility = 'public' THEN 1 ELSE 0 END) AS public_posts,
    SUM(CASE WHEN p.post_type = 'event' THEN 1 ELSE 0 END) AS event_posts
  FROM community_posts p
  WHERE p.published_at IS NOT NULL
  GROUP BY DATE(p.published_at), p.community_id
`;

const isSqliteClient = (knex) => SQLITE_REGEX.test(String(knex?.client?.config?.client ?? ''));

async function recreateCommunityEngagementView(knex) {
  await knex.raw('DROP VIEW IF EXISTS reporting_community_engagement_daily');
  await knex.raw(COMMUNITY_ENGAGEMENT_VIEW_SQL);
}

export async function up(knex) {
  const useSqliteStrategy = isSqliteClient(knex);
  if (useSqliteStrategy) {
    await knex.raw('DROP VIEW IF EXISTS reporting_community_engagement_daily');
  }

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

  if (useSqliteStrategy) {
    await recreateCommunityEngagementView(knex);
  }
}

export async function down(knex) {
  const useSqliteStrategy = isSqliteClient(knex);
  if (useSqliteStrategy) {
    await knex.raw('DROP VIEW IF EXISTS reporting_community_engagement_daily');
  }

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

  if (useSqliteStrategy) {
    await recreateCommunityEngagementView(knex);
  }
}
