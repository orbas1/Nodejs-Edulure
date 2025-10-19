const CHECKLIST_TABLE = 'release_checklist_items';
const RUNS_TABLE = 'release_runs';
const GATES_TABLE = 'release_gate_results';

function addTimestamps(table, knex) {
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  table
    .timestamp('updated_at')
    .notNullable()
    .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
}

export async function up(knex) {
  const hasChecklist = await knex.schema.hasTable(CHECKLIST_TABLE);
  if (!hasChecklist) {
    await knex.schema.createTable(CHECKLIST_TABLE, (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table.string('slug', 120).notNullable().unique();
      table
        .enum('category', ['quality', 'security', 'observability', 'compliance', 'change_management'])
        .notNullable()
        .defaultTo('quality');
      table.string('title', 200).notNullable();
      table.text('description').notNullable();
      table.boolean('auto_evaluated').notNullable().defaultTo(false);
      table.integer('weight').unsigned().notNullable().defaultTo(1);
      table.string('default_owner_email', 160);
      table.json('success_criteria').notNullable().defaultTo('{}');
      addTimestamps(table, knex);

      table.index(['category'], 'release_checklist_category_idx');
    });
  }

  const hasRuns = await knex.schema.hasTable(RUNS_TABLE);
  if (!hasRuns) {
    await knex.schema.createTable(RUNS_TABLE, (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table.string('version_tag', 64).notNullable();
      table.string('environment', 64).notNullable();
      table
        .enum('status', ['scheduled', 'in_progress', 'ready', 'blocked', 'cancelled', 'completed'])
        .notNullable()
        .defaultTo('scheduled');
      table.string('initiated_by_email', 160).notNullable();
      table.string('initiated_by_name', 160);
      table.timestamp('scheduled_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('started_at');
      table.timestamp('completed_at');
      table.timestamp('change_window_start');
      table.timestamp('change_window_end');
      table.text('summary_notes');
      table.json('checklist_snapshot').notNullable().defaultTo('[]');
      table.json('metadata').notNullable().defaultTo('{}');
      addTimestamps(table, knex);

      table.index(['environment', 'status'], 'release_runs_environment_status_idx');
      table.index(['version_tag'], 'release_runs_version_idx');
      table.index(['scheduled_at'], 'release_runs_schedule_idx');
    });
  }

  const hasGates = await knex.schema.hasTable(GATES_TABLE);
  if (!hasGates) {
    await knex.schema.createTable(GATES_TABLE, (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('run_id')
        .unsigned()
        .references('id')
        .inTable(RUNS_TABLE)
        .onDelete('CASCADE');
      table
        .integer('checklist_item_id')
        .unsigned()
        .references('id')
        .inTable(CHECKLIST_TABLE)
        .onDelete('SET NULL');
      table.string('gate_key', 160).notNullable();
      table
        .enum('status', ['pending', 'in_progress', 'pass', 'fail', 'waived'])
        .notNullable()
        .defaultTo('pending');
      table.string('owner_email', 160);
      table.json('metrics').notNullable().defaultTo('{}');
      table.text('notes');
      table.string('evidence_url', 500);
      table.timestamp('last_evaluated_at');
      addTimestamps(table, knex);

      table.index(['run_id', 'status'], 'release_gate_run_status_idx');
      table.unique(['run_id', 'gate_key'], 'release_gate_run_gate_unique');
    });
  }
}

export async function down(knex) {
  const tables = [GATES_TABLE, RUNS_TABLE, CHECKLIST_TABLE];
  for (const table of tables) {
    const exists = await knex.schema.hasTable(table);
    if (exists) {
      await knex.schema.dropTable(table);
    }
  }
}
