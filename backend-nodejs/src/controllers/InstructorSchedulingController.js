import Joi from 'joi';

import InstructorSchedulingService from '../services/InstructorSchedulingService.js';
import { paginated, success } from '../utils/httpResponse.js';

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(25),
  status: Joi.string().valid('open', 'held', 'booked', 'cancelled', 'all').default('all'),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional()
});

const createSchema = Joi.object({
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().required(),
  status: Joi.string().valid('open', 'held', 'booked', 'cancelled').default('open'),
  isRecurring: Joi.boolean().default(false),
  recurrenceRule: Joi.string().max(200).allow('', null),
  metadata: Joi.object().default({})
});

const updateSchema = createSchema.fork(['startAt', 'endAt'], (schema) => schema.optional());

export default class InstructorSchedulingController {
  static async list(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const result = await InstructorSchedulingService.listRoster(req.user.id, query);
      return paginated(res, {
        data: result.items,
        pagination: result.pagination,
        message: 'Tutor roster loaded'
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
      const slot = await InstructorSchedulingService.createSlot(req.user.id, payload);
      return success(res, { data: slot, message: 'Roster entry created', status: 201 });
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
      const slotId = Number.parseInt(req.params.slotId, 10);
      if (Number.isNaN(slotId)) {
        return next(Object.assign(new Error('Invalid roster entry id'), { status: 400 }));
      }
      const slot = await InstructorSchedulingService.updateSlot(req.user.id, slotId, payload);
      return success(res, { data: slot, message: 'Roster entry updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      const slotId = Number.parseInt(req.params.slotId, 10);
      if (Number.isNaN(slotId)) {
        return next(Object.assign(new Error('Invalid roster entry id'), { status: 400 }));
      }
      await InstructorSchedulingService.deleteSlot(req.user.id, slotId);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}
