import { describe, expect, it } from 'vitest';

import CommunityAffiliateModel from '../src/models/CommunityAffiliateModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityAffiliateModel', () => {
  it('creates affiliates with validated payloads', async () => {
    const connection = createMockConnection({ community_affiliates: [] });

    const affiliate = await CommunityAffiliateModel.create(
      {
        communityId: 10,
        userId: 42,
        status: 'APPROVED',
        referralCode: 'growth-2024',
        commissionRateBasisPoints: '300',
        metadata: { tier: 'gold' }
      },
      connection
    );

    expect(affiliate.status).toBe('approved');
    expect(affiliate.referralCode).toBe('GROWTH-2024');
    expect(affiliate.metadata).toEqual({ tier: 'gold' });

    const stored = connection.__getRows('community_affiliates')[0];
    expect(stored.metadata).toBe('{"tier":"gold"}');
    expect(stored.commission_rate_bps).toBe(300);
  });

  it('updates affiliate details safely', async () => {
    const connection = createMockConnection({
      community_affiliates: [
        {
          id: 1,
          community_id: 1,
          user_id: 2,
          status: 'pending',
          referral_code: 'CODE-1',
          commission_rate_bps: 250,
          total_earned_cents: 0,
          total_paid_cents: 0,
          metadata: '{}',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]
    });

    const updated = await CommunityAffiliateModel.updateById(
      1,
      {
        status: 'approved',
        referralCode: 'code-2',
        totalEarnedCents: 5000,
        metadata: { tier: 'silver' }
      },
      connection
    );

    expect(updated.status).toBe('approved');
    expect(updated.referralCode).toBe('CODE-2');
    expect(updated.totalEarnedCents).toBe(5000);
    expect(updated.metadata).toEqual({ tier: 'silver' });
  });

  it('increments earnings while preventing negative values', async () => {
    const connection = createMockConnection({
      community_affiliates: [
        {
          id: 1,
          community_id: 1,
          user_id: 2,
          status: 'approved',
          referral_code: 'CODE-1',
          commission_rate_bps: 250,
          total_earned_cents: 100,
          total_paid_cents: 0,
          metadata: '{}'
        }
      ]
    });

    const updated = await CommunityAffiliateModel.incrementEarnings(
      1,
      { amountEarnedCents: 50, amountPaidCents: 20 },
      connection
    );

    expect(updated.totalEarnedCents).toBe(150);
    expect(updated.totalPaidCents).toBe(20);
  });

  it('rejects invalid increment values', async () => {
    const connection = createMockConnection({
      community_affiliates: [
        { id: 1, community_id: 1, user_id: 2, status: 'approved', referral_code: 'CODE-1', metadata: '{}' }
      ]
    });

    await expect(
      CommunityAffiliateModel.incrementEarnings(1, { amountEarnedCents: -10 }, connection)
    ).rejects.toThrow(/amountEarnedCents/i);
  });

  it('filters by community and status', async () => {
    const connection = createMockConnection({
      community_affiliates: [
        { id: 1, community_id: 7, user_id: 2, status: 'approved', referral_code: 'A', metadata: '{}' },
        { id: 2, community_id: 7, user_id: 3, status: 'pending', referral_code: 'B', metadata: '{}' }
      ]
    });

    const affiliates = await CommunityAffiliateModel.listByCommunity(7, { status: 'approved' }, connection);
    expect(affiliates).toHaveLength(1);
    expect(affiliates[0].status).toBe('approved');
  });
});
