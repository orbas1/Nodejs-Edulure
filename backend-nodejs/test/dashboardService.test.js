import { describe, expect, it } from 'vitest';

import {
  buildAffiliateOverview,
  buildCommunityDashboard,
  buildInstructorDashboard,
  buildLearnerDashboard,
  buildLearningPace,
  calculateLearningStreak,
  humanizeRelativeTime
} from '../src/services/DashboardService.js';
import { buildComplianceRiskHeatmap, buildScamSummary, summariseIncidentQueue } from '../src/services/OperatorDashboardService.js';
import { normaliseMonetization, resolveDefaultMonetization } from '../src/services/PlatformSettingsService.js';

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
});

describe('buildLearnerDashboard', () => {
  it('assembles learner sections from enrolments, bookings, and communities', () => {
    const now = new Date('2024-11-08T12:00:00Z');
    const learnerSnapshot = buildLearnerDashboard({
      user: { id: 42, email: 'learner@example.com', metadata: {} },
      now,
      enrollments: [
        {
          id: 1,
          publicId: 'enr-1',
          courseId: 11,
          status: 'active',
          progressPercent: 45,
          metadata: { nextLesson: 'Module 3' }
        }
      ],
      courses: [
        {
          id: 11,
          title: 'Design Systems Foundations',
          metadata: { instructorName: 'Alex Rivers' }
        }
      ],
      courseProgress: [
        {
          enrollmentId: 1,
          completed: true,
          completedAt: '2024-11-07T09:00:00Z',
          metadata: { durationMinutes: 35 }
        }
      ],
      tutorBookings: [
        {
          id: 21,
          publicId: 'book-21',
          tutorId: 7,
          status: 'confirmed',
          scheduledStart: '2024-11-09T15:00:00Z',
          metadata: { topic: 'Portfolio review' },
          tutor: { name: 'Jamie Mentor' }
        },
        {
          id: 22,
          publicId: 'book-22',
          tutorId: 9,
          status: 'completed',
          scheduledStart: '2024-11-05T12:00:00Z',
          metadata: { topic: 'Career planning', rating: 4.5 },
          tutor: { name: 'Morgan Guide' }
        }
      ],
      liveClassrooms: [
        {
          id: 31,
          publicId: 'live-31',
          title: 'Ops Weekly Sync',
          status: 'scheduled',
          startAt: '2024-11-10T18:00:00Z',
          endAt: '2024-11-10T19:00:00Z',
          timezone: 'UTC',
          communityName: 'Ops Lab',
          capacity: 50,
          reservedSeats: 20,
          metadata: { whiteboard: { template: 'Sprint board', ready: false, updatedAt: '2024-11-07T10:00:00Z' } }
        }
      ],
      ebookProgress: [
        {
          id: 41,
          assetId: 81,
          progressPercent: 60,
          timeSpentSeconds: 1800,
          metadata: { highlights: 2 }
        }
      ],
      ebooks: [
        {
          id: 55,
          assetId: 81,
          title: 'Operational Excellence',
          priceAmount: 1500,
          priceCurrency: 'USD'
        }
      ],
      communityMemberships: [
        {
          id: 501,
          name: 'Ops Lab',
          stats: { members: 120, posts: 42, resources: 10, moderators: 3 },
          membership: { role: 'member', status: 'active' },
          metadata: { initiatives: ['AMAs'] }
        }
      ],
      communitySubscriptions: [
        {
          id: 61,
          publicId: 'sub-61',
          communityId: 501,
          tierId: 701,
          status: 'active',
          currentPeriodEnd: '2024-12-01T00:00:00Z'
        }
      ],
      paywallTiersByCommunity: new Map([
        [
          501,
          [
            {
              id: 701,
              name: 'Pro',
              priceCents: 2500,
              currency: 'USD',
              billingInterval: 'monthly'
            }
          ]
        ]
      ]),
      communityEventsById: new Map([
        [
          501,
          [
            {
              id: 91,
              communityId: 501,
              title: 'Ops AMA',
              startAt: '2024-11-12T12:00:00Z',
              attendanceCount: 45,
              attendanceLimit: 120,
              metadata: { host: 'Ops Lab' }
            }
          ]
        ]
      ])
    });

    expect(learnerSnapshot.role.id).toBe('learner');
    expect(learnerSnapshot.dashboard.metrics).toHaveLength(3);
    expect(learnerSnapshot.dashboard.tutorBookings.active[0].topic).toBe('Portfolio review');
    expect(learnerSnapshot.dashboard.financial.summary[0].label).toBe('Active memberships');
    expect(learnerSnapshot.dashboard.liveClassrooms.metrics.length).toBeGreaterThan(0);
    expect(learnerSnapshot.searchIndex.some((entry) => entry.role === 'learner')).toBe(true);
  });
});

describe('buildCommunityDashboard', () => {
  it('aggregates community telemetry for steward roles', () => {
    const now = new Date('2024-11-08T12:00:00Z');
    const communities = [
      {
        id: 801,
        name: 'Design Ops Guild',
        stats: { members: 180, posts: 55, resources: 14, moderators: 4, lastActivityAt: '2024-11-08T08:00:00Z' },
        membership: { role: 'owner', status: 'active' },
        metadata: { approvalsPending: 2 }
      }
    ];
    const runbooks = new Map([
      [
        801,
        [
          {
            id: 301,
            title: 'Launch Ritual',
            createdByName: 'Alex Rivers',
            tags: ['Launch'],
            metadata: JSON.stringify({ automationReady: true }),
            updatedAt: '2024-11-07T12:00:00Z'
          }
        ]
      ]
    ]);
    const events = new Map([
      [
        801,
        [
          {
            id: 411,
            title: 'Design Reviews',
            startAt: '2024-11-11T17:00:00Z',
            attendanceCount: 60,
            attendanceLimit: 120,
            metadata: { host: 'Design Ops Guild' }
          }
        ]
      ]
    ]);
    const subscriptions = new Map([
      [
        801,
        [
          {
            id: 901,
            tierId: 9901,
            status: 'active',
            currentPeriodEnd: '2024-12-03T00:00:00Z'
          }
        ]
      ]
    ]);
    const paywallTiers = new Map([
      [
        801,
        [
          { id: 9901, name: 'Leadership Circle', priceCents: 4500, currency: 'USD', billingInterval: 'monthly' }
        ]
      ]
    ]);
    const moderators = new Map([
      [
        801,
        [
          {
            id: 1,
            userId: 5,
            role: 'admin',
            status: 'active',
            metadata: { timezone: 'UTC', coverage: 'APAC mornings' }
          }
        ]
      ]
    ]);
    const moderationCounts = new Map([[801, 3]]);

    const communitySnapshot = buildCommunityDashboard({
      communities,
      runbooksByCommunity: runbooks,
      eventsByCommunity: events,
      subscriptionsByCommunity: subscriptions,
      paywallTiersByCommunity: paywallTiers,
      moderationCounts,
      moderatorsByCommunity: moderators,
      now
    });

    expect(communitySnapshot.role.id).toBe('community');
    expect(communitySnapshot.dashboard.metrics).toHaveLength(3);
    expect(communitySnapshot.dashboard.operations.runbooks[0].title).toBe('Launch Ritual');
    expect(communitySnapshot.dashboard.monetisation.tiers[0].members).toBe('1 members');
    expect(communitySnapshot.dashboard.safety.incidents).toHaveLength(1);
    expect(communitySnapshot.searchIndex[0].role).toBe('community');
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
