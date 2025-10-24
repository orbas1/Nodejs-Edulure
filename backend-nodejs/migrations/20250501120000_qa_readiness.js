import {
  addTimestamps,
  ensureUpdatedAtTrigger,
  jsonDefault
} from './_helpers/schema.js';

function ensureDecimal(table, column, { precision = 6, scale = 4, defaultTo = 0 } = {}) {
  table.decimal(column, precision, scale).notNullable().defaultTo(defaultTo);
}

export async function up(knex) {
  const hasSurfaces = await knex.schema.hasTable('qa_test_surfaces');
  if (!hasSurfaces) {
    await knex.schema.createTable('qa_test_surfaces', (table) => {
      table.increments('id').primary();
      table.string('slug', 80).notNullable().unique('qa_test_surfaces_slug_uq');
      table.string('display_name', 160).notNullable();
      table.string('surface_type', 40).notNullable();
      table.string('repository_path', 160).notNullable();
      table.string('owner_team', 160).notNullable();
      table.string('ci_identifier', 160);
      ensureDecimal(table, 'threshold_statements', { defaultTo: 0.8 });
      ensureDecimal(table, 'threshold_branches', { defaultTo: 0.75 });
      ensureDecimal(table, 'threshold_functions', { defaultTo: 0.8 });
      ensureDecimal(table, 'threshold_lines', { defaultTo: 0.8 });
      table.boolean('is_active').notNullable().defaultTo(true);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.index(['surface_type'], 'qa_test_surfaces_type_idx');
      table.index(['is_active'], 'qa_test_surfaces_active_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'qa_test_surfaces');
  }

  const hasSuites = await knex.schema.hasTable('qa_test_suites');
  if (!hasSuites) {
    await knex.schema.createTable('qa_test_suites', (table) => {
      table.increments('id').primary();
      table
        .integer('surface_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('qa_test_surfaces')
        .onDelete('CASCADE');
      table.string('suite_key', 120).notNullable();
      table.string('suite_type', 60).notNullable();
      table.string('description', 500);
      table.string('owner_email', 160);
      table.string('ci_job', 160);
      ensureDecimal(table, 'threshold_statements', { defaultTo: 0.8 });
      ensureDecimal(table, 'threshold_branches', { defaultTo: 0.75 });
      ensureDecimal(table, 'threshold_functions', { defaultTo: 0.8 });
      ensureDecimal(table, 'threshold_lines', { defaultTo: 0.8 });
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.unique(['surface_id', 'suite_key'], 'qa_test_suites_surface_key_uq');
      table.index(['suite_type'], 'qa_test_suites_type_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'qa_test_suites');
  }

  const hasRuns = await knex.schema.hasTable('qa_test_suite_runs');
  if (!hasRuns) {
    await knex.schema.createTable('qa_test_suite_runs', (table) => {
      table.increments('id').primary();
      table
        .integer('suite_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('qa_test_suites')
        .onDelete('CASCADE');
      table.string('run_identifier', 160).notNullable();
      table.string('git_commit', 64);
      table.string('git_branch', 160);
      table.string('environment', 80);
      table.string('status', 40).notNullable().defaultTo('in_progress');
      table.string('triggered_by', 160);
      ensureDecimal(table, 'coverage_statements', { defaultTo: 0 });
      ensureDecimal(table, 'coverage_branches', { defaultTo: 0 });
      ensureDecimal(table, 'coverage_functions', { defaultTo: 0 });
      ensureDecimal(table, 'coverage_lines', { defaultTo: 0 });
      ensureDecimal(table, 'failure_rate', { defaultTo: 0 });
      table.integer('total_tests').unsigned();
      table.integer('passed_tests').unsigned();
      table.string('report_url', 300);
      table.string('evidence_url', 300);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('started_at');
      table.timestamp('completed_at');
      addTimestamps(table, knex);
      table.unique(['suite_id', 'run_identifier'], 'qa_test_suite_runs_identifier_uq');
      table.index(['suite_id', 'completed_at'], 'qa_test_suite_runs_suite_completed_idx');
      table.index(['status'], 'qa_test_suite_runs_status_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'qa_test_suite_runs');
  }

  const hasChecklists = await knex.schema.hasTable('qa_manual_checklists');
  if (!hasChecklists) {
    await knex.schema.createTable('qa_manual_checklists', (table) => {
      table.increments('id').primary();
      table.string('slug', 120).notNullable().unique('qa_manual_checklists_slug_uq');
      table.string('title', 200).notNullable();
      table.string('version', 40).notNullable();
      table.string('status', 40).notNullable().defaultTo('active');
      table.string('owner_team', 160).notNullable();
      table.string('description', 500);
      table.string('updated_by', 160);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
    });
    await ensureUpdatedAtTrigger(knex, 'qa_manual_checklists');
  }

  const hasChecklistItems = await knex.schema.hasTable('qa_manual_checklist_items');
  if (!hasChecklistItems) {
    await knex.schema.createTable('qa_manual_checklist_items', (table) => {
      table.increments('id').primary();
      table
        .integer('checklist_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('qa_manual_checklists')
        .onDelete('CASCADE');
      table.string('item_key', 160).notNullable();
      table.string('label', 240).notNullable();
      table.string('category', 80).notNullable().defaultTo('general');
      table.string('owner_team', 160).notNullable();
      table.boolean('requires_evidence').notNullable().defaultTo(false);
      table.string('default_status', 40).notNullable().defaultTo('pending');
      table.string('automation_type', 120);
      table.integer('display_order').notNullable().defaultTo(0);
      table.text('description');
      table.json('evidence_examples').notNullable().defaultTo(jsonDefault(knex, []));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.unique(['checklist_id', 'item_key'], 'qa_manual_checklist_items_key_uq');
      table.index(['checklist_id', 'display_order'], 'qa_manual_checklist_items_order_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'qa_manual_checklist_items');
  }

  const hasFixtureSets = await knex.schema.hasTable('qa_fixture_sets');
  if (!hasFixtureSets) {
    await knex.schema.createTable('qa_fixture_sets', (table) => {
      table.increments('id').primary();
      table.string('slug', 120).notNullable().unique('qa_fixture_sets_slug_uq');
      table.string('title', 200).notNullable();
      table.string('description', 500);
      table.string('data_scope', 120).notNullable();
      table.string('data_classification', 80).notNullable();
      table.string('anonymisation_strategy', 160);
      table.string('seed_command', 200);
      table.string('refresh_cadence', 120);
      table.string('storage_path', 300);
      table.string('checksum', 120);
      table.string('owner_team', 160).notNullable();
      table.timestamp('last_refreshed_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
    });
    await ensureUpdatedAtTrigger(knex, 'qa_fixture_sets');
  }

  const hasSandboxes = await knex.schema.hasTable('qa_sandbox_environments');
  if (!hasSandboxes) {
    await knex.schema.createTable('qa_sandbox_environments', (table) => {
      table.increments('id').primary();
      table.string('slug', 120).notNullable().unique('qa_sandbox_environments_slug_uq');
      table.string('label', 200).notNullable();
      table.string('environment_type', 80).notNullable();
      table
        .integer('fixture_set_id')
        .unsigned()
        .references('id')
        .inTable('qa_fixture_sets')
        .onDelete('SET NULL');
      table.string('access_url', 300);
      table.string('region', 120);
      table.string('owner_team', 160).notNullable();
      table.string('seed_script', 200);
      table.string('refresh_cadence', 120);
      table.text('access_instructions');
      table.string('status', 40).notNullable().defaultTo('active');
      table.timestamp('last_refreshed_at');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      addTimestamps(table, knex);
      table.index(['environment_type'], 'qa_sandbox_environments_type_idx');
      table.index(['status'], 'qa_sandbox_environments_status_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'qa_sandbox_environments');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('qa_sandbox_environments');
  await knex.schema.dropTableIfExists('qa_fixture_sets');
  await knex.schema.dropTableIfExists('qa_manual_checklist_items');
  await knex.schema.dropTableIfExists('qa_manual_checklists');
  await knex.schema.dropTableIfExists('qa_test_suite_runs');
  await knex.schema.dropTableIfExists('qa_test_suites');
  await knex.schema.dropTableIfExists('qa_test_surfaces');
}
