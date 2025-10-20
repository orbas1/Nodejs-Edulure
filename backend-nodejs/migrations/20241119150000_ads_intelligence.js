import { jsonDefault } from './_utils.js';

export async function up(knex) {
  const hasCampaigns = await knex.schema.hasTable('ads_campaigns');
  if (!hasCampaigns) {
    await knex.schema.createTable('ads_campaigns', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('created_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('name', 200).notNullable();
      table
        .enum('objective', ['awareness', 'traffic', 'leads', 'conversions'])
        .notNullable()
        .defaultTo('awareness');
      table
        .enum('status', ['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'])
        .notNullable()
        .defaultTo('draft');
      table.string('budget_currency', 3).notNullable().defaultTo('USD');
      table.integer('budget_daily_cents').unsigned().notNullable().defaultTo(0);
      table.string('spend_currency', 3).notNullable().defaultTo('USD');
      table.integer('spend_total_cents').unsigned().notNullable().defaultTo(0);
      table.decimal('performance_score', 5, 2).notNullable().defaultTo(0);
      table.decimal('ctr', 6, 4).notNullable().defaultTo(0);
      table.decimal('cpc_cents', 10, 2).notNullable().defaultTo(0);
      table.decimal('cpa_cents', 10, 2).notNullable().defaultTo(0);
      table.json('targeting_keywords').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('targeting_audiences').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('targeting_locations').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('targeting_languages').notNullable().defaultTo(jsonDefault(knex, ["en"]));
      table.string('creative_headline', 160).notNullable();
      table.string('creative_description', 500);
      table.string('creative_url', 500);
      table.timestamp('start_at');
      table.timestamp('end_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['status']);
      table.index(['objective']);
      table.index(['created_by']);
    });
  }

  const hasMetrics = await knex.schema.hasTable('ads_campaign_metrics_daily');
  if (!hasMetrics) {
    await knex.schema.createTable('ads_campaign_metrics_daily', (table) => {
      table.increments('id').primary();
      table
        .integer('campaign_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ads_campaigns')
        .onDelete('CASCADE');
      table.date('metric_date').notNullable();
      table.bigInteger('impressions').unsigned().notNullable().defaultTo(0);
      table.bigInteger('clicks').unsigned().notNullable().defaultTo(0);
      table.bigInteger('conversions').unsigned().notNullable().defaultTo(0);
      table.integer('spend_cents').unsigned().notNullable().defaultTo(0);
      table.integer('revenue_cents').unsigned().notNullable().defaultTo(0);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.unique(['campaign_id', 'metric_date']);
      table.index(['metric_date']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ads_campaign_metrics_daily');
  await knex.schema.dropTableIfExists('ads_campaigns');
}
