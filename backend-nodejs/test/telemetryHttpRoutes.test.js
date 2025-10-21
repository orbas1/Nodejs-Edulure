import request from 'supertest';
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

  it('returns 422 when telemetry payload validation fails', async () => {
    const validationError = new Error('Telemetry event payload is invalid');
    validationError.status = 422;
    validationError.code = 'INVALID_TELEMETRY_EVENT';
    validationError.details = [{ path: 'eventName', message: 'Required', code: 'too_small' }];
    ingestionMock.ingestEvent.mockRejectedValue(validationError);

    const response = await request(app)
      .post('/api/v1/telemetry/events')
      .set('Authorization', 'Bearer token')
      .send({ eventSource: 'web' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('INVALID_TELEMETRY_EVENT');
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'eventName' })])
    );
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

  it('validates consent payloads before recording decisions', async () => {
    const response = await request(app)
      .post('/api/v1/telemetry/consents')
      .set('Authorization', 'Bearer token')
      .send({ status: 'revoked' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('INVALID_TELEMETRY_CONSENT');
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'consentScope' })])
    );
    expect(ingestionMock.registerConsentDecision).not.toHaveBeenCalled();
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
});

