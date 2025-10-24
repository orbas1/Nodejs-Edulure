import { jsonDefault } from './_helpers/utils.js';

const BACKLOG_TABLE = 'navigation_annex_backlog_items';
const OPERATIONS_TABLE = 'navigation_annex_operation_tasks';
const DESIGN_TABLE = 'navigation_annex_design_dependencies';
const NARRATIVES_TABLE = 'navigation_annex_strategy_narratives';
const METRICS_TABLE = 'navigation_annex_strategy_metrics';

function addTimestamps(table, knex) {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  table
    .timestamp('updated_at')
    .notNullable()
    .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
}

export async function up(knex) {
  const hasBacklog = await knex.schema.hasTable(BACKLOG_TABLE);
  if (!hasBacklog) {
    await knex.schema.createTable(BACKLOG_TABLE, (table) => {
      table.increments('id').primary();
      table.string('nav_item_id', 80).notNullable();
      table.string('nav_item_label', 160).notNullable();
      table
        .enum('nav_item_category', ['primary', 'quick_action', 'dashboard'])
        .notNullable()
        .defaultTo('primary');
      table.string('nav_item_route', 255).notNullable();
      table.json('role_scope').notNullable().defaultTo(jsonDefault(knex, []));
      table.string('epic_id', 120).notNullable();
      table.text('summary').notNullable();
      table.string('backlog_ref', 255);
      table.json('impacted_files').notNullable().defaultTo(jsonDefault(knex, []));
      table.integer('priority').unsigned().notNullable().defaultTo(3);
      table.integer('display_order').unsigned().notNullable().defaultTo(0);
      addTimestamps(table, knex);
      table.unique(['nav_item_id', 'epic_id'], 'navigation_annex_backlog_items_unique');
      table.index(['nav_item_id'], 'idx_navigation_annex_backlog_nav');
      table.index(['priority'], 'idx_navigation_annex_backlog_priority');
    });
  }

  const hasOperations = await knex.schema.hasTable(OPERATIONS_TABLE);
  if (!hasOperations) {
    await knex.schema.createTable(OPERATIONS_TABLE, (table) => {
      table.increments('id').primary();
      table.string('nav_item_id', 80).notNullable();
      table.string('nav_item_label', 160).notNullable();
      table
        .enum('nav_item_category', ['primary', 'quick_action', 'dashboard'])
        .notNullable()
        .defaultTo('primary');
      table.string('nav_item_route', 255).notNullable();
      table.json('role_scope').notNullable().defaultTo(jsonDefault(knex, []));
      table.string('task_key', 120).notNullable();
      table.string('label', 255).notNullable();
      table.string('cadence', 120).notNullable();
      table.string('runbook_section', 160);
      table.string('href', 255);
      table.string('owner', 160);
      table.integer('priority').unsigned().notNullable().defaultTo(3);
      table.integer('display_order').unsigned().notNullable().defaultTo(0);
      table.boolean('include_in_checklist').notNullable().defaultTo(true);
      addTimestamps(table, knex);
      table.unique(['task_key'], 'navigation_annex_operation_tasks_key_unique');
      table.index(['nav_item_id'], 'idx_navigation_annex_operation_tasks_nav');
      table.index(['priority'], 'idx_navigation_annex_operation_tasks_priority');
    });
  }

  const hasDesign = await knex.schema.hasTable(DESIGN_TABLE);
  if (!hasDesign) {
    await knex.schema.createTable(DESIGN_TABLE, (table) => {
      table.increments('id').primary();
      table.string('nav_item_id', 80).notNullable();
      table.string('nav_item_label', 160).notNullable();
      table
        .enum('nav_item_category', ['primary', 'quick_action', 'dashboard'])
        .notNullable()
        .defaultTo('primary');
      table.string('nav_item_route', 255).notNullable();
      table.json('role_scope').notNullable().defaultTo(jsonDefault(knex, []));
      table.string('dependency_key', 120).notNullable();
      table.enum('dependency_type', ['token', 'qa', 'reference']).notNullable();
      table.string('value', 255).notNullable();
      table.string('notes', 255);
      table.integer('display_order').unsigned().notNullable().defaultTo(0);
      addTimestamps(table, knex);
      table.unique(['dependency_key', 'dependency_type'], 'navigation_annex_design_dependencies_unique');
      table.index(['nav_item_id'], 'idx_navigation_annex_design_dependencies_nav');
    });
  }

  const hasNarratives = await knex.schema.hasTable(NARRATIVES_TABLE);
  if (!hasNarratives) {
    await knex.schema.createTable(NARRATIVES_TABLE, (table) => {
      table.increments('id').primary();
      table.string('nav_item_id', 80).notNullable();
      table.string('nav_item_label', 160).notNullable();
      table
        .enum('nav_item_category', ['primary', 'quick_action', 'dashboard'])
        .notNullable()
        .defaultTo('primary');
      table.string('nav_item_route', 255).notNullable();
      table.json('role_scope').notNullable().defaultTo(jsonDefault(knex, []));
      table.string('narrative_key', 120).notNullable();
      table
        .enum('pillar', ['activation', 'retention', 'engagement', 'expansion', 'efficiency'])
        .notNullable();
      table.text('narrative').notNullable();
      table.integer('display_order').unsigned().notNullable().defaultTo(0);
      addTimestamps(table, knex);
      table.unique(['narrative_key'], 'navigation_annex_strategy_narratives_key_unique');
      table.index(['nav_item_id'], 'idx_navigation_annex_strategy_narratives_nav');
      table.index(['pillar'], 'idx_navigation_annex_strategy_narratives_pillar');
    });
  }

  const hasMetrics = await knex.schema.hasTable(METRICS_TABLE);
  if (!hasMetrics) {
    await knex.schema.createTable(METRICS_TABLE, (table) => {
      table.increments('id').primary();
      table
        .integer('narrative_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(NARRATIVES_TABLE)
        .onDelete('CASCADE');
      table.string('metric_key', 120).notNullable();
      table.string('label', 255).notNullable();
      table.string('baseline', 120);
      table.string('target', 120);
      table.string('unit', 60);
      table.integer('display_order').unsigned().notNullable().defaultTo(0);
      addTimestamps(table, knex);
      table.unique(['metric_key'], 'navigation_annex_strategy_metrics_key_unique');
      table.index(['narrative_id'], 'idx_navigation_annex_strategy_metrics_narrative');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists(METRICS_TABLE);
  await knex.schema.dropTableIfExists(NARRATIVES_TABLE);
  await knex.schema.dropTableIfExists(DESIGN_TABLE);
  await knex.schema.dropTableIfExists(OPERATIONS_TABLE);
  await knex.schema.dropTableIfExists(BACKLOG_TABLE);
}
