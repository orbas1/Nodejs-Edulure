import Joi from 'joi';

import TutorBookingModel from '../models/TutorBookingModel.js';
import { paginated, created, success } from '../utils/httpResponse.js';

const BOOKING_STATUSES = ['requested', 'confirmed', 'cancelled', 'completed'];

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().allow('', null),
  status: Joi.alternatives().try(
    Joi.string().valid(...BOOKING_STATUSES),
    Joi.array().items(Joi.string().valid(...BOOKING_STATUSES))
  ),
  tutorId: Joi.number().integer().positive().optional(),
  learnerId: Joi.number().integer().positive().optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional()
});

const bookingPayloadSchema = Joi.object({
  tutorId: Joi.number().integer().positive().required(),
  learnerId: Joi.number().integer().positive().required(),
  requestedAt: Joi.date().iso().allow(null).optional(),
  confirmedAt: Joi.date().iso().allow(null).optional(),
  cancelledAt: Joi.date().iso().allow(null).optional(),
  completedAt: Joi.date().iso().allow(null).optional(),
  scheduledStart: Joi.date().iso().required(),
  scheduledEnd: Joi.date().iso().required(),
  durationMinutes: Joi.number().integer().min(15).max(600).default(60),
  hourlyRateAmount: Joi.number().integer().min(0).default(0),
  hourlyRateCurrency: Joi.string().length(3).uppercase().default('USD'),
  meetingUrl: Joi.string().uri().allow('', null).optional(),
  status: Joi.string()
    .valid(...BOOKING_STATUSES)
    .default('requested'),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const bookingUpdateSchema = bookingPayloadSchema.fork(['tutorId', 'learnerId', 'scheduledStart', 'scheduledEnd'], (schema) =>
  schema.optional()
);

function normaliseMetadata(value) {
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

function buildBookingPayload(payload, actorId) {
  const result = {
    metadata: {
      ...normaliseMetadata(payload.metadata),
      lastUpdatedBy: actorId ?? null
    }
  };

  if (payload.tutorId !== undefined) {
    result.tutorId = payload.tutorId;
  }
  if (payload.learnerId !== undefined) {
    result.learnerId = payload.learnerId;
  }
  if (payload.requestedAt !== undefined) {
    result.requestedAt = payload.requestedAt ? new Date(payload.requestedAt) : null;
  }
  if (payload.confirmedAt !== undefined) {
    result.confirmedAt = payload.confirmedAt ? new Date(payload.confirmedAt) : null;
  }
  if (payload.cancelledAt !== undefined) {
    result.cancelledAt = payload.cancelledAt ? new Date(payload.cancelledAt) : null;
  }
  if (payload.completedAt !== undefined) {
    result.completedAt = payload.completedAt ? new Date(payload.completedAt) : null;
  }
  if (payload.scheduledStart !== undefined) {
    result.scheduledStart = payload.scheduledStart ? new Date(payload.scheduledStart) : null;
  }
  if (payload.scheduledEnd !== undefined) {
    result.scheduledEnd = payload.scheduledEnd ? new Date(payload.scheduledEnd) : null;
  }
  if (payload.durationMinutes !== undefined) {
    result.durationMinutes = payload.durationMinutes;
  }
  if (payload.hourlyRateAmount !== undefined) {
    result.hourlyRateAmount = payload.hourlyRateAmount;
  }
  if (payload.hourlyRateCurrency !== undefined) {
    result.hourlyRateCurrency = payload.hourlyRateCurrency;
  }
  if (payload.meetingUrl !== undefined) {
    result.meetingUrl = payload.meetingUrl ?? null;
  }
  if (payload.status !== undefined) {
    result.status = payload.status;
  }

  return result;
}

export default class AdminBookingController {
  static async list(req, res, next) {
    try {
      const params = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const offset = (params.page - 1) * params.perPage;

      const [items, total] = await Promise.all([
        TutorBookingModel.list({
          search: params.search,
          status: params.status,
          tutorId: params.tutorId,
          learnerId: params.learnerId,
          from: params.from,
          to: params.to,
          limit: params.perPage,
          offset
        }),
        TutorBookingModel.count({
          search: params.search,
          status: params.status,
          tutorId: params.tutorId,
          learnerId: params.learnerId,
          from: params.from,
          to: params.to
        })
      ]);

      return paginated(res, {
        data: items,
        message: 'Tutor bookings retrieved',
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

  static async create(req, res, next) {
    try {
      const payload = await bookingPayloadSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const actorId = req.user?.id ?? null;
      const record = await TutorBookingModel.create(buildBookingPayload(payload, actorId));
      return created(res, {
        data: record,
        message: 'Tutor booking scheduled'
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const payload = await bookingUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const record = await TutorBookingModel.updateById(Number(req.params.bookingId), buildBookingPayload(payload, req.user?.id));
      return success(res, {
        data: record,
        message: 'Tutor booking updated'
      });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      await TutorBookingModel.deleteById(Number(req.params.bookingId));
      return success(res, { message: 'Tutor booking removed', status: 204 });
    } catch (error) {
      next(error);
    }
  }
}
