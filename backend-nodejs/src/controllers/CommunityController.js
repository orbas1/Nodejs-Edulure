import Joi from 'joi';

import CommunityService from '../services/CommunityService.js';
import { success } from '../utils/httpResponse.js';

const createSchema = Joi.object({
  name: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().max(2000).allow('', null),
  coverImageUrl: Joi.string().uri().allow('', null),
  visibility: Joi.string().valid('public', 'private').default('public'),
  metadata: Joi.object().default({})
});

export default class CommunityController {
  static async listForUser(req, res, next) {
    try {
      const communities = await CommunityService.listForUser(req.user.id);
      return success(res, {
        data: communities,
        message: 'Communities fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const payload = await createSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const community = await CommunityService.create(payload, req.user.id);
      return success(res, {
        data: community,
        message: 'Community created',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }
}
