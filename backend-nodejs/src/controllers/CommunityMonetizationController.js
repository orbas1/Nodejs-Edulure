import Joi from 'joi';

import CommunityMonetizationService from '../services/CommunityMonetizationService.js';
import { success } from '../utils/httpResponse.js';

const createRoleSchema = Joi.object({
  name: Joi.string().min(3).max(120).required(),
  roleKey: Joi.string().alphanum().min(3).max(60).optional(),
  description: Joi.string().max(500).allow('', null),
  permissions: Joi.object().default({}),
  isDefaultAssignable: Joi.boolean().default(true)
});

const assignRoleSchema = Joi.object({
  roleKey: Joi.string().min(2).max(60).required()
});

const createTierSchema = Joi.object({
  name: Joi.string().max(150).required(),
  slug: Joi.string().max(80).optional(),
  description: Joi.string().max(1000).allow('', null),
  priceCents: Joi.number().integer().min(100).max(5_000_000).required(),
  currency: Joi.string().length(3).uppercase().required(),
  billingInterval: Joi.string().valid('monthly', 'quarterly', 'annual', 'lifetime').required(),
  trialPeriodDays: Joi.number().integer().min(0).max(90).default(0),
  isActive: Joi.boolean().default(true),
  benefits: Joi.array().items(Joi.string().max(180)).max(15).default([]),
  metadata: Joi.object().default({}),
  stripePriceId: Joi.string().max(120).allow(null, ''),
  paypalPlanId: Joi.string().max(120).allow(null, '')
});

const updateTierSchema = createTierSchema.fork(
  ['name', 'priceCents', 'currency', 'billingInterval'],
  (schema) => schema.optional()
).keys({ isActive: Joi.boolean().optional() });

const checkoutSchema = Joi.object({
  tierId: Joi.number().integer().required(),
  provider: Joi.string().valid('stripe', 'paypal').required(),
  couponCode: Joi.string().uppercase().trim().optional(),
  tax: Joi.object({
    country: Joi.string().length(2).uppercase().required(),
    region: Joi.string().max(3).uppercase().allow(null, ''),
    postalCode: Joi.string().max(12).allow(null, '')
  }).optional(),
  receiptEmail: Joi.string().email().optional(),
  affiliateCode: Joi.string().max(60).optional()
});

const donationSchema = Joi.object({
  amountCents: Joi.number().integer().min(100).max(5_000_000).required(),
  currency: Joi.string().length(3).uppercase().optional(),
  provider: Joi.string().valid('stripe', 'paypal').optional(),
  receiptEmail: Joi.string().email().optional(),
  donorName: Joi.string().max(120).allow('', null).optional(),
  message: Joi.string().max(500).allow('', null).optional(),
  eventId: Joi.number().integer().optional(),
  affiliateCode: Joi.string().max(60).optional()
});

const affiliateApplySchema = Joi.object({
  referralCode: Joi.string().max(60).optional(),
  commissionRateBasisPoints: Joi.number().integer().min(250).max(5000).optional(),
  metadata: Joi.object().default({})
});

const affiliateUpdateSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'suspended', 'revoked').optional(),
  commissionRateBasisPoints: Joi.number().integer().min(250).max(5000).optional(),
  referralCode: Joi.string().max(60).optional(),
  metadata: Joi.object().optional()
});

const payoutSchema = Joi.object({
  amountCents: Joi.number().integer().min(100).required(),
  status: Joi.string().valid('pending', 'processing', 'paid', 'failed').optional(),
  payoutReference: Joi.string().max(120).optional(),
  scheduledAt: Joi.date().iso().optional(),
  processedAt: Joi.date().iso().optional(),
  failureReason: Joi.string().max(500).allow('', null),
  metadata: Joi.object().optional()
});

const listAffiliatesQuery = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'suspended', 'revoked').optional()
});

export default class CommunityMonetizationController {
  static async listRoles(req, res, next) {
    try {
      const result = await CommunityMonetizationService.listRoles(req.params.communityId, req.user.id);
      return success(res, { data: result, message: 'Community roles fetched' });
    } catch (error) {
      return next(error);
    }
  }

  static async createRole(req, res, next) {
    try {
      const payload = await createRoleSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const role = await CommunityMonetizationService.createRole(req.params.communityId, req.user.id, payload);
      return success(res, { data: role, message: 'Role created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async assignRole(req, res, next) {
    try {
      const payload = await assignRoleSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const assignment = await CommunityMonetizationService.assignRole(
        req.params.communityId,
        req.user.id,
        Number(req.params.userId),
        payload.roleKey
      );
      return success(res, { data: assignment, message: 'Member role updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async listTiers(req, res, next) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const tiers = await CommunityMonetizationService.listTiers(
        req.params.communityId,
        req.user.id,
        { includeInactive }
      );
      return success(res, { data: tiers, message: 'Paywall tiers fetched' });
    } catch (error) {
      return next(error);
    }
  }

  static async createTier(req, res, next) {
    try {
      const payload = await createTierSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const tier = await CommunityMonetizationService.createTier(req.params.communityId, req.user.id, payload);
      return success(res, { data: tier, message: 'Paywall tier created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateTier(req, res, next) {
    try {
      const payload = await updateTierSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const tier = await CommunityMonetizationService.updateTier(
        req.params.communityId,
        req.user.id,
        Number(req.params.tierId),
        payload
      );
      return success(res, { data: tier, message: 'Paywall tier updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async startCheckout(req, res, next) {
    try {
      const payload = await checkoutSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const result = await CommunityMonetizationService.startSubscriptionCheckout(
        req.params.communityId,
        req.user.id,
        payload
      );
      return success(res, {
        data: result,
        message: 'Subscription checkout initiated',
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

  static async listMySubscriptions(req, res, next) {
    try {
      const subscriptions = await CommunityMonetizationService.listSubscriptionsForUser(
        req.params.communityId,
        req.user.id
      );
      return success(res, { data: subscriptions, message: 'Subscriptions fetched' });
    } catch (error) {
      return next(error);
    }
  }

  static async createDonation(req, res, next) {
    try {
      const payload = await donationSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const result = await CommunityMonetizationService.createLiveDonation(
        req.params.communityId,
        req.user?.id ?? null,
        payload
      );
      return success(res, {
        data: result,
        message: 'Live donation checkout initiated',
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

  static async cancelSubscription(req, res, next) {
    try {
      const schema = Joi.object({ cancelAtPeriodEnd: Joi.boolean().default(false) });
      const payload = await schema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const subscription = await CommunityMonetizationService.cancelSubscription(
        req.params.communityId,
        req.user.id,
        req.params.subscriptionId,
        payload
      );
      return success(res, { data: subscription, message: 'Subscription cancellation scheduled' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async listAffiliates(req, res, next) {
    try {
      const filters = await listAffiliatesQuery.validateAsync(req.query ?? {}, { abortEarly: false, stripUnknown: true });
      const affiliates = await CommunityMonetizationService.listAffiliates(req.params.communityId, req.user.id, filters);
      return success(res, { data: affiliates, message: 'Community affiliates fetched' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async applyAffiliate(req, res, next) {
    try {
      const payload = await affiliateApplySchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const affiliate = await CommunityMonetizationService.applyAffiliate(
        req.params.communityId,
        req.user.id,
        payload
      );
      return success(res, { data: affiliate, message: 'Affiliate application submitted', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateAffiliate(req, res, next) {
    try {
      const payload = await affiliateUpdateSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const affiliate = await CommunityMonetizationService.updateAffiliate(
        req.params.communityId,
        req.user.id,
        Number(req.params.affiliateId),
        payload
      );
      return success(res, { data: affiliate, message: 'Affiliate updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async recordPayout(req, res, next) {
    try {
      const payload = await payoutSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const payout = await CommunityMonetizationService.recordAffiliatePayout(
        req.params.communityId,
        req.user.id,
        Number(req.params.affiliateId),
        payload
      );
      return success(res, { data: payout, message: 'Affiliate payout recorded', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }
}
