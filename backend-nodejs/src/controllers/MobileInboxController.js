import Joi from 'joi';

import MobileInboxService from '../services/MobileInboxService.js';
import { success } from '../utils/httpResponse.js';

const messageSchema = Joi.object({
  body: Joi.string().max(4000).allow('').required(),
  attachments: Joi.array()
    .items(
      Joi.object({
        label: Joi.string().max(160).optional(),
        url: Joi.string().uri().required(),
        type: Joi.string().max(60).optional()
      })
    )
    .default([])
});

export default class MobileInboxController {
  static async listThreads(req, res, next) {
    try {
      const threads = await MobileInboxService.listThreads(req.user.id, {
        id: req.user.id,
        name: req.user.name,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email
      });
      return success(res, {
        data: threads,
        message: 'Inbox threads loaded'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createMessage(req, res, next) {
    try {
      const paramsSchema = Joi.object({
        threadId: Joi.number().integer().min(1).required()
      });
      const params = await paramsSchema.validateAsync(req.params, {
        abortEarly: false,
        stripUnknown: true
      });

      const payload = await messageSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const message = await MobileInboxService.appendMessage(req.user.id, params.threadId, {
        body: payload.body,
        attachments: payload.attachments,
        currentUser: {
          id: req.user.id,
          name: req.user.name,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email
        },
        supportName: 'Support Team'
      });

      return success(res, {
        data: message,
        message: 'Message queued for delivery',
        status: 202
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

