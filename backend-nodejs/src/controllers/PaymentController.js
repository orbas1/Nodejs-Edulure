import Joi from 'joi';

import PaymentCouponModel from '../models/PaymentCouponModel.js';
import PaymentService from '../services/PaymentService.js';
import { success } from '../utils/httpResponse.js';

const lineItemSchema = Joi.object({
  id: Joi.string().max(120).optional(),
  name: Joi.string().max(120).optional(),
  description: Joi.string().max(255).allow(null, '').optional(),
  unitAmount: Joi.number().integer().min(50).max(5_000_000).required(),
  quantity: Joi.number().integer().min(1).max(100).optional(),
  taxExempt: Joi.boolean().optional(),
  metadata: Joi.object().optional()
});

const entitySchema = Joi.object({
  id: Joi.string().max(120).required(),
  type: Joi.string().max(60).required(),
  name: Joi.string().max(120).optional(),
  description: Joi.string().max(255).optional()
});

const paypalSchema = Joi.object({
  returnUrl: Joi.string().uri().required(),
  cancelUrl: Joi.string().uri().required(),
  brandName: Joi.string().max(127).optional()
});

const taxSchema = Joi.object({
  country: Joi.string().length(2).uppercase().required(),
  region: Joi.string().max(3).uppercase().allow(null, '').optional(),
  postalCode: Joi.string().max(12).allow(null, '').optional()
});

const paymentIntentSchema = Joi.object({
  provider: Joi.string().valid('stripe', 'paypal').required(),
  currency: Joi.string().length(3).uppercase().optional(),
  items: Joi.array().items(lineItemSchema).min(1).required(),
  couponCode: Joi.string().trim().uppercase().optional(),
  tax: taxSchema.optional(),
  entity: entitySchema.optional(),
  metadata: Joi.object().optional(),
  receiptEmail: Joi.string().email().optional(),
  paypal: paypalSchema.optional()
});

const refundSchema = Joi.object({
  amount: Joi.number().integer().min(1).optional(),
  reason: Joi.string().max(180).allow('', null).optional()
});

const summarySchema = Joi.object({
  currency: Joi.string().length(3).uppercase().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});

export default class PaymentController {
  static async createIntent(req, res, next) {
    try {
      const payload = await paymentIntentSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      const result = await PaymentService.createPaymentIntent({
        ...payload,
        userId: req.user?.id ?? null
      });

      return success(res, {
        data: result,
        message: 'Payment intent created',
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

  static async capturePayPal(req, res, next) {
    try {
      const { paymentId } = req.params;
      const intent = await PaymentService.capturePayPalOrder(paymentId);
      return success(res, {
        data: intent,
        message: 'PayPal order captured'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async issueRefund(req, res, next) {
    try {
      const { paymentId } = req.params;
      const payload = await refundSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const intent = await PaymentService.issueRefund({
        paymentPublicId: paymentId,
        amount: payload.amount,
        reason: payload.reason ?? undefined,
        requesterId: req.user?.id ?? null
      });

      return success(res, {
        data: intent,
        message: 'Refund issued'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async getSummary(req, res, next) {
    try {
      const payload = await summarySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const summary = await PaymentService.getFinanceSummary(payload);
      return success(res, {
        data: summary,
        message: 'Finance summary generated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async getCoupon(req, res, next) {
    try {
      const schema = Joi.object({
        code: Joi.string().trim().uppercase().required()
      });
      const { code } = await schema.validateAsync(req.params, {
        abortEarly: false,
        stripUnknown: true
      });

      const coupon = await PaymentCouponModel.findByCode(code);
      if (!coupon) {
        const error = new Error('Coupon not found');
        error.status = 404;
        throw error;
      }

      return success(res, {
        data: {
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          currency: coupon.currency,
          status: coupon.status,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          maxRedemptions: coupon.maxRedemptions,
          perUserLimit: coupon.perUserLimit,
          timesRedeemed: coupon.timesRedeemed
        },
        message: 'Coupon fetched'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async handleStripeWebhook(req, res, next) {
    try {
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        const error = new Error('Stripe signature header missing');
        error.status = 400;
        throw error;
      }
      const result = await PaymentService.handleStripeWebhook(req.rawBody, signature);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
}
