import Joi from 'joi';

import MonetizationFinanceService from '../services/MonetizationFinanceService.js';
import { created, paginated, success } from '../utils/httpResponse.js';

function parsePagination(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

const acknowledgeParamsSchema = Joi.object({
  runId: Joi.number().integer().positive().required()
});

const acknowledgeBodySchema = Joi.object({
  channel: Joi.string().trim().max(40).default('admin_console'),
  note: Joi.string().trim().max(500).allow('', null).optional()
});

export default class AdminMonetizationController {
  static async listCatalogItems(req, res, next) {
    try {
      const { status, tenantId = 'global' } = req.query;
      const limit = parsePagination(req.query.limit, 50);
      const offset = parsePagination(req.query.offset, 0);

      const items = await MonetizationFinanceService.listCatalogItems({ tenantId, status, limit, offset });
      return paginated(res, {
        data: items,
        pagination: { limit, offset, count: items.length },
        message: 'Monetization catalog retrieved',
        meta: { tenantId }
      });
    } catch (error) {
      next(error);
    }
  }

  static async upsertCatalogItem(req, res, next) {
    try {
      const payload = {
        tenantId: req.body.tenantId ?? 'global',
        productCode: req.body.productCode,
        name: req.body.name,
        description: req.body.description,
        pricingModel: req.body.pricingModel,
        billingInterval: req.body.billingInterval,
        revenueRecognitionMethod: req.body.revenueRecognitionMethod,
        recognitionDurationDays: req.body.recognitionDurationDays,
        unitAmountCents: req.body.unitAmountCents,
        currency: req.body.currency,
        usageMetric: req.body.usageMetric,
        revenueAccount: req.body.revenueAccount,
        deferredRevenueAccount: req.body.deferredRevenueAccount,
        metadata: req.body.metadata,
        status: req.body.status
      };

      const record = await MonetizationFinanceService.upsertCatalogItem(payload);
      return created(res, {
        data: record,
        message: 'Catalog item saved'
      });
    } catch (error) {
      next(error);
    }
  }

  static async recordUsage(req, res, next) {
    try {
      const record = await MonetizationFinanceService.recordUsageEvent({
        tenantId: req.body.tenantId ?? 'global',
        productCode: req.body.productCode,
        accountReference: req.body.accountReference,
        userId: req.body.userId,
        quantity: req.body.quantity,
        unitAmountCents: req.body.unitAmountCents,
        amountCents: req.body.amountCents,
        currency: req.body.currency,
        source: req.body.source,
        usageDate: req.body.usageDate,
        externalReference: req.body.externalReference,
        metadata: req.body.metadata
      });

      return created(res, {
        data: record,
        message: 'Usage recorded'
      });
    } catch (error) {
      next(error);
    }
  }

  static async listRevenueSchedules(req, res, next) {
    try {
      const { tenantId = 'global', status, paymentIntentId } = req.query;
      const limit = parsePagination(req.query.limit, 50);
      const offset = parsePagination(req.query.offset, 0);

      const schedules = await MonetizationFinanceService.listRevenueSchedules({
        tenantId,
        status,
        paymentIntentId,
        limit,
        offset
      });

      return paginated(res, {
        data: schedules,
        pagination: { limit, offset, count: schedules.length },
        message: 'Revenue schedules retrieved',
        meta: { tenantId }
      });
    } catch (error) {
      next(error);
    }
  }

  static async triggerReconciliation(req, res, next) {
    try {
      const tenantId = req.body.tenantId ?? 'global';
      const start = req.body.start ?? null;
      const end = req.body.end ?? null;

      const run = await MonetizationFinanceService.runReconciliation({ tenantId, start, end });
      return success(res, {
        data: run,
        message: 'Reconciliation run started',
        status: 202
      });
    } catch (error) {
      next(error);
    }
  }

  static async listReconciliationRuns(req, res, next) {
    try {
      const { tenantId = 'global' } = req.query;
      const limit = parsePagination(req.query.limit, 20);
      const runs = await MonetizationFinanceService.listReconciliationRuns({ tenantId, limit });
      return success(res, {
        data: runs,
        message: 'Reconciliation history fetched',
        meta: { tenantId }
      });
    } catch (error) {
      next(error);
    }
  }

  static async acknowledgeReconciliation(req, res, next) {
    try {
      const params = await acknowledgeParamsSchema.validateAsync(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      const payload = await acknowledgeBodySchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const acknowledgement = await MonetizationFinanceService.acknowledgeReconciliationAlert(
        {
          runId: params.runId,
          operatorId: req.user?.id ?? null,
          operatorName: req.user?.name ?? req.user?.fullName ?? null,
          operatorEmail: req.user?.email ?? null,
          channel: payload.channel,
          note: payload.note
        }
      );

      return success(res, {
        data: acknowledgement,
        message: 'Reconciliation alert acknowledged'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      next(error);
    }
  }
}

