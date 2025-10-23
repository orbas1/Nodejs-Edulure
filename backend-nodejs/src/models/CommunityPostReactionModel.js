import db from '../config/database.js';

const TABLE = 'community_post_reactions';

function normaliseReaction(value) {
  if (!value) return null;
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '');
}

export default class CommunityPostReactionModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async toggle({ postId, userId, reaction, metadata }, connection = db) {
    const reactionKey = normaliseReaction(reaction);
    if (!reactionKey) {
      throw new Error('Reaction is required');
    }
    if (!postId || !userId) {
      throw new Error('postId and userId are required');
    }

    const existing = await this.table(connection)
      .where({ post_id: Number(postId), user_id: Number(userId), reaction: reactionKey })
      .first();

    if (existing) {
      await this.table(connection)
        .where({ id: existing.id })
        .del();
      return { active: false, reaction: reactionKey };
    }

    const payload = {
      post_id: Number(postId),
      user_id: Number(userId),
      reaction: reactionKey,
      metadata: JSON.stringify(metadata ?? {}),
      reacted_at: connection.fn.now(),
      updated_at: connection.fn.now()
    };
    await this.table(connection).insert(payload).onConflict(['post_id', 'user_id', 'reaction']).ignore();
    return { active: true, reaction: reactionKey };
  }

  static async summarise(postId, connection = db) {
    if (!postId) {
      return {};
    }

    const rows = await this.table(connection)
      .select('reaction')
      .count({ count: '*' })
      .where({ post_id: Number(postId) })
      .groupBy('reaction');

    return rows.reduce((summary, row) => {
      const key = normaliseReaction(row.reaction);
      if (!key) return summary;
      const count = Number(row.count ?? 0);
      // eslint-disable-next-line no-param-reassign
      summary[key] = count;
      return summary;
    }, {});
  }

  static async listForPosts(postIds, userId, connection = db) {
    if (!Array.isArray(postIds) || !postIds.length || !userId) {
      return new Map();
    }

    const uniqueIds = Array.from(new Set(postIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))));
    if (!uniqueIds.length) {
      return new Map();
    }

    const rows = await this.table(connection)
      .select(['post_id as postId', 'reaction'])
      .whereIn('post_id', uniqueIds)
      .andWhere('user_id', Number(userId));

    const result = new Map();
    for (const row of rows) {
      const postId = Number(row.postId);
      if (!result.has(postId)) {
        result.set(postId, new Set());
      }
      const set = result.get(postId);
      set.add(normaliseReaction(row.reaction));
    }
    return result;
  }
}
