import Joi from 'joi';

import CommunityMemberAdminService from '../services/CommunityMemberAdminService.js';
import { success } from '../utils/httpResponse.js';

const listQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'pending', 'suspended').optional(),
  role: Joi.string().valid('owner', 'admin', 'moderator', 'member').optional(),
  search: Joi.string().max(120).allow('', null)
});

const createMemberSchema = Joi.object({
  userId: Joi.number().integer().positive(),
  email: Joi.string().email(),
  role: Joi.string().valid('owner', 'admin', 'moderator', 'member').default('member'),
  status: Joi.string().valid('active', 'pending', 'suspended').default('active'),
  title: Joi.string().max(120).allow('', null),
  location: Joi.string().max(120).allow('', null),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(40)), Joi.string().allow('', null))
    .optional(),
  notes: Joi.string().max(500).allow('', null)
})
  .xor('userId', 'email')
  .messages({ 'object.missing': 'Either userId or email must be provided' });

const updateMemberSchema = Joi.object({
  role: Joi.string().valid('owner', 'admin', 'moderator', 'member'),
  status: Joi.string().valid('active', 'pending', 'suspended'),
  title: Joi.string().max(120).allow('', null),
  location: Joi.string().max(120).allow('', null),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(40)), Joi.string().allow('', null))
    .optional(),
  notes: Joi.string().max(500).allow('', null)
})
  .min(1)
  .messages({ 'object.min': 'At least one field must be provided for update' });

const removeMemberSchema = Joi.object({
  reason: Joi.string().max(500).allow('', null)
}).optional();

export default class CommunityMemberAdminController {
  static async list(req, res, next) {
    try {
      const filters = await listQuerySchema.validateAsync(req.query ?? {}, { abortEarly: false, stripUnknown: true });
      const members = await CommunityMemberAdminService.listMembers(
        req.params.communityId,
        req.user.id,
        filters,
        { actorRole: req.user.role }
      );
      return success(res, { data: members, message: 'Community members fetched' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const payload = await createMemberSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const member = await CommunityMemberAdminService.createMember(req.params.communityId, req.user.id, payload, {
        actorRole: req.user.role
      });
      return success(res, { data: member, message: 'Member added to community', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const payload = await updateMemberSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const member = await CommunityMemberAdminService.updateMember(
        req.params.communityId,
        req.user.id,
        Number(req.params.userId),
        payload,
        { actorRole: req.user.role }
      );
      return success(res, { data: member, message: 'Community member updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      await removeMemberSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const member = await CommunityMemberAdminService.removeMember(
        req.params.communityId,
        req.user.id,
        Number(req.params.userId),
        { actorRole: req.user.role }
      );
      return success(res, { data: member, message: 'Community member removed' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }
}
