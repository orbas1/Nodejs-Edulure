import Joi from 'joi';

import NotificationPreferenceService from '../services/NotificationPreferenceService.js';
import { success } from '../utils/httpResponse.js';

const preferenceSchema = Joi.object({
  channels: Joi.object().unknown(true).default({}),
  categories: Joi.object().unknown(true).default({}),
  slack: Joi.object({
    channel: Joi.string().max(160).allow(null, ''),
    workspace: Joi.string().max(160).allow(null, '')
  })
    .unknown(true)
    .default({}),
  metadata: Joi.object().unknown(true).default({})
});

const deviceSchema = Joi.object({
  token: Joi.string().max(255).required(),
  platform: Joi.string().max(32).default('unknown'),
  appVersion: Joi.string().max(32).optional(),
  appBuild: Joi.string().max(32).optional(),
  osVersion: Joi.string().max(32).optional(),
  locale: Joi.string().max(16).optional(),
  environment: Joi.string().max(32).optional(),
  metadata: Joi.object().unknown(true).default({})
});

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default class NotificationsController {
  static async getPreferences(req, res, next) {
    try {
      const preferences = await NotificationPreferenceService.getPreferences(req.user.id);
      return success(res, {
        data: {
          channels: preferences.channels,
          categories: preferences.categories,
          slack: preferences.slack,
          updatedAt: preferences.updatedAt,
          lastSyncedAt: preferences.lastSyncedAt
        },
        message: 'Notification preferences loaded'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updatePreferences(req, res, next) {
    try {
      const payload = await preferenceSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const updated = await NotificationPreferenceService.updatePreferences(req.user.id, payload);
      return success(res, {
        data: {
          channels: updated.channels,
          categories: updated.categories,
          slack: updated.slack,
          updatedAt: updated.updatedAt,
          lastSyncedAt: updated.lastSyncedAt
        },
        message: 'Notification preferences updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async registerDevice(req, res, next) {
    try {
      const payload = await deviceSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const registration = await NotificationPreferenceService.registerDevice(req.user.id, payload);
      return success(res, {
        data: {
          deviceToken: registration.deviceToken,
          platform: registration.platform,
          lastRegisteredAt: toIso(registration.lastRegisteredAt)
        },
        message: 'Device registered'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }
}

