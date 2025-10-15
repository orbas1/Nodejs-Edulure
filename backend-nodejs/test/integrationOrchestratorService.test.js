import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IntegrationOrchestratorService } from '../src/services/IntegrationOrchestratorService.js';

const loggerStub = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: () => loggerStub
};

function createRunModel() {
  return {
    latestForIntegration: vi.fn(),
    create: vi.fn(),
    markStarted: vi.fn(),
    incrementCounters: vi.fn(),
    markCompleted: vi.fn(),
    recordError: vi.fn(),
    listRecent: vi.fn()
  };
}

function createResultModel() {
  return {
    bulkInsert: vi.fn()
  };
}

function createHubSpotClient() {
  return {
    upsertContacts: vi.fn(),
    searchContacts: vi.fn()
  };
}

describe('IntegrationOrchestratorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs HubSpot sync with outbound and inbound processing', async () => {
    const runModel = createRunModel();
    const resultModel = createResultModel();
    const hubspotClient = createHubSpotClient();

    const run = { id: 42 };
    runModel.latestForIntegration.mockResolvedValue(null);
    runModel.create.mockResolvedValue(run);
    runModel.markStarted.mockResolvedValue(run);
    runModel.incrementCounters.mockResolvedValue(run);
    runModel.markCompleted.mockResolvedValue(run);

    const contacts = [
      {
        email: 'learner@example.com',
        id: 'learner@example.com',
        idProperty: 'email',
        idempotencyKey: 'abc',
        properties: { email: 'learner@example.com', edulure_role: 'learner' }
      },
      {
        email: 'instructor@example.com',
        id: 'instructor@example.com',
        idProperty: 'email',
        idempotencyKey: 'def',
        properties: { email: 'instructor@example.com', edulure_role: 'instructor' }
      }
    ];

    const orchestrator = new IntegrationOrchestratorService({
      envConfig: {
        hubspot: {
          enabled: true,
          accessToken: 'token',
          baseUrl: 'https://api.hubapi.com',
          timeoutMs: 2000,
          maxRetries: 1,
          syncWindowMinutes: 60
        },
        salesforce: { enabled: false },
        crm: {}
      },
      hubspotClient,
      salesforceClient: null,
      runModel,
      resultModel,
      reportModel: { list: vi.fn() },
      scheduler: { validate: () => true },
      loggerInstance: loggerStub
    });

    vi.spyOn(orchestrator, 'collectHubSpotContacts').mockResolvedValue({
      contacts,
      skipped: 0,
      summary: { prepared: contacts.length }
    });

    vi.spyOn(orchestrator, 'collectHubSpotInbound').mockResolvedValue({
      count: 1,
      nextAfter: null,
      summary: { sampled: 1 }
    });

    hubspotClient.upsertContacts.mockResolvedValue({
      succeeded: contacts.length,
      failed: 0,
      results: contacts.map((contact, index) => ({
        source: contact,
        status: 'SUCCESS',
        hubspotId: `hubspot-${index}`
      }))
    });

    resultModel.bulkInsert.mockResolvedValue(contacts.length);

    await orchestrator.runHubSpotSync({ trigger: 'test' });

    expect(runModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ integration: 'hubspot', syncType: 'delta', triggeredBy: 'test' })
    );
    expect(hubspotClient.upsertContacts).toHaveBeenCalledWith(contacts);
    expect(resultModel.bulkInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          integration: 'hubspot',
          direction: 'outbound',
          entityId: 'learner@example.com'
        })
      ])
    );
    expect(runModel.markCompleted).toHaveBeenCalledWith(
      run.id,
      expect.objectContaining({ status: 'succeeded', recordsPushed: contacts.length, recordsFailed: 0 })
    );
  });
});
