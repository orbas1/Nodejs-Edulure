import Joi from 'joi';

import PaymentService from '../services/PaymentService.js';
import { success } from '../utils/httpResponse.js';

const orderItemSchema = Joi.object({
  itemType: Joi.string().trim().max(60).required(),
  itemId: Joi.string().trim().max(60).optional(),
  name: Joi.string().trim().max(255).required(),
  unitAmount: Joi.number().precision(2).positive().required(),
  quantity: Joi.number().integer().positive().default(1),
  metadata: Joi.object().default({}),
  taxable: Joi.boolean().optional()
});

const createOrderSchema = Joi.object({
  currency: Joi.string().trim().length(3).required(),
  paymentProvider: Joi.string().valid('stripe', 'paypal').required(),
  couponCode: Joi.string().trim().max(48).optional(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
  metadata: Joi.object().default({}),
  billing: Joi.object({
    email: Joi.string().email().optional(),
    country: Joi.string().trim().length(2).uppercase().optional(),
    region: Joi.string().trim().max(32).optional(),
    returnUrl: Joi.string().uri().optional(),
    cancelUrl: Joi.string().uri().optional()
  }).optional()
});

const captureSchema = Joi.object({
  orderNumber: Joi.string().trim().max(40).required()
});

const refundSchema = Joi.object({
  amount: Joi.number().precision(2).positive().optional(),
  reason: Joi.string().trim().max(255).optional()
});

export default class PaymentController {
  static async createOrder(req, res, next) {
    try {
      const payload = await createOrderSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await PaymentService.createOrder({
        user: req.user,
        items: payload.items,
        currency: payload.currency,
        paymentProvider: payload.paymentProvider,
        couponCode: payload.couponCode,
        billing: payload.billing,
        metadata: payload.metadata,
        customerEmail: req.user?.email ?? payload.billing?.email ?? null
      });
      return success(res, {
        data: result,
        status: 201,
        message: 'Order created'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async capture(req, res, next) {
    try {
      const params = await captureSchema.validateAsync(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      const order = await PaymentService.captureOrder({
        orderNumber: params.orderNumber,
        performedBy: req.user?.id ?? null
      });
      return success(res, { data: order, message: 'Order captured' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async refund(req, res, next) {
    try {
      const params = await captureSchema.validateAsync(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      const payload = await refundSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const refund = await PaymentService.issueRefund({
        orderNumber: params.orderNumber,
        amount: payload.amount,
        reason: payload.reason,
        performedBy: req.user?.id ?? null
      });
      return success(res, { data: refund, message: 'Refund initiated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async stripeWebhook(req, res, next) {
    try {
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        const error = new Error('Missing Stripe signature header');
        error.status = 400;
        throw error;
      }
      const result = await PaymentService.handleStripeWebhook({
        rawBody: req.rawBody,
        signature
      });
      return success(res, { data: result, message: 'Stripe webhook processed' });
    } catch (error) {
      return next(error);
    }
  }

  static async paypalWebhook(req, res, next) {
    try {
      const result = await PaymentService.handlePayPalWebhook({
        body: req.body,
        headers: {
          'paypal-auth-algo': req.headers['paypal-auth-algo'],
          'paypal-cert-url': req.headers['paypal-cert-url'],
          'paypal-transmission-id': req.headers['paypal-transmission-id'],
          'paypal-transmission-sig': req.headers['paypal-transmission-sig'],
          'paypal-transmission-time': req.headers['paypal-transmission-time']
        }
      });
      return success(res, { data: result, message: 'PayPal webhook processed' });
    } catch (error) {
      return next(error);
    }
  }
}
