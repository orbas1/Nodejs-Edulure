import { describe, expect, it } from 'vitest';

import CommunityChannelModel from '../src/models/CommunityChannelModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityChannelModel', () => {
  it('creates channels with validated payloads', async () => {
    const connection = createMockConnection({ community_channels: [] });

    const channel = await CommunityChannelModel.create(
      {
        communityId: 3,
        name: 'General Chat',
        slug: ' general chat ',
        channelType: 'ANNOUNCEMENTS',
        metadata: { visibility: 'public' },
        isDefault: 'true'
      },
      connection
    );

    expect(channel.slug).toBe('general-chat');
    expect(channel.channelType).toBe('announcements');
    expect(channel.metadata).toEqual({ visibility: 'public' });

    const rows = connection.__getRows('community_channels');
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata).toBe('{"visibility":"public"}');
  });

  it('updates channel metadata and flags safely', async () => {
    const connection = createMockConnection({
      community_channels: [
        {
          id: 1,
          community_id: 3,
          name: 'General',
          slug: 'general',
          channel_type: 'general',
          description: null,
          is_default: 0,
          metadata: '{}',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ]
    });

    const updated = await CommunityChannelModel.update(
      1,
      { description: 'Welcome!', isDefault: true, metadata: { pinned: true } },
      connection
    );

    expect(updated.description).toBe('Welcome!');
    expect(updated.isDefault).toBe(true);
    expect(updated.metadata).toEqual({ pinned: true });
  });

  it('lists community channels ordered by default flag then name', async () => {
    const connection = createMockConnection({
      community_channels: [
        {
          id: 1,
          community_id: 9,
          name: 'Events',
          slug: 'events',
          channel_type: 'events',
          is_default: 0,
          metadata: '{}'
        },
        {
          id: 2,
          community_id: 9,
          name: 'General',
          slug: 'general',
          channel_type: 'general',
          is_default: 1,
          metadata: '{}'
        }
      ]
    });

    const channels = await CommunityChannelModel.listByCommunity(9, connection);
    expect(channels[0].isDefault).toBe(true);
    expect(channels[0].name).toBe('General');
  });
});
