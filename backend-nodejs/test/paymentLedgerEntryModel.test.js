import { describe, expect, it, vi } from 'vitest';

import PaymentLedgerEntryModel from '../src/models/PaymentLedgerEntryModel.js';

function createConnectionMock() {
  let storedPayload = null;
  const query = {
    insert: vi.fn(async (payload) => {
      storedPayload = payload;
      return [99];
    }),
    select: vi.fn(function () {
      return this;
    }),
    where: vi.fn(function () {
      return this;
    }),
    first: vi.fn(async () => {
      if (!storedPayload) {
        return null;
      }
      return {
        id: 99,
        paymentIntentId: storedPayload.payment_intent_id,
        entryType: storedPayload.entry_type,
        amountCents: storedPayload.amount_cents,
        currency: storedPayload.currency,
        details: storedPayload.details,
        recordedAt: storedPayload.recorded_at ?? '2024-01-01T00:00:00.000Z'
      };
    })
  };

  const connection = (tableName) => {
    expect(tableName).toBe('payment_ledger_entries');
    return query;
  };
  connection.fn = { now: vi.fn(() => '2024-01-01T00:00:00.000Z') };
  connection.__query = query;
  connection.__getStoredPayload = () => storedPayload;
  return connection;
}

describe('PaymentLedgerEntryModel.record', () => {
  it('sanitizes ledger payloads before persisting', async () => {
    const connection = createConnectionMock();

    const result = await PaymentLedgerEntryModel.record(
      {
        paymentIntentId: 'pi_123',
        entryType: 'Charge / Manual',
        amountCents: '1250.7',
        currency: 'gb p',
        details: {
          reference: 'INV-123',
          audit: ['initial', 'provider'],
          ignored: () => 'noop'
        }
      },
      connection
    );

    expect(connection.__query.insert).toHaveBeenCalledTimes(1);
    expect(connection.__getStoredPayload()).toMatchObject({
      payment_intent_id: 'pi_123',
      entry_type: 'charge---manual',
      amount_cents: 1251,
      currency: 'GBP'
    });
    expect(result).toMatchObject({
      paymentIntentId: 'pi_123',
      entryType: 'charge---manual',
      amountCents: 1251,
      currency: 'GBP'
    });
    expect(result.details).toMatchObject({
      reference: 'INV-123',
      audit: ['initial', 'provider'],
      currency: 'GBP',
      entryType: 'charge---manual'
    });
    expect(result.details.ignored).toBeUndefined();
  });

  it('throws when paymentIntentId is missing', async () => {
    const connection = createConnectionMock();
    await expect(PaymentLedgerEntryModel.record({}, connection)).rejects.toThrow(
      'paymentIntentId'
    );
  });
});
