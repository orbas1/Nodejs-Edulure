import Joi from 'joi';

import DirectMessageService from '../services/DirectMessageService.js';
import { success } from '../utils/httpResponse.js';
import { env } from '../config/env.js';

const listThreadsQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(env.directMessages.threads.maxPageSize)
    .default(env.directMessages.threads.defaultPageSize),
  offset: Joi.number().integer().min(0).default(0)
});

const createThreadSchema = Joi.object({
  participantIds: Joi.array().items(Joi.number().integer().min(1)).required(),
  subject: Joi.string().max(240).allow('', null),
  forceNew: Joi.boolean().default(false),
  initialMessage: Joi.object({
    messageType: Joi.string().valid('text', 'system', 'file').default('text'),
    body: Joi.string().trim().min(1).max(5000).required(),
    attachments: Joi.array().items(Joi.object()).default([]),
    metadata: Joi.object().default({})
  }).optional()
});

const listMessagesQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(env.directMessages.messages.maxPageSize)
    .default(env.directMessages.messages.defaultPageSize),
  before: Joi.date().optional(),
  after: Joi.date().optional()
});

const sendMessageSchema = Joi.object({
  messageType: Joi.string().valid('text', 'system', 'file').default('text'),
  body: Joi.string().trim().min(1).max(5000).required(),
  attachments: Joi.array().items(Joi.object()).default([]),
  metadata: Joi.object().default({})
});

const markReadSchema = Joi.object({
  messageId: Joi.number().integer().min(1).optional(),
  timestamp: Joi.date().optional()
});

export default class DirectMessageController {
  static async listThreads(req, res, next) {
    try {
      const query = await listThreadsQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const { threads, limit, offset } = await DirectMessageService.listThreads(req.user.id, query);
      return success(res, {
        data: threads,
        message: 'Threads fetched',
        meta: {
          pagination: {
            limit,
            offset,
            count: threads.length
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

  static async createThread(req, res, next) {
    try {
      const payload = await createThreadSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await DirectMessageService.createThread(req.user.id, payload);
      return success(res, {
        data: result,
        message: 'Thread created',
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

  static async listMessages(req, res, next) {
    try {
      const query = await listMessagesQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const { messages, limit } = await DirectMessageService.listMessages(
        req.params.threadId,
        req.user.id,
        query
      );
      return success(res, {
        data: messages,
        message: 'Thread messages fetched',
        meta: {
          pagination: {
            limit,
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

  static async sendMessage(req, res, next) {
    try {
      const payload = await sendMessageSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const message = await DirectMessageService.sendMessage(
        req.params.threadId,
        req.user.id,
        payload
      );
      return success(res, {
        data: message,
        message: 'Message sent',
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

  static async markRead(req, res, next) {
    try {
      const payload = await markReadSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const response = await DirectMessageService.markRead(req.params.threadId, req.user.id, payload);
      return success(res, {
        data: response,
        message: 'Thread marked as read'
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
