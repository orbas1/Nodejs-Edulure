import Joi from 'joi';

import CommunityChatService from '../services/CommunityChatService.js';
import realtimeService from '../services/RealtimeService.js';
import { success } from '../utils/httpResponse.js';
import { env } from '../config/env.js';

const listMessagesQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(env.chat.pagination.maxPageSize)
    .default(env.chat.pagination.defaultPageSize),
  before: Joi.date().optional(),
  after: Joi.date().optional(),
  threadRootId: Joi.number().integer().min(1).optional(),
  includeHidden: Joi.boolean().default(false)
});

const postMessageSchema = Joi.object({
  messageType: Joi.string().valid('text', 'system', 'event', 'file', 'live').default('text'),
  body: Joi.string().trim().min(1).max(5000).required(),
  attachments: Joi.array().items(Joi.object()).default([]),
  metadata: Joi.object().default({}),
  replyToMessageId: Joi.number().integer().min(1).optional(),
  threadRootId: Joi.number().integer().min(1).optional()
});

const acknowledgeSchema = Joi.object({
  messageId: Joi.number().integer().min(1).optional(),
  timestamp: Joi.date().optional()
});

const reactionSchema = Joi.object({
  emoji: Joi.string().trim().min(1).max(40).required()
});

const moderationSchema = Joi.object({
  action: Joi.string().valid('delete', 'hide', 'restore').required(),
  reason: Joi.string().max(500).allow('', null),
  metadata: Joi.object().default({})
});

const presenceSchema = Joi.object({
  status: Joi.string().valid('online', 'away', 'offline').default('online'),
  client: Joi.string().valid('web', 'mobile', 'provider', 'admin').default('web'),
  ttlMinutes: Joi.number()
    .integer()
    .min(1)
    .max(env.chat.presence.maxTtlMinutes)
    .default(env.chat.presence.defaultTtlMinutes),
  metadata: Joi.object().default({}),
  connectedAt: Joi.date().optional()
});

const channelCreateSchema = Joi.object({
  name: Joi.string().trim().min(3).max(120).required(),
  slug: Joi.string().trim().max(150).optional(),
  channelType: Joi.string()
    .valid('general', 'classroom', 'resources', 'announcements', 'events')
    .default('general'),
  description: Joi.string().max(500).allow('', null),
  isDefault: Joi.boolean().default(false),
  metadata: Joi.object().default({})
});

const channelUpdateSchema = channelCreateSchema.fork(['name', 'slug'], (schema) => schema.optional());

const channelMemberSchema = Joi.object({
  userId: Joi.number().integer().min(1).required(),
  role: Joi.string().valid('member', 'moderator').optional(),
  notificationsEnabled: Joi.boolean().optional(),
  muteUntil: Joi.date().optional(),
  metadata: Joi.object().default({})
});

export default class CommunityChatController {
  static async listChannels(req, res, next) {
    try {
      const channels = await CommunityChatService.listChannels(req.params.communityId, req.user.id);
      return success(res, {
        data: channels,
        message: 'Chat channels fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createChannel(req, res, next) {
    try {
      const payload = await channelCreateSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const channel = await CommunityChatService.createChannel(req.params.communityId, req.user.id, payload);
      return success(res, {
        data: channel,
        message: 'Channel created',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateChannel(req, res, next) {
    try {
      const payload = await channelUpdateSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const channel = await CommunityChatService.updateChannel(
        req.params.communityId,
        req.params.channelId,
        req.user.id,
        payload
      );
      return success(res, {
        data: channel,
        message: 'Channel updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deleteChannel(req, res, next) {
    try {
      const result = await CommunityChatService.deleteChannel(
        req.params.communityId,
        req.params.channelId,
        req.user.id
      );
      return success(res, {
        data: result,
        message: 'Channel removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async listChannelMembers(req, res, next) {
    try {
      const members = await CommunityChatService.listChannelMembers(
        req.params.communityId,
        req.params.channelId,
        req.user.id
      );
      return success(res, {
        data: members,
        message: 'Channel members fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async upsertChannelMember(req, res, next) {
    try {
      const payload = await channelMemberSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const membership = await CommunityChatService.upsertChannelMember(
        req.params.communityId,
        req.params.channelId,
        req.user.id,
        payload
      );
      return success(res, {
        data: membership,
        message: 'Channel member updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async removeChannelMember(req, res, next) {
    try {
      const result = await CommunityChatService.removeChannelMember(
        req.params.communityId,
        req.params.channelId,
        req.user.id,
        req.params.userId
      );
      return success(res, {
        data: result,
        message: 'Channel member removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async listMessages(req, res, next) {
    try {
      const query = await listMessagesQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const messages = await CommunityChatService.listMessages(
        req.params.communityId,
        req.params.channelId,
        req.user.id,
        query
      );
      return success(res, {
        data: messages,
        message: 'Channel messages fetched',
        meta: {
          pagination: {
            limit: query.limit,
            before: query.before ?? null,
            after: query.after ?? null,
            count: messages.length
          }
        }
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async postMessage(req, res, next) {
    try {
      const payload = await postMessageSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const { communityId, channelId } = req.params;
      const message = await CommunityChatService.postMessage(
        communityId,
        channelId,
        req.user.id,
        payload
      );
      realtimeService.broadcastCommunityMessage(communityId, channelId, message, {
        actorId: req.user.id
      });
      return success(res, {
        data: message,
        message: 'Message posted',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async acknowledgeRead(req, res, next) {
    try {
      const payload = await acknowledgeSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const membership = await CommunityChatService.acknowledgeRead(
        req.params.communityId,
        req.params.channelId,
        req.user.id,
        payload
      );
      return success(res, {
        data: membership,
        message: 'Channel marked as read'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async addReaction(req, res, next) {
    try {
      const payload = await reactionSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const { communityId, channelId } = req.params;
      const summary = await CommunityChatService.reactToMessage(
        communityId,
        channelId,
        req.user.id,
        req.params.messageId,
        payload.emoji
      );
      realtimeService.broadcastCommunityReaction(communityId, channelId, {
        ...summary,
        emoji: payload.emoji,
        actorId: req.user.id
      });
      return success(res, {
        data: summary,
        message: 'Reaction recorded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async removeReaction(req, res, next) {
    try {
      const payload = await reactionSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const { communityId, channelId } = req.params;
      const summary = await CommunityChatService.removeReaction(
        communityId,
        channelId,
        req.user.id,
        req.params.messageId,
        payload.emoji
      );
      realtimeService.broadcastCommunityReaction(communityId, channelId, {
        ...summary,
        emoji: payload.emoji,
        actorId: req.user.id,
        removed: true
      });
      return success(res, {
        data: summary,
        message: 'Reaction removed'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async moderateMessage(req, res, next) {
    try {
      const payload = await moderationSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await CommunityChatService.moderateMessage(
        req.params.communityId,
        req.params.channelId,
        req.user.id,
        req.params.messageId,
        payload
      );
      realtimeService.broadcastCommunityMessage(
        req.params.communityId,
        req.params.channelId,
        result.message,
        {
          actorId: req.user.id,
          moderation: {
            action: payload.action,
            reason: payload.reason ?? null,
            metadata: payload.metadata ?? {}
          }
        }
      );
      return success(res, {
        data: result,
        message: 'Message moderation applied'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async listPresence(req, res, next) {
    try {
      const sessions = await CommunityChatService.listPresence(req.params.communityId);
      return success(res, {
        data: sessions,
        message: 'Community presence fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updatePresence(req, res, next) {
    try {
      const payload = await presenceSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const communityId = Number(req.params.communityId);
      await CommunityChatService.ensureCommunityMember(communityId, req.user.id);
      const presencePayload = {
        ...payload,
        metadata: {
          ...(payload.metadata ?? {}),
          communityId
        }
      };
      const session = await CommunityChatService.updatePresence(
        req.user.id,
        req.user.sessionId,
        presencePayload
      );
      const presence = await CommunityChatService.listPresence(communityId);
      await realtimeService.broadcastCommunityPresence(communityId, presence);
      return success(res, {
        data: session,
        message: 'Presence updated',
        meta: {
          communityId,
          presenceCount: presence.length
        }
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }
}
