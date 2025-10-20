const CONTRACTS_TABLE = 'governance_contracts';
const ASSESSMENTS_TABLE = 'governance_vendor_assessments';
const REVIEWS_TABLE = 'governance_review_cycles';
const COMMUNICATIONS_TABLE = 'governance_roadmap_communications';

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
    const hasContracts = await trx.schema.hasTable(CONTRACTS_TABLE);
    if (!hasContracts) {
      await trx.schema.createTable(CONTRACTS_TABLE, (table) => {
        table.increments('id').primary();
        table.uuid('public_id').notNullable().unique();
        table.string('vendor_name', 160).notNullable();
        table.string('contract_type', 120).notNullable();
        table
          .enum('status', ['draft', 'active', 'pending_renewal', 'expired', 'terminated', 'escalated'])
          .notNullable()
          .defaultTo('active');
        table.string('owner_email', 160).notNullable();
        table.string('risk_tier', 32).notNullable().defaultTo('medium');
        table.bigInteger('contract_value_cents').unsigned().notNullable().defaultTo(0);
        table.string('currency', 3).notNullable().defaultTo('USD');
        table.date('effective_date').notNullable();
        table.date('renewal_date');
        table.date('termination_notice_date');
        table.json('obligations').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.timestamp('last_renewal_evaluated_at');
        table.timestamp('next_governance_check_at');
        addTimestamps(table, trx);

        table.index(['status', 'renewal_date'], 'governance_contract_status_renewal_idx');
        table.index(['risk_tier', 'renewal_date'], 'governance_contract_risk_idx');
        table.index(['owner_email'], 'governance_contract_owner_idx');
      });

      await addCheckConstraint(
        trx,
        CONTRACTS_TABLE,
        'governance_contract_value_chk',
        'contract_value_cents >= 0'
      );
      await addCheckConstraint(
        trx,
        CONTRACTS_TABLE,
        'governance_contract_renewal_after_effective_chk',
        'renewal_date IS NULL OR renewal_date >= effective_date'
      );
      await ensureUpdatedAtTrigger(trx, CONTRACTS_TABLE);
    }

    const hasAssessments = await trx.schema.hasTable(ASSESSMENTS_TABLE);
    if (!hasAssessments) {
      await trx.schema.createTable(ASSESSMENTS_TABLE, (table) => {
        table.increments('id').primary();
        table.uuid('public_id').notNullable().unique();
        table
          .integer('contract_id')
          .unsigned()
          .references('id')
          .inTable(CONTRACTS_TABLE)
          .onDelete('SET NULL');
        table.string('vendor_name', 160).notNullable();
        table
          .enum('assessment_type', ['security', 'privacy', 'financial', 'operational', 'legal'])
          .notNullable();
        table.decimal('risk_score', 5, 2).notNullable().defaultTo(0);
        table
          .enum('risk_level', ['low', 'medium', 'high', 'critical'])
          .notNullable()
          .defaultTo('medium');
        table
          .enum('status', ['scheduled', 'in_review', 'approved', 'rejected', 'remediation'])
          .notNullable()
          .defaultTo('scheduled');
        table.date('last_assessed_at');
        table.date('next_review_at');
        table.string('owner_email', 160).notNullable();
        table.json('findings').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('remediation_plan').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('evidence_links').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);

        table.index(['vendor_name', 'assessment_type'], 'governance_vendor_assessment_vendor_idx');
        table.index(['risk_level', 'status'], 'governance_vendor_assessment_risk_idx');
        table.index(['next_review_at'], 'governance_vendor_assessment_review_idx');
      });

      await addCheckConstraint(
        trx,
        ASSESSMENTS_TABLE,
        'governance_assessment_risk_score_chk',
        'risk_score >= 0 AND risk_score <= 100'
      );
      await ensureUpdatedAtTrigger(trx, ASSESSMENTS_TABLE);
    }

    const hasReviews = await trx.schema.hasTable(REVIEWS_TABLE);
    if (!hasReviews) {
      await trx.schema.createTable(REVIEWS_TABLE, (table) => {
        table.increments('id').primary();
        table.uuid('public_id').notNullable().unique();
        table.string('cycle_name', 160).notNullable();
        table
          .enum('status', ['draft', 'planned', 'in_progress', 'completed', 'blocked'])
          .notNullable()
          .defaultTo('planned');
        table.date('start_date').notNullable();
        table.date('end_date');
        table.date('next_milestone_at');
        table.json('focus_areas').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('participants').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('action_items').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.text('outcome_notes');
        table.integer('readiness_score').unsigned().notNullable().defaultTo(0);
        addTimestamps(table, trx);

        table.index(['status', 'end_date'], 'governance_review_status_idx');
        table.index(['next_milestone_at'], 'governance_review_milestone_idx');
      });

      await addCheckConstraint(
        trx,
        REVIEWS_TABLE,
        'governance_review_readiness_chk',
        'readiness_score >= 0 AND readiness_score <= 100'
      );
      await ensureUpdatedAtTrigger(trx, REVIEWS_TABLE);
    }

    const hasCommunications = await trx.schema.hasTable(COMMUNICATIONS_TABLE);
    if (!hasCommunications) {
      await trx.schema.createTable(COMMUNICATIONS_TABLE, (table) => {
        table.increments('id').primary();
        table.uuid('public_id').notNullable().unique();
        table.string('slug', 160).notNullable().unique();
        table.string('audience', 64).notNullable();
        table
          .enum('channel', ['email', 'webinar', 'town_hall', 'newsletter', 'slack'])
          .notNullable()
          .defaultTo('email');
        table.string('subject', 240).notNullable();
        table.text('body').notNullable();
        table
          .enum('status', ['draft', 'scheduled', 'sent', 'cancelled'])
          .notNullable()
          .defaultTo('draft');
        table.timestamp('schedule_at');
        table.timestamp('sent_at');
        table.string('owner_email', 160).notNullable();
        table.json('metrics').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('attachments').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);

        table.index(['status', 'schedule_at'], 'governance_comm_status_schedule_idx');
        table.index(['audience', 'channel'], 'governance_comm_audience_channel_idx');
      });
      await ensureUpdatedAtTrigger(trx, COMMUNICATIONS_TABLE);
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    const tables = [COMMUNICATIONS_TABLE, REVIEWS_TABLE, ASSESSMENTS_TABLE, CONTRACTS_TABLE];
    for (const table of tables) {
      await trx.schema.dropTableIfExists(table);
    }
  });
}
