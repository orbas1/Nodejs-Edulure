import Joi from 'joi';

import videoPlaybackService from '../services/VideoPlaybackService.js';
import courseLiveService from '../services/CourseLiveService.js';
import realtimeService from '../services/RealtimeService.js';
import courseAccessService from '../services/CourseAccessService.js';
import lessonOfflineService from '../services/LessonOfflineService.js';
import { success } from '../utils/httpResponse.js';

const chatMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(1000).required()
});

const listChatSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50)
});

const offlineManifestQuerySchema = Joi.object({
  moduleSlug: Joi.string().trim().optional()
});

const progressStatuses = lessonOfflineService.getProgressStatuses();

const offlineQueueQuerySchema = Joi.object({
  status: Joi.alternatives()
    .try(
      Joi.array()
        .items(Joi.string().valid(...progressStatuses))
        .min(1),
      Joi.string().valid(...progressStatuses, 'all')
    )
    .optional()
});

const offlineProgressSchema = Joi.object({
  lessonId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().trim())
    .optional(),
  lessonSlug: Joi.string().trim().optional(),
  moduleId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().trim())
    .optional(),
  moduleSlug: Joi.string().trim().optional(),
  progressPercent: Joi.number().min(0).max(100).default(0),
  notes: Joi.string().allow('', null).default(null),
  status: Joi.string()
    .valid(...progressStatuses)
    .default('pending'),
  requiresReview: Joi.boolean().default(false),
  attempts: Joi.number().integer().min(0).default(0),
  lastAttemptAt: Joi.date().optional(),
  lastError: Joi.string().allow('', null).optional(),
  recordedAt: Joi.date().optional(),
  device: Joi.string().trim().optional(),
  attachments: Joi.array().items(Joi.object()).optional(),
  metadata: Joi.object().optional(),
  source: Joi.string().trim().optional(),
  localLogId: Joi.string().trim().optional(),
  appVersion: Joi.string().trim().optional(),
  networkQuality: Joi.string().trim().optional()
})
  .xor('lessonId', 'lessonSlug')
  .messages({
    'object.missing': 'Either lessonId or lessonSlug must be provided',
    'object.xor': 'Either lessonId or lessonSlug must be provided'
  });

const offlineProgressUpdateSchema = Joi.object({
  status: Joi.string().valid(...progressStatuses).optional(),
  progressPercent: Joi.number().min(0).max(100).optional(),
  requiresReview: Joi.boolean().optional(),
  attempts: Joi.number().integer().min(0).optional(),
  lastAttemptAt: Joi.date().optional(),
  lastError: Joi.string().allow('', null).optional(),
  markSynced: Joi.boolean().optional(),
  syncedAt: Joi.date().optional(),
  completedAt: Joi.date().optional(),
  metadata: Joi.object().optional(),
  payload: Joi.object().optional(),
  note: Joi.string().allow('', null).optional()
});

export default class CourseController {
  static async playerSession(req, res, next) {
    try {
      const courseId = String(req.params.courseId ?? '').trim();
      if (!courseId) {
        const error = new Error('Course identifier missing');
        error.status = 400;
        throw error;
      }
      await courseAccessService.ensureCourseAccess(courseId, req.user, { allowInvited: true });
      const session = videoPlaybackService.getPlaybackSession(courseId, req.user);
      return success(res, {
        data: session,
        message: 'Playback session issued'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async liveStatus(req, res, next) {
    try {
      const courseId = String(req.params.courseId ?? '').trim();
      if (!courseId) {
        const error = new Error('Course identifier missing');
        error.status = 400;
        throw error;
      }
      await courseAccessService.ensureCourseAccess(courseId, req.user, { allowInvited: true });
      const presence = courseLiveService.getPresence(courseId);
      return success(res, {
        data: {
          presence,
          playback: videoPlaybackService.getPlaybackSession(courseId, req.user).playback
        },
        message: 'Live session status fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async listLiveChat(req, res, next) {
    try {
      const courseId = String(req.params.courseId ?? '').trim();
      if (!courseId) {
        const error = new Error('Course identifier missing');
        error.status = 400;
        throw error;
      }
      const query = await listChatSchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      await courseAccessService.ensureCourseAccess(courseId, req.user, { allowInvited: true });
      const messages = courseLiveService.listMessages(courseId, { limit: query.limit });
      return success(res, {
        data: messages,
        message: 'Live chat fetched'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async postLiveChat(req, res, next) {
    try {
      const courseId = String(req.params.courseId ?? '').trim();
      if (!courseId) {
        const error = new Error('Course identifier missing');
        error.status = 400;
        throw error;
      }
      const payload = await chatMessageSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      await courseAccessService.ensureCourseAccess(courseId, req.user, {
        requireActiveEnrollment: true
      });
      const message = courseLiveService.postMessage(courseId, req.user, payload.body);
      realtimeService.broadcastCourseMessage(courseId, message);
      return success(res, {
        data: message,
        message: 'Message delivered',
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

  static async listOfflineManifests(req, res, next) {
    try {
      const courseId = String(req.params.courseId ?? '').trim();
      if (!courseId) {
        const error = new Error('Course identifier missing');
        error.status = 400;
        throw error;
      }
      const query = await offlineManifestQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const access = await courseAccessService.ensureCourseAccess(courseId, req.user, {
        allowInvited: true
      });
      const manifests = await lessonOfflineService.listCourseManifests(access.course.id, {
        moduleSlug: query.moduleSlug ?? null
      });
      return success(res, {
        data: manifests,
        message: 'Offline lesson manifests fetched'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async listOfflineProgress(req, res, next) {
    try {
      const courseId = String(req.params.courseId ?? '').trim();
      if (!courseId) {
        const error = new Error('Course identifier missing');
        error.status = 400;
        throw error;
      }
      const query = await offlineQueueQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const access = await courseAccessService.ensureCourseAccess(courseId, req.user, {
        requireActiveEnrollment: true
      });
      if (!access.enrollment) {
        const error = new Error('Offline progress is only available to learners');
        error.status = 403;
        throw error;
      }
      let statuses;
      if (Array.isArray(query.status)) {
        statuses = query.status;
      } else if (query.status && query.status !== 'all') {
        statuses = [query.status];
      }
      const queue = await lessonOfflineService.listProgressQueue(access.enrollment.id, {
        statuses
      });
      return success(res, {
        data: queue,
        message: 'Offline progress queue fetched'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async enqueueOfflineProgress(req, res, next) {
    try {
      const courseId = String(req.params.courseId ?? '').trim();
      if (!courseId) {
        const error = new Error('Course identifier missing');
        error.status = 400;
        throw error;
      }
      const payload = await offlineProgressSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const access = await courseAccessService.ensureCourseAccess(courseId, req.user, {
        requireActiveEnrollment: true
      });
      if (!access.enrollment) {
        const error = new Error('Offline progress is only available to learners');
        error.status = 403;
        throw error;
      }
      const entry = await lessonOfflineService.enqueueProgress(
        access.enrollment.id,
        access.course.id,
        payload
      );
      return success(res, {
        data: entry,
        message: 'Offline progress queued',
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

  static async updateOfflineProgress(req, res, next) {
    try {
      const courseId = String(req.params.courseId ?? '').trim();
      const taskId = String(req.params.taskId ?? '').trim();
      if (!courseId || !taskId) {
        const error = new Error('Offline progress task identifier missing');
        error.status = 400;
        throw error;
      }
      const payload = await offlineProgressUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const access = await courseAccessService.ensureCourseAccess(courseId, req.user, {
        requireActiveEnrollment: true
      });
      if (!access.enrollment) {
        const error = new Error('Offline progress is only available to learners');
        error.status = 403;
        throw error;
      }
      const updated = await lessonOfflineService.updateProgressTask(
        access.enrollment.id,
        taskId,
        payload
      );
      return success(res, {
        data: updated,
        message: 'Offline progress task updated'
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

