import Joi from 'joi';

import videoPlaybackService from '../services/VideoPlaybackService.js';
import courseLiveService from '../services/CourseLiveService.js';
import realtimeService from '../services/RealtimeService.js';
import { success } from '../utils/httpResponse.js';

const chatMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(1000).required()
});

const listChatSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50)
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
}

