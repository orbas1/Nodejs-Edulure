import slugify from 'slugify';
import CommunityModel from '../models/CommunityModel.js';

export default class CommunityService {
  static async listForUser(userId) {
    return CommunityModel.listByUser(userId);
  }

  static async create(payload, ownerId) {
    const data = {
      name: payload.name,
      slug: slugify(payload.name, { lower: true }),
      description: payload.description,
      coverImageUrl: payload.coverImageUrl,
      ownerId
    };
    return CommunityModel.create(data);
  }
}
