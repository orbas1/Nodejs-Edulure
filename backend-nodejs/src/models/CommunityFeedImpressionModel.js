import db from '../config/database.js';

const TABLE = 'community_feed_impressions';

function clampNumber(value, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, fallback = 0 } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(numeric), min), max);
}

function normaliseDate(value, fallback = new Date()) {
  if (!value) {
    return fallback;
  }
  const candidate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(candidate.getTime())) {
    return fallback;
  }
  return candidate;
}

function normaliseTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }
  const seen = new Set();
  return tags
    .map((tag) => String(tag ?? '').trim())
    .filter((tag) => {
      if (!tag) return false;
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

export default class CommunityFeedImpressionModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async record(
    { communityId, experimentId, actorId, momentumScore, postsSampled, trendingTags, rangeStart, rangeEnd },
    connection = db
  ) {
    if (!communityId) {
      throw new Error('communityId is required to record a feed impression');
    }

    const startAt = normaliseDate(rangeStart);
    const endAt = normaliseDate(rangeEnd, startAt);
    const payload = {
      community_id: Number(communityId),
      experiment_id: experimentId ? Number(experimentId) : null,
      actor_id: actorId ? Number(actorId) : null,
      momentum_score: clampNumber(momentumScore, { min: 0, max: 100, fallback: 0 }),
      posts_sampled: clampNumber(postsSampled, { min: 0, max: 10_000, fallback: 0 }),
      trending_tags: JSON.stringify(normaliseTags(trendingTags)),
      range_start: startAt,
      range_end: endAt
    };

    const [id] = await this.table(connection).insert(payload);
    return id;
  }

  static async listRecentForCommunity(communityId, { limit = 20 } = {}, connection = db) {
    if (!communityId) {
      return [];
    }

    const rows = await this.table(connection)
      .select([
        'id',
        'community_id as communityId',
        'experiment_id as experimentId',
        'actor_id as actorId',
        'momentum_score as momentumScore',
        'posts_sampled as postsSampled',
        'trending_tags as trendingTags',
        'range_start as rangeStart',
        'range_end as rangeEnd',
        'recorded_at as recordedAt'
      ])
      .where({ community_id: Number(communityId) })
      .orderBy('recorded_at', 'desc')
      .limit(Math.min(Math.max(Number(limit) || 20, 1), 200));

    return rows.map((row) => {
      let parsedTags = [];
      if (typeof row.trendingTags === 'string') {
        try {
          parsedTags = JSON.parse(row.trendingTags);
        } catch (_error) {
          parsedTags = [];
        }
      } else if (Array.isArray(row.trendingTags)) {
        parsedTags = row.trendingTags;
      }

      return {
        ...row,
        trendingTags: normaliseTags(parsedTags)
      };
    });
  }
}
