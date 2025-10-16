import { beforeEach, describe, expect, it, vi } from 'vitest';

import IntegrationDashboardService from '../src/services/IntegrationDashboardService.js';

describe('IntegrationDashboardService', () => {
  const orchestratorMock = {
    statusSnapshot: vi.fn(),
    executeJob: vi.fn(),
    runHubSpotSync: vi.fn(),
    runSalesforceSync: vi.fn(),
    hubspotEnabled: true,
    salesforceEnabled: true
  };

  const runModelMock = {
    listRecent: vi.fn()
  };

  const resultModelMock = {
    listFailures: vi.fn()
  };

  const reportModelMock = {
    list: vi.fn()
  };

  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date('2025-02-25T12:00:00.000Z'));
    orchestratorMock.hubspotEnabled = true;
    orchestratorMock.salesforceEnabled = true;

    orchestratorMock.statusSnapshot.mockResolvedValue({
      hubspot: { enabled: true },
      salesforce: { enabled: false },
      concurrentJobs: 1,
      maxConcurrentJobs: 2
    });

    runModelMock.listRecent.mockResolvedValueOnce([
      {
        id: 10,
        integration: 'hubspot',
        syncType: 'delta',
        status: 'succeeded',
        triggeredBy: 'scheduler',
        correlationId: 'abc',
        retryAttempt: 0,
        windowStartAt: '2025-02-25T10:00:00.000Z',
        windowEndAt: '2025-02-25T11:00:00.000Z',
        startedAt: '2025-02-25T11:05:00.000Z',
        finishedAt: '2025-02-25T11:05:42.000Z',
        recordsPushed: 120,
        recordsPulled: 12,
        recordsFailed: 1,
        recordsSkipped: 3,
        lastError: null,
        metadata: { outboundCandidates: 121 }
      }
    ]);

    runModelMock.listRecent.mockResolvedValueOnce([]);

    resultModelMock.listFailures.mockResolvedValueOnce([
      {
        id: 99,
        syncRunId: 10,
        integration: 'hubspot',
        entityId: 'contact-1',
        externalId: '123',
        direction: 'outbound',
        operation: 'upsert',
        status: 'failed',
        retryCount: 2,
        message: 'Invalid email',
        occurredAt: '2025-02-25T11:05:10.000Z'
      }
    ]);

    resultModelMock.listFailures.mockResolvedValueOnce([]);

    reportModelMock.list.mockResolvedValueOnce([
      {
        id: 5,
        integration: 'hubspot',
        status: 'completed',
        mismatchCount: 2,
        correlationId: 'run-5',
        reportDate: '2025-02-24',
        generatedAt: '2025-02-24T23:50:00.000Z',
        missingInPlatform: [
          { email: 'missing@example.com', name: 'Missing Contact', reason: 'Not in CRM' }
        ],
        missingInIntegration: [
          { email: 'crm-only@example.com', name: 'CRM Contact', reason: 'Lead archived' }
        ],
        extraContext: { owner: 'ops-team' }
      }
    ]);

    reportModelMock.list.mockResolvedValueOnce([]);

    service = new IntegrationDashboardService({
      orchestratorService: orchestratorMock,
      runModel: runModelMock,
      resultModel: resultModelMock,
      reportModel: reportModelMock
    });
  });

  it('builds a snapshot with sanitised run, failure, and reconciliation data', async () => {
    const snapshot = await service.buildSnapshot({ runLimit: 5, failureLimit: 10, reportLimit: 3 });

    expect(snapshot.generatedAt).toBe('2025-02-25T12:00:00.000Z');
    expect(snapshot.concurrency).toEqual({ activeJobs: 1, maxConcurrentJobs: 2 });
    expect(snapshot.integrations).toHaveLength(2);

    const hubspot = snapshot.integrations.find((integration) => integration.id === 'hubspot');
    expect(hubspot.enabled).toBe(true);
    expect(hubspot.health).toBe('warning');
    expect(hubspot.summary).toEqual(
      expect.objectContaining({
        lastRunStatus: 'succeeded',
        successRate: 100,
        recordsPushed: 120,
        recordsFailed: 1,
        openFailures: 1
      })
    );
    expect(hubspot.recentRuns[0]).toEqual(
      expect.objectContaining({
        id: 10,
        durationSeconds: 42,
        records: expect.objectContaining({ pushed: 120, failed: 1 })
      })
    );
    expect(hubspot.failureLog[0]).toEqual(
      expect.objectContaining({
        message: 'Invalid email',
        retryCount: 2,
        occurredAt: '2025-02-25T11:05:10.000Z'
      })
    );
    expect(hubspot.reconciliation.reports[0]).toEqual(
      expect.objectContaining({
        id: 5,
        mismatchCount: 2,
        missingInPlatform: [
          expect.objectContaining({
            email: 'mi***@example.com',
            name: 'Missing Contact'
          })
        ]
      })
    );

    const salesforce = snapshot.integrations.find((integration) => integration.id === 'salesforce');
    expect(salesforce.enabled).toBe(false);
    expect(salesforce.health).toBe('disabled');

    expect(snapshot.searchIndex).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'integration-hubspot', url: '/dashboard/admin/integrations?integration=hubspot' })
      ])
    );
  });

  it('triggers manual HubSpot sync and returns run metadata', async () => {
    orchestratorMock.executeJob.mockResolvedValue({
      run: {
        id: 55,
        correlationId: 'manual-run-55',
        status: 'running',
        triggeredBy: 'manual-dashboard'
      }
    });

    const result = await service.triggerManualSync('hubspot', {
      windowStartAt: '2025-02-25T09:00:00.000Z',
      windowEndAt: '2025-02-25T11:00:00.000Z'
    });

    expect(orchestratorMock.executeJob).toHaveBeenCalledTimes(1);
    expect(orchestratorMock.runHubSpotSync).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        integration: 'hubspot',
        runId: 55,
        correlationId: 'manual-run-55',
        status: 'running'
      })
    );
  });

  it('throws when integration is disabled or unsupported', async () => {
    orchestratorMock.salesforceEnabled = false;

    await expect(service.triggerManualSync('salesforce')).rejects.toMatchObject({ status: 409 });
    await expect(service.triggerManualSync('google-drive')).rejects.toMatchObject({ status: 404 });
  });
});

