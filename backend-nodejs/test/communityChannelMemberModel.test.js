import { describe, expect, it } from 'vitest';

import CommunityChannelMemberModel from '../src/models/CommunityChannelMemberModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityChannelMemberModel', () => {
  it('ensures membership with defaults and metadata', async () => {
    const connection = createMockConnection({ community_channel_members: [] });

    const member = await CommunityChannelMemberModel.ensureMembership(
      4,
      9,
      { role: 'MODERATOR', metadata: { notifications: 'digest' }, notificationsEnabled: 'false' },
      connection
    );

    expect(member.role).toBe('moderator');
    expect(member.notificationsEnabled).toBe(false);
    expect(member.metadata).toEqual({ notifications: 'digest' });

    const rows = connection.__getRows('community_channel_members');
    expect(rows[0].metadata).toBe('{"notifications":"digest"}');
  });

  it('updates membership preferences and role', async () => {
    const connection = createMockConnection({
      community_channel_members: [
        {
          id: 1,
          channel_id: 4,
          user_id: 9,
          role: 'member',
          notifications_enabled: 1,
          metadata: '{}'
        }
      ]
    });

    const member = await CommunityChannelMemberModel.updateMembership(
      4,
      9,
      { role: 'moderator', notificationsEnabled: false, muteUntil: '2024-01-05T00:00:00.000Z' },
      connection
    );

    expect(member.role).toBe('moderator');
    expect(member.notificationsEnabled).toBe(false);
    expect(member.muteUntil).toBe('2024-01-05T00:00:00.000Z');
  });

  it('lists memberships for a user including community context', async () => {
    const connection = createMockConnection({
      community_channel_members: [
        {
          id: 1,
          channel_id: 4,
          user_id: 9,
          role: 'member',
          notifications_enabled: 1,
          metadata: '{}'
        }
      ],
      community_channels: [
        { id: 4, community_id: 2, name: 'General', slug: 'general', channel_type: 'general', metadata: '{}' }
      ]
    });

    const memberships = await CommunityChannelMemberModel.listForUser(9, connection);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].communityId).toBe(2);
  });
});
