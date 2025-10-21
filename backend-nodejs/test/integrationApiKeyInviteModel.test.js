import { describe, expect, it, vi } from 'vitest';

import IntegrationApiKeyInviteModel from '../src/models/IntegrationApiKeyInviteModel.js';

function createConnectionMock() {
  let insertPayload = null;

  const queryBuilder = {
    insert: vi.fn((payload) => {
      insertPayload = payload;
      return {
        returning: vi.fn(async () => [
          {
            id: 'invite-123',
            provider: payload.provider,
            environment: payload.environment,
            alias: payload.alias,
            api_key_id: payload.api_key_id,
            owner_email: payload.owner_email,
            requested_by: payload.requested_by,
            requested_at: payload.requested_at,
            expires_at: payload.expires_at,
            status: payload.status,
            token_hash: payload.token_hash,
            rotation_interval_days: payload.rotation_interval_days,
            key_expires_at: payload.key_expires_at,
            completed_at: null,
            completed_by: null,
            cancelled_at: null,
            cancelled_by: null,
            last_sent_at: payload.last_sent_at,
            send_count: payload.send_count,
            metadata: payload.metadata,
            created_at: payload.requested_at,
            updated_at: payload.requested_at
          }
        ])
      };
    }),
    where: vi.fn(function () {
      return this;
    }),
    orderBy: vi.fn(function () {
      return this;
    }),
    first: vi.fn(async () => null)
  };

  const connection = vi.fn(() => queryBuilder);
  connection.fn = { now: vi.fn(() => '2025-02-01T10:00:00.000Z') };
  connection.__getInsertPayload = () => insertPayload;
  connection.__queryBuilder = queryBuilder;
  return connection;
}

describe('IntegrationApiKeyInviteModel', () => {
  it('safely serialises metadata and defaults invite lifecycle fields during create', async () => {
    const connection = createConnectionMock();

    const result = await IntegrationApiKeyInviteModel.create(
      {
        provider: 'openai',
        environment: 'production',
        alias: 'ops-bot',
        ownerEmail: 'ops@example.com',
        requestedBy: 'admin@example.com',
        tokenHash: 'hash-token',
        metadata: { reason: 'initial-onboarding', invalid: 1n }
      },
      connection
    );

    const payload = connection.__getInsertPayload();

    expect(payload).toBeTruthy();
    expect(payload.id).toBeUndefined();
    expect(payload.metadata).toBe('{}');
    expect(payload.rotation_interval_days).toBeNull();
    expect(payload.expires_at).toBeNull();
    expect(payload.key_expires_at).toBeNull();
    expect(payload.send_count).toBe(1);
    expect(connection.fn.now).toHaveBeenCalledTimes(2);

    expect(result).toMatchObject({
      provider: 'openai',
      environment: 'production',
      alias: 'ops-bot',
      metadata: {},
      sendCount: 1,
      status: 'pending'
    });
    expect(result.requestedAt).toBeInstanceOf(Date);
    expect(result.lastSentAt).toBeInstanceOf(Date);
  });

  it('maps rows defensively when persisted metadata cannot be parsed', () => {
    const rawRow = {
      id: 'invite-456',
      provider: 'stripe',
      environment: 'sandbox',
      alias: 'finance-bot',
      api_key_id: 'api-key-1',
      owner_email: 'ops@example.com',
      requested_by: 'owner@example.com',
      requested_at: '2025-02-01T10:00:00.000Z',
      expires_at: '2025-02-02T10:00:00.000Z',
      status: 'pending',
      token_hash: 'hash-value',
      rotation_interval_days: '45',
      key_expires_at: '2025-03-01T10:00:00.000Z',
      completed_at: null,
      completed_by: null,
      cancelled_at: null,
      cancelled_by: null,
      last_sent_at: '2025-02-01T11:00:00.000Z',
      send_count: '3',
      metadata: '{"invalid-json"',
      created_at: '2025-02-01T10:00:00.000Z',
      updated_at: '2025-02-01T10:00:00.000Z'
    };

    const mapped = IntegrationApiKeyInviteModel.mapRow(rawRow);

    expect(mapped.metadata).toEqual({});
    expect(mapped.rotationIntervalDays).toBe(45);
    expect(mapped.sendCount).toBe(3);
    expect(mapped.requestedAt).toBeInstanceOf(Date);
    expect(mapped.lastSentAt).toBeInstanceOf(Date);
  });
});
