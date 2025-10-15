import { describe, it, expect, beforeEach } from 'vitest';

import { ChangeDataCaptureService } from '../src/services/ChangeDataCaptureService.js';

function createFakeConnection() {
  const rows = [];

  function matches(row, conditions) {
    return Object.entries(conditions).every(([key, value]) => row[key] === value);
  }

  function builder() {
    return {
      insert: async (payload) => {
        const record = { id: rows.length + 1, ...payload };
        rows.push(record);
        return [record.id];
      },
      where(conditions) {
        return {
          async update(changes) {
            rows.forEach((row, index) => {
              if (matches(row, conditions)) {
                const next = { ...row };
                if (Object.prototype.hasOwnProperty.call(changes, 'retry_count')) {
                  const retryChange = changes.retry_count;
                  if (retryChange && typeof retryChange === 'object' && retryChange.sql?.includes('retry_count + 1')) {
                    next.retry_count = (next.retry_count ?? 0) + 1;
                  } else {
                    next.retry_count = retryChange;
                  }
                }

                if (Object.prototype.hasOwnProperty.call(changes, 'status')) {
                  next.status = changes.status;
                }

                if (Object.prototype.hasOwnProperty.call(changes, 'error_message')) {
                  next.error_message = changes.error_message;
                }

                if (Object.prototype.hasOwnProperty.call(changes, 'next_attempt_at')) {
                  next.next_attempt_at = changes.next_attempt_at;
                }

                if (Object.prototype.hasOwnProperty.call(changes, 'last_attempt_at')) {
                  next.last_attempt_at = changes.last_attempt_at;
                }

                rows[index] = next;
              }
            });
            return 1;
          },
          async first() {
            return rows.find((row) => matches(row, conditions));
          }
        };
      }
    };
  }

  const connection = () => builder();
  connection.fn = { now: () => new Date() };
  connection.raw = (sql, bindings) => ({ sql, bindings });

  return { connection, rows };
}

describe('ChangeDataCaptureService', () => {
  let fake;
  let service;

  beforeEach(() => {
    fake = createFakeConnection();
    service = new ChangeDataCaptureService({ connection: fake.connection });
  });

  it('records CDC events with normalized payloads', async () => {
    const event = await service.recordEvent({
      entityName: 'test_entity',
      entityId: 42,
      operation: 'delete',
      payload: { foo: 'bar' }
    });

    expect(event).toMatchObject({
      entity_name: 'test_entity',
      entity_id: '42',
      operation: 'DELETE',
      payload: { foo: 'bar' }
    });
    expect(fake.rows).toHaveLength(1);
  });

  it('marks failures and schedules retries', async () => {
    const event = await service.recordEvent({
      entityName: 'test_entity',
      entityId: 'abc',
      operation: 'archive'
    });

    await service.markFailed(event.id, new Error('network'));

    const stored = fake.rows.find((row) => row.id === event.id);
    expect(stored.status).toBe('pending');
    expect(stored.error_message).toContain('network');
    expect(stored.retry_count).toBe(1);
  });
});
