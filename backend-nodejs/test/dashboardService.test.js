import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  buildCommunityDashboard,
  buildAffiliateOverview,
  buildInstructorDashboard,
  buildLearnerDashboard,
  buildLearningPace,
  calculateLearningStreak,
  humanizeRelativeTime
} from '../src/services/DashboardService.js';
import { normaliseMonetization, resolveDefaultMonetization } from '../src/services/PlatformSettingsService.js';

vi.mock('../src/controllers/CommunityModerationController.js', () => ({
  __esModule: true,
  default: {
    flagPost: vi.fn(),
    listCases: vi.fn(),
    getCase: vi.fn(),
    listCaseActions: vi.fn(),
    applyCaseAction: vi.fn(),
    undoCaseAction: vi.fn(),
    listScamReports: vi.fn(),
    submitScamReport: vi.fn(),
    updateScamReport: vi.fn(),
    recordAnalyticsEvent: vi.fn(),
    getAnalyticsSummary: vi.fn()
  }
}));

let buildComplianceRiskHeatmap;
let buildScamSummary;
let summariseIncidentQueue;
let composeRevenueSnapshot;
let buildOperationsSnapshot;
let buildActivitySnapshot;
let buildBlogSnapshot;
let buildDashboardMeta;

beforeAll(async () => {
  ({
    buildComplianceRiskHeatmap,
    buildScamSummary,
    summariseIncidentQueue,
    composeRevenueSnapshot,
    buildOperationsSnapshot,
    buildActivitySnapshot,
    buildBlogSnapshot,
    buildDashboardMeta
  } = await import('../src/services/OperatorDashboardService.js'));
});

describe('DashboardService helpers', () => {
  it('calculates learning streak with contiguous days', () => {
    const reference = new Date('2024-11-05T12:00:00Z');
    const completions = [
      '2024-11-05T09:00:00Z',
      '2024-11-04T18:00:00Z',
      '2024-11-03T08:00:00Z',
      '2024-10-31T14:00:00Z'
    ];

    const streak = calculateLearningStreak(completions, reference);
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
  });

  it('builds seven-day learning pace entries aggregated by day', () => {
    const reference = new Date('2024-11-07T12:00:00Z');
    const completions = [
      { completedAt: '2024-11-07T08:00:00Z', durationMinutes: 45 },
      { completedAt: '2024-11-06T10:00:00Z', durationMinutes: 30 },
      { completedAt: '2024-11-06T17:00:00Z', durationMinutes: 25 },
      { completedAt: '2024-11-03T09:00:00Z', durationMinutes: 60 }
    ];

    const pace = buildLearningPace(completions, reference);
    expect(pace).toHaveLength(7);
    expect(pace[6]).toMatchObject({ day: 'Thu', minutes: 45, effortLevel: 'steady' });
    expect(pace[5]).toMatchObject({ day: 'Wed', minutes: 55, effortLevel: 'steady' });
    expect(pace[2]).toMatchObject({ day: 'Sun', minutes: 60, effortLevel: 'steady' });
  });

  it('renders humanised time differences', () => {
    const reference = new Date('2024-11-07T12:00:00Z');
    const sameHour = humanizeRelativeTime(new Date('2024-11-07T11:15:00Z'), reference);
    const daysAgo = humanizeRelativeTime(new Date('2024-11-02T12:00:00Z'), reference);

    expect(sameHour).toBe('45m ago');
    expect(daysAgo).toBe('5d ago');
  });
});

describe('OperatorDashboardService helpers', () => {
  it('composes revenue snapshot from BI and payment data', () => {
    const executiveOverview = {
      timeframe: { days: 30 },
      scorecard: {
        netRevenue: { cents: 25000000, change: { percentage: 5 } },
        recognisedRevenue: { cents: 24000000 }
      },
      topCommunities: [
        {
          communityId: 'comm-1',
          name: 'DesignOps',
          recognisedRevenueCents: 12000000,
          comments: 340,
          share: 55.5,
          change: { percentage: 4.2 }
        }
      ]
    };

    const savedViews = {
      views: [
        {
          id: 'overall-30d',
          currency: 'USD',
          totals: {
            grossVolumeCents: 32000000,
            recognisedVolumeCents: 24000000,
            discountCents: 1500000,
            refundedCents: 500000,
            intents: {
              succeededIntents: 180,
              processingIntents: 12,
              requiresActionIntents: 3,
              failedIntents: 5
            }
          },
          change: {
            recognisedVolume: { percentage: 6.5 }
          }
        }
      ]
    };

    const paymentsRow = {
      succeededIntents: 185,
      processingIntents: 10,
      requiresActionIntents: 4,
      failedIntents: 6,
      refundedCents: 600000
    };

    const snapshot = composeRevenueSnapshot({ executiveOverview, savedViews, paymentsRow });

    expect(snapshot.overview.netRevenue).toBe('$250,000');
    expect(snapshot.overview.arr).toBe('$2,880,000');
    expect(snapshot.overview.netRevenueChange).toBe('▲ +5.0%');
    expect(snapshot.paymentHealth).toMatchObject({ succeeded: 185, processing: 10, requiresAction: 4, failed: 6 });
    expect(snapshot.topCommunities[0]).toMatchObject({
      id: 'comm-1',
      name: 'DesignOps',
      revenue: '$120,000',
      subscribers: 340,
      trend: '▲ +4.2%'
    });
    expect(snapshot.refundsPendingCents).toBe(500000);
    expect(snapshot.currency).toBe('USD');
  });

  it('builds operations snapshot with integrations and launch context', () => {
    const queueSummary = {
      totalOpen: 7,
      severityCounts: { critical: 2, high: 1 },
      medianAckMinutes: 45,
      watchers: 320
    };
    const complianceSnapshot = {
      queue: [{}, {}],
      manualReviewQueue: 3
    };
    const platformSnapshot = {
      totalUsers: 1200,
      newUsers30d: 120,
      newUsersChange: '+12.0%',
      communitiesLive: 8,
      instructors: 45
    };
    const revenueSnapshot = {
      paymentHealth: { processing: 4, failed: 2 },
      refundsPendingCents: 350000,
      currency: 'USD'
    };
    const integrationSnapshot = {
      integrations: [
        {
          id: 'zapier',
          enabled: true,
          label: 'Zapier',
          health: { status: 'operational', score: 92 },
          category: 'Automation',
          owner: 'Ops',
          summary: { successRate: 98, openFailures: 1, recordsPushed: 1200 },
          reconciliation: { latestGeneratedAt: '2024-01-05T12:00:00Z' }
        },
        {
          id: 'stripe',
          enabled: false,
          name: 'Stripe',
          health: 'warning',
          summary: { successRate: 80, openFailures: 2, recordsPushed: 800, recordsFailed: 100 },
          callHealth: { errorRate: 0.02 }
        }
      ],
      concurrency: { activeJobs: 3, maxConcurrentJobs: 10 },
      pipelineValue: 'high',
      occupancy: 0.8,
      generatedAt: '2024-01-06T10:00:00Z'
    };
    const upcomingLaunches = [
      {
        id: 'launch-1',
        title: 'Course Launch',
        community: 'Courses',
        startAt: '2024-01-15T12:00:00Z',
        owner: 'Team',
        status: 'scheduled'
      }
    ];

    const snapshot = buildOperationsSnapshot({
      queueSummary,
      complianceSnapshot,
      platformSnapshot,
      revenueSnapshot,
      integrationSnapshot,
      upcomingLaunches,
      now: new Date('2024-01-10T12:00:00Z')
    });

    expect(snapshot.support).toMatchObject({ backlog: 7, pendingMemberships: 2, followRequests: 3, avgResponseMinutes: 45 });
    expect(snapshot.risk).toMatchObject({ payoutsProcessing: 4, failedPayments: 2, refundsPending: '$3,500', alertsOpen: 3 });
    expect(snapshot.platform).toMatchObject({ totalUsers: 1200, newUsers30d: 120, newUsersChange: '+12.0%' });
    expect(snapshot.upcomingLaunches).toHaveLength(1);
    expect(snapshot.tools.summary.cards).toHaveLength(4);
    expect(snapshot.tools.listing[0]).toMatchObject({ id: 'zapier', status: 'operational', owner: 'Ops' });
  });

  it('builds activity snapshot with alerts and events', () => {
    const now = new Date('2024-01-10T12:00:00Z');
    const activeIncidents = [
      {
        incidentUuid: 'inc-1',
        severity: 'HIGH',
        reportedAt: '2024-01-10T10:00:00Z',
        metadata: { summary: 'Payment delays' },
        resolution: { resolvedAt: '2024-01-10T11:00:00Z' }
      }
    ];
    const timeline = [
      {
        id: 'evt-1',
        category: 'Payments',
        timestamp: '2024-01-10T11:30:00Z',
        label: 'Capture queue cleared'
      }
    ];

    const snapshot = buildActivitySnapshot(activeIncidents, timeline, now);

    expect(snapshot.alerts[0]).toMatchObject({ id: 'inc-1', severity: 'high', message: 'Payment delays' });
    expect(snapshot.alerts[0].detectedLabel).toBe('2 hours ago');
    expect(snapshot.alerts[0].resolvedLabel).toBe('1 hour ago');
    expect(snapshot.events[0]).toMatchObject({ entity: 'Payments', summary: 'Capture queue cleared' });
  });

  it('normalises blog snapshot rows', () => {
    const summaryRows = [
      { status: 'published', total: '3' },
      { status: 'draft', total: 2 },
      { status: 'scheduled', total: '1' }
    ];
    const recentPosts = [
      {
        id: 1,
        slug: 'ops-update',
        title: 'Ops Update',
        status: 'published',
        publishedAt: '2024-01-09T12:00:00Z',
        readingTimeMinutes: 5,
        views: 120
      }
    ];
    const totalViewsRow = { totalViews: '450' };

    const snapshot = buildBlogSnapshot({ summaryRows, recentPosts, totalViewsRow });

    expect(snapshot.summary).toMatchObject({ published: 3, drafts: 2, scheduled: 1, totalViews: 450 });
    expect(snapshot.recent[0]).toMatchObject({ id: 1, slug: 'ops-update', views: 120 });
  });

  it('builds dashboard meta from runtime configuration values', () => {
    const runtimeValues = {
      'admin.console.escalation-channel': '#ops-channel',
      'admin.console.policy-owner': 'Trust & Safety',
      'admin.console.policy-contact': 'mailto:compliance@edulure.com?subject=ops',
      'admin.console.policy-status': 'Operational',
      'admin.console.policy-sla-hours': 16,
      'admin.console.policy-last-reviewed': '2024-01-08T12:00:00Z',
      'admin.console.policy-hub-url': '/policies'
    };
    const runtimeConfig = {
      getValue: vi.fn((key, _options) => runtimeValues[key])
    };
    const now = new Date('2024-01-10T12:00:00Z');

    const meta = buildDashboardMeta({
      runtimeConfig,
      tenantId: 'tenant-1',
      now,
      manifestGeneratedAt: '2024-01-10T11:00:00Z',
      operationalScore: { score: 92 }
    });

    expect(meta.policy).toMatchObject({
      owner: 'Trust & Safety',
      contact: 'mailto:compliance@edulure.com?subject=ops',
      status: 'Operational',
      slaHours: 16,
      hubUrl: '/policies',
      escalationChannel: '#ops-channel',
      lastReviewedAt: '2024-01-08T12:00:00.000Z',
      lastReviewedRelative: '2024-01-08'
    });
    expect(meta.helperText).toContain('Use saved views');
    expect(meta.helperText).toContain('Policy status: Operational.');
    expect(meta.helperText).toContain('Reviews target 16h SLA.');
    expect(meta.helperText).toContain('Last reviewed 2024-01-08.');
    expect(meta.helperText).toContain('Handbook: /policies.');
    expect(meta.helperText).toContain('Contact mailto:compliance@edulure.com?subject=ops for escalations.');
    expect(meta.note).toBe('Escalation channel: #ops-channel. Policy owner: Trust & Safety.');
  });

  it('falls back to defaults when runtime configuration is unavailable', () => {
    const now = new Date('2024-01-10T12:00:00Z');

    const meta = buildDashboardMeta({ runtimeConfig: null, tenantId: 'tenant-2', now });

    expect(meta.helperText).toContain('Use saved views');
    expect(meta.policy.owner).toBe('Trust & Safety');
    expect(meta.note).toBe('Escalation channel: #admin-escalations. Policy owner: Trust & Safety.');
  });
});

describe('buildLearnerDashboard', () => {
  it('builds a learner dashboard snapshot with key sections populated', () => {
    const now = new Date('2024-01-10T12:00:00Z');
    const user = { id: 1, firstName: 'Ava', lastName: 'Learner', email: 'ava@example.com' };

    const enrollments = [
      {
        id: 11,
        publicId: 'enroll-11',
        courseId: 101,
        userId: user.id,
        status: 'active',
        progressPercent: 40,
        startedAt: new Date('2023-12-20T00:00:00Z'),
        metadata: {}
      }
    ];

    const courses = [
      {
        id: 101,
        publicId: 'course-101',
        title: 'Design Foundations',
        metadata: {
          totalLessons: 12,
          instructorName: 'Coach Kim'
        }
      }
    ];

    const courseProgress = [
      {
        enrollmentId: 11,
        completed: true,
        completedAt: new Date('2023-12-25T00:00:00Z'),
        metadata: { studyMinutes: 45 }
      },
      {
        enrollmentId: 11,
        completed: true,
        completedAt: new Date('2023-12-26T00:00:00Z'),
        metadata: { studyMinutes: 60 }
      }
    ];

    const tutorBookings = [
      {
        id: 501,
        publicId: 'tb-501',
        tutorId: 301,
        learnerId: user.id,
        tutorFirstName: 'Taylor',
        tutorLastName: 'Mentor',
        tutorName: 'Taylor Mentor',
        scheduledStart: new Date('2024-01-12T15:00:00Z'),
        scheduledEnd: new Date('2024-01-12T15:30:00Z'),
        status: 'confirmed',
        metadata: { topic: 'Portfolio review', rating: 5 }
      },
      {
        id: 502,
        publicId: 'tb-502',
        tutorId: 301,
        learnerId: user.id,
        tutorFirstName: 'Taylor',
        tutorLastName: 'Mentor',
        tutorName: 'Taylor Mentor',
        scheduledStart: new Date('2023-12-20T15:00:00Z'),
        scheduledEnd: new Date('2023-12-20T15:30:00Z'),
        status: 'completed',
        metadata: { topic: 'Intro session', rating: 4 }
      }
    ];

    const tutorAvailability = [
      {
        tutorId: 301,
        startAt: new Date('2024-01-15T16:00:00Z'),
        endAt: new Date('2024-01-15T16:30:00Z'),
        status: 'open',
        metadata: {}
      }
    ];

    const liveClassrooms = [
      {
        id: 'live-1',
        communityId: 1,
        title: 'Critique Lab',
        type: 'workshop',
        status: 'scheduled',
        startAt: new Date('2024-01-14T17:00:00Z'),
        endAt: new Date('2024-01-14T18:00:00Z'),
        metadata: {}
      }
    ];

    const ebookProgress = [
      {
        assetId: 'ebook-1',
        progressPercent: 65,
        metadata: { highlights: 2, bookmarks: 1 },
        timeSpentSeconds: 7200
      }
    ];

    const ebooks = new Map([
      [
        'ebook-1',
        {
          id: 'ebook-1',
          title: 'Design Systems Handbook',
          priceAmount: 1500,
          priceCurrency: 'USD'
        }
      ]
    ]);

    const invoices = [
      {
        id: 'inv-1',
        label: 'January Tuition',
        amountCents: 25000,
        currency: 'USD',
        status: 'open',
        date: new Date('2024-01-20T00:00:00Z')
      }
    ];

    const communityMemberships = [
      {
        id: 1,
        name: 'DesignOps Collective',
        stats: { members: 200, posts: 15, resources: 3, channels: 4, moderators: 3 },
        membership: { role: 'member', status: 'active' }
      }
    ];

    const communityEvents = [
      {
        id: 'event-1',
        communityId: 1,
        communityName: 'DesignOps Collective',
        title: 'Community Jam',
        startAt: new Date('2024-01-16T18:00:00Z'),
        facilitator: 'Community Host',
        meetingUrl: 'https://events.example.com/jam'
      }
    ];

    const communityPipelines = [{ id: 'pipeline-1', name: 'Leadership Pod', status: 'active' }];

    const communitySubscriptions = [{ id: 'sub-1', status: 'active', tierId: 'tier-1' }];

    const followerSummary = {
      followers: 2,
      following: 3,
      pending: [{ id: 'pending-1' }],
      outgoing: [],
      recommendations: []
    };

    const privacySettings = {
      profileVisibility: 'public',
      followApprovalRequired: false,
      shareActivity: true,
      messagePermission: 'followers'
    };

    const messagingSummary = {
      unreadThreads: 1,
      notificationsEnabled: true
    };

    const notifications = [
      { id: 'notif-1', title: 'Welcome to your dashboard', type: 'system', timestamp: now.toISOString() }
    ];

    const snapshot = buildLearnerDashboard({
      user,
      now,
      enrollments,
      courses,
      courseProgress,
      tutorBookings,
      tutorAvailability,
      liveClassrooms,
      ebookProgress,
      ebooks,
      invoices,
      communityMemberships,
      communityEvents,
      communityPipelines,
      communitySubscriptions,
      followerSummary,
      privacySettings,
      messagingSummary,
      notifications
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot.role).toEqual({ id: 'learner', label: 'Learner' });
    expect(snapshot.dashboard.metrics.some((metric) => metric.label === 'Active courses')).toBe(true);
    expect(snapshot.dashboard.tutorBookings.active).toHaveLength(1);
    expect(snapshot.dashboard.ebooks.library[0].timeSpent).toBe('2h');
    expect(snapshot.dashboard.notifications.total).toBeGreaterThan(0);
    expect(snapshot.profileStats).toContainEqual({ label: 'Courses', value: '1 active' });
    expect(snapshot.searchIndex.some((entry) => entry.id === 'learner-overview')).toBe(true);
    expect(snapshot.feedHighlights.length).toBeGreaterThan(0);
    expect(snapshot.profileBio).toContain('Learning across 1 course');
  });

  it('deduplicates upcoming entries and orders them chronologically for the learner', () => {
    const now = new Date('2024-04-01T10:00:00Z');
    const user = { id: 9, firstName: 'Jordan', lastName: 'Learner', email: 'jordan@example.com' };
    const mentorBooking = {
      id: 301,
      publicId: 'tb-1',
      tutorId: 17,
      learnerId: user.id,
      tutorFirstName: 'Morgan',
      tutorLastName: 'Guide',
      scheduledStart: new Date('2024-04-02T14:00:00Z'),
      scheduledEnd: new Date('2024-04-02T14:30:00Z'),
      status: 'confirmed',
      metadata: { topic: 'Career strategy' }
    };

    const dashboard = buildLearnerDashboard({
      user,
      now,
      enrollments: [],
      courses: [],
      courseProgress: [],
      assignments: [],
      tutorBookings: [mentorBooking, { ...mentorBooking }],
      tutorAvailability: [],
      liveClassrooms: [],
      instructorDirectory: new Map(),
      ebookProgress: [],
      ebooks: new Map(),
      invoices: [
        {
          id: 'inv-1',
          label: 'April Tuition',
          amountCents: 5_000,
          currency: 'USD',
          status: 'open',
          date: '2024-04-01T09:00:00Z'
        }
      ],
      paymentIntents: [],
      ebookRecommendations: [],
      communityMemberships: [],
      communityEvents: [],
      communityPipelines: [],
      communitySubscriptions: [],
      followerSummary: {},
      privacySettings: null,
      messagingSummary: null,
      notifications: [],
      libraryEntries: [],
      fieldServiceWorkspace: null,
      financialProfile: null,
      paymentMethods: [],
      billingContacts: [],
      financePurchases: [],
      financeSubscriptions: [],
      systemPreferences: null,
      growthInitiatives: [],
      growthExperimentsByInitiative: new Map(),
      affiliateChannels: [],
      affiliatePayouts: [],
      adCampaigns: [],
      instructorApplication: null,
      supportCases: [],
      supportMetrics: {}
    });

    expect(dashboard).not.toBeNull();
    expect(dashboard.upcoming.map((entry) => entry.id)).toEqual(['inv-1', 'tb-1']);
    expect(dashboard.calendar.map((entry) => entry.id)).toEqual(['calendar-inv-1', 'calendar-tb-1']);
  });

  it('returns a learner snapshot even when only support workspace data exists', () => {
    const now = new Date('2024-06-01T08:00:00Z');
    const user = { id: 12, firstName: 'Sky', lastName: 'Support', email: 'sky@example.com' };

    const dashboard = buildLearnerDashboard({
      user,
      now,
      enrollments: [],
      courses: [],
      courseProgress: [],
      assignments: [],
      tutorBookings: [],
      tutorAvailability: [],
      liveClassrooms: [],
      instructorDirectory: new Map(),
      ebookProgress: [],
      ebooks: new Map(),
      invoices: [],
      paymentIntents: [],
      ebookRecommendations: [],
      communityMemberships: [],
      communityEvents: [],
      communityPipelines: [],
      communitySubscriptions: [],
      followerSummary: {},
      privacySettings: null,
      messagingSummary: null,
      notifications: [],
      libraryEntries: [],
      fieldServiceWorkspace: null,
      financialProfile: null,
      paymentMethods: [],
      billingContacts: [],
      financePurchases: [],
      financeSubscriptions: [],
      systemPreferences: null,
      growthInitiatives: [],
      growthExperimentsByInitiative: new Map(),
      affiliateChannels: [],
      affiliatePayouts: [],
      adCampaigns: [],
      instructorApplication: null,
      supportCases: [
        {
          id: 'case-1',
          status: 'open',
          subject: 'Billing question',
          updatedAt: '2024-05-31T11:00:00Z',
          messages: []
        }
      ],
      supportMetrics: {
        open: 1,
        waiting: 0,
        resolved: 0,
        closed: 0,
        awaitingLearner: 0,
        averageResponseMinutes: 18,
        latestUpdatedAt: '2024-05-31T11:00:00Z'
      }
    });

    expect(dashboard).not.toBeNull();
    expect(dashboard.support.cases).toHaveLength(1);
    expect(dashboard.support.metrics.open).toBe(1);
  });
});

describe('buildCommunityDashboard', () => {
  it('builds a community dashboard snapshot with operational insights', () => {
    const now = new Date('2024-01-10T12:00:00Z');
    const user = { id: 1, email: 'ops@example.com' };

    const communities = [
      {
        id: 55,
        slug: 'designops',
        name: 'DesignOps Collective',
        stats: {
          members: 120,
          memberCount: 120,
          posts: 42,
          resources: 5,
          channels: 6,
          moderators: 4,
          lastActivityAt: new Date('2024-01-08T09:00:00Z').toISOString()
        }
      }
    ];

    const eventsByCommunity = new Map([
      [
        55,
        [
          {
            id: 901,
            title: 'Weekly AMA',
            startAt: new Date('2024-01-15T17:00:00Z'),
            endAt: new Date('2024-01-15T18:00:00Z'),
            capacity: 50,
            reservedSeats: 20,
            status: 'scheduled',
            facilitator: 'Community Ops',
            metadata: { host: 'Community Ops' }
          }
        ]
      ]
    ]);

    const runbooksByCommunity = new Map([
      [
        55,
        [
          {
            id: 301,
            title: 'Moderation SOP',
            createdByName: 'Alex Admin',
            tags: 'safety,moderation',
            metadata: JSON.stringify({ automationReady: true })
          }
        ]
      ]
    ]);

    const paywallTiersByCommunity = new Map([
      [
        55,
        [
          { id: 401, name: 'Pro', priceCents: 1999, currency: 'USD', billingInterval: 'monthly' }
        ]
      ]
    ]);

    const subscriptionsByCommunity = new Map([
      [
        55,
        [
          { id: 'sub-401', tierId: 401, status: 'active' },
          { id: 'sub-402', tierId: 401, status: 'active' }
        ]
      ]
    ]);

    const pendingMembersByCommunity = new Map([[55, [{ id: 'm-1', status: 'pending' }]]]);

    const moderatorsByCommunity = new Map([
      [
        55,
        [
          { id: 'mod-1', role: 'admin', metadata: { coverage: 'APAC' } }
        ]
      ]
    ]);

    const moderationCases = [
      {
        id: 'case-1',
        communityId: 55,
        severity: 'high',
        status: 'pending',
        reason: 'Spam wave',
        createdAt: new Date('2024-01-09T10:00:00Z'),
        assignee: { name: 'Alex Admin' }
      }
    ];

    const communicationsByCommunity = new Map([
      [
        55,
        [
          {
            id: 'post-1',
            title: 'Weekly update',
            postType: 'announcement',
            publishedAt: new Date('2024-01-07T10:00:00Z'),
            channelName: 'Announcements',
            reactionSummary: { total: 12 },
            tags: 'update,weekly',
            metadata: JSON.stringify({ stage: 'published' })
          }
        ]
      ]
    ]);

    const engagementTrend = [];
    const engagementTotals = {
      current: { posts: 20, comments: 35, eventPosts: 5 },
      previous: { posts: 15, comments: 25, eventPosts: 3 }
    };

    const snapshot = buildCommunityDashboard({
      user,
      now,
      communities,
      eventsByCommunity,
      runbooksByCommunity,
      paywallTiersByCommunity,
      subscriptionsByCommunity,
      pendingMembersByCommunity,
      moderatorsByCommunity,
      moderationCases,
      communicationsByCommunity,
      engagementTrend,
      engagementTotals
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot.role).toEqual({ id: 'community', label: 'Community' });
    expect(snapshot.dashboard.metrics.length).toBeGreaterThan(0);
    expect(snapshot.dashboard.operations.runbooks).toHaveLength(1);
    expect(snapshot.dashboard.programming.upcomingEvents[0].title).toBe('Weekly AMA');
    expect(snapshot.dashboard.monetisation.tiers[0].price).toBe('$19.99');
    expect(snapshot.dashboard.safety.incidents).toHaveLength(1);
    expect(snapshot.profileStats).toContainEqual({ label: 'Communities', value: '1 managed' });
    expect(snapshot.searchIndex.some((entry) => entry.role === 'community')).toBe(true);
    expect(snapshot.feedHighlights.length).toBeGreaterThan(0);
  });
});

describe('buildAffiliateOverview', () => {
  it('returns empty affiliate structure when no programmes exist', () => {
    const overview = buildAffiliateOverview({
      affiliates: [],
      affiliatePayouts: [],
      monetizationSettings: resolveDefaultMonetization(),
      now: new Date('2024-05-01T00:00:00Z')
    });

    expect(overview.programs).toHaveLength(0);
    expect(overview.summary.totals.programCount).toBe(0);
    expect(overview.summary.totals.outstandingCents).toBe(0);
    expect(overview.actions).toEqual([
      'Invite high-performing learners into the affiliate programme.'
    ]);
  });

  it('aggregates commissions, payouts, and referral performance signals', () => {
    const monetizationSettings = normaliseMonetization({
      affiliate: {
        defaultCommission: {
          recurrence: 'finite',
          maxOccurrences: 6,
          tiers: [
            { thresholdCents: 0, rateBps: 1000 },
            { thresholdCents: 100_000, rateBps: 1500 }
          ]
        }
      }
    });
    const now = new Date('2024-05-15T12:00:00Z');
    const affiliates = [
      {
        id: 1,
        referralCode: 'GROW-ALEX',
        communityId: 10,
        communityName: 'Growth Operator Studio',
        status: 'active',
        totalEarnedCents: 182_400,
        totalPaidCents: 148_000,
        commissionRateBps: 1500
      },
      {
        id: 2,
        referralCode: 'OPS-LIA',
        communityId: 11,
        communityName: 'Ops Leadership Lab',
        status: 'pending',
        totalEarnedCents: 68_000,
        totalPaidCents: 12_000
      }
    ];
    const affiliatePayouts = [
      {
        id: 'pay-1',
        affiliateId: 1,
        status: 'scheduled',
        amountCents: 34_200,
        scheduledAt: '2024-05-30T09:00:00Z'
      },
      {
        id: 'pay-0',
        affiliateId: 1,
        status: 'completed',
        amountCents: 128_000,
        processedAt: '2024-04-28T09:00:00Z'
      },
      {
        id: 'pay-2',
        affiliateId: 2,
        status: 'pending',
        amountCents: 56_000,
        scheduledAt: '2024-05-25T09:00:00Z'
      }
    ];
    const paymentIntents = [
      {
        metadata: JSON.stringify({ referralCode: 'GROW-ALEX' }),
        amountTotal: 45_000,
        amountRefunded: 0,
        capturedAt: '2024-05-10T12:00:00Z'
      },
      {
        metadata: JSON.stringify({ referralCode: 'GROW-ALEX' }),
        amountTotal: 18_000,
        amountRefunded: 2_000,
        capturedAt: '2024-03-18T12:00:00Z'
      },
      {
        metadata: JSON.stringify({ referralCode: 'OPS-LIA' }),
        amountTotal: 24_000,
        amountRefunded: 0,
        capturedAt: '2024-05-01T12:00:00Z'
      }
    ];
    const memberships = [
      { communityId: 10, communityName: 'Growth Operator Studio', communitySlug: 'growth-operator' },
      { communityId: 11, communityName: 'Ops Leadership Lab', communitySlug: 'ops-lab' }
    ];

    const overview = buildAffiliateOverview({
      affiliates,
      affiliatePayouts,
      paymentIntents,
      memberships,
      monetizationSettings,
      now
    });

    expect(overview.programs).toHaveLength(2);
    expect(overview.summary.totals.programCount).toBe(2);
    expect(overview.summary.totals.outstandingCents).toBe(90_400);
    expect(overview.summary.nextPayout.amount).toBe('$560.00');
    expect(overview.payouts[0].id).toBe('pay-1');
    expect(overview.actions).toEqual([
      'Release $904.00 in pending affiliate payouts.',
      'Review 1 pending affiliate application.'
    ]);

    const growthProgramme = overview.programs.find((program) => program.referralCode === 'GROW-ALEX');
    expect(growthProgramme.earnings.totalFormatted).toBe('$1,824.00');
    expect(growthProgramme.performance.conversions).toBe(2);
    expect(growthProgramme.performance.conversions30d).toBe(1);
    expect(growthProgramme.performance.volume30dFormatted).toBe('$450.00');
  });

  it('matches referral performance using alternate codes defined in metadata', () => {
    const monetizationSettings = normaliseMonetization(resolveDefaultMonetization());
    const now = new Date('2024-06-15T12:00:00Z');
    const affiliates = [
      {
        id: 7,
        referralCode: 'PRIMARY-CODE',
        referralCodes: ['TEAM-ALPHA', 'TEAM-BETA'],
        metadata: JSON.stringify({ referralCodes: ['legacy-code'], affiliateCode: 'legacy' }),
        communityId: 21,
        communityName: 'Creators League',
        status: 'active',
        totalEarnedCents: 12_000,
        totalPaidCents: 4_000
      }
    ];
    const paymentIntents = [
      {
        metadata: JSON.stringify({ referral_code: 'team-alpha' }),
        amountTotal: 5_000,
        amountRefunded: 0,
        capturedAt: '2024-06-10T12:00:00Z'
      },
      {
        metadata: JSON.stringify({ attribution: { referralCode: 'legacy' } }),
        amountTotal: 3_000,
        amountRefunded: 0,
        capturedAt: '2024-05-20T12:00:00Z'
      },
      {
        metadata: JSON.stringify({ referralCodes: ['unused-code'] }),
        amountTotal: 2_500,
        amountRefunded: 0,
        capturedAt: '2024-06-12T12:00:00Z'
      }
    ];

    const overview = buildAffiliateOverview({
      affiliates,
      affiliatePayouts: [],
      paymentIntents,
      memberships: [{ communityId: 21, communityName: 'Creators League' }],
      monetizationSettings,
      now
    });

    expect(overview.programs).toHaveLength(1);
    expect(overview.programs[0].performance.conversions).toBe(2);
    expect(overview.programs[0].performance.volumeCents).toBe(8_000);
  });
});

describe('Operator dashboard summaries', () => {
  it('summarises incident queue including breaches and detection channels', () => {
    const now = new Date('2025-02-03T10:00:00Z');
    const incidents = [
      {
        severity: 'high',
        category: 'scam',
        status: 'mitigating',
        reportedAt: '2025-02-03T08:45:00Z',
        acknowledgement: { acknowledgedAt: '2025-02-03T09:05:00Z', ackBreached: false },
        resolution: { resolutionBreached: false },
        metadata: { detectionChannel: 'fraud-desk', watchers: 10 }
      },
      {
        severity: 'critical',
        category: 'account_takeover',
        status: 'triaged',
        reportedAt: '2025-02-03T06:58:00Z',
        acknowledgement: { acknowledgedAt: '2025-02-03T07:05:00Z', ackBreached: false },
        resolution: { resolutionBreached: true },
        metadata: { detectionChannel: 'pagerduty', watchers: 8 }
      },
      {
        severity: 'medium',
        category: 'fraud',
        status: 'new',
        reportedAt: '2025-02-02T19:22:00Z',
        acknowledgement: { ackBreached: true },
        resolution: { resolutionBreached: false },
        metadata: { detectionChannel: 'support-portal', watchers: 2 }
      }
    ];

    const summary = summariseIncidentQueue(incidents, { now });

    expect(summary.totalOpen).toBe(3);
    expect(summary.severityCounts).toEqual({ critical: 1, high: 1, medium: 1, low: 0 });
    expect(summary.ackBreaches).toBe(1);
    expect(summary.resolutionBreaches).toBe(1);
    expect(summary.watchers).toBe(20);
    expect(summary.detectionChannels).toEqual(
      expect.arrayContaining([
        { channel: 'fraud-desk', count: 1 },
        { channel: 'pagerduty', count: 1 },
        { channel: 'support-portal', count: 1 }
      ])
    );
    expect(summary.medianAckMinutes).toBe(14);
    expect(summary.oldestOpenAt).toBe('2025-02-02T19:22:00.000Z');
  });

  it('builds a compliance risk heatmap across incident categories', () => {
    const incidents = [
      { category: 'scam', severity: 'critical' },
      { category: 'scam', severity: 'high' },
      { category: 'data_breach', severity: 'critical' },
      { category: 'data_breach', severity: 'medium' },
      { category: 'abuse', severity: 'low' }
    ];

    const heatmap = buildComplianceRiskHeatmap(incidents);

    expect(heatmap[0]).toMatchObject({ category: 'scam', total: 2 });
    expect(heatmap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'data_breach',
          severities: expect.arrayContaining([
            expect.objectContaining({ severity: 'critical', count: 1 })
          ])
        })
      ])
    );
  });

  it('builds scam alert summary with aggregated metrics', () => {
    const incidents = [
      {
        incidentUuid: 'ops-2045',
        severity: 'critical',
        category: 'scam',
        reportedAt: '2025-02-03T08:45:00Z',
        metadata: {
          reference: 'OPS-2045',
          summary: 'Phishing payouts blocked before funds moved.',
          detectionChannel: 'fraud-desk',
          watchers: 6,
          metrics: { blockedPayments: 8200, flaggedLearners: 12 },
          recommendedActions: ['Lock payouts', 'Warn instructors']
        }
      },
      {
        incidentUuid: 'ops-2047',
        severity: 'medium',
        category: 'fraud',
        reportedAt: '2025-02-03T07:10:00Z',
        metadata: {
          reference: 'OPS-2047',
          tags: ['scam'],
          summary: 'Marketplace clone intercepted before checkout.',
          detectionChannel: 'support-portal',
          watchers: 3,
          metrics: { blockedPayments: 4500, flaggedLearners: 5 }
        }
      }
    ];

    const summary = buildScamSummary(incidents, { now: new Date('2025-02-03T10:00:00Z') });

    expect(summary.activeCases).toBe(2);
    expect(summary.criticalCases).toBe(1);
    expect(summary.impactedLearners).toBe(17);
    expect(summary.blockedPaymentsCents).toBe(12700);
    expect(summary.blockedPaymentsFormatted).toBe('$127.00');
    expect(summary.alerts).toHaveLength(2);
    expect(summary.alerts[0]).toMatchObject({ reference: 'OPS-2045', detectionChannel: 'fraud-desk' });
  });
});

describe('buildInstructorDashboard', () => {
  const now = new Date('2024-11-07T12:00:00Z');
  const instructor = {
    id: 7,
    role: 'instructor',
    firstName: 'Ivy',
    lastName: 'Instructor',
    email: 'ivy@edulure.test'
  };

  it('returns null when the user has no instructor signals', () => {
    const snapshot = buildInstructorDashboard({
      user: instructor,
      now,
      courses: [],
      courseEnrollments: [],
      lessons: [],
      assignments: [],
      tutorProfiles: [],
      tutorAvailability: [],
      tutorBookings: [],
      liveClassrooms: [],
      assets: [],
      assetEvents: [],
      communityMemberships: [],
      communityStats: [],
      communityResources: [],
      communityPosts: [],
      adsCampaigns: [],
      adsMetrics: [],
      paywallTiers: [],
      communitySubscriptions: [],
      ebookRows: [],
      ebookProgressRows: []
    });

    expect(snapshot).toBeNull();
  });

  it('aggregates active teaching, community, and monetisation signals', () => {
    const snapshot = buildInstructorDashboard({
      user: instructor,
      now,
      courses: [
        {
          id: 11,
          title: 'Design Ops Mastery',
          status: 'published',
          releaseAt: '2024-10-01T00:00:00Z',
          priceAmount: 45_000,
          priceCurrency: 'USD',
          summary: 'Advance your operating rituals.',
          metadata: JSON.stringify({ format: 'cohort' })
        }
      ],
      courseEnrollments: [
        {
          id: 500,
          courseId: 11,
          status: 'active',
          startedAt: '2024-10-20T12:00:00Z',
          progressPercent: 60,
          metadata: JSON.stringify({ cohort: 'Q4' })
        },
        {
          id: 501,
          courseId: 11,
          status: 'completed',
          startedAt: '2024-09-10T12:00:00Z',
          completedAt: '2024-10-18T12:00:00Z',
          progressPercent: 100,
          metadata: JSON.stringify({ cohort: 'Q3' })
        },
        {
          id: 502,
          courseId: 11,
          status: 'invited',
          startedAt: null,
          progressPercent: 0,
          metadata: '{}'
        }
      ],
      modules: [
        {
          id: 210,
          courseId: 11,
          title: 'Launch Command Center',
          position: 1,
          metadata: JSON.stringify({
            creation: {
              owner: 'Kai Watanabe',
              status: 'Approved',
              lastUpdatedAt: '2024-11-02T10:00:00Z'
            },
            drip: { gating: 'Immediate access' }
          })
        }
      ],
      lessons: [
        {
          id: 301,
          courseId: 11,
          moduleId: 210,
          title: 'Kickoff Workshop',
          releaseAt: '2024-11-10T15:00:00Z',
          durationMinutes: 45,
          metadata: '{}',
          courseTitle: 'Design Ops Mastery',
          courseReleaseAt: '2024-10-01T00:00:00Z',
          moduleReleaseOffsetDays: 0,
          position: 1
        },
        {
          id: 302,
          courseId: 11,
          moduleId: 210,
          title: 'Simulation Drill',
          releaseAt: '2024-11-17T15:00:00Z',
          durationMinutes: 60,
          metadata: JSON.stringify({ format: 'simulation' }),
          position: 2
        }
      ],
      assignments: [
        {
          id: 401,
          courseId: 11,
          title: 'Ops Playbook Audit',
          metadata: JSON.stringify({ owner: 'Ivy Instructor' }),
          courseTitle: 'Design Ops Mastery',
          courseReleaseAt: '2024-11-05T00:00:00Z',
          dueOffsetDays: 7
        }
      ],
      courseProgress: [
        {
          id: 801,
          enrollmentId: 500,
          lessonId: 301,
          completed: true,
          completedAt: '2024-10-25T10:00:00Z',
          progressPercent: 100,
          metadata: JSON.stringify({ completionSource: 'web', note: 'Great engagement' })
        },
        {
          id: 802,
          enrollmentId: 500,
          lessonId: 302,
          completed: false,
          progressPercent: 25,
          metadata: JSON.stringify({ lastLocation: 'lesson-302' })
        }
      ],
      creationProjects: [
        {
          id: 201,
          publicId: 'proj-ops',
          ownerId: 7,
          type: 'course',
          status: 'draft',
          title: 'Design Ops Mastery Revamp',
          metadata: JSON.stringify({ courseId: 11, locales: ['en', 'es'] }),
          contentOutline: JSON.stringify([{ id: 'intro', label: 'Introduction' }]),
          updatedAt: '2024-11-05T12:00:00Z'
        }
      ],
      creationCollaborators: new Map([
        [
          201,
          [
            {
              projectId: 201,
              userId: 7,
              role: 'owner',
              permissions: ['outline:edit', 'publish']
            }
          ]
        ]
      ]),
      creationSessions: new Map([
        [
          201,
          [
            {
              id: 9101,
              publicId: 'sess-1',
              participantId: 7,
              role: 'owner',
              capabilities: ['outline-edit'],
              joinedAt: '2024-11-06T10:00:00Z'
            }
          ]
        ]
      ]),
      collaboratorDirectory: new Map([
        [7, { id: 7, firstName: 'Ivy', lastName: 'Instructor', email: 'ivy@edulure.test' }],
        [901, { id: 901, firstName: 'Noah', lastName: 'Lead', email: 'noah@edulure.test' }]
      ]),
      tutorProfiles: [
        {
          id: 31,
          displayName: 'Ivy Instructor',
          headline: 'DesignOps Coach',
          hourlyRateAmount: 25_000,
          hourlyRateCurrency: 'USD',
          ratingAverage: 4.9,
          ratingCount: 48,
          metadata: '{}'
        }
      ],
      tutorAvailability: [
        {
          id: 61,
          tutorId: 31,
          tutorName: 'Ivy Instructor',
          startAt: '2024-11-09T14:00:00Z',
          endAt: '2024-11-09T15:00:00Z',
          status: 'open',
          metadata: JSON.stringify({ channel: 'ops', durationMinutes: 60 })
        }
      ],
      tutorBookings: [
        {
          id: 71,
          tutorId: 31,
          status: 'requested',
          requestedAt: '2024-11-06T09:30:00Z',
          metadata: JSON.stringify({ topic: 'Portfolio review' }),
          learnerFirstName: 'Lia',
          learnerLastName: 'Researcher'
        },
        {
          id: 72,
          tutorId: 31,
          status: 'confirmed',
          scheduledStart: '2024-11-12T16:00:00Z',
          scheduledEnd: '2024-11-12T16:45:00Z',
          metadata: JSON.stringify({ topic: 'Team ritual design' }),
          learnerFirstName: 'Noah',
          learnerLastName: 'Lead'
        }
      ],
      liveClassrooms: [
        {
          id: 81,
          title: 'DesignOps Simulation',
          status: 'scheduled',
          type: 'webinar',
          priceAmount: 1_200,
          priceCurrency: 'USD',
          capacity: 25,
          reservedSeats: 18,
          startAt: '2024-11-15T17:00:00Z',
          metadata: '{}',
          communityId: 55,
          communityName: 'DesignOps Collective'
        }
      ],
      assets: [
        {
          id: 900,
          originalFilename: 'ops-playbook.pdf',
          status: 'ready',
          type: 'document',
          updatedAt: '2024-11-05T10:00:00Z'
        }
      ],
      assetEvents: [
        {
          id: 910,
          assetId: 900,
          eventType: 'viewed',
          occurredAt: '2024-11-06T11:00:00Z',
          metadata: '{}'
        }
      ],
      communityMemberships: [
        {
          communityId: 55,
          communityName: 'DesignOps Collective',
          role: 'owner',
          status: 'active',
          ownerId: 7,
          membershipMetadata: '{}'
        }
      ],
      communityStats: [
        {
          community_id: 55,
          active_members: 120,
          pending_members: 4,
          moderators: 6
        }
      ],
      communityResources: [
        {
          id: 930,
          communityId: 55,
          createdBy: 7,
          title: 'Sprint Retro Kit',
          resourceType: 'content_asset',
          tags: JSON.stringify(['Playbook']),
          metadata: JSON.stringify({ deckVersion: 2 }),
          publishedAt: '2024-11-01T09:00:00Z',
          communityName: 'DesignOps Collective'
        }
      ],
      communityPosts: [
        {
          id: 940,
          title: 'Episode 01 — Launch Signals',
          status: 'published',
          publishedAt: '2024-10-28T18:00:00Z'
        }
      ],
      adsCampaigns: [
        {
          id: 77,
          name: 'Ops Launch Sprint',
          objective: 'leads',
          status: 'active',
          budgetCurrency: 'USD',
          budgetDailyCents: 35_000,
          spendCurrency: 'USD',
          spendTotalCents: 12_500,
          performanceScore: 4.2,
          ctr: 0.054,
          cpcCents: 145,
          cpaCents: 975,
          targetingKeywords: JSON.stringify(['design ops', 'launch sprint']),
          targetingAudiences: JSON.stringify(['Product Leads']),
          targetingLocations: JSON.stringify(['US', 'GB']),
          targetingLanguages: JSON.stringify(['en']),
          creativeHeadline: 'Launch sprint playbooks',
          creativeDescription: 'Capture qualified leads for design ops cohorts.',
          creativeUrl: 'https://edulure.test/ads/ops-launch',
          startAt: '2024-11-01T00:00:00Z',
          endAt: '2024-12-01T00:00:00Z',
          metadata: JSON.stringify({ promotedCommunityId: 55, featureFlag: 'ads-explorer-placements' }),
          createdBy: 7
        }
      ],
      adsMetrics: [
        {
          id: 971,
          campaignId: 77,
          metricDate: '2024-11-06',
          impressions: 1_800,
          clicks: 110,
          conversions: 12,
          spendCents: 28_000,
          revenueCents: 72_000,
          metadata: '{}'
        },
        {
          id: 972,
          campaignId: 77,
          metricDate: '2024-11-05',
          impressions: 1_500,
          clicks: 90,
          conversions: 8,
          spendCents: 22_000,
          revenueCents: 48_000,
          metadata: '{}'
        }
      ],
      paywallTiers: [
        {
          id: 960,
          communityId: 55,
          name: 'Pro Circle',
          priceCents: 2_900,
          currency: 'USD',
          billingInterval: 'monthly',
          isActive: true,
          metadata: '{}',
          ownerId: 7,
          communityName: 'DesignOps Collective'
        }
      ],
      communitySubscriptions: [
        {
          id: 981,
          communityId: 55,
          userId: 901,
          status: 'active',
          currentPeriodEnd: '2024-11-30T00:00:00Z',
          metadata: '{}',
          tierName: 'Pro Circle',
          priceCents: 2_900,
          currency: 'USD',
          billingInterval: 'monthly'
        },
        {
          id: 982,
          communityId: 55,
          userId: 902,
          status: 'cancelled',
          currentPeriodEnd: '2024-11-05T00:00:00Z',
          metadata: '{}',
          tierName: 'Pro Circle',
          priceCents: 2_900,
          currency: 'USD',
          billingInterval: 'monthly'
        }
      ],
      ebookRows: [
        {
          id: 88,
          assetId: 900,
          title: 'Ops Manual',
          authors: JSON.stringify(['Ivy Instructor']),
          priceAmount: 1_500,
          currency: 'USD',
          metadata: JSON.stringify({ status: 'Published', cohort: 'DesignOps Collective' })
        }
      ],
      ebookProgressRows: [
        {
          ebookId: 88,
          progressPercent: 80
        }
      ]
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot.role).toEqual({ id: 'instructor', label: 'Instructor' });
    expect(snapshot.dashboard.metrics[0]).toMatchObject({
      label: 'Active learners',
      value: '1',
      change: '+1 last 30d'
    });
    expect(snapshot.dashboard.bookings.pipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'booking-71', status: 'Requested' })
      ])
    );
    expect(snapshot.dashboard.tutors.roster[0]).toMatchObject({
      name: 'Ivy Instructor',
      status: 'Active'
    });
    expect(snapshot.dashboard.tutors.availability[0]).toMatchObject({
      slotsCount: expect.any(Number),
      learnersCount: expect.any(Number)
    });
    expect(snapshot.dashboard.tutors.notifications.length).toBeGreaterThan(0);
    expect(snapshot.dashboard.communities.manageDeck[0]).toMatchObject({
      id: 'community-55',
      title: 'DesignOps Collective'
    });
    expect(snapshot.dashboard.pricing.subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: expect.stringContaining('Pro Circle'), members: '1 active' })
      ])
    );
    expect(snapshot.dashboard.ads.summary).toMatchObject({
      activeCampaigns: 1,
      totalSpend: expect.objectContaining({ formatted: expect.stringContaining('$') }),
      averageCtr: expect.stringContaining('%')
    });
    expect(snapshot.dashboard.ads.active[0]).toMatchObject({
      name: 'Ops Launch Sprint',
      placement: expect.objectContaining({ surface: 'Explorer' }),
      targeting: expect.objectContaining({ keywords: expect.arrayContaining(['design ops']) })
    });
    expect(snapshot.dashboard.ads.placements[0].budgetLabel).toContain('$350');
    expect(snapshot.dashboard.ads.tags).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: 'Keyword', label: 'design ops' })])
    );
    expect(snapshot.searchIndex).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'instructor', type: 'Course', title: 'Design Ops Mastery' })
      ])
    );
    expect(snapshot.dashboard.assessments.overview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'active-assessments', label: 'Active assessments' })
      ])
    );
    expect(snapshot.dashboard.assessments.timeline.upcoming).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ course: 'Design Ops Mastery', type: 'Assignment' })
      ])
    );
    expect(snapshot.dashboard.courses.catalogue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Design Ops Mastery',
          learners: expect.objectContaining({ active: 1 })
        })
      ])
    );
    expect(snapshot.dashboard.courses.pipeline).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: expect.stringContaining('Design Ops Mastery') })])
    );
    expect(snapshot.dashboard.courses.assignments.summary.total).toBe(1);
    expect(snapshot.dashboard.courses.authoring.drafts[0]).toMatchObject({
      title: 'Design Ops Mastery Revamp',
      status: 'draft'
    });
    expect(snapshot.dashboard.courses.learners.roster).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ courseTitle: 'Design Ops Mastery', cohort: 'Q4' })
      ])
    );
    expect(snapshot.searchIndex).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'instructor', type: 'Tutor', title: 'Ivy Instructor' })
      ])
    );
    expect(snapshot.profileStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Cohorts', value: '1 active' })
      ])
    );
    expect(snapshot.profileBio).toContain('coaching 1 cohort');
  });
});
