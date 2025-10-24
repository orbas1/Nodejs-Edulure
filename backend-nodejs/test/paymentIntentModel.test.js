import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/DataEncryptionService.js', () => ({
  default: {
    encryptStructured: vi.fn(() => ({
      ciphertext: null,
      hash: 'hash',
      classificationTag: 'payment.intent',
      keyId: 'key-1'
    })),
    decryptStructured: vi.fn(() => ({})),
    hash: vi.fn(() => 'hash'),
    fingerprint: vi.fn(() => 'hash')
  }
}));

import PaymentIntentModel from '../src/models/PaymentIntentModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('PaymentIntentModel', () => {
  it('normalises status updates and records transitions', async () => {
    const connection = createMockConnection({
      payment_intents: [
        {
          id: 7,
          public_id: 'pi_123',
          user_id: 2,
          provider: 'stripe',
          provider_intent_id: 'pi_legacy',
          provider_capture_id: null,
          provider_latest_charge_id: null,
          status: 'processing',
          currency: 'USD',
          amount_subtotal: 1000,
          amount_discount: 0,
          amount_tax: 0,
          amount_total: 1000,
          amount_refunded: 0,
          tax_breakdown: '{}',
          metadata: '{}',
          coupon_id: null,
          entity_type: 'donation',
          entity_id: 'dn_1',
          receipt_email: null,
          captured_at: null,
          canceled_at: null,
          expires_at: null,
          failure_code: null,
          failure_message: null,
          sensitive_details_ciphertext: null,
          sensitive_details_hash: null,
          classification_tag: null,
          encryption_key_version: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ],
      payment_intent_status_transitions: []
    });

    const updated = await PaymentIntentModel.updateById(
      7,
      {
        status: 'SUCCEEDED',
        statusReason: 'auto-capture',
        statusMetadata: { capture: true },
        statusChangedBy: 98
      },
      connection
    );

    expect(updated.status).toBe('succeeded');

    const [intentRow] = connection.__getRows('payment_intents');
    expect(intentRow.status).toBe('succeeded');

    const transitions = connection.__getRows('payment_intent_status_transitions');
    expect(transitions).toHaveLength(1);
    expect(transitions[0].to_status).toBe('succeeded');
    expect(transitions[0].reason).toBe('auto-capture');
    expect(JSON.parse(transitions[0].metadata)).toEqual({ capture: true });
    expect(transitions[0].changed_by).toBe(98);
  });
});
