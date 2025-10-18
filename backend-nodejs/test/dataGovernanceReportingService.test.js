import { describe, it, expect, vi } from 'vitest';

import DataGovernanceReportingService from '../src/services/DataGovernanceReportingService.js';

describe('DataGovernanceReportingService', () => {
  it('normalises overview rows', async () => {
    const repository = {
      fetchRetentionOverview: vi.fn().mockResolvedValue([
        {
          policy_id: 10,
          entity_name: 'user_sessions',
          action: 'hard-delete',
          retention_period_days: 90,
          active: 1,
          description: 'Remove stale sessions',
          total_runs: 12,
          failure_count: 2,
          dry_run_count: 3,
          total_rows_removed: 450,
          last_enforced_at: '2025-02-10T08:00:00Z',
          last_status: 'executed',
          last_mode: 'commit',
          last_dry_run: 0,
          last_rows_affected: 42,
          last_duration_ms: 180
        }
      ])
    };

    const service = new DataGovernanceReportingService({ repository, loggerInstance: { warn: () => {} } });

    const overview = await service.getRetentionOverview();
    expect(overview).toEqual([
      {
        policyId: 10,
        entityName: 'user_sessions',
        action: 'hard-delete',
        retentionPeriodDays: 90,
        active: true,
        description: 'Remove stale sessions',
        totalRuns: 12,
        failureCount: 2,
        dryRunCount: 3,
        totalRowsRemoved: 450,
        lastEnforcedAt: new Date('2025-02-10T08:00:00Z'),
        lastStatus: 'executed',
        lastMode: 'commit',
        lastDryRun: false,
        lastRowsAffected: 42,
        lastDurationMs: 180
      }
    ]);
    expect(repository.fetchRetentionOverview).toHaveBeenCalledTimes(1);
  });

  it('parses audit history payloads with resilience', async () => {
    const repository = {
      fetchRetentionOverview: vi.fn(),
      fetchPolicyHistory: vi.fn().mockResolvedValue([
        {
          id: 1,
          policy_id: 10,
          enforced_at: '2025-02-11T07:00:00Z',
          dry_run: 0,
          status: 'executed',
          mode: 'commit',
          run_id: 'run-1',
          rows_affected: 12,
          duration_ms: 140,
          details: JSON.stringify({ status: 'executed', matchedRows: 12 })
        },
        {
          id: 2,
          policy_id: 10,
          enforced_at: '2025-02-12T07:00:00Z',
          dry_run: 1,
          status: 'failed',
          mode: 'commit',
          run_id: 'run-2',
          rows_affected: 0,
          duration_ms: 90,
          details: 'not-json'
        }
      ])
    };

    const warnings = [];
    const service = new DataGovernanceReportingService({
      repository,
      loggerInstance: { warn: (payload) => warnings.push(payload) }
    });

    const history = await service.getPolicyHistory(10, { limit: 5 });

    expect(history).toEqual([
      {
        id: 1,
        policyId: 10,
        enforcedAt: new Date('2025-02-11T07:00:00Z'),
        dryRun: false,
        status: 'executed',
        mode: 'commit',
        runId: 'run-1',
        rowsAffected: 12,
        durationMs: 140,
        details: { status: 'executed', matchedRows: 12 }
      },
      {
        id: 2,
        policyId: 10,
        enforcedAt: new Date('2025-02-12T07:00:00Z'),
        dryRun: true,
        status: 'failed',
        mode: 'commit',
        runId: 'run-2',
        rowsAffected: 0,
        durationMs: 90,
        details: {}
      }
    ]);
    expect(repository.fetchPolicyHistory).toHaveBeenCalledWith(10, { limit: 5 });
    expect(warnings).toHaveLength(1);
  });
});
