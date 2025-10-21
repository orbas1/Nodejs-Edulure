import { describe, expect, it } from 'vitest';

import CommunityMemberPointModel from '../src/models/CommunityMemberPointModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityMemberPointModel', () => {
  it('saves summaries with tier validation and metadata safety', async () => {
    const connection = createMockConnection({ community_member_points: [] });

    const summary = await CommunityMemberPointModel.saveSummary(
      {
        communityId: 4,
        userId: 7,
        points: 120,
        lifetimePoints: 320,
        tier: 'Gold',
        metadata: { streak: 5 }
      },
      connection
    );

    expect(summary.tier).toBe('gold');
    expect(summary.metadata).toEqual({ streak: 5 });

    const rows = connection.__getRows('community_member_points');
    expect(rows[0].metadata).toBe('{"streak":5}');
  });

  it('lists top members by points with bounded pagination', async () => {
    const connection = createMockConnection({
      community_member_points: [
        { id: 1, community_id: 3, user_id: 1, points: 50, lifetime_points: 100, tier: 'silver', metadata: '{}' },
        { id: 2, community_id: 3, user_id: 2, points: 80, lifetime_points: 90, tier: 'gold', metadata: '{}' }
      ]
    });

    const leaderboard = await CommunityMemberPointModel.listTopByPoints(3, { limit: 500 }, connection);
    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0].userId).toBe(2);
  });
});

