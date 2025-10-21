import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

const statusModelMock = {
  findByIntegration: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  list: vi.fn()
};

const statusEventModelMock = {
  create: vi.fn(),
  listRecent: vi.fn()
};

const callAuditModelMock = {
  create: vi.fn(),
  summarise: vi.fn(),
  summariseCalls: vi.fn()
};

const apiKeyModelMock = {
  findByAlias: vi.fn()
};

const trx = Symbol('trx');

const dbMock = {
  transaction: vi.fn(async (callback) => callback(trx))
};

import { IntegrationStatusService } from '../src/services/IntegrationStatusService.js';

describe('IntegrationStatusService', () => {
  let service;
  const now = new Date('2025-02-25T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    service = new IntegrationStatusService({
      statusModel: statusModelMock,
      statusEventModel: statusEventModelMock,
      callAuditModel: callAuditModelMock,
      apiKeyModel: apiKeyModelMock,
      database: dbMock,
      nowProvider: () => now
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records a failed run, increments incidents, and stores metadata snapshot', async () => {
    statusModelMock.findByIntegration.mockResolvedValueOnce({
      id: 1,
      consecutiveFailures: 0,
      openIncidentCount: 0,
      metadata: {},
      latestSyncRunId: null,
      primaryApiKeyId: null
    });
    apiKeyModelMock.findByAlias.mockResolvedValueOnce({ id: 42 });
    const updatedRecord = {
      id: 1,
      status: 'critical',
      statusSummary: 'Sync 55 failed',
      latestSyncRunId: 55,
      primaryApiKeyId: 42,
      consecutiveFailures: 1,
      openIncidentCount: 1,
      metadata: {}
    };
    statusModelMock.updateById.mockResolvedValueOnce(updatedRecord);

    const result = await service.recordRunOutcome({
      integration: 'hubspot',
      environment: 'production',
      syncRunId: 55,
      runStatus: 'failed',
      triggeredBy: 'scheduler',
      correlationId: 'abc-123',
      recordsSucceeded: 0,
      recordsFailed: 3,
      metadata: { syncWindow: { start: '2025-02-25T10:00:00Z' } },
      apiKeyAlias: 'Primary'
    });

    expect(dbMock.transaction).toHaveBeenCalled();
    expect(statusModelMock.updateById).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: 'critical',
        openIncidentCount: 1,
        consecutiveFailures: 1,
        metadata: expect.objectContaining({
          lastRun: expect.objectContaining({
            syncRunId: 55,
            status: 'failed',
            completedAt: now.toISOString()
          })
        })
      }),
      trx
    );

    expect(statusEventModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        statusId: 1,
        integration: 'hubspot',
        status: 'critical',
        metadata: expect.objectContaining({ status: 'failed' })
      }),
      trx
    );

    expect(result).toBe(updatedRecord);
  });

  it('produces a health snapshot with recent events and call summary', async () => {
    const statusRecord = {
      id: 8,
      integration: 'salesforce',
      environment: 'staging',
      status: 'operational',
      statusSummary: 'All clear',
      lastSuccessAt: new Date('2025-02-24T08:00:00.000Z'),
      lastFailureAt: new Date('2025-02-23T06:00:00.000Z'),
      consecutiveFailures: 0,
      openIncidentCount: 0,
      metadata: { health: { consecutiveFailures: 0 } }
    };

    statusModelMock.findByIntegration.mockResolvedValueOnce(statusRecord);
    statusEventModelMock.listRecent.mockResolvedValueOnce([
      { id: 2, status: 'operational', summary: 'Run OK', occurredAt: new Date('2025-02-24T08:00:30.000Z') }
    ]);
    callAuditModelMock.summariseCalls.mockResolvedValueOnce({
      total: 10,
      success: 9,
      degraded: 1,
      failure: 0
    });

    const snapshot = await service.getHealthSnapshot('salesforce', 'staging');

    expect(snapshot).toEqual({
      integration: 'salesforce',
      environment: 'staging',
      status: 'operational',
      statusSummary: 'All clear',
      lastSuccessAt: '2025-02-24T08:00:00.000Z',
      lastFailureAt: '2025-02-23T06:00:00.000Z',
      consecutiveFailures: 0,
      openIncidentCount: 0,
      metadata: { health: { consecutiveFailures: 0 } },
      events: [
        { id: 2, status: 'operational', summary: 'Run OK', occurredAt: '2025-02-24T08:00:30.000Z' }
      ],
      callSummary: { total: 10, success: 9, degraded: 1, failure: 0 }
    });
  });
});
