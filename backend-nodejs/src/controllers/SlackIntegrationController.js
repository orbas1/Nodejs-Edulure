import Joi from 'joi';

import logger from '../config/logger.js';
import { success } from '../utils/httpResponse.js';

const integrationLogger = logger.child({ module: 'slack-integration-controller' });

const slackEventSchema = Joi.object({
  eventKey: Joi.string().max(120).required(),
  message: Joi.string().max(2000).required(),
  channel: Joi.string().max(160).optional(),
  metadata: Joi.object().unknown(true).default({})
});

export default class SlackIntegrationController {
  static async dispatchEvent(req, res, next) {
    try {
      const payload = await slackEventSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      integrationLogger.info(
        {
          userId: req.user?.id ?? null,
          eventKey: payload.eventKey,
          channel: payload.channel ?? payload.metadata?.channel ?? null
        },
        'Received Slack integration event'
      );

      return success(res, {
        data: {
          eventKey: payload.eventKey,
          dispatchedAt: new Date().toISOString()
        },
        message: 'Slack event accepted',
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

