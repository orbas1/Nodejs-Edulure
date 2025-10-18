import db from '../config/database.js';

export class DataGovernanceReportingRepository {
  constructor({ dbClient = db } = {}) {
    if (!dbClient) {
      throw new Error('DataGovernanceReportingRepository requires a database client.');
    }

    this.db = dbClient;
  }

  async fetchRetentionOverview() {
    return this.db('vw_data_governance_retention_overview')
      .select([
        'policy_id',
        'entity_name',
        'action',
        'retention_period_days',
        'active',
        'description',
        'total_runs',
        'failure_count',
        'dry_run_count',
        'total_rows_removed',
        'last_enforced_at',
        'last_status',
        'last_mode',
        'last_dry_run',
        'last_rows_affected',
        'last_duration_ms'
      ])
      .orderBy('entity_name', 'asc');
  }

  async fetchPolicyHistory(policyId, { limit = 50 } = {}) {
    if (!policyId) {
      throw new Error('Policy history queries require a policyId.');
    }

    return this.db('data_retention_audit_logs')
      .where({ policy_id: policyId })
      .orderBy('enforced_at', 'desc')
      .limit(limit);
  }
}

export default DataGovernanceReportingRepository;
