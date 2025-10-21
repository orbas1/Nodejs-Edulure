const TABLES = {
  RISK_REGISTER: 'security_risk_register',
  RISK_REVIEWS: 'security_risk_reviews',
  AUDIT_EVIDENCE: 'security_audit_evidence',
  CONTINUITY_EXERCISES: 'security_continuity_exercises',
  SECURITY_ASSESSMENTS: 'security_security_assessments'
};

export const RISK_STATUSES = [
  'identified',
  'assessed',
  'accepted',
  'mitigated',
  'remediated',
  'monitoring',
  'retired',
  'closed'
];

export const RISK_SEVERITIES = ['low', 'moderate', 'high', 'critical'];
export const RISK_LIKELIHOODS = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'];
export const REVIEW_STATUSES = ['in_review', 'approved', 'needs_attention', 'rejected'];
export const EVIDENCE_STATUSES = ['submitted', 'reviewing', 'approved', 'expired'];
export const CONTINUITY_OUTCOMES = ['pending_report', 'pass', 'fail', 'needs_follow_up'];
export const ASSESSMENT_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

function resolveDialect(knex) {
  const client = knex?.client?.config?.client ?? knex?.client?.driverName ?? '';
  return String(client).toLowerCase();
}

function timestampWithAutoUpdate(knex, table, column = 'updated_at') {
  const dialect = resolveDialect(knex);

  if (dialect.includes('mysql')) {
    table
      .timestamp(column)
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    return;
  }

  table.timestamp(column).notNullable().defaultTo(knex.fn.now());
}

function defaultUuid(knex) {
  const dialect = resolveDialect(knex);
  if (dialect.includes('mysql')) {
    return knex.raw('(UUID())');
  }
  if (dialect.includes('pg')) {
    return knex.raw('gen_random_uuid()');
  }
  return null;
}

function jsonObjectDefault() {
  return JSON.stringify({});
}

function jsonArrayDefault() {
  return JSON.stringify([]);
}

async function ensureTable(knex, tableName, schemaBuilder) {
  const exists = await knex.schema.hasTable(tableName);
  if (exists) {
    return;
  }
  await knex.schema.createTable(tableName, (table) => schemaBuilder(table, knex));
}

function defineRiskRegisterTable(table, knex) {
  const uuidDefault = defaultUuid(knex);
  const riskUuidColumn = table.string('risk_uuid', 64).notNullable();
  if (uuidDefault) {
    riskUuidColumn.defaultTo(uuidDefault);
  }
  riskUuidColumn.unique();

  table.increments('id').primary();
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
  table.text('mitigation_plan');
  table.text('residual_notes');
  table.string('regulatory_driver', 160);
  table.integer('review_cadence_days').notNullable().defaultTo(90);
  table.timestamp('identified_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('accepted_at');
  table.timestamp('remediated_at');
  table.timestamp('closed_at');
  table.timestamp('last_reviewed_at');
  table.timestamp('next_review_at');
  table.string('owner_type', 60).notNullable().defaultTo('team');
  table.integer('owner_id');
  table.string('owner_display_name', 160);
  table.string('owner_email', 160);
  table.integer('risk_owner_user_id');
  table.json('tags').notNullable().defaultTo(jsonArrayDefault());
  table.json('detection_controls').notNullable().defaultTo(jsonArrayDefault());
  table.json('mitigation_controls').notNullable().defaultTo(jsonArrayDefault());
  table.json('metadata').notNullable().defaultTo(jsonObjectDefault());
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);

  table.index(['tenant_id', 'status'], `${TABLES.RISK_REGISTER}_tenant_status_idx`);
  table.index(['tenant_id', 'next_review_at'], `${TABLES.RISK_REGISTER}_tenant_review_idx`);
  table.index(['tenant_id', 'category'], `${TABLES.RISK_REGISTER}_tenant_category_idx`);
}

function defineRiskReviewsTable(table, knex) {
  const uuidDefault = defaultUuid(knex);
  table.increments('id').primary();
  const reviewUuidColumn = table.string('review_uuid', 64).notNullable();
  if (uuidDefault) {
    reviewUuidColumn.defaultTo(uuidDefault);
  }
  reviewUuidColumn.unique();

  table
    .integer('risk_id')
    .unsigned()
    .notNullable()
    .references('id')
    .inTable(TABLES.RISK_REGISTER)
    .onDelete('CASCADE');
  table.integer('reviewer_id');
  table.string('reviewer_name', 160);
  table.string('reviewer_email', 160);
  table.string('status', 60).notNullable().defaultTo('in_review');
  table.string('residual_severity', 40).notNullable().defaultTo('moderate');
  table.string('residual_likelihood', 40).notNullable().defaultTo('possible');
  table.decimal('residual_risk_score', 6, 2).notNullable().defaultTo(0);
  table.text('notes');
  table.json('evidence_references').notNullable().defaultTo(jsonArrayDefault());
  table.timestamp('reviewed_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('next_review_at');
  table.json('metadata').notNullable().defaultTo(jsonObjectDefault());
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);

  table.index(['risk_id', 'reviewed_at'], `${TABLES.RISK_REVIEWS}_risk_reviewed_idx`);
}

function defineAuditEvidenceTable(table, knex) {
  const uuidDefault = defaultUuid(knex);
  table.increments('id').primary();
  const evidenceUuidColumn = table.string('evidence_uuid', 64).notNullable();
  if (uuidDefault) {
    evidenceUuidColumn.defaultTo(uuidDefault);
  }
  evidenceUuidColumn.unique();

  table.string('tenant_id', 64).notNullable().defaultTo('global');
  table
    .integer('risk_id')
    .unsigned()
    .references('id')
    .inTable(TABLES.RISK_REGISTER)
    .onDelete('SET NULL');
  table.string('framework', 120);
  table.string('control_reference', 160);
  table.string('evidence_type', 80).notNullable().defaultTo('document');
  table.string('storage_path', 500).notNullable();
  table.string('checksum', 128);
  table.json('sources').notNullable().defaultTo(jsonArrayDefault());
  table.timestamp('captured_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('expires_at');
  table.string('status', 60).notNullable().defaultTo('submitted');
  table.integer('submitted_by');
  table.string('submitted_by_email', 160);
  table.text('description');
  table.json('metadata').notNullable().defaultTo(jsonObjectDefault());
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);

  table.index(['tenant_id', 'framework'], `${TABLES.AUDIT_EVIDENCE}_tenant_framework_idx`);
  table.index(['tenant_id', 'control_reference'], `${TABLES.AUDIT_EVIDENCE}_tenant_control_idx`);
  table.index(['tenant_id', 'status'], `${TABLES.AUDIT_EVIDENCE}_tenant_status_idx`);
}

function defineContinuityExercisesTable(table, knex) {
  const uuidDefault = defaultUuid(knex);
  table.increments('id').primary();
  const exerciseUuidColumn = table.string('exercise_uuid', 64).notNullable();
  if (uuidDefault) {
    exerciseUuidColumn.defaultTo(uuidDefault);
  }
  exerciseUuidColumn.unique();

  table.string('tenant_id', 64).notNullable().defaultTo('global');
  table.string('scenario_key', 160).notNullable();
  table.string('scenario_summary', 255).notNullable();
  table.string('exercise_type', 80).notNullable().defaultTo('tabletop');
  table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('completed_at');
  table.integer('rto_target_minutes');
  table.integer('rpo_target_minutes');
  table.integer('actual_rto_minutes');
  table.integer('actual_rpo_minutes');
  table.string('outcome', 60).notNullable().defaultTo('pending_report');
  table.text('lessons_learned');
  table.json('follow_up_actions').notNullable().defaultTo(jsonArrayDefault());
  table.integer('owner_id');
  table.string('owner_display_name', 160);
  table.string('owner_email', 160);
  table.json('metadata').notNullable().defaultTo(jsonObjectDefault());
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);

  table.index(['tenant_id', 'scenario_key'], `${TABLES.CONTINUITY_EXERCISES}_tenant_scenario_idx`);
  table.index(['tenant_id', 'outcome'], `${TABLES.CONTINUITY_EXERCISES}_tenant_outcome_idx`);
}

function defineSecurityAssessmentsTable(table, knex) {
  const uuidDefault = defaultUuid(knex);
  table.increments('id').primary();
  const assessmentUuidColumn = table.string('assessment_uuid', 64).notNullable();
  if (uuidDefault) {
    assessmentUuidColumn.defaultTo(uuidDefault);
  }
  assessmentUuidColumn.unique();

  table.string('tenant_id', 64).notNullable().defaultTo('global');
  table.string('assessment_type', 120).notNullable();
  table.string('status', 60).notNullable().defaultTo('scheduled');
  table.timestamp('scheduled_for').notNullable();
  table.timestamp('completed_at');
  table.integer('owner_id');
  table.string('owner_display_name', 160);
  table.string('owner_email', 160);
  table.text('scope');
  table.text('methodology');
  table.text('findings');
  table.text('next_steps');
  table.json('metadata').notNullable().defaultTo(jsonObjectDefault());
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  timestampWithAutoUpdate(knex, table);

  table.index(['tenant_id', 'assessment_type'], `${TABLES.SECURITY_ASSESSMENTS}_tenant_type_idx`);
  table.index(['tenant_id', 'status'], `${TABLES.SECURITY_ASSESSMENTS}_tenant_status_idx`);
  table.index(['tenant_id', 'scheduled_for'], `${TABLES.SECURITY_ASSESSMENTS}_tenant_scheduled_idx`);
}

export async function applySecurityDomainSchema(knex) {
  await ensureTable(knex, TABLES.RISK_REGISTER, defineRiskRegisterTable);
  await ensureTable(knex, TABLES.RISK_REVIEWS, defineRiskReviewsTable);
  await ensureTable(knex, TABLES.AUDIT_EVIDENCE, defineAuditEvidenceTable);
  await ensureTable(knex, TABLES.CONTINUITY_EXERCISES, defineContinuityExercisesTable);
  await ensureTable(knex, TABLES.SECURITY_ASSESSMENTS, defineSecurityAssessmentsTable);
}

export async function rollbackSecurityDomainSchema(knex) {
  const dropOrder = [
    TABLES.SECURITY_ASSESSMENTS,
    TABLES.CONTINUITY_EXERCISES,
    TABLES.AUDIT_EVIDENCE,
    TABLES.RISK_REVIEWS,
    TABLES.RISK_REGISTER
  ];

  for (const tableName of dropOrder) {
    const exists = await knex.schema.hasTable(tableName);
    if (exists) {
      await knex.schema.dropTable(tableName);
    }
  }
}

export { TABLES };

export default {
  TABLES,
  RISK_STATUSES,
  RISK_SEVERITIES,
  RISK_LIKELIHOODS,
  REVIEW_STATUSES,
  EVIDENCE_STATUSES,
  CONTINUITY_OUTCOMES,
  ASSESSMENT_STATUSES,
  applySecurityDomainSchema,
  rollbackSecurityDomainSchema
};
