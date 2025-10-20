import { randomUUID } from 'crypto';
import slugify from 'slugify';

import db from '../config/database.js';
import CommunityChannelMemberModel from '../models/CommunityChannelMemberModel.js';
import CommunityChannelModel from '../models/CommunityChannelModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityMessageModerationModel from '../models/CommunityMessageModerationModel.js';
import CommunityMessageModel from '../models/CommunityMessageModel.js';
import CommunityMessageReactionModel from '../models/CommunityMessageReactionModel.js';
import CommunityModel from '../models/CommunityModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import UserPresenceSessionModel from '../models/UserPresenceSessionModel.js';
import UserModel from '../models/UserModel.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

const MODERATOR_ROLES = new Set(['owner', 'admin', 'moderator']);

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function serializeChannel(channel) {
  return {
    id: channel.id,
    communityId: channel.communityId,
    name: channel.name,
    slug: channel.slug,
    channelType: channel.channelType,
    description: channel.description ?? null,
    isDefault: Boolean(channel.isDefault),
    metadata: parseJson(channel.metadata, {}),
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt
  };
}

const log = logger.child({ module: 'community-chat-service' });
const CHAT_DEFAULT_PAGE_SIZE = env.chat.pagination.defaultPageSize;
const CHAT_MAX_PAGE_SIZE = env.chat.pagination.maxPageSize;
const PRESENCE_DEFAULT_TTL = env.chat.presence.defaultTtlMinutes;
const PRESENCE_MAX_TTL = env.chat.presence.maxTtlMinutes;

export default class CommunityChatService {
  static async ensureCommunityMember(communityId, userId) {
    const community = await CommunityModel.findById(communityId);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = await CommunityMemberModel.findMembership(community.id, userId);
    if (!membership || membership.status !== 'active') {
      const error = new Error('You do not have access to this community');
      error.status = membership ? 403 : 404;
      throw error;
    }

    return { community, membership };
  }

  static async ensureChannelAccess(communityId, channelId, userId) {
    const { community, membership } = await this.ensureCommunityMember(communityId, userId);
    const channel = await CommunityChannelModel.findById(channelId);
    if (!channel || channel.communityId !== community.id) {
      const error = new Error('Channel not found');
      error.status = 404;
      throw error;
    }

    const channelMembership = await CommunityChannelMemberModel.ensureMembership(
      channel.id,
      userId,
      { role: MODERATOR_ROLES.has(membership.role) ? 'moderator' : 'member' }
    );

    if (channelMembership.muteUntil) {
      const muteUntil = new Date(channelMembership.muteUntil);
      if (!Number.isNaN(muteUntil.getTime()) && muteUntil > new Date()) {
        const error = new Error('You are temporarily muted in this channel');
        error.status = 423;
        throw error;
      }
    }

    return { community, channel: serializeChannel(channel), membership, channelMembership };
  }

  static assertChannelManagementRights(membership) {
    if (!membership || !MODERATOR_ROLES.has(membership.role)) {
      const error = new Error('You do not have permission to manage channels');
      error.status = 403;
      throw error;
    }
  }

  static sanitizeChannelMetadata(metadata = {}) {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    const allowed = { ...metadata };
    if (metadata.permissions && typeof metadata.permissions === 'object') {
      allowed.permissions = {
        broadcast: Boolean(metadata.permissions.broadcast),
        media: Boolean(metadata.permissions.media),
        voice: Boolean(metadata.permissions.voice),
        events: Boolean(metadata.permissions.events)
      };
    }

    if (metadata.topics && Array.isArray(metadata.topics)) {
      allowed.topics = metadata.topics.slice(0, 15).map((topic) => String(topic).trim()).filter(Boolean);
    }

    if (metadata.live && typeof metadata.live === 'object') {
      const live = metadata.live;
      allowed.live = {
        enabled: Boolean(live.enabled),
        provider: live.provider ?? 'internal',
        url: live.url ?? null,
        startAt: live.startAt ?? null
      };
    }

    return allowed;
  }

  static async resolveChannelSlug(communityId, requestedSlug, trx) {
    const base = slugify(requestedSlug, { lower: true, strict: true }) || `channel-${Date.now()}`;
    let candidate = base;
    let attempt = 1;
    const query = (slug) =>
      (trx ?? db)('community_channels').where({ community_id: communityId, slug }).first();

    // eslint-disable-next-line no-await-in-loop
    while (await query(candidate)) {
      candidate = `${base}-${attempt}`;
      attempt += 1;
    }

    return candidate;
  }

  static async createChannel(communityId, userId, payload = {}) {
    const { community, membership } = await this.ensureCommunityMember(communityId, userId);
    this.assertChannelManagementRights(membership);

    const metadata = this.sanitizeChannelMetadata(payload.metadata ?? {});
    const requestedSlug = payload.slug ?? payload.name ?? `channel-${Date.now()}`;

    return db.transaction(async (trx) => {
      const slug = await this.resolveChannelSlug(community.id, requestedSlug, trx);
      const created = await CommunityChannelModel.create(
        {
          communityId: community.id,
          name: payload.name,
          slug,
          channelType: payload.channelType ?? 'general',
          description: payload.description ?? null,
          isDefault: Boolean(payload.isDefault),
          metadata
        },
        trx
      );

      if (payload.isDefault) {
        await trx('community_channels')
          .where({ community_id: community.id })
          .andWhereNot({ id: created.id })
          .update({ is_default: false, updated_at: trx.fn.now() });
      }

      await CommunityChannelMemberModel.ensureMembership(
        created.id,
        userId,
        { role: 'moderator', metadata: { addedBy: userId } },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_channel',
          entityId: created.id,
          eventType: 'community.channel.created',
          payload: { communityId: community.id, channelType: created.channelType },
          performedBy: userId
        },
        trx
      );

      return serializeChannel(created);
    });
  }

  static async updateChannel(communityId, channelId, userId, payload = {}) {
    const { community, channel, membership } = await this.ensureChannelAccess(communityId, channelId, userId);
    this.assertChannelManagementRights(membership);

    const metadata = payload.metadata ? this.sanitizeChannelMetadata(payload.metadata) : undefined;

    return db.transaction(async (trx) => {
      let slugUpdate;
      if (payload.slug) {
        slugUpdate = await this.resolveChannelSlug(community.id, payload.slug, trx);
      } else if (payload.name && !payload.slug && channel.slug?.startsWith('channel-')) {
        slugUpdate = await this.resolveChannelSlug(community.id, payload.name, trx);
      }

      const next = await CommunityChannelModel.update(
        channel.id,
        {
          name: payload.name,
          slug: slugUpdate,
          channelType: payload.channelType,
          description: payload.description,
          isDefault: payload.isDefault,
          metadata
        },
        trx
      );

      if (payload.isDefault === true) {
        await trx('community_channels')
          .where({ community_id: community.id })
          .andWhereNot({ id: channel.id })
          .update({ is_default: false, updated_at: trx.fn.now() });
      }

      await DomainEventModel.record(
        {
          entityType: 'community_channel',
          entityId: channel.id,
          eventType: 'community.channel.updated',
          payload: { communityId: community.id, updates: payload },
          performedBy: userId
        },
        trx
      );

      return serializeChannel(next);
    });
  }

  static async deleteChannel(communityId, channelId, userId) {
    const { community, channel, membership } = await this.ensureChannelAccess(communityId, channelId, userId);
    this.assertChannelManagementRights(membership);

    if (channel.isDefault) {
      const error = new Error('Default channels cannot be deleted');
      error.status = 409;
      throw error;
    }

    await db.transaction(async (trx) => {
      await CommunityChannelModel.delete(channel.id, trx);
      await DomainEventModel.record(
        {
          entityType: 'community_channel',
          entityId: channel.id,
          eventType: 'community.channel.deleted',
          payload: { communityId: community.id },
          performedBy: userId
        },
        trx
      );
    });

    return { success: true };
  }

  static async listChannelMembers(communityId, channelId, userId) {
    const { channel } = await this.ensureChannelAccess(communityId, channelId, userId);
    const memberships = await CommunityChannelMemberModel.listForChannel(channel.id);
    if (!memberships.length) {
      return [];
    }

    const users = await UserModel.findByIds(memberships.map((member) => member.userId));
    const userMap = new Map(users.map((user) => [user.id, user]));

    return memberships.map((membership) => ({
      membership,
      user: userMap.get(membership.userId) ?? null
    }));
  }

  static async upsertChannelMember(communityId, channelId, actorId, payload = {}) {
    if (!payload.userId) {
      const error = new Error('A user identifier is required');
      error.status = 400;
      throw error;
    }

    const { community, channel, membership } = await this.ensureChannelAccess(communityId, channelId, actorId);
    this.assertChannelManagementRights(membership);

    const targetMembership = await CommunityMemberModel.findMembership(community.id, payload.userId);
    if (!targetMembership || targetMembership.status !== 'active') {
      const error = new Error('Target user is not an active community member');
      error.status = targetMembership ? 403 : 404;
      throw error;
    }

    return db.transaction(async (trx) => {
      await CommunityChannelMemberModel.ensureMembership(
        channel.id,
        payload.userId,
        {
          role: payload.role ?? (MODERATOR_ROLES.has(targetMembership.role) ? 'moderator' : 'member'),
          notificationsEnabled: payload.notificationsEnabled ?? true,
          metadata: { addedBy: actorId }
        },
        trx
      );

      const updated = await CommunityChannelMemberModel.updateMembership(
        channel.id,
        payload.userId,
        {
          role: payload.role,
          notificationsEnabled: payload.notificationsEnabled,
          muteUntil: payload.muteUntil,
          metadata: payload.metadata
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_channel',
          entityId: channel.id,
          eventType: 'community.channel.member.updated',
          payload: { communityId: community.id, memberId: payload.userId, role: updated.role },
          performedBy: actorId
        },
        trx
      );

      return updated;
    });
  }

  static async removeChannelMember(communityId, channelId, actorId, targetUserId) {
    const { community, channel, membership } = await this.ensureChannelAccess(communityId, channelId, actorId);
    this.assertChannelManagementRights(membership);

    if (actorId === targetUserId) {
      const error = new Error('Use the leave action to exit the channel');
      error.status = 400;
      throw error;
    }

    await db.transaction(async (trx) => {
      await CommunityChannelMemberModel.removeMembership(channel.id, targetUserId, trx);
      await DomainEventModel.record(
        {
          entityType: 'community_channel',
          entityId: channel.id,
          eventType: 'community.channel.member.removed',
          payload: { communityId: community.id, memberId: targetUserId },
          performedBy: actorId
        },
        trx
      );
    });

    return { success: true };
  }

  static async listChannels(communityId, userId) {
    const { community, membership } = await this.ensureCommunityMember(communityId, userId);
    const channels = await CommunityChannelModel.listByCommunity(community.id);
    if (!channels.length) {
      return [];
    }

    const memberships = await Promise.all(
      channels.map((channel) =>
        CommunityChannelMemberModel.ensureMembership(channel.id, userId, {
          role: MODERATOR_ROLES.has(membership.role) ? 'moderator' : 'member'
        })
      )
    );

    const latestMessages = await CommunityMessageModel.latestForChannels(channels.map((c) => c.id));
    const latestMap = latestMessages.reduce((acc, entry) => {
      acc.set(entry.channelId, entry.message);
      return acc;
    }, new Map());

    let memberCountsRaw = [];
    if (typeof db === 'function') {
      memberCountsRaw = await db('community_channel_members')
        .whereIn('channel_id', channels.map((channel) => channel.id))
        .select('channel_id as channelId')
        .count({ count: '*' })
        .groupBy('channel_id');
    }

    const memberCountMap = new Map(
      memberCountsRaw.map((entry) => [entry.channelId, Number(entry.count ?? 0)])
    );

    const unreadCounts = await Promise.all(
      channels.map((channel, index) =>
        CommunityMessageModel.countSince(channel.id, memberships[index].lastReadAt)
      )
    );

    const response = [];
    for (let index = 0; index < channels.length; index += 1) {
      const channel = serializeChannel(channels[index]);
      const channelMembership = memberships[index];
      const latestMessage = latestMap.get(channel.id) ?? null;
      const unreadCount = unreadCounts[index] ?? 0;

      response.push({
        channel,
        membership: channelMembership,
        latestMessage,
        unreadCount,
        memberCount: memberCountMap.get(channel.id) ?? 0
      });
    }

    return response;
  }

  static async listMessages(communityId, channelId, userId, filters = {}) {
    const { channel } = await this.ensureChannelAccess(communityId, channelId, userId);
    const requestedLimit = Number(filters.limit ?? CHAT_DEFAULT_PAGE_SIZE);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), CHAT_MAX_PAGE_SIZE)
      : CHAT_DEFAULT_PAGE_SIZE;
    const sanitizedFilters = { ...filters, limit };
    const messages = await CommunityMessageModel.listForChannel(
      communityId,
      channel.id,
      sanitizedFilters
    );
    const messageIds = messages.map((message) => message.id);
    const reactionSummary = await CommunityMessageReactionModel.listForMessages(messageIds);
    const userReactionSets = await CommunityMessageReactionModel.listUserReactions(
      messageIds,
      userId
    );

    return messages.map((message) => ({
      ...message,
      reactions: reactionSummary[message.id] ?? [],
      viewerReactions: Array.from(userReactionSets[message.id] ?? [])
    }));
  }

  static async postMessage(communityId, channelId, userId, payload) {
    const { channel } = await this.ensureChannelAccess(communityId, channelId, userId);
    return db.transaction(async (trx) => {
      const metadata = { ...payload.metadata };
      if (payload.messageType === 'live') {
        metadata.agoraChannel =
          metadata.agoraChannel ?? `community-${communityId}-channel-${channel.id}`;
        metadata.resourceId = metadata.resourceId ?? randomUUID();
      }

      let threadRootId = payload.threadRootId ?? null;
      const replyToMessageId = payload.replyToMessageId ?? null;
      if (replyToMessageId) {
        const parentMessage = await CommunityMessageModel.findById(replyToMessageId, trx);
        if (!parentMessage || parentMessage.channelId !== channel.id) {
          const error = new Error('Reply target not found in this channel');
          error.status = 404;
          throw error;
        }
        threadRootId = parentMessage.threadRootId ?? parentMessage.id;
      }

      const message = await CommunityMessageModel.create(
        {
          communityId,
          channelId: channel.id,
          authorId: userId,
          messageType: payload.messageType,
          body: payload.body,
          attachments: payload.attachments,
          metadata,
          threadRootId,
          replyToMessageId
        },
        trx
      );

      await CommunityChannelMemberModel.updateLastRead(
        channel.id,
        userId,
        { timestamp: new Date(), messageId: message.id },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_message',
          entityId: message.id,
          eventType: 'community.message.created',
          payload: {
            communityId,
            channelId: channel.id,
            authorId: userId,
            messageType: payload.messageType
          },
          performedBy: userId
        },
        trx
      );

      log.info({ messageId: message.id, channelId: channel.id, communityId }, 'community message posted');

      return message;
    });
  }

  static async acknowledgeRead(communityId, channelId, userId, { messageId, timestamp }) {
    await this.ensureChannelAccess(communityId, channelId, userId);
    const effectiveTimestamp = timestamp ? new Date(timestamp) : new Date();
    return CommunityChannelMemberModel.updateLastRead(
      channelId,
      userId,
      { timestamp: effectiveTimestamp, messageId: messageId ?? null }
    );
  }

  static async reactToMessage(communityId, channelId, userId, messageId, emoji) {
    await this.ensureChannelAccess(communityId, channelId, userId);
    const message = await CommunityMessageModel.findById(messageId);
    if (!message || message.channelId !== channelId) {
      const error = new Error('Message not found');
      error.status = 404;
      throw error;
    }

    await CommunityMessageReactionModel.addReaction({ messageId, userId, emoji });
    await DomainEventModel.record({
      entityType: 'community_message',
      entityId: messageId,
      eventType: 'community.message.reacted',
      payload: { emoji, channelId, communityId },
      performedBy: userId
    });

    const summary = await CommunityMessageReactionModel.listForMessages([messageId]);
    const userReactions = await CommunityMessageReactionModel.listUserReactions([messageId], userId);
    return {
      messageId,
      reactions: summary[messageId] ?? [],
      viewerReactions: Array.from(userReactions[messageId] ?? [])
    };
  }

  static async removeReaction(communityId, channelId, userId, messageId, emoji) {
    await this.ensureChannelAccess(communityId, channelId, userId);
    await CommunityMessageReactionModel.removeReaction({ messageId, userId, emoji });
    const summary = await CommunityMessageReactionModel.listForMessages([messageId]);
    const userReactions = await CommunityMessageReactionModel.listUserReactions([messageId], userId);
    return {
      messageId,
      reactions: summary[messageId] ?? [],
      viewerReactions: Array.from(userReactions[messageId] ?? [])
    };
  }

  static async moderateMessage(communityId, channelId, moderatorId, messageId, action) {
    const access = await this.ensureChannelAccess(communityId, channelId, moderatorId);
    if (!MODERATOR_ROLES.has(access.membership.role)) {
      const error = new Error('Only moderators can manage messages');
      error.status = 403;
      throw error;
    }

    const message = await CommunityMessageModel.findById(messageId);
    if (!message || message.channelId !== channelId) {
      const error = new Error('Message not found');
      error.status = 404;
      throw error;
    }

    return db.transaction(async (trx) => {
      let updatedMessage = message;
      if (action.action === 'delete') {
        updatedMessage = await CommunityMessageModel.markDeleted(messageId, trx);
      } else if (action.action === 'hide') {
        updatedMessage = await CommunityMessageModel.updateStatus(messageId, 'hidden', trx);
      } else if (action.action === 'restore') {
        updatedMessage = await CommunityMessageModel.updateStatus(messageId, 'visible', trx);
      }

      const moderation = await CommunityMessageModerationModel.record(
        {
          messageId,
          actorId: moderatorId,
          actionType: action.action,
          reason: action.reason,
          metadata: action.metadata
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_message',
          entityId: messageId,
          eventType: `community.message.${action.action}`,
          payload: { communityId, channelId },
          performedBy: moderatorId
        },
        trx
      );

      return { message: updatedMessage, moderation };
    });
  }

  static async listPresence(communityId) {
    const sessions = await UserPresenceSessionModel.listActiveForCommunity(communityId);
    return sessions;
  }

  static async updatePresence(userId, sessionId, payload = {}) {
    const requestedTtl = Number(payload.ttlMinutes ?? PRESENCE_DEFAULT_TTL);
    const ttlMinutes = Number.isFinite(requestedTtl)
      ? Math.min(Math.max(requestedTtl, 1), PRESENCE_MAX_TTL)
      : PRESENCE_DEFAULT_TTL;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const session = await UserPresenceSessionModel.upsert({
      userId,
      sessionId,
      client: payload.client,
      status: payload.status,
      lastSeenAt: new Date(),
      connectedAt: payload.connectedAt,
      expiresAt,
      metadata: payload.metadata
    });
    return session;
  }
}
