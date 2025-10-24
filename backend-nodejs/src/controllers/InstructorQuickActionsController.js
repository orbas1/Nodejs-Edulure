import Joi from 'joi';

import instructorQuickActionsService from '../services/InstructorQuickActionsService.js';
import { success } from '../utils/httpResponse.js';

const quickActionStatuses = instructorQuickActionsService.getSupportedStatuses();

const listSchema = Joi.object({
  status: Joi.string().valid(...quickActionStatuses, 'all').optional(),
  includeHistory: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(50).optional()
});

const createSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().trim().allow('', null).optional(),
  actionType: Joi.string().trim().max(80).optional(),
  status: Joi.string().valid(...quickActionStatuses).optional(),
  priority: Joi.number().integer().min(1).max(5).default(3),
  dueAt: Joi.date().optional(),
  requiresSync: Joi.boolean().default(false),
  metadata: Joi.object().optional(),
  note: Joi.string().trim().allow('', null).optional()
});

const transitionSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).optional(),
  description: Joi.string().trim().allow('', null).optional(),
  actionType: Joi.string().trim().max(80).optional(),
  status: Joi.string().valid(...quickActionStatuses).optional(),
  priority: Joi.number().integer().min(1).max(5).optional(),
  dueAt: Joi.date().optional(),
  requiresSync: Joi.boolean().optional(),
  metadata: Joi.object().optional(),
  note: Joi.string().trim().allow('', null).optional(),
  completedAt: Joi.date().optional(),
  lastSyncedAt: Joi.date().optional()
});

const syncSchema = Joi.object({
  syncedAt: Joi.date().optional(),
  status: Joi.string().valid(...quickActionStatuses).optional(),
  note: Joi.string().trim().allow('', null).optional(),
  completedAt: Joi.date().optional(),
  metadata: Joi.object().optional()
});

export default class InstructorQuickActionsController {
  static async list(req, res, next) {
    try {
      const query = await listSchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const actions = await instructorQuickActionsService.list(req.user.id, {
        status: query.status === 'all' ? undefined : query.status,
        includeHistory: query.includeHistory,
        limit: query.limit
      });
      return success(res, {
        data: actions,
        message: 'Instructor quick actions fetched'
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
      const payload = await createSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const action = await instructorQuickActionsService.create(req.user.id, payload);
      return success(res, {
        data: action,
        message: 'Instructor quick action created',
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

  static async transition(req, res, next) {
    try {
      const payload = await transitionSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const action = await instructorQuickActionsService.transition(
        req.user.id,
        String(req.params.actionId ?? '').trim(),
        payload
      );
      return success(res, {
        data: action,
        message: 'Instructor quick action updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async markSynced(req, res, next) {
    try {
      const payload = await syncSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const action = await instructorQuickActionsService.markSynced(
        req.user.id,
        String(req.params.actionId ?? '').trim(),
        payload
      );
      return success(res, {
        data: action,
        message: 'Instructor quick action sync recorded'
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
