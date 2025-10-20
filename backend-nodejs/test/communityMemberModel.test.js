import { describe, expect, it } from 'vitest';

import CommunityMemberModel from '../src/models/CommunityMemberModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityMemberModel', () => {
  it('creates members with defaults and persisted metadata', async () => {
    const connection = createMockConnection({ community_members: [] });

    const member = await CommunityMemberModel.create(
      {
        communityId: 12,
        userId: 33,
        metadata: { invitedBy: 5 }
      },
      connection
    );

    expect(member.role).toBe('member');
    expect(member.status).toBe('active');
    expect(member.metadata).toEqual({ invitedBy: 5 });

    const rows = connection.__getRows('community_members');
    expect(rows[0].metadata).toBe('{"invitedBy":5}');
  });

  it('updates status and manages leftAt timestamps', async () => {
    const connection = createMockConnection({
      community_members: [
        {
          id: 1,
          community_id: 3,
          user_id: 4,
          role: 'member',
          status: 'active',
          metadata: '{}'
        }
      ]
    });

    await CommunityMemberModel.updateStatus(3, 4, 'banned', connection);
    const afterLeave = await CommunityMemberModel.findMembership(3, 4, connection);
    expect(afterLeave.status).toBe('banned');
    expect(afterLeave.leftAt).not.toBeNull();

    const reactivated = await CommunityMemberModel.updateStatus(3, 4, 'active', connection);
    expect(reactivated.status).toBe('active');
    expect(reactivated.leftAt).toBeNull();
  });

  it('lists members with filters, pagination, and metadata search', async () => {
    const connection = createMockConnection({
      community_members: [
        {
          id: 1,
          community_id: 9,
          user_id: 1,
          role: 'admin',
          status: 'active',
          joined_at: '2024-03-01T09:00:00Z',
          metadata: '{"title":"Founder"}'
        },
        {
          id: 2,
          community_id: 9,
          user_id: 2,
          role: 'member',
          status: 'pending',
          joined_at: '2024-04-05T09:00:00Z',
          metadata: '{"title":"Mentor"}'
        },
        {
          id: 3,
          community_id: 9,
          user_id: 3,
          role: 'member',
          status: 'active',
          joined_at: '2024-02-15T09:00:00Z',
          metadata: '{"title":"Alumni"}'
        }
      ]
    });

    const members = await CommunityMemberModel.listByCommunity(
      9,
      {
        status: ['ACTIVE', 'PENDING'],
        role: ['MEMBER'],
        joinedAfter: '2024-03-01T00:00:00Z',
        search: 'mentor',
        limit: 2,
        offset: 0,
        order: 'DESC'
      },
      connection
    );

    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe(2);
    expect(members.total).toBe(1);
    expect(members.limit).toBe(2);
    expect(members.offset).toBe(0);
  });
});

