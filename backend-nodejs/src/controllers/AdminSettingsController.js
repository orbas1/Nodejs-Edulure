import Joi from 'joi';

import PlatformSettingsService from '../services/PlatformSettingsService.js';
import { success } from '../utils/httpResponse.js';

const restrictedFeaturesSchema = Joi.alternatives().try(
  Joi.array().items(Joi.string().trim().max(120)),
  Joi.string().allow('', null)
);

const hexColourSchema = Joi.string()
  .pattern(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  .message('Colours must be valid hex values');

const appearanceMediaAssetSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  label: Joi.string().allow('', null).max(120),
  type: Joi.string().valid('image', 'video').default('image'),
  url: Joi.string().uri({ allowRelative: false }).allow('', null).max(2048),
  altText: Joi.string().allow('', null).max(160),
  featured: Joi.boolean().default(false)
});

const appearanceUpdateSchema = Joi.object({
  branding: Joi.object({
    primaryColor: hexColourSchema.optional(),
    secondaryColor: hexColourSchema.optional(),
    accentColor: hexColourSchema.optional(),
    logoUrl: Joi.string().uri({ allowRelative: false }).allow('', null).max(2048),
    faviconUrl: Joi.string().uri({ allowRelative: false }).allow('', null).max(2048)
  }).optional(),
  theme: Joi.object({
    mode: Joi.string().valid('light', 'dark', 'system'),
    borderRadius: Joi.string().valid('sharp', 'rounded', 'pill'),
    density: Joi.string().valid('comfortable', 'compact', 'expanded'),
    fontFamily: Joi.string().trim().max(120),
    headingFontFamily: Joi.string().trim().max(120)
  }).optional(),
  hero: Joi.object({
    heading: Joi.string().trim().max(120),
    subheading: Joi.string().trim().max(240).allow('', null),
    backgroundImageUrl: Joi.string().uri({ allowRelative: false }).allow('', null).max(2048),
    backgroundVideoUrl: Joi.string().uri({ allowRelative: false }).allow('', null).max(2048),
    primaryCtaLabel: Joi.string().trim().max(60),
    primaryCtaUrl: Joi.string().uri({ allowRelative: false }).allow('', null).max(2048),
    secondaryCtaLabel: Joi.string().trim().max(60).allow('', null),
    secondaryCtaUrl: Joi.string().uri({ allowRelative: false }).allow('', null).max(2048)
  }).optional(),
  mediaLibrary: Joi.array().items(appearanceMediaAssetSchema).max(24).optional()
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one appearance field to update.' });

const preferenceUpdateSchema = Joi.object({
  localisation: Joi.object({
    defaultLanguage: Joi.string().trim().lowercase().max(12),
    supportedLanguages: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim().lowercase().max(12)),
      Joi.string().trim().lowercase()
    ),
    currency: Joi.string().trim().uppercase().max(12),
    timezone: Joi.string().trim().max(60)
  }).optional(),
  experience: Joi.object({
    enableRecommendations: Joi.boolean(),
    enableSocialSharing: Joi.boolean(),
    enableLiveChatSupport: Joi.boolean(),
    allowGuestCheckout: Joi.boolean(),
    requireEmailVerification: Joi.boolean()
  }).optional(),
  communications: Joi.object({
    supportEmail: Joi.string().trim().email().max(180),
    supportPhone: Joi.string().trim().max(40).allow('', null),
    marketingEmail: Joi.string().trim().email().max(180).allow('', null),
    sendWeeklyDigest: Joi.boolean(),
    sendProductUpdates: Joi.boolean()
  }).optional()
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one preference field to update.' });

const systemUpdateSchema = Joi.object({
  maintenanceMode: Joi.object({
    enabled: Joi.boolean(),
    message: Joi.string().trim().max(360).allow('', null),
    scheduledWindow: Joi.string().trim().max(120).allow(null)
  }).optional(),
  operations: Joi.object({
    timezone: Joi.string().trim().max(60),
    weeklyBackupDay: Joi.string()
      .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      .insensitive(),
    autoUpdatesEnabled: Joi.boolean(),
    dataRetentionDays: Joi.number().integer().min(30).max(3650)
  }).optional(),
  security: Joi.object({
    enforceMfaForAdmins: Joi.boolean(),
    sessionTimeoutMinutes: Joi.number().integer().min(5).max(600),
    allowSessionResume: Joi.boolean()
  }).optional(),
  observability: Joi.object({
    enableAuditTrail: Joi.boolean(),
    errorReportingEmail: Joi.string().trim().email().max(180).allow('', null),
    notifyOnIntegrationFailure: Joi.boolean()
  }).optional()
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one system field to update.' });

const integrationWebhookSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  name: Joi.string().trim().max(120),
  url: Joi.string().uri({ allowRelative: false }).max(2048).required(),
  events: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(120)),
    Joi.string().trim().max(120)
  ),
  secret: Joi.string().trim().max(120).allow('', null),
  active: Joi.boolean()
});

const integrationServiceSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  provider: Joi.string().trim().max(120).required(),
  status: Joi.string().valid('active', 'paused', 'error').insensitive(),
  connectedAccount: Joi.string().trim().max(120).allow('', null),
  notes: Joi.string().trim().max(360).allow('', null)
});

const integrationUpdateSchema = Joi.object({
  webhooks: Joi.array().items(integrationWebhookSchema).max(20),
  services: Joi.array().items(integrationServiceSchema).max(20)
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one integration field to update.' });

const thirdPartyCredentialSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  provider: Joi.string().trim().max(120).required(),
  environment: Joi.string().trim().max(60).default('production'),
  alias: Joi.string().trim().max(120).allow('', null),
  ownerEmail: Joi.string().trim().email().max(180).allow('', null),
  status: Joi.string().valid('active', 'disabled', 'revoked').insensitive(),
  maskedKey: Joi.string().trim().max(120).allow('', null),
  createdAt: Joi.string().trim().max(40).allow('', null),
  lastRotatedAt: Joi.string().trim().max(40).allow('', null),
  notes: Joi.string().trim().max(360).allow('', null)
});

const thirdPartyUpdateSchema = Joi.object({
  credentials: Joi.array().items(thirdPartyCredentialSchema).max(30)
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one third-party credential field to update.' });

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
  static async getAppearanceSettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getAppearanceSettings();
      return success(res, {
        data: settings,
        message: 'Appearance settings retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateAppearanceSettings(req, res, next) {
    try {
      const payload = await appearanceUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const settings = await PlatformSettingsService.updateAppearanceSettings(payload);
      return success(res, {
        data: settings,
        message: 'Appearance settings updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }

  static async getPreferenceSettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getPreferenceSettings();
      return success(res, {
        data: settings,
        message: 'Preference settings retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updatePreferenceSettings(req, res, next) {
    try {
      const payload = await preferenceUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const settings = await PlatformSettingsService.updatePreferenceSettings(payload);
      return success(res, {
        data: settings,
        message: 'Preference settings updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }

  static async getSystemSettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getSystemSettings();
      return success(res, {
        data: settings,
        message: 'System settings retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateSystemSettings(req, res, next) {
    try {
      const payload = await systemUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const settings = await PlatformSettingsService.updateSystemSettings(payload);
      return success(res, {
        data: settings,
        message: 'System settings updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }

  static async getIntegrationSettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getIntegrationSettings();
      return success(res, {
        data: settings,
        message: 'Integration settings retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateIntegrationSettings(req, res, next) {
    try {
      const payload = await integrationUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const settings = await PlatformSettingsService.updateIntegrationSettings(payload);
      return success(res, {
        data: settings,
        message: 'Integration settings updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }

  static async getThirdPartySettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getThirdPartySettings();
      return success(res, {
        data: settings,
        message: 'Third-party API settings retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateThirdPartySettings(req, res, next) {
    try {
      const payload = await thirdPartyUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const settings = await PlatformSettingsService.updateThirdPartySettings(payload);
      return success(res, {
        data: settings,
        message: 'Third-party API settings updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }

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
