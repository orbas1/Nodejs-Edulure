import slugify from 'slugify';

import db from '../config/database.js';
import CommunityModel from '../models/CommunityModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

export default class CommunityService {
  static async listForUser(userId) {
    const communities = await CommunityModel.listByUser(userId);
    return communities.map((community) => this.serializeCommunity(community));
  }

  static async create(payload, ownerId) {
    return db.transaction(async (trx) => {
      const slug = slugify(payload.name, { lower: true, strict: true });
      const existing = await CommunityModel.findBySlug(slug, trx);
      if (existing) {
        const error = new Error('Community with the same slug already exists');
        error.status = 409;
        throw error;
      }

      const community = await CommunityModel.create(
        {
          name: payload.name,
          slug,
          description: payload.description,
          coverImageUrl: payload.coverImageUrl,
          ownerId,
          visibility: payload.visibility,
          metadata: payload.metadata
        },
        trx
      );

      await CommunityMemberModel.create(
        {
          communityId: community.id,
          userId: ownerId,
          role: 'owner',
          status: 'active'
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community',
          entityId: community.id,
          eventType: 'community.created',
          payload: { ownerId, name: payload.name },
          performedBy: ownerId
        },
        trx
      );

      return this.serializeCommunity({ ...community, memberRole: 'owner', memberStatus: 'active' });
    });
  }

  static serializeCommunity(community) {
    return {
      id: community.id,
      name: community.name,
      slug: community.slug,
      description: community.description,
      coverImageUrl: community.coverImageUrl,
      visibility: community.visibility,
      ownerId: community.ownerId,
      membership: community.memberRole
        ? {
            role: community.memberRole,
            status: community.memberStatus
          }
        : undefined,
      createdAt: community.createdAt,
      updatedAt: community.updatedAt
    };
  }
}
