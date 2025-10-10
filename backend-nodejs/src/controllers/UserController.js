import Joi from 'joi';

import UserService from '../services/UserService.js';
import { paginated, success } from '../utils/httpResponse.js';

const listQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

export default class UserController {
  static async me(req, res, next) {
    try {
      const user = await UserService.getById(req.user.sub ?? req.user.id);
      return success(res, {
        data: user,
        message: 'Profile retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async list(req, res, next) {
    try {
      const { limit, offset } = await listQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const users = await UserService.list(limit, offset);
      return paginated(res, {
        data: users,
        pagination: { limit, offset },
        message: 'Users retrieved'
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
