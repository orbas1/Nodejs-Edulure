import Joi from 'joi';

import SocialGraphService from '../services/SocialGraphService.js';
import { success } from '../utils/httpResponse.js';

const followPayloadSchema = Joi.object({
  source: Joi.string().max(80).default('manual'),
  reason: Joi.string().max(240).allow(null, '').optional(),
  metadata: Joi.object().default({})
});

const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(500).optional(),
  offset: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('pending', 'accepted', 'declined').optional(),
  search: Joi.string().max(120).optional()
});

const recommendationsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional()
});

const mutePayloadSchema = Joi.object({
  durationMinutes: Joi.number().integer().min(5).max(60 * 24 * 30).optional(),
  reason: Joi.string().max(240).allow('', null).optional(),
  metadata: Joi.object().default({})
});

const blockPayloadSchema = Joi.object({
  reason: Joi.string().max(240).allow('', null).optional(),
  expiresAt: Joi.date().optional(),
  metadata: Joi.object().default({})
});

const privacySchema = Joi.object({
  profileVisibility: Joi.string().valid('public', 'followers', 'private').required(),
  followApprovalRequired: Joi.boolean().required(),
  messagePermission: Joi.string().valid('anyone', 'followers', 'none').required(),
  shareActivity: Joi.boolean().required(),
  metadata: Joi.object().default({})
});

function handleValidationError(error, next) {
  if (error.isJoi) {
    error.status = 422;
    error.details = error.details.map((detail) => detail.message);
  }
  return next(error);
}

export default class SocialGraphController {
  static async follow(req, res, next) {
    try {
      const payload = await followPayloadSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await SocialGraphService.followUser(req.user.id, req.params.userId, payload);
      return success(res, {
        data: result,
        message: result.status === 'pending' ? 'Follow request sent' : 'User followed',
        status: result.status === 'pending' ? 202 : 200
      });
    } catch (error) {
      return handleValidationError(error, next);
    }
  }

  static async approveFollow(req, res, next) {
    try {
      const result = await SocialGraphService.approveFollow(
        req.params.userId,
        req.params.followerId,
        req.user.id
      );
      return success(res, {
        data: result,
        message: 'Follow request approved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async declineFollow(req, res, next) {
    try {
      const result = await SocialGraphService.declineFollow(
        req.params.userId,
        req.params.followerId,
        req.user.id
      );
      return success(res, {
        data: result,
        message: 'Follow request declined'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async removeFollower(req, res, next) {
    try {
      const result = await SocialGraphService.removeFollower(
        req.params.userId,
        req.params.followerId,
        req.user.id
      );
      return success(res, {
        data: result,
        message: 'Follower removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async unfollow(req, res, next) {
    try {
      const result = await SocialGraphService.unfollowUser(req.user.id, req.params.userId);
      return success(res, {
        data: result,
        message: 'Unfollowed user'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async listFollowers(req, res, next) {
    try {
      const query = await paginationQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await SocialGraphService.listFollowers(
        req.query.userId ? Number(req.query.userId) : req.params.userId ?? req.user.id,
        req.user.id,
        query
      );
      return success(res, {
        data: result.items,
        message: 'Followers retrieved',
        meta: {
          pagination: result.pagination,
          viewerContext: result.viewerContext
        }
      });
    } catch (error) {
      return handleValidationError(error, next);
    }
  }

  static async listFollowing(req, res, next) {
    try {
      const query = await paginationQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const subjectId = req.query.userId ? Number(req.query.userId) : req.params.userId ?? req.user.id;
      const result = await SocialGraphService.listFollowing(subjectId, req.user.id, query);
      return success(res, {
        data: result.items,
        message: 'Following list retrieved',
        meta: {
          pagination: result.pagination,
          viewerContext: result.viewerContext
        }
      });
    } catch (error) {
      return handleValidationError(error, next);
    }
  }

  static async listRecommendations(req, res, next) {
    try {
      const query = await recommendationsQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await SocialGraphService.listRecommendations(req.user.id, query);
      return success(res, {
        data: result,
        message: 'Follow recommendations generated'
      });
    } catch (error) {
      return handleValidationError(error, next);
    }
  }

  static async getPrivacy(req, res, next) {
    try {
      const result = await SocialGraphService.getPrivacySettings(req.params.userId ?? req.user.id, req.user.id);
      return success(res, {
        data: result,
        message: 'Privacy settings retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updatePrivacy(req, res, next) {
    try {
      const payload = await privacySchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await SocialGraphService.updatePrivacySettings(
        req.params.userId ?? req.user.id,
        req.user.id,
        payload
      );
      return success(res, {
        data: result,
        message: 'Privacy settings updated'
      });
    } catch (error) {
      return handleValidationError(error, next);
    }
  }

  static async muteUser(req, res, next) {
    try {
      const payload = await mutePayloadSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await SocialGraphService.muteUser(req.user.id, req.params.userId, payload);
      return success(res, {
        data: result,
        message: 'Mute applied'
      });
    } catch (error) {
      return handleValidationError(error, next);
    }
  }

  static async unmuteUser(req, res, next) {
    try {
      await SocialGraphService.unmuteUser(req.user.id, req.params.userId);
      return success(res, {
        data: null,
        message: 'Mute removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async blockUser(req, res, next) {
    try {
      const payload = await blockPayloadSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await SocialGraphService.blockUser(req.user.id, req.params.userId, payload);
      return success(res, {
        data: result,
        message: 'User blocked',
        status: 201
      });
    } catch (error) {
      return handleValidationError(error, next);
    }
  }

  static async unblockUser(req, res, next) {
    try {
      await SocialGraphService.unblockUser(req.user.id, req.params.userId);
      return success(res, {
        data: null,
        message: 'User unblocked'
      });
    } catch (error) {
      return next(error);
    }
  }
}
