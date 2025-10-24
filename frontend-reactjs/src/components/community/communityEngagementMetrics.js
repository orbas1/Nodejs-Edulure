const CLUSTER_KEYWORDS = [
  {
    key: 'growth',
    label: 'Growth experiments',
    keywords: ['growth', 'revenue', 'experiment', 'pipeline', 'conversion']
  },
  {
    key: 'enablement',
    label: 'Enablement',
    keywords: ['enablement', 'onboarding', 'learning', 'curriculum', 'coaching']
  },
  {
    key: 'community',
    label: 'Community ops',
    keywords: ['community', 'moderation', 'steward', 'engagement']
  },
  {
    key: 'operations',
    label: 'Operations',
    keywords: ['operations', 'ops', 'delivery', 'execution']
  },
  {
    key: 'studio',
    label: 'Studio & media',
    keywords: ['studio', 'production', 'broadcast', 'media']
  }
];

const DEFAULT_CLUSTER = { key: 'general', label: 'General engagement', keywords: [] };

function normaliseString(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function extractTextTokens(member) {
  const tags = Array.isArray(member?.tags) ? member.tags : [];
  const role = member?.role ? [member.role] : [];
  const title = member?.title ? [member.title] : [];
  return [...tags, ...role, ...title]
    .filter(Boolean)
    .map((token) => normaliseString(String(token)));
}

function matchCluster(tokens) {
  if (!tokens.length) return DEFAULT_CLUSTER.key;
  for (const cluster of CLUSTER_KEYWORDS) {
    const matched = cluster.keywords.some((keyword) =>
      tokens.some((token) => token.includes(keyword))
    );
    if (matched) {
      return cluster.key;
    }
  }
  return DEFAULT_CLUSTER.key;
}

export function deriveMemberClusters(members = []) {
  const clusterMap = new Map(
    [DEFAULT_CLUSTER, ...CLUSTER_KEYWORDS].map((cluster) => [cluster.key, {
      key: cluster.key,
      label: cluster.label,
      members: 0,
      online: 0,
      recommended: 0,
      sampleMembers: []
    }])
  );

  members.forEach((member) => {
    if (!member) return;
    const tokens = extractTextTokens(member);
    const clusterKey = matchCluster(tokens);
    const entry = clusterMap.get(clusterKey) ?? clusterMap.get(DEFAULT_CLUSTER.key);
    entry.members += 1;
    if (member.isOnline) entry.online += 1;
    if (member.recommended) entry.recommended += 1;
    if (member.name && entry.sampleMembers.length < 3) {
      entry.sampleMembers.push(member.name);
    }
  });

  return Array.from(clusterMap.values())
    .filter((entry) => entry.members > 0)
    .sort((a, b) => b.members - a.members || a.label.localeCompare(b.label));
}

function sumDurations(items, field) {
  return items.reduce((total, item) => {
    const value = Number(item?.[field] ?? 0);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

function collectTrendingTags(feedItems = []) {
  const tagCounts = new Map();
  feedItems.forEach((item) => {
    const tags = Array.isArray(item?.tags) ? item.tags : [];
    tags.forEach((tag) => {
      const normalised = tag?.toString().trim();
      if (!normalised) return;
      const key = normalised.startsWith('#') ? normalised : `#${normalised}`;
      tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
    });
  });
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));
}

function countUpcomingEvents(events = [], windowDays = 7) {
  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  return events.filter((event) => {
    const start = event?.startsAt ?? event?.startAt ?? event?.start_date;
    if (!start) return false;
    const timestamp = new Date(start).getTime();
    if (Number.isNaN(timestamp)) return false;
    return timestamp >= now && timestamp <= now + windowMs;
  }).length;
}

export function computeCommunityEngagementMetrics({
  feed = [],
  liveClassrooms = [],
  recordedClassrooms = [],
  calendar = [],
  events = [],
  leaderboard = [],
  members = []
} = {}) {
  const liveMinutes = sumDurations(liveClassrooms, 'durationMinutes');
  const recordedMinutes = sumDurations(recordedClassrooms, 'durationMinutes');
  const upcomingEventsCount = countUpcomingEvents([...calendar, ...events]);
  const trendingTags = collectTrendingTags(feed);
  const topContributors = Array.isArray(leaderboard)
    ? leaderboard
        .slice()
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
        .slice(0, 3)
        .map((entry) => ({
          name: entry.name ?? entry.member ?? 'Member',
          points: entry.points ?? 0,
          role: entry.role ?? entry.title ?? ''
        }))
    : [];
  const clusterBreakdown = deriveMemberClusters(members);

  return {
    totals: {
      feedPosts: feed.length,
      liveSessions: liveClassrooms.length,
      recordedSessions: recordedClassrooms.length,
      calendarEvents: calendar.length,
      members: members.length
    },
    liveMinutes,
    recordedMinutes,
    upcomingEventsCount,
    trendingTags,
    topContributors,
    clusterBreakdown
  };
}
