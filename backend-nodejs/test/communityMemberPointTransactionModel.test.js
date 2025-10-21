import { describe, expect, it } from 'vitest';

import CommunityMemberPointTransactionModel from '../src/models/CommunityMemberPointTransactionModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityMemberPointTransactionModel', () => {
  it('creates transactions with validated payloads and metadata', async () => {
    const connection = createMockConnection({ community_member_point_transactions: [] });

    const transaction = await CommunityMemberPointTransactionModel.create(
      {
        communityId: 8,
        userId: 2,
        awardedBy: 1,
        deltaPoints: 40,
        balanceAfter: 140,
        reason: 'Completed challenge',
        metadata: { campaign: 'spring-24' }
      },
      connection
    );

    expect(transaction.reason).toBe('Completed challenge');
    expect(transaction.metadata).toEqual({ campaign: 'spring-24' });

    const rows = connection.__getRows('community_member_point_transactions');
    expect(rows[0].metadata).toBe('{"campaign":"spring-24"}');
  });

  it('lists recent transactions with safe limits and ordering', async () => {
    const connection = createMockConnection({
      community_member_point_transactions: [
        {
          id: 1,
          community_id: 9,
          user_id: 4,
          delta_points: 10,
          balance_after: 110,
          reason: 'Bonus',
          source: 'manual',
          awarded_at: '2024-05-02T09:00:00Z',
          metadata: '{}'
        },
        {
          id: 2,
          community_id: 9,
          user_id: 4,
          delta_points: -5,
          balance_after: 105,
          reason: 'Adjustment',
          source: 'system',
          awarded_at: '2024-05-02T10:00:00Z',
          metadata: '{}'
        }
      ]
    });

    const transactions = await CommunityMemberPointTransactionModel.listRecentForUser(
      9,
      4,
      { limit: 1 },
      connection
    );

    expect(transactions).toHaveLength(1);
    expect(transactions[0].reason).toBe('Adjustment');
  });
});

