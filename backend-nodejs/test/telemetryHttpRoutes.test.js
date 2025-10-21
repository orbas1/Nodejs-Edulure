import request from 'supertest';
import { ZodError } from 'zod';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const ingestionMock = {
  ingestEvent: vi.fn(),
  registerConsentDecision: vi.fn(),
  config: { consentDefaultVersion: 'v1' }
};

const warehouseMock = {
  exportPendingEvents: vi.fn()
};

const freshnessMock = {
  listSnapshots: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = {
      id: 99,
      role: 'admin',
      tenantId: 'tenant-1'
    };
    return next();
  }
}));

vi.mock('../src/services/TelemetryIngestionService.js', () => ({
  __esModule: true,
  default: ingestionMock
}));

vi.mock('../src/services/TelemetryWarehouseService.js', () => ({
  __esModule: true,
  default: warehouseMock
}));

vi.mock('../src/models/TelemetryFreshnessMonitorModel.js', () => ({
  __esModule: true,
  default: freshnessMock
}));

let app;

describe('Telemetry HTTP routes', () => {
  beforeAll(async () => {
    ({ default: app } = await import('../src/app.js'));
  });

  beforeEach(() => {
    ingestionMock.ingestEvent.mockReset();
    ingestionMock.registerConsentDecision.mockReset();
    warehouseMock.exportPendingEvents.mockReset();
    freshnessMock.listSnapshots.mockReset();
  });

  it('ingests telemetry events and returns status payload', async () => {
    ingestionMock.ingestEvent.mockResolvedValue({
      duplicate: false,
      suppressed: false,
      event: {
        id: 1,
        eventUuid: 'uuid-123',
        eventName: 'app.launch',
        eventSource: 'web',
        consentScope: 'product.analytics',
        consentStatus: 'granted',
        ingestionStatus: 'pending',
        occurredAt: new Date('2025-03-03T10:00:00Z'),
        receivedAt: new Date('2025-03-03T10:00:01Z'),
        createdAt: new Date('2025-03-03T10:00:02Z')
      }
    });

    const response = await request(app)
      .post('/api/v1/telemetry/events')
      .set('Authorization', 'Bearer token')
      .send({ eventName: 'app.launch', eventSource: 'web', payload: { platform: 'ios' } });

    expect(response.status).toBe(202);
    expect(response.body.status).toBe('pending');
    expect(response.body.event.eventUuid).toBe('uuid-123');
    expect(ingestionMock.ingestEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'app.launch', payload: { platform: 'ios' } }),
      expect.objectContaining({ actorId: 99 })
    );
  });

  it('returns 200 when duplicate telemetry events are replayed', async () => {
    ingestionMock.ingestEvent.mockResolvedValue({
      duplicate: true,
      suppressed: false,
      event: {
        id: 2,
        eventUuid: 'uuid-duplicate',
        eventName: 'app.launch',
        eventSource: 'web',
        consentScope: 'product.analytics',
        consentStatus: 'granted',
        ingestionStatus: 'duplicate',
        occurredAt: new Date(),
        receivedAt: new Date(),
        createdAt: new Date()
      }
    });

    const response = await request(app)
      .post('/api/v1/telemetry/events')
      .set('Authorization', 'Bearer token')
      .send({ eventName: 'app.launch', eventSource: 'web' });

    expect(response.status).toBe(200);
    expect(response.body.duplicate).toBe(true);
  });

  it('records consent decisions while applying tenant scoping', async () => {
    ingestionMock.registerConsentDecision.mockResolvedValue({
      id: 500,
      userId: 99,
      tenantId: 'tenant-1',
      consentScope: 'product.analytics',
      status: 'granted',
      recordedAt: new Date('2025-03-03T09:00:00Z')
    });

    const response = await request(app)
      .post('/api/v1/telemetry/consents')
      .set('Authorization', 'Bearer token')
      .send({ consentScope: 'product.analytics' });

    expect(response.status).toBe(201);
    expect(response.body.consent.status).toBe('granted');
    expect(ingestionMock.registerConsentDecision).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', userId: 99 })
    );
  });

  it('lists telemetry freshness monitors for operators', async () => {
    freshnessMock.listSnapshots.mockResolvedValue([
      {
        pipelineKey: 'ingestion.raw',
        status: 'healthy',
        thresholdMinutes: 15,
        lastEventAt: new Date().toISOString(),
        lagSeconds: 12,
        metadata: { eventId: 1 }
      }
    ]);

    const response = await request(app)
      .get('/api/v1/telemetry/freshness')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.monitors).toHaveLength(1);
    expect(freshnessMock.listSnapshots).toHaveBeenCalledWith({ limit: 50 });
  });

  it('triggers telemetry warehouse exports', async () => {
    warehouseMock.exportPendingEvents.mockResolvedValue({
      status: 'exported',
      exportedEvents: 2500,
      batchId: 'batch-1',
      destination: 's3://edulure-telemetry/warehouse/telemetry/batch-1.json'
    });

    const response = await request(app)
      .post('/api/v1/telemetry/export')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(202);
    expect(response.body.exportedEvents).toBe(2500);
    expect(warehouseMock.exportPendingEvents).toHaveBeenCalledWith({ trigger: 'api' });
  });

  it('returns validation errors for malformed telemetry events', async () => {
    ingestionMock.ingestEvent.mockRejectedValueOnce(
      new ZodError([{ code: 'invalid_type', message: 'Required', path: ['eventName'] }])
    );

    const response = await request(app)
      .post('/api/v1/telemetry/events')
      .set('Authorization', 'Bearer token')
      .send({ eventSource: 'web' });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual(expect.arrayContaining(['Required']));
  });

  it('validates telemetry freshness query parameters', async () => {
    const response = await request(app)
      .get('/api/v1/telemetry/freshness?limit=not-a-number')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(422);
    expect(freshnessMock.listSnapshots).not.toHaveBeenCalled();
  });
});

