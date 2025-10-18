import { beforeEach, describe, expect, it } from 'vitest';

import AuditEventService from '../src/services/AuditEventService.js';
import dataEncryptionService from '../src/services/DataEncryptionService.js';
import { runWithRequestContext } from '../src/observability/requestContext.js';

function createLoggerStub() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {}
  };
}

describe('AuditEventService', () => {
  let insertedRows;
  let connection;
  let service;

  beforeEach(() => {
    insertedRows = [];
    connection = function (table) {
      return {
        insert: async (payload) => {
          insertedRows.push({ table, payload });
          return [1];
        }
      };
    };
    connection.fn = { now: () => new Date('2025-03-01T00:00:00Z') };
    connection.raw = (value) => value;

    service = new AuditEventService({
      connection,
      loggerInstance: createLoggerStub(),
      config: {
        tenantId: 'tenant-a',
        defaultSeverity: 'info',
        allowedEventTypes: [],
        enableIpCapture: true,
        ipClassificationTag: 'restricted',
        maxMetadataBytes: 512,
        metadataRedactionKeys: ['token', 'ip'],
        includeRequestContext: true
      }
    });
  });

  it('encrypts ip addresses and enriches payloads with request context', async () => {
    await runWithRequestContext(
      { traceId: 'trace-123', spanId: 'span-456', ip: '203.0.113.15', method: 'POST', path: '/audit' },
      async () => {
        await service.record({
          eventType: 'compliance.test',
          entityType: 'dsr_request',
          entityId: '321',
          actor: { id: 42, role: 'admin', type: 'user' },
          metadata: { region: 'EU', token: 'secret-value' },
          requestContext: { requestId: 'req-1', userAgent: 'vitest', ipAddress: '198.51.100.9' }
        });
      }
    );

    expect(insertedRows).toHaveLength(1);
    const [{ table, payload }] = insertedRows;
    expect(table).toBe('audit_events');
    expect(payload.actor_id).toBe(42);
    expect(payload.ip_address_ciphertext).toBeInstanceOf(Buffer);
    expect(payload.ip_address_hash).toBe(dataEncryptionService.hash('198.51.100.9'));
    expect(payload.request_id).toBe('req-1');
    expect(payload.metadata).toMatchObject({
      ipClassification: 'restricted',
      truncated: false,
      traceId: 'trace-123'
    });
    expect(payload.payload).toMatchObject({
      region: 'EU',
      token: '[REDACTED]',
      __requestContext: {
        id: 'req-1',
        traceId: 'trace-123',
        userAgent: 'vitest',
        method: 'POST',
        path: '/audit'
      }
    });
  });

  it('truncates oversized metadata and records discarded keys', async () => {
    await service.record({
      eventType: 'compliance.test',
      entityType: 'consent_record',
      entityId: 'abc',
      actor: { id: null, role: 'system', type: 'system' },
      metadata: { huge: 'x'.repeat(2048), keep: 'value' }
    });

    expect(insertedRows).toHaveLength(1);
    const [{ payload }] = insertedRows;
    expect(payload.metadata.truncated).toBe(true);
    expect(payload.metadata.discardedKeys).toContain('huge');
    expect(payload.payload.__truncated__).toMatch(/Metadata trimmed/);
    expect(payload.payload.keep).toBe('value');
  });
});
