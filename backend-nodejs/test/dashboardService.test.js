import { describe, expect, it } from 'vitest';

import {
  buildAffiliateOverview,
  buildInstructorDashboard,
  buildLearningPace,
  calculateLearningStreak,
  humanizeRelativeTime
} from '../src/services/DashboardService.js';
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
    expect(pace[6]).toEqual({ day: 'Thu', minutes: 45 });
    expect(pace[5]).toEqual({ day: 'Wed', minutes: 55 });
    expect(pace[2]).toEqual({ day: 'Sun', minutes: 60 });
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
          priceAmount: 45000,
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
      lessons: [
        {
          id: 301,
          courseId: 11,
          title: 'Kickoff Workshop',
          releaseAt: '2024-11-10T15:00:00Z',
          durationMinutes: 45,
          metadata: '{}',
          courseTitle: 'Design Ops Mastery',
          courseReleaseAt: '2024-10-01T00:00:00Z',
          moduleReleaseOffsetDays: 0
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
      tutorProfiles: [
        {
          id: 31,
          displayName: 'Ivy Instructor',
          headline: 'DesignOps Coach',
          hourlyRateAmount: 25000,
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
          priceAmount: 1200,
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
          spendCurrency: 'USD',
          spendTotalCents: 12500,
          performanceScore: 4.2,
          ctr: 0.054,
          metadata: JSON.stringify({ promotedCommunityId: 55 }),
          createdBy: 7
        }
      ],
      adsMetrics: [
        {
          id: 971,
          campaignId: 77,
          metricDate: '2024-11-06',
          impressions: 1800,
          clicks: 110,
          conversions: 12,
          revenueCents: 72000,
          metadata: '{}'
        },
        {
          id: 972,
          campaignId: 77,
          metricDate: '2024-11-05',
          impressions: 1500,
          clicks: 90,
          conversions: 8,
          revenueCents: 48000,
          metadata: '{}'
        }
      ],
      paywallTiers: [
        {
          id: 960,
          communityId: 55,
          name: 'Pro Circle',
          priceCents: 2900,
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
          priceCents: 2900,
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
          priceCents: 2900,
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
          priceAmount: 1500,
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
    expect(snapshot.dashboard.communities.manageDeck[0]).toMatchObject({
      id: 'community-55',
      title: 'DesignOps Collective'
    });
    expect(snapshot.dashboard.pricing.subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: expect.stringContaining('Pro Circle'), members: '1 active' })
      ])
    );
    expect(snapshot.searchIndex).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'instructor', type: 'Course', title: 'Design Ops Mastery' })
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
