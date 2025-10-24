import Joi from 'joi';

import db from '../config/database.js';
import RevenueAdjustmentModel from '../models/RevenueAdjustmentModel.js';
import { paginated, created, success } from '../utils/httpResponse.js';

const ADJUSTMENT_STATUSES = ['scheduled', 'approved', 'settled', 'cancelled'];

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().allow('', null),
  status: Joi.alternatives().try(
    Joi.string().valid(...ADJUSTMENT_STATUSES),
    Joi.array().items(Joi.string().valid(...ADJUSTMENT_STATUSES))
  ),
  category: Joi.alternatives().try(Joi.string().trim().allow('', null), Joi.array().items(Joi.string().trim().allow('')))
});

const adjustmentPayloadSchema = Joi.object({
  reference: Joi.string().trim().max(120).required(),
  category: Joi.string().trim().max(80).default('general'),
  status: Joi.string()
    .valid(...ADJUSTMENT_STATUSES)
    .default('scheduled'),
  currency: Joi.string().length(3).uppercase().default('USD'),
  amount: Joi.number().precision(2).required(),
  effectiveAt: Joi.date().iso().required(),
  notes: Joi.string().allow('', null).optional(),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const adjustmentUpdateSchema = adjustmentPayloadSchema.fork(['reference', 'amount', 'effectiveAt'], (schema) => schema.optional());

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
  }
  return [value].filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function toObject(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function buildAdjustmentPayload(payload, actorId) {
  const result = {
    metadata: {
      ...toObject(payload.metadata),
      lastUpdatedBy: actorId ?? null
    }
  };

  if (payload.reference !== undefined) {
    result.reference = payload.reference;
  }
  if (payload.category !== undefined) {
    result.category = payload.category || 'general';
  }
  if (payload.status !== undefined) {
    result.status = payload.status;
  }
  if (payload.currency !== undefined) {
    result.currency = payload.currency;
  }
  if (payload.amount !== undefined) {
    result.amountCents = Math.round(Number(payload.amount ?? 0) * 100);
  }
  if (payload.effectiveAt !== undefined) {
    result.effectiveAt = new Date(payload.effectiveAt);
  }
  if (payload.notes !== undefined) {
    result.notes = payload.notes ?? null;
  }
  result.updatedBy = actorId ?? null;
  if (actorId) {
    result.createdBy = actorId;
  }
  return result;
}

export default class AdminRevenueManagementController {
  static async summary(_req, res, next) {
    try {
      const now = new Date();
      const DAY = 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY);

      const [paymentsRow, adjustmentsSummary, scheduleRow, revenueTrend] = await Promise.all([
        db('payment_intents')
          .select({
            capturedCents: db.raw(
              "SUM(CASE WHEN status IN ('succeeded', 'requires_capture') THEN amount_total ELSE 0 END)::bigint"
            ),
            pendingCents: db.raw(
              "SUM(CASE WHEN status IN ('processing', 'requires_action') THEN amount_total ELSE 0 END)::bigint"
            ),
            refundedCents: db.raw('SUM(amount_refunded)::bigint'),
            totalIntents: db.raw('COUNT(*)')
          })
          .first(),
        RevenueAdjustmentModel.summariseWindow({ since: thirtyDaysAgo, until: now }),
        db('monetization_revenue_schedules')
          .select({
            scheduledCents: db.raw("SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END)::bigint"),
            recognisedCents: db.raw("SUM(CASE WHEN status = 'recognized' THEN recognized_amount_cents ELSE 0 END)::bigint"),
            inFlight: db.raw("SUM(CASE WHEN status IN ('pending','processing') THEN amount_cents ELSE 0 END)::bigint"),
            totalSchedules: db.raw('COUNT(*)')
          })
          .first(),
        db('reporting_payments_revenue_daily')
          .select({
            date: 'reporting_date',
            grossCents: db.raw('SUM(gross_volume_cents)::bigint'),
            recognisedCents: db.raw('SUM(recognised_volume_cents)::bigint')
          })
          .where('reporting_date', '>=', db.raw("current_date - interval '13 days'"))
          .groupBy('reporting_date')
          .orderBy('reporting_date', 'asc')
      ]);

      const capturedCents = Number(paymentsRow?.capturedCents ?? 0);
      const pendingCents = Number(paymentsRow?.pendingCents ?? 0);
      const refundedCents = Number(paymentsRow?.refundedCents ?? 0);
      const totalIntents = Number(paymentsRow?.totalIntents ?? 0);
      const avgOrderValueCents = totalIntents === 0 ? 0 : Math.round(capturedCents / totalIntents);

      return success(res, {
        data: {
          payments: {
            capturedCents,
            pendingCents,
            refundedCents,
            averageOrderCents: avgOrderValueCents
          },
          adjustments: adjustmentsSummary,
          revenueSchedules: {
            scheduledCents: Number(scheduleRow?.scheduledCents ?? 0),
            recognisedCents: Number(scheduleRow?.recognisedCents ?? 0),
            inFlightCents: Number(scheduleRow?.inFlight ?? 0),
            totalSchedules: Number(scheduleRow?.totalSchedules ?? 0)
          },
          revenueTrend: revenueTrend.map((row) => ({
            date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date),
            grossCents: Number(row.grossCents ?? 0),
            recognisedCents: Number(row.recognisedCents ?? 0)
          }))
        },
        message: 'Revenue summary compiled'
      });
    } catch (error) {
      next(error);
    }
  }

  static async listAdjustments(req, res, next) {
    try {
      const params = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const offset = (params.page - 1) * params.perPage;

      const [items, total] = await Promise.all([
        RevenueAdjustmentModel.list({
          search: params.search,
          status: params.status,
          category: toArray(params.category),
          limit: params.perPage,
          offset
        }),
        RevenueAdjustmentModel.count({
          search: params.search,
          status: params.status,
          category: toArray(params.category)
        })
      ]);

      return paginated(res, {
        data: items,
        message: 'Revenue adjustments retrieved',
        pagination: {
          page: params.page,
          perPage: params.perPage,
          total,
          totalPages: Math.ceil(total / params.perPage)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createAdjustment(req, res, next) {
    try {
      const payload = await adjustmentPayloadSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const actorId = req.user?.id ?? null;
      const record = await RevenueAdjustmentModel.create(buildAdjustmentPayload(payload, actorId));
      return created(res, { data: record, message: 'Revenue adjustment recorded' });
    } catch (error) {
      next(error);
    }
  }

  static async updateAdjustment(req, res, next) {
    try {
      const payload = await adjustmentUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const record = await RevenueAdjustmentModel.updateById(
        Number(req.params.adjustmentId),
        buildAdjustmentPayload(payload, req.user?.id)
      );
      return success(res, { data: record, message: 'Revenue adjustment updated' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAdjustment(req, res, next) {
    try {
      await RevenueAdjustmentModel.deleteById(Number(req.params.adjustmentId), {
        performedBy: req.user?.id ?? null
      });
      return success(res, { message: 'Revenue adjustment deleted', status: 204 });
    } catch (error) {
      next(error);
    }
  }
}
