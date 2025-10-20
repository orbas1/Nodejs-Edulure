const CHECKLIST_TABLE = 'release_checklist_items';
const RUNS_TABLE = 'release_runs';
const GATES_TABLE = 'release_gate_results';

const DIALECTS = {
  mysql: new Set(['mysql', 'mysql2']),
  postgres: new Set(['pg', 'postgres', 'postgresql'])
};

function getDialect(knex) {
  return knex?.client?.config?.client ?? 'mysql2';
}

function isMysql(knex) {
  return DIALECTS.mysql.has(getDialect(knex));
}

function isPostgres(knex) {
  return DIALECTS.postgres.has(getDialect(knex));
}

function jsonDefault(knex, fallback = '{}') {
  if (isPostgres(knex)) {
    return knex.raw('?::jsonb', [fallback]);
  }

  if (isMysql(knex)) {
    return knex.raw('CAST(? AS JSON)', [fallback]);
  }

  return knex.raw('?', [fallback]);
}

async function ensureUpdatedAtTrigger(knex, tableName) {
  if (isMysql(knex)) {
    await knex.raw(
      `ALTER TABLE ?? MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
      [tableName]
    );
    return;
  }

  if (isPostgres(knex)) {
    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
          CREATE FUNCTION set_updated_at_timestamp() RETURNS trigger AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        END IF;
      END;
      $$;
    `);

    const triggerName = `${tableName}_updated_at_trg`;

    await knex.raw(
      `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = '${triggerName}'
          ) THEN
            CREATE TRIGGER "${triggerName}"
            BEFORE UPDATE ON "${tableName}"
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at_timestamp();
          END IF;
        END;
        $$;
      `
    );
  }
}

function normaliseRows(result) {
  if (!result) {
    return [];
  }

  if (Array.isArray(result)) {
    return result[0] ?? [];
  }

  if (typeof result === 'object' && result !== null && Array.isArray(result.rows)) {
    return result.rows;
  }

  return [];
}

async function constraintExists(knex, tableName, constraintName) {
  if (isMysql(knex)) {
    const rows = normaliseRows(
      await knex.raw(
        `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
        [tableName, constraintName]
      )
    );
    return rows.length > 0;
  }

  if (isPostgres(knex)) {
    const rows = normaliseRows(
      await knex.raw(
        `SELECT 1 FROM information_schema.table_constraints WHERE table_schema = current_schema() AND table_name = ? AND constraint_name = ?`,
        [tableName, constraintName]
      )
    );
    return rows.length > 0;
  }

  return false;
}

async function addCheckConstraint(knex, tableName, constraintName, expression) {
  if (await constraintExists(knex, tableName, constraintName)) {
    return;
  }

  await knex.raw(`ALTER TABLE ?? ADD CONSTRAINT ?? CHECK (${expression})`, [tableName, constraintName]);
}

function addTimestamps(table, context) {
  table.timestamp('created_at').notNullable().defaultTo(context.fn.now());
  table.timestamp('updated_at').notNullable().defaultTo(context.fn.now());
}

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
