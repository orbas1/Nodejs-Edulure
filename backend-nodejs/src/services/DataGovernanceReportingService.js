import logger from '../config/logger.js';
import { DataGovernanceReportingRepository } from '../repositories/DataGovernanceReportingRepository.js';

function normalizeBoolean(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return Boolean(value);
}

function normalizeNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export class DataGovernanceReportingService {
  constructor({ repository, loggerInstance = logger.child({ module: 'data-governance-reporting' }) } = {}) {
    this.repository = repository ?? new DataGovernanceReportingRepository();
    this.logger = loggerInstance;
  }

  async getRetentionOverview() {
    const rows = await this.repository.fetchRetentionOverview();
    return rows.map((row) => ({
      policyId: row.policy_id,
      entityName: row.entity_name,
      action: row.action,
      retentionPeriodDays: Number(row.retention_period_days),
      active: normalizeBoolean(row.active),
      description: row.description,
      totalRuns: normalizeNumber(row.total_runs),
      failureCount: normalizeNumber(row.failure_count),
      dryRunCount: normalizeNumber(row.dry_run_count),
      totalRowsRemoved: normalizeNumber(row.total_rows_removed),
      lastEnforcedAt: row.last_enforced_at ? new Date(row.last_enforced_at) : null,
      lastStatus: row.last_status ?? null,
      lastMode: row.last_mode ?? null,
      lastDryRun: row.last_dry_run === null ? null : normalizeBoolean(row.last_dry_run),
      lastRowsAffected: normalizeNumber(row.last_rows_affected),
      lastDurationMs: normalizeNumber(row.last_duration_ms)
    }));
  }

  async getPolicyHistory(policyId, { limit = 50 } = {}) {
    const events = await this.repository.fetchPolicyHistory(policyId, { limit });
    return events.map((event) => ({
      id: event.id,
      policyId: event.policy_id,
      enforcedAt: event.enforced_at ? new Date(event.enforced_at) : null,
      dryRun: normalizeBoolean(event.dry_run),
      status: event.status ?? 'executed',
      mode: event.mode ?? 'commit',
      runId: event.run_id ?? null,
      rowsAffected: normalizeNumber(event.rows_affected),
      durationMs: normalizeNumber(event.duration_ms),
      details: (() => {
        if (!event.details) {
          return {};
        }
        try {
          return JSON.parse(event.details);
        } catch (error) {
          this.logger.warn({ err: error, eventId: event.id }, 'Failed to parse retention audit detail payload');
          return {};
        }
      })()
    }));
  }
}

export default DataGovernanceReportingService;
