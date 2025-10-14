import crypto from 'node:crypto';

import db from '../config/database.js';
import UserModel from '../models/UserModel.js';
import UserPrivacySettingModel from '../models/UserPrivacySettingModel.js';
import UserFollowModel from '../models/UserFollowModel.js';
import FollowRecommendationModel from '../models/FollowRecommendationModel.js';
import PlatformSettingsService from './PlatformSettingsService.js';
import IdentityVerificationService from './IdentityVerificationService.js';

function safeJsonParse(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(toNumber(value));
}

function normaliseStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      const parsed = safeJsonParse(trimmed, []);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry).trim())
          .filter((entry) => entry.length > 0);
      }
    }
    return trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === 'object') {
    return Object.values(value)
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

function formatPercentage(value, digits = 2) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    return '0.00%';
  }
  return `${(numeric * 100).toFixed(digits)}%`;
}

function formatRoasFromCents(revenueCents, spendCents) {
  const spend = Number(spendCents ?? 0);
  const revenue = Number(revenueCents ?? 0);
  if (spend <= 0) return null;
  const ratio = revenue / spend;
  if (!Number.isFinite(ratio)) return null;
  return `${ratio.toFixed(2)}x`;
}

function formatScheduleRange(startAt, endAt) {
  if (!startAt && !endAt) {
    return 'Schedule pending';
  }
  if (startAt && endAt) {
    return `${formatDateTime(startAt, { dateStyle: 'medium' })} – ${formatDateTime(endAt, { dateStyle: 'medium' })}`;
  }
  if (startAt) {
    return `Starts ${formatDateTime(startAt, { dateStyle: 'medium' })}`;
  }
  return `Runs until ${formatDateTime(endAt, { dateStyle: 'medium' })}`;
}

function accumulateCurrency(map, currency, cents) {
  if (!currency) return;
  const current = map.get(currency) ?? 0;
  map.set(currency, current + Number(cents ?? 0));
}

function capitalise(value) {
  if (!value) return '';
  const stringValue = String(value);
  if (!stringValue.length) return '';
  return stringValue.charAt(0).toUpperCase() + stringValue.slice(1);
}

function resolvePlacementSurface(campaign) {
  const featureFlag = campaign.metadata?.featureFlag;
  if (typeof featureFlag === 'string' && featureFlag.includes('explorer')) {
    return 'Explorer';
  }
  if (typeof featureFlag === 'string' && featureFlag.includes('feed')) {
    return 'Learning feed';
  }
  if (campaign.metadata?.promotedCommunityId) {
    return 'Community spotlight';
  }
  return 'Learning feed';
}

function resolvePlacementSlot(campaign) {
  switch (campaign.objective) {
    case 'conversions':
      return 'Conversion spotlight';
    case 'leads':
      return 'Lead capture hero';
    case 'traffic':
      return 'Traffic accelerator';
    case 'awareness':
    default:
      return 'Awareness banner';
  }
}

function buildPlacementTags(campaign, keywords, audiences) {
  const tags = new Set();
  if (campaign.objective) {
    tags.add(`Objective · ${capitalise(campaign.objective)}`);
  }
  const featureFlag = campaign.metadata?.featureFlag;
  if (featureFlag) {
    tags.add(`Flag · ${featureFlag}`);
  }
  const promotedCommunityId = campaign.metadata?.promotedCommunityId;
  if (promotedCommunityId) {
    tags.add(`Community · #${promotedCommunityId}`);
  }
  keywords.slice(0, 2).forEach((keyword) => tags.add(`Keyword · ${keyword}`));
  audiences.slice(0, 2).forEach((audience) => tags.add(`Audience · ${audience}`));
  return Array.from(tags);
}

export function buildAvatarUrl(email) {
  const hash = crypto.createHash('md5').update(String(email).trim().toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=160`;
}

export function formatCurrency(amountCents, currency = 'USD') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  });
  const amount = Number(amountCents ?? 0) / 100;
  return formatter.format(amount);
}

export function formatReleaseOffsetLabel(offsetDays) {
  const offset = Number.isFinite(Number(offsetDays)) ? Number(offsetDays) : null;
  if (offset === null || Number.isNaN(offset) || offset <= 0) {
    return 'Launch week';
  }
  if (offset % 7 === 0) {
    const week = offset / 7 + 1;
    return `Week ${week}`;
  }
  return `Day ${offset}`;
}

export function humanizeRelativeTime(date, referenceDate = new Date()) {
  if (!date) return 'Unknown';
  const target = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  const diffMs = referenceDate.getTime() - target.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
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
  const diffYears = Math.round(diffDays / 365);
  return `${diffYears}y ago`;
}

export function calculateLearningStreak(completionDates, referenceDate = new Date()) {
  if (!completionDates?.length) {
    return { current: 0, longest: 0 };
  }

  const daySet = new Set();
  completionDates.forEach((date) => {
    if (!date) return;
    const resolved = typeof date === 'string' ? new Date(date) : date;
    const key = resolved.toISOString().slice(0, 10);
    daySet.add(key);
  });

  const sortedDays = Array.from(daySet)
    .sort()
    .map((iso) => new Date(`${iso}T00:00:00Z`));

  let longest = 0;
  let streak = 1;
  for (let i = 1; i < sortedDays.length; i += 1) {
    const diffDays = (sortedDays[i].getTime() - sortedDays[i - 1].getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays === 1) {
      streak += 1;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak);

  const todayKey = referenceDate.toISOString().slice(0, 10);
  let cursor = new Date(`${todayKey}T00:00:00Z`);
  let current = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return { current, longest };
}

export function buildLearningPace(completions, referenceDate = new Date()) {
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(referenceDate.getTime() - offset * 24 * 60 * 60 * 1000);
    const key = day.toLocaleDateString('en-US', { weekday: 'short' });
    days.push({ key, minutes: 0 });
  }

  completions.forEach((completion) => {
    if (!completion.completedAt) return;
    const completedAt = typeof completion.completedAt === 'string'
      ? new Date(completion.completedAt)
      : completion.completedAt;
    const diffDays = Math.floor(
      (referenceDate.setHours(0, 0, 0, 0) - completedAt.setHours(0, 0, 0, 0)) /
        (24 * 60 * 60 * 1000)
    );
    if (diffDays >= 0 && diffDays < 7) {
      const index = 6 - diffDays;
      if (days[index]) {
        days[index].minutes += Number(completion.durationMinutes ?? 0);
      }
    }
  });

  return days.map((entry) => ({ day: entry.key, minutes: entry.minutes }));
}

export function buildCommunityDashboard({
  user,
  now,
  communityMemberships,
  communityStats,
  communityResources,
  communityPosts,
  communityMessages,
  communityMessageContributions,
  communityAssignments,
  liveClassrooms,
  tutorBookings,
  adsCampaigns,
  adsMetrics,
  communityPaywallTiers,
  communitySubscriptions
}) {
  const managedCommunityIds = new Set();
  const communityLookup = new Map();

  communityMemberships.forEach((membership) => {
    const communityId = Number(membership.communityId);
    if (!Number.isFinite(communityId)) return;
    const normalised = {
      communityId,
      communityName: membership.communityName ?? `Community ${communityId}`,
      role: membership.role ?? 'member',
      status: membership.status ?? 'pending',
      ownerId: Number(membership.ownerId ?? membership.userId ?? 0),
      joinedAt: membership.joinedAt ? new Date(membership.joinedAt) : null,
      metadata: safeJsonParse(membership.membershipMetadata, {})
    };
    communityLookup.set(communityId, normalised);
    if (normalised.ownerId === user.id || normalised.role !== 'member') {
      managedCommunityIds.add(communityId);
    }
  });

  communityPaywallTiers.forEach((tier) => {
    const communityId = Number(tier.communityId);
    if (!Number.isFinite(communityId)) return;
    const ownerId = Number(tier.ownerId);
    if (ownerId && ownerId === user.id) {
      managedCommunityIds.add(communityId);
      if (!communityLookup.has(communityId)) {
        communityLookup.set(communityId, {
          communityId,
          communityName: tier.communityName ?? `Community ${communityId}`,
          role: 'owner',
          status: 'active',
          ownerId,
          joinedAt: null,
          metadata: {}
        });
      }
    }
  });

  liveClassrooms.forEach((session) => {
    const communityId = Number(session.communityId);
    if (!Number.isFinite(communityId)) return;
    if (managedCommunityIds.has(communityId)) return;
    if (session.instructorId && Number(session.instructorId) === user.id) {
      managedCommunityIds.add(communityId);
      communityLookup.set(communityId, {
        communityId,
        communityName: session.communityName ?? `Community ${communityId}`,
        role: 'host',
        status: session.status ?? 'scheduled',
        ownerId: Number(session.instructorId),
        joinedAt: session.startAt ? new Date(session.startAt) : null,
        metadata: safeJsonParse(session.metadata, {})
      });
    }
  });

  if (managedCommunityIds.size === 0) {
    return null;
  }

  const statsByCommunity = new Map();
  communityStats.forEach((stat) => {
    const communityId = Number(stat.community_id ?? stat.communityId);
    if (!Number.isFinite(communityId)) return;
    statsByCommunity.set(communityId, {
      activeMembers: Number(stat.active_members ?? stat.activeMembers ?? 0),
      pendingMembers: Number(stat.pending_members ?? stat.pendingMembers ?? 0),
      moderators: Number(stat.moderators ?? stat.moderatorCount ?? stat.moderator_count ?? 0),
      escalationsOpen: Number(stat.escalations_open ?? stat.escalationsOpen ?? 0),
      incidentsOpen: Number(stat.incidents_open ?? stat.incidentsOpen ?? 0)
    });
  });

  const liveSessions = liveClassrooms.map((session) => ({
    ...session,
    startAt: session.startAt ? new Date(session.startAt) : null,
    endAt: session.endAt ? new Date(session.endAt) : null,
    metadata: safeJsonParse(session.metadata, {})
  }));

  const tutorBookingsNormalised = tutorBookings.map((booking) => ({
    ...booking,
    scheduledStart: booking.scheduledStart ? new Date(booking.scheduledStart) : null,
    metadata: safeJsonParse(booking.metadata, {})
  }));

  const contributionByCommunity = new Map();
  communityMessageContributions.forEach((row) => {
    const communityId = Number(row.communityId ?? row.community_id);
    if (!Number.isFinite(communityId)) return;
    contributionByCommunity.set(communityId, Number(row.contribution_count ?? 0));
  });

  const incidentsFromMessages = communityMessages
    .map((message) => {
      const metadata = safeJsonParse(message.metadata, {});
      if (!metadata.flagged && !metadata.escalation) return null;
      const communityId = Number(message.communityId ?? metadata.communityId ?? 0);
      if (!managedCommunityIds.has(communityId)) return null;
      return {
        id: `incident-${message.id}`,
        communityId,
        communityName: message.communityName ?? communityLookup.get(communityId)?.communityName ?? 'Community',
        severity: metadata.severity ?? 'medium',
        status: metadata.escalation?.status ?? 'triage',
        openedAt: message.deliveredAt ? new Date(message.deliveredAt) : null,
        owner: metadata.escalation?.owner ?? metadata.moderator ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Moderator',
        summary: metadata.summary ?? (metadata.flaggedReason ?? message.body?.slice(0, 120) ?? 'Flagged conversation')
      };
    })
    .filter(Boolean);

  const totalActiveMembers = Array.from(managedCommunityIds).reduce((total, communityId) => {
    const stats = statsByCommunity.get(communityId);
    return total + Number(stats?.activeMembers ?? 0);
  }, 0);

  const totalPendingMembers = Array.from(managedCommunityIds).reduce((total, communityId) => {
    const stats = statsByCommunity.get(communityId);
    return total + Number(stats?.pendingMembers ?? 0);
  }, 0);

  const totalModerators = Array.from(managedCommunityIds).reduce((total, communityId) => {
    const stats = statsByCommunity.get(communityId);
    return total + Number(stats?.moderators ?? 0);
  }, 0);

  const engagementMessages = communityMessages.filter((message) => {
    const communityId = Number(message.communityId ?? 0);
    return managedCommunityIds.has(communityId);
  });

  const metrics = [
    {
      label: 'Active members',
      value: formatNumber(totalActiveMembers),
      change:
        totalPendingMembers > 0
          ? `+${formatNumber(totalPendingMembers)} awaiting approval`
          : totalActiveMembers > 0
            ? 'Roster steady'
            : 'Invite members',
      trend: totalPendingMembers > 0 ? 'up' : 'steady'
    },
    {
      label: 'Moderator coverage',
      value: `${formatNumber(totalModerators)} leaders`,
      change:
        totalModerators > 0
          ? `${Math.max(1, Math.round(totalActiveMembers / Math.max(totalModerators, 1)))} members per lead`
          : 'Assign moderators',
      trend: totalModerators > 0 ? 'up' : 'down'
    },
    {
      label: 'Weekly contributions',
      value: `${formatNumber(engagementMessages.length)}`,
      change:
        engagementMessages.length > 0
          ? `${formatNumber(incidentsFromMessages.length)} escalations`
          : 'No logged activity',
      trend: engagementMessages.length > incidentsFromMessages.length ? 'up' : 'steady'
    },
    {
      label: 'Automation readiness',
      value: `${communityResources.filter((resource) => safeJsonParse(resource.metadata, {}).automation === true).length} playbooks`,
      change: `${communityAssignments.length} open assignments`,
      trend: communityAssignments.length > 0 ? 'up' : 'steady'
    }
  ];

  const healthDeck = Array.from(managedCommunityIds).map((communityId) => {
    const lookup = communityLookup.get(communityId);
    const stats = statsByCommunity.get(communityId) ?? {
      activeMembers: 0,
      pendingMembers: 0,
      moderators: 0,
      incidentsOpen: 0,
      escalationsOpen: 0
    };
    const contributions = contributionByCommunity.get(communityId) ?? 0;
    const activityScore = stats.activeMembers + stats.pendingMembers > 0
      ? stats.activeMembers / (stats.activeMembers + stats.pendingMembers)
      : 0;
    let healthLabel = 'Stable';
    if (activityScore >= 0.85) healthLabel = 'Excellent';
    else if (activityScore >= 0.7) healthLabel = 'Healthy';
    else if (activityScore > 0) healthLabel = 'Needs attention';
    const backlog = stats.escalationsOpen + stats.incidentsOpen;
    const trend = backlog > 0
      ? `${backlog} open escalation${backlog === 1 ? '' : 's'}`
      : contributions > 0
        ? `${formatNumber(contributions)} posts`
        : 'Recruit momentum';
    return {
      id: `community-${communityId}`,
      name: lookup?.communityName ?? `Community ${communityId}`,
      members: `${formatNumber(stats.activeMembers)} active`,
      moderators: `${formatNumber(stats.moderators)} moderators`,
      health: healthLabel,
      trend,
      approvalsPending: stats.pendingMembers,
      incidentsOpen: stats.incidentsOpen,
      escalationsOpen: stats.escalationsOpen
    };
  });

  const runbooks = communityResources
    .filter((resource) => managedCommunityIds.has(Number(resource.communityId ?? resource.community_id ?? 0)))
    .map((resource) => {
      const tags = safeJsonParse(resource.tags, []);
      const metadata = safeJsonParse(resource.metadata, {});
      return {
        id: `resource-${resource.id}`,
        title: resource.title ?? 'Operations playbook',
        owner: metadata.owner ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Ops team',
        updatedAt: resource.publishedAt
          ? formatDateTime(resource.publishedAt, { dateStyle: 'medium', timeStyle: undefined })
          : 'Draft',
        tags: Array.isArray(tags) && tags.length ? tags.slice(0, 4) : ['Runbook'],
        automationReady: metadata.automation === true
      };
    });

  const escalations = communityAssignments
    .filter((assignment) => managedCommunityIds.has(Number(assignment.communityId ?? assignment.courseId ?? 0)))
    .map((assignment) => {
      const metadata = safeJsonParse(assignment.metadata, {});
      const dueOffsetDays = Number(assignment.dueOffsetDays ?? metadata.dueOffsetDays ?? 0);
      const dueDate = assignment.enrollmentStartedAt
        ? new Date(new Date(assignment.enrollmentStartedAt).getTime() + dueOffsetDays * DAY_IN_MS)
        : now;
      return {
        id: `assignment-${assignment.id}`,
        title: assignment.title ?? 'Operational task',
        owner: metadata.owner ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Community team',
        status: metadata.status ?? 'open',
        due: formatDateTime(dueDate, { dateStyle: 'medium', timeStyle: undefined }),
        community: assignment.courseTitle ?? metadata.communityName ?? 'Community'
      };
    });

  const upcomingEvents = liveSessions
    .filter((session) => session.startAt && managedCommunityIds.has(Number(session.communityId ?? 0)))
    .sort((a, b) => a.startAt - b.startAt)
    .map((session) => ({
      id: `event-${session.id}`,
      title: session.title ?? 'Live session',
      date: formatDateTime(session.startAt, { dateStyle: 'medium', timeStyle: 'short' }),
      facilitator: session.hostName ?? session.metadata?.facilitator ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Host',
      seats: `${Number(session.reservedSeats ?? 0)}/${Number(session.capacity ?? 0)} booked`,
      status: session.status ?? 'scheduled'
    }));

  const tutorPods = tutorBookingsNormalised
    .filter((booking) => managedCommunityIds.has(Number(booking.communityId ?? 0)))
    .map((booking) => ({
      id: `tutor-${booking.id}`,
      mentor: booking.tutorName ?? booking.metadata.tutor ?? 'Mentor',
      focus: booking.metadata.topic ?? 'Mentorship session',
      scheduled:
        booking.scheduledStart && booking.scheduledStart >= now
          ? formatDateTime(booking.scheduledStart, { dateStyle: 'medium', timeStyle: 'short' })
          : 'Awaiting scheduling',
      status: booking.status ?? 'pending'
    }));

  const broadcasts = communityPosts
    .filter((post) => managedCommunityIds.has(Number(post.communityId ?? post.community_id ?? 0)))
    .map((post) => ({
      id: `broadcast-${post.id}`,
      title: post.title ?? 'Announcement',
      stage: post.status === 'published' ? 'Published' : 'Draft',
      release: post.publishedAt
        ? formatDateTime(post.publishedAt, { dateStyle: 'medium', timeStyle: undefined })
        : 'Unscheduled',
      channel: post.channel ?? 'Feed'
    }));

  const experimentsMetrics = new Map();
  adsMetrics.forEach((metric) => {
    const campaignId = Number(metric.campaignId ?? metric.campaign_id);
    if (!Number.isFinite(campaignId)) return;
    const list = experimentsMetrics.get(campaignId) ?? [];
    list.push({
      ...metric,
      metricDate: metric.metricDate ? new Date(metric.metricDate) : null,
      conversions: Number(metric.conversions ?? 0),
      revenueCents: Number(metric.revenueCents ?? metric.revenue_cents ?? 0)
    });
    experimentsMetrics.set(campaignId, list);
  });

  const experiments = adsCampaigns
    .map((campaign) => {
      const metadata = safeJsonParse(campaign.metadata, {});
      const communityId = Number(metadata.promotedCommunityId ?? metadata.communityId ?? 0);
      if (communityId && !managedCommunityIds.has(communityId)) return null;
      const series = (experimentsMetrics.get(Number(campaign.id)) ?? []).sort(
        (a, b) => (b.metricDate?.getTime() ?? 0) - (a.metricDate?.getTime() ?? 0)
      );
      const latest = series[0];
      const previous = series[1];
      const conversionDelta = latest && previous ? latest.conversions - previous.conversions : latest?.conversions ?? 0;
      const hypothesis = latest
        ? `${conversionDelta >= 0 ? '+' : '−'}${Math.abs(conversionDelta)} conversions · ${formatCurrency(
            latest.revenueCents,
            campaign.spendCurrency ?? 'USD'
          )}`
        : 'Awaiting telemetry';
      return {
        id: `experiment-${campaign.id}`,
        name: campaign.name ?? 'Growth experiment',
        status: campaign.status ?? 'draft',
        community: communityId ? communityLookup.get(communityId)?.communityName ?? `Community ${communityId}` : 'Cross-community',
        hypothesis
      };
    })
    .filter(Boolean);

  const tierStats = new Map();
  communitySubscriptions.forEach((subscription) => {
    const communityId = Number(subscription.communityId ?? subscription.community_id ?? 0);
    if (!managedCommunityIds.has(communityId)) return;
    const tierName = subscription.tierName ?? subscription.tier_name ?? 'Tier';
    const key = `${communityId}-${tierName}`;
    const stats = tierStats.get(key) ?? {
      communityId,
      communityName: subscription.communityName ?? communityLookup.get(communityId)?.communityName ?? `Community ${communityId}`,
      tierName,
      currency: subscription.currency ?? subscription.currency_code ?? 'USD',
      priceCents: Number(subscription.priceCents ?? subscription.price_cents ?? 0),
      active: 0,
      cancelled: 0,
      renewals: []
    };
    if (subscription.status === 'active') {
      stats.active += 1;
      if (subscription.currentPeriodEnd) {
        stats.renewals.push(new Date(subscription.currentPeriodEnd));
      }
    } else if (subscription.status === 'cancelled') {
      stats.cancelled += 1;
    }
    tierStats.set(key, stats);
  });

  const tiers = Array.from(tierStats.values()).map((tier, index) => {
    const nextRenewal = tier.renewals.sort((a, b) => (a?.getTime() ?? 0) - (b?.getTime() ?? 0))[0] ?? null;
    return {
      id: `tier-${index}`,
      name: `${tier.communityName} · ${tier.tierName}`,
      price: formatCurrency(tier.priceCents, tier.currency),
      members: `${formatNumber(tier.active)} active`,
      churn: tier.cancelled > 0 ? `${formatNumber(tier.cancelled)} cancellations` : 'Retention steady',
      renewal: nextRenewal ? formatDateTime(nextRenewal, { dateStyle: 'medium', timeStyle: undefined }) : 'Auto-renewal'
    };
  });

  const totalSubscriptionRevenue = Array.from(tierStats.values()).reduce(
    (total, tier) => total + tier.priceCents * tier.active,
    0
  );

  const monetisationInsights = [];
  if (tiers.length > 0) {
    const topTier = tiers.reduce((current, candidate) => {
      const currentMembers = Number(current.members.replace(/\D/g, '')) || 0;
      const candidateMembers = Number(candidate.members.replace(/\D/g, '')) || 0;
      return candidateMembers > currentMembers ? candidate : current;
    }, tiers[0]);
    monetisationInsights.push(`${topTier.name} leads premium adoption.`);
  }
  if (totalSubscriptionRevenue > 0) {
    monetisationInsights.push(
      `${formatCurrency(totalSubscriptionRevenue, tiers[0]?.currency ?? 'USD')} in recurring revenue across communities.`
    );
  }
  if (experiments.length > 0) {
    monetisationInsights.push('Active growth experiments are feeding new membership cohorts.');
  }

  const communicationsHighlights = engagementMessages.slice(0, 12).map((message) => {
    const metadata = safeJsonParse(message.metadata, {});
    const communityId = Number(message.communityId ?? 0);
    return {
      id: `highlight-${message.id}`,
      community: message.communityName ?? communityLookup.get(communityId)?.communityName ?? 'Community',
      preview: message.body?.slice(0, 140) ?? 'New update shared',
      tags: Array.isArray(metadata.tags) && metadata.tags.length ? metadata.tags.slice(0, 3) : ['Update'],
      postedAt: message.deliveredAt ? humanizeRelativeTime(message.deliveredAt, now) : 'Recently',
      reactions: metadata.reactions ?? 0
    };
  });

  const moderators = communityMemberships
    .filter((membership) => managedCommunityIds.has(Number(membership.communityId)) && membership.role && membership.role !== 'member')
    .map((membership) => {
      const metadata = safeJsonParse(membership.membershipMetadata, {});
      return {
        id: `moderator-${membership.membershipId ?? membership.id ?? `${membership.communityId}-${membership.userId}`}`,
        community: membership.communityName ?? `Community ${membership.communityId}`,
        role: membership.role ?? 'Moderator',
        timezone: metadata.timezone ?? 'UTC',
        coverage: metadata.coverage ?? 'Full-time'
      };
    });

  const communicationsTrends = Array.from(managedCommunityIds).map((communityId) => {
    const contributions = contributionByCommunity.get(communityId) ?? 0;
    const stats = statsByCommunity.get(communityId) ?? { activeMembers: 0, pendingMembers: 0 };
    const contributionRate = stats.activeMembers > 0 ? Math.round((contributions / stats.activeMembers) * 100) : 0;
    return {
      id: `trend-${communityId}`,
      metric: communityLookup.get(communityId)?.communityName ?? `Community ${communityId}`,
      current: `${contributionRate}% active`,
      previous: stats.pendingMembers > 0 ? `${stats.pendingMembers} pending approvals` : 'All members onboarded'
    };
  });

  const searchIndex = [
    ...healthDeck.map((entry) => ({
      id: `search-community-overview-${entry.id}`,
      role: 'community',
      type: 'Community',
      title: entry.name,
      url: '/dashboard/community/operations'
    })),
    ...runbooks.map((runbook) => ({
      id: `search-community-runbook-${runbook.id}`,
      role: 'community',
      type: 'Runbook',
      title: runbook.title,
      url: '/dashboard/community/operations'
    })),
    ...upcomingEvents.map((event) => ({
      id: `search-community-event-${event.id}`,
      role: 'community',
      type: 'Event',
      title: event.title,
      url: '/dashboard/community/programming'
    })),
    ...tiers.map((tier) => ({
      id: `search-community-tier-${tier.id}`,
      role: 'community',
      type: 'Tier',
      title: tier.name,
      url: '/dashboard/community/monetisation'
    }))
  ];

  const profileStats = [
    { label: 'Communities', value: `${managedCommunityIds.size} stewarded` },
    { label: 'Moderators', value: `${formatNumber(moderators.length)} leads` },
    { label: 'Recurring revenue', value: formatCurrency(totalSubscriptionRevenue, tiers[0]?.currency ?? 'USD') }
  ];

  const bioSegments = [];
  if (managedCommunityIds.size > 0) {
    bioSegments.push(`stewarding ${managedCommunityIds.size} community${managedCommunityIds.size === 1 ? '' : 'ies'}`);
  }
  if (totalActiveMembers > 0) {
    bioSegments.push(`supporting ${formatNumber(totalActiveMembers)} active members`);
  }
  if (tiers.length > 0) {
    bioSegments.push(`shipping ${tiers.length} premium tier${tiers.length === 1 ? '' : 's'}`);
  }
  const profileBio = bioSegments.length ? `Currently ${bioSegments.join(', ')}.` : '';

  return {
    role: { id: 'community', label: 'Community' },
    dashboard: {
      metrics,
      health: {
        overview: healthDeck,
        moderators,
        communicationsTrends
      },
      operations: {
        runbooks,
        escalations
      },
      programming: {
        upcomingEvents,
        tutorPods,
        broadcasts
      },
      monetisation: {
        tiers,
        experiments,
        insights: monetisationInsights
      },
      safety: {
        incidents: incidentsFromMessages,
        backlog: escalations,
        moderators
      },
      communications: {
        highlights: communicationsHighlights,
        broadcasts,
        trends: communicationsTrends
      }
    },
    searchIndex,
    profileStats,
    profileBio
  };
}

export function buildInstructorDashboard({
  user,
  now,
  courses,
  courseEnrollments,
  modules,
  lessons,
  assignments,
  tutorProfiles,
  tutorAvailability,
  tutorBookings,
  liveClassrooms,
  assets,
  assetEvents,
  communityMemberships,
  communityStats,
  communityResources,
  communityPosts,
  adsCampaigns,
  adsMetrics,
  paywallTiers,
  communitySubscriptions,
  ebookRows,
  ebookProgressRows
}) {
  const lastThirtyWindow = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const communityStatsMap = new Map();
  communityStats.forEach((stat) => {
    const communityId = Number(stat.community_id ?? stat.communityId);
    communityStatsMap.set(communityId, {
      activeMembers: Number(stat.active_members ?? stat.activeMembers ?? 0),
      pendingMembers: Number(stat.pending_members ?? stat.pendingMembers ?? 0),
      moderators: Number(
        stat.moderators ?? stat.moderatorCount ?? stat.moderator_count ?? 0
      )
    });
  });

  const managedCommunityIds = new Set();
  const communityLookup = new Map();
  const managedCommunities = [];

  const upsertManagedCommunity = (communityId, payload) => {
    if (!communityLookup.has(communityId)) {
      communityLookup.set(communityId, payload);
      managedCommunities.push(payload);
    }
    managedCommunityIds.add(communityId);
  };

  communityMemberships.forEach((membership) => {
    const communityId = Number(membership.communityId);
    const normalized = {
      communityId,
      communityName: membership.communityName ?? `Community ${communityId}`,
      role: membership.role,
      status: membership.status,
      ownerId: membership.ownerId,
      membershipMetadata: membership.membershipMetadata
    };
    communityLookup.set(communityId, normalized);
    if (membership.ownerId === user.id || (membership.role && membership.role !== 'member')) {
      upsertManagedCommunity(communityId, normalized);
    }
  });

  paywallTiers.forEach((tier) => {
    const communityId = Number(tier.communityId);
    if (Number(tier.ownerId) === user.id) {
      const existing = communityLookup.get(communityId) ?? {
        communityId,
        communityName: tier.communityName ?? `Community ${communityId}`,
        role: 'owner',
        status: 'active',
        ownerId: tier.ownerId,
        membershipMetadata: '{}'
      };
      upsertManagedCommunity(communityId, existing);
    }
  });

  liveClassrooms.forEach((session) => {
    if (!session.communityId) return;
    const communityId = Number(session.communityId);
    const existing = communityLookup.get(communityId) ?? {
      communityId,
      communityName: session.communityName ?? `Community ${communityId}`,
      role: 'host',
      status: 'active',
      ownerId: user.id,
      membershipMetadata: '{}'
    };
    upsertManagedCommunity(communityId, existing);
  });

  const hasInstructorSignals =
    user.role === 'instructor' ||
    courses.length > 0 ||
    tutorProfiles.length > 0 ||
    managedCommunityIds.size > 0 ||
    liveClassrooms.length > 0 ||
    assets.length > 0;

  if (!hasInstructorSignals) {
    return null;
  }

  const enrollmentsByCourse = new Map();
  courseEnrollments.forEach((enrollment) => {
    const courseId = Number(enrollment.courseId);
    const list = enrollmentsByCourse.get(courseId) ?? [];
    list.push({ ...enrollment, metadata: safeJsonParse(enrollment.metadata, {}) });
    enrollmentsByCourse.set(courseId, list);
  });

  const courseSummaries = courses.map((course) => {
    const courseId = Number(course.id);
    const enrollments = enrollmentsByCourse.get(courseId) ?? [];
    const active = enrollments.filter((enrollment) => enrollment.status === 'active').length;
    const completed = enrollments.filter((enrollment) => enrollment.status === 'completed').length;
    const invited = enrollments.filter((enrollment) => enrollment.status === 'invited').length;
    const startedRecent = enrollments.filter(
      (enrollment) => enrollment.startedAt && new Date(enrollment.startedAt) >= lastThirtyWindow
    ).length;
    const total = enrollments.length;
    const priceAmount = Number(course.priceAmount ?? 0);
    return {
      id: courseId,
      title: course.title,
      status: course.status,
      releaseAt: course.releaseAt ? new Date(course.releaseAt) : null,
      priceAmount,
      priceCurrency: course.priceCurrency ?? 'USD',
      deliveryFormat: course.deliveryFormat,
      active,
      completed,
      invited,
      total,
      startedRecent,
      revenue: priceAmount * total,
      revenueRecent: priceAmount * startedRecent,
      summary: course.summary,
      metadata: safeJsonParse(course.metadata, {})
    };
  });

  const courseTotals = courseSummaries.reduce(
    (acc, course) => {
      acc.active += course.active;
      acc.completed += course.completed;
      acc.invited += course.invited;
      acc.total += course.total;
      acc.startedRecent += course.startedRecent;
      acc.revenue += course.revenue;
      acc.revenueRecent += course.revenueRecent;
      return acc;
    },
    { active: 0, completed: 0, invited: 0, total: 0, startedRecent: 0, revenue: 0, revenueRecent: 0 }
  );

  const modulesNormalised = modules.map((module) => ({
    id: Number(module.id),
    courseId: Number(module.courseId),
    title: module.title,
    position: Number(module.position ?? 0),
    releaseOffsetDays: Number(module.releaseOffsetDays ?? 0),
    metadata: safeJsonParse(module.metadata, {})
  }));

  const modulesByCourse = new Map();
  modulesNormalised.forEach((module) => {
    const list = modulesByCourse.get(module.courseId) ?? [];
    list.push(module);
    modulesByCourse.set(module.courseId, list);
  });

  const lessonsNormalised = lessons.map((lesson) => {
    const moduleOffset = Number(lesson.moduleReleaseOffsetDays ?? 0);
    let releaseDate = lesson.releaseAt ? new Date(lesson.releaseAt) : null;
    if (!releaseDate && lesson.courseReleaseAt) {
      const base = new Date(lesson.courseReleaseAt);
      releaseDate = new Date(base.getTime() + moduleOffset * 24 * 60 * 60 * 1000);
    }
    return {
      id: Number(lesson.id),
      courseId: Number(lesson.courseId),
      moduleId: Number(lesson.moduleId),
      courseTitle: lesson.courseTitle,
      title: lesson.title,
      releaseAt: releaseDate,
      durationMinutes: Number(lesson.durationMinutes ?? 0),
      metadata: safeJsonParse(lesson.metadata, {})
    };
  });

  const lessonsByModule = new Map();
  lessonsNormalised.forEach((lesson) => {
    if (!lesson.moduleId) return;
    const list = lessonsByModule.get(lesson.moduleId) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.moduleId, list);
  });

  const upcomingLessons = lessonsNormalised
    .filter((lesson) => lesson.releaseAt && lesson.releaseAt >= now)
    .sort((a, b) => a.releaseAt - b.releaseAt)
    .slice(0, 20);

  const assignmentsNormalised = assignments.map((assignment) => {
    const metadata = safeJsonParse(assignment.metadata, {});
    const base = assignment.courseReleaseAt ? new Date(assignment.courseReleaseAt) : new Date(now.getTime());
    const offset = Number(assignment.dueOffsetDays ?? 0);
    const dueDate = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
    return {
      id: Number(assignment.id),
      courseId: Number(assignment.courseId),
      moduleId: assignment.moduleId ? Number(assignment.moduleId) : null,
      courseTitle: assignment.courseTitle,
      title: assignment.title,
      dueDate,
      owner: metadata.owner ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
      metadata
    };
  });

  const assignmentsByModule = new Map();
  assignmentsNormalised.forEach((assignment) => {
    if (!assignment.moduleId) return;
    const list = assignmentsByModule.get(assignment.moduleId) ?? [];
    list.push(assignment);
    assignmentsByModule.set(assignment.moduleId, list);
  });

  const upcomingAssignments = assignmentsNormalised
    .filter((assignment) => assignment.dueDate && assignment.dueDate >= now)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 20);

  const liveSessions = liveClassrooms.map((session) => ({
    ...session,
    metadata: safeJsonParse(session.metadata, {}),
    startAt: session.startAt ? new Date(session.startAt) : null,
    endAt: session.endAt ? new Date(session.endAt) : null
  }));

  const upcomingLiveClasses = liveSessions
    .filter((session) => session.startAt && session.startAt >= now)
    .sort((a, b) => a.startAt - b.startAt);

  const tutorSlots = tutorAvailability.map((slot) => ({
    ...slot,
    metadata: safeJsonParse(slot.metadata, {}),
    startAt: slot.startAt ? new Date(slot.startAt) : null,
    endAt: slot.endAt ? new Date(slot.endAt) : null
  }));
  const upcomingTutorSlots = tutorSlots.filter((slot) => slot.startAt && slot.startAt >= now);

  const tutorBookingsNormalised = tutorBookings.map((booking) => ({
    ...booking,
    metadata: safeJsonParse(booking.metadata, {}),
    requestedAt: booking.requestedAt ? new Date(booking.requestedAt) : null,
    scheduledStart: booking.scheduledStart ? new Date(booking.scheduledStart) : null,
    scheduledEnd: booking.scheduledEnd ? new Date(booking.scheduledEnd) : null
  }));

  const pipelineBookings = tutorBookingsNormalised
    .filter((booking) => booking.status === 'requested')
    .map((booking) => ({
      id: `booking-${booking.id}`,
      status: 'Requested',
      learner: `${booking.learnerFirstName ?? ''} ${booking.learnerLastName ?? ''}`.trim() || 'Learner',
      requested: booking.requestedAt ? humanizeRelativeTime(booking.requestedAt, now) : 'Awaiting review',
      topic: booking.metadata.topic ?? 'Mentorship session'
    }));

  const confirmedBookings = tutorBookingsNormalised
    .filter((booking) => booking.status === 'confirmed')
    .map((booking) => ({
      id: `booking-${booking.id}`,
      topic: booking.metadata.topic ?? 'Mentorship session',
      learner: `${booking.learnerFirstName ?? ''} ${booking.learnerLastName ?? ''}`.trim() || 'Learner',
      date: formatDateTime(booking.scheduledStart, { dateStyle: 'medium', timeStyle: 'short' })
    }));

  const tutorProfileMap = new Map();
  tutorProfiles.forEach((profile) => {
    tutorProfileMap.set(Number(profile.id), { ...profile, metadata: safeJsonParse(profile.metadata, {}) });
  });

  const tutorScheduleMap = new Map();
  upcomingTutorSlots.forEach((slot) => {
    const tutorId = Number(slot.tutorId);
    const base = tutorScheduleMap.get(tutorId) ?? {
      mentor: slot.tutorName ?? tutorProfileMap.get(tutorId)?.displayName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      slots: 0,
      learners: 0,
      notes: new Set()
    };
    base.slots += 1;
    if (slot.metadata.channel) base.notes.add(`#${slot.metadata.channel}`);
    if (slot.metadata.durationMinutes) base.notes.add(`${slot.metadata.durationMinutes} mins`);
    tutorScheduleMap.set(tutorId, base);
  });

  tutorBookingsNormalised
    .filter((booking) => booking.status === 'confirmed')
    .forEach((booking) => {
      const tutorId = Number(booking.tutorId);
      const base = tutorScheduleMap.get(tutorId) ?? {
        mentor: tutorProfileMap.get(tutorId)?.displayName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        slots: 0,
        learners: 0,
        notes: new Set()
      };
      base.learners += 1;
      tutorScheduleMap.set(tutorId, base);
    });

  const tutorSchedule = Array.from(tutorScheduleMap.entries()).map(([tutorId, entry]) => ({
    id: `tutor-${tutorId}`,
    mentor: entry.mentor,
    slots: `${entry.slots} slot${entry.slots === 1 ? '' : 's'}`,
    learners: `${entry.learners} learner${entry.learners === 1 ? '' : 's'}`,
    notes: Array.from(entry.notes).join(' • ') || 'Capacity in sync'
  }));

  const assetIds = new Set(assetsNormalised.map((asset) => Number(asset.id)));
  const assetEventGroups = new Map();
  assetEvents.forEach((event) => {
    const assetId = Number(event.assetId);
    const list = assetEventGroups.get(assetId) ?? [];
    const occurredAt = event.occurredAt
      ? event.occurredAt instanceof Date
        ? event.occurredAt
        : new Date(event.occurredAt)
      : null;
    list.push({ ...event, occurredAt, metadata: safeJsonParse(event.metadata, {}) });
    assetEventGroups.set(assetId, list);
  });

  const managedCommunityNames = new Set(
    managedCommunities.map((community) => community.communityName?.toLowerCase()).filter(Boolean)
  );

  const ebookCatalogue = ebookRows
    .map((ebook) => {
      const assetId = Number(ebook.assetId);
      const metadata = safeJsonParse(ebook.metadata, {});
      const authors = safeJsonParse(ebook.authors, []);
      const cohortLabel = typeof metadata.cohort === 'string' ? metadata.cohort.toLowerCase() : '';
      const managedByCohort = cohortLabel
        ? Array.from(managedCommunityNames).some((name) => cohortLabel.includes(name.split(' ')[0]))
        : false;
      if (!assetIds.has(assetId) && !managedByCohort) {
        return null;
      }
      const events = assetEventGroups.get(assetId) ?? [];
      const downloads = events.filter((event) => event.eventType === 'viewed').length;
      const readers = ebookProgressRows.filter((progress) => Number(progress.ebookId) === Number(ebook.id));
      return {
        id: `ebook-${ebook.id}`,
        title: ebook.title,
        status: metadata.status ?? 'Published',
        downloads: downloads || readers.length,
        authors: Array.isArray(authors) ? authors.join(', ') : undefined,
        price: formatCurrency(ebook.priceAmount, ebook.currency ?? 'USD')
      };
    })
    .filter(Boolean);

  const ebookRevenue = ebookCatalogue.reduce((total, ebook) => {
    const match = ebookRows.find((row) => `ebook-${row.id}` == ebook.id);
    if (!match) return total;
      return total + Number(match.priceAmount ?? 0) * Number(ebook.downloads ?? 0);
    }, 0);

  const resolveManuscriptStage = (asset, latestEvent) => {
    if (asset.type === 'ebook' && asset.status === 'ready') {
      return 'Ready for distribution';
    }
    if (asset.status === 'ready') {
      return 'Packaged';
    }
    if (asset.status === 'processing') {
      return 'Conversion running';
    }
    if (latestEvent?.eventType === 'annotation-created') {
      return 'In editing';
    }
    if (latestEvent?.eventType === 'viewed') {
      return 'Peer review';
    }
    return 'Outlining';
  };

  const stageProgressMap = new Map([
    ['Outlining', 20],
    ['Peer review', 45],
    ['In editing', 60],
    ['Conversion running', 75],
    ['Packaged', 90],
    ['Ready for distribution', 100]
  ]);

  const actionsByStage = new Map([
    ['Outlining', ['Define chapter structure', 'Assign writing crew']],
    ['Peer review', ['Collect reviewer feedback', 'Track edits']],
    ['In editing', ['Resolve annotations', 'Prepare layout brief']],
    ['Conversion running', ['Validate export quality', 'QA accessibility']],
    ['Packaged', ['Upload to catalogue', 'Schedule launch']],
    ['Ready for distribution', ['Promote to learners', 'Bundle with cohorts']]
  ]);

  const creationPipelines = assetsNormalised
    .filter((asset) =>
      ['ebook', 'document', 'powerpoint', 'markdown', 'notion', 'google-doc'].includes(
        String(asset.type ?? '').toLowerCase()
      )
    )
    .map((asset) => {
      const events = (assetEventGroups.get(Number(asset.id)) ?? []).sort(
        (a, b) => {
          const aTime = a.occurredAt instanceof Date ? a.occurredAt.getTime() : 0;
          const bTime = b.occurredAt instanceof Date ? b.occurredAt.getTime() : 0;
          return aTime - bTime;
        }
      );
      const latestEvent = events[events.length - 1] ?? null;
      const stage = resolveManuscriptStage(asset, latestEvent);
      const progress = stageProgressMap.get(stage) ?? Math.min(90, 30 + events.length * 10);
      const nextActions = actionsByStage.get(stage) ?? ['Assign reviewer', 'Prepare launch checklist'];
      let latestActivity = null;
      if (latestEvent?.eventType === 'annotation-created' && latestEvent.metadata?.note) {
        latestActivity = latestEvent.metadata.note;
      } else if (latestEvent?.eventType) {
        latestActivity = latestEvent.eventType.replace(/[-_]/g, ' ');
      }
      const reference = asset.metadata?.deckVersion
        ? `Deck v${asset.metadata.deckVersion}`
        : asset.metadata?.ingestionPipeline ?? null;
      return {
        id: `manuscript-${asset.id}`,
        title: normaliseFilename(asset.originalFilename),
        stage,
        progress,
        lastUpdated: formatDateTime(asset.updatedAt ?? asset.createdAt, { dateStyle: 'medium', timeStyle: 'short' }),
        owner: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Instructor',
        nextActions,
        reference,
        latestActivity
      };
    });

  const metricsByCampaign = new Map();
  adsMetrics.forEach((metric) => {
    const campaignId = Number(metric.campaignId);
    const list = metricsByCampaign.get(campaignId) ?? [];
    list.push({
      ...metric,
      metricDate: metric.metricDate ? new Date(metric.metricDate) : null,
      metadata: safeJsonParse(metric.metadata, {})
    });
    metricsByCampaign.set(campaignId, list);
  });

  const relevantCampaigns = adsCampaigns
    .map((campaign) => ({ ...campaign, metadata: safeJsonParse(campaign.metadata, {}) }))
    .filter((campaign) => {
      if (campaign.createdBy === user.id) return true;
      const promotedCommunityId = campaign.metadata?.promotedCommunityId;
      return promotedCommunityId && managedCommunityIds.has(Number(promotedCommunityId));
    });

  const campaignsDetailed = relevantCampaigns.map((campaign) => {
    const metricsSeries = (metricsByCampaign.get(Number(campaign.id)) ?? [])
      .map((metric) => ({
        date: metric.metricDate ? new Date(metric.metricDate) : null,
        impressions: Number(metric.impressions ?? 0),
        clicks: Number(metric.clicks ?? 0),
        conversions: Number(metric.conversions ?? 0),
        spendCents: Number(metric.spendCents ?? 0),
        revenueCents: Number(metric.revenueCents ?? 0),
        metadata: metric.metadata
      }))
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

    const lifetime = metricsSeries.reduce(
      (acc, metric) => {
        acc.impressions += metric.impressions;
        acc.clicks += metric.clicks;
        acc.conversions += metric.conversions;
        acc.spendCents += metric.spendCents;
        acc.revenueCents += metric.revenueCents;
        return acc;
      },
      { impressions: 0, clicks: 0, conversions: 0, spendCents: 0, revenueCents: 0 }
    );

    const latestMetric = metricsSeries[0] ?? null;
    const previousMetric = metricsSeries[1] ?? null;
    const keywords = normaliseStringArray(campaign.targetingKeywords);
    const audiences = normaliseStringArray(campaign.targetingAudiences);
    const locations = normaliseStringArray(campaign.targetingLocations);
    const languages = normaliseStringArray(campaign.targetingLanguages);
    const startAt = campaign.startAt ? new Date(campaign.startAt) : null;
    const endAt = campaign.endAt ? new Date(campaign.endAt) : null;
    const spendCurrency = campaign.spendCurrency ?? campaign.budgetCurrency ?? 'USD';
    const budgetCurrency = campaign.budgetCurrency ?? spendCurrency;
    const spendCents = Number(campaign.spendTotalCents ?? 0);
    const budgetCents = Number(campaign.budgetDailyCents ?? 0);
    const cpcCents = Number(campaign.cpcCents ?? 0);
    const cpaCents = Number(campaign.cpaCents ?? 0);
    const placementSurface = resolvePlacementSurface(campaign);
    const placementSlot = resolvePlacementSlot(campaign);
    const placementTags = buildPlacementTags(campaign, keywords, audiences);

    return {
      campaign,
      metricsSeries,
      lifetime,
      latestMetric,
      previousMetric,
      keywords,
      audiences,
      locations,
      languages,
      startAt,
      endAt,
      spendCurrency,
      budgetCurrency,
      spendCents,
      budgetCents,
      cpcCents,
      cpaCents,
      placementSurface,
      placementSlot,
      placementTags
    };
  });

  const activeCampaignEntries = campaignsDetailed.filter((entry) => entry.campaign.status === 'active');

  const keywordSet = new Set();
  const audienceSet = new Set();
  const locationSet = new Set();
  const languageSet = new Set();
  const spendByCurrency = new Map();
  const revenueByCurrency = new Map();
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let latestSynced = null;

  campaignsDetailed.forEach((entry) => {
    entry.keywords.forEach((keyword) => keywordSet.add(keyword));
    entry.audiences.forEach((audience) => audienceSet.add(audience));
    entry.locations.forEach((location) => locationSet.add(location));
    entry.languages.forEach((language) => languageSet.add(language));
    if (entry.latestMetric?.date) {
      if (!latestSynced || entry.latestMetric.date > latestSynced) {
        latestSynced = entry.latestMetric.date;
      }
    }
  });

  activeCampaignEntries.forEach((entry) => {
    totalImpressions += entry.lifetime.impressions;
    totalClicks += entry.lifetime.clicks;
    totalConversions += entry.lifetime.conversions;
    accumulateCurrency(spendByCurrency, entry.spendCurrency, entry.lifetime.spendCents);
    accumulateCurrency(revenueByCurrency, entry.spendCurrency, entry.lifetime.revenueCents);
  });

  const spendCurrencies = Array.from(spendByCurrency.keys());
  const totalSpendCents = Array.from(spendByCurrency.values()).reduce((sum, value) => sum + value, 0);
  const totalRevenueCents = Array.from(revenueByCurrency.values()).reduce((sum, value) => sum + value, 0);
  const singleCurrency = spendCurrencies.length === 1 ? spendCurrencies[0] : null;
  const averageCtr = totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(2)}%` : '0.00%';
  const averageCpc =
    singleCurrency && totalClicks > 0
      ? `${formatCurrency(Math.round(totalSpendCents / totalClicks), singleCurrency)} / click`
      : '—';
  const averageCpa =
    singleCurrency && totalConversions > 0
      ? `${formatCurrency(Math.round(totalSpendCents / totalConversions), singleCurrency)} / acquisition`
      : '—';
  const roas = singleCurrency && totalSpendCents > 0 ? `${(totalRevenueCents / totalSpendCents).toFixed(2)}x` : '—';

  const summary = {
    activeCampaigns: activeCampaignEntries.length,
    totalImpressions,
    totalClicks,
    totalConversions,
    totalSpend: {
      currency: singleCurrency,
      cents: totalSpendCents,
      formatted: singleCurrency ? formatCurrency(totalSpendCents, singleCurrency) : 'Multi-currency spend'
    },
    averageCtr,
    averageCpc,
    averageCpa,
    roas,
    lastSyncedAt: latestSynced ? latestSynced.toISOString() : null,
    lastSyncedLabel: latestSynced ? formatDateTime(latestSynced, { dateStyle: 'medium', timeStyle: 'short' }) : null
  };

  const adsActive = activeCampaignEntries.map((entry) => {
    const { campaign, latestMetric, lifetime } = entry;
    return {
      id: `campaign-${campaign.id}`,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      spend: {
        currency: entry.spendCurrency,
        cents: entry.spendCents,
        formatted: formatCurrency(entry.spendCents, entry.spendCurrency),
        label: `Lifetime ${formatCurrency(entry.spendCents, entry.spendCurrency)}`
      },
      dailyBudget: {
        currency: entry.budgetCurrency,
        cents: entry.budgetCents,
        formatted: formatCurrency(entry.budgetCents, entry.budgetCurrency),
        label: `Daily ${formatCurrency(entry.budgetCents, entry.budgetCurrency)}`
      },
      performanceScore: Number(campaign.performanceScore ?? 0),
      ctr: formatPercentage(campaign.ctr ?? 0),
      cpc: `${formatCurrency(entry.cpcCents, entry.spendCurrency)} CPC`,
      cpa: `${formatCurrency(entry.cpaCents, entry.spendCurrency)} CPA`,
      metrics: {
        lastSyncedAt: latestMetric?.date ? latestMetric.date.toISOString() : null,
        lastSyncedLabel: latestMetric?.date ? formatDateTime(latestMetric.date, { dateStyle: 'medium' }) : null,
        impressions: lifetime.impressions,
        clicks: lifetime.clicks,
        conversions: lifetime.conversions,
        spendFormatted: formatCurrency(lifetime.spendCents, entry.spendCurrency),
        revenueFormatted: formatCurrency(lifetime.revenueCents, entry.spendCurrency),
        roas: formatRoasFromCents(lifetime.revenueCents, lifetime.spendCents)
      },
      placement: {
        surface: entry.placementSurface,
        slot: entry.placementSlot,
        tags: entry.placementTags,
        scheduleLabel: formatScheduleRange(entry.startAt, entry.endAt)
      },
      targeting: {
        keywords: entry.keywords,
        audiences: entry.audiences,
        locations: entry.locations,
        languages: entry.languages.map((language) => language.toUpperCase())
      },
      creative: {
        headline: campaign.creativeHeadline ?? '',
        description: campaign.creativeDescription ?? '',
        url: campaign.creativeUrl ?? ''
      }
    };
  });

  const adExperiments = campaignsDetailed
    .map((entry) => {
      if (!entry.latestMetric) return null;
      const { campaign, latestMetric, previousMetric } = entry;
      const conversionsDelta = previousMetric
        ? latestMetric.conversions - previousMetric.conversions
        : latestMetric.conversions;
      const deltaLabel = `${conversionsDelta >= 0 ? '+' : ''}${conversionsDelta}`;
      return {
        id: `experiment-${campaign.id}`,
        name: campaign.name,
        status: campaign.status === 'active' ? 'Live' : 'Completed',
        hypothesis: `${deltaLabel} conversions · ${formatCurrency(latestMetric.revenueCents, entry.spendCurrency)} revenue`,
        conversionsDeltaLabel: deltaLabel,
        lastObservedAt: latestMetric.date ? latestMetric.date.toISOString() : null,
        lastObservedLabel: latestMetric.date ? formatDateTime(latestMetric.date, { dateStyle: 'medium' }) : null,
        baselineLabel: previousMetric
          ? `${previousMetric.conversions} conversions · ${formatCurrency(previousMetric.revenueCents, entry.spendCurrency)}`
          : null
      };
    })
    .filter(Boolean);

  const adsPlacements = campaignsDetailed.map((entry) => ({
    id: `placement-${entry.campaign.id}`,
    name: entry.campaign.name,
    surface: entry.placementSurface,
    slot: entry.placementSlot,
    status: entry.campaign.status,
    scheduleLabel: formatScheduleRange(entry.startAt, entry.endAt),
    budgetLabel: `Daily ${formatCurrency(entry.budgetCents, entry.budgetCurrency)}`,
    optimisation: entry.campaign.objective ? `${capitalise(entry.campaign.objective)} objective` : 'Optimisation pending',
    tags: entry.placementTags
  }));

  const targetingSummaryParts = [];
  if (keywordSet.size) targetingSummaryParts.push(`${keywordSet.size} keywords`);
  if (audienceSet.size) targetingSummaryParts.push(`${audienceSet.size} audiences`);
  if (locationSet.size) targetingSummaryParts.push(`${locationSet.size} regions`);
  if (languageSet.size) targetingSummaryParts.push(`${languageSet.size} languages`);

  const targeting = {
    keywords: Array.from(keywordSet),
    audiences: Array.from(audienceSet),
    locations: Array.from(locationSet),
    languages: Array.from(languageSet).map((language) => language.toUpperCase()),
    summary: targetingSummaryParts.length ? targetingSummaryParts.join(' · ') : 'No targeting configured'
  };

  const tagMap = new Map();
  const pushTag = (category, label) => {
    if (!label) return;
    const key = `${category}:${label}`;
    if (!tagMap.has(key)) {
      tagMap.set(key, { category, label });
    }
  };

  campaignsDetailed.forEach((entry) => {
    entry.keywords.forEach((keyword) => pushTag('Keyword', keyword));
    entry.audiences.forEach((audience) => pushTag('Audience', audience));
    entry.locations.forEach((location) => pushTag('Location', location));
    entry.languages.forEach((language) => pushTag('Language', language.toUpperCase()));
    if (entry.campaign.objective) {
      pushTag('Objective', capitalise(entry.campaign.objective));
    }
    const featureFlag = entry.campaign.metadata?.featureFlag;
    if (featureFlag) {
      pushTag('Feature flag', featureFlag);
    }
    const promotedCommunityId = entry.campaign.metadata?.promotedCommunityId;
    if (promotedCommunityId) {
      pushTag('Placement', `Community #${promotedCommunityId}`);
    }
  });

  const adsTags = Array.from(tagMap.values());

  const adsWorkspace = {
    active: adsActive,
    experiments: adExperiments,
    placements: adsPlacements,
    targeting,
    tags: adsTags,
    summary
  };

  const liveRevenue = liveSessions.reduce(
    (total, session) => total + Number(session.priceAmount ?? 0) * Number(session.reservedSeats ?? 0),
    0
  );

  const subscriptionStatsByTier = new Map();
  communitySubscriptions.forEach((subscription) => {
    const communityId = Number(subscription.communityId);
    if (!managedCommunityIds.has(communityId)) return;
    const key = `${communityId}-${subscription.tierName ?? 'default'}`;
    const entry = subscriptionStatsByTier.get(key) ?? {
      tierName: subscription.tierName ?? 'Tier',
      communityName: subscription.communityName ?? `Community ${communityId}`,
      priceCents: Number(subscription.priceCents ?? 0),
      currency: subscription.currency ?? 'USD',
      billingInterval: subscription.billingInterval ?? 'monthly',
      active: 0,
      cancelled: 0,
      renewals: []
    };
    if (subscription.status === 'active') {
      entry.active += 1;
      if (subscription.currentPeriodEnd) {
        entry.renewals.push(new Date(subscription.currentPeriodEnd));
      }
    } else if (subscription.status === 'cancelled') {
      entry.cancelled += 1;
    }
    subscriptionStatsByTier.set(key, entry);
  });

  const subscriptionRevenue = Array.from(subscriptionStatsByTier.values()).reduce(
    (total, entry) => total + entry.priceCents * entry.active,
    0
  );

  const totalRevenue = courseTotals.revenue + liveRevenue + subscriptionRevenue + ebookRevenue || 0;
  const revenueStreams = [
    { name: 'Courses', amount: courseTotals.revenue },
    { name: 'Live sessions', amount: liveRevenue },
    { name: 'Subscriptions', amount: subscriptionRevenue },
    { name: 'E-books', amount: ebookRevenue }
  ]
    .map((stream) => ({
      name: stream.name,
      value: totalRevenue > 0 ? percentage(stream.amount, totalRevenue, 1) : 0
    }))
    .filter((entry) => entry.value > 0 || totalRevenue === 0);

  const statusLabels = {
    draft: 'Draft',
    review: 'In review',
    published: 'Published',
    archived: 'Archived'
  };

  const pipeline = courseSummaries
    .filter((course) => course.status === 'draft' || course.status === 'review')
    .map((course) => ({
      id: `course-${course.id}`,
      name: course.title,
      stage: statusLabels[course.status] ?? course.status,
      startDate: course.releaseAt ? formatDateTime(course.releaseAt, { dateStyle: 'medium', timeStyle: undefined }) : 'TBD',
      learners: `${course.invited + course.active} prospects`
    }));

  const production = [
    ...upcomingAssignments.map((assignment) => ({
      id: `assignment-${assignment.id}`,
      asset: `${assignment.courseTitle} · ${assignment.title}`,
      owner: assignment.owner,
      status: assignment.dueDate ? `Due ${formatDateTime(assignment.dueDate, { dateStyle: 'medium', timeStyle: undefined })}` : 'Scheduling',
      type: 'Assignment'
    })),
    ...upcomingLessons.map((lesson) => ({
      id: `lesson-${lesson.id}`,
      asset: `${lesson.courseTitle} · ${lesson.title}`,
      owner: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Facilitator',
      status: `Releases ${formatDateTime(lesson.releaseAt, { dateStyle: 'medium', timeStyle: 'short' })}`,
      type: 'Lesson'
    }))
  ].slice(0, 12);

  const normaliseFilename = (name) => {
    if (!name) return 'Untitled asset';
    const leaf = name.split('/').pop();
    return leaf.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const assetsNormalised = assets.map((asset) => ({
    ...asset,
    metadata: safeJsonParse(asset.metadata, {}),
    createdAt: asset.createdAt ? new Date(asset.createdAt) : null,
    updatedAt: asset.updatedAt ? new Date(asset.updatedAt) : null
  }));

  const library = assetsNormalised
    .filter((asset) => asset.status === 'ready')
    .map((asset) => ({
      id: `asset-${asset.id}`,
      title: normaliseFilename(asset.originalFilename),
      format: asset.type,
      updated: formatDateTime(asset.updatedAt ?? asset.createdAt, { dateStyle: 'medium', timeStyle: undefined })
    }));

  const readinessLabelForScore = (score) => {
    if (score >= 80) return 'Launch-ready';
    if (score >= 50) return 'In build';
    if (score > 0) return 'Needs production';
    return 'Kick-off required';
  };

  const creationBlueprints = courseSummaries.map((course) => {
    const courseModules = [...(modulesByCourse.get(course.id) ?? [])].sort((a, b) => a.position - b.position);
    const moduleSummaries = courseModules.map((module) => {
      const moduleLessons = lessonsByModule.get(module.id) ?? [];
      const moduleAssignments = assignmentsByModule.get(module.id) ?? [];
      const lessonDuration = moduleLessons.reduce((total, lesson) => total + Number(lesson.durationMinutes ?? 0), 0);
      const recommendedMinutes = Number(
        module.metadata?.recommendedDurationMinutes ?? module.metadata?.estimatedMinutes ?? 0
      );
      const durationMinutes = lessonDuration > 0 ? lessonDuration : recommendedMinutes;
      const outstanding = [];
      if (moduleLessons.length === 0) {
        outstanding.push('Add lesson plan');
      }
      if (course.deliveryFormat === 'cohort' && moduleAssignments.length === 0) {
        outstanding.push('Attach assignment');
      }
      if (!module.metadata?.ritual && !module.metadata?.hasSimulation) {
        outstanding.push('Document ritual');
      }
      if (durationMinutes === 0) {
        outstanding.push('Estimate duration');
      }
      return {
        id: module.id,
        title: module.title,
        lessons: moduleLessons.length,
        assignments: moduleAssignments.length,
        durationMinutes,
        releaseLabel: formatReleaseOffsetLabel(module.releaseOffsetDays),
        outstanding
      };
    });

    const modulesReady = moduleSummaries.filter((module) => module.outstanding.length === 0).length;
    const readinessScore = moduleSummaries.length
      ? Math.round((modulesReady / moduleSummaries.length) * 100)
      : 0;
    const totalDurationMinutes = moduleSummaries.reduce((total, module) => total + module.durationMinutes, 0);
    const outstanding = moduleSummaries
      .flatMap((module) => module.outstanding.map((task) => `${module.title}: ${task}`))
      .slice(0, 8);
    const upcomingMilestones = [
      ...upcomingLessons
        .filter((lesson) => lesson.courseId === course.id)
        .map((lesson) => ({
          id: `lesson-${lesson.id}`,
          title: lesson.title,
          type: 'Lesson release',
          date: lesson.releaseAt
        })),
      ...upcomingAssignments
        .filter((assignment) => assignment.courseId === course.id)
        .map((assignment) => ({
          id: `assignment-${assignment.id}`,
          title: assignment.title,
          type: 'Assignment due',
          date: assignment.dueDate
        }))
    ]
      .sort((a, b) => {
        const aTime = a.date instanceof Date ? a.date.getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.date instanceof Date ? b.date.getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      })
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        due: item.date
          ? formatDateTime(item.date, {
              dateStyle: 'medium',
              timeStyle: item.type === 'Lesson release' ? 'short' : undefined
            })
          : 'TBD'
      }));

    return {
      id: `blueprint-${course.id}`,
      name: course.title,
      stage: statusLabels[course.status] ?? course.status,
      summary: course.summary,
      readiness: readinessScore,
      readinessLabel: readinessLabelForScore(readinessScore),
      totalDurationMinutes,
      totalDurationLabel: totalDurationMinutes > 0 ? minutesToReadable(totalDurationMinutes) : 'Estimate pending',
      moduleCount: moduleSummaries.length,
      modules: moduleSummaries.map((module) => ({
        id: `module-${module.id}`,
        title: module.title,
        release: module.releaseLabel,
        lessons: module.lessons,
        assignments: module.assignments,
        duration: module.durationMinutes > 0 ? minutesToReadable(module.durationMinutes) : 'Estimate pending',
        outstanding: module.outstanding
      })),
      outstanding,
      upcoming: upcomingMilestones,
      learners: course.total,
      price: formatCurrency(course.priceAmount, course.priceCurrency ?? 'USD')
    };
  });

  const managedCommunitiesSummaries = managedCommunities.map((community) => {
    const communityId = Number(community.communityId);
    const stats = communityStatsMap.get(communityId) ?? { activeMembers: 0, pendingMembers: 0, moderators: 0 };
    const activeMembers = stats.activeMembers;
    const pendingMembers = stats.pendingMembers;
    const moderators = stats.moderators;
    const engagementScore = activeMembers + pendingMembers > 0 ? activeMembers / (activeMembers + pendingMembers) : 0;
    let health = 'Stable';
    if (engagementScore >= 0.85) health = 'Excellent';
    else if (engagementScore >= 0.65) health = 'Healthy';
    else if (engagementScore > 0) health = 'Needs attention';
    const trend = pendingMembers > 0 ? `+${pendingMembers} pending` : moderators > 0 ? `${moderators} moderators` : 'Steady';
    return {
      id: `community-${communityId}`,
      title: community.communityName ?? `Community ${communityId}`,
      members: `${activeMembers} members`,
      trend,
      health
    };
  });

  const templates = communityResources
    .filter((resource) => resource.createdBy === user.id && resource.resourceType === 'content_asset')
    .map((resource) => {
      const tags = safeJsonParse(resource.tags, []);
      const metadata = safeJsonParse(resource.metadata, {});
      return {
        id: `resource-${resource.id}`,
        name: resource.title,
        duration: resource.publishedAt
          ? `Updated ${formatDateTime(resource.publishedAt, { dateStyle: 'medium', timeStyle: undefined })}`
          : 'Draft',
        ingredients: Array.isArray(tags) && tags.length ? tags.slice(0, 4) : ['Ops blueprint', metadata.deckVersion ? `v${metadata.deckVersion}` : 'Asset'],
        community: resource.communityName
      };
    });

  const webinars = liveSessions.map((session) => ({
    id: `live-${session.id}`,
    topic: session.title,
    date: formatDateTime(session.startAt, { dateStyle: 'medium', timeStyle: 'short' }),
    status: session.status,
    registrants: `${Number(session.reservedSeats ?? 0)}/${Number(session.capacity ?? 0)}`
  }));

  const podcasts = communityPosts.map((post) => ({
    id: `post-${post.id}`,
    stage: post.status === 'published' ? 'Published' : 'Draft',
    episode: post.title,
    release: post.publishedAt ? formatDateTime(post.publishedAt, { dateStyle: 'medium', timeStyle: undefined }) : 'Unscheduled'
  }));

  const instructorLiveClassSessions = liveSessions.map((session) =>
    normaliseLiveClassroom(
      {
        ...session,
        metadata: session.metadata ?? {}
      },
      { now, perspective: 'instructor', allowJoinLink: true }
    )
  );
  const instructorUpcomingLive = instructorLiveClassSessions.filter((session) =>
    ['upcoming', 'check-in'].includes(session.status)
  );
  const instructorActiveLive = instructorLiveClassSessions.filter((session) => session.status === 'live');
  const instructorCompletedLive = instructorLiveClassSessions
    .filter((session) => session.status === 'completed')
    .sort((a, b) => {
      const aTime = a.endAt ? new Date(a.endAt).getTime() : a.startAt ? new Date(a.startAt).getTime() : 0;
      const bTime = b.endAt ? new Date(b.endAt).getTime() : b.startAt ? new Date(b.startAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 6);
  const instructorWhiteboardSnapshots = buildLiveClassWhiteboardSnapshots(instructorLiveClassSessions).slice(0, 8);
  const instructorReadiness = buildLiveClassReadiness(instructorLiveClassSessions);
  const instructorAverageOccupancy = averageOccupancyRate(instructorLiveClassSessions);

  const instructorRevenuePotential = new Map();
  const instructorRevenueCommitted = new Map();
  instructorLiveClassSessions.forEach((session) => {
    const currency = session.pricing?.currency ?? 'USD';
    const capacity = Number(session.occupancy?.capacity ?? 0);
    const priceCents = Number(session.pricing?.priceAmountCents ?? 0);
    const collectedCents = Number(session.pricing?.collectedAmountCents ?? 0);
    if (capacity > 0 && priceCents > 0) {
      instructorRevenuePotential.set(currency, (instructorRevenuePotential.get(currency) ?? 0) + priceCents * capacity);
    }
    if (collectedCents > 0) {
      instructorRevenueCommitted.set(currency, (instructorRevenueCommitted.get(currency) ?? 0) + collectedCents);
    }
  });

  const formatMultiCurrencyTotal = (entriesMap) => {
    const entries = Array.from(entriesMap.entries());
    if (!entries.length) return null;
    return entries.map(([currency, cents]) => formatCurrency(cents, currency)).join(' • ');
  };

  const instructorLiveMetrics = [
    {
      label: 'Live sessions scheduled',
      value: String(instructorUpcomingLive.length),
      change: instructorActiveLive.length > 0 ? `${instructorActiveLive.length} live now` : 'All in preparation',
      trend: instructorUpcomingLive.length > 0 ? 'up' : 'down'
    },
    {
      label: 'Average seat fill',
      value: instructorAverageOccupancy !== null ? `${instructorAverageOccupancy}%` : '—',
      change: `${liveSessions.length} session${liveSessions.length === 1 ? '' : 's'} tracked`,
      trend: instructorAverageOccupancy !== null && instructorAverageOccupancy >= 70 ? 'up' : 'down'
    },
    {
      label: 'Projected revenue',
      value: formatMultiCurrencyTotal(instructorRevenuePotential) ?? 'No ticketing',
      change: formatMultiCurrencyTotal(instructorRevenueCommitted) ?? 'No payments captured',
      trend: instructorRevenuePotential.size > 0 ? 'up' : 'down'
    }
  ];

  const instructorGroupSessions = instructorLiveClassSessions
    .filter((session) => session.isGroupSession)
    .map((session) => ({
      id: session.id,
      title: session.title,
      stage: session.stage,
      startLabel: session.startLabel,
      occupancy: session.occupancy,
      breakoutRooms: session.breakoutRooms,
      callToAction: session.callToAction
    }));

  const lessonSchedule = upcomingLessons.map((lesson) => ({
    id: `lesson-${lesson.id}`,
    topic: lesson.title,
    course: lesson.courseTitle,
    date: formatDateTime(lesson.releaseAt, { dateStyle: 'medium', timeStyle: 'short' }),
    facilitator: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Facilitator'
  }));

  const calendarEntries = [];
  upcomingLiveClasses.forEach((session) => {
    if (!session.startAt) return;
    calendarEntries.push({
      day: session.startAt.toLocaleDateString('en-US', { weekday: 'short' }),
      description: `Live: ${session.title}`
    });
  });
  upcomingLessons.forEach((lesson) => {
    if (!lesson.releaseAt) return;
    calendarEntries.push({
      day: lesson.releaseAt.toLocaleDateString('en-US', { weekday: 'short' }),
      description: `Lesson: ${lesson.courseTitle} – ${lesson.title}`
    });
  });
  tutorBookingsNormalised
    .filter((booking) => booking.status === 'confirmed' && booking.scheduledStart && booking.scheduledStart >= now)
    .forEach((booking) => {
      calendarEntries.push({
        day: booking.scheduledStart.toLocaleDateString('en-US', { weekday: 'short' }),
        description: `Mentor: ${booking.metadata.topic ?? 'Session'}`
      });
    });
  const calendar = buildCalendarEntries(calendarEntries);

  const pricingOffers = courseSummaries.map((course) => ({
    id: `pricing-course-${course.id}`,
    name: course.title,
    price: formatCurrency(course.priceAmount, course.priceCurrency ?? 'USD'),
    status: statusLabels[course.status] ?? course.status,
    conversion: `${percentage(course.completed, course.total || 1, 1)}%`,
    learners: `${course.total} enrolled`
  }));

  const pricingSubscriptionsDetailed = Array.from(subscriptionStatsByTier.values()).map((entry, index) => {
    const nextRenewal = entry.renewals.sort((a, b) => (a?.getTime() ?? 0) - (b?.getTime() ?? 0))[0] ?? null;
    return {
      id: `pricing-tier-${index}`,
      name: `${entry.communityName} · ${entry.tierName}`,
      price: formatCurrency(entry.priceCents, entry.currency),
      members: `${entry.active} active`,
      churn: entry.cancelled > 0 ? `${entry.cancelled} cancellations` : 'Retention steady',
      renewal: nextRenewal ? formatDateTime(nextRenewal, { dateStyle: 'medium', timeStyle: undefined }) : 'Auto-renewal',
      _activeCount: entry.active
    };
  });

  const pricingSubscriptions = pricingSubscriptionsDetailed.map(({ _activeCount, ...rest }) => rest);

  const pricingSessions = liveSessions.map((session) => ({
    id: `pricing-live-${session.id}`,
    name: session.title,
    price: formatCurrency(session.priceAmount, session.priceCurrency ?? 'USD'),
    seats: `${Number(session.reservedSeats ?? 0)}/${Number(session.capacity ?? 0)} booked`,
    status: session.status === 'scheduled' ? 'Scheduled' : session.status,
    date: formatDateTime(session.startAt, { dateStyle: 'medium', timeStyle: 'short' })
  }));

  const pricingInsights = [];
  if (courseSummaries.length > 0) {
    const topCourse = courseSummaries.reduce((current, candidate) => (candidate.total > current.total ? candidate : current), courseSummaries[0]);
    pricingInsights.push(
      `${topCourse.title} holds ${topCourse.total} enrolments with ${percentage(topCourse.completed, topCourse.total || 1, 0)}% completion.`
    );
  }
  const totalSubscribers = pricingSubscriptionsDetailed.reduce((sum, tier) => sum + (tier._activeCount ?? 0), 0);
  if (totalSubscribers > 0) {
    pricingInsights.push(`${totalSubscribers} active subscriber${totalSubscribers === 1 ? '' : 's'} across premium communities.`);
  }
  if (upcomingLiveClasses.length > 0) {
    const nextLive = upcomingLiveClasses[0];
    pricingInsights.push(
      `Next live session “${nextLive.title}” is scheduled ${formatDateTime(nextLive.startAt, { dateStyle: 'medium', timeStyle: 'short' })}.`
    );
  }

  const analytics = {
    enrollment: courseSummaries.map((course) => ({
      label: course.title,
      current: course.active + course.completed,
      previous: course.total - course.startedRecent
    })),
    revenueStreams
  };

  const metrics = [
    {
      label: 'Active learners',
      value: `${courseTotals.active}`,
      change: `+${courseTotals.startedRecent} last 30d`,
      trend: 'up'
    },
    {
      label: 'Avg completion',
      value: `${percentage(courseTotals.completed, courseTotals.total || 1, 1)}%`,
      change: `${courseTotals.completed} cohorts completed`,
      trend: percentage(courseTotals.completed, courseTotals.total || 1, 1) >= 60 ? 'up' : 'down'
    },
    {
      label: 'Upcoming sessions',
      value: `${upcomingLiveClasses.length}`,
      change: `${upcomingTutorSlots.length} tutor slot${upcomingTutorSlots.length === 1 ? '' : 's'}`,
      trend: upcomingLiveClasses.length > 0 ? 'up' : 'down'
    },
    {
      label: 'Course revenue',
      value: formatCurrency(courseTotals.revenue, courseSummaries[0]?.priceCurrency ?? 'USD'),
      change: `+${formatCurrency(courseTotals.revenueRecent, courseSummaries[0]?.priceCurrency ?? 'USD')} pipeline`,
      trend: courseTotals.revenueRecent >= 0 ? 'up' : 'down'
    }
  ];

  const searchIndex = [
    ...courseSummaries.map((course) => ({
      id: `search-instructor-course-${course.id}`,
      role: 'instructor',
      type: 'Course',
      title: course.title,
      url: '/dashboard/instructor/courses/manage'
    })),
    ...managedCommunitiesSummaries.map((community) => ({
      id: `search-instructor-community-${community.id}`,
      role: 'instructor',
      type: 'Community',
      title: community.title,
      url: '/dashboard/instructor/communities/manage'
    })),
    ...upcomingLiveClasses.map((session) => ({
      id: `search-instructor-live-${session.id}`,
      role: 'instructor',
      type: 'Live session',
      title: session.title,
      url: '/dashboard/instructor/live-classes'
    }))
  ];

  const profileStats = [];
  if (courseSummaries.length > 0) {
    profileStats.push({ label: 'Cohorts', value: `${courseSummaries.length} active` });
  }
  if (upcomingLiveClasses.length > 0) {
    profileStats.push({ label: 'Live sessions', value: `${upcomingLiveClasses.length} scheduled` });
  }
  if (tutorProfiles.length > 0) {
    profileStats.push({ label: 'Tutor pods', value: `${tutorProfiles.length} mentors` });
  }

  const bioSegments = [];
  if (courseSummaries.length > 0) {
    bioSegments.push(`coaching ${courseSummaries.length} cohort${courseSummaries.length === 1 ? '' : 's'}`);
  }
  if (managedCommunityIds.size > 0) {
    bioSegments.push(`stewarding ${managedCommunityIds.size} community${managedCommunityIds.size === 1 ? '' : 'ies'}`);
  }
  if (upcomingLiveClasses.length > 0) {
    const totalSeatCount = liveSessions.reduce((sum, session) => sum + Number(session.reservedSeats ?? 0), 0);
    bioSegments.push(`guiding ${totalSeatCount} learners through live simulations`);
  }
  const profileBio = bioSegments.length ? `Currently ${bioSegments.join(', ')}.` : '';

  return {
    role: { id: 'instructor', label: 'Instructor' },
    dashboard: {
      metrics,
      analytics,
      courses: {
        pipeline,
        production,
        library,
        creationBlueprints
      },
      communities: {
        manageDeck: managedCommunitiesSummaries,
        createTemplates: templates,
        webinars,
        podcasts
      },
      liveClassrooms: {
        metrics: instructorLiveMetrics,
        sessions: instructorLiveClassSessions,
        active: instructorActiveLive,
        upcoming: instructorUpcomingLive,
        completed: instructorCompletedLive,
        groups: instructorGroupSessions.slice(0, 8),
        whiteboard: {
          snapshots: instructorWhiteboardSnapshots,
          readiness: instructorReadiness
        }
      },
      schedules: {
        lessons: lessonSchedule,
        tutor: tutorSchedule
      },
      bookings: {
        pipeline: pipelineBookings,
        confirmed: confirmedBookings
      },
      ebooks: {
        catalogue: ebookCatalogue,
        creationPipelines
      },
      ads: adsWorkspace,
      calendar,
      pricing: {
        offers: pricingOffers,
        subscriptions: pricingSubscriptions,
        sessions: pricingSessions,
        insights: pricingInsights
      }
    },
    searchIndex,
    profileStats,
    profileBio
  };
}

function sum(array, selector = (value) => value) {
  return array.reduce((total, item) => total + Number(selector(item) ?? 0), 0);
}

function percentage(part, total, precision = 1) {
  const numerator = Number(part ?? 0);
  const denominator = Number(total ?? 0);
  if (denominator <= 0) return 0;
  const factor = 10 ** precision;
  return Math.round(((numerator / denominator) * 100 + Number.EPSILON) * factor) / factor;
}

function buildCalendarEntries(entries) {
  const days = new Map();
  entries.forEach((entry) => {
    if (!days.has(entry.day)) {
      days.set(entry.day, []);
    }
    days.get(entry.day).push(entry.description);
  });
  return Array.from(days.entries()).map(([day, items], index) => ({
    id: `day-${index}`,
    day,
    items
  }));
}

function formatDateTime(date, options = {}) {
  if (!date) return 'TBD';
  const resolved = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: options.dateStyle ?? 'medium',
    timeStyle: options.timeStyle ?? 'short',
    timeZone: options.timeZone ?? 'UTC'
  }).format(resolved);
}

function differenceInDays(end, start) {
  const endDate = typeof end === 'string' ? new Date(end) : new Date(end.getTime());
  const startDate = typeof start === 'string' ? new Date(start) : new Date(start.getTime());
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function minutesToReadable(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)} mins`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (remaining === 0) {
    return `${hours} hrs`;
  }
  return `${hours}h ${remaining}m`;
}

const LIVE_JOIN_WINDOW_MINUTES = 15;
const GROUP_SESSION_KEYWORDS = ['group', 'cohort', 'bootcamp', 'lab', 'studio', 'masterclass', 'workshop', 'breakout'];
const WHITEBOARD_READY_STATES = new Set(['ready', 'live', 'approved', 'published']);

function resolveLiveClassStatus(startAt, endAt, reference) {
  if (!startAt && !endAt) {
    return 'draft';
  }
  if (startAt) {
    const startTime = startAt instanceof Date ? startAt.getTime() : new Date(startAt).getTime();
    if (reference.getTime() < startTime) {
      const diff = startTime - reference.getTime();
      if (diff <= LIVE_JOIN_WINDOW_MINUTES * 60 * 1000) {
        return 'check-in';
      }
      return 'upcoming';
    }
  }
  if (endAt) {
    const endTime = endAt instanceof Date ? endAt.getTime() : new Date(endAt).getTime();
    if (reference.getTime() >= endTime) {
      return 'completed';
    }
  }
  return 'live';
}

function determineStageFromStatus(status) {
  switch (status) {
    case 'upcoming':
      return 'Preparation';
    case 'check-in':
      return 'Check-in';
    case 'live':
      return 'Broadcasting';
    case 'completed':
      return 'Retrospective';
    default:
      return 'Draft';
  }
}

function normaliseLiveClassroom(session, { now, perspective = 'learner', allowJoinLink = false } = {}) {
  const metadataSource =
    session.metadata && typeof session.metadata === 'object'
      ? session.metadata
      : safeJsonParse(session.metadata, {});
  const metadata = metadataSource && typeof metadataSource === 'object' ? metadataSource : {};

  const startAt = session.startAt ? new Date(session.startAt) : null;
  const endAt = session.endAt ? new Date(session.endAt) : null;
  const status = resolveLiveClassStatus(startAt, endAt, now);
  const stage = determineStageFromStatus(status);
  const timezone = session.timezone ?? metadata.timezone ?? metadata.timeZone ?? 'UTC';

  const typeRaw = String(session.type ?? metadata.type ?? 'live').toLowerCase();
  const typeLabel = typeRaw
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const isGroupSession = Boolean(
    metadata.isGroup === true ||
      metadata.groupSession === true ||
      (Array.isArray(metadata.breakoutRooms) && metadata.breakoutRooms.length > 0) ||
      GROUP_SESSION_KEYWORDS.some((keyword) => typeRaw.includes(keyword))
  );

  const capacity = Number(session.capacity ?? metadata.capacity ?? 0) || null;
  const reservedSeats = Number(
    session.reservedSeats ?? metadata.reservedSeats ?? metadata.attendees ?? metadata.registered ?? 0
  ) || 0;
  const occupancyRate =
    capacity && capacity > 0 ? Math.min(Math.round((reservedSeats / capacity) * 100), 100) : null;

  const joinWindowMs = LIVE_JOIN_WINDOW_MINUTES * 60 * 1000;
  const joinEligible = allowJoinLink && startAt && now.getTime() >= startAt.getTime() - joinWindowMs;
  const joinUrl = joinEligible ? metadata.joinUrl ?? metadata.attendeeUrl ?? null : null;
  const hostUrl = metadata.hostUrl ?? metadata.presenterUrl ?? null;

  const registration = session.registrationStatus ?? metadata.registrationStatus ?? null;
  const amountPaidCents = Number(session.amountPaid ?? metadata.amountPaid ?? 0) || 0;
  const registrationCurrency =
    session.registrationCurrency ?? metadata.registrationCurrency ?? session.priceCurrency ?? metadata.priceCurrency ?? 'USD';
  const priceAmountCents = Number(session.priceAmount ?? metadata.priceAmount ?? 0) || 0;
  const priceCurrency = session.priceCurrency ?? metadata.priceCurrency ?? 'USD';

  const facilitators = Array.isArray(metadata.facilitators)
    ? metadata.facilitators.map((value) => String(value))
    : metadata.host
      ? [String(metadata.host)]
      : session.communityName
        ? [String(session.communityName)]
        : [];

  const breakoutRooms = Array.isArray(metadata.breakoutRooms)
    ? metadata.breakoutRooms
        .map((room) => {
          if (typeof room === 'string') {
            return { name: room };
          }
          if (room && typeof room === 'object') {
            const name = room.name ?? room.title ?? 'Breakout room';
            const facilitator = room.facilitator ?? room.host ?? null;
            const capacityValue = Number(room.capacity ?? room.size ?? room.limit ?? 0) || null;
            return {
              name: String(name),
              facilitator: facilitator ? String(facilitator) : undefined,
              capacity: capacityValue
            };
          }
          return null;
        })
        .filter(Boolean)
    : [];

  const whiteboardMetaRaw =
    typeof metadata.whiteboard === 'string'
      ? { url: metadata.whiteboard }
      : metadata.whiteboard && typeof metadata.whiteboard === 'object'
        ? { ...metadata.whiteboard }
        : {};

  if (!whiteboardMetaRaw.url && metadata.whiteboardUrl) {
    whiteboardMetaRaw.url = metadata.whiteboardUrl;
  }
  if (!whiteboardMetaRaw.template && metadata.whiteboardTemplate) {
    whiteboardMetaRaw.template = metadata.whiteboardTemplate;
  }
  if (!whiteboardMetaRaw.status && metadata.whiteboardStatus) {
    whiteboardMetaRaw.status = metadata.whiteboardStatus;
  }
  if (!whiteboardMetaRaw.updatedAt && metadata.whiteboardUpdatedAt) {
    whiteboardMetaRaw.updatedAt = metadata.whiteboardUpdatedAt;
  }

  const whiteboardReady =
    whiteboardMetaRaw.ready === true ||
    WHITEBOARD_READY_STATES.has(String(whiteboardMetaRaw.status ?? '').toLowerCase()) ||
    metadata.whiteboardReady === true;

  const whiteboardUpdatedAt = whiteboardMetaRaw.updatedAt
    ? new Date(whiteboardMetaRaw.updatedAt)
    : metadata.whiteboardLastEditedAt
      ? new Date(metadata.whiteboardLastEditedAt)
      : null;

  const callToAction = (() => {
    let label = 'View briefing';
    let action = 'details';
    let enabled = true;

    if (status === 'live' && joinEligible && joinUrl) {
      label = 'Join live classroom';
      action = 'join';
    } else if (status === 'check-in' && joinEligible && joinUrl) {
      label = 'Enter waiting room';
      action = 'check-in';
    } else if (status === 'upcoming' && registration === 'registered') {
      label = 'Manage ticket';
      action = 'manage';
    } else if (status === 'upcoming' && registration === 'waitlisted') {
      label = 'View waitlist';
      action = 'waitlist';
    } else if (status === 'completed' && metadata.recordingUrl) {
      label = 'Watch recording';
      action = 'recording';
    } else if (perspective === 'instructor' && hostUrl) {
      label = status === 'completed' ? 'Review analytics' : 'Open host controls';
      action = 'host';
    }

    if ((action === 'join' || action === 'check-in') && !joinUrl) {
      enabled = false;
    }

    return { label, action, enabled };
  })();

  const durationMinutes =
    startAt && endAt ? Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000)) : null;

  const security = {
    waitingRoom: metadata.waitingRoom !== false,
    passcodeRequired: metadata.passcodeRequired === true || Boolean(metadata.passcode),
    recordingConsent: metadata.recordingConsent === true || metadata.recordingConsentRequired === true,
    attendeeMfa: metadata.attendeeMfa === true
  };

  const recordingEnabled = metadata.recordingEnabled === true || metadata.recording === 'recorded';
  const resources = Array.isArray(metadata.resources)
    ? metadata.resources.map((item) => String(item)).slice(0, 6)
    : [];

  return {
    id: session.id
      ? String(session.id)
      : `live-${session.classroomId ?? session.publicId ?? session.slug ?? metadata.id ?? Date.now()}`,
    classroomId: session.classroomId ?? session.id ?? null,
    slug: session.slug ?? null,
    title: session.title ?? metadata.title ?? 'Live classroom',
    summary: session.summary ?? metadata.summary ?? null,
    type: typeRaw,
    typeLabel,
    isGroupSession,
    community: session.communityName ?? metadata.community ?? null,
    stage,
    status,
    registration,
    timezone,
    startAt: startAt ? startAt.toISOString() : null,
    endAt: endAt ? endAt.toISOString() : null,
    startLabel: startAt
      ? formatDateTime(startAt, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone })
      : 'TBD',
    endLabel: endAt ? formatDateTime(endAt, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) : null,
    countdownMinutes: startAt ? Math.max(0, Math.round((startAt.getTime() - now.getTime()) / 60000)) : null,
    durationMinutes,
    facilitators,
    breakoutRooms,
    occupancy: {
      capacity,
      reserved: reservedSeats,
      rate: occupancyRate
    },
    security,
    recordingEnabled,
    resources,
    callToAction,
    joinUrl,
    hostUrl: perspective === 'instructor' ? hostUrl : undefined,
    pricing: {
      price: priceAmountCents ? formatCurrency(priceAmountCents, priceCurrency) : null,
      priceAmountCents,
      currency: priceCurrency,
      collectedAmountCents: amountPaidCents,
      collectedLabel: amountPaidCents ? formatCurrency(amountPaidCents, registrationCurrency) : null,
      registrationCurrency,
      ticketType: session.ticketType ?? metadata.ticketType ?? 'general'
    },
    whiteboard: {
      url: whiteboardMetaRaw.url ?? null,
      template: whiteboardMetaRaw.template ?? 'Collaborative board',
      status: whiteboardMetaRaw.status ?? (whiteboardReady ? 'Ready' : 'Draft'),
      ready: whiteboardReady,
      lastUpdatedAt: whiteboardUpdatedAt ? whiteboardUpdatedAt.toISOString() : null,
      lastUpdatedLabel: whiteboardUpdatedAt ? humanizeRelativeTime(whiteboardUpdatedAt, now) : null,
      facilitators: Array.isArray(whiteboardMetaRaw.facilitators)
        ? whiteboardMetaRaw.facilitators.map((value) => String(value))
        : facilitators,
      notes: Array.isArray(whiteboardMetaRaw.notes)
        ? whiteboardMetaRaw.notes.map((value) => String(value))
        : []
    },
    support: {
      moderator: metadata.moderator ? String(metadata.moderator) : null,
      helpDesk: metadata.helpDesk ? String(metadata.helpDesk) : null
    }
  };
}

function buildLiveClassReadiness(sessions) {
  if (!sessions?.length) {
    return [
      {
        id: 'no-sessions',
        label: 'No live sessions scheduled',
        status: 'ready',
        detail: 'Schedule a classroom to populate readiness insights.'
      }
    ];
  }

  const waitingRoomMissing = sessions.filter((session) => !session.security?.waitingRoom).length;
  const passcodeMissing = sessions.filter((session) => !session.security?.passcodeRequired).length;
  const whiteboardsPending = sessions.filter((session) => session.whiteboard && session.whiteboard.ready === false).length;
  const consentMissing = sessions.filter((session) => !session.security?.recordingConsent).length;

  const statusFor = (count) => {
    if (count <= 0) return 'ready';
    if (count === 1) return 'attention';
    return 'action';
  };

  return [
    {
      id: 'waiting-room',
      label: 'Waiting room enforcement',
      status: statusFor(waitingRoomMissing),
      detail:
        waitingRoomMissing === 0
          ? 'All sessions require host admission before joining.'
          : `${waitingRoomMissing} session${waitingRoomMissing === 1 ? '' : 's'} allow direct entry.`
    },
    {
      id: 'passcode',
      label: 'Passcode protection',
      status: statusFor(passcodeMissing),
      detail:
        passcodeMissing === 0
          ? 'Passcodes are enabled across every upcoming classroom.'
          : `${passcodeMissing} session${passcodeMissing === 1 ? '' : 's'} should add a passcode.`
    },
    {
      id: 'whiteboard',
      label: 'Whiteboard readiness',
      status: statusFor(whiteboardsPending),
      detail:
        whiteboardsPending === 0
          ? 'Every live board is prepped and ready.'
          : `${whiteboardsPending} board${whiteboardsPending === 1 ? ' is' : 's are'} still in draft.`
    },
    {
      id: 'recording',
      label: 'Recording consent workflow',
      status: statusFor(consentMissing),
      detail:
        consentMissing === 0
          ? 'Recording consent is captured before each broadcast.'
          : `${consentMissing} session${consentMissing === 1 ? '' : 's'} need consent prompts.`
    }
  ];
}

function buildLiveClassWhiteboardSnapshots(sessions) {
  if (!sessions?.length) return [];
  return sessions
    .map((session) => {
      const whiteboard = session.whiteboard ?? {};
      if (!whiteboard.url && !whiteboard.template) {
        return null;
      }
      return {
        id: session.id,
        title: session.title,
        template: whiteboard.template ?? 'Collaborative board',
        status: whiteboard.status ?? (whiteboard.ready ? 'Ready' : 'Draft'),
        ready: Boolean(whiteboard.ready),
        lastUpdatedLabel: whiteboard.lastUpdatedLabel ?? null,
        facilitators: session.facilitators ?? [],
        url: whiteboard.url ?? null
      };
    })
    .filter(Boolean);
}

function averageOccupancyRate(sessions) {
  if (!sessions?.length) return null;
  const rates = sessions
    .map((session) => Number(session.occupancy?.rate))
    .filter((value) => Number.isFinite(value));
  if (!rates.length) return null;
  const total = rates.reduce((sum, value) => sum + value, 0);
  return Math.round(total / rates.length);
}

export default class DashboardService {
  static async getDashboardForUser(userId, { referenceDate = new Date() } = {}) {
    const user = await UserModel.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }

    const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

    const [
      privacySettings,
      courseStats,
      enrollmentRows,
      progressRows,
      membershipRows,
      communityStatRows,
      subscriptionRows,
      affiliateRows,
      affiliatePayoutRows,
      liveClassRows,
      tutorBookingRows,
      directMessageRows,
      followersCount,
      followingCount,
      pendingIncomingRows,
      pendingOutgoingRows,
      followRecommendations,
      paymentIntentRows,
      ebookProgressRows,
      ebookRows,
      ebookHighlightRows,
      ebookBookmarkRows,
      communityMessageRows,
      communityMessageContributionRows,
      communityAssignments,
      instructorCourseRows,
      instructorCourseEnrollmentRows,
      instructorCourseModuleRows,
      instructorLessonRows,
      instructorAssignmentRows,
      tutorProfileRows,
      tutorAvailabilityRows,
      instructorBookingRows,
      instructorLiveClassRows,
      instructorAssetRows,
      instructorAssetEventRows,
      communityResourceRows,
      communityPostRows,
      adsCampaignRows,
      adsMetricRows,
      communityPaywallTierRows,
      communitySubscriptionRows
    ] = await Promise.all([
      UserPrivacySettingModel.getForUser(userId),
      db('course_enrollments as ce')
        .where('ce.user_id', userId)
        .select(
          db.raw("SUM(CASE WHEN ce.status = 'active' THEN 1 ELSE 0 END) as active_count"),
          db.raw("SUM(CASE WHEN ce.status = 'completed' THEN 1 ELSE 0 END) as completed_count"),
          db.raw('AVG(ce.progress_percent) as avg_progress'),
          db.raw('COUNT(*) as total_enrollments')
        )
        .first(),
      db('course_enrollments as ce')
        .innerJoin('courses as c', 'c.id', 'ce.course_id')
        .innerJoin('users as instructor', 'instructor.id', 'c.instructor_id')
        .where('ce.user_id', userId)
        .select(
          'ce.id as enrollmentId',
          'ce.public_id as enrollmentPublicId',
          'ce.course_id as courseId',
          'ce.status as status',
          'ce.progress_percent as progressPercent',
          'ce.started_at as startedAt',
          'ce.completed_at as completedAt',
          'ce.last_accessed_at as lastAccessedAt',
          'c.title as courseTitle',
          'c.slug as courseSlug',
          'c.summary as courseSummary',
          'c.level as courseLevel',
          'c.delivery_format as deliveryFormat',
          'c.rating_average as courseRating',
          'c.rating_count as courseRatingCount',
          'c.enrolment_count as enrolmentCount',
          'c.release_at as releaseAt',
          'c.metadata as courseMetadata',
          'instructor.first_name as instructorFirstName',
          'instructor.last_name as instructorLastName'
        )
        .orderBy('ce.started_at', 'desc'),
      db('course_progress as cp')
        .innerJoin('course_enrollments as ce', 'ce.id', 'cp.enrollment_id')
        .innerJoin('course_lessons as cl', 'cl.id', 'cp.lesson_id')
        .where('ce.user_id', userId)
        .select(
          'cp.enrollment_id as enrollmentId',
          'ce.course_id as courseId',
          'cp.completed as completed',
          'cp.completed_at as completedAt',
          'cp.progress_percent as progressPercent',
          'cl.module_id as moduleId',
          'cl.title as lessonTitle',
          'cl.slug as lessonSlug',
          'cl.position as lessonPosition',
          'cl.duration_minutes as durationMinutes',
          'cl.release_at as lessonReleaseAt'
        ),
      db('community_members as cm')
        .innerJoin('communities as c', 'c.id', 'cm.community_id')
        .where('cm.user_id', userId)
        .select(
          'cm.id as membershipId',
          'cm.community_id as communityId',
          'cm.role',
          'cm.status',
          'cm.joined_at as joinedAt',
          'cm.metadata as membershipMetadata',
          'c.name as communityName',
          'c.slug as communitySlug',
          'c.description as communityDescription',
          'c.visibility as visibility',
          'c.metadata as communityMetadata',
          'c.owner_id as ownerId'
        ),
      db('community_members')
        .whereIn(
          'community_id',
          db('community_members').select('community_id').where('user_id', userId)
        )
        .groupBy('community_id')
        .select(
          'community_id',
          db.raw("SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_members"),
          db.raw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_members"),
          db.raw("SUM(CASE WHEN role != 'member' AND status = 'active' THEN 1 ELSE 0 END) as moderators")
        ),
      db('community_subscriptions as cs')
        .leftJoin('community_paywall_tiers as tier', 'tier.id', 'cs.tier_id')
        .where('cs.user_id', userId)
        .select(
          'cs.community_id as communityId',
          'cs.public_id as subscriptionId',
          'cs.status',
          'cs.started_at as startedAt',
          'cs.current_period_start as currentPeriodStart',
          'cs.current_period_end as currentPeriodEnd',
          'cs.cancel_at_period_end as cancelAtPeriodEnd',
          'cs.provider',
          'cs.metadata as subscriptionMetadata',
          'tier.name as tierName',
          'tier.price_cents as tierPriceCents',
          'tier.currency as tierCurrency',
          'tier.billing_interval as tierInterval',
          'tier.benefits as tierBenefits'
        ),
      db('community_affiliates')
        .where('user_id', userId)
        .select(
          'id',
          'community_id as communityId',
          'status',
          'referral_code as referralCode',
          'commission_rate_bps as commissionRateBps',
          'total_earned_cents as totalEarnedCents',
          'total_paid_cents as totalPaidCents',
          'metadata',
          'approved_at as approvedAt'
        ),
      db('community_affiliate_payouts')
        .whereIn(
          'affiliate_id',
          db('community_affiliates').select('id').where('user_id', userId)
        )
        .select(
          'id',
          'affiliate_id as affiliateId',
          'amount_cents as amountCents',
          'status',
          'payout_reference as payoutReference',
          'scheduled_at as scheduledAt',
          'processed_at as processedAt',
          'metadata'
        ),
      db('live_classroom_registrations as reg')
        .innerJoin('live_classrooms as lc', 'lc.id', 'reg.classroom_id')
        .leftJoin('communities as c', 'c.id', 'lc.community_id')
        .where('reg.user_id', userId)
        .select(
          'lc.id as classroomId',
          'lc.public_id as classroomPublicId',
          'lc.community_id as communityId',
          'lc.title',
          'lc.slug',
          'lc.summary',
          'lc.start_at as startAt',
          'lc.end_at as endAt',
          'lc.type',
          'lc.price_amount as priceAmount',
          'lc.price_currency as priceCurrency',
          'lc.capacity',
          'lc.reserved_seats as reservedSeats',
          'lc.timezone',
          'lc.metadata as classroomMetadata',
          'reg.status as registrationStatus',
          'reg.ticket_type as ticketType',
          'reg.amount_paid as amountPaid',
          'reg.currency as registrationCurrency',
          'reg.registered_at as registeredAt',
          'c.name as communityName'
        ),
      db('tutor_bookings as tb')
        .innerJoin('tutor_profiles as tp', 'tp.id', 'tb.tutor_id')
        .where('tb.learner_id', userId)
        .select(
          'tb.id',
          'tb.public_id as publicId',
          'tb.status',
          'tb.scheduled_start as scheduledStart',
          'tb.scheduled_end as scheduledEnd',
          'tb.duration_minutes as durationMinutes',
          'tb.hourly_rate_amount as hourlyRateAmount',
          'tb.hourly_rate_currency as hourlyRateCurrency',
          'tb.meeting_url as meetingUrl',
          'tb.metadata',
          'tp.display_name as tutorName',
          'tp.headline as tutorHeadline',
          'tp.rating_average as tutorRating',
          'tp.rating_count as tutorRatingCount'
        ),
      db('direct_message_participants as dmp')
        .innerJoin('direct_message_threads as thread', 'thread.id', 'dmp.thread_id')
        .where('dmp.user_id', userId)
        .select(
          'dmp.thread_id as threadId',
          'dmp.role',
          'dmp.notifications_enabled as notificationsEnabled',
          'dmp.last_read_message_id as lastReadMessageId',
          'dmp.last_read_at as lastReadAt',
          'thread.last_message_at as lastMessageAt',
          'thread.last_message_preview as lastMessagePreview',
          'thread.is_group as isGroup',
          'thread.metadata as threadMetadata'
        ),
      UserFollowModel.countFollowers(userId),
      UserFollowModel.countFollowing(userId),
      db('user_follows as uf')
        .innerJoin('users as u', 'u.id', 'uf.follower_id')
        .where('uf.following_id', userId)
        .andWhere('uf.status', 'pending')
        .select(
          'uf.id',
          'u.id as userId',
          'u.first_name as firstName',
          'u.last_name as lastName',
          'u.email',
          'uf.created_at as requestedAt',
          'uf.metadata'
        ),
      db('user_follows as uf')
        .innerJoin('users as u', 'u.id', 'uf.following_id')
        .where('uf.follower_id', userId)
        .andWhere('uf.status', 'pending')
        .select(
          'uf.id',
          'u.id as userId',
          'u.first_name as firstName',
          'u.last_name as lastName',
          'u.email',
          'uf.created_at as requestedAt',
          'uf.metadata'
        ),
      FollowRecommendationModel.listForUser(userId, { limit: 6 }),
      db('payment_intents')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .select(
          'public_id as publicId',
          'status',
          'currency',
          'amount_subtotal as amountSubtotal',
          'amount_discount as amountDiscount',
          'amount_tax as amountTax',
          'amount_total as amountTotal',
          'amount_refunded as amountRefunded',
          'metadata',
          'entity_type as entityType',
          'entity_id as entityId',
          'captured_at as capturedAt',
          'created_at as createdAt'
        ),
      db('ebook_read_progress as erp')
        .innerJoin('content_assets as asset', 'asset.id', 'erp.asset_id')
        .innerJoin('ebooks as ebook', 'ebook.asset_id', 'asset.id')
        .where('erp.user_id', userId)
        .select(
          'ebook.id as ebookId',
          'ebook.public_id as ebookPublicId',
          'ebook.title',
          'ebook.slug',
          'ebook.subtitle',
          'ebook.description',
          'ebook.price_currency as currency',
          'ebook.price_amount as priceAmount',
          'ebook.rating_average as ratingAverage',
          'ebook.rating_count as ratingCount',
          'ebook.metadata as ebookMetadata',
          'erp.progress_percent as progressPercent',
          'erp.last_location as lastLocation',
          'erp.time_spent_seconds as timeSpentSeconds'
        ),
      db('ebooks').select(
        'id',
        'asset_id as assetId',
        'public_id as publicId',
        'title',
        'slug',
        'subtitle',
        'description',
        'authors',
        'price_currency as currency',
        'price_amount as priceAmount',
        'rating_average as ratingAverage',
        'rating_count as ratingCount',
        'metadata',
        'release_at as releaseAt'
      ),
      db('ebook_highlights').where('user_id', userId).select('ebook_id as ebookId', 'id'),
      db('ebook_bookmarks').where('user_id', userId).select('ebook_id as ebookId', 'id'),
      db('community_messages as msg')
        .leftJoin('communities as c', 'c.id', 'msg.community_id')
        .where('msg.author_id', userId)
        .orderBy('msg.delivered_at', 'desc')
        .limit(5)
        .select(
          'msg.id',
          'msg.body',
          'msg.metadata',
          'msg.delivered_at as deliveredAt',
          'msg.thread_root_id as threadRootId',
          'c.name as communityName'
        ),
      db('community_messages as msg')
        .leftJoin('communities as c', 'c.id', 'msg.community_id')
        .where('msg.author_id', userId)
        .groupBy('msg.community_id', 'c.name')
        .select('msg.community_id as communityId', 'c.name as communityName', db.raw('COUNT(*) as contribution_count')),
      db('course_assignments as ca')
        .innerJoin('course_enrollments as ce', 'ce.course_id', 'ca.course_id')
        .innerJoin('courses as c', 'c.id', 'ca.course_id')
        .where('ce.user_id', userId)
        .select(
          'ca.id',
          'ca.course_id as courseId',
          'ca.title',
          'ca.due_offset_days as dueOffsetDays',
          'ca.metadata',
          'ce.started_at as enrollmentStartedAt',
          'c.title as courseTitle'
        ),
      db('courses as course')
        .where('course.instructor_id', userId)
        .select(
          'course.id',
          'course.public_id as publicId',
          'course.title',
          'course.slug',
          'course.summary',
          'course.status',
          'course.delivery_format as deliveryFormat',
          'course.price_amount as priceAmount',
          'course.price_currency as priceCurrency',
          'course.release_at as releaseAt',
          'course.metadata',
          'course.enrolment_count as enrolmentCount',
          'course.rating_average as ratingAverage',
          'course.rating_count as ratingCount',
          'course.created_at as createdAt',
          'course.updated_at as updatedAt'
        ),
      db('course_enrollments as ice')
        .innerJoin('courses as ic', 'ic.id', 'ice.course_id')
        .where('ic.instructor_id', userId)
        .select(
          'ice.id',
          'ice.course_id as courseId',
          'ice.user_id as userId',
          'ice.status',
          'ice.progress_percent as progressPercent',
          'ice.started_at as startedAt',
          'ice.completed_at as completedAt',
          'ice.last_accessed_at as lastAccessedAt',
          'ice.metadata',
          'ic.price_amount as priceAmount',
          'ic.price_currency as priceCurrency'
        ),
      db('course_modules as module')
        .innerJoin('courses as course', 'course.id', 'module.course_id')
        .where('course.instructor_id', userId)
        .select(
          'module.id',
          'module.course_id as courseId',
          'module.title',
          'module.slug',
          'module.position',
          'module.release_offset_days as releaseOffsetDays',
          'module.metadata'
        ),
      db('course_lessons as lesson')
        .innerJoin('courses as course', 'course.id', 'lesson.course_id')
        .innerJoin('course_modules as module', 'module.id', 'lesson.module_id')
        .where('course.instructor_id', userId)
        .select(
          'lesson.id',
          'lesson.course_id as courseId',
          'lesson.module_id as moduleId',
          'lesson.title',
          'lesson.slug',
          'lesson.position',
          'lesson.release_at as releaseAt',
          'lesson.duration_minutes as durationMinutes',
          'lesson.metadata',
          'course.title as courseTitle',
          'course.release_at as courseReleaseAt',
          'module.title as moduleTitle',
          'module.release_offset_days as moduleReleaseOffsetDays'
        ),
      db('course_assignments as assignment')
        .innerJoin('courses as course', 'course.id', 'assignment.course_id')
        .leftJoin('course_modules as module', 'module.id', 'assignment.module_id')
        .where('course.instructor_id', userId)
        .select(
          'assignment.id',
          'assignment.course_id as courseId',
          'assignment.module_id as moduleId',
          'assignment.title',
          'assignment.instructions',
          'assignment.max_score as maxScore',
          'assignment.due_offset_days as dueOffsetDays',
          'assignment.metadata',
          'course.title as courseTitle',
          'course.release_at as courseReleaseAt',
          'module.title as moduleTitle'
        ),
      db('tutor_profiles as tp')
        .where('tp.user_id', userId)
        .select(
          'tp.id',
          'tp.display_name as displayName',
          'tp.headline',
          'tp.hourly_rate_amount as hourlyRateAmount',
          'tp.hourly_rate_currency as hourlyRateCurrency',
          'tp.rating_average as ratingAverage',
          'tp.rating_count as ratingCount',
          'tp.completed_sessions as completedSessions',
          'tp.metadata'
        ),
      db('tutor_availability_slots as slot')
        .innerJoin('tutor_profiles as tp', 'tp.id', 'slot.tutor_id')
        .where('tp.user_id', userId)
        .select(
          'slot.id',
          'slot.tutor_id as tutorId',
          'slot.start_at as startAt',
          'slot.end_at as endAt',
          'slot.status',
          'slot.is_recurring as isRecurring',
          'slot.recurrence_rule as recurrenceRule',
          'slot.metadata',
          'tp.display_name as tutorName'
        ),
      db('tutor_bookings as booking')
        .innerJoin('tutor_profiles as tp', 'tp.id', 'booking.tutor_id')
        .leftJoin('users as learner', 'learner.id', 'booking.learner_id')
        .where('tp.user_id', userId)
        .select(
          'booking.id',
          'booking.public_id as publicId',
          'booking.tutor_id as tutorId',
          'booking.status',
          'booking.requested_at as requestedAt',
          'booking.confirmed_at as confirmedAt',
          'booking.scheduled_start as scheduledStart',
          'booking.scheduled_end as scheduledEnd',
          'booking.duration_minutes as durationMinutes',
          'booking.metadata',
          'learner.first_name as learnerFirstName',
          'learner.last_name as learnerLastName'
        ),
      db('live_classrooms as lc')
        .leftJoin('communities as community', 'community.id', 'lc.community_id')
        .where('lc.instructor_id', userId)
        .select(
          'lc.id',
          'lc.public_id as publicId',
          'lc.title',
          'lc.slug',
          'lc.summary',
          'lc.status',
          'lc.type',
          'lc.is_ticketed as isTicketed',
          'lc.price_amount as priceAmount',
          'lc.price_currency as priceCurrency',
          'lc.capacity',
          'lc.reserved_seats as reservedSeats',
          'lc.start_at as startAt',
          'lc.end_at as endAt',
          'lc.metadata',
          'community.id as communityId',
          'community.name as communityName'
        ),
      db('content_assets as asset')
        .leftJoin('users as creator', 'creator.id', 'asset.created_by')
        .where('asset.created_by', userId)
        .select(
          'asset.id',
          'asset.public_id as publicId',
          'asset.type',
          'asset.original_filename as originalFilename',
          'asset.status',
          'asset.visibility',
          'asset.size_bytes as sizeBytes',
          'asset.mime_type as mimeType',
          'asset.metadata',
          'asset.created_at as createdAt',
          'asset.updated_at as updatedAt',
          'creator.first_name as creatorFirstName',
          'creator.last_name as creatorLastName'
        ),
      db('content_asset_events as event')
        .whereIn(
          'event.asset_id',
          db('content_assets').select('id').where('created_by', userId)
        )
        .select('event.id', 'event.asset_id as assetId', 'event.user_id as userId', 'event.event_type as eventType', 'event.occurred_at as occurredAt', 'event.metadata'),
      db('community_resources as resource')
        .leftJoin('communities as community', 'community.id', 'resource.community_id')
        .select(
          'resource.id',
          'resource.community_id as communityId',
          'resource.created_by as createdBy',
          'resource.title',
          'resource.description',
          'resource.resource_type as resourceType',
          'resource.tags',
          'resource.status',
          'resource.metadata',
          'resource.published_at as publishedAt',
          'community.owner_id as ownerId',
          'community.name as communityName'
        ),
      db('community_posts as post')
        .leftJoin('communities as community', 'community.id', 'post.community_id')
        .where('post.author_id', userId)
        .select(
          'post.id',
          'post.community_id as communityId',
          'post.title',
          'post.post_type as postType',
          'post.status',
          'post.published_at as publishedAt',
          'post.metadata',
          'community.name as communityName'
        ),
      db('ads_campaigns as campaign')
        .leftJoin('users as creator', 'creator.id', 'campaign.created_by')
        .select(
          'campaign.id',
          'campaign.public_id as publicId',
          'campaign.name',
          'campaign.objective',
          'campaign.status',
          'campaign.budget_currency as budgetCurrency',
          'campaign.budget_daily_cents as budgetDailyCents',
          'campaign.spend_currency as spendCurrency',
          'campaign.spend_total_cents as spendTotalCents',
          'campaign.performance_score as performanceScore',
          'campaign.ctr',
          'campaign.cpc_cents as cpcCents',
          'campaign.cpa_cents as cpaCents',
          'campaign.targeting_keywords as targetingKeywords',
          'campaign.targeting_audiences as targetingAudiences',
          'campaign.targeting_locations as targetingLocations',
          'campaign.targeting_languages as targetingLanguages',
          'campaign.start_at as startAt',
          'campaign.end_at as endAt',
          'campaign.creative_headline as creativeHeadline',
          'campaign.creative_description as creativeDescription',
          'campaign.creative_url as creativeUrl',
          'campaign.metadata',
          'campaign.created_by as createdBy',
          'creator.first_name as creatorFirstName',
          'creator.last_name as creatorLastName'
        ),
      db('ads_campaign_metrics_daily as metric')
        .innerJoin('ads_campaigns as campaign', 'campaign.id', 'metric.campaign_id')
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
        ),
      db('community_paywall_tiers as tier')
        .innerJoin('communities as community', 'community.id', 'tier.community_id')
        .select(
          'tier.id',
          'tier.community_id as communityId',
          'tier.name',
          'tier.slug',
          'tier.price_cents as priceCents',
          'tier.currency',
          'tier.billing_interval as billingInterval',
          'tier.is_active as isActive',
          'tier.metadata',
          'community.owner_id as ownerId',
          'community.name as communityName'
        ),
      db('community_subscriptions as subscription')
        .leftJoin('communities as community', 'community.id', 'subscription.community_id')
        .leftJoin('community_paywall_tiers as tier', 'tier.id', 'subscription.tier_id')
        .select(
          'subscription.id',
          'subscription.community_id as communityId',
          'subscription.user_id as userId',
          'subscription.status',
          'subscription.started_at as startedAt',
          'subscription.current_period_end as currentPeriodEnd',
          'subscription.metadata',
          'tier.name as tierName',
          'tier.price_cents as priceCents',
          'tier.currency',
          'tier.billing_interval as billingInterval',
          'community.owner_id as ownerId',
          'community.name as communityName'
        )
    ]);
    const communityStatsMap = new Map();
    communityStatRows.forEach((row) => {
      communityStatsMap.set(Number(row.community_id), {
        activeMembers: Number(row.active_members ?? 0),
        pendingMembers: Number(row.pending_members ?? 0),
        moderators: Number(row.moderators ?? 0)
      });
    });

    const subscriptionByCommunity = new Map();
    subscriptionRows.forEach((row) => {
      subscriptionByCommunity.set(Number(row.communityId), {
        ...row,
        metadata: safeJsonParse(row.subscriptionMetadata, {})
      });
    });

    const affiliateByCommunity = new Map();
    affiliateRows.forEach((row) => {
      affiliateByCommunity.set(Number(row.communityId), {
        ...row,
        metadata: safeJsonParse(row.metadata, {})
      });
    });

    const affiliatePayoutByAffiliate = new Map();
    affiliatePayoutRows.forEach((row) => {
      const entry = affiliatePayoutByAffiliate.get(row.affiliateId) ?? [];
      entry.push({ ...row, metadata: safeJsonParse(row.metadata, {}) });
      affiliatePayoutByAffiliate.set(row.affiliateId, entry);
    });

    const communityDashboard = buildCommunityDashboard({
      user,
      now,
      communityMemberships: membershipRows,
      communityStats: communityStatRows,
      communityResources: communityResourceRows,
      communityPosts: communityPostRows,
      communityMessages: communityMessageRows,
      communityMessageContributions: communityMessageContributionRows,
      communityAssignments,
      liveClassrooms: instructorLiveClassRows,
      tutorBookings: instructorBookingRows,
      adsCampaigns: adsCampaignRows,
      adsMetrics: adsMetricRows,
      communityPaywallTiers: communityPaywallTierRows,
      communitySubscriptions: communitySubscriptionRows
    });

    const instructorDashboard = buildInstructorDashboard({
      user,
      now,
      courses: instructorCourseRows,
      courseEnrollments: instructorCourseEnrollmentRows,
      modules: instructorCourseModuleRows,
      lessons: instructorLessonRows,
      assignments: instructorAssignmentRows,
      tutorProfiles: tutorProfileRows,
      tutorAvailability: tutorAvailabilityRows,
      tutorBookings: instructorBookingRows,
      liveClassrooms: instructorLiveClassRows,
      assets: instructorAssetRows,
      assetEvents: instructorAssetEventRows,
      communityMemberships: membershipRows,
      communityStats: communityStatRows,
      communityResources: communityResourceRows,
      communityPosts: communityPostRows,
      adsCampaigns: adsCampaignRows,
      adsMetrics: adsMetricRows,
      paywallTiers: communityPaywallTierRows,
      communitySubscriptions: communitySubscriptionRows,
      ebookRows,
      ebookProgressRows
    });

    const progressByEnrollmentLesson = new Map();
    progressRows.forEach((row) => {
      const lessonSlug = row.lessonSlug ?? row.lessonTitle ?? `lesson-${row.lessonPosition}`;
      const lessonMap = progressByEnrollmentLesson.get(row.enrollmentId) ?? new Map();
      if (lessonSlug) {
        lessonMap.set(String(lessonSlug), row);
      }
      progressByEnrollmentLesson.set(row.enrollmentId, lessonMap);
    });

    const enrollmentCourseIds = Array.from(
      new Set(
        enrollmentRows
          .map((row) => Number(row.courseId))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );
    const instructorCourseIds = new Set(
      instructorCourseRows.map((course) => Number(course.id)).filter((id) => Number.isFinite(id) && id > 0)
    );
    const learnerCourseIds = enrollmentCourseIds.filter((id) => !instructorCourseIds.has(id));

    let learnerCourseModuleRows = [];
    let learnerLessonRows = [];

    if (learnerCourseIds.length > 0) {
      learnerCourseModuleRows = await db('course_modules as module')
        .select(
          'module.id',
          'module.course_id as courseId',
          'module.title',
          'module.slug as moduleSlug',
          'module.position',
          'module.release_offset_days as releaseOffsetDays',
          'module.metadata'
        )
        .whereIn('module.course_id', learnerCourseIds);

      learnerLessonRows = await db('course_lessons as lesson')
        .innerJoin('course_modules as module', 'module.id', 'lesson.module_id')
        .innerJoin('courses as course', 'course.id', 'lesson.course_id')
        .select(
          'lesson.id',
          'lesson.course_id as courseId',
          'lesson.module_id as moduleId',
          'lesson.title',
          'lesson.slug as lessonSlug',
          'lesson.position',
          'lesson.release_at as releaseAt',
          'lesson.duration_minutes as durationMinutes',
          'lesson.metadata',
          'course.title as courseTitle',
          'course.release_at as courseReleaseAt',
          'module.title as moduleTitle',
          'module.release_offset_days as moduleReleaseOffsetDays'
        )
        .whereIn('lesson.course_id', learnerCourseIds);
    }

    const learnerModulesByCourse = new Map();
    const learnerLessonsByModule = new Map();

    const normaliseModuleRow = (row) => ({
      id: Number(row.id),
      courseId: Number(row.courseId),
      title: row.title,
      slug: row.moduleSlug ?? row.slug,
      position: Number(row.position ?? 0),
      releaseOffsetDays: Number(row.releaseOffsetDays ?? 0),
      metadata: safeJsonParse(row.metadata, {})
    });

    [...instructorCourseModuleRows, ...learnerCourseModuleRows].forEach((row) => {
      const module = normaliseModuleRow(row);
      if (!Number.isFinite(module.courseId)) return;
      const modules = learnerModulesByCourse.get(module.courseId) ?? [];
      modules.push(module);
      learnerModulesByCourse.set(module.courseId, modules);
    });

    const normaliseLessonRow = (row) => {
      const moduleOffset = Number(row.moduleReleaseOffsetDays ?? 0);
      let releaseAt = row.releaseAt ? new Date(row.releaseAt) : null;
      if (!releaseAt && row.courseReleaseAt) {
        const base = new Date(row.courseReleaseAt);
        releaseAt = new Date(base.getTime() + moduleOffset * DAY_IN_MS);
      }
      return {
        id: Number(row.id),
        courseId: Number(row.courseId),
        moduleId: Number(row.moduleId),
        slug: row.lessonSlug ?? row.slug,
        title: row.title,
        position: Number(row.position ?? 0),
        releaseAt,
        durationMinutes: Number(row.durationMinutes ?? 0),
        metadata: safeJsonParse(row.metadata, {})
      };
    };

    [...instructorLessonRows, ...learnerLessonRows].forEach((row) => {
      const lesson = normaliseLessonRow(row);
      if (!Number.isFinite(lesson.moduleId)) return;
      const lessons = learnerLessonsByModule.get(lesson.moduleId) ?? [];
      lessons.push(lesson);
      learnerLessonsByModule.set(lesson.moduleId, lessons);
    });

    const learningCompletions = progressRows
      .filter((row) => row.completed && row.completedAt)
      .map((row) => ({
        completedAt: row.completedAt,
        durationMinutes: Number(row.durationMinutes ?? 0)
      }));

    const streak = calculateLearningStreak(
      learningCompletions.map((entry) => entry.completedAt),
      now
    );

    const lastSevenWindow = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const previousSevenWindow = now.getTime() - 14 * 24 * 60 * 60 * 1000;

    const lastSevenCompletions = learningCompletions.filter((entry) => {
      const completed = typeof entry.completedAt === 'string' ? new Date(entry.completedAt) : entry.completedAt;
      return completed.getTime() >= lastSevenWindow;
    });

    const previousSevenCompletions = learningCompletions.filter((entry) => {
      const completed = typeof entry.completedAt === 'string' ? new Date(entry.completedAt) : entry.completedAt;
      return completed.getTime() >= previousSevenWindow && completed.getTime() < lastSevenWindow;
    });

    const timeInvestedCurrent = sum(lastSevenCompletions, (entry) => entry.durationMinutes);
    const timeInvestedPrevious = sum(previousSevenCompletions, (entry) => entry.durationMinutes);
    const modulesCompletedCurrent = lastSevenCompletions.length;
    const modulesCompletedPrevious = previousSevenCompletions.length;

    const communityContributionMap = new Map();
    communityMessageContributionRows.forEach((row) => {
      communityContributionMap.set(Number(row.communityId), {
        name: row.communityName,
        count: Number(row.contribution_count ?? 0)
      });
    });

    const memberships = membershipRows.map((row) => {
      const stats = communityStatsMap.get(Number(row.communityId)) ?? {
        activeMembers: 0,
        pendingMembers: 0,
        moderators: 0
      };
      const subscription = subscriptionByCommunity.get(Number(row.communityId));
      const affiliate = affiliateByCommunity.get(Number(row.communityId));
      const affiliatePayouts = affiliate ? affiliatePayoutByAffiliate.get(affiliate.id) ?? [] : [];
      const upcomingSessions = liveClassRows.filter(
        (session) => Number(session.communityId ?? 0) === Number(row.communityId)
      );

      const initiatives = [];
      if (subscription) {
        initiatives.push(
          `Subscribed to ${subscription.tierName} (${formatCurrency(subscription.tierPriceCents, subscription.tierCurrency)}/${subscription.tierInterval})`
        );
      }
      if (affiliate) {
        const outstanding = Number(affiliate.totalEarnedCents ?? 0) - Number(affiliate.totalPaidCents ?? 0);
        initiatives.push(`Affiliate referrals ${affiliate.referralCode} · ${formatCurrency(outstanding, 'USD')} pending`);
      }
      if (stats.pendingMembers > 0) {
        initiatives.push(`${stats.pendingMembers} member invite${stats.pendingMembers === 1 ? '' : 's'} awaiting approval`);
      }
      if (upcomingSessions.length > 0) {
        initiatives.push(`${upcomingSessions.length} live session${upcomingSessions.length === 1 ? '' : 's'} scheduled`);
      }
      if (initiatives.length === 0) {
        initiatives.push('Monitoring engagement and retention baselines');
      }

      const totalMembers = stats.activeMembers + stats.pendingMembers;
      const healthRatio = totalMembers > 0 ? Math.round((stats.activeMembers / totalMembers) * 100) : 0;

      return {
        id: `community-${row.communityId}`,
        name: row.communityName,
        members: `${stats.activeMembers} active`,
        moderators: stats.moderators,
        health: `${healthRatio}%`,
        initiatives,
        metadata: {
          role: row.role,
          status: row.status
        }
      };
    });

    const pipelineEntries = [];
    subscriptionRows.forEach((subscription) => {
      if (!subscription.currentPeriodEnd || !subscription.currentPeriodStart) return;
      const totalDays = Math.max(differenceInDays(subscription.currentPeriodEnd, subscription.currentPeriodStart), 1);
      const elapsedDays = Math.min(
        Math.max(differenceInDays(now, subscription.currentPeriodStart), 0),
        totalDays
      );
      const progressPercent = Math.round((elapsedDays / totalDays) * 100);
      pipelineEntries.push({
        id: `subscription-${subscription.subscriptionId}`,
        title: `${subscription.tierName} renewal`,
        owner: 'You',
        progress: progressPercent
      });
    });

    affiliateRows.forEach((affiliate) => {
      const payouts = affiliatePayoutByAffiliate.get(affiliate.id) ?? [];
      payouts.forEach((payout) => {
        let progress = 25;
        if (payout.status === 'processing') progress = 60;
        if (payout.status === 'completed') progress = 100;
        pipelineEntries.push({
          id: `payout-${payout.id}`,
          title: `Affiliate payout ${payout.payoutReference}`,
          owner: affiliate.referralCode,
          progress
        });
      });
    });

    liveClassRows.forEach((session) => {
      if (!session.capacity) return;
      const occupancy = Math.min(
        Math.round((Number(session.reservedSeats ?? 0) / Number(session.capacity ?? 1)) * 100),
        100
      );
      pipelineEntries.push({
        id: `classroom-${session.classroomId}`,
        title: `${session.title} occupancy`,
        owner: session.communityName ?? 'Live classroom',
        progress: occupancy
      });
    });

    const uniquePipelines = [];
    const pipelineIds = new Set();
    pipelineEntries
      .sort((a, b) => b.progress - a.progress)
      .forEach((entry) => {
        if (pipelineIds.has(entry.id) || uniquePipelines.length >= 4) return;
        pipelineIds.add(entry.id);
        uniquePipelines.push(entry);
      });

    const activeEnrollments = enrollmentRows.filter((row) => row.status === 'active');
    const learnerCourseSummaries = activeEnrollments.map((enrollment) => {
      const courseId = Number(enrollment.courseId);
      const modules = [...(learnerModulesByCourse.get(courseId) ?? [])].sort(
        (a, b) => a.position - b.position
      );
      const lessonProgress = progressByEnrollmentLesson.get(enrollment.enrollmentId) ?? new Map();

      const moduleSummaries = modules.map((module) => {
        const lessonRows = [...(learnerLessonsByModule.get(module.id) ?? [])].sort(
          (a, b) => a.position - b.position
        );
        const lessons = lessonRows.map((lesson) => {
          const progress = lessonProgress.get(lesson.slug ?? `lesson-${lesson.id}`) ?? null;
          const completed = Boolean(progress?.completed);
          const releaseAtIso = lesson.releaseAt ? lesson.releaseAt.toISOString() : null;
          const available = !lesson.releaseAt || lesson.releaseAt <= now;
          const status = completed ? 'completed' : available ? 'available' : 'scheduled';
          return {
            id: `lesson-${lesson.id}`,
            title: lesson.title,
            slug: lesson.slug,
            durationMinutes: lesson.durationMinutes,
            releaseAt: releaseAtIso,
            completed,
            completedAt: progress?.completedAt ?? null,
            status
          };
        });

        const completedLessons = lessons.filter((lesson) => lesson.completed).length;
        const totalLessons = lessons.length;
        const completionPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        const nextLesson = lessons.find((lesson) => !lesson.completed);

        return {
          id: `module-${module.id}`,
          title: module.title,
          position: module.position,
          releaseLabel: formatReleaseOffsetLabel(module.releaseOffsetDays),
          lessons,
          progress: {
            completedLessons,
            totalLessons,
            completionPercent
          },
          nextLesson: nextLesson
            ? {
                lessonId: nextLesson.id,
                title: nextLesson.title,
                status: nextLesson.status,
                releaseAt: nextLesson.releaseAt
              }
            : null
        };
      });

      const orderedLessons = moduleSummaries.flatMap((module) =>
        module.lessons.map((lesson) => ({
          ...lesson,
          moduleTitle: module.title,
          moduleReleaseLabel: module.releaseLabel
        }))
      );
      const nextLesson = orderedLessons.find((lesson) => !lesson.completed);

      return {
        id: enrollment.courseSlug,
        title: enrollment.courseTitle,
        status: 'In progress',
        progress: Math.round(Number(enrollment.progressPercent ?? 0)),
        instructor: `${enrollment.instructorFirstName} ${enrollment.instructorLastName}`.trim(),
        nextLesson: nextLesson ? `${nextLesson.moduleTitle} · ${nextLesson.title}` : 'Review completed lessons',
        nextLessonDetail: nextLesson
          ? {
              lessonId: nextLesson.id,
              lessonTitle: nextLesson.title,
              moduleTitle: nextLesson.moduleTitle,
              releaseAt: nextLesson.releaseAt,
              completed: nextLesson.completed,
              status: nextLesson.status,
              moduleReleaseLabel: nextLesson.moduleReleaseLabel
            }
          : null,
        modules: moduleSummaries
      };
    });

    const ebookHighlightMap = ebookHighlightRows.reduce((acc, row) => {
      const key = Number(row.ebookId);
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map());

    const ebookBookmarkMap = ebookBookmarkRows.reduce((acc, row) => {
      const key = Number(row.ebookId);
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map());

    const ebookLibrary = ebookProgressRows.map((row) => {
      const highlights = ebookHighlightMap.get(row.ebookId) ?? 0;
      const bookmarks = ebookBookmarkMap.get(row.ebookId) ?? 0;
      const progressPercent = Number(row.progressPercent ?? 0);
      let statusLabel = 'Not started';
      if (progressPercent >= 100) statusLabel = 'Completed';
      else if (progressPercent > 0) statusLabel = 'In progress';
      return {
        id: `ebook-${row.ebookId}`,
        title: row.title,
        status: statusLabel,
        progress: progressPercent,
        price: formatCurrency(row.priceAmount, row.currency),
        highlights,
        bookmarks,
        timeSpent: minutesToReadable(Number(row.timeSpentSeconds ?? 0) / 60)
      };
    });

    const recommendationCandidates = ebookRows.filter((ebook) =>
      !ebookProgressRows.some((progress) => progress.ebookId === ebook.id)
    );
    const courseRecommendations = recommendationCandidates.slice(0, 3).map((ebook) => ({
      id: `ebook-rec-${ebook.id}`,
      title: `${ebook.title} (Ebook)`,
      summary: (ebook.subtitle ?? ebook.description ?? '').slice(0, 120) || 'Explore complementary research and playbooks.',
      rating: Number(ebook.ratingAverage ?? 0).toFixed(1)
    }));

    const assignmentAlerts = communityAssignments
      .map((assignment) => {
        if (!assignment.enrollmentStartedAt) return null;
        const dueDate = new Date(assignment.enrollmentStartedAt);
        dueDate.setDate(dueDate.getDate() + Number(assignment.dueOffsetDays ?? 0));
        return {
          id: assignment.id,
          courseTitle: assignment.courseTitle,
          title: assignment.title,
          dueDate
        };
      })
      .filter((assignment) => assignment && assignment.dueDate >= now);

    const upcomingEvents = [];
    liveClassRows.forEach((session) => {
      if (!session.startAt) return;
      const start = new Date(session.startAt);
      if (start < now) return;
      upcomingEvents.push({
        id: `live-${session.classroomId}`,
        title: session.title,
        type: 'Live classroom',
        date: start,
        host: session.communityName ?? 'Edulure Live',
        action: session.registrationStatus === 'registered' ? 'Join room' : 'Manage ticket'
      });
    });

    tutorBookingRows.forEach((booking) => {
      if (!booking.scheduledStart) return;
      const start = new Date(booking.scheduledStart);
      if (start < now) return;
      upcomingEvents.push({
        id: `booking-${booking.id}`,
        title: booking.metadata?.topic ?? booking.tutorHeadline ?? 'Mentor session',
        type: 'Mentor session',
        date: start,
        host: booking.tutorName,
        action: 'Review brief'
      });
    });

    assignmentAlerts
      .filter((assignment) => assignment.dueDate.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000)
      .forEach((assignment) => {
        upcomingEvents.push({
          id: `assignment-${assignment.id}`,
          title: assignment.title,
          type: 'Assignment due',
          date: assignment.dueDate,
          host: assignment.courseTitle,
          action: 'Submit work'
        });
      });

    upcomingEvents.sort((a, b) => a.date - b.date);

    const upcomingDisplay = upcomingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      type: event.type,
      date: formatDateTime(event.date, { timeStyle: 'short' }),
      host: event.host,
      action: event.action,
      dateLabel: event.date.toLocaleDateString('en-US', { weekday: 'short' })
    }));

    const calendarEntries = buildCalendarEntries(
      upcomingDisplay.map((event) => ({
        day: event.dateLabel,
        description: `${event.type} · ${event.title}`
      }))
    );

    const tutorSessions = tutorBookingRows.map((booking) => ({
      ...booking,
      metadata: safeJsonParse(booking.metadata, {})
    }));

    const tutorBookings = {
      active: tutorSessions
        .filter((booking) => booking.scheduledStart && new Date(booking.scheduledStart) >= now)
        .map((booking) => ({
          id: booking.id,
          topic: booking.metadata?.topic ?? booking.tutorHeadline ?? 'Mentor session',
          mentor: booking.tutorName,
          date: formatDateTime(booking.scheduledStart, { timeStyle: 'short' }),
          status: booking.status
        })),
      history: tutorSessions
        .filter((booking) => booking.scheduledEnd && new Date(booking.scheduledEnd) < now)
        .map((booking) => ({
          id: booking.id,
          mentor: booking.tutorName,
          topic: booking.metadata?.topic ?? booking.tutorHeadline ?? 'Mentor session',
          date: formatDateTime(booking.scheduledStart, { dateStyle: 'medium' }),
          rating: Number(booking.tutorRating ?? 0).toFixed(1)
        }))
    };

    const learnerLiveClassSessions = liveClassRows.map((session) =>
      normaliseLiveClassroom(
        {
          ...session,
          metadata: safeJsonParse(session.classroomMetadata, {}),
          registrationStatus: session.registrationStatus,
          ticketType: session.ticketType,
          amountPaid: session.amountPaid,
          registrationCurrency: session.registrationCurrency,
          priceAmount: session.priceAmount,
          priceCurrency: session.priceCurrency
        },
        { now, perspective: 'learner', allowJoinLink: session.registrationStatus === 'registered' }
      )
    );

    const learnerUpcomingLive = learnerLiveClassSessions.filter((session) =>
      ['upcoming', 'check-in'].includes(session.status)
    );
    const learnerActiveLive = learnerLiveClassSessions.filter((session) => session.status === 'live');
    const learnerCompletedLive = learnerLiveClassSessions
      .filter((session) => session.status === 'completed')
      .sort((a, b) => {
        const aTime = a.endAt ? new Date(a.endAt).getTime() : a.startAt ? new Date(a.startAt).getTime() : 0;
        const bTime = b.endAt ? new Date(b.endAt).getTime() : b.startAt ? new Date(b.startAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);

    const learnerGroupSessions = learnerLiveClassSessions
      .filter((session) => session.isGroupSession)
      .map((session) => ({
        id: session.id,
        title: session.title,
        stage: session.stage,
        status: session.status,
        startLabel: session.startLabel,
        occupancy: session.occupancy,
        callToAction: session.callToAction,
        facilitators: session.facilitators,
        breakoutRooms: session.breakoutRooms
      }));

    const learnerWhiteboardSnapshots = buildLiveClassWhiteboardSnapshots(learnerLiveClassSessions).slice(0, 6);
    const learnerReadiness = buildLiveClassReadiness(learnerLiveClassSessions);
    const registeredLiveCount = learnerLiveClassSessions.filter((session) => session.registration === 'registered').length;
    const waitlistedLiveCount = learnerLiveClassSessions.filter((session) => session.registration === 'waitlisted').length;
    const averageLearnerOccupancy = averageOccupancyRate(learnerLiveClassSessions);
    const readyWhiteboards = learnerWhiteboardSnapshots.filter((snapshot) => snapshot.ready).length;

    const learnerLiveMetrics = [
      {
        label: 'Registered live classes',
        value: String(registeredLiveCount),
        change: learnerActiveLive.length > 0 ? `${learnerActiveLive.length} streaming now` : 'All sessions scheduled',
        trend: registeredLiveCount > 0 ? 'up' : 'down'
      },
      {
        label: 'Average seat fill',
        value: averageLearnerOccupancy !== null ? `${averageLearnerOccupancy}%` : 'N/A',
        change: waitlistedLiveCount > 0 ? `${waitlistedLiveCount} waitlisted` : 'No waitlist pressure',
        trend: averageLearnerOccupancy !== null && averageLearnerOccupancy >= 70 ? 'up' : 'down'
      },
      {
        label: 'Whiteboard readiness',
        value:
          learnerWhiteboardSnapshots.length > 0
            ? `${readyWhiteboards}/${learnerWhiteboardSnapshots.length} ready`
            : 'No boards queued',
        change:
          learnerWhiteboardSnapshots.length === 0
            ? 'Boards open on demand'
            : `${learnerWhiteboardSnapshots.length - readyWhiteboards} in preparation`,
        trend:
          learnerWhiteboardSnapshots.length === 0 || readyWhiteboards === learnerWhiteboardSnapshots.length ? 'up' : 'down'
      }
    ];

    const totalSpent = paymentIntentRows
      .filter((intent) => intent.status === 'succeeded')
      .reduce((total, intent) => total + Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0), 0);

    const lastThirtyWindow = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const previousThirtyWindow = now.getTime() - 60 * 24 * 60 * 60 * 1000;

    const totalSpentCurrent = paymentIntentRows
      .filter((intent) => intent.status === 'succeeded' && intent.capturedAt && new Date(intent.capturedAt).getTime() >= lastThirtyWindow)
      .reduce((total, intent) => total + Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0), 0);

    const totalSpentPrevious = paymentIntentRows
      .filter((intent) =>
        intent.status === 'succeeded' &&
        intent.capturedAt &&
        new Date(intent.capturedAt).getTime() >= previousThirtyWindow &&
        new Date(intent.capturedAt).getTime() < lastThirtyWindow
      )
      .reduce((total, intent) => total + Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0), 0);

    const activeSubscriptions = subscriptionRows.filter((subscription) => subscription.status === 'active');
    const outstandingAffiliate = affiliateRows.reduce(
      (total, affiliate) => total + (Number(affiliate.totalEarnedCents ?? 0) - Number(affiliate.totalPaidCents ?? 0)),
      0
    );

    const financialSummary = [
      {
        label: 'Total invested',
        value: formatCurrency(totalSpent, 'USD'),
        change: `${totalSpentCurrent >= totalSpentPrevious ? '+' : '−'}${formatCurrency(
          Math.abs(totalSpentCurrent - totalSpentPrevious),
          'USD'
        )} last 30d`,
        trend: totalSpentCurrent >= totalSpentPrevious ? 'up' : 'down'
      },
      {
        label: 'Active subscriptions',
        value: `${activeSubscriptions.length} active`,
        change: activeSubscriptions
          .map((subscription) =>
            `Renews ${formatDateTime(subscription.currentPeriodEnd, { dateStyle: 'medium', timeStyle: undefined })}`
          )
          .join(' • ') || 'No renewals scheduled',
        trend: 'up'
      },
      {
        label: 'Affiliate credits',
        value: formatCurrency(outstandingAffiliate, 'USD'),
        change: outstandingAffiliate > 0 ? 'Release pending payout' : 'All payouts cleared',
        trend: outstandingAffiliate > 0 ? 'up' : 'down'
      }
    ];

    const invoices = paymentIntentRows.slice(0, 6).map((intent) => {
      const metadata = safeJsonParse(intent.metadata, {});
      const items = Array.isArray(metadata.items) ? metadata.items : [];
      const label = items.length
        ? items.map((item) => item.name ?? item.id).join(', ')
        : intent.entityType ?? 'Payment';
      return {
        id: intent.publicId,
        label,
        amount: formatCurrency(Number(intent.amountTotal ?? 0) - Number(intent.amountRefunded ?? 0), intent.currency ?? 'USD'),
        status: intent.status,
        date: formatDateTime(intent.capturedAt ?? intent.createdAt, { dateStyle: 'medium', timeStyle: undefined })
      };
    });

    const directMessageInsights = directMessageRows.map((row) => {
      const lastMessageAt = row.lastMessageAt ? new Date(row.lastMessageAt) : null;
      const lastReadAt = row.lastReadAt ? new Date(row.lastReadAt) : null;
      const hasUnread = !lastReadAt || (lastMessageAt && lastMessageAt > lastReadAt);
      return {
        threadId: row.threadId,
        unread: hasUnread,
        notificationsEnabled: Boolean(row.notificationsEnabled),
        preview: row.lastMessagePreview
      };
    });

    const unreadThreads = directMessageInsights.filter((entry) => entry.unread).length;

    const pendingFollowRequests = pendingIncomingRows.map((row) => ({
      id: String(row.id),
      userId: Number(row.userId),
      name: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email,
      requestedAt: humanizeRelativeTime(row.requestedAt, now)
    }));

    const followSuggestions = followRecommendations.map((entry) => ({
      id: String(entry.recommendation.id),
      userId: Number(entry.user.id),
      name: `${entry.user.firstName} ${entry.user.lastName}`.trim(),
      score: entry.recommendation.score,
      reason: entry.recommendation.reasonCode.replace(/_/g, ' '),
      email: entry.user.email
    }));

    const feedHighlights = communityMessageRows.map((row) => {
      const metadata = safeJsonParse(row.metadata, {});
      const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
      return {
        id: row.id,
        headline: row.body.slice(0, 120),
        time: humanizeRelativeTime(row.deliveredAt, now),
        tags: tags.length ? tags : [row.communityName ?? 'Community'],
        reactions: metadata.reactions ?? 0,
        comments: metadata.replies ?? 0
      };
    });

    const completedLessons = progressRows.filter((row) => row.completed).length;
    const activeCommunityCount = memberships.filter((membership) => membership.metadata.status === 'active').length;
    const totalCommunityPosts = communityMessageContributionRows.reduce(
      (total, row) => total + Number(row.contribution_count ?? 0),
      0
    );

    const metrics = [
      {
        label: 'Learning streak',
        value: `${streak.current} day${streak.current === 1 ? '' : 's'}`,
        change: `Longest ${streak.longest} day${streak.longest === 1 ? '' : 's'}`,
        trend: streak.current >= streak.longest ? 'up' : 'down'
      },
      {
        label: 'Lessons completed',
        value: `${completedLessons} lessons`,
        change: `${modulesCompletedCurrent >= modulesCompletedPrevious ? '+' : '−'}${Math.abs(
          modulesCompletedCurrent - modulesCompletedPrevious
        )} last 7d`,
        trend: modulesCompletedCurrent >= modulesCompletedPrevious ? 'up' : 'down'
      },
      {
        label: 'Time invested',
        value: minutesToReadable(timeInvestedCurrent),
        change: `${timeInvestedCurrent >= timeInvestedPrevious ? '+' : '−'}${minutesToReadable(
          Math.abs(timeInvestedCurrent - timeInvestedPrevious)
        )} vs prior week`,
        trend: timeInvestedCurrent >= timeInvestedPrevious ? 'up' : 'down'
      },
      {
        label: 'Communities active',
        value: String(activeCommunityCount),
        change: `${totalCommunityPosts} posts logged`,
        trend: totalCommunityPosts > 0 ? 'up' : 'down'
      }
    ];

    const learningPace = buildLearningPace(learningCompletions, now);
    const communityEngagement = Array.from(communityContributionMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((entry) => ({ name: entry.name, participation: entry.count }));

    const notifications = [];
    pendingFollowRequests.forEach((request) => {
      notifications.push({
        id: `follow-${request.id}`,
        title: `${request.name} requested to follow you`,
        timestamp: request.requestedAt,
        type: 'social'
      });
    });
    assignmentAlerts.forEach((assignment) => {
      notifications.push({
        id: `assignment-${assignment.id}`,
        title: `${assignment.title} due ${formatDateTime(assignment.dueDate, { dateStyle: 'medium', timeStyle: undefined })}`,
        timestamp: humanizeRelativeTime(assignment.dueDate, now),
        type: 'learning'
      });
    });
    if (unreadThreads > 0) {
      notifications.push({
        id: 'dm-unread',
        title: `${unreadThreads} conversation${unreadThreads === 1 ? '' : 's'} awaiting review`,
        timestamp: 'Messages',
        type: 'messaging'
      });
    }

    const roles = [{ id: 'learner', label: 'Learner' }];
    if (communityDashboard) {
      roles.push(communityDashboard.role);
    }
    if (instructorDashboard) {
      roles.push(instructorDashboard.role);
    }

    const dashboards = {
      learner: {
        metrics,
        analytics: {
          learningPace,
          communityEngagement
        },
        upcoming: upcomingDisplay.slice(0, 5),
        communities: {
          managed: memberships,
          pipelines: uniquePipelines
        },
        courses: {
          active: learnerCourseSummaries,
          recommendations: courseRecommendations
        },
        liveClassrooms: {
          metrics: learnerLiveMetrics,
          sessions: learnerLiveClassSessions,
          active: learnerActiveLive,
          upcoming: learnerUpcomingLive,
          completed: learnerCompletedLive,
          groups: learnerGroupSessions.slice(0, 6),
          whiteboard: {
            snapshots: learnerWhiteboardSnapshots,
            readiness: learnerReadiness
          }
        },
        calendar: calendarEntries,
        tutorBookings,
        ebooks: {
          library: ebookLibrary,
          recommendations: courseRecommendations
        },
        financial: {
          summary: financialSummary,
          invoices
        },
        notifications: {
          total: notifications.length,
          unreadMessages: unreadThreads,
          items: notifications
        },
        followers: {
          followers: followersCount,
          following: followingCount,
          pending: pendingFollowRequests,
          outgoing: pendingOutgoingRows.map((row) => ({
            id: String(row.id),
            userId: Number(row.userId),
            name: `${row.firstName} ${row.lastName}`.trim(),
            email: row.email,
            requestedAt: humanizeRelativeTime(row.requestedAt, now)
          })),
          recommendations: followSuggestions
        },
        settings: {
          privacy: {
            visibility: privacySettings.profileVisibility,
            followApprovalRequired: privacySettings.followApprovalRequired,
            shareActivity: privacySettings.shareActivity,
            messagePermission: privacySettings.messagePermission
          },
          messaging: {
            unreadThreads,
            notificationsEnabled: directMessageInsights.every((entry) => entry.notificationsEnabled)
          },
          communities: memberships.map((membership) => ({
            id: membership.id,
            name: membership.name,
            role: membership.metadata.role,
            status: membership.metadata.status
          }))
        }
      }
    };

    if (communityDashboard) {
      dashboards.community = communityDashboard.dashboard;
    }
    if (instructorDashboard) {
      dashboards.instructor = instructorDashboard.dashboard;
    }

    let adminDashboard = null;
    if (user.role === 'admin') {
      adminDashboard = await DashboardService.buildAdminDashboard({ now });
      dashboards.admin = adminDashboard.dashboard;
    }

    const searchIndex = [
      ...learnerCourseSummaries.map((course) => ({
        id: `search-course-${course.id}`,
        role: 'learner',
        type: 'Course',
        title: course.title,
        url: `/dashboard/learner/courses/${course.id}`
      })),
      ...memberships.map((community) => ({
        id: `search-community-${community.id}`,
        role: 'learner',
        type: 'Community',
        title: community.name,
        url: '/dashboard/learner/communities'
      })),
      ...learnerUpcomingLive.map((session) => ({
        id: `search-learner-live-${session.id}`,
        role: 'learner',
        type: 'Live classroom',
        title: session.title,
        url: '/dashboard/learner/live-classes'
      })),
      ...upcomingDisplay.map((event) => ({
        id: `search-event-${event.id}`,
        role: 'learner',
        type: event.type,
        title: event.title,
        url: '/dashboard/learner/calendar'
      }))
    ];

    if (communityDashboard) {
      searchIndex.push(...communityDashboard.searchIndex);
    }
    if (instructorDashboard) {
      searchIndex.push(...instructorDashboard.searchIndex);
    }
    if (adminDashboard?.searchIndex?.length) {
      searchIndex.push(...adminDashboard.searchIndex);
    }

    const communityNames = memberships.map((membership) => membership.name).filter(Boolean);
    const primaryProgram = learnerCourseSummaries[0]?.title ?? 'Edulure programs';
    const learnerProfileBio = communityNames.length
      ? `Currently collaborating across ${communityNames.join(', ')} while progressing through ${primaryProgram}.`
      : `Progressing through ${primaryProgram}.`;
    const profileBioSegments = [learnerProfileBio];
    if (communityDashboard?.profileBio) {
      profileBioSegments.push(communityDashboard.profileBio);
    }
    if (instructorDashboard?.profileBio) {
      profileBioSegments.push(instructorDashboard.profileBio);
    }
    if (adminDashboard?.profileBio) {
      profileBioSegments.push(adminDashboard.profileBio);
    }
    const profileBio = profileBioSegments.filter(Boolean).join(' ');

    const profileStats = [
      { label: 'Communities', value: `${memberships.length} joined` },
      { label: 'Courses', value: `${activeEnrollments.length} active` },
      { label: 'Badges', value: `${learningCompletions.length} milestones` }
    ];
    if (communityDashboard) {
      profileStats.push(...communityDashboard.profileStats);
    }
    if (instructorDashboard) {
      profileStats.push(...instructorDashboard.profileStats);
    }
    if (adminDashboard?.profileStats?.length) {
      profileStats.push(...adminDashboard.profileStats);
    }

    const profileTitleSegments = [
      `${memberships.length} communities`,
      `${activeEnrollments.length} active program${activeEnrollments.length === 1 ? '' : 's'}`
    ];
    if (communityDashboard) {
      const managedCommunitiesCount =
        communityDashboard.dashboard?.health?.overview?.length ?? 0;
      if (managedCommunitiesCount > 0) {
        profileTitleSegments.push(
          `${managedCommunitiesCount} community${managedCommunitiesCount === 1 ? '' : 'ies'} stewarded`
        );
      }
    }
    if (instructorDashboard && (!communityDashboard || !communityDashboard.dashboard?.health?.overview?.length)) {
      const managedCommunitiesCount =
        instructorDashboard.dashboard?.communities?.manageDeck?.length ?? 0;
      if (managedCommunitiesCount > 0) {
        profileTitleSegments.push(
          `${managedCommunitiesCount} community${managedCommunitiesCount === 1 ? '' : 'ies'} stewarded`
        );
      } else {
        profileTitleSegments.push('Instructor studio live');
      }
    }
    if (adminDashboard?.profileTitleSegment) {
      profileTitleSegments.push(adminDashboard.profileTitleSegment);
    }
    const profileTitle = profileTitleSegments.join(' · ');

    const verificationSummary = await IdentityVerificationService.getVerificationSummaryForUser(user.id);
    const safeVerification = {
      status: verificationSummary.status,
      reference: verificationSummary.reference,
      documentsRequired: verificationSummary.documentsRequired,
      documentsSubmitted: verificationSummary.documentsSubmitted,
      requiredDocuments: verificationSummary.requiredDocuments,
      outstandingDocuments: verificationSummary.outstandingDocuments,
      riskScore: verificationSummary.riskScore,
      needsManualReview: verificationSummary.needsManualReview,
      escalationLevel: verificationSummary.escalationLevel,
      lastSubmittedAt: verificationSummary.lastSubmittedAt,
      lastReviewedAt: verificationSummary.lastReviewedAt,
      rejectionReason: verificationSummary.rejectionReason,
      documents: verificationSummary.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        status: doc.status,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        submittedAt: doc.submittedAt,
        reviewedAt: doc.reviewedAt
      }))
    };

    return {
      profile: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        avatar: buildAvatarUrl(user.email),
        title: profileTitle,
        bio: profileBio,
        stats: profileStats,
        feedHighlights,
        verification: safeVerification
      },
      roles,
      dashboards,
      searchIndex
    };
  }

  static async buildAdminDashboard({ now = new Date() } = {}) {
    const reference = now instanceof Date ? now : new Date(now);
    const thirtyDaysAgo = new Date(reference.getTime() - 30 * DAY_IN_MS);
    const sixtyDaysAgo = new Date(reference.getTime() - 60 * DAY_IN_MS);
    const yesterday = new Date(reference.getTime() - DAY_IN_MS);
    const twoDaysAgo = new Date(reference.getTime() - 2 * DAY_IN_MS);
    const twoWeeksAhead = new Date(reference.getTime() + 14 * DAY_IN_MS);

    const [
      totalUsersRow,
      newUsersCurrentRow,
      newUsersPreviousRow,
      instructorCountRow,
      communityTotalRow,
      communityCurrentRow,
      communityPreviousRow,
      activeSubscriptionDetails,
      presenceCurrentRow,
      presencePreviousRow,
      revenueCurrentRows,
      revenuePreviousRows,
      paymentOutcomeRows,
      pendingMembershipRows,
      payoutRows,
      followRequestsRows,
      analyticsAlertsRows,
      domainEventRows,
      topCommunitiesRows,
      tutorResponseRow,
      refundsPendingRow,
      upcomingLiveClassRows
    ] = await Promise.all([
      db('users').count('id as count').first(),
      db('users').where('created_at', '>=', thirtyDaysAgo).count('id as count').first(),
      db('users')
        .whereBetween('created_at', [sixtyDaysAgo, thirtyDaysAgo])
        .count('id as count')
        .first(),
      db('users').where('role', 'instructor').count('id as count').first(),
      db('communities').whereNull('deleted_at').count('id as count').first(),
      db('communities').where('created_at', '>=', thirtyDaysAgo).count('id as count').first(),
      db('communities')
        .whereBetween('created_at', [sixtyDaysAgo, thirtyDaysAgo])
        .count('id as count')
        .first(),
      db('community_subscriptions as cs')
        .innerJoin('community_paywall_tiers as tier', 'tier.id', 'cs.tier_id')
        .innerJoin('communities as c', 'c.id', 'cs.community_id')
        .select([
          'cs.id',
          'cs.public_id as publicId',
          'cs.community_id as communityId',
          'cs.started_at as startedAt',
          'cs.current_period_end as currentPeriodEnd',
          'tier.price_cents as priceCents',
          'tier.currency as currency',
          'tier.billing_interval as billingInterval',
          'c.name as communityName'
        ])
        .where('cs.status', 'active'),
      db('user_presence_sessions').where('last_seen_at', '>=', yesterday).count('id as count').first(),
      db('user_presence_sessions')
        .whereBetween('last_seen_at', [twoDaysAgo, yesterday])
        .count('id as count')
        .first(),
      db('payment_intents')
        .where('status', 'succeeded')
        .andWhere('captured_at', '>=', thirtyDaysAgo)
        .select('currency')
        .sum({ total: 'amount_total' })
        .groupBy('currency'),
      db('payment_intents')
        .where('status', 'succeeded')
        .andWhere('captured_at', '>=', sixtyDaysAgo)
        .andWhere('captured_at', '<', thirtyDaysAgo)
        .select('currency')
        .sum({ total: 'amount_total' })
        .groupBy('currency'),
      db('payment_intents')
        .where('created_at', '>=', thirtyDaysAgo)
        .select('status')
        .count({ total: '*' })
        .groupBy('status'),
      db('community_members as cm')
        .innerJoin('communities as c', 'c.id', 'cm.community_id')
        .innerJoin('users as u', 'u.id', 'cm.user_id')
        .where('cm.status', 'pending')
        .select([
          'cm.id',
          'c.name as communityName',
          'u.first_name as firstName',
          'u.last_name as lastName',
          'u.email',
          'cm.joined_at as joinedAt'
        ])
        .orderBy('cm.joined_at', 'desc'),
      db('community_affiliate_payouts as cap')
        .innerJoin('community_affiliates as ca', 'ca.id', 'cap.affiliate_id')
        .innerJoin('communities as c', 'c.id', 'ca.community_id')
        .innerJoin('users as u', 'u.id', 'ca.user_id')
        .whereIn('cap.status', ['pending', 'processing'])
        .select([
          'cap.id',
          'cap.amount_cents as amountCents',
          'cap.status',
          'cap.scheduled_at as scheduledAt',
          'cap.created_at as createdAt',
          'c.name as communityName',
          'u.first_name as firstName',
          'u.last_name as lastName'
        ])
        .orderBy('cap.created_at', 'desc'),
      db('user_follows as uf')
        .innerJoin('users as follower', 'follower.id', 'uf.follower_id')
        .innerJoin('users as following', 'following.id', 'uf.following_id')
        .where('uf.status', 'pending')
        .select([
          'uf.id',
          'uf.created_at as createdAt',
          'follower.first_name as followerFirstName',
          'follower.last_name as followerLastName',
          'following.first_name as followingFirstName',
          'following.last_name as followingLastName'
        ])
        .orderBy('uf.created_at', 'desc'),
      db('analytics_alerts')
        .orderBy('detected_at', 'desc')
        .limit(6),
      db('domain_events as de')
        .leftJoin('users as actor', 'actor.id', 'de.performed_by')
        .select([
          'de.id',
          'de.entity_type as entityType',
          'de.entity_id as entityId',
          'de.event_type as eventType',
          'de.payload',
          'de.created_at as createdAt',
          'actor.first_name as actorFirstName',
          'actor.last_name as actorLastName'
        ])
        .orderBy('de.created_at', 'desc')
        .limit(8),
      db('payment_intents as pi')
        .innerJoin('community_subscriptions as cs', 'cs.public_id', 'pi.entity_id')
        .innerJoin('communities as c', 'c.id', 'cs.community_id')
        .where('pi.entity_type', 'community_subscription')
        .andWhere('pi.status', 'succeeded')
        .andWhere('pi.captured_at', '>=', thirtyDaysAgo)
        .groupBy('c.id', 'c.name')
        .select([
          'c.id',
          'c.name',
          db.raw('SUM(pi.amount_total) as revenue'),
          db.raw('COUNT(DISTINCT cs.id) as subscribers')
        ])
        .orderBy('revenue', 'desc')
        .limit(4),
      db('tutor_profiles').avg('response_time_minutes as avgResponse').first(),
      db('payment_refunds').where('status', 'pending').count('id as count').first(),
      db('live_classrooms as lc')
        .leftJoin('communities as c', 'c.id', 'lc.community_id')
        .where('lc.status', 'scheduled')
        .andWhere('lc.start_at', '>=', reference)
        .andWhere('lc.start_at', '<', twoWeeksAhead)
        .select([
          'lc.id',
          'lc.title',
          'lc.start_at as startAt',
          'c.name as communityName'
        ])
        .orderBy('lc.start_at', 'asc')
        .limit(5)
    ]);

    const totalUsers = toNumber(totalUsersRow?.count);
    const newUsersCurrent = toNumber(newUsersCurrentRow?.count);
    const newUsersPrevious = toNumber(newUsersPreviousRow?.count);
    const instructorCount = toNumber(instructorCountRow?.count);
    const communityTotal = toNumber(communityTotalRow?.count);
    const communitiesCreatedCurrent = toNumber(communityCurrentRow?.count);
    const communitiesCreatedPrevious = toNumber(communityPreviousRow?.count);
    const dailyActiveCurrent = toNumber(presenceCurrentRow?.count);
    const dailyActivePrevious = toNumber(presencePreviousRow?.count);

    const activeSubscriptions = activeSubscriptionDetails.length;
    const primaryCurrency =
      activeSubscriptionDetails[0]?.currency ?? revenueCurrentRows[0]?.currency ?? 'USD';

    const subscriptionStartsCurrent = activeSubscriptionDetails.filter((subscription) => {
      if (!subscription.startedAt) return false;
      const startedAt = subscription.startedAt instanceof Date
        ? subscription.startedAt
        : new Date(subscription.startedAt);
      return startedAt >= thirtyDaysAgo;
    }).length;
    const subscriptionStartsPrevious = activeSubscriptionDetails.filter((subscription) => {
      if (!subscription.startedAt) return false;
      const startedAt = subscription.startedAt instanceof Date
        ? subscription.startedAt
        : new Date(subscription.startedAt);
      return startedAt >= sixtyDaysAgo && startedAt < thirtyDaysAgo;
    }).length;

    const computeAnnualised = (priceCents, interval) => {
      switch (interval) {
        case 'monthly':
          return priceCents * 12;
        case 'quarterly':
          return priceCents * 4;
        case 'annual':
          return priceCents;
        case 'lifetime':
          return 0;
        default:
          return priceCents * 12;
      }
    };

    const computeMonthlyRecurring = (priceCents, interval) => {
      switch (interval) {
        case 'monthly':
          return priceCents;
        case 'quarterly':
          return Math.round(priceCents / 3);
        case 'annual':
          return Math.round(priceCents / 12);
        case 'lifetime':
          return 0;
        default:
          return priceCents;
      }
    };

    const arrCents = activeSubscriptionDetails.reduce(
      (total, subscription) => total + computeAnnualised(toNumber(subscription.priceCents), subscription.billingInterval),
      0
    );
    const mrrCents = activeSubscriptionDetails.reduce(
      (total, subscription) => total + computeMonthlyRecurring(toNumber(subscription.priceCents), subscription.billingInterval),
      0
    );

    const revenueCurrentTotal = revenueCurrentRows.reduce(
      (total, row) => total + toNumber(row.total),
      0
    );
    const revenuePreviousTotal = revenuePreviousRows.reduce(
      (total, row) => total + toNumber(row.total),
      0
    );
    const revenueCurrency = revenueCurrentRows[0]?.currency ?? primaryCurrency;

    const paymentOutcomeMap = paymentOutcomeRows.reduce((acc, row) => {
      acc[row.status] = toNumber(row.total ?? row.count ?? row.Total);
      return acc;
    }, {});
    const paymentSucceeded = paymentOutcomeMap.succeeded ?? 0;
    const paymentFailed = (paymentOutcomeMap.failed ?? 0) + (paymentOutcomeMap.canceled ?? 0);
    const paymentProcessing = paymentOutcomeMap.processing ?? 0;
    const paymentRequiresAction =
      (paymentOutcomeMap.requires_action ?? 0) + (paymentOutcomeMap.requires_payment_method ?? 0);
    const paymentTotalConsidered =
      paymentSucceeded + paymentFailed + paymentProcessing + paymentRequiresAction;
    const captureRate =
      paymentTotalConsidered > 0
        ? `${((paymentSucceeded / paymentTotalConsidered) * 100).toFixed(1)}%`
        : '0%';

    const refundsPending = toNumber(refundsPendingRow?.count);

    const percentageChange = (current, previous, label) => {
      if (previous === 0) {
        if (current === 0) {
          return { change: `No change ${label}`, trend: 'up' };
        }
        return { change: `+100% ${label}`, trend: 'up' };
      }
      const delta = ((current - previous) / previous) * 100;
      if (Math.abs(delta) < 0.1) {
        return { change: `No change ${label}`, trend: 'up' };
      }
      const rounded = Math.abs(delta).toFixed(1);
      return {
        change: `${delta >= 0 ? '+' : '−'}${rounded}% ${label}`,
        trend: delta >= 0 ? 'up' : 'down'
      };
    };

    const countChange = (current, previous, { label, unitSingular, unitPlural }) => {
      const diff = current - previous;
      if (diff === 0) {
        return { change: `No change ${label}`, trend: 'up' };
      }
      const absolute = Math.abs(diff);
      let unit = '';
      if (unitSingular) {
        const plural = unitPlural ?? `${unitSingular}s`;
        unit = ` ${absolute === 1 ? unitSingular : plural}`;
      }
      return {
        change: `${diff > 0 ? '+' : '−'}${formatNumber(absolute)}${unit} ${label}`,
        trend: diff >= 0 ? 'up' : 'down'
      };
    };

    const revenueChange = percentageChange(revenueCurrentTotal, revenuePreviousTotal, 'vs prior 30d');

    const metrics = [
      {
        id: 'net-revenue',
        label: 'Net revenue (30d)',
        value: formatCurrency(revenueCurrentTotal, revenueCurrency),
        change: revenueChange.change,
        trend: revenueChange.trend
      },
      {
        id: 'active-subscriptions',
        label: 'Active subscriptions',
        value: formatNumber(activeSubscriptions),
        ...countChange(subscriptionStartsCurrent, subscriptionStartsPrevious, {
          label: 'new vs prior 30d',
          unitSingular: 'new',
          unitPlural: 'new'
        })
      },
      {
        id: 'communities-live',
        label: 'Communities live',
        value: formatNumber(communityTotal),
        ...countChange(communitiesCreatedCurrent, communitiesCreatedPrevious, {
          label: 'launched vs prior 30d',
          unitSingular: 'launch',
          unitPlural: 'launches'
        })
      },
      {
        id: 'daily-active-members',
        label: 'Daily active members',
        value: formatNumber(dailyActiveCurrent),
        ...countChange(dailyActiveCurrent, dailyActivePrevious, {
          label: 'vs prior day',
          unitSingular: 'member',
          unitPlural: 'members'
        })
      }
    ];

    const approvalsItems = [];

    pendingMembershipRows.forEach((row) => {
      approvalsItems.push({
        id: `membership-${row.id}`,
        name: `${row.firstName} ${row.lastName}`.trim(),
        type: 'Community access',
        summary: `${row.communityName} • ${row.email}`,
        submittedAt: humanizeRelativeTime(row.joinedAt, reference),
        status: 'Pending review',
        action: 'Review member',
        priority: 'medium'
      });
    });

    payoutRows.forEach((row) => {
      approvalsItems.push({
        id: `payout-${row.id}`,
        name: `${row.communityName} affiliate`,
        type: 'Affiliate payout',
        summary: `${row.firstName} ${row.lastName}`.trim(),
        submittedAt: humanizeRelativeTime(row.scheduledAt ?? row.createdAt, reference),
        status: row.status === 'processing' ? 'Processing' : 'Awaiting approval',
        action: 'Review payout',
        priority: row.status === 'processing' ? 'low' : 'high',
        amount: formatCurrency(row.amountCents, primaryCurrency)
      });
    });

    followRequestsRows.forEach((row) => {
      approvalsItems.push({
        id: `follow-${row.id}`,
        name: `${row.followerFirstName} ${row.followerLastName}`.trim(),
        type: 'Follow request',
        summary: `Waiting on ${row.followingFirstName} ${row.followingLastName}`.trim(),
        submittedAt: humanizeRelativeTime(row.createdAt, reference),
        status: 'Pending',
        action: 'Review connection',
        priority: 'low'
      });
    });

    const approvals = {
      pendingCount: approvalsItems.length,
      items: approvalsItems.slice(0, 10)
    };

    const topCommunities = topCommunitiesRows.map((row) => {
      const subscribers = toNumber(row.subscribers);
      return {
        id: `community-${row.id}`,
        name: row.name,
        revenue: formatCurrency(toNumber(row.revenue), revenueCurrency),
        subscribers,
        share: activeSubscriptions > 0 ? Math.round((subscribers / activeSubscriptions) * 100) : 0
      };
    });

    const revenue = {
      overview: {
        netRevenue: formatCurrency(revenueCurrentTotal, revenueCurrency),
        netRevenueChange: revenueChange.change,
        arr: formatCurrency(arrCents, primaryCurrency),
        mrr: formatCurrency(mrrCents, primaryCurrency),
        captureRate,
        failedPayments: paymentOutcomeMap.failed ?? 0,
        refundsPending
      },
      topCommunities,
      paymentHealth: {
        succeeded: paymentSucceeded,
        processing: paymentProcessing,
        requiresAction: paymentRequiresAction,
        failed: paymentOutcomeMap.failed ?? 0,
        total: paymentTotalConsidered
      }
    };

    const alerts = analyticsAlertsRows.map((row) => {
      const metadata = safeJsonParse(row.metadata, {});
      return {
        id: `alert-${row.alert_code ?? row.id}`,
        severity: row.severity,
        message: row.message,
        detectedAt: row.detected_at,
        detectedLabel: humanizeRelativeTime(row.detected_at, reference),
        resolvedAt: row.resolved_at,
        resolvedLabel: row.resolved_at ? humanizeRelativeTime(row.resolved_at, reference) : null,
        metadata
      };
    });

    const events = domainEventRows.map((row) => {
      const payload = safeJsonParse(row.payload, {});
      const actorName = `${row.actorFirstName ?? ''} ${row.actorLastName ?? ''}`.trim();
      const summaryParts = [row.eventType.replace(/[._]/g, ' ')];
      if (actorName) {
        summaryParts.push(`by ${actorName}`);
      }
      return {
        id: `event-${row.id}`,
        type: row.eventType,
        entity: row.entityType,
        summary: summaryParts.join(' '),
        occurredAt: row.createdAt,
        occurredLabel: humanizeRelativeTime(row.createdAt, reference),
        metadata: payload
      };
    });

    const averageResponseMinutes = Math.round(
      toNumber(tutorResponseRow?.avgResponse ?? tutorResponseRow?.avg_response)
    );

    const openAlerts = alerts.filter((alert) => !alert.resolvedAt).length;

    const upcomingLaunches = upcomingLiveClassRows.map((row) => {
      const startAt = row.startAt instanceof Date ? row.startAt : new Date(row.startAt);
      const diffMs = startAt.getTime() - reference.getTime();
      const diffDays = Math.max(0, Math.round(diffMs / DAY_IN_MS));
      const startIn = diffMs <= 0
        ? 'In progress'
        : diffDays === 0
          ? 'Starting today'
          : `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
      return {
        id: `launch-${row.id}`,
        title: row.title,
        community: row.communityName ?? 'Community',
        startAt: formatDateTime(startAt, { dateStyle: 'medium', timeStyle: 'short' }),
        startIn
      };
    });

    const monetizationSettings = await PlatformSettingsService.getMonetizationSettings();
    const compliance = await IdentityVerificationService.getAdminOverview({ now: reference });

    const operations = {
      support: {
        backlog: pendingMembershipRows.length + followRequestsRows.length,
        pendingMemberships: pendingMembershipRows.length,
        followRequests: followRequestsRows.length,
        avgResponseMinutes: averageResponseMinutes,
        dailyActiveMembers: dailyActiveCurrent
      },
      risk: {
        payoutsProcessing: payoutRows.length,
        failedPayments: paymentOutcomeMap.failed ?? 0,
        refundsPending,
        alertsOpen: openAlerts
      },
      platform: {
        totalUsers: formatNumber(totalUsers),
        newUsers30d: formatNumber(newUsersCurrent),
        newUsersChange: countChange(newUsersCurrent, newUsersPrevious, {
          label: 'vs prior 30d',
          unitSingular: 'signup',
          unitPlural: 'signups'
        }).change,
        communitiesLive: formatNumber(communityTotal),
        instructors: formatNumber(instructorCount)
      },
      upcomingLaunches
    };

    const profileStats = [
      { label: 'Active subscriptions', value: `${formatNumber(activeSubscriptions)} accounts` },
      { label: 'Communities live', value: `${formatNumber(communityTotal)} spaces` },
      { label: 'ARR', value: formatCurrency(arrCents, primaryCurrency) }
    ];

    const pendingKycMetric = compliance.metrics?.find((metric) => metric.id === 'kyc-pending-review');
    if (pendingKycMetric) {
      profileStats.push({ label: 'KYC reviews pending', value: `${pendingKycMetric.value} cases` });
    }

    const profileBio = `Overseeing ${formatNumber(communityTotal)} communities, ${formatNumber(
      activeSubscriptions
    )} active subscriptions, and ${formatCurrency(revenueCurrentTotal, revenueCurrency)} captured in the last 30 days.`;

    const searchIndex = [
      { id: 'admin-approvals', role: 'admin', type: 'Operations', title: 'Approvals queue', url: '/admin#approvals' },
      { id: 'admin-revenue', role: 'admin', type: 'Revenue', title: 'Revenue performance', url: '/admin#revenue' },
      { id: 'admin-activity', role: 'admin', type: 'Signals', title: 'Operational alerts', url: '/admin#activity' },
      { id: 'admin-compliance', role: 'admin', type: 'Compliance', title: 'KYC queue', url: '/admin#compliance' }
    ];

    return {
      role: { id: 'admin', label: 'Admin' },
      dashboard: {
        metrics,
        approvals,
        revenue,
        operations,
        activity: { alerts, events },
        settings: {
          monetization: monetizationSettings
        }
        compliance,
        activity: { alerts, events }
      },
      profileStats,
      profileBio,
      profileTitleSegment: 'Platform operations oversight',
      searchIndex
    };
  }
}
