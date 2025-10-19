import db from '../config/database.js';

function normaliseDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function normaliseNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toDateRange({ start, end }) {
  return [normaliseDate(start), normaliseDate(end)];
}

const TABLE = 'reporting_community_engagement_daily';

export default class ReportingCommunityEngagementDailyView {
  static async fetchDailySummaries({ start, end }, connection = db) {
    const [startDate, endDate] = toDateRange({ start, end });
    if (!startDate || !endDate) {
      return [];
    }

    const rows = await connection(TABLE)
      .select([
        'reporting_date as date',
        connection.raw('SUM(published_posts) as posts'),
        connection.raw('SUM(comment_count) as comments'),
        connection.raw('SUM(tag_applications) as tags'),
        connection.raw('SUM(public_posts) as public_posts'),
        connection.raw('SUM(event_posts) as event_posts')
      ])
      .whereBetween('reporting_date', [startDate, endDate])
      .groupBy('reporting_date')
      .orderBy('reporting_date', 'asc');

    return rows.map((row) => ({
      date: normaliseDate(row.date),
      posts: normaliseNumber(row.posts),
      comments: normaliseNumber(row.comments),
      tags: normaliseNumber(row.tags),
      publicPosts: normaliseNumber(row.public_posts),
      eventPosts: normaliseNumber(row.event_posts)
    }));
  }

  static async fetchTopCommunities({ start, end, limit = 5 }, connection = db) {
    const [startDate, endDate] = toDateRange({ start, end });
    if (!startDate || !endDate) {
      return [];
    }

    const rows = await connection(`${TABLE} as rc`)
      .leftJoin('communities as c', 'rc.community_id', 'c.id')
      .select([
        'rc.community_id as communityId',
        'c.name as communityName',
        connection.raw('SUM(rc.published_posts) as posts'),
        connection.raw('SUM(rc.comment_count) as comments'),
        connection.raw('SUM(rc.public_posts) as public_posts'),
        connection.raw('SUM(rc.event_posts) as event_posts')
      ])
      .whereBetween('rc.reporting_date', [startDate, endDate])
      .groupBy('rc.community_id', 'c.name')
      .orderBy([{ column: 'posts', order: 'desc' }, { column: 'comments', order: 'desc' }])
      .limit(limit);

    return rows.map((row) => ({
      communityId: row.communityId,
      name: row.communityName ?? `Community ${row.communityId}`,
      posts: normaliseNumber(row.posts),
      comments: normaliseNumber(row.comments),
      publicPosts: normaliseNumber(row.public_posts),
      eventPosts: normaliseNumber(row.event_posts)
    }));
  }

  static async fetchTotals({ start, end }, connection = db) {
    const [startDate, endDate] = toDateRange({ start, end });
    if (!startDate || !endDate) {
      return {
        posts: 0,
        comments: 0,
        tags: 0,
        publicPosts: 0,
        eventPosts: 0
      };
    }

    const row = await connection(TABLE)
      .select([
        connection.raw('SUM(published_posts) as posts'),
        connection.raw('SUM(comment_count) as comments'),
        connection.raw('SUM(tag_applications) as tags'),
        connection.raw('SUM(public_posts) as public_posts'),
        connection.raw('SUM(event_posts) as event_posts')
      ])
      .whereBetween('reporting_date', [startDate, endDate])
      .first();

    return {
      posts: normaliseNumber(row?.posts),
      comments: normaliseNumber(row?.comments),
      tags: normaliseNumber(row?.tags),
      publicPosts: normaliseNumber(row?.public_posts),
      eventPosts: normaliseNumber(row?.event_posts)
    };
  }
}

