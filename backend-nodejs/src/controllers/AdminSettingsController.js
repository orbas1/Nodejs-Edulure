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

const adminProfileLeadershipSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  name: Joi.string().trim().max(160).required(),
  role: Joi.string().trim().max(160).allow('', null),
  email: Joi.string().trim().email().max(180).allow('', null),
  phone: Joi.string().trim().max(60).allow('', null),
  avatarUrl: Joi.string().uri({ allowRelative: false }).max(2048).allow('', null),
  bio: Joi.string().trim().max(360).allow('', null)
});

const adminProfileChannelSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  type: Joi.string().trim().max(60).required(),
  label: Joi.string().trim().max(160).allow('', null),
  destination: Joi.string().trim().max(180).allow('', null),
  slaMinutes: Joi.number().integer().min(5).max(2880),
  activeHours: Joi.string().trim().max(120).allow('', null)
});

const adminProfileRunbookSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  title: Joi.string().trim().max(200).required(),
  url: Joi.string().uri({ allowRelative: false }).max(2048).required(),
  lastReviewed: Joi.string().trim().max(40).allow('', null)
});

const adminProfileMediaSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  type: Joi.string().valid('image', 'video').default('image'),
  title: Joi.string().trim().max(160).allow('', null),
  url: Joi.string().uri({ allowRelative: false }).max(2048).required(),
  thumbnailUrl: Joi.string().uri({ allowRelative: false }).max(2048).allow('', null)
});

const adminProfileOnCallSchema = Joi.object({
  rotation: Joi.string().trim().max(160).allow('', null),
  timezone: Joi.string().trim().max(60).allow('', null),
  currentPrimary: Joi.string().trim().max(160).allow('', null),
  backup: Joi.string().trim().max(160).allow('', null),
  escalationChannel: Joi.string().trim().max(160).allow('', null)
});

const adminProfileUpdateSchema = Joi.object({
  organisation: Joi.object({
    name: Joi.string().trim().max(160),
    mission: Joi.string().trim().max(360).allow('', null),
    tagline: Joi.string().trim().max(160).allow('', null),
    headquarters: Joi.string().trim().max(160).allow('', null),
    established: Joi.string().trim().max(40).allow('', null),
    statement: Joi.string().trim().max(720).allow('', null),
    heroVideoUrl: Joi.string().uri({ allowRelative: false }).max(2048).allow('', null),
    heroPosterUrl: Joi.string().uri({ allowRelative: false }).max(2048).allow('', null)
  }).optional(),
  leadership: Joi.array().items(adminProfileLeadershipSchema).max(12),
  supportChannels: Joi.array().items(adminProfileChannelSchema).max(20),
  runbooks: Joi.array().items(adminProfileRunbookSchema).max(30),
  media: Joi.array().items(adminProfileMediaSchema).max(20),
  onCall: adminProfileOnCallSchema.optional()
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one admin profile field to update.' });

const paymentProcessorSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  provider: Joi.string().trim().max(160).required(),
  status: Joi.string().valid('active', 'paused', 'error', 'testing').insensitive(),
  merchantId: Joi.string().trim().max(160).allow('', null),
  capabilities: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(120)),
    Joi.string().trim().max(120)
  ),
  settlementTimeframe: Joi.string().trim().max(40).allow('', null),
  currencies: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().uppercase().max(12)),
    Joi.string().trim().uppercase().max(12)
  ),
  supportContact: Joi.string().trim().max(180).allow('', null)
});

const paymentBankAccountSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  name: Joi.string().trim().max(160).required(),
  bankName: Joi.string().trim().max(160).allow('', null),
  last4: Joi.string().pattern(/^[0-9]{0,4}$/).allow('', null),
  currency: Joi.string().trim().uppercase().max(12).allow('', null),
  primary: Joi.boolean()
});

const paymentWebhookSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  event: Joi.string().trim().max(160).required(),
  url: Joi.string().uri({ allowRelative: false }).max(2048).required(),
  active: Joi.boolean()
});

const paymentUpdateSchema = Joi.object({
  processors: Joi.array().items(paymentProcessorSchema).max(10),
  payoutRules: Joi.object({
    schedule: Joi.string().valid('daily', 'weekly', 'biweekly', 'monthly', 'adhoc').insensitive(),
    dayOfWeek: Joi.string()
      .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      .insensitive(),
    minimumPayoutCents: Joi.number().integer().min(0).max(1_000_000_000),
    reservePercentage: Joi.number().integer().min(0).max(100),
    autoApproveRefunds: Joi.boolean(),
    riskThreshold: Joi.string().trim().max(60).allow('', null)
  }).optional(),
  bankAccounts: Joi.array().items(paymentBankAccountSchema).max(10),
  webhooks: Joi.array().items(paymentWebhookSchema).max(20)
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one payment field to update.' });

const emailDomainSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  domain: Joi.string().trim().max(180).required(),
  status: Joi.string().valid('verified', 'pending', 'failed').insensitive(),
  dkimStatus: Joi.string().valid('valid', 'pending', 'failed').insensitive(),
  spfStatus: Joi.string().valid('valid', 'pending', 'failed').insensitive()
});

const emailTemplateSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  name: Joi.string().trim().max(160).required(),
  category: Joi.string().trim().max(120).allow('', null),
  subject: Joi.string().trim().max(200).allow('', null),
  lastUpdated: Joi.string().trim().max(40).allow('', null)
});

const emailUpdateSchema = Joi.object({
  branding: Joi.object({
    fromName: Joi.string().trim().max(160),
    fromEmail: Joi.string().trim().email().max(180),
    replyTo: Joi.string().trim().email().max(180).allow('', null)
  }).optional(),
  notifications: Joi.object({
    onboarding: Joi.boolean(),
    weeklyDigest: Joi.boolean(),
    incidentAlerts: Joi.boolean(),
    marketingOptInDefault: Joi.boolean()
  }).optional(),
  escalationRecipients: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(180)),
    Joi.string().trim().max(180)
  ),
  domains: Joi.array().items(emailDomainSchema).max(10),
  templates: Joi.array().items(emailTemplateSchema).max(30)
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one email field to update.' });

const securityMethodSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  type: Joi.string().valid('totp', 'sms', 'webauthn', 'email').insensitive().required(),
  enabled: Joi.boolean(),
  description: Joi.string().trim().max(200).allow('', null)
});

const securityAuditSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  label: Joi.string().trim().max(200).required(),
  completedAt: Joi.string().trim().max(40).allow('', null)
});

const securityUpdateSchema = Joi.object({
  enforcement: Joi.object({
    requiredForAdmins: Joi.boolean(),
    requiredForInstructors: Joi.boolean(),
    requiredForFinance: Joi.boolean(),
    rememberDeviceDays: Joi.number().integer().min(0).max(90),
    sessionTimeoutMinutes: Joi.number().integer().min(5).max(600)
  }).optional(),
  methods: Joi.array().items(securityMethodSchema).max(10),
  backup: Joi.object({
    backupCodesEnabled: Joi.boolean(),
    requireRegenerationOnUse: Joi.boolean()
  }).optional(),
  audits: Joi.array().items(securityAuditSchema).max(20)
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one security field to update.' });

const financeTierSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  name: Joi.string().trim().max(160).required(),
  appliesTo: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(60)),
    Joi.string().trim().max(60)
  ),
  thresholdCents: Joi.number().integer().min(0).max(1_000_000_000),
  rateBps: Joi.number().integer().min(0).max(5000)
});

const financeAdjustmentSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  description: Joi.string().trim().max(240).required(),
  amountCents: Joi.number().integer().min(-1_000_000_000).max(1_000_000_000),
  status: Joi.string().valid('draft', 'scheduled', 'processing', 'processed', 'cancelled').insensitive(),
  createdAt: Joi.string().trim().max(40).allow('', null)
});

const financeRevenueStreamSchema = Joi.object({
  id: Joi.string().trim().max(64).optional(),
  name: Joi.string().trim().max(160).required(),
  shareBps: Joi.number().integer().min(0).max(5000),
  active: Joi.boolean()
});

const financeApprovalsSchema = Joi.object({
  requireDualApproval: Joi.boolean(),
  financeReviewer: Joi.string().trim().email().max(180).allow('', null)
});

const financeUpdateSchema = Joi.object({
  policies: Joi.object({
    billingContact: Joi.string().trim().email().max(180).allow('', null),
    invoiceGraceDays: Joi.number().integer().min(0).max(60),
    reconciliationCadence: Joi.string().trim().max(120).allow('', null),
    payoutScheduleDays: Joi.number().integer().min(7).max(120),
    defaultCommissionBps: Joi.number().integer().min(0).max(5000),
    minimumCommissionCents: Joi.number().integer().min(0).max(1_000_000_000),
    currency: Joi.string().trim().uppercase().max(12)
  }).optional(),
  tiers: Joi.array().items(financeTierSchema).max(20),
  adjustments: Joi.array().items(financeAdjustmentSchema).max(20),
  revenueStreams: Joi.array().items(financeRevenueStreamSchema).max(20),
  approvals: financeApprovalsSchema.optional()
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one finance field to update.' });

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
  static async getAdminProfileSettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getAdminProfileSettings();
      return success(res, { data: settings, message: 'Admin profile settings retrieved' });
    } catch (error) {
      return next(error);
    }
  }

  static async updateAdminProfileSettings(req, res, next) {
    try {
      const payload = await adminProfileUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const settings = await PlatformSettingsService.updateAdminProfileSettings(payload);
      return success(res, { data: settings, message: 'Admin profile settings updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }

  static async getPaymentSettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getPaymentSettings();
      return success(res, { data: settings, message: 'Payment settings retrieved' });
    } catch (error) {
      return next(error);
    }
  }

  static async updatePaymentSettings(req, res, next) {
    try {
      const payload = await paymentUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const settings = await PlatformSettingsService.updatePaymentSettings(payload);
      return success(res, { data: settings, message: 'Payment settings updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }

  static async getEmailSettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getEmailSettings();
      return success(res, { data: settings, message: 'Email settings retrieved' });
    } catch (error) {
      return next(error);
    }
  }

  static async updateEmailSettings(req, res, next) {
    try {
      const payload = await emailUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const settings = await PlatformSettingsService.updateEmailSettings(payload);
      return success(res, { data: settings, message: 'Email settings updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }

  static async getSecuritySettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getSecuritySettings();
      return success(res, { data: settings, message: 'Security settings retrieved' });
    } catch (error) {
      return next(error);
    }
  }

  static async updateSecuritySettings(req, res, next) {
    try {
      const payload = await securityUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const settings = await PlatformSettingsService.updateSecuritySettings(payload);
      return success(res, { data: settings, message: 'Security settings updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }

  static async getFinanceSettings(_req, res, next) {
    try {
      const settings = await PlatformSettingsService.getFinanceSettings();
      return success(res, { data: settings, message: 'Finance settings retrieved' });
    } catch (error) {
      return next(error);
    }
  }

  static async updateFinanceSettings(req, res, next) {
    try {
      const payload = await financeUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const settings = await PlatformSettingsService.updateFinanceSettings(payload);
      return success(res, { data: settings, message: 'Finance settings updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((detail) => detail.message) ?? [error.message];
      }
      return next(error);
    }
  }

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
