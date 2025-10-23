import slugify from 'slugify';

import db from '../config/database.js';
import CommunityChannelModel from '../models/CommunityChannelModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityModel from '../models/CommunityModel.js';
import CommunityPostModel from '../models/CommunityPostModel.js';
import CommunityResourceModel from '../models/CommunityResourceModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
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

    const stats = await CommunityModel.getStats(community.id);
    const channels = await CommunityChannelModel.listByCommunity(community.id);

    return this.serializeCommunityDetail(community, isActiveMembership(membership) ? membership : null, stats, channels);
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
    const serialised = items.map((item) =>
      this.serializePost(item, community, {
        membership,
        actor
      })
    );
    const decorated = await AdsPlacementService.decorateFeed({
      posts: serialised,
      context: 'community_feed',
      page: filters.page,
      perPage: filters.perPage,
      metadata: { communityId: community.id, blockedPlacementIds }
    });
    return {
      items: decorated.items,
      pagination,
      ads: decorated.ads
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
    const serialised = items.map((item) =>
      this.serializePost(item, undefined, {
        membership: item.viewerRole ? { role: item.viewerRole, status: 'active' } : null,
        actor
      })
    );
    const decorated = await AdsPlacementService.decorateFeed({
      posts: serialised,
      context: 'global_feed',
      page: filters.page,
      perPage: filters.perPage,
      metadata: { userId }
    });
    return {
      items: decorated.items,
      pagination,
      ads: decorated.ads
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

  static serializeCommunityDetail(community, membership, stats, channels) {
    const summary = this.serializeCommunity({
      ...community,
      ...stats,
      memberRole: membership?.role,
      memberStatus: membership?.status
    });
    const metadata = parseJsonColumn(community.metadata, {});
    const sponsorships = metadata.sponsorships ?? {};
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
      }
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
        context: moderationMetadata.context ?? null
      },
      metadata,
      permissions: {
        canModerate,
        canRemove
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
