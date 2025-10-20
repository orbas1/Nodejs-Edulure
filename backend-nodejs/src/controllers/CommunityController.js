import Joi from 'joi';

import CommunityService from '../services/CommunityService.js';
import { paginated, success } from '../utils/httpResponse.js';

const createSchema = Joi.object({
  name: Joi.string().trim().min(3).max(150).required(),
  description: Joi.string().max(2000).allow('', null),
  coverImageUrl: Joi.string().uri().allow('', null),
  visibility: Joi.string().valid('public', 'private').default('public'),
  metadata: Joi.object().default({})
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(3).max(150),
  slug: Joi.string().trim().max(150).allow('', null),
  description: Joi.string().max(2000).allow('', null),
  coverImageUrl: Joi.string().uri().allow('', null),
  visibility: Joi.string().valid('public', 'private'),
  metadata: Joi.object()
})
  .min(1)
  .messages({ 'object.min': 'At least one field must be provided for update' });

const feedQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(10),
  channelId: Joi.number().integer().min(1),
  postType: Joi.string().valid('update', 'event', 'resource', 'classroom', 'poll'),
  visibility: Joi.string().valid('public', 'members', 'admins'),
  query: Joi.string().trim().max(200).allow(null).empty('')
});

const createPostSchema = Joi.object({
  channelId: Joi.number().integer().min(1),
  postType: Joi.string().valid('update', 'event', 'resource', 'classroom', 'poll').default('update'),
  title: Joi.string().max(200).allow(null, ''),
  body: Joi.string().min(10).max(8000).required(),
  tags: Joi.array().items(Joi.string().trim().max(40)).max(12).default([]),
  visibility: Joi.string().valid('public', 'members', 'admins').default('members'),
  status: Joi.string().valid('draft', 'scheduled', 'published').default('published'),
  scheduledAt: Joi.date().optional(),
  publishedAt: Joi.date().optional(),
  metadata: Joi.object().default({})
});

const updatePostSchema = Joi.object({
  channelId: Joi.number().integer().min(1),
  title: Joi.string().max(200).allow(null, ''),
  body: Joi.string().min(10).max(8000),
  tags: Joi.array().items(Joi.string().trim().max(40)).max(12),
  visibility: Joi.string().valid('public', 'members', 'admins'),
  status: Joi.string().valid('draft', 'scheduled', 'published', 'archived'),
  scheduledAt: Joi.date().optional().allow(null),
  publishedAt: Joi.date().optional().allow(null),
  metadata: Joi.object()
})
  .min(1)
  .messages({ 'object.min': 'At least one field must be provided for update' });

const listResourcesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
  offset: Joi.number().integer().min(0).default(0),
  resourceType: Joi.string().valid('content_asset', 'external_link', 'document', 'classroom_session')
});

const createResourceSchema = Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().max(2000).allow('', null),
  resourceType: Joi.string().valid('content_asset', 'external_link', 'document', 'classroom_session').default('content_asset'),
  assetId: Joi.when('resourceType', {
    is: 'content_asset',
    then: Joi.number().integer().min(1).required(),
    otherwise: Joi.number().integer().min(1).optional()
  }),
  linkUrl: Joi.when('resourceType', {
    is: Joi.valid('external_link', 'document', 'classroom_session'),
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().allow(null)
  }),
  classroomReference: Joi.string().max(120).allow(null),
  tags: Joi.array().items(Joi.string().trim().max(40)).max(15).default([]),
  visibility: Joi.string().valid('members', 'admins').default('members'),
  status: Joi.string().valid('draft', 'published').default('published'),
  publishedAt: Joi.date().optional(),
  metadata: Joi.object().default({})
});

const updateResourceSchema = Joi.object({
  title: Joi.string().max(200),
  description: Joi.string().max(2000).allow('', null),
  resourceType: Joi.string().valid('content_asset', 'external_link', 'document', 'classroom_session'),
  assetId: Joi.number().integer().min(1),
  linkUrl: Joi.string().uri().allow(null, ''),
  classroomReference: Joi.string().max(120).allow(null, ''),
  tags: Joi.array().items(Joi.string().trim().max(40)).max(15),
  visibility: Joi.string().valid('members', 'admins'),
  status: Joi.string().valid('draft', 'published', 'archived'),
  publishedAt: Joi.date().allow(null),
  metadata: Joi.object(),
  clearAsset: Joi.boolean().optional(),
  clearLink: Joi.boolean().optional()
})
  .min(1)
  .messages({ 'object.min': 'At least one field must be provided for update' });

const moderatePostSchema = Joi.object({
  action: Joi.string().valid('suppress', 'restore').required(),
  reason: Joi.string().max(500).allow('', null)
});

const removePostSchema = Joi.object({
  reason: Joi.string().max(500).allow('', null)
});

const sponsorshipUpdateSchema = Joi.object({
  blockedPlacementIds: Joi.array().items(Joi.string().max(120)).default([])
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

  static async update(req, res, next) {
    try {
      const payload = await updateSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const community = await CommunityService.updateCommunity(req.params.communityId, req.user.id, payload, {
        actorRole: req.user.role
      });
      return success(res, { data: community, message: 'Community updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async getDetail(req, res, next) {
    try {
      const community = await CommunityService.getCommunityDetail(req.params.communityId, req.user.id);
      return success(res, {
        data: community,
        message: 'Community detail fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async listFeed(req, res, next) {
    try {
      const query = await feedQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const result = await CommunityService.listFeed(req.params.communityId, req.user.id, query, {
        actorRole: req.user.role
      });
      return paginated(res, {
        data: result.items,
        pagination: result.pagination,
        message: 'Community feed fetched',
        meta: { ads: result.ads }
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async listUserFeed(req, res, next) {
    try {
      const query = await feedQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const result = await CommunityService.listFeedForUser(req.user.id, query, {
        actorRole: req.user.role
      });
      return paginated(res, {
        data: result.items,
        pagination: result.pagination,
        message: 'Personalised feed fetched',
        meta: { ads: result.ads }
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async createPost(req, res, next) {
    try {
      const payload = await createPostSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const post = await CommunityService.createPost(req.params.communityId, req.user.id, payload);
      return success(res, {
        data: post,
        message: 'Post created',
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

  static async updatePost(req, res, next) {
    try {
      const payload = await updatePostSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const post = await CommunityService.updatePost(
        req.params.communityId,
        Number(req.params.postId),
        req.user.id,
        payload,
        { actorRole: req.user.role }
      );
      return success(res, { data: post, message: 'Post updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async join(req, res, next) {
    try {
      const community = await CommunityService.joinCommunity(req.params.communityId, req.user.id);
      return success(res, {
        data: community,
        message: 'Joined community'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async leave(req, res, next) {
    try {
      const summary = await CommunityService.leaveCommunity(req.params.communityId, req.user.id);
      return success(res, {
        data: summary,
        message: 'Left community'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async moderatePost(req, res, next) {
    try {
      const payload = await moderatePostSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const post = await CommunityService.moderatePost(
        req.params.communityId,
        req.params.postId,
        req.user.id,
        payload,
        { actorRole: req.user.role }
      );
      return success(res, {
        data: post,
        message: `Post ${payload.action === 'restore' ? 'restored' : 'suppressed'}`
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async removePost(req, res, next) {
    try {
      const payload = await removePostSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const post = await CommunityService.removePost(
        req.params.communityId,
        req.params.postId,
        req.user.id,
        payload,
        { actorRole: req.user.role }
      );
      return success(res, {
        data: post,
        message: 'Post removed'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async listSponsorshipPlacements(req, res, next) {
    try {
      const sponsorships = await CommunityService.listSponsorshipPlacements(
        req.params.communityId,
        req.user.id,
        { actorRole: req.user.role }
      );
      return success(res, {
        data: sponsorships,
        message: 'Sponsorship placements fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateSponsorshipPlacements(req, res, next) {
    try {
      const payload = await sponsorshipUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const sponsorships = await CommunityService.updateSponsorshipPlacements(
        req.params.communityId,
        req.user.id,
        payload,
        { actorRole: req.user.role }
      );
      return success(res, {
        data: sponsorships,
        message: 'Sponsorship placements updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async listResources(req, res, next) {
    try {
      const query = await listResourcesQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const resources = await CommunityService.listResources(req.params.communityId, req.user.id, query);
      return success(res, {
        data: resources.items,
        meta: { pagination: { total: resources.total, limit: query.limit, offset: query.offset } },
        message: 'Community resources fetched'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async createResource(req, res, next) {
    try {
      const payload = await createResourceSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const resource = await CommunityService.createResource(req.params.communityId, req.user.id, payload);
      return success(res, {
        data: resource,
        message: 'Resource published',
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

  static async updateResource(req, res, next) {
    try {
      const payload = await updateResourceSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const resourcePayload = {
        ...payload,
        assetId: payload.clearAsset ? null : payload.assetId,
        linkUrl: payload.clearLink ? null : payload.linkUrl
      };
      delete resourcePayload.clearAsset;
      delete resourcePayload.clearLink;

      const resource = await CommunityService.updateResource(
        req.params.communityId,
        req.params.resourceId,
        req.user.id,
        resourcePayload
      );
      return success(res, {
        data: resource,
        message: 'Resource updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async deleteResource(req, res, next) {
    try {
      const result = await CommunityService.deleteResource(
        req.params.communityId,
        req.params.resourceId,
        req.user.id
      );
      return success(res, {
        data: result,
        message: 'Resource removed'
      });
    } catch (error) {
      return next(error);
    }
  }
}
