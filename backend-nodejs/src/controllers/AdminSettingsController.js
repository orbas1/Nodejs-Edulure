import Joi from 'joi';

import PlatformSettingsService from '../services/PlatformSettingsService.js';
import { success } from '../utils/httpResponse.js';

const restrictedFeaturesSchema = Joi.alternatives().try(
  Joi.array().items(Joi.string().trim().max(120)),
  Joi.string().allow('', null)
);

const monetizationUpdateSchema = Joi.object({
  commissions: Joi.object({
    enabled: Joi.boolean(),
    rateBps: Joi.number().integer().min(0).max(5000),
    minimumFeeCents: Joi.number().integer().min(0).max(10_000_000),
    allowCommunityOverride: Joi.boolean()
  }).optional(),
  subscriptions: Joi.object({
    enabled: Joi.boolean(),
    restrictedFeatures: restrictedFeaturesSchema,
    gracePeriodDays: Joi.number().integer().min(0).max(90),
    restrictOnFailure: Joi.boolean()
  }).optional(),
  payments: Joi.object({
    defaultProvider: Joi.string().valid('stripe', 'escrow'),
    stripeEnabled: Joi.boolean(),
    escrowEnabled: Joi.boolean()
  }).optional()
})
  .min(1)
  .message('At least one monetisation field must be provided.');

export default class AdminSettingsController {
  static async getMonetizationSettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getMonetizationSettings();
      return success(res, {
        data: settings,
        message: 'Monetization settings retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateMonetizationSettings(req, res, next) {
    try {
      const payload = await monetizationUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      const settings = await PlatformSettingsService.updateMonetizationSettings(payload);
      return success(res, {
        data: settings,
        message: 'Monetization settings updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }
}
