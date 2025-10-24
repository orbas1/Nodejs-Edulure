import Joi from 'joi';

import BillingService from '../services/BillingService.js';
import { success } from '../utils/httpResponse.js';

const catalogQuerySchema = Joi.object({
  tenantId: Joi.string().max(80).optional()
});

const receiptSchema = Joi.object({
  platform: Joi.string().valid('ios', 'android', 'web', 'test', 'unknown').default('unknown'),
  productId: Joi.string().max(160).required(),
  transactionId: Joi.string().max(160).required(),
  purchaseToken: Joi.string().max(2048).required(),
  payload: Joi.object().unknown(true).default({}),
  metadata: Joi.object().unknown(true).default({}),
  appVersion: Joi.string().max(32).optional(),
  osVersion: Joi.string().max(32).optional(),
  locale: Joi.string().max(16).optional()
});

export default class BillingController {
  static async listCatalog(req, res, next) {
    try {
      const query = await catalogQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const snapshot = await BillingService.listCatalog({ tenantId: query.tenantId });
      return success(res, {
        data: {
          products: snapshot.products,
          fetchedAt: snapshot.fetchedAt,
          expiresAt: snapshot.expiresAt
        },
        message: 'Billing catalog loaded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async validateReceipt(req, res, next) {
    try {
      const payload = await receiptSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      await BillingService.recordReceiptSubmission({
        userId: req.user?.id ?? null,
        platform: payload.platform,
        productId: payload.productId,
        transactionId: payload.transactionId,
        purchaseToken: payload.purchaseToken,
        payload: payload.payload,
        metadata: {
          ...payload.metadata,
          appVersion: payload.appVersion ?? null,
          osVersion: payload.osVersion ?? null,
          locale: payload.locale ?? null
        }
      });

      return success(res, {
        data: { transactionId: payload.transactionId },
        message: 'Receipt submitted for validation',
        status: 202
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

