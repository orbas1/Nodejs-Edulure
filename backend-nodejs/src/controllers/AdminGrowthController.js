import Joi from 'joi';

import db from '../config/database.js';
import GrowthExperimentModel from '../models/GrowthExperimentModel.js';
import { created, paginated, success } from '../utils/httpResponse.js';

const EXPERIMENT_STATUSES = ['draft', 'running', 'paused', 'completed', 'archived'];

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().allow('', null),
  status: Joi.alternatives().try(
    Joi.string().valid(...EXPERIMENT_STATUSES),
    Joi.array().items(Joi.string().valid(...EXPERIMENT_STATUSES))
  )
});

const experimentPayloadSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  status: Joi.string()
    .valid(...EXPERIMENT_STATUSES)
    .default('draft'),
  ownerId: Joi.number().integer().positive().allow(null).optional(),
  ownerEmail: Joi.string().email().allow('', null).optional(),
  hypothesis: Joi.string().allow('', null).optional(),
  primaryMetric: Joi.string().trim().max(120).allow('', null).optional(),
  baselineValue: Joi.number().precision(4).allow(null).optional(),
  targetValue: Joi.number().precision(4).allow(null).optional(),
  startAt: Joi.date().iso().allow(null).optional(),
  endAt: Joi.date().iso().allow(null).optional(),
  segments: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(80)), Joi.string().allow('', null))
    .optional(),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const experimentUpdateSchema = experimentPayloadSchema.fork(['name'], (schema) => schema.optional());

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0).map((entry) => entry.trim());
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
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

function buildExperimentPayload(payload, actorId) {
  return {
    name: payload.name,
    status: payload.status,
    ownerId: payload.ownerId ?? null,
    ownerEmail: payload.ownerEmail ?? null,
    hypothesis: payload.hypothesis ?? null,
    primaryMetric: payload.primaryMetric ?? null,
    baselineValue: payload.baselineValue ?? null,
    targetValue: payload.targetValue ?? null,
    startAt: payload.startAt ?? null,
    endAt: payload.endAt ?? null,
    segments: toArray(payload.segments),
    metadata: {
      ...toObject(payload.metadata),
      lastUpdatedBy: actorId ?? null
    },
    createdBy: actorId ?? null,
    updatedBy: actorId ?? null
  };
}

export default class AdminGrowthController {
  static async list(req, res, next) {
    try {
      const params = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const offset = (params.page - 1) * params.perPage;

      const [items, total] = await Promise.all([
        GrowthExperimentModel.list({
          search: params.search,
          status: params.status,
          limit: params.perPage,
          offset
        }),
        GrowthExperimentModel.count({ search: params.search, status: params.status })
      ]);

      return paginated(res, {
        data: items,
        message: 'Growth experiments retrieved',
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
      const payload = await experimentPayloadSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const actorId = req.user?.id ?? null;
      const record = await GrowthExperimentModel.create(buildExperimentPayload(payload, actorId));
      return created(res, { data: record, message: 'Growth experiment created' });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const payload = await experimentUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const record = await GrowthExperimentModel.updateById(
        Number(req.params.experimentId),
        buildExperimentPayload(payload, req.user?.id)
      );
      return success(res, { data: record, message: 'Growth experiment updated' });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req, res, next) {
    try {
      await GrowthExperimentModel.deleteById(Number(req.params.experimentId));
      return success(res, { message: 'Growth experiment deleted', status: 204 });
    } catch (error) {
      next(error);
    }
  }

  static async metrics(_req, res, next) {
    try {
      const now = new Date();
      const DAY = 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * DAY);

      const [statusCounts, enrollmentsCurrentRow, enrollmentsPreviousRow, completionsRow, ebookRow, ebookActiveRow, ebookCompletedRow, bookingsRow, newUsersRow, activeLearnersRow, previousLearnersRow] = await Promise.all([
        GrowthExperimentModel.countByStatus(),
        db('course_enrollments').count({ total: '*' }).where('created_at', '>=', thirtyDaysAgo).first(),
        db('course_enrollments')
          .count({ total: '*' })
          .where('created_at', '>=', sixtyDaysAgo)
          .andWhere('created_at', '<', thirtyDaysAgo)
          .first(),
        db('course_enrollments')
          .count({ total: '*' })
          .whereNotNull('completed_at')
          .andWhere('completed_at', '>=', thirtyDaysAgo)
          .first(),
        db('ebook_read_progress')
          .where('updated_at', '>=', thirtyDaysAgo)
          .avg({ avgProgress: 'progress_percent' })
          .first(),
        db('ebook_read_progress')
          .where('updated_at', '>=', thirtyDaysAgo)
          .countDistinct({ total: 'user_id' })
          .first(),
        db('ebook_read_progress')
          .where('updated_at', '>=', thirtyDaysAgo)
          .andWhere('progress_percent', '>=', 90)
          .count({ total: '*' })
          .first(),
        db('tutor_bookings')
          .where('scheduled_start', '>=', thirtyDaysAgo)
          .select({
            total: db.raw('COUNT(*)'),
            confirmed: db.raw("SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END)"),
            completed: db.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)")
          })
          .first(),
        db('users').count({ total: '*' }).where('created_at', '>=', thirtyDaysAgo).first(),
        db('course_progress as cp')
          .innerJoin('course_enrollments as ce', 'cp.enrollment_id', 'ce.id')
          .where('cp.updated_at', '>=', thirtyDaysAgo)
          .countDistinct({ total: 'ce.user_id' })
          .first(),
        db('course_progress as cp')
          .innerJoin('course_enrollments as ce', 'cp.enrollment_id', 'ce.id')
          .where('cp.updated_at', '>=', sixtyDaysAgo)
          .andWhere('cp.updated_at', '<', thirtyDaysAgo)
          .countDistinct({ total: 'ce.user_id' })
          .first()
      ]);

      const totalExperiments = Object.values(statusCounts).reduce((acc, value) => acc + value, 0);
      const activeExperiments = statusCounts.running ?? 0;
      const enrollmentsCurrent = Number(enrollmentsCurrentRow?.total ?? 0);
      const enrollmentsPrevious = Number(enrollmentsPreviousRow?.total ?? 0);
      const completions = Number(completionsRow?.total ?? 0);
      const ebookAvgProgress = Number(ebookRow?.avgProgress ?? 0);
      const ebookActiveReaders = Number(ebookActiveRow?.total ?? 0);
      const ebookCompletions = Number(ebookCompletedRow?.total ?? 0);
      const bookingsTotal = Number(bookingsRow?.total ?? 0);
      const bookingsConfirmed = Number(bookingsRow?.confirmed ?? 0);
      const bookingsCompleted = Number(bookingsRow?.completed ?? 0);
      const newUsers = Number(newUsersRow?.total ?? 0);
      const activeLearners = Number(activeLearnersRow?.total ?? 0);
      const previousLearners = Number(previousLearnersRow?.total ?? 0);

      const enrollmentGrowth = enrollmentsPrevious === 0
        ? (enrollmentsCurrent > 0 ? 100 : 0)
        : ((enrollmentsCurrent - enrollmentsPrevious) / enrollmentsPrevious) * 100;

      const retentionRate = previousLearners === 0
        ? 100
        : Number(((activeLearners / previousLearners) * 100).toFixed(2));

      const conversionRate = enrollmentsCurrent === 0
        ? 0
        : Number(((completions / enrollmentsCurrent) * 100).toFixed(2));

      return success(res, {
        data: {
          totalExperiments,
          activeExperiments,
          experimentsByStatus: statusCounts,
          learningVelocity: {
            enrollmentsCurrent,
            enrollmentsPrevious,
            growthRate: Number(enrollmentGrowth.toFixed(2))
          },
          ebookEngagement: {
            averageProgress: Number(ebookAvgProgress.toFixed(2)),
            activeReaders: ebookActiveReaders,
            completions: ebookCompletions
          },
          bookings: {
            total: bookingsTotal,
            confirmed: bookingsConfirmed,
            completed: bookingsCompleted
          },
          newUsersLast30d: newUsers,
          retentionRate,
          conversionRate
        },
        message: 'Growth metrics compiled'
      });
    } catch (error) {
      next(error);
    }
  }
}
