import UserService from '../services/UserService.js';

export default class UserController {
  static async me(req, res, next) {
    try {
      const user = await UserService.getById(req.user.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async list(req, res, next) {
    try {
      const limit = Number(req.query.limit ?? 20);
      const offset = Number(req.query.offset ?? 0);
      const users = await UserService.list(limit, offset);
      res.json({ data: users, pagination: { limit, offset } });
    } catch (error) {
      next(error);
    }
  }
}
