import UserModel from '../models/UserModel.js';

export default class UserService {
  static async list(limit, offset) {
    return UserModel.list({ limit, offset });
  }

  static async getById(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return user;
  }
}
