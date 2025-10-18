async function recreateGovernanceView(knex) {
  await knex.schema.raw('DROP VIEW IF EXISTS vw_data_governance_retention_overview');

  await knex.schema.raw(`
    CREATE VIEW vw_data_governance_retention_overview AS
    WITH ordered_logs AS (
      SELECT
        l.id,
        l.policy_id,
        l.enforced_at,
        l.rows_affected,
        l.dry_run,
        l.status,
        l.mode,
        l.run_id,
        l.duration_ms,
        ROW_NUMBER() OVER (PARTITION BY l.policy_id ORDER BY l.enforced_at DESC, l.id DESC) AS row_rank
      FROM data_retention_audit_logs l
    ),
    aggregated AS (
      SELECT
        policy_id,
        COUNT(*) AS total_runs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failure_count,
        SUM(CASE WHEN dry_run = 1 THEN 1 ELSE 0 END) AS dry_run_count,
        SUM(CASE WHEN status = 'executed' AND dry_run = 0 THEN rows_affected ELSE 0 END) AS total_rows_removed,
        MAX(enforced_at) AS last_enforced_at
      FROM data_retention_audit_logs
      GROUP BY policy_id
    )
    SELECT
      p.id AS policy_id,
      p.entity_name,
      p.action,
      p.retention_period_days,
      p.active,
      p.description,
      COALESCE(a.total_runs, 0) AS total_runs,
      COALESCE(a.failure_count, 0) AS failure_count,
      COALESCE(a.dry_run_count, 0) AS dry_run_count,
      COALESCE(a.total_rows_removed, 0) AS total_rows_removed,
      a.last_enforced_at,
      ol.status AS last_status,
      ol.mode AS last_mode,
      ol.dry_run AS last_dry_run,
      ol.rows_affected AS last_rows_affected,
      ol.duration_ms AS last_duration_ms
    FROM data_retention_policies p
    LEFT JOIN aggregated a ON a.policy_id = p.id
    LEFT JOIN ordered_logs ol ON ol.policy_id = p.id AND ol.row_rank = 1;
  `);
}

export async function up(knex) {
  const hasStatusColumn = await knex.schema.hasColumn('data_retention_audit_logs', 'status');
  if (!hasStatusColumn) {
    await knex.schema.alterTable('data_retention_audit_logs', (table) => {
      table
        .string('status', 32)
        .notNullable()
        .defaultTo('executed')
        .after('dry_run');
      table
        .string('mode', 16)
        .notNullable()
        .defaultTo('commit')
        .after('status');
      table
        .string('run_id', 64)
        .notNullable()
        .defaultTo('')
        .after('mode');
      table
        .bigInteger('duration_ms')
        .unsigned()
        .notNullable()
        .defaultTo(0)
        .after('rows_affected');
    });

    await knex('data_retention_audit_logs').update({
      status: 'executed',
      mode: 'commit',
      run_id: knex.raw('UUID()'),
      duration_ms: 0
    });
  }

  await recreateGovernanceView(knex);
}

export async function down(knex) {
  const hasStatusColumn = await knex.schema.hasColumn('data_retention_audit_logs', 'status');
  if (hasStatusColumn) {
    await knex.schema.alterTable('data_retention_audit_logs', (table) => {
      table.dropColumn('duration_ms');
      table.dropColumn('run_id');
      table.dropColumn('mode');
      table.dropColumn('status');
    });
  }

  await knex.schema.raw('DROP VIEW IF EXISTS vw_data_governance_retention_overview');
}
