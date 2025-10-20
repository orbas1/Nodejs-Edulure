import { jsonDefault } from './_utils.js';

const RISK_TABLE = 'security_risk_register';
const REVIEW_TABLE = 'security_risk_reviews';
const EVIDENCE_TABLE = 'security_audit_evidence';
const CONTINUITY_TABLE = 'security_continuity_exercises';
const ASSESSMENT_TABLE = 'security_security_assessments';

function timestampWithAutoUpdate(knex, table, column = 'updated_at') {
  table
    .timestamp(column)
    .notNullable()
    .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
}

export async function up(knex) {
  await knex.schema.createTable(RISK_TABLE, (table) => {
    table.increments('id').primary();
    table
      .string('risk_uuid', 64)
      .notNullable()
      .defaultTo(knex.raw('(UUID())'))
      .unique();
    table.string('tenant_id', 64).notNullable().defaultTo('global');
    table.string('title', 240).notNullable();
    table.text('description').notNullable();
    table.string('category', 120).notNullable().defaultTo('operational');
    table.string('status', 60).notNullable().defaultTo('identified');
    table.string('severity', 40).notNullable().defaultTo('moderate');
    table.string('likelihood', 40).notNullable().defaultTo('possible');
    table.string('residual_severity', 40).notNullable().defaultTo('moderate');
    table.string('residual_likelihood', 40).notNullable().defaultTo('possible');
    table.decimal('inherent_risk_score', 6, 2).notNullable().defaultTo(0);
    table.decimal('residual_risk_score', 6, 2).notNullable().defaultTo(0);
    table.text('mitigation_plan').nullable();
    table.text('residual_notes').nullable();
    table.string('regulatory_driver', 160).nullable();
    table.integer('review_cadence_days').notNullable().defaultTo(90);
    table.timestamp('identified_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('accepted_at').nullable();
    table.timestamp('remediated_at').nullable();
    table.timestamp('closed_at').nullable();
    table.timestamp('last_reviewed_at').nullable();
    table.timestamp('next_review_at').nullable();
    table.string('owner_type', 60).notNullable().defaultTo('team');
    table.integer('owner_id').nullable();
    table.string('owner_display_name', 160).nullable();
    table.string('owner_email', 160).nullable();
    table.integer('risk_owner_user_id').nullable();
    table.json('tags').defaultTo(jsonDefault(knex, []));
    table.json('detection_controls').defaultTo(jsonDefault(knex, []));
    table.json('mitigation_controls').defaultTo(jsonDefault(knex, []));
    table.json('metadata').defaultTo(jsonDefault(knex, {}));
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
    table.index(['tenant_id', 'status'], `${RISK_TABLE}_tenant_status_idx`);
    table.index(['tenant_id', 'next_review_at'], `${RISK_TABLE}_tenant_review_idx`);
    table.index(['tenant_id', 'category'], `${RISK_TABLE}_tenant_category_idx`);
  });

  await knex.schema.createTable(REVIEW_TABLE, (table) => {
    table.increments('id').primary();
    table
      .string('review_uuid', 64)
      .notNullable()
      .defaultTo(knex.raw('(UUID())'))
      .unique();
    table
      .integer('risk_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable(RISK_TABLE)
      .onDelete('CASCADE');
    table.integer('reviewer_id').nullable();
    table.string('reviewer_name', 160).nullable();
    table.string('reviewer_email', 160).nullable();
    table.string('status', 60).notNullable().defaultTo('in_review');
    table.string('residual_severity', 40).notNullable().defaultTo('moderate');
    table.string('residual_likelihood', 40).notNullable().defaultTo('possible');
    table.decimal('residual_risk_score', 6, 2).notNullable().defaultTo(0);
    table.text('notes').nullable();
    table.json('evidence_references').defaultTo(jsonDefault(knex, []));
    table.timestamp('reviewed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('next_review_at').nullable();
    table.json('metadata').defaultTo(jsonDefault(knex, {}));
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
    table.index(['risk_id', 'reviewed_at'], `${REVIEW_TABLE}_risk_reviewed_idx`);
  });

  await knex.schema.createTable(EVIDENCE_TABLE, (table) => {
    table.increments('id').primary();
    table
      .string('evidence_uuid', 64)
      .notNullable()
      .defaultTo(knex.raw('(UUID())'))
      .unique();
    table.string('tenant_id', 64).notNullable().defaultTo('global');
    table
      .integer('risk_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable(RISK_TABLE)
      .onDelete('SET NULL');
    table.string('framework', 120).nullable();
    table.string('control_reference', 160).nullable();
    table.string('evidence_type', 80).notNullable().defaultTo('document');
    table.string('storage_path', 500).notNullable();
    table.string('checksum', 128).nullable();
    table.json('sources').defaultTo(jsonDefault(knex, []));
    table.timestamp('captured_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable();
    table.string('status', 60).notNullable().defaultTo('submitted');
    table.integer('submitted_by').nullable();
    table.string('submitted_by_email', 160).nullable();
    table.text('description').nullable();
    table.json('metadata').defaultTo(jsonDefault(knex, {}));
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
    table.index(['tenant_id', 'framework'], `${EVIDENCE_TABLE}_tenant_framework_idx`);
    table.index(['tenant_id', 'control_reference'], `${EVIDENCE_TABLE}_tenant_control_idx`);
    table.index(['tenant_id', 'status'], `${EVIDENCE_TABLE}_tenant_status_idx`);
  });

  await knex.schema.createTable(CONTINUITY_TABLE, (table) => {
    table.increments('id').primary();
    table
      .string('exercise_uuid', 64)
      .notNullable()
      .defaultTo(knex.raw('(UUID())'))
      .unique();
    table.string('tenant_id', 64).notNullable().defaultTo('global');
    table.string('scenario_key', 160).notNullable();
    table.string('scenario_summary', 255).notNullable();
    table.string('exercise_type', 80).notNullable().defaultTo('tabletop');
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.integer('rto_target_minutes').nullable();
    table.integer('rpo_target_minutes').nullable();
    table.integer('actual_rto_minutes').nullable();
    table.integer('actual_rpo_minutes').nullable();
    table.string('outcome', 60).notNullable().defaultTo('pending_report');
    table.text('lessons_learned').nullable();
    table.json('follow_up_actions').defaultTo(jsonDefault(knex, []));
    table.integer('owner_id').nullable();
    table.string('owner_display_name', 160).nullable();
    table.string('owner_email', 160).nullable();
    table.json('metadata').defaultTo(jsonDefault(knex, {}));
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
    table.index(['tenant_id', 'scenario_key'], `${CONTINUITY_TABLE}_tenant_scenario_idx`);
    table.index(['tenant_id', 'outcome'], `${CONTINUITY_TABLE}_tenant_outcome_idx`);
  });

  await knex.schema.createTable(ASSESSMENT_TABLE, (table) => {
    table.increments('id').primary();
    table
      .string('assessment_uuid', 64)
      .notNullable()
      .defaultTo(knex.raw('(UUID())'))
      .unique();
    table.string('tenant_id', 64).notNullable().defaultTo('global');
    table.string('assessment_type', 120).notNullable();
    table.string('status', 60).notNullable().defaultTo('scheduled');
    table.timestamp('scheduled_for').notNullable();
    table.timestamp('completed_at').nullable();
    table.integer('owner_id').nullable();
    table.string('owner_display_name', 160).nullable();
    table.string('owner_email', 160).nullable();
    table.text('scope').nullable();
    table.text('methodology').nullable();
    table.text('findings').nullable();
    table.text('next_steps').nullable();
    table.json('metadata').defaultTo(jsonDefault(knex, {}));
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
    table.index(['tenant_id', 'assessment_type'], `${ASSESSMENT_TABLE}_tenant_type_idx`);
    table.index(['tenant_id', 'status'], `${ASSESSMENT_TABLE}_tenant_status_idx`);
    table.index(['tenant_id', 'scheduled_for'], `${ASSESSMENT_TABLE}_tenant_scheduled_idx`);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists(ASSESSMENT_TABLE);
  await knex.schema.dropTableIfExists(CONTINUITY_TABLE);
  await knex.schema.dropTableIfExists(EVIDENCE_TABLE);
  await knex.schema.dropTableIfExists(REVIEW_TABLE);
  await knex.schema.dropTableIfExists(RISK_TABLE);
}
