import crypto from 'crypto';

import db from '../config/database.js';
import OperatorDashboardService from './OperatorDashboardService.js';

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
let operatorDashboardService;

function getOperatorDashboardService() {
  if (!operatorDashboardService) {
    operatorDashboardService = new OperatorDashboardService();
  }
  return operatorDashboardService;
}

const emptyInstructorSnapshot = {
  courses: [],
  courseEnrollments: [],
  assignments: [],
  tutorProfiles: [],
  tutorAvailability: [],
  tutorBookings: [],
  liveClassrooms: [],
  communityMemberships: [],
  communityStats: [],
  communityResources: [],
  communityPosts: [],
  adsCampaigns: [],
  adsMetrics: [],
  paywallTiers: [],
  communitySubscriptions: [],
  affiliatePayouts: [],
  monetizationSettings: {},
  ebookRows: [],
  ebookProgressRows: []
};

async function loadInstructorEntities({ instructorId }) {
  const numericId = Number(instructorId);
  if (!Number.isFinite(numericId)) {
    return emptyInstructorSnapshot;
  }

  const ownedCommunities = await db('communities as community')
    .select('community.id', 'community.name', 'community.slug')
    .where('community.owner_id', numericId);

  const ownedCommunityIds = ownedCommunities.map((community) => community.id);

  const [
    courseRows,
    enrollmentRows,
    assignmentRows,
    tutorProfileRows,
    tutorAvailabilityRows,
    tutorBookingRows,
    liveClassroomRows,
    communityMembershipRows,
    paywallTierRows,
    communitySubscriptionRows,
    communityStatsRows,
    adsCampaignRows,
    adsMetricRows,
    ebookProgressRows
  ] = await Promise.all([
    db('courses as course')
      .select(
        'course.id',
        'course.title',
        'course.slug',
        'course.status',
        'course.release_at as releaseAt',
        'course.delivery_format as deliveryFormat',
        'course.metadata'
      )
      .where('course.instructor_id', numericId),
    db('course_enrollments as enrollment')
      .select(
        'enrollment.id',
        'enrollment.course_id as courseId',
        'enrollment.user_id as userId',
        'enrollment.status',
        'enrollment.started_at as startedAt',
        'enrollment.completed_at as completedAt',
        'enrollment.metadata'
      )
      .join('courses as course', 'enrollment.course_id', 'course.id')
      .where('course.instructor_id', numericId),
    db('course_assignments as assignment')
      .select(
        'assignment.id',
        'assignment.course_id as courseId',
        'assignment.module_id as moduleId',
        'assignment.title',
        'assignment.due_offset_days as dueOffsetDays',
        'assignment.metadata',
        'course.title as courseTitle',
        'course.release_at as courseReleaseAt'
      )
      .join('courses as course', 'assignment.course_id', 'course.id')
      .where('course.instructor_id', numericId),
    db('tutor_profiles as profile')
      .select(
        'profile.id',
        'profile.display_name as displayName',
        'profile.headline',
        'profile.hourly_rate_amount as hourlyRateAmount',
        'profile.hourly_rate_currency as hourlyRateCurrency',
        'profile.rating_average as ratingAverage',
        'profile.rating_count as ratingCount',
        'profile.metadata'
      )
      .where('profile.user_id', numericId),
    db('tutor_availability_slots as slot')
      .select(
        'slot.id',
        'slot.tutor_id as tutorId',
        'slot.start_at as startAt',
        'slot.end_at as endAt',
        'slot.status',
        'slot.is_recurring as isRecurring',
        'slot.recurrence_rule as recurrenceRule',
        'slot.metadata'
      )
      .join('tutor_profiles as profile', 'slot.tutor_id', 'profile.id')
      .where('profile.user_id', numericId),
    db('tutor_bookings as booking')
      .select(
        'booking.id',
        'booking.tutor_id as tutorId',
        'booking.learner_id as learnerId',
        'booking.status',
        'booking.requested_at as requestedAt',
        'booking.confirmed_at as confirmedAt',
        'booking.scheduled_start as scheduledStart',
        'booking.scheduled_end as scheduledEnd',
        'booking.metadata',
        'learner.first_name as learnerFirstName',
        'learner.last_name as learnerLastName'
      )
      .join('tutor_profiles as profile', 'booking.tutor_id', 'profile.id')
      .join('users as learner', 'booking.learner_id', 'learner.id')
      .where('profile.user_id', numericId),
    db('live_classrooms as classroom')
      .select(
        'classroom.id',
        'classroom.title',
        'classroom.slug',
        'classroom.summary',
        'classroom.type',
        'classroom.status',
        'classroom.is_ticketed as isTicketed',
        'classroom.price_amount as priceAmount',
        'classroom.price_currency as priceCurrency',
        'classroom.capacity',
        'classroom.reserved_seats as reservedSeats',
        'classroom.timezone',
        'classroom.start_at as startAt',
        'classroom.end_at as endAt',
        'classroom.community_id as communityId',
        'classroom.metadata',
        'community.name as communityName'
      )
      .leftJoin('communities as community', 'classroom.community_id', 'community.id')
      .where('classroom.instructor_id', numericId),
    db('community_members as member')
      .select(
        'member.id',
        'member.community_id as communityId',
        'member.role',
        'member.status',
        'member.metadata',
        'community.name as communityName'
      )
      .join('communities as community', 'member.community_id', 'community.id')
      .where('member.user_id', numericId),
    ownedCommunityIds.length
      ? db('community_paywall_tiers as tier')
          .select(
            'tier.id',
            'tier.community_id as communityId',
            'tier.name',
            'tier.price_cents as priceCents',
            'tier.currency',
            'tier.billing_interval as billingInterval'
          )
          .whereIn('tier.community_id', ownedCommunityIds)
      : Promise.resolve([]),
    ownedCommunityIds.length
      ? db('community_subscriptions as subscription')
          .select(
            'subscription.id',
            'subscription.status',
            'subscription.tier_id as tierId',
            'subscription.user_id as userId',
            'subscription.started_at as startedAt',
            'subscription.current_period_end as currentPeriodEnd',
            'subscription.metadata',
            'tier.name as tierName',
            'tier.community_id as communityId'
          )
          .join('community_paywall_tiers as tier', 'subscription.tier_id', 'tier.id')
          .whereIn('tier.community_id', ownedCommunityIds)
      : Promise.resolve([]),
    ownedCommunityIds.length
      ? db('community_members as member')
          .select('member.community_id as communityId')
          .select(
            db.raw("SUM(CASE WHEN member.status = 'active' THEN 1 ELSE 0 END) AS active_members")
          )
          .select(
            db.raw("SUM(CASE WHEN member.status = 'pending' THEN 1 ELSE 0 END) AS pending_members")
          )
          .select(db.raw("SUM(CASE WHEN member.role = 'moderator' THEN 1 ELSE 0 END) AS moderators"))
          .whereIn('member.community_id', ownedCommunityIds)
          .groupBy('member.community_id')
      : Promise.resolve([]),
    db('ads_campaigns as campaign')
      .select(
        'campaign.id',
        'campaign.name',
        'campaign.status',
        'campaign.objective',
        'campaign.budget_currency as budgetCurrency',
        'campaign.budget_daily_cents as budgetDailyCents',
        'campaign.spend_currency as spendCurrency',
        'campaign.cpc_cents as cpcCents',
        'campaign.cpa_cents as cpaCents',
        'campaign.targeting_keywords as targetingKeywords',
        'campaign.targeting_audiences as targetingAudiences',
        'campaign.targeting_locations as targetingLocations',
        'campaign.targeting_languages as targetingLanguages',
        'campaign.metadata'
      )
      .where('campaign.created_by', numericId),
    db('ads_campaign_metrics_daily as metric')
      .select(
        'metric.id',
        'metric.campaign_id as campaignId',
        'metric.metric_date as metricDate',
        'metric.impressions',
        'metric.clicks',
        'metric.conversions',
        'metric.spend_cents as spendCents',
        'metric.revenue_cents as revenueCents',
        'metric.metadata'
      )
      .join('ads_campaigns as campaign', 'metric.campaign_id', 'campaign.id')
      .where('campaign.created_by', numericId),
    db('ebook_read_progress as progress')
      .select(
        'progress.id',
        'progress.asset_id as assetId',
        'progress.user_id as userId',
        'progress.progress_percent as progressPercent',
        'progress.updated_at as updatedAt'
      )
      .join('content_assets as asset', 'progress.asset_id', 'asset.id')
      .where('asset.created_by', numericId)
  ]);

  const courses = courseRows.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    status: course.status,
    releaseAt: course.releaseAt,
    deliveryFormat: course.deliveryFormat,
    metadata: course.metadata
  }));

  const courseEnrollments = enrollmentRows.map((enrollment) => ({
    id: enrollment.id,
    courseId: enrollment.courseId,
    userId: enrollment.userId,
    status: enrollment.status,
    startedAt: enrollment.startedAt,
    completedAt: enrollment.completedAt,
    metadata: enrollment.metadata
  }));

  const assignments = assignmentRows.map((assignment) => ({
    id: assignment.id,
    courseId: assignment.courseId,
    moduleId: assignment.moduleId,
    title: assignment.title,
    dueOffsetDays: assignment.dueOffsetDays,
    metadata: assignment.metadata,
    courseTitle: assignment.courseTitle,
    courseReleaseAt: assignment.courseReleaseAt
  }));

  const tutorProfiles = tutorProfileRows.map((profile) => ({
    id: profile.id,
    displayName: profile.displayName,
    headline: profile.headline,
    hourlyRateAmount: Number(profile.hourlyRateAmount ?? 0),
    hourlyRateCurrency: profile.hourlyRateCurrency,
    ratingAverage: profile.ratingAverage ? Number(profile.ratingAverage) : null,
    ratingCount: Number(profile.ratingCount ?? 0),
    metadata: profile.metadata
  }));

  const tutorAvailability = tutorAvailabilityRows.map((slot) => ({
    id: slot.id,
    tutorId: slot.tutorId,
    startAt: slot.startAt,
    endAt: slot.endAt,
    status: slot.status,
    isRecurring: slot.isRecurring,
    recurrenceRule: slot.recurrenceRule,
    metadata: slot.metadata
  }));

  const tutorBookings = tutorBookingRows.map((booking) => ({
    id: booking.id,
    tutorId: booking.tutorId,
    learnerId: booking.learnerId,
    status: booking.status,
    requestedAt: booking.requestedAt,
    confirmedAt: booking.confirmedAt,
    scheduledStart: booking.scheduledStart,
    scheduledEnd: booking.scheduledEnd,
    metadata: booking.metadata,
    learnerFirstName: booking.learnerFirstName,
    learnerLastName: booking.learnerLastName
  }));

  const liveClassrooms = liveClassroomRows.map((classroom) => ({
    id: classroom.id,
    title: classroom.title,
    slug: classroom.slug,
    summary: classroom.summary,
    type: classroom.type,
    status: classroom.status,
    isTicketed: classroom.isTicketed,
    priceAmount: Number(classroom.priceAmount ?? 0),
    priceCurrency: classroom.priceCurrency,
    capacity: Number(classroom.capacity ?? 0),
    reservedSeats: Number(classroom.reservedSeats ?? 0),
    timezone: classroom.timezone,
    startAt: classroom.startAt,
    endAt: classroom.endAt,
    communityId: classroom.communityId,
    communityName: classroom.communityName,
    metadata: classroom.metadata
  }));

  const communityMemberships = communityMembershipRows.map((membership) => ({
    id: membership.id,
    communityId: membership.communityId,
    role: membership.role,
    status: membership.status,
    metadata: membership.metadata,
    communityName: membership.communityName
  }));

  const paywallTiers = paywallTierRows.map((tier) => ({
    id: tier.id,
    communityId: tier.communityId,
    name: tier.name,
    priceCents: Number(tier.priceCents ?? 0),
    currency: tier.currency,
    billingInterval: tier.billingInterval
  }));

  const communitySubscriptions = communitySubscriptionRows.map((subscription) => ({
    id: subscription.id,
    status: subscription.status,
    tierId: subscription.tierId,
    userId: subscription.userId,
    startedAt: subscription.startedAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    metadata: subscription.metadata,
    tierName: subscription.tierName,
    communityId: subscription.communityId
  }));

  const communityStats = communityStatsRows.map((stat) => ({
    communityId: Number(stat.communityId),
    community_id: Number(stat.communityId),
    active_members: Number(stat.active_members ?? 0),
    pending_members: Number(stat.pending_members ?? 0),
    moderators: Number(stat.moderators ?? 0)
  }));

  const adsCampaigns = adsCampaignRows.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    objective: campaign.objective,
    budgetCurrency: campaign.budgetCurrency,
    budgetDailyCents: Number(campaign.budgetDailyCents ?? 0),
    spendCurrency: campaign.spendCurrency,
    cpcCents: Number(campaign.cpcCents ?? 0),
    cpaCents: Number(campaign.cpaCents ?? 0),
    targetingKeywords: campaign.targetingKeywords,
    targetingAudiences: campaign.targetingAudiences,
    targetingLocations: campaign.targetingLocations,
    targetingLanguages: campaign.targetingLanguages,
    metadata: campaign.metadata
  }));

  const adsMetrics = adsMetricRows.map((metric) => ({
    id: metric.id,
    campaignId: metric.campaignId,
    metricDate: metric.metricDate,
    impressions: Number(metric.impressions ?? 0),
    clicks: Number(metric.clicks ?? 0),
    conversions: Number(metric.conversions ?? 0),
    spendCents: Number(metric.spendCents ?? 0),
    revenueCents: Number(metric.revenueCents ?? 0),
    metadata: metric.metadata
  }));

  const ebookProgress = ebookProgressRows.map((progress) => ({
    id: progress.id,
    assetId: progress.assetId,
    userId: progress.userId,
    progressPercent: Number(progress.progressPercent ?? 0),
    completedAt: progress.updatedAt,
    updatedAt: progress.updatedAt
  }));

  return {
    courses,
    courseEnrollments,
    assignments,
    tutorProfiles,
    tutorAvailability,
    tutorBookings,
    liveClassrooms,
    communityMemberships,
    communityStats,
    communityResources: [],
    communityPosts: [],
    adsCampaigns,
    adsMetrics,
    paywallTiers,
    communitySubscriptions,
    affiliatePayouts: [],
    monetizationSettings: {},
    ebookRows: [],
    ebookProgressRows: ebookProgress
  };
}

export function formatCurrency(amountCents, currency = 'USD') {
  const amount = Number(amountCents ?? 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function resolveName(firstName, lastName, fallback) {
  const combined = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return combined || fallback;
}

export function buildAvatarUrl(email) {
  const hash = crypto
    .createHash('md5')
    .update(String(email ?? '').trim().toLowerCase())
    .digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=256&d=identicon`;
}

export function formatReleaseOffsetLabel(offsetDays) {
  if (offsetDays === 0) return 'Release day';
  if (offsetDays > 0) return `Day +${offsetDays}`;
  return `Day ${offsetDays}`;
}

export function humanizeRelativeTime(dateLike, referenceDate = new Date()) {
  if (!dateLike) return 'Just now';
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const diffMs = referenceDate.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.round(diffMonths / 12);
  return `${diffYears}y ago`;
}

function clampUtcDay(dateLike) {
  const date = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function resolveCompletionEntry(entry) {
  if (!entry) return null;
  const dateValue = entry.completedAt ?? entry.date ?? entry.timestamp ?? entry;
  const durationValue =
    entry.durationMinutes ?? entry.duration ?? entry.minutes ?? entry.studyMinutes ?? entry.totalMinutes ?? 0;

  const date = clampUtcDay(dateValue);
  if (!date) return null;

  const minutes = Number(durationValue ?? 0);
  return {
    date,
    isoDay: date.toISOString().slice(0, 10),
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0
  };
}

export function calculateLearningStreak(completionDates = [], referenceDate = new Date()) {
  const entries = completionDates.map(resolveCompletionEntry).filter(Boolean);
  if (entries.length === 0) {
    return {
      current: 0,
      longest: 0,
      totalDays: 0,
      currentRange: null,
      longestRange: null,
      lastCompletedAt: null
    };
  }

  const uniqueDays = new Map();
  for (const entry of entries) {
    if (!uniqueDays.has(entry.isoDay) || uniqueDays.get(entry.isoDay).date < entry.date) {
      uniqueDays.set(entry.isoDay, entry);
    }
  }

  const reference = clampUtcDay(referenceDate) ?? new Date();
  let current = 0;
  let cursor = new Date(reference);
  while (uniqueDays.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor = new Date(cursor.getTime() - DAY_IN_MS);
  }
  const currentRange =
    current > 0
      ? {
          start: new Date(cursor.getTime() + DAY_IN_MS).toISOString(),
          end: new Date(reference).toISOString()
        }
      : null;

  const sortedDays = Array.from(uniqueDays.keys()).sort();
  let longest = 0;
  let longestRange = null;
  let streak = 0;
  let streakStart = null;
  let previous = null;
  for (const isoDay of sortedDays) {
    if (previous) {
      const diff = Math.round((new Date(`${isoDay}T00:00:00Z`) - new Date(`${previous}T00:00:00Z`)) / DAY_IN_MS);
      if (diff === 1) {
        streak += 1;
      } else {
        streak = 1;
        streakStart = isoDay;
      }
    } else {
      streak = 1;
      streakStart = isoDay;
    }

    if (streak > longest) {
      longest = streak;
      longestRange = {
        start: new Date(`${streakStart}T00:00:00Z`).toISOString(),
        end: new Date(`${isoDay}T00:00:00Z`).toISOString()
      };
    }

    previous = isoDay;
  }

  const lastCompletedIso = sortedDays[sortedDays.length - 1];

  return {
    current,
    longest,
    totalDays: uniqueDays.size,
    currentRange,
    longestRange,
    lastCompletedAt: lastCompletedIso ? new Date(`${lastCompletedIso}T00:00:00Z`).toISOString() : null
  };
}

export function buildLearningPace(completions = [], referenceDate = new Date()) {
  const reference = clampUtcDay(referenceDate) ?? new Date();
  const start = new Date(reference.getTime() - 6 * DAY_IN_MS);
  const buckets = new Map();

  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start.getTime() + i * DAY_IN_MS);
    const isoDay = day.toISOString().slice(0, 10);
    buckets.set(isoDay, { isoDay, minutes: 0 });
  }

  for (const entry of completions.map(resolveCompletionEntry).filter(Boolean)) {
    if (!buckets.has(entry.isoDay)) continue;
    const bucket = buckets.get(entry.isoDay);
    bucket.minutes += entry.minutes;
  }

  const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  return Array.from(buckets.values()).map(({ isoDay, minutes }) => ({
    day: dayFormatter.format(new Date(`${isoDay}T00:00:00Z`)),
    minutes,
    isoDate: isoDay,
    effortLevel: minutes >= 90 ? 'intense' : minutes >= 45 ? 'steady' : minutes > 0 ? 'light' : 'idle'
  }));
}

function parseMonetizationTier(settings) {
  if (!settings) {
    return { defaultCommission: { tiers: [] } };
  }
  return settings;
}

export function buildAffiliateOverview({
  affiliates = [],
  affiliatePayouts = [],
  paymentIntents = [],
  memberships = [],
  monetizationSettings = {},
  now = new Date()
} = {}) {
  const normalizedSettings = parseMonetizationTier(monetizationSettings.affiliate);

  const programs = affiliates.map((affiliate) => {
    const codes = [affiliate.referralCode].filter(Boolean);
    const intents = paymentIntents.filter((intent) => {
      const metadata = safeJsonParse(intent.metadata, {});
      return codes.includes(metadata.referralCode);
    });

    const totalVolumeCents = intents.reduce(
      (total, intent) => total + Math.max(0, Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0)),
      0
    );

    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);
    const recentVolumeCents = intents
      .filter((intent) => {
        const capturedAt = intent.capturedAt ? new Date(intent.capturedAt) : null;
        return capturedAt && capturedAt >= thirtyDaysAgo;
      })
      .reduce(
        (total, intent) => total + Math.max(0, Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0)),
        0
      );

    const conversions = intents.filter(
      (intent) => Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0) > 0
    );
    const conversions30d = conversions.filter((intent) => {
      const capturedAt = intent.capturedAt ? new Date(intent.capturedAt) : null;
      return capturedAt && capturedAt >= thirtyDaysAgo;
    });

    const programmeMembership = memberships.find((membership) => membership.communityId === affiliate.communityId);

    return {
      id: affiliate.id,
      referralCode: affiliate.referralCode,
      community: {
        id: affiliate.communityId,
        name: affiliate.communityName ?? programmeMembership?.communityName ?? null,
        slug: programmeMembership?.communitySlug ?? null
      },
      status: affiliate.status ?? 'pending',
      earnings: {
        totalCents: Number(affiliate.totalEarnedCents ?? 0),
        totalFormatted: formatCurrency(affiliate.totalEarnedCents ?? 0),
        paidCents: Number(affiliate.totalPaidCents ?? 0),
        outstandingCents: Math.max(0, Number(affiliate.totalEarnedCents ?? 0) - Number(affiliate.totalPaidCents ?? 0))
      },
      performance: {
        conversions: conversions.length,
        conversions30d: conversions30d.length,
        volumeCents: totalVolumeCents,
        volumeFormatted: formatCurrency(totalVolumeCents),
        volume30dCents: recentVolumeCents,
        volume30dFormatted: formatCurrency(recentVolumeCents)
      },
      commission: {
        rateBps: affiliate.commissionRateBps ?? normalizedSettings?.defaultCommission?.tiers?.[0]?.rateBps ?? 0
      }
    };
  });

  const outstandingCents = programs.reduce((total, program) => total + program.earnings.outstandingCents, 0);

  const nextPayout = affiliatePayouts
    .filter((payout) => ['scheduled', 'pending'].includes(payout.status))
    .map((payout) => ({
      ...payout,
      scheduledDate: payout.scheduledAt ? new Date(payout.scheduledAt) : null
    }))
    .sort((a, b) => {
      const aTime = a.scheduledDate ? a.scheduledDate.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.scheduledDate ? b.scheduledDate.getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })[0] ?? null;

  const statusPriority = new Map([
    ['scheduled', 0],
    ['pending', 1],
    ['processing', 1],
    ['completed', 2],
    ['cancelled', 3]
  ]);

  const payouts = affiliatePayouts
    .map((payout) => ({
      id: payout.id,
      affiliateId: payout.affiliateId,
      status: payout.status,
      amountCents: Number(payout.amountCents ?? 0),
      amountFormatted: formatCurrency(payout.amountCents ?? 0),
      scheduledAt: payout.scheduledAt ? new Date(payout.scheduledAt) : null,
      processedAt: payout.processedAt ? new Date(payout.processedAt) : null
    }))
    .sort((a, b) => {
      const statusRankA = statusPriority.get(a.status) ?? 99;
      const statusRankB = statusPriority.get(b.status) ?? 99;
      if (statusRankA !== statusRankB) return statusRankA - statusRankB;
      const aTime = a.scheduledAt ? a.scheduledAt.getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.scheduledAt ? b.scheduledAt.getTime() : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      const aProcessed = a.processedAt ? a.processedAt.getTime() : Number.POSITIVE_INFINITY;
      const bProcessed = b.processedAt ? b.processedAt.getTime() : Number.POSITIVE_INFINITY;
      if (aProcessed !== bProcessed) return aProcessed - bProcessed;
      return String(a.id).localeCompare(String(b.id));
    });

  const pendingApplications = programs.filter((program) => program.status === 'pending').length;

  const actions = [];
  if (programs.length === 0) {
    actions.push('Invite high-performing learners into the affiliate programme.');
  }
  if (outstandingCents > 0) {
    actions.push(`Release ${formatCurrency(outstandingCents)} in pending affiliate payouts.`);
  }
  if (pendingApplications > 0) {
    actions.push(`Review ${pendingApplications} pending affiliate application${pendingApplications === 1 ? '' : 's'}.`);
  }

  return {
    programs,
    payouts,
    summary: {
      totals: {
        programCount: programs.length,
        outstandingCents,
        outstandingFormatted: formatCurrency(outstandingCents)
      },
      nextPayout: nextPayout
        ? {
            id: nextPayout.id,
            affiliateId: nextPayout.affiliateId,
            amount: formatCurrency(nextPayout.amountCents),
            scheduledAt: nextPayout.scheduledDate
          }
        : null
    },
    actions
  };
}

function aggregateTutorAvailability({ availability = [], bookings = [], now }) {
  const byTutor = new Map();
  availability.forEach((slot) => {
    const tutorId = Number(slot.tutorId);
    if (!Number.isFinite(tutorId)) return;
    const record = byTutor.get(tutorId) ?? { slots: 0, learners: new Set() };
    record.slots += 1;
    byTutor.set(tutorId, record);
  });

  bookings.forEach((booking) => {
    const tutorId = Number(booking.tutorId);
    if (!Number.isFinite(tutorId)) return;
    if (!['confirmed', 'requested'].includes(booking.status)) return;
    const record = byTutor.get(tutorId) ?? { slots: 0, learners: new Set() };
    const learnerName = resolveName(booking.learnerFirstName, booking.learnerLastName, 'Learner');
    record.learners.add(learnerName);
    if (booking.status === 'confirmed' && booking.scheduledStart) {
      const start = new Date(booking.scheduledStart);
      if (start >= now) {
        record.slots += 1;
      }
    }
    byTutor.set(tutorId, record);
  });

  return Array.from(byTutor.entries()).map(([tutorId, record]) => ({
    tutorId,
    slotsCount: record.slots,
    learnersCount: record.learners.size
  }));
}

function buildTutorNotifications({ bookings = [], now }) {
  const notifications = [];
  bookings
    .filter((booking) => booking.status === 'requested')
    .forEach((booking) => {
      notifications.push({
        id: `booking-request-${booking.id}`,
        type: 'request',
        message: `New mentorship request from ${resolveName(
          booking.learnerFirstName,
          booking.learnerLastName,
          'Learner'
        )}`,
        receivedAt: booking.requestedAt ? new Date(booking.requestedAt) : now
      });
    });
  bookings
    .filter((booking) => booking.status === 'confirmed' && booking.scheduledStart)
    .forEach((booking) => {
      notifications.push({
        id: `booking-upcoming-${booking.id}`,
        type: 'upcoming',
        message: `Upcoming session · ${booking.metadata?.topic ?? 'Mentorship session'}`,
        scheduledFor: formatDateTime(booking.scheduledStart, { dateStyle: 'medium', timeStyle: 'short' })
      });
    });
  return notifications;
}

function formatDateTime(dateLike, options) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function resolveAdPlacement(campaign) {
  const metadata = safeJsonParse(campaign.metadata, {});
  if (typeof metadata.featureFlag === 'string' && metadata.featureFlag.includes('explorer')) {
    return 'Explorer';
  }
  if (metadata.promotedCommunityId) {
    return 'Community spotlight';
  }
  return 'Learning feed';
}

function parseTargetingList(value) {
  const parsed = safeJsonParse(value, []);
  return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
}

export function buildInstructorDashboard({
  user,
  now = new Date(),
  courses = [],
  courseEnrollments = [],
  modules = [],
  lessons = [],
  assignments = [],
  tutorProfiles = [],
  tutorAvailability = [],
  tutorBookings = [],
  liveClassrooms = [],
  assets = [],
  assetEvents = [],
  communityMemberships = [],
  communityStats = [],
  communityResources = [],
  communityPosts = [],
  adsCampaigns = [],
  adsMetrics = [],
  paywallTiers = [],
  communitySubscriptions = [],
  ebookRows = [],
  ebookProgressRows = []
} = {}) {
  const hasSignals =
    courses.length ||
    communityMemberships.length ||
    tutorProfiles.length ||
    tutorBookings.length ||
    liveClassrooms.length ||
    adsCampaigns.length;

  if (!hasSignals) {
    return null;
  }

  const activeEnrollments = courseEnrollments.filter((enrollment) => enrollment.status === 'active');
  const recentEnrollments = activeEnrollments.filter((enrollment) => {
    if (!enrollment.startedAt) return false;
    const startedAt = new Date(enrollment.startedAt);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);
    return startedAt >= thirtyDaysAgo;
  });

  const completedEnrollments = courseEnrollments.filter((enrollment) => enrollment.status === 'completed');
  const averageCompletion = courseEnrollments.length
    ? Math.round((completedEnrollments.length / courseEnrollments.length) * 100)
    : 0;

  const upcomingLive = liveClassrooms
    .map((session) => ({
      ...session,
      startAt: session.startAt ? new Date(session.startAt) : null
    }))
    .filter((session) => session.startAt && session.startAt >= now);

  const metrics = [
    {
      label: 'Active learners',
      value: `${activeEnrollments.length}`,
      change: `+${recentEnrollments.length} last 30d`
    },
    {
      label: 'Avg completion',
      value: `${averageCompletion}%`,
      change: `${completedEnrollments.length} cohorts completed`
    },
    {
      label: 'Upcoming sessions',
      value: `${upcomingLive.length}`,
      change: `${tutorAvailability.length} tutor slot${tutorAvailability.length === 1 ? '' : 's'}`
    }
  ];

  const pipelineBookings = tutorBookings
    .filter((booking) => booking.status === 'requested')
    .map((booking) => ({
      id: `booking-${booking.id}`,
      status: 'Requested',
      learner: resolveName(booking.learnerFirstName, booking.learnerLastName, 'Learner'),
      requested: booking.requestedAt ? humanizeRelativeTime(booking.requestedAt, now) : 'Awaiting review',
      topic: safeJsonParse(booking.metadata, {}).topic ?? 'Mentorship session'
    }));

  const roster = tutorProfiles.map((profile) => ({
    id: profile.id,
    name: profile.displayName ?? resolveName(user.firstName, user.lastName, user.email),
    status: profile.status ?? 'Active',
    headline: profile.headline ?? null,
    hourlyRate: profile.hourlyRateAmount ? formatCurrency(profile.hourlyRateAmount, profile.hourlyRateCurrency) : null,
    rating: profile.ratingAverage ? `${profile.ratingAverage.toFixed(1)} (${profile.ratingCount ?? 0})` : null
  }));

  const availabilitySummary = aggregateTutorAvailability({
    availability: tutorAvailability.map((entry) => ({
      ...entry,
      metadata: safeJsonParse(entry.metadata, {})
    })),
    bookings: tutorBookings.map((booking) => ({
      ...booking,
      metadata: safeJsonParse(booking.metadata, {})
    })),
    now
  });

  const tutorNotifications = buildTutorNotifications({
    bookings: tutorBookings.map((booking) => ({
      ...booking,
      metadata: safeJsonParse(booking.metadata, {})
    })),
    now
  });

  const communityMap = new Map();
  communityMemberships.forEach((membership) => {
    const communityId = Number(membership.communityId);
    if (!Number.isFinite(communityId)) return;
    communityMap.set(communityId, {
      id: communityId,
      title: membership.communityName ?? `Community ${communityId}`,
      role: membership.role ?? 'member',
      status: membership.status ?? 'active'
    });
  });

  communityStats.forEach((stat) => {
    const communityId = Number(stat.community_id ?? stat.communityId);
    if (!communityMap.has(communityId)) return;
    const entry = communityMap.get(communityId);
    entry.metrics = {
      active: Number(stat.active_members ?? 0),
      pending: Number(stat.pending_members ?? 0),
      moderators: Number(stat.moderators ?? 0)
    };
  });

  const manageDeck = Array.from(communityMap.values()).map((community) => ({
    id: `community-${community.id}`,
    title: community.title,
    role: community.role,
    status: community.status,
    metrics: community.metrics ?? { active: 0, pending: 0, moderators: 0 }
  }));

  const paywallSummary = paywallTiers.map((tier) => {
    const subscribers = communitySubscriptions.filter(
      (subscription) => subscription.tierName === tier.name && subscription.status === 'active'
    );
    return {
      id: tier.id,
      name: tier.name,
      price: formatCurrency(tier.priceCents, tier.currency ?? 'USD'),
      interval: tier.billingInterval ?? 'monthly',
      members: `${subscribers.length} active`
    };
  });

  const campaigns = adsCampaigns.map((campaign) => {
    const metadata = safeJsonParse(campaign.metadata, {});
    const metricsForCampaign = adsMetrics
      .filter((metric) => Number(metric.campaignId) === Number(campaign.id))
      .map((metric) => ({
        ...metric,
        metricDate: metric.metricDate ? new Date(metric.metricDate) : null
      }));

    const totals = metricsForCampaign.reduce(
      (acc, metric) => {
        acc.impressions += Number(metric.impressions ?? 0);
        acc.clicks += Number(metric.clicks ?? 0);
        acc.conversions += Number(metric.conversions ?? 0);
        acc.spendCents += Number(metric.spendCents ?? 0);
        acc.revenueCents += Number(metric.revenueCents ?? 0);
        return acc;
      },
      { impressions: 0, clicks: 0, conversions: 0, spendCents: 0, revenueCents: 0 }
    );

    const averageCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

    return {
      id: campaign.id,
      name: campaign.name,
      placement: {
        surface: resolveAdPlacement(campaign)
      },
      targeting: {
        keywords: parseTargetingList(campaign.targetingKeywords),
        audiences: parseTargetingList(campaign.targetingAudiences),
        locations: parseTargetingList(campaign.targetingLocations),
        languages: parseTargetingList(campaign.targetingLanguages)
      },
      budget: {
        currency: campaign.budgetCurrency ?? 'USD',
        dailyCents: Number(campaign.budgetDailyCents ?? 0)
      },
      metrics: {
        totals,
        averageCtr,
        cpcCents: Number(campaign.cpcCents ?? 0),
        cpaCents: Number(campaign.cpaCents ?? 0)
      },
      metadata
    };
  });

  const totalSpendCents = campaigns.reduce((total, campaign) => total + campaign.metrics.totals.spendCents, 0);
  const totalCtr = campaigns.length
    ? campaigns.reduce((sum, campaign) => sum + campaign.metrics.averageCtr, 0) / campaigns.length
    : 0;

  const adsSummary = {
    activeCampaigns: campaigns.length,
    totalSpend: {
      cents: totalSpendCents,
      formatted: formatCurrency(totalSpendCents)
    },
    averageCtr: `${totalCtr.toFixed(2)}%`
  };

  const adPlacements = campaigns.map((campaign) => ({
    id: `placement-${campaign.id}`,
    name: campaign.name,
    surface: campaign.placement.surface,
    budgetLabel: `${formatCurrency(campaign.budget.dailyCents, campaign.budget.currency)}/day`
  }));

  const adTags = campaigns.flatMap((campaign) =>
    campaign.targeting.keywords.slice(0, 3).map((keyword) => ({
      campaignId: campaign.id,
      category: 'Keyword',
      label: keyword
    }))
  );

  const upcomingAssignments = assignments
    .map((assignment) => ({
      ...assignment,
      metadata: safeJsonParse(assignment.metadata, {}),
      courseTitle: assignment.courseTitle,
      dueDate: (() => {
        if (assignment.courseReleaseAt && Number.isFinite(Number(assignment.dueOffsetDays))) {
          const base = new Date(assignment.courseReleaseAt);
          return new Date(base.getTime() + Number(assignment.dueOffsetDays ?? 0) * DAY_IN_MS);
        }
        return null;
      })()
    }))
    .filter((assignment) => assignment.dueDate && assignment.dueDate >= now);

  const assessmentOverview = [
    {
      id: 'active-assessments',
      label: 'Active assessments',
      value: assignments.length
    },
    {
      id: 'pending-grading',
      label: 'Pending grading',
      value: assignments.filter((assignment) => assignment.metadata?.status === 'pending').length
    }
  ];

  const learningPace = buildLearningPace(
    ebookProgressRows.map((progress) => ({
      completedAt: progress.completedAt ?? now,
      durationMinutes: Number(progress.progressPercent ?? 0)
    })),
    now
  );

  const searchIndex = [
    ...courses.map((course) => ({
      id: `search-course-${course.id}`,
      role: 'instructor',
      type: 'Course',
      title: course.title,
      url: '/dashboard/instructor/courses/manage'
    })),
    ...tutorProfiles.map((profile) => ({
      id: `search-tutor-${profile.id}`,
      role: 'instructor',
      type: 'Tutor',
      title: profile.displayName ?? resolveName(user.firstName, user.lastName, user.email),
      url: '/dashboard/instructor/tutor-management'
    }))
  ];

  const profileStats = [
    { label: 'Cohorts', value: `${courses.length} active` },
    { label: 'Communities', value: `${communityMemberships.length} managed` },
    { label: 'Tutor bookings', value: `${tutorBookings.length} total` }
  ];

  const profileBio = `Currently coaching ${courses.length} cohort${courses.length === 1 ? '' : 's'} and stewarding ${
    communityMemberships.length
  } community${communityMemberships.length === 1 ? '' : 'ies'}.`;

  return {
    role: { id: 'instructor', label: 'Instructor' },
    dashboard: {
      metrics,
      bookings: {
        pipeline: pipelineBookings
      },
      tutors: {
        roster,
        availability: availabilitySummary,
        notifications: tutorNotifications
      },
      communities: {
        manageDeck
      },
      pricing: {
        subscriptions: paywallSummary
      },
      ads: {
        summary: adsSummary,
        active: campaigns,
        placements: adPlacements,
        tags: adTags
      },
      assessments: {
        overview: assessmentOverview,
        timeline: {
          upcoming: upcomingAssignments.map((assignment) => ({
            id: `assignment-${assignment.id}`,
            course: assignment.courseTitle,
            type: 'Assignment',
            dueDate: formatDateTime(assignment.dueDate, {
              dateStyle: 'medium',
              timeStyle: undefined
            })
          }))
        }
      },
      analytics: {
        learningPace
      }
    },
    profileStats,
    profileBio,
    profileTitleSegment: 'Instructor operations overview',
    searchIndex
  };
}

export function buildCommunityDashboard() {
  return null;
}

export default class DashboardService {
  static async getDashboardForUser(userId, { referenceDate = new Date() } = {}) {
    const { default: UserModel } = await import('../models/UserModel.js');
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    const instructorData = await loadInstructorEntities({ instructorId: user.id });
    const instructorSnapshot = buildInstructorDashboard({ user, now: referenceDate, ...instructorData }) ?? undefined;
    let operatorSnapshot;
    if (['admin', 'operator'].includes(user.role)) {
      operatorSnapshot = await getOperatorDashboardService().build({ user, now: referenceDate });
    }

    const dashboards = {};
    const searchIndex = [];
    if (instructorSnapshot) {
      dashboards.instructor = instructorSnapshot.dashboard;
      searchIndex.push(...instructorSnapshot.searchIndex);
    }
    if (operatorSnapshot) {
      dashboards.admin = operatorSnapshot.dashboard;
      searchIndex.push(...operatorSnapshot.searchIndex);
    }

    const roles = [];
    if (operatorSnapshot) {
      roles.push({ id: 'admin', label: 'Admin' });
    }
    if (instructorSnapshot) {
      roles.push({ id: 'instructor', label: 'Instructor' });
    }
    if (user.role && !roles.some((role) => role.id === user.role)) {
      roles.push({ id: user.role, label: user.role.charAt(0).toUpperCase() + user.role.slice(1) });
    }

    const profileStats = [
      ...(instructorSnapshot?.profileStats ?? []),
      ...(operatorSnapshot?.profileStats ?? [])
    ];
    const profileBioSegments = [];
    if (instructorSnapshot?.profileBio) {
      profileBioSegments.push(instructorSnapshot.profileBio);
    }
    if (operatorSnapshot?.profileBio) {
      profileBioSegments.push(operatorSnapshot.profileBio);
    }
    const profileBio = profileBioSegments.join(' ').trim() || null;

    const profile = {
      id: user.id,
      name: resolveName(user.firstName, user.lastName, user.email),
      email: user.email,
      avatar: buildAvatarUrl(user.email),
      title: instructorSnapshot?.profileTitleSegment ?? operatorSnapshot?.profileTitleSegment ?? null,
      bio: profileBio,
      stats: profileStats,
      feedHighlights: []
    };

    return {
      profile,
      roles,
      dashboards,
      searchIndex
    };
  }
}
