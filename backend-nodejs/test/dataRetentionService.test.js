import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  __esModule: true,
  default: {}
}));

vi.mock('../src/config/logger.js', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  };
  mockLogger.child = vi.fn(() => mockLogger);
  return {
    __esModule: true,
    default: mockLogger
  };
});

import {
  enforceRetentionPolicies,
  registerRetentionStrategy,
  unregisterRetentionStrategy
} from '../src/services/dataRetentionService.js';
import changeDataCaptureService from '../src/services/ChangeDataCaptureService.js';

const ENTITY = 'unit_records';

function createBuilder({ sampleIds = [101, 102], affectedRows = sampleIds.length, remainingAfter = 0 } = {}, state) {
  const sharedState = state ?? { deleted: false };

  const builder = {
    count: vi.fn().mockImplementation(() => {
      const total = sharedState.deleted ? remainingAfter : sampleIds.length;
      return Promise.resolve([{ total }]);
    }),
    clone: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    pluck: vi.fn().mockResolvedValue(sampleIds),
    del: vi.fn().mockImplementation(async () => {
      sharedState.deleted = true;
      return affectedRows;
    }),
    update: vi.fn().mockImplementation(async () => {
      sharedState.deleted = true;
      return affectedRows;
    })
  };

  return builder;
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

  function registerTestStrategy({ sampleIds = [201, 202], affectedRows = 2, remainingAfter = 0 } = {}) {
    const builders = [];
    const state = { deleted: false };
    const factory = vi.fn(() => {
      const builder = createBuilder({ sampleIds, affectedRows, remainingAfter }, state);
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
      sampleIds: [11, 12],
      verification: { status: 'cleared', remainingRows: 0 }
    });
    expect(builders.some((builder) => builder.del.mock.calls.length === 1)).toBe(true);
    expect(auditInsert).toHaveBeenCalledTimes(1);
    expect(auditInsert.mock.calls[0][0]).toMatchObject({
      policy_id: 99,
      rows_affected: 2
    });
    const details = JSON.parse(auditInsert.mock.calls[0][0].details);
    expect(details.runId).toBeDefined();
    expect(details.verification).toMatchObject({ status: 'cleared', remainingRows: 0 });
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
    expect(summary.results[0]).toMatchObject({
      status: 'executed',
      affectedRows: 1,
      verification: { status: 'simulated', remainingRows: 1 }
    });
    expect(builders.at(-1).count).toHaveBeenCalledTimes(1);
    expect(builders.at(-1).del).not.toHaveBeenCalled();
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it('reports residual rows when verification detects remaining records without failing when configured', async () => {
    const { builders } = registerTestStrategy({ sampleIds: [7, 8], affectedRows: 1, remainingAfter: 1 });

    const policy = {
      id: 33,
      entityName: ENTITY,
      action: 'hard-delete',
      retentionPeriodDays: 14,
      active: true,
      description: 'Residual verification test'
    };

    const summary = await enforceRetentionPolicies({
      policies: [policy],
      dbClient: fakeDb,
      verification: { failOnResidual: false }
    });

    expect(summary.results[0]).toMatchObject({ status: 'executed' });
    expect(summary.results[0].verification).toMatchObject({ status: 'residual', remainingRows: 1 });
    expect(builders.some((builder) => builder.del.mock.calls.length === 1)).toBe(true);
  });

  it('fails policy when residual rows remain and failOnResidual is enabled', async () => {
    const { builders } = registerTestStrategy({ sampleIds: [9, 10], affectedRows: 1, remainingAfter: 1 });

    const policy = {
      id: 55,
      entityName: ENTITY,
      action: 'hard-delete',
      retentionPeriodDays: 30,
      active: true,
      description: 'Residual failure test'
    };

    const summary = await enforceRetentionPolicies({ policies: [policy], dbClient: fakeDb });

    expect(summary.results[0]).toMatchObject({
      status: 'failed',
      error: expect.stringContaining('Residual rows remain'),
      verification: { status: 'residual', remainingRows: 1 }
    });
    expect(builders.some((builder) => builder.del.mock.calls.length === 1)).toBe(true);
    expect(auditInsert).toHaveBeenCalledTimes(1);
    expect(JSON.parse(auditInsert.mock.calls[0][0].details).verification).toMatchObject({
      status: 'residual',
      remainingRows: 1
    });
    const cdcEvent = changeDataCaptureService.recordEvent.mock.calls.at(-1)[0];
    expect(cdcEvent.operation).toBe('RETENTION_FAILED');
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
