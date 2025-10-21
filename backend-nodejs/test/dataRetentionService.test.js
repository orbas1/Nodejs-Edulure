import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const recordEventMock = vi.hoisted(() => vi.fn());
const auditInsertMock = vi.hoisted(() => vi.fn());
const trxStub = vi.hoisted(() => {
  const stub = vi.fn(() => ({ insert: auditInsertMock }));
  stub.fn = { now: () => new Date() };
  return stub;
});
const dbClient = vi.hoisted(() => ({
  transaction: vi.fn((handler) => handler(trxStub))
}));

vi.mock('../src/services/ChangeDataCaptureService.js', () => ({
  default: {
    recordEvent: recordEventMock
  }
}));

import {
  enforceRetentionPolicies,
  registerRetentionStrategy,
  unregisterRetentionStrategy,
  listRetentionStrategies
} from '../src/services/dataRetentionService.js';

describe('dataRetentionService', () => {
  const strategyKey = 'vitest_entities';

  beforeEach(() => {
    vi.clearAllMocks();
    auditInsertMock.mockReset();
    trxStub.mockImplementation(() => ({ insert: auditInsertMock }));
    dbClient.transaction.mockImplementation((handler) => handler(trxStub));
    registerRetentionStrategy(strategyKey, (policy) => {
      const createBuilder = () => {
        const builder = {
          clone: () => builder,
          limit: () => builder,
          pluck: vi.fn(async () => [101, 102]),
          count: vi.fn(async () => [{ total: 2 }]),
          del: vi.fn(async () => 2),
          update: vi.fn(async () => 2)
        };
        return builder;
      };

      return {
        idColumn: 'id',
        reason: `enforce policy ${policy.id}`,
        context: { policyId: policy.id },
        buildQuery: () => createBuilder()
      };
    });
  });

  afterEach(() => {
    unregisterRetentionStrategy(strategyKey);
  });

  it('registers and lists custom retention strategies', () => {
    const strategies = listRetentionStrategies();
    expect(strategies).toContain(strategyKey);
  });

  it('enforces retention policies and records audit events', async () => {
    const onAlert = vi.fn();
    const result = await enforceRetentionPolicies({
      dbClient,
      policies: [
        {
          id: 1,
          entityName: strategyKey,
          action: 'hard-delete',
          retentionPeriodDays: 30,
          description: 'Purge vitest records',
          criteria: {},
          active: true
        }
      ],
      dryRun: false,
      alertThreshold: 1,
      onAlert
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({ status: 'executed', affectedRows: 2 });
    expect(onAlert).toHaveBeenCalled();
    expect(auditInsertMock).toHaveBeenCalled();
    const successEvent = recordEventMock.mock.calls.at(-1)?.[0];
    expect(successEvent).toMatchObject({
      payload: expect.objectContaining({ status: 'executed', policyId: 1 })
    });
  });

  it('captures failures from retention strategies', async () => {
    unregisterRetentionStrategy(strategyKey);
    registerRetentionStrategy(strategyKey, () => {
      throw new Error('strategy failure');
    });

    const result = await enforceRetentionPolicies({
      dbClient,
      policies: [
        {
          id: 2,
          entityName: strategyKey,
          action: 'hard-delete',
          retentionPeriodDays: 30,
          description: 'Failing policy',
          criteria: {},
          active: true
        }
      ],
      dryRun: false
    });

    expect(result.results[0]).toMatchObject({ status: 'failed' });
    const failureEvent = recordEventMock.mock.calls.at(-1)?.[0];
    expect(failureEvent).toMatchObject({
      payload: expect.objectContaining({ status: 'failed', policyId: 2 })
    });
  });
});
