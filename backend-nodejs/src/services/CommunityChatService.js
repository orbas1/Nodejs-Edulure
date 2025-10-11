import { randomUUID } from 'crypto';

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
import { env } from '../config/env.js';
import logger from '../config/logger.js';

const MODERATOR_ROLES = new Set(['owner', 'admin', 'moderator']);

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
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

    const response = [];
    for (let index = 0; index < channels.length; index += 1) {
      const channel = serializeChannel(channels[index]);
      const channelMembership = memberships[index];
      const latestMessage = latestMap.get(channel.id) ?? null;
      // eslint-disable-next-line no-await-in-loop
      const unreadCount = await CommunityMessageModel.countSince(
        channel.id,
        channelMembership.lastReadAt
      );

      response.push({
        channel,
        membership: channelMembership,
        latestMessage,
        unreadCount
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
      let replyToMessageId = payload.replyToMessageId ?? null;
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
