import Joi from 'joi';

import CommunityChatService from '../services/CommunityChatService.js';
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
      const message = await CommunityChatService.postMessage(
        req.params.communityId,
        req.params.channelId,
        req.user.id,
        payload
      );
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
      const summary = await CommunityChatService.reactToMessage(
        req.params.communityId,
        req.params.channelId,
        req.user.id,
        req.params.messageId,
        payload.emoji
      );
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
      const summary = await CommunityChatService.removeReaction(
        req.params.communityId,
        req.params.channelId,
        req.user.id,
        req.params.messageId,
        payload.emoji
      );
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
      const session = await CommunityChatService.updatePresence(
        req.user.id,
        req.user.sessionId,
        payload
      );
      return success(res, {
        data: session,
        message: 'Presence updated'
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
