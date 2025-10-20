import {
  addCheckConstraint,
  addTimestamps,
  ensureUpdatedAtTrigger,
  jsonDefault
} from './_helpers/schema.js';

const CHECKLIST_TABLE = 'release_checklist_items';
const RUNS_TABLE = 'release_runs';
const GATES_TABLE = 'release_gate_results';


export async function up(knex) {
  await knex.transaction(async (trx) => {
    const hasChecklist = await trx.schema.hasTable(CHECKLIST_TABLE);
    if (!hasChecklist) {
      await trx.schema.createTable(CHECKLIST_TABLE, (table) => {
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
        table.json('success_criteria').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);

        table.index(['category'], 'release_checklist_category_idx');
      });

      await addCheckConstraint(trx, CHECKLIST_TABLE, 'release_checklist_weight_chk', 'weight >= 0');
      await ensureUpdatedAtTrigger(trx, CHECKLIST_TABLE);
    }

    const hasRuns = await trx.schema.hasTable(RUNS_TABLE);
    if (!hasRuns) {
      await trx.schema.createTable(RUNS_TABLE, (table) => {
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
        table.timestamp('scheduled_at').notNullable().defaultTo(trx.fn.now());
        table.timestamp('started_at');
        table.timestamp('completed_at');
        table.timestamp('change_window_start');
        table.timestamp('change_window_end');
        table.text('summary_notes');
        table.json('checklist_snapshot').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);

        table.index(['environment', 'status'], 'release_runs_environment_status_idx');
        table.index(['version_tag'], 'release_runs_version_idx');
        table.index(['scheduled_at'], 'release_runs_schedule_idx');
      });

      await addCheckConstraint(
        trx,
        RUNS_TABLE,
        'release_runs_change_window_chk',
        'change_window_end IS NULL OR change_window_start IS NULL OR change_window_end >= change_window_start'
      );
      await ensureUpdatedAtTrigger(trx, RUNS_TABLE);
    }

    const hasGates = await trx.schema.hasTable(GATES_TABLE);
    if (!hasGates) {
      await trx.schema.createTable(GATES_TABLE, (table) => {
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
        table.json('metrics').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.text('notes');
        table.string('evidence_url', 500);
        table.timestamp('last_evaluated_at');
        addTimestamps(table, trx);

        table.index(['run_id', 'status'], 'release_gate_run_status_idx');
        table.unique(['run_id', 'gate_key'], 'release_gate_run_gate_unique');
      });
      await ensureUpdatedAtTrigger(trx, GATES_TABLE);
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    const tables = [GATES_TABLE, RUNS_TABLE, CHECKLIST_TABLE];
    for (const table of tables) {
      await trx.schema.dropTableIfExists(table);
    }
  });
}
