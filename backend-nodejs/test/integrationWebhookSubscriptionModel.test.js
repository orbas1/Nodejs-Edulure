import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import IntegrationWebhookSubscriptionModel from '../src/models/IntegrationWebhookSubscriptionModel.js';

const TABLE = 'integration_webhook_subscriptions';

function createKnexMock(initialRows = []) {
  const state = {
    rows: initialRows.map((row) => ({ ...row })),
    nextId: initialRows.reduce((acc, row) => Math.max(acc, row.id ?? 0), 0) + 1
  };

  const connection = (tableName) => {
    if (tableName !== TABLE) {
      throw new Error(`Unexpected table ${tableName}`);
    }

    return {
      select: async () => state.rows.map((row) => ({ ...row })),
      where: () => ({
        orWhere: () => ({ select: async () => state.rows.map((row) => ({ ...row })) })
      })
    };
  };

  connection.fn = {
    now: vi.fn(() => new Date('2024-01-01T00:00:00.000Z'))
  };

  connection.isTransaction = false;
  connection.__getRows = () => state.rows.map((row) => ({ ...row }));

  return connection;
}

describe('IntegrationWebhookSubscriptionModel.findForEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters subscriptions to only eligible and event-matching entries', async () => {
    const connection = createKnexMock([
      {
        id: 1,
        public_id: 'sub_live',
        name: 'Live Course Events',
        target_url: 'https://example.com/live',
        enabled: 1,
        event_types: JSON.stringify(['course.*']),
        static_headers: JSON.stringify({}),
        signing_secret: 'secret-live',
        delivery_timeout_ms: 5000,
        max_attempts: 3,
        retry_backoff_seconds: 60,
        circuit_breaker_threshold: 5,
        circuit_breaker_duration_seconds: 900,
        consecutive_failures: 0,
        circuit_open_until: null,
        metadata: JSON.stringify({})
      },
      {
        id: 2,
        public_id: 'sub_disabled',
        name: 'Disabled Subscription',
        target_url: 'https://example.com/disabled',
        enabled: 0,
        event_types: JSON.stringify(['course.created']),
        static_headers: JSON.stringify({}),
        signing_secret: 'secret-disabled',
        delivery_timeout_ms: 5000,
        max_attempts: 3,
        retry_backoff_seconds: 60,
        circuit_breaker_threshold: 5,
        circuit_breaker_duration_seconds: 900,
        consecutive_failures: 0,
        circuit_open_until: null,
        metadata: JSON.stringify({})
      },
      {
        id: 3,
        public_id: 'sub_circuit',
        name: 'Circuit Open',
        target_url: 'https://example.com/circuit',
        enabled: 1,
        event_types: JSON.stringify(['course.created']),
        static_headers: JSON.stringify({}),
        signing_secret: 'secret-circuit',
        delivery_timeout_ms: 5000,
        max_attempts: 3,
        retry_backoff_seconds: 60,
        circuit_breaker_threshold: 1,
        circuit_breaker_duration_seconds: 900,
        consecutive_failures: 2,
        circuit_open_until: new Date('2024-01-02T00:00:00.000Z'),
        metadata: JSON.stringify({})
      },
      {
        id: 4,
        public_id: 'sub_wildcard',
        name: 'Wildcard Listener',
        target_url: 'https://example.com/wildcard',
        enabled: 1,
        event_types: null,
        static_headers: JSON.stringify({}),
        signing_secret: 'secret-wildcard',
        delivery_timeout_ms: 5000,
        max_attempts: 3,
        retry_backoff_seconds: 60,
        circuit_breaker_threshold: 0,
        circuit_breaker_duration_seconds: 0,
        consecutive_failures: 0,
        circuit_open_until: null,
        metadata: JSON.stringify({})
      }
    ]);

    const subscriptions = await IntegrationWebhookSubscriptionModel.findForEvent(
      'course.created',
      connection
    );

    expect(subscriptions.map((sub) => sub.publicId)).toEqual(['sub_live', 'sub_wildcard']);
    expect(subscriptions.every((sub) => sub.enabled)).toBe(true);
    expect(subscriptions.some((sub) => sub.publicId === 'sub_circuit')).toBe(false);
  });

  it('treats empty event type configuration as catch-all', async () => {
    const connection = createKnexMock([
      {
        id: 10,
        public_id: 'sub_empty',
        name: 'No Events',
        target_url: 'https://example.com/no-events',
        enabled: 1,
        event_types: JSON.stringify([]),
        static_headers: JSON.stringify({}),
        signing_secret: 'secret-empty',
        delivery_timeout_ms: 5000,
        max_attempts: 3,
        retry_backoff_seconds: 60,
        circuit_breaker_threshold: 0,
        circuit_breaker_duration_seconds: 0,
        consecutive_failures: 0,
        circuit_open_until: null,
        metadata: JSON.stringify({})
      }
    ]);

    const subscriptions = await IntegrationWebhookSubscriptionModel.findForEvent(
      'analytics.reported',
      connection
    );

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].publicId).toBe('sub_empty');
  });
});
