import Joi from 'joi';
import CommunityService from '../services/CommunityService.js';

const createSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  coverImageUrl: Joi.string().uri().allow('', null)
});

export default class CommunityController {
  static async listForUser(req, res, next) {
    try {
      const communities = await CommunityService.listForUser(req.user.id);
      res.json({ data: communities });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const payload = await createSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const community = await CommunityService.create(payload, req.user.id);
      res.status(201).json(community);
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      next(error);
    }
  }
}
