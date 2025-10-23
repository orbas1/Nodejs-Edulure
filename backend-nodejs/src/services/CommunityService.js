import slugify from 'slugify';

import db from '../config/database.js';
import CommunityChannelModel from '../models/CommunityChannelModel.js';
import CommunityEventModel from '../models/CommunityEventModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityMemberPointModel from '../models/CommunityMemberPointModel.js';
import CommunityModel from '../models/CommunityModel.js';
import CommunityPaywallTierModel from '../models/CommunityPaywallTierModel.js';
import CommunityPostModel from '../models/CommunityPostModel.js';
import CommunityPostReactionModel from '../models/CommunityPostReactionModel.js';
import CommunityResourceModel from '../models/CommunityResourceModel.js';
import CommunityRoleDefinitionModel from '../models/CommunityRoleDefinitionModel.js';
import CommunitySubscriptionModel from '../models/CommunitySubscriptionModel.js';
import CommunityWebinarModel from '../models/CommunityWebinarModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import UserModel from '../models/UserModel.js';
import UserPresenceSessionModel from '../models/UserPresenceSessionModel.js';
import UserProfileModel from '../models/UserProfileModel.js';
import AdsPlacementService from './AdsPlacementService.js';

const MODERATOR_ROLES = new Set(['owner', 'admin', 'moderator']);
const RESOURCE_MANAGER_ROLES = new Set(['owner', 'admin', 'moderator']);
const POST_AUTHOR_ROLES = new Set(['owner', 'admin', 'moderator']);
const COMMUNITY_MANAGER_ROLES = new Set(['owner', 'admin']);

function isActiveMembership(membership) {
  return membership?.status === 'active';
}

function canModerateMembership(membership, actorRole) {
  if (actorRole === 'admin') {
    return true;
  }
  return isActiveMembership(membership) && MODERATOR_ROLES.has(membership?.role);
}

function canManageSponsorships(membership, actorRole) {
  if (actorRole === 'admin') {
    return true;
  }
  return (
    isActiveMembership(membership) &&
    (membership?.role === 'owner' || membership?.role === 'admin' || membership?.role === 'moderator')
  );
}

function canManageResources(membership, actorRole) {
  if (actorRole === 'admin') {
    return true;
  }
  return isActiveMembership(membership) && RESOURCE_MANAGER_ROLES.has(membership?.role);
}

function canManageCommunity(membership, actorRole) {
  if (actorRole === 'admin') {
    return true;
  }
  return isActiveMembership(membership) && COMMUNITY_MANAGER_ROLES.has(membership?.role);
}

function normalisePlacementIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map((entry) => String(entry)).filter(Boolean))];
}

function parseJsonColumn(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toArray(value) {
  const parsed = parseJsonColumn(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function buildAvatarUrl(name) {
  const seed = encodeURIComponent(name ?? 'Edulure Member');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=0b1120&radius=50`;
}

function titleCaseRole(role) {
  if (!role) return 'Member';
  const normalised = String(role)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalised) return 'Member';
  return normalised.replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractMemberDirectory(members, { usersById, profilesByUserId, presenceByUserId }) {
  if (!Array.isArray(members) || members.length === 0) {
    return [];
  }

  return members.map((member, index) => {
    const user = usersById.get(member.userId);
    const profile = profilesByUserId.get(member.userId);
    const presence = presenceByUserId.get(member.userId);
    const metadata = member.metadata ?? {};

    const displayName = profile?.displayName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    const roleLabel = metadata.roleLabel ?? titleCaseRole(member.role);
    const location = metadata.location ?? profile?.location ?? null;
    const tags = Array.isArray(metadata.tags)
      ? metadata.tags
      : typeof metadata.tags === 'string'
        ? metadata.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : Array.isArray(profile?.metadata?.expertise)
          ? profile.metadata.expertise
          : [];

    const lastActiveAt = metadata.lastActiveAt ?? presence?.lastSeenAt ?? user?.lastLoginAt ?? member.updatedAt;

    return {
      id: member.id ?? `membership-${member.userId ?? index}`,
      userId: member.userId,
      name: displayName || 'Community Member',
      role: roleLabel,
      status: titleCaseRole(member.status ?? 'active'),
      title: metadata.title ?? profile?.tagline ?? null,
      location,
      email: metadata.contactEmail ?? user?.email ?? null,
      avatarUrl: metadata.avatarUrl ?? profile?.avatarUrl ?? buildAvatarUrl(displayName),
      tags,
      isOnline: Boolean(presence && (presence.status === 'online' || presence.status === 'active')),
      lastActiveAt,
      recommended: Boolean(metadata.recommended ?? metadata.highlighted ?? false)
    };
  });
}

function buildLeaderboard(entries, { usersById, profilesByUserId }) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  return entries.map((entry, index) => {
    const user = usersById.get(entry.userId);
    const profile = profilesByUserId.get(entry.userId);
    const metadata = entry.metadata ?? {};
    const displayName = profile?.displayName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

    return {
      rank: index + 1,
      userId: entry.userId,
      name: displayName || 'Member',
      role: titleCaseRole(metadata.role ?? user?.role ?? 'member'),
      points: Number(entry.points ?? 0),
      lifetimePoints: Number(entry.lifetimePoints ?? entry.points ?? 0),
      grade: metadata.grade ?? (entry.points >= 1000 ? 'A' : entry.points >= 600 ? 'B' : 'C'),
      streakDays: metadata.currentStreakDays ?? null
    };
  });
}

function buildLiveSessions(webinars, metadata = []) {
  const sessions = Array.isArray(webinars)
    ? webinars.map((webinar) => ({
        id: webinar.id,
        title: webinar.topic,
        facilitator: webinar.host,
        startsAt: webinar.startAt,
        durationMinutes:
          typeof webinar.metadata?.durationMinutes === 'number'
            ? webinar.metadata.durationMinutes
            : webinar.metadata?.endAt
              ? Math.max(
                  0,
                  Math.round((new Date(webinar.metadata.endAt).getTime() - new Date(webinar.startAt).getTime()) / 60000)
                )
              : null,
        seatsRemaining: webinar.metadata?.seatsRemaining ?? null,
        status: webinar.status,
        registrationUrl: webinar.metadata?.registrationUrl ?? null
      }))
    : [];

  const supplemental = Array.isArray(metadata)
    ? metadata.map((session, index) => ({
        id: session.id ?? `metadata-live-${index}`,
        title: session.title ?? 'Live session',
        facilitator: session.facilitator ?? session.host ?? 'Facilitator',
        startsAt: session.startsAt ?? session.startAt ?? null,
        durationMinutes: session.durationMinutes ?? null,
        seatsRemaining: session.seatsRemaining ?? null,
        status: session.status ?? 'scheduled',
        registrationUrl: session.registrationUrl ?? null
      }))
    : [];

  if (!sessions.length && supplemental.length) {
    return supplemental;
  }

  if (!supplemental.length) {
    return sessions;
  }

  const seen = new Set(sessions.map((session) => session.id));
  supplemental.forEach((session) => {
    if (!session.id || !seen.has(session.id)) {
      sessions.push(session);
    }
  });
  return sessions;
}

function buildRecordedSessions(resources, metadata = []) {
  const items = Array.isArray(resources)
    ? resources.map((resource, index) => ({
        id: resource.id ?? `recorded-${index}`,
        title: resource.title ?? 'Recorded session',
        facilitator: resource.metadata?.facilitator ?? null,
        startsAt: resource.metadata?.recordedAt ?? resource.publishedAt ?? null,
        durationMinutes: resource.metadata?.durationMinutes ?? null,
        watchUrl: resource.metadata?.watchUrl ?? resource.linkUrl ?? null
      }))
    : [];

  if (items.length) {
    return items;
  }

  return Array.isArray(metadata)
    ? metadata.map((session, index) => ({
        id: session.id ?? `metadata-recorded-${index}`,
        title: session.title ?? 'Recorded session',
        facilitator: session.facilitator ?? null,
        startsAt: session.startsAt ?? null,
        durationMinutes: session.durationMinutes ?? null,
        watchUrl: session.watchUrl ?? session.linkUrl ?? null
      }))
    : [];
}

function mergeEvents(eventRecords, webinars, metadataEvents = []) {
  const events = [];
  const seen = new Set();

  (Array.isArray(eventRecords) ? eventRecords : []).forEach((event) => {
    const id = event.id ?? `event-${events.length}`;
    seen.add(String(id));
    events.push({
      id,
      title: event.title,
      type: titleCaseRole(event.status ?? 'event'),
      startsAt: event.startAt,
      endsAt: event.endAt,
      location: event.locationName ?? event.locationAddress ?? (event.isOnline ? 'Virtual' : null),
      registrationUrl: event.metadata?.registrationUrl ?? event.meetingUrl ?? null,
      description: event.description ?? event.summary ?? null
    });
  });

  (Array.isArray(webinars) ? webinars : []).forEach((webinar) => {
    const id = `webinar-${webinar.id ?? events.length}`;
    if (seen.has(String(id))) return;
    seen.add(String(id));
    events.push({
      id,
      title: webinar.topic,
      type: 'Webinar',
      startsAt: webinar.startAt,
      endsAt: webinar.metadata?.endAt ?? null,
      location: webinar.metadata?.location ?? (webinar.metadata?.isOnline === false ? 'Onsite' : 'Virtual'),
      registrationUrl: webinar.metadata?.registrationUrl ?? null,
      description: webinar.description ?? null
    });
  });

  (Array.isArray(metadataEvents) ? metadataEvents : []).forEach((event, index) => {
    const id = String(event.id ?? `metadata-event-${index}`);
    if (seen.has(id)) return;
    seen.add(id);
    events.push({
      id,
      title: event.title ?? 'Community event',
      type: event.type ?? 'Event',
      startsAt: event.startsAt ?? event.startAt ?? null,
      endsAt: event.endsAt ?? event.endAt ?? null,
      location: event.location ?? null,
      registrationUrl: event.registrationUrl ?? event.url ?? null,
      description: event.description ?? null
    });
  });

  return events;
}

function buildSubscriptionSummary(metadata = {}, tiers = [], subscriptions = []) {
  const currency = metadata.currency ?? tiers[0]?.currency ?? 'USD';
  const billingInterval = metadata.billingInterval ?? tiers[0]?.billingInterval ?? 'monthly';
  const tierById = new Map(tiers.map((tier) => [tier.id, tier]));
  const activeSubscribers = subscriptions.filter((subscription) => subscription.status === 'active');
  const recurringCents = activeSubscribers.reduce((sum, subscription) => {
    const tier = tierById.get(subscription.tierId);
    if (!tier) return sum;
    return sum + (Number.isFinite(tier.priceCents) ? tier.priceCents : 0);
  }, 0);

  return {
    currency,
    billingInterval,
    metrics: {
      activeSubscribers: activeSubscribers.length,
      recurringRevenueCents: recurringCents,
      churnRate: metadata.metrics?.churnRate ?? null
    },
    plans: tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      description: tier.description ?? '',
      priceCents: tier.priceCents,
      currency: tier.currency,
      interval: tier.billingInterval,
      trialPeriodDays: tier.trialPeriodDays ?? null,
      benefits: tier.benefits,
      metadata: tier.metadata ?? {}
    })),
    addons: Array.isArray(metadata.addons) ? metadata.addons : [],
    collection: metadata.collection ?? { provider: 'stripe', mode: 'subscription' }
  };
}

function buildRolesMetadata(roleDefinitions, metadataRoles = {}) {
  if (!Array.isArray(roleDefinitions) || roleDefinitions.length === 0) {
    return metadataRoles;
  }

  const roles = {};
  roleDefinitions.forEach((definition) => {
    roles[definition.roleKey] = {
      name: definition.name,
      description: definition.description ?? metadataRoles[definition.roleKey]?.description ?? '',
      permissions: definition.permissions ?? {},
      isDefaultAssignable: definition.isDefaultAssignable
    };
  });

  return { ...metadataRoles, ...roles };
}

function buildMembershipMap(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') {
    return {
      totalCountries: 0,
      lastUpdatedAt: null,
      clusters: [],
      avatars: []
    };
  }

  return {
    totalCountries: metadata.totalCountries ?? 0,
    lastUpdatedAt: metadata.lastUpdatedAt ?? null,
    clusters: Array.isArray(metadata.clusters) ? metadata.clusters : [],
    avatars: Array.isArray(metadata.avatars) ? metadata.avatars : []
  };
}

function buildRatings(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') {
    return {
      average: 0,
      totalReviews: 0,
      highlight: '',
      breakdown: {}
    };
  }

  return {
    average: Number(metadata.average ?? 0),
    totalReviews: Number(metadata.totalReviews ?? 0),
    highlight: metadata.highlight ?? '',
    breakdown: metadata.breakdown ?? {}
  };
}

function buildLaunchChecklist(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') {
    return { overallStatus: 'pending', items: [] };
  }

  return {
    overallStatus: metadata.overallStatus ?? 'in-progress',
    items: Array.isArray(metadata.items)
      ? metadata.items.map((item, index) => ({
          id: item.id ?? `checklist-${index}`,
          label: item.label ?? 'Checklist item',
          status: item.status ?? 'pending',
          owner: item.owner ?? null
        }))
      : []
  };
}

export default class CommunityService {
  static async listForUser(userId) {
    const rows = await CommunityModel.listByUserWithStats(userId);
    return rows.map((row) => this.serializeCommunity(row));
  }

  static async getCommunityDetail(identifier, userId) {
    const community = await this.resolveCommunity(identifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!isActiveMembership(membership) && community.visibility === 'private') {
      const error = new Error('Community is private');
      error.status = 403;
      throw error;
    }

    const [stats, channels, memberList] = await Promise.all([
      CommunityModel.getStats(community.id),
      CommunityChannelModel.listByCommunity(community.id),
      CommunityMemberModel.listByCommunity(community.id, {
        status: ['active', 'pending'],
        order: 'desc',
        orderBy: 'joined_at',
        limit: 120
      })
    ]);

    const memberItems = Array.isArray(memberList) ? [...memberList] : [];
    const memberUserIds = memberItems.map((member) => member.userId).filter((id) => Number.isFinite(Number(id)));

    const [
      userRecords,
      userProfiles,
      presenceRecords,
      leaderboardEntries,
      webinarsResult,
      eventRecords,
      recordedResources,
      paywallTiers,
      activeSubscriptions,
      roleDefinitions
    ] = await Promise.all([
      memberUserIds.length ? UserModel.findByIds(memberUserIds) : [],
      memberUserIds.length ? UserProfileModel.findByUserIds(memberUserIds) : [],
      memberUserIds.length ? UserPresenceSessionModel.listActiveByUserIds(memberUserIds) : [],
      CommunityMemberPointModel.listTopByPoints(community.id, { limit: 10 }),
      CommunityWebinarModel.listForCommunity(community.id, {
        status: ['announced', 'live', 'scheduled'],
        order: 'asc',
        limit: 12
      }),
      CommunityEventModel.listForCommunity(community.id, {
        status: ['scheduled', 'live'],
        order: 'asc',
        limit: 12
      }),
      CommunityResourceModel.listForCommunity(community.id, {
        resourceType: 'classroom_session',
        limit: 12
      }),
      CommunityPaywallTierModel.listByCommunity(community.id, { includeInactive: true }),
      CommunitySubscriptionModel.listByCommunity(community.id, { status: 'active' }),
      CommunityRoleDefinitionModel.listByCommunity(community.id)
    ]);

    const usersById = new Map(userRecords.map((user) => [user.id, user]));
    const profilesByUserId = new Map(userProfiles.map((profile) => [profile.userId, profile]));
    const presenceByUserId = new Map();
    presenceRecords.forEach((session) => {
      const existing = presenceByUserId.get(session.userId);
      if (!existing) {
        presenceByUserId.set(session.userId, session);
        return;
      }

      const existingSeen = existing.lastSeenAt ? new Date(existing.lastSeenAt).getTime() : 0;
      const nextSeen = session.lastSeenAt ? new Date(session.lastSeenAt).getTime() : 0;
      if (nextSeen >= existingSeen) {
        presenceByUserId.set(session.userId, session);
      }
    });

    const metadata = parseJsonColumn(community.metadata, {});
    const memberDirectory = extractMemberDirectory(memberItems, { usersById, profilesByUserId, presenceByUserId });
    const leaderboard = buildLeaderboard(leaderboardEntries, { usersById, profilesByUserId });
    const webinars = Array.isArray(webinarsResult?.items) ? webinarsResult.items : [];
    const eventsArray = Array.isArray(eventRecords) ? eventRecords : [];
    const events = mergeEvents(eventsArray, webinars, metadata.events);
    const recordedSessions = buildRecordedSessions(recordedResources?.items ?? [], metadata.classrooms?.recorded);

    const context = {
      members: memberDirectory,
      leaderboard,
      webinars,
      recordedSessions,
      events,
      paywallTiers,
      activeSubscriptions,
      roleDefinitions,
      membershipTotal: memberList?.total ?? memberDirectory.length
    };

    return this.serializeCommunityDetail(
      community,
      isActiveMembership(membership) ? membership : null,
      stats,
      channels,
      context
    );
  }

  static async listFeed(communityIdentifier, userId, filters = {}, options = {}) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!isActiveMembership(membership) && community.visibility === 'private') {
      const error = new Error('Community is private');
      error.status = 403;
      throw error;
    }

    const actor = { id: userId, role: options.actorRole };
    const metadata = parseJsonColumn(community.metadata, {});
    const sponsorships = metadata.sponsorships ?? {};
    const blockedPlacementIds = normalisePlacementIds(sponsorships.blockedPlacementIds);

    const searchQuery =
      typeof filters.query === 'string' ? filters.query.trim().toLowerCase() : undefined;
    const { items, pagination } = await CommunityPostModel.paginateForCommunity(community.id, {
      ...filters,
      query: searchQuery
    });
    const postIds = items.map((item) => item.id);
    const viewerReactions = actor.id
      ? await CommunityPostReactionModel.listForPosts(postIds, actor.id)
      : new Map();
    const serialised = items.map((item) =>
      this.serializePost(item, community, {
        membership,
        actor,
        viewerReactions: viewerReactions.get(item.id)
      })
    );
    const decorated = await AdsPlacementService.decorateFeed({
      posts: serialised,
      context: 'community_feed',
      page: filters.page,
      perPage: filters.perPage,
      metadata: { communityId: community.id, blockedPlacementIds }
    });
    const pinnedMedia = await CommunityPostModel.listPinnedMedia(community.id, { limit: 6 });
    return {
      items: decorated.items,
      pagination,
      ads: decorated.ads,
      prefetch: {
        pinnedMedia: pinnedMedia.map((entry) => ({ ...entry, communityId: community.id }))
      }
    };
  }

  static async listFeedForUser(userId, filters = {}, options = {}) {
    const searchQuery =
      typeof filters.query === 'string' ? filters.query.trim().toLowerCase() : undefined;
    const { items, pagination } = await CommunityPostModel.paginateForUser(userId, {
      ...filters,
      query: searchQuery
    });
    const actor = { id: userId, role: options.actorRole };
    const postIds = items.map((item) => item.id);
    const viewerReactions = actor.id
      ? await CommunityPostReactionModel.listForPosts(postIds, actor.id)
      : new Map();
    const serialised = items.map((item) =>
      this.serializePost(item, undefined, {
        membership: item.viewerRole ? { role: item.viewerRole, status: 'active' } : null,
        actor,
        viewerReactions: viewerReactions.get(item.id)
      })
    );
    const decorated = await AdsPlacementService.decorateFeed({
      posts: serialised,
      context: 'global_feed',
      page: filters.page,
      perPage: filters.perPage,
      metadata: { userId }
    });
    const communityIds = serialised
      .map((post) => post.community?.id)
      .filter((value) => value !== undefined && value !== null);
    const uniqueCommunityIds = [...new Set(communityIds.map((value) => Number(value)))].filter((value) =>
      Number.isFinite(value)
    );
    const pinnedMediaGroups = await Promise.all(
      uniqueCommunityIds.map(async (communityId) => ({
        communityId,
        entries: await CommunityPostModel.listPinnedMedia(communityId, { limit: 3 })
      }))
    );
    const pinnedMedia = pinnedMediaGroups.flatMap(({ communityId, entries }) =>
      entries.map((entry) => ({ ...entry, communityId }))
    );
    return {
      items: decorated.items,
      pagination,
      ads: decorated.ads,
      prefetch: {
        pinnedMedia
      }
    };
  }

  static async listResources(communityIdentifier, userId, filters = {}) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!isActiveMembership(membership) && community.visibility === 'private') {
      const error = new Error('Community is private');
      error.status = 403;
      throw error;
    }

    const { items, total } = await CommunityResourceModel.listForCommunity(community.id, filters);
    return {
      items: items.map((item) => this.serializeResource(item)),
      total
    };
  }

  static async create(payload, ownerId) {
    return db.transaction(async (trx) => {
      const slug = slugify(payload.name, { lower: true, strict: true });
      const existing = await CommunityModel.findBySlug(slug, trx);
      if (existing) {
        const error = new Error('Community with the same slug already exists');
        error.status = 409;
        throw error;
      }

      const community = await CommunityModel.create(
        {
          name: payload.name,
          slug,
          description: payload.description,
          coverImageUrl: payload.coverImageUrl,
          ownerId,
          visibility: payload.visibility,
          metadata: payload.metadata
        },
        trx
      );

      await CommunityMemberModel.create(
        {
          communityId: community.id,
          userId: ownerId,
          role: 'owner',
          status: 'active'
        },
        trx
      );

      const defaultChannel = await CommunityChannelModel.create(
        {
          communityId: community.id,
          name: 'General',
          slug: 'general',
          channelType: 'general',
          isDefault: true,
          metadata: { createdBy: ownerId }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community',
          entityId: community.id,
          eventType: 'community.created',
          payload: { ownerId, name: payload.name },
          performedBy: ownerId
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_channel',
          entityId: defaultChannel.id,
          eventType: 'community.channel.created',
          payload: { communityId: community.id, channelType: defaultChannel.channelType },
          performedBy: ownerId
        },
        trx
      );

      return this.serializeCommunity({ ...community, memberRole: 'owner', memberStatus: 'active' });
    });
  }

  static async updateCommunity(communityIdentifier, actorId, payload = {}, options = {}) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, actorId);
    if (!canManageCommunity(membership, options.actorRole)) {
      const error = new Error('You do not have permission to manage this community');
      error.status = membership ? 403 : 404;
      throw error;
    }

    const updates = {};
    if (payload.name !== undefined) {
      updates.name = payload.name;
    }
    if (payload.slug !== undefined) {
      updates.slug = payload.slug ? slugify(payload.slug, { lower: true, strict: true }) : null;
    }
    if (payload.description !== undefined) {
      updates.description = payload.description;
    }
    if (payload.coverImageUrl !== undefined) {
      updates.coverImageUrl = payload.coverImageUrl;
    }
    if (payload.visibility !== undefined) {
      updates.visibility = payload.visibility;
    }

    if (payload.metadata !== undefined) {
      const existingMetadata = parseJsonColumn(community.metadata, {});
      updates.metadata = { ...existingMetadata, ...payload.metadata };
    }

    const updated = await db.transaction(async (trx) => {
      const next = await CommunityModel.updateById(community.id, updates, trx);
      await DomainEventModel.record(
        {
          entityType: 'community',
          entityId: next.id,
          eventType: 'community.updated',
          payload: {
            nameChanged: payload.name !== undefined && payload.name !== community.name,
            visibility: payload.visibility ?? next.visibility
          },
          performedBy: actorId
        },
        trx
      );
      return next;
    });

    return this.serializeCommunity({
      ...updated,
      memberRole: membership?.role,
      memberStatus: membership?.status
    });
  }

  static async createPost(communityIdentifier, userId, payload) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!membership) {
      const error = new Error('You need to join this community before posting');
      error.status = 403;
      throw error;
    }

    if (!isActiveMembership(membership)) {
      const error = new Error('Your membership is not active');
      error.status = 403;
      throw error;
    }

    if (!POST_AUTHOR_ROLES.has(membership.role)) {
      const error = new Error('You do not have permission to post in this community');
      error.status = 403;
      throw error;
    }

    const channelId = payload.channelId ?? (await this.resolveDefaultChannelId(community.id));

    const now = new Date();
    const publishedAt = payload.status === 'published' ? payload.publishedAt ?? now : payload.publishedAt ?? null;

    const post = await db.transaction(async (trx) => {
      const created = await CommunityPostModel.create(
        {
          communityId: community.id,
          channelId,
          authorId: userId,
          postType: payload.postType,
          title: payload.title,
          body: payload.body,
          tags: payload.tags,
          visibility: payload.visibility,
          status: payload.status,
          scheduledAt: payload.scheduledAt,
          publishedAt,
          metadata: payload.metadata,
          mediaAssetId: payload.mediaAssetId,
          previewMetadata: payload.previewMetadata,
          pinnedAt: payload.pinnedAt
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_post',
          entityId: created.id,
          eventType: 'community.post.created',
          payload: { communityId: community.id, channelId },
          performedBy: userId
        },
        trx
      );

      if (created.status === 'published') {
        await DomainEventModel.record(
          {
            entityType: 'community_post',
            entityId: created.id,
            eventType: 'community.post.published',
            payload: { communityId: community.id, channelId },
            performedBy: userId
          },
          trx
        );
      }

      return created;
    });

    return this.serializePost(post, community);
  }

  static async updatePost(communityIdentifier, postId, userId, payload = {}, options = {}) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!membership) {
      const error = new Error('You need to join this community before managing posts');
      error.status = 403;
      throw error;
    }

    if (!isActiveMembership(membership)) {
      const error = new Error('Your membership is not active');
      error.status = 403;
      throw error;
    }

    const post = await CommunityPostModel.findById(postId);
    if (!post || Number(post.communityId) !== Number(community.id)) {
      const error = new Error('Post not found');
      error.status = 404;
      throw error;
    }

    const canModerate = canModerateMembership(membership, options.actorRole);
    const isAuthor = Number(post.authorId) === Number(userId);
    if (!isAuthor && !canModerate) {
      const error = new Error('You do not have permission to update this post');
      error.status = 403;
      throw error;
    }

    const updates = {};
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.body !== undefined) updates.body = payload.body;
    if (payload.tags !== undefined) updates.tags = Array.isArray(payload.tags) ? payload.tags : [];
    if (payload.visibility !== undefined) updates.visibility = payload.visibility;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.scheduledAt !== undefined) updates.scheduledAt = payload.scheduledAt;

    let nextPublishedAt = payload.publishedAt;
    if (updates.status === 'published' && !nextPublishedAt) {
      nextPublishedAt = new Date().toISOString();
    }
    if (payload.publishedAt !== undefined || nextPublishedAt) {
      updates.publishedAt = nextPublishedAt ?? payload.publishedAt;
    }

    if (payload.metadata !== undefined) {
      const existingMetadata = parseJsonColumn(post.metadata, {});
      updates.metadata = { ...existingMetadata, ...payload.metadata };
    }
    if (payload.mediaAssetId !== undefined) {
      updates.mediaAssetId = payload.mediaAssetId;
    }
    if (payload.clearMediaAsset) {
      updates.mediaAssetId = null;
    }
    if (payload.previewMetadata !== undefined) {
      updates.previewMetadata = payload.previewMetadata ?? {};
    }
    if (payload.clearPreviewMetadata) {
      updates.previewMetadata = {};
    }
    if (payload.pinnedAt !== undefined) {
      updates.pinnedAt = payload.pinnedAt;
    }
    if (payload.channelId !== undefined) {
      updates.channelId = payload.channelId;
    }

    const updated = await db.transaction(async (trx) => {
      const result = await CommunityPostModel.updateById(post.id, updates, trx);
      await DomainEventModel.record(
        {
          entityType: 'community_post',
          entityId: post.id,
          eventType: 'community.post.updated',
          payload: {
            communityId: community.id,
            updatedBy: userId,
            status: result.status
          },
          performedBy: userId
        },
        trx
      );
      return result;
    });

    return this.serializePost(updated, community, { membership, actorRole: options.actorRole });
  }

  static async togglePostReaction(postId, userId, reaction, options = {}) {
    const reactionKey = typeof reaction === 'string' ? reaction.trim().toLowerCase() : '';
    if (!reactionKey) {
      const error = new Error('Reaction type is required');
      error.status = 422;
      throw error;
    }

    return db.transaction(async (trx) => {
      const post = await CommunityPostModel.findById(postId, trx);
      if (!post || post.status !== 'published') {
        const error = new Error('Post not found');
        error.status = 404;
        throw error;
      }

      const membership = await CommunityMemberModel.findMembership(post.communityId, userId, trx);
      if (!isActiveMembership(membership)) {
        const error = new Error('You need an active membership to react to posts');
        error.status = 403;
        throw error;
      }

      const actor = { id: userId, role: options.actorRole };
      const toggled = await CommunityPostReactionModel.toggle(
        {
          postId: post.id,
          userId,
          reaction: reactionKey,
          metadata: options.metadata
        },
        trx
      );

      const summary = await CommunityPostReactionModel.summarise(post.id, trx);
      const updated = await CommunityPostModel.updateReactionSummary(post.id, summary, trx);
      const viewerReactions = await CommunityPostReactionModel.listForPosts([post.id], userId, trx);
      const community = post.communityId
        ? { id: post.communityId, name: post.communityName, slug: post.communitySlug }
        : undefined;

      await DomainEventModel.record(
        {
          entityType: 'community_post',
          entityId: post.id,
          eventType: toggled.active
            ? 'community.post.reaction.added'
            : 'community.post.reaction.removed',
          payload: {
            communityId: post.communityId,
            reaction: reactionKey
          },
          performedBy: userId
        },
        trx
      );

      const serialized = this.serializePost(updated, community, {
        membership,
        actor,
        viewerReactions: viewerReactions.get(post.id)
      });

      return {
        post: serialized,
        reaction: reactionKey,
        active: toggled.active
      };
    });
  }

  static async createResource(communityIdentifier, userId, payload) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!canManageResources(membership, undefined)) {
      const error = new Error('You do not have permission to manage resources in this community');
      error.status = isActiveMembership(membership) ? 403 : 404;
      throw error;
    }

    const publishedAt = payload.status === 'published' ? payload.publishedAt ?? new Date() : payload.publishedAt ?? null;

    const resource = await db.transaction(async (trx) => {
      const created = await CommunityResourceModel.create(
        {
          communityId: community.id,
          createdBy: userId,
          title: payload.title,
          description: payload.description,
          resourceType: payload.resourceType,
          assetId: payload.assetId,
          linkUrl: payload.linkUrl,
          classroomReference: payload.classroomReference,
          tags: payload.tags,
          metadata: payload.metadata,
          visibility: payload.visibility,
          status: payload.status,
          publishedAt
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_resource',
          entityId: created.id,
          eventType: 'community.resource.created',
          payload: { communityId: community.id, resourceType: created.resourceType },
          performedBy: userId
        },
        trx
      );

      if (created.status === 'published') {
        await DomainEventModel.record(
          {
            entityType: 'community_resource',
            entityId: created.id,
            eventType: 'community.resource.published',
            payload: { communityId: community.id, resourceType: created.resourceType },
            performedBy: userId
          },
          trx
        );
      }

      return created;
    });

    return this.serializeResource(resource);
  }

  static async updateResource(communityIdentifier, resourceId, userId, payload) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!canManageResources(membership, undefined)) {
      const error = new Error('You do not have permission to manage resources in this community');
      error.status = isActiveMembership(membership) ? 403 : 404;
      throw error;
    }

    const existing = await CommunityResourceModel.findById(resourceId);
    if (!existing || existing.communityId !== community.id || existing.deletedAt) {
      const error = new Error('Resource not found');
      error.status = 404;
      throw error;
    }

    const nextStatus = payload.status ?? existing.status;
    let nextPublishedAt = existing.publishedAt;
    if (payload.publishedAt !== undefined) {
      nextPublishedAt = payload.publishedAt;
    } else if (payload.status && payload.status !== existing.status) {
      nextPublishedAt = payload.status === 'published' ? existing.publishedAt ?? new Date() : null;
    }

    const updates = {};
    if (payload.title !== undefined) {
      updates.title = payload.title;
    }
    if (payload.description !== undefined) {
      updates.description = payload.description;
    }
    if (payload.resourceType !== undefined) {
      updates.resourceType = payload.resourceType;
    }

    const targetType = payload.resourceType ?? existing.resourceType;
    if (payload.assetId !== undefined || payload.resourceType !== undefined) {
      if (targetType === 'content_asset') {
        updates.assetId = payload.assetId !== undefined ? payload.assetId : existing.assetId;
      } else {
        updates.assetId = null;
      }
    }
    if (payload.linkUrl !== undefined || payload.resourceType !== undefined) {
      if (targetType === 'content_asset') {
        updates.linkUrl = null;
      } else if (payload.linkUrl !== undefined) {
        const trimmed = typeof payload.linkUrl === 'string' ? payload.linkUrl.trim() : payload.linkUrl;
        updates.linkUrl = trimmed ? trimmed : null;
      } else {
        updates.linkUrl = existing.linkUrl;
      }
    }
    if (payload.classroomReference !== undefined) {
      const trimmed = typeof payload.classroomReference === 'string' ? payload.classroomReference.trim() : payload.classroomReference;
      updates.classroomReference = trimmed || null;
    }
    if (payload.tags !== undefined) {
      updates.tags = Array.isArray(payload.tags)
        ? payload.tags.map((tag) => String(tag).trim()).filter(Boolean)
        : [];
    }
    if (payload.metadata !== undefined) {
      updates.metadata = typeof payload.metadata === 'object' && payload.metadata !== null ? payload.metadata : {};
    }
    if (payload.visibility !== undefined) {
      updates.visibility = payload.visibility;
    }

    updates.status = nextStatus;
    updates.publishedAt = nextPublishedAt;

    const updated = await db.transaction(async (trx) => {
      const saved = await CommunityResourceModel.update(resourceId, updates, trx);

      await DomainEventModel.record(
        {
          entityType: 'community_resource',
          entityId: saved.id,
          eventType: 'community.resource.updated',
          payload: { communityId: community.id, status: saved.status },
          performedBy: userId
        },
        trx
      );

      if (existing.status !== saved.status) {
        const eventType = saved.status === 'published'
          ? 'community.resource.published'
          : saved.status === 'archived'
          ? 'community.resource.archived'
          : 'community.resource.unpublished';
        await DomainEventModel.record(
          {
            entityType: 'community_resource',
            entityId: saved.id,
            eventType,
            payload: { communityId: community.id, previousStatus: existing.status, status: saved.status },
            performedBy: userId
          },
          trx
        );
      }

      return saved;
    });

    return this.serializeResource(updated);
  }

  static async deleteResource(communityIdentifier, resourceId, userId) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!canManageResources(membership, undefined)) {
      const error = new Error('You do not have permission to manage resources in this community');
      error.status = isActiveMembership(membership) ? 403 : 404;
      throw error;
    }

    const existing = await CommunityResourceModel.findById(resourceId);
    if (!existing || existing.communityId !== community.id || existing.deletedAt) {
      const error = new Error('Resource not found');
      error.status = 404;
      throw error;
    }

    await db.transaction(async (trx) => {
      await CommunityResourceModel.markDeleted(resourceId, trx);
      await DomainEventModel.record(
        {
          entityType: 'community_resource',
          entityId: resourceId,
          eventType: 'community.resource.deleted',
          payload: { communityId: community.id, previousStatus: existing.status },
          performedBy: userId
        },
        trx
      );
    });

    return { id: resourceId };
  }

  static async joinCommunity(communityIdentifier, userId) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    await db.transaction(async (trx) => {
      const existing = await CommunityMemberModel.findMembership(community.id, userId, trx);
      if (existing) {
        if (existing.status !== 'active') {
          await CommunityMemberModel.updateStatus(community.id, userId, 'active', trx);
        }
      } else {
        await CommunityMemberModel.create(
          {
            communityId: community.id,
            userId,
            role: 'member',
            status: 'active'
          },
          trx
        );
      }

      await DomainEventModel.record(
        {
          entityType: 'community_member',
          entityId: `${community.id}:${userId}`,
          eventType: existing ? 'community.member.rejoined' : 'community.member.joined',
          payload: { communityId: community.id },
          performedBy: userId
        },
        trx
      );
    });

    return this.getCommunityDetail(community.id, userId);
  }

  static async leaveCommunity(communityIdentifier, userId) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!isActiveMembership(membership)) {
      const error = new Error('You are not an active member of this community');
      error.status = 403;
      throw error;
    }

    if (membership.role === 'owner') {
      const error = new Error('Community owners cannot leave their own community');
      error.status = 422;
      throw error;
    }

    await db.transaction(async (trx) => {
      await CommunityMemberModel.markLeft(community.id, userId, trx);
      await DomainEventModel.record(
        {
          entityType: 'community_member',
          entityId: `${community.id}:${userId}`,
          eventType: 'community.member.left',
          payload: { communityId: community.id },
          performedBy: userId
        },
        trx
      );
    });

    return this.serializeCommunity({ ...community, memberRole: null, memberStatus: null });
  }

  static async moderatePost(communityIdentifier, postId, userId, payload, options = {}) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!canModerateMembership(membership, options.actorRole)) {
      const error = new Error('You do not have permission to moderate posts in this community');
      error.status = 403;
      throw error;
    }

    return db.transaction(async (trx) => {
      const post = await CommunityPostModel.findById(postId, trx);
      if (!post || Number(post.communityId) !== Number(community.id)) {
        const error = new Error('Post not found');
        error.status = 404;
        throw error;
      }

      const existingMetadata = parseJsonColumn(post.moderationMetadata, {});
      const now = new Date().toISOString();
      const moderationNote = payload.reason
        ? {
            by: userId,
            reason: payload.reason,
            at: now
          }
        : null;

      const metadata = {
        ...existingMetadata,
        notes: moderationNote
          ? [...(Array.isArray(existingMetadata.notes) ? existingMetadata.notes : []), moderationNote]
          : existingMetadata.notes
      };

      let nextState = post.moderationState ?? 'clean';
      let nextStatus = post.status;

      if (payload.action === 'suppress') {
        nextState = 'suppressed';
        nextStatus = post.status === 'published' ? 'archived' : post.status;
      } else if (payload.action === 'restore') {
        nextState = 'clean';
        nextStatus = post.status === 'archived' ? 'published' : post.status;
      }

      const updated = await CommunityPostModel.updateModerationState(
        post.id,
        {
          state: nextState,
          metadata,
          status: nextStatus
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_post',
          entityId: post.id,
          eventType: `community.post.${payload.action}`,
          payload: { communityId: community.id, reason: payload.reason ?? null },
          performedBy: userId
        },
        trx
      );

      return this.serializePost(updated, community, {
        membership,
        actor: { id: userId, role: options.actorRole }
      });
    });
  }

  static async removePost(communityIdentifier, postId, userId, payload = {}, options = {}) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!canModerateMembership(membership, options.actorRole)) {
      const error = new Error('You do not have permission to remove posts in this community');
      error.status = 403;
      throw error;
    }

    return db.transaction(async (trx) => {
      const post = await CommunityPostModel.findById(postId, trx);
      if (!post || Number(post.communityId) !== Number(community.id)) {
        const error = new Error('Post not found');
        error.status = 404;
        throw error;
      }

      const metadata = parseJsonColumn(post.metadata, {});
      const removalEntry = {
        removedBy: userId,
        removedAt: new Date().toISOString(),
        reason: payload.reason ?? null
      };

      const updated = await CommunityPostModel.archive(
        post.id,
        {
          metadata: {
            ...metadata,
            removalHistory: [...(Array.isArray(metadata.removalHistory) ? metadata.removalHistory : []), removalEntry]
          }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_post',
          entityId: post.id,
          eventType: 'community.post.archived',
          payload: { communityId: community.id, reason: payload.reason ?? null },
          performedBy: userId
        },
        trx
      );

      return this.serializePost(updated, community, {
        membership,
        actor: { id: userId, role: options.actorRole }
      });
    });
  }

  static async listSponsorshipPlacements(communityIdentifier, userId, options = {}) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!canManageSponsorships(membership, options.actorRole)) {
      const error = new Error('You do not have permission to manage sponsorships in this community');
      error.status = 403;
      throw error;
    }

    const metadata = parseJsonColumn(community.metadata, {});
    const sponsorships = metadata.sponsorships ?? {};
    return {
      communityId: community.id,
      blockedPlacementIds: normalisePlacementIds(sponsorships.blockedPlacementIds)
    };
  }

  static async updateSponsorshipPlacements(communityIdentifier, userId, payload, options = {}) {
    const community = await this.resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!canManageSponsorships(membership, options.actorRole)) {
      const error = new Error('You do not have permission to manage sponsorships in this community');
      error.status = 403;
      throw error;
    }

    const blockedPlacementIds = normalisePlacementIds(payload.blockedPlacementIds);

    const updated = await db.transaction(async (trx) => {
      const metadata = parseJsonColumn(community.metadata, {});
      const nextMetadata = {
        ...metadata,
        sponsorships: {
          ...(metadata.sponsorships ?? {}),
          blockedPlacementIds
        }
      };

      const refreshed = await CommunityModel.updateMetadata(community.id, nextMetadata, trx);

      await DomainEventModel.record(
        {
          entityType: 'community',
          entityId: community.id,
          eventType: 'community.sponsorships.updated',
          payload: { blockedPlacementIds },
          performedBy: userId
        },
        trx
      );

      return refreshed;
    });

    return {
      communityId: updated.id,
      blockedPlacementIds
    };
  }

  static async resolveDefaultChannelId(communityId) {
    const channel = await CommunityChannelModel.findDefault(communityId);
    if (channel) {
      return channel.id;
    }

    const created = await CommunityChannelModel.create({
      communityId,
      name: 'General',
      slug: `general-${Date.now()}`,
      channelType: 'general',
      isDefault: true
    });
    return created.id;
  }

  static async resolveCommunity(identifier) {
    if (!identifier) return null;
    if (Number.isInteger(Number(identifier))) {
      return CommunityModel.findById(Number(identifier));
    }
    return CommunityModel.findBySlug(String(identifier));
  }

  static serializeCommunity(community) {
    const metadata = parseJsonColumn(community.metadata, {});
    const stats = {
      members: Number(community.memberCount ?? 0),
      resources: Number(community.resourceCount ?? 0),
      posts: Number(community.postCount ?? 0),
      channels: Number(community.channelCount ?? 0),
      lastActivityAt: community.lastActivityAt ?? community.updatedAt
    };

    const membershipInfo = community.memberRole
      ? { role: community.memberRole, status: community.memberStatus }
      : null;
    const permissions = {
      canModeratePosts: canModerateMembership(membershipInfo, undefined),
      canManageSponsorships: canManageSponsorships(membershipInfo, undefined),
      canManageResources: canManageResources(membershipInfo, undefined),
      canLeave: isActiveMembership(membershipInfo) && community.memberRole !== 'owner'
    };

    return {
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      coverImageUrl: community.coverImageUrl,
      visibility: community.visibility,
      ownerId: community.ownerId,
      metadata,
      stats,
      membership: community.memberRole
        ? {
            role: community.memberRole,
            status: community.memberStatus
          }
        : undefined,
      permissions,
      createdAt: community.createdAt,
      updatedAt: community.updatedAt
    };
  }

  static serializeCommunityDetail(community, membership, stats, channels, context = {}) {
    const summary = this.serializeCommunity({
      ...community,
      ...stats,
      memberRole: membership?.role,
      memberStatus: membership?.status
    });
    const metadata = parseJsonColumn(community.metadata, {});
    const sponsorships = metadata.sponsorships ?? {};
    const membershipMap = buildMembershipMap(metadata.membershipMap ?? {});
    const ratings = buildRatings(metadata.ratings ?? {});
    const reviews = Array.isArray(metadata.reviews) ? metadata.reviews : [];
    const liveSessions = buildLiveSessions(context.webinars ?? [], metadata.classrooms?.live);
    const recordedSessions = Array.isArray(context.recordedSessions) && context.recordedSessions.length
      ? context.recordedSessions
      : buildRecordedSessions([], metadata.classrooms?.recorded);
    const firstLiveSession = liveSessions[0];
    const liveClassroom = {
      host: metadata.classrooms?.liveClassroom?.host ?? firstLiveSession?.facilitator ?? 'Community Stage',
      status: metadata.classrooms?.liveClassroom?.status ?? firstLiveSession?.status ?? 'Standby',
      capacity: metadata.classrooms?.liveClassroom?.capacity ?? null,
      streamUrl:
        metadata.classrooms?.liveClassroom?.streamUrl ??
        metadata.classrooms?.liveClassroom?.broadcastUrl ??
        firstLiveSession?.registrationUrl ??
        null
    };
    const chatChannels = channels
      .filter((channel) => ['classroom', 'general', 'events'].includes(channel.channelType))
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        type: channel.channelType,
        description: channel.description,
        metadata: parseJsonColumn(channel.metadata, {}),
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt
      }));
    const leaderboard = Array.isArray(context.leaderboard) && context.leaderboard.length
      ? context.leaderboard
      : Array.isArray(metadata.leaderboard)
        ? metadata.leaderboard
        : [];
    const subscription = buildSubscriptionSummary(
      metadata.subscription ?? {},
      context.paywallTiers ?? [],
      context.activeSubscriptions ?? []
    );
    const events = Array.isArray(context.events) && context.events.length
      ? context.events
      : mergeEvents([], [], metadata.events);
    const roles = buildRolesMetadata(context.roleDefinitions ?? [], metadata.roles ?? {});
    const security = {
      zeroTrust: Boolean(metadata.security?.zeroTrust),
      singleSignOn: Boolean(metadata.security?.singleSignOn),
      auditLog: Boolean(metadata.security?.auditLog),
      lastPenTest: metadata.security?.lastPenTest ?? null,
      dataResidency: metadata.security?.dataResidency ?? null
    };
    const launchChecklist = buildLaunchChecklist(metadata.launchChecklist ?? {});
    const links = metadata.links ?? {
      hub: community.slug ? `https://app.edulure.com/communities/${community.slug}` : null
    };
    const members = Array.isArray(context.members) && context.members.length
      ? context.members
      : Array.isArray(metadata.members)
        ? metadata.members
        : [];

    if (context.membershipTotal !== undefined) {
      membershipMap.totalMembers = context.membershipTotal;
    }

    return {
      ...summary,
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        type: channel.channelType,
        description: channel.description,
        isDefault: Boolean(channel.isDefault),
        metadata: parseJsonColumn(channel.metadata, {}),
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt
      })),
      sponsorships: {
        blockedPlacementIds: normalisePlacementIds(sponsorships.blockedPlacementIds)
      },
      members,
      membershipMap,
      ratings,
      reviews,
      classrooms: {
        live: liveSessions,
        recorded: recordedSessions,
        liveClassroom,
        chatChannels
      },
      leaderboard,
      subscription,
      events,
      roles,
      security,
      launchChecklist,
      links
    };
  }

  static serializePost(post, communityOverride, context = {}) {
    const tags = toArray(post.tags);
    const reactionSummary = parseJsonColumn(post.reactionSummary, {});
    const metadata = parseJsonColumn(post.metadata, {});
    const moderationMetadata = parseJsonColumn(post.moderationMetadata, {});
    const previewMetadata = parseJsonColumn(post.previewMetadata, {});
    const assetMetadata = post.mediaAsset ? parseJsonColumn(post.mediaAsset.metadata, {}) : {};
    const totalReactions = typeof reactionSummary.total === 'number'
      ? reactionSummary.total
      : Object.values(reactionSummary).reduce((sum, value) => (typeof value === 'number' ? sum + value : sum), 0);

    const authorName = (post.authorName ?? '').trim() || 'Community Member';

    const community = communityOverride
      ? { id: communityOverride.id, name: communityOverride.name, slug: communityOverride.slug }
      : post.communityId
      ? { id: post.communityId, name: post.communityName, slug: post.communitySlug }
      : undefined;

    const membership = context.membership;
    const actor = context.actor ?? {};
    const canModerate = canModerateMembership(membership, actor.role);
    const canRemove = canModerate || actor.id === post.authorId;
    const viewerReactionSet =
      context.viewerReactions instanceof Set
        ? context.viewerReactions
        : Array.isArray(context.viewerReactions)
          ? new Set(context.viewerReactions)
          : new Set();
    const viewerReactions = Array.from(viewerReactionSet).filter(Boolean);

    const preview = {
      thumbnailUrl: previewMetadata.thumbnailUrl ?? assetMetadata.thumbnailUrl ?? null,
      width: previewMetadata.width ?? assetMetadata.width ?? null,
      height: previewMetadata.height ?? assetMetadata.height ?? null,
      aspectRatio: previewMetadata.aspectRatio ?? assetMetadata.aspectRatio ?? null,
      dominantColor: previewMetadata.dominantColor ?? assetMetadata.dominantColor ?? null
    };

    const media = post.mediaAssetId || preview.thumbnailUrl
      ? {
          assetId: post.mediaAssetId ?? null,
          assetPublicId: post.mediaAsset?.publicId ?? null,
          mimeType: post.mediaAsset?.mimeType ?? null,
          preview,
          metadata: assetMetadata
        }
      : undefined;

    return {
      id: post.id,
      type: post.postType,
      title: post.title,
      body: post.body,
      publishedAt: post.publishedAt ?? post.createdAt,
      scheduledAt: post.scheduledAt ?? undefined,
      visibility: post.visibility,
      status: post.status,
      tags,
      isPinned: Boolean(post.pinnedAt),
      pinnedAt: post.pinnedAt ?? undefined,
      channel: post.channelId
        ? {
            id: post.channelId,
            name: post.channelName,
            slug: post.channelSlug,
            type: post.channelType
          }
        : undefined,
      community,
      author: {
        id: post.authorId,
        name: authorName,
        role: post.authorRole,
        avatarUrl: buildAvatarUrl(authorName)
      },
      media,
      stats: {
        reactions: totalReactions,
        reactionBreakdown: reactionSummary,
        comments: Number(post.commentCount ?? 0)
      },
      moderation: {
        state: post.moderationState ?? 'clean',
        lastReviewedAt: post.lastModeratedAt ?? undefined,
        flags: Array.isArray(moderationMetadata.flags) ? moderationMetadata.flags : [],
        riskHistory: Array.isArray(moderationMetadata.riskHistory)
          ? moderationMetadata.riskHistory
          : [],
        notes: moderationMetadata.notes ?? [],
        context: moderationMetadata.context ?? null,
        caseId: moderationMetadata.caseId ?? moderationMetadata.case_id ?? null,
        reviewContext: moderationMetadata.reviewContext ?? moderationMetadata.review_context ?? null
      },
      metadata,
      permissions: {
        canModerate,
        canRemove
      },
      viewer: {
        reactions: viewerReactions,
        hasReacted: viewerReactions.length > 0
      }
    };
  }

  static serializeResource(resource) {
    const tags = toArray(resource.tags);
    const metadata = parseJsonColumn(resource.metadata, {});

    return {
      id: resource.id,
      communityId: resource.communityId,
      title: resource.title,
      description: resource.description,
      resourceType: resource.resourceType,
      assetId: resource.assetId ?? undefined,
      asset: resource.assetPublicId
        ? {
            publicId: resource.assetPublicId,
            filename: resource.assetFilename
          }
        : undefined,
      linkUrl: resource.linkUrl ?? undefined,
      classroomReference: resource.classroomReference ?? undefined,
      tags,
      visibility: resource.visibility,
      status: resource.status,
      metadata,
      publishedAt: resource.publishedAt,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      createdBy: {
        id: resource.createdBy,
        name: (resource.createdByName ?? '').trim() || 'Community Member',
        role: resource.createdByRole,
        avatarUrl: buildAvatarUrl(resource.createdByName)
      }
    };
  }
}
