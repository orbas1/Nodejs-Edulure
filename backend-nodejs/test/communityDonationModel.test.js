import { describe, expect, it } from 'vitest';

import CommunityDonationModel from '../src/models/CommunityDonationModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityDonationModel', () => {
  it('creates donations with enforced validation and metadata safety', async () => {
    const connection = createMockConnection({ community_donations: [] });

    const donation = await CommunityDonationModel.create(
      {
        communityId: 4,
        paymentIntentId: 12,
        amountCents: 5_500,
        currency: 'usd',
        referralCode: ' spring-2024 ',
        donorName: '  Ada Lovelace  ',
        metadata: { source: 'livestream' }
      },
      connection
    );

    expect(donation.currency).toBe('USD');
    expect(donation.status).toBe('pending');
    expect(donation.referralCode).toBe('SPRING-2024');
    expect(donation.metadata).toEqual({ source: 'livestream' });

    const rows = connection.__getRows('community_donations');
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata).toBe('{"source":"livestream"}');
  });

  it('updates donation fields while preserving JSON integrity', async () => {
    const connection = createMockConnection({
      community_donations: [
        {
          id: 7,
          community_id: 9,
          payment_intent_id: 21,
          amount_cents: 2500,
          currency: 'USD',
          status: 'pending',
          metadata: '{}'
        }
      ]
    });

    const updated = await CommunityDonationModel.updateById(
      7,
      {
        status: 'succeeded',
        message: 'Thank you!',
        metadata: '{"note":"processed"}'
      },
      connection
    );

    expect(updated.status).toBe('succeeded');
    expect(updated.message).toBe('Thank you!');
    expect(updated.metadata).toEqual({ note: 'processed' });
  });

  it('lists community donations with bounded pagination and status filtering', async () => {
    const connection = createMockConnection({
      community_donations: [
        { id: 1, community_id: 5, payment_intent_id: 1, amount_cents: 100, currency: 'USD', status: 'pending', metadata: '{}' },
        { id: 2, community_id: 5, payment_intent_id: 2, amount_cents: 200, currency: 'USD', status: 'succeeded', metadata: '{}' },
        { id: 3, community_id: 5, payment_intent_id: 3, amount_cents: 300, currency: 'USD', status: 'succeeded', metadata: '{}' }
      ]
    });

    const results = await CommunityDonationModel.listByCommunity(
      5,
      { status: 'SUCCEEDED', limit: 500, offset: -10 },
      connection
    );

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('succeeded');
  });
});

