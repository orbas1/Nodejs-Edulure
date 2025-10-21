import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/DataEncryptionService.js', () => {
  const encryptStructured = vi.fn(() => ({
    ciphertext: 'cipher-text',
    hash: 'hash-value',
    classificationTag: 'payout.affiliate',
    keyId: 'v1'
  }));
  const decryptStructured = vi.fn(() => ({ payoutReference: 'REF-OLD', failureReason: null }));
  const hash = vi.fn((value) => `hashed-${value}`);
  return {
    default: {
      encryptStructured,
      decryptStructured,
      hash
    }
  };
});

import CommunityAffiliatePayoutModel from '../src/models/CommunityAffiliatePayoutModel.js';
import { createMockConnection } from './support/mockDb.js';

import DataEncryptionService from '../src/services/DataEncryptionService.js';

describe('CommunityAffiliatePayoutModel', () => {
  beforeEach(() => {
    DataEncryptionService.encryptStructured.mockClear();
    DataEncryptionService.decryptStructured.mockClear();
    DataEncryptionService.hash.mockClear();
  });

  it('creates payouts with sanitised metadata and status', async () => {
    const connection = createMockConnection({ community_affiliate_payouts: [] });

    const payout = await CommunityAffiliatePayoutModel.create(
      {
        affiliateId: 5,
        amountCents: '7500',
        status: 'PROCESSING',
        payoutReference: 'ref-123',
        metadata: { invoiceId: 'INV-1' }
      },
      connection
    );

    expect(payout.status).toBe('processing');
    expect(payout.amountCents).toBe(7500);
    expect(payout.metadata).toEqual({ invoiceId: 'INV-1' });

    const stored = connection.__getRows('community_affiliate_payouts')[0];
    expect(stored.metadata).toBe('{"invoiceId":"INV-1"}');
    expect(stored.amount_cents).toBe(7500);
    expect(DataEncryptionService.encryptStructured).toHaveBeenCalled();
  });

  it('updates payout status and metadata safely', async () => {
    const connection = createMockConnection({
      community_affiliate_payouts: [
        {
          id: 1,
          affiliate_id: 5,
          amount_cents: 5000,
          status: 'pending',
          payout_reference: 'hashed-old',
          failure_reason: null,
          metadata: '{}',
          disbursement_payload_ciphertext: 'cipher',
          disbursement_payload_hash: 'hash-value',
          classification_tag: 'payout.affiliate',
          encryption_key_version: 'v1'
        }
      ]
    });

    DataEncryptionService.decryptStructured
      .mockImplementationOnce(() => ({ payoutReference: 'REF-OLD', failureReason: null }))
      .mockImplementationOnce(() => ({ payoutReference: 'REF-NEW', failureReason: null }));

    const updated = await CommunityAffiliatePayoutModel.updateStatus(
      1,
      {
        status: 'completed',
        metadata: { invoiceId: 'INV-2' },
        payoutReference: 'REF-NEW',
        processedAt: '2024-01-02T00:00:00.000Z'
      },
      connection
    );

    expect(updated.status).toBe('completed');
    expect(updated.payoutReference).toBe('REF-NEW');
    expect(updated.metadata).toEqual({ invoiceId: 'INV-2' });
    expect(DataEncryptionService.decryptStructured).toHaveBeenCalled();
  });
});
