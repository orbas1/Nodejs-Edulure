import Joi from 'joi';

import InstructorBookingService from '../services/InstructorBookingService.js';
import { paginated, success } from '../utils/httpResponse.js';

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(25),
  status: Joi.string().valid('requested', 'confirmed', 'completed', 'cancelled', 'all').default('all'),
  search: Joi.string().trim().allow('', null)
});

const createSchema = Joi.object({
  learnerEmail: Joi.string().email().required(),
  learnerFirstName: Joi.string().max(120).allow('', null),
  learnerLastName: Joi.string().max(120).allow('', null),
  scheduledStart: Joi.date().iso().required(),
  scheduledEnd: Joi.date().iso().required(),
  status: Joi.string().valid('requested', 'confirmed', 'cancelled', 'completed').default('confirmed'),
  meetingUrl: Joi.string().uri().allow('', null),
  durationMinutes: Joi.number().integer().min(15).max(480).optional(),
  hourlyRateAmount: Joi.number().precision(2).min(0).optional(),
  hourlyRateCurrency: Joi.string().length(3).uppercase().optional(),
  topic: Joi.string().max(240).allow('', null),
  notes: Joi.string().max(2000).allow('', null),
  source: Joi.string().max(120).allow('', null)
});

const updateSchema = createSchema.fork(
  ['learnerEmail', 'learnerFirstName', 'learnerLastName'],
  (schema) => schema.forbidden()
).fork(['scheduledStart', 'scheduledEnd'], (schema) => schema.optional());

const cancelSchema = Joi.object({
  reason: Joi.string().max(240).allow('', null),
  hardDelete: Joi.boolean().default(false)
});

export default class InstructorBookingController {
  static async list(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const result = await InstructorBookingService.listBookings(req.user.id, query);
      return paginated(res, {
        data: result.items,
        pagination: result.pagination,
        message: 'Tutor bookings loaded',
        meta: { stats: result.stats }
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const payload = await createSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const booking = await InstructorBookingService.createBooking(req.user.id, payload);
      return success(res, { data: booking, message: 'Tutor booking created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const payload = await updateSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const booking = await InstructorBookingService.updateBooking(req.user.id, req.params.bookingId, payload);
      return success(res, { data: booking, message: 'Tutor booking updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async cancel(req, res, next) {
    try {
      const payload = await cancelSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const booking = await InstructorBookingService.cancelBooking(req.user.id, req.params.bookingId, payload);
      if (payload.hardDelete) {
        return res.status(204).send();
      }
      return success(res, {
        data: booking,
        message: 'Tutor booking cancelled'
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
