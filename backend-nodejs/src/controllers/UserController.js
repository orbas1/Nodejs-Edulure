import Joi from 'joi';

import UserService from '../services/UserService.js';
import { paginated, success } from '../utils/httpResponse.js';

const listQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

const socialLinkSchema = Joi.object({
  label: Joi.string().max(120).allow(null, ''),
  url: Joi.string().uri({ allowRelative: false }).max(500).required(),
  handle: Joi.string().max(160).allow(null, '')
});

const profileUpdateSchema = Joi.object({
  displayName: Joi.string().max(200).allow(null, ''),
  tagline: Joi.string().max(240).allow(null, ''),
  location: Joi.string().max(160).allow(null, ''),
  bio: Joi.string().max(4000).allow(null, ''),
  avatarUrl: Joi.string().uri({ allowRelative: false }).max(500).allow(null, ''),
  bannerUrl: Joi.string().uri({ allowRelative: false }).max(500).allow(null, ''),
  socialLinks: Joi.array().items(socialLinkSchema).max(12),
  metadata: Joi.object().optional()
})
  .optional()
  .allow(null);

const addressSchema = Joi.alternatives()
  .try(
    Joi.object({
      line1: Joi.string().max(120).allow(null, ''),
      line2: Joi.string().max(120).allow(null, ''),
      city: Joi.string().max(120).allow(null, ''),
      region: Joi.string().max(120).allow(null, ''),
      postalCode: Joi.string().max(32).allow(null, ''),
      country: Joi.string().max(120).allow(null, ''),
      formatted: Joi.string().max(255).allow(null, '')
    }),
    Joi.string().max(255).allow(null, '')
  )
  .optional();

const updatePayloadSchema = Joi.object({
  firstName: Joi.string().max(120).optional(),
  lastName: Joi.string().max(120).allow(null, '').optional(),
  age: Joi.number().integer().min(13).max(120).allow(null).optional(),
  address: addressSchema,
  profile: profileUpdateSchema
})
  .min(1)
  .messages({
    'object.min': 'Provide at least one profile field to update'
  });

const allowedRoles = ['user', 'instructor', 'admin', 'moderator', 'staff', 'service'];

const twoFactorSecretSchema = Joi.string()
  .pattern(/^[A-Z2-7]+=*$/i)
  .min(16)
  .allow(null, '')
  .messages({
    'string.pattern.base': 'Two-factor secret must be base32 encoded',
    'string.min': 'Two-factor secret must be at least 16 characters long'
  });

const createUserSchema = Joi.object({
  firstName: Joi.string().max(120).required(),
  lastName: Joi.string().max(120).allow(null, '').optional(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).allow(null, '').optional(),
  role: Joi.string()
    .valid(...allowedRoles)
    .default('user'),
  age: Joi.number().integer().min(13).max(120).allow(null).optional(),
  address: addressSchema,
  twoFactorEnabled: Joi.boolean().optional(),
  profile: profileUpdateSchema,
  twoFactorSecret: twoFactorSecretSchema.optional(),
  twoFactorEnrolledAt: Joi.date().iso().allow(null).optional(),
  twoFactorLastVerifiedAt: Joi.date().iso().allow(null).optional()
});

const adminUpdateSchema = Joi.object({
  firstName: Joi.string().max(120).optional(),
  lastName: Joi.string().max(120).allow(null, '').optional(),
  email: Joi.string().email({ tlds: { allow: false } }).optional(),
  password: Joi.string().min(8).optional(),
  role: Joi.string()
    .valid(...allowedRoles)
    .optional(),
  age: Joi.number().integer().min(13).max(120).allow(null).optional(),
  address: addressSchema.allow(null),
  profile: profileUpdateSchema,
  twoFactorEnabled: Joi.boolean().optional(),
  twoFactorSecret: twoFactorSecretSchema.optional(),
  twoFactorEnrolledAt: Joi.date().iso().allow(null).optional(),
  twoFactorLastVerifiedAt: Joi.date().iso().allow(null).optional()
})
  .min(1)
  .messages({
    'object.min': 'Provide at least one field to update'
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

  static async updateMe(req, res, next) {
    try {
      const payload = await updatePayloadSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const userId = req.user.sub ?? req.user.id;
      const user = await UserService.updateById(userId, payload);
      return success(res, {
        data: user,
        message: 'Profile updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
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

  static async create(req, res, next) {
    try {
      const payload = await createUserSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await UserService.create(payload, req.user);
      return success(res, {
        data: result,
        message: 'User created',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const userId = Number.parseInt(req.params.userId, 10);
      if (!Number.isInteger(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user identifier' });
      }

      const payload = await adminUpdateSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const user = await UserService.update(userId, payload, req.user);
      return success(res, {
        data: user,
        message: 'User updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async removeUser(req, res, next) {
    try {
      const userId = Number.parseInt(req.params.userId, 10);
      if (!Number.isInteger(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user identifier' });
      }

      await UserService.remove(userId, req.user);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}
