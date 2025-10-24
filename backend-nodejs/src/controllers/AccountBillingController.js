import AccountBillingService from '../services/AccountBillingService.js';

function requireUser(req) {
  if (!req?.user?.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  return req.user;
}

export default class AccountBillingController {
  static async getOverview(req, res, next) {
    try {
      const user = requireUser(req);
      const overview = await AccountBillingService.getBillingOverview(user.id);
      return res.json({ success: true, data: overview });
    } catch (error) {
      return next(error);
    }
  }

  static async listPaymentMethods(req, res, next) {
    try {
      const user = requireUser(req);
      const methods = await AccountBillingService.listPaymentMethods(user.id);
      return res.json({ success: true, data: methods });
    } catch (error) {
      return next(error);
    }
  }

  static async listInvoices(req, res, next) {
    try {
      const user = requireUser(req);
      const invoices = await AccountBillingService.listInvoices(user.id);
      return res.json({ success: true, data: invoices });
    } catch (error) {
      return next(error);
    }
  }

  static async createPortalSession(req, res, next) {
    try {
      const user = requireUser(req);
      const session = await AccountBillingService.createPortalSession(
        { ...user, userAgent: req.headers?.['user-agent'] ?? null },
        { returnUrl: req.body?.returnUrl }
      );
      return res.status(201).json({ success: true, data: session });
    } catch (error) {
      return next(error);
    }
  }
}
