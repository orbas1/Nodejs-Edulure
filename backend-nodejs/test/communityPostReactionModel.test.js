import { describe, expect, it } from 'vitest';

import CommunityPostReactionModel from '../src/models/CommunityPostReactionModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityPostReactionModel', () => {
  it('refreshes aggregated reaction summaries after toggles', async () => {
    const connection = createMockConnection({
      community_post_reactions: [],
      community_posts: [
        {
          id: 10,
          community_id: 5,
          author_id: 2,
          post_type: 'update',
          title: 'Weekly update',
          body: 'Notes',
          tags: '[]',
          visibility: 'members',
          status: 'published',
          moderation_state: 'clean',
          moderation_metadata: '{}',
          reaction_summary: '{}',
          preview_metadata: '{}',
          metadata: '{}',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
    });

    const firstToggle = await CommunityPostReactionModel.toggle(
      { postId: 10, userId: 22, reaction: '🔥' },
      connection
    );

    expect(firstToggle.active).toBe(true);
    expect(firstToggle.summary).toEqual({ '🔥': 1 });

    const rowsAfterAdd = connection.__getRows('community_posts');
    expect(JSON.parse(rowsAfterAdd[0].reaction_summary)).toEqual({ '🔥': 1, total: 1 });

    const secondToggle = await CommunityPostReactionModel.toggle(
      { postId: 10, userId: 22, reaction: '🔥' },
      connection
    );

    expect(secondToggle.active).toBe(false);
    expect(secondToggle.summary).toEqual({});

    const rowsAfterRemove = connection.__getRows('community_posts');
    expect(JSON.parse(rowsAfterRemove[0].reaction_summary)).toEqual({ total: 0 });
  });
});
