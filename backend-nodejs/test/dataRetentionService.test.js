import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  enforceRetentionPolicies,
  registerRetentionStrategy,
  unregisterRetentionStrategy
} from '../src/services/dataRetentionService.js';
import changeDataCaptureService from '../src/services/ChangeDataCaptureService.js';

const ENTITY = 'unit_records';

function createBuilder({ sampleIds = [101, 102], affectedRows = 2 } = {}) {
  return {
    count: vi.fn().mockResolvedValue([{ total: sampleIds.length }]),
    clone: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    pluck: vi.fn().mockResolvedValue(sampleIds),
    del: vi.fn().mockResolvedValue(affectedRows),
    update: vi.fn().mockResolvedValue(affectedRows)
  };
}

describe('dataRetentionService', () => {
  let auditInsert;
  let fakeDb;
  let fakeTrx;

  beforeEach(() => {
    auditInsert = vi.fn().mockResolvedValue();
    fakeTrx = vi.fn((tableName) => {
      if (tableName === 'data_retention_audit_logs') {
        return { insert: auditInsert };
      }
      return createBuilder();
    });
    fakeTrx.raw = vi.fn(() => 'timestamp');
    fakeTrx.fn = { now: () => new Date() };

    fakeDb = {
      async transaction(handler) {
        return handler(fakeTrx);
      }
    };
    vi.spyOn(changeDataCaptureService, 'recordEvent').mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    unregisterRetentionStrategy(ENTITY);
    vi.restoreAllMocks();
  });

  function registerTestStrategy({ sampleIds = [201, 202], affectedRows = 2 } = {}) {
    const builders = [];
    const factory = vi.fn(() => {
      const builder = createBuilder({ sampleIds, affectedRows });
      builders.push(builder);
      return builder;
    });

    registerRetentionStrategy(ENTITY, () => ({
      idColumn: 'record_id',
      buildQuery: factory,
      reason: 'clean unit records',
      context: { severity: 'low' }
    }));

    return { builders, factory };
  }

  it('executes registered strategy and records audit logs', async () => {
    const { builders } = registerTestStrategy({ sampleIds: [11, 12], affectedRows: 2 });

    const policy = {
      id: 99,
      entityName: ENTITY,
      action: 'hard-delete',
      retentionPeriodDays: 30,
      active: true,
      description: 'Unit cleanup'
    };

    const summary = await enforceRetentionPolicies({ policies: [policy], dbClient: fakeDb });

    expect(summary.results).toHaveLength(1);
    expect(summary.results[0]).toMatchObject({
      policyId: 99,
      status: 'executed',
      affectedRows: 2,
      sampleIds: [11, 12]
    });
    expect(builders.at(-1).del).toHaveBeenCalledTimes(1);
    expect(auditInsert).toHaveBeenCalledTimes(1);
    expect(auditInsert.mock.calls[0][0]).toMatchObject({
      policy_id: 99,
      rows_affected: 2
    });
    const details = JSON.parse(auditInsert.mock.calls[0][0].details);
    expect(details.runId).toBeDefined();
    expect(summary.runId).toBeDefined();
    expect(changeDataCaptureService.recordEvent).toHaveBeenCalled();
  });

  it('respects dry-run mode without mutating records', async () => {
    const { builders } = registerTestStrategy({ sampleIds: [55], affectedRows: 1 });

    const policy = {
      id: 12,
      entityName: ENTITY,
      action: 'hard-delete',
      retentionPeriodDays: 10,
      active: true,
      description: 'Dry run verification'
    };

    const summary = await enforceRetentionPolicies({ mode: 'simulate', policies: [policy], dbClient: fakeDb });

    expect(summary.dryRun).toBe(true);
    expect(summary.results[0]).toMatchObject({ status: 'executed', affectedRows: 1 });
    expect(builders.at(-1).count).toHaveBeenCalledTimes(1);
    expect(builders.at(-1).del).not.toHaveBeenCalled();
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it('skips policies without registered strategies', async () => {
    const policy = {
      id: 77,
      entityName: 'unknown_entity',
      action: 'hard-delete',
      retentionPeriodDays: 15,
      active: true
    };

    const summary = await enforceRetentionPolicies({ policies: [policy], dbClient: fakeDb });

    expect(summary.results[0]).toMatchObject({
      policyId: 77,
      status: 'skipped-unsupported'
    });
  });

  it('captures failures from strategy execution', async () => {
    const failingBuilder = createBuilder({ sampleIds: [1], affectedRows: 1 });
    failingBuilder.del.mockRejectedValue(new Error('database unavailable'));

    registerRetentionStrategy(ENTITY, () => ({
      idColumn: 'record_id',
      buildQuery: () => failingBuilder,
      reason: 'should fail'
    }));

    const policy = {
      id: 44,
      entityName: ENTITY,
      action: 'hard-delete',
      retentionPeriodDays: 45,
      active: true
    };

    const summary = await enforceRetentionPolicies({ policies: [policy], dbClient: fakeDb });

    expect(summary.results[0]).toMatchObject({
      policyId: 44,
      status: 'failed',
      error: 'database unavailable'
    });
    expect(auditInsert).not.toHaveBeenCalled();
  });
});
