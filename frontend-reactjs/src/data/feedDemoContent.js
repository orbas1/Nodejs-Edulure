const now = Date.now();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const createPost = ({
  id,
  title,
  body,
  community,
  author,
  tags,
  minutesAgo,
  reactions,
  comments
}) => ({
  kind: 'post',
  post: {
    id,
    title,
    body,
    community,
    tags,
    publishedAt: new Date(now - minutesAgo * MINUTE).toISOString(),
    stats: {
      reactions,
      comments
    },
    author,
    moderation: { state: 'clean' },
    permissions: {
      canModerate: false,
      canRemove: false
    }
  }
});

export const DEMO_FEED_ITEMS = [
  createPost({
    id: 'demo-post-automation-rituals',
    title: 'Automation Guild shipped trust calibration rituals',
    body: 'Operators ran 42 async retrospectives this week to keep trust scores above 90. Templates and metrics are now live for all partners.',
    community: { id: 'automation-guild', name: 'Automation Guild' },
    author: {
      id: 'avery-chen',
      name: 'Avery Chen',
      role: 'Moderator · Automation Guild',
      avatarUrl: 'https://i.pravatar.cc/100?img=36'
    },
    tags: ['rituals', 'automation'],
    minutesAgo: 12,
    reactions: 428,
    comments: 38
  }),
  {
    kind: 'ad',
    ad: {
      placementId: 'demo-placement-hero',
      position: 1,
      headline: 'Promote your next cohort with Edulure Ads',
      description: 'Launch full-funnel placements across the Edulure network and attribute every cohort conversion.',
      advertiser: 'Edulure Ads Studio',
      objective: 'Acquisition boost',
      ctaUrl: 'https://edulure.com/ads',
      disclosure: 'Sponsored by Edulure Ads Studio'
    }
  },
  createPost({
    id: 'demo-post-revenue-pods',
    title: 'Revenue Pods closed their first async accelerator',
    body: 'Twelve operators shared ARR playbooks and shipped partner-ready onboarding journeys in under three weeks.',
    community: { id: 'revenue-pods', name: 'Revenue Pods Collective' },
    author: {
      id: 'mira-shah',
      name: 'Mira Shah',
      role: 'Founder · Revenue Pods',
      avatarUrl: 'https://i.pravatar.cc/100?img=8'
    },
    tags: ['growth', 'launch'],
    minutesAgo: 47,
    reactions: 312,
    comments: 52
  }),
  createPost({
    id: 'demo-post-ama',
    title: 'Investor AMA replay and transcript published',
    body: 'Sequoia Arc mentors unpacked diligence signals for community-led courses. The annotated replay is available for all verified instructors.',
    community: { id: 'investor-ama', name: 'Investor AMAs' },
    author: {
      id: 'leo-okafor',
      name: 'Leo Okafor',
      role: 'Instructor Programs',
      avatarUrl: 'https://i.pravatar.cc/100?img=24'
    },
    tags: ['ama', 'capital'],
    minutesAgo: 95,
    reactions: 221,
    comments: 29
  })
];

export const DEMO_FEED_ADS_META = {
  count: DEMO_FEED_ITEMS.filter((item) => item.kind === 'ad').length
};

export const DEMO_FEED_POST_COUNT = DEMO_FEED_ITEMS.filter((item) => item.kind !== 'ad').length;

export const DEMO_FEED_INSIGHTS = {
  analytics: {
    engagement: {
      postsSampled: 286,
      postsTotal: 942,
      comments: 1840,
      reactions: 5280,
      uniqueCommunities: 42,
      latestActivityAt: new Date(now - 6 * MINUTE).toISOString(),
      trendingTags: [
        { tag: 'RevenueRituals', count: 312 },
        { tag: 'TrustSignals', count: 198 },
        { tag: 'LearnerOps', count: 176 }
      ]
    },
    ads: {
      activeCampaigns: 3,
      scheduledCampaigns: 2,
      totals: {
        impressions: 128400,
        clicks: 6240,
        conversions: 432,
        spendCents: 186500
      }
    }
  },
  highlights: [
    {
      type: 'campaign',
      id: 'demo-highlight-campaign',
      name: 'Homepage hero for trust accelerators',
      objective: 'Instructor acquisition',
      metrics: {
        performanceScore: 92,
        ctr: 0.182,
        spendCents: 126000
      },
      timestamp: new Date(now - 2 * HOUR).toISOString()
    },
    {
      type: 'project',
      id: 'demo-highlight-project',
      title: 'Trust calibration workshop',
      summary: 'Community managers mapped friction logs to trust dashboards for faster escalations.',
      projectType: 'trust-sprint',
      status: 'in-progress',
      analyticsTargets: ['retention_rate', 'support_resolution_time'],
      timestamp: new Date(now - 9 * HOUR).toISOString()
    },
    {
      type: 'project',
      id: 'demo-highlight-story',
      title: 'Design Lab async hackathon',
      summary: 'Members shipped 18 verified onboarding blueprints during the overnight build.',
      projectType: 'growth-experiment',
      status: 'completed',
      analyticsTargets: ['activation_rate', 'nps'],
      timestamp: new Date(now - 2 * DAY).toISOString()
    }
  ],
  generatedAt: new Date(now - 5 * MINUTE).toISOString(),
  context: 'global',
  range: '30d'
};

