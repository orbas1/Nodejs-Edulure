import Joi from 'joi';

import PlatformSettingsService from '../services/PlatformSettingsService.js';
import { success } from '../utils/httpResponse.js';

const restrictedFeaturesSchema = Joi.alternatives().try(
  Joi.array().items(Joi.string().trim().max(120)),
  Joi.string().allow('', null)
);

const commissionTierSchema = Joi.object({
  thresholdCents: Joi.number().integer().min(0).max(1_000_000_000),
  rateBps: Joi.number().integer().min(0).max(5000)
});

const commissionCategorySchema = Joi.object({
  rateBps: Joi.number().integer().min(0).max(5000),
  minimumFeeCents: Joi.number().integer().min(0).max(10_000_000),
  affiliateShare: Joi.number().min(0).max(1)
});

const monetizationUpdateSchema = Joi.object({
  commissions: Joi.object({
    enabled: Joi.boolean(),
    rateBps: Joi.number().integer().min(0).max(5000),
    minimumFeeCents: Joi.number().integer().min(0).max(10_000_000),
    allowCommunityOverride: Joi.boolean(),
    default: commissionCategorySchema,
    categories: Joi.object().pattern(Joi.string().max(60), commissionCategorySchema)
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
  }).optional(),
  affiliate: Joi.object({
    enabled: Joi.boolean(),
    autoApprove: Joi.boolean(),
    cookieWindowDays: Joi.number().integer().min(1).max(365),
    payoutScheduleDays: Joi.number().integer().min(7).max(120),
    requireTaxInformation: Joi.boolean(),
    defaultCommission: Joi.object({
      recurrence: Joi.string().valid('once', 'finite', 'infinite'),
      maxOccurrences: Joi.when('recurrence', {
        is: 'finite',
        then: Joi.number().integer().min(1).max(120),
        otherwise: Joi.number().integer().min(1).max(120).allow(null)
      }),
      tiers: Joi.array().items(commissionTierSchema).min(1).max(10)
    }).optional(),
    security: Joi.object({
      blockSelfReferral: Joi.boolean(),
      enforceTwoFactorForPayouts: Joi.boolean()
    }).optional()
  }).optional(),
  workforce: Joi.object({
    providerControlsCompensation: Joi.boolean(),
    minimumServicemanShareBps: Joi.number().integer().min(0).max(10_000),
    recommendedServicemanShareBps: Joi.number().integer().min(0).max(10_000),
    nonCustodialWallets: Joi.boolean(),
    complianceNarrative: Joi.string().max(2000)
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
