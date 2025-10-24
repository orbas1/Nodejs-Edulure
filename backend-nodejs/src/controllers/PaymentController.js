import Joi from 'joi';

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

const escrowPartySchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().max(120).optional(),
  lastName: Joi.string().max(120).optional(),
  language: Joi.string().length(2).lowercase().optional()
});

const escrowSchema = Joi.object({
  buyer: escrowPartySchema.required(),
  seller: escrowPartySchema.required(),
  description: Joi.string().max(255).optional(),
  inspectionPeriod: Joi.number().integer().min(1).max(30).optional()
});

const taxSchema = Joi.object({
  country: Joi.string().length(2).uppercase().required(),
  region: Joi.string().max(3).uppercase().allow(null, '').optional(),
  postalCode: Joi.string().max(12).allow(null, '').optional()
});

const paymentIntentSchema = Joi.object({
  provider: Joi.string().valid('stripe', 'paypal', 'escrow').required(),
  currency: Joi.string().length(3).uppercase().optional(),
  items: Joi.array().items(lineItemSchema).min(1).required(),
  couponCode: Joi.string().trim().uppercase().optional(),
  tax: taxSchema.optional(),
  entity: entitySchema.optional(),
  metadata: Joi.object().optional(),
  receiptEmail: Joi.string().email().optional(),
  paypal: paypalSchema.optional(),
  escrow: escrowSchema.optional()
});

const refundSchema = Joi.object({
  amount: Joi.number().integer().min(1).optional(),
  reason: Joi.string().trim().max(180).allow('', null).optional()
});

const summarySchema = Joi.object({
  currency: Joi.string().length(3).uppercase().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  tenantId: Joi.string().trim().max(120).optional()
});

const paymentIdSchema = Joi.object({
  paymentId: Joi.string()
    .trim()
    .pattern(/^[a-z0-9][a-z0-9._-]{1,120}$/i)
    .required()
    .messages({
      'string.pattern.base': 'paymentId must contain only URL-safe characters'
    })
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
      const { value, error } = paymentIdSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
        throw error;
      }

      const intent = await PaymentService.capturePayPalOrder(value.paymentId);
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
      const { value: params, error: paramError } = paymentIdSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (paramError) {
        paramError.status = 422;
        paramError.details = paramError.details.map((detail) => detail.message);
        throw paramError;
      }
      const payload = await refundSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const intent = await PaymentService.issueRefund({
        paymentPublicId: params.paymentId,
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
        data: summary.currencies,
        message: 'Finance summary generated',
        meta: {
          monetization: summary.monetization
        }
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
        code: Joi.string().trim().uppercase().required(),
        currency: Joi.string().trim().uppercase().length(3).optional()
      });
      const { code, currency } = await schema.validateAsync(
        { ...req.params, ...req.query },
        {
          abortEarly: false,
          stripUnknown: true
        }
      );

      const preview = await PaymentService.previewCoupon({
        code,
        currency: currency ?? undefined,
        userId: req.user?.id ?? null
      });

      return success(res, {
        data: preview,
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
