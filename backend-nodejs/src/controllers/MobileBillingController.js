import MobileBillingService from '../services/MobileBillingService.js';

function requireUserId(req) {
  if (!req?.user?.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  return req.user.id;
}

export default class MobileBillingController {
  static async snapshot(req, res, next) {
    try {
      const userId = requireUserId(req);
      const snapshot = await MobileBillingService.getSnapshot(userId);
      return res.json({ success: true, ...snapshot });
    } catch (error) {
      return next(error);
    }
  }

  static async recordPurchase(req, res, next) {
    try {
      const userId = requireUserId(req);
      const invoice = await MobileBillingService.recordPurchase(userId, req.body ?? {});
      return res.status(201).json({ success: true, invoice });
    } catch (error) {
      return next(error);
    }
  }

  static async cancelSubscription(req, res, next) {
    try {
      const userId = requireUserId(req);
      await MobileBillingService.cancelSubscription(userId, req.body ?? {});
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}
