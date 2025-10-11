import Joi from 'joi';

import CommunityEngagementService from '../services/CommunityEngagementService.js';
import { success } from '../utils/httpResponse.js';

const awardPointsSchema = Joi.object({
  userId: Joi.number().integer().min(1).required(),
  points: Joi.number().integer().min(-10000).max(10000).invalid(0).required(),
  reason: Joi.string().max(240).optional(),
  source: Joi.string().max(120).optional(),
  referenceId: Joi.string().max(120).optional(),
  metadata: Joi.object().default({}),
  contributesToStreak: Joi.boolean().default(false),
  activityAt: Joi.date().optional(),
  timezone: Joi.string().optional()
});

const streakCheckInSchema = Joi.object({
  activityAt: Joi.date().optional(),
  timezone: Joi.string().optional()
});

const leaderboardQuerySchema = Joi.object({
  type: Joi.string().valid('points', 'lifetime', 'streak', 'attendance').default('points'),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

const eventQuerySchema = Joi.object({
  from: Joi.date().optional(),
  to: Joi.date().optional(),
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('scheduled', 'cancelled', 'completed').optional(),
  visibility: Joi.string().valid('members', 'admins', 'owners').optional(),
  order: Joi.string().valid('asc', 'desc').optional()
});

const createEventSchema = Joi.object({
  title: Joi.string().max(200).required(),
  slug: Joi.string().regex(/^[a-z0-9-]+$/).max(180).optional(),
  summary: Joi.string().max(500).allow('', null),
  description: Joi.string().max(8000).allow('', null),
  startAt: Joi.date().required(),
  endAt: Joi.date().required(),
  timezone: Joi.string().optional(),
  visibility: Joi.string().valid('members', 'admins', 'owners').default('members'),
  attendanceLimit: Joi.number().integer().min(1).max(10000).optional(),
  requiresRsvp: Joi.boolean().default(true),
  isOnline: Joi.boolean().default(false),
  meetingUrl: Joi.string().uri().allow(null, ''),
  locationName: Joi.string().max(200).allow(null, ''),
  locationAddress: Joi.string().max(500).allow(null, ''),
  locationLatitude: Joi.number().min(-90).max(90).allow(null),
  locationLongitude: Joi.number().min(-180).max(180).allow(null),
  coverImageUrl: Joi.string().uri().allow(null, ''),
  recurrenceRule: Joi.string().max(240).allow(null, ''),
  metadata: Joi.object().default({})
});

const rsvpSchema = Joi.object({
  status: Joi.string().valid('going', 'interested', 'waitlisted', 'declined', 'checked_in').default('going'),
  metadata: Joi.object().default({})
});

const reminderSchema = Joi.object({
  remindAt: Joi.date().required(),
  channel: Joi.string().valid('email', 'push', 'sms').default('email'),
  metadata: Joi.object().default({})
});

const calendarQuerySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).optional(),
  year: Joi.number().integer().min(2020).max(2100).optional(),
  visibility: Joi.string().valid('members', 'admins', 'owners').optional()
});

export default class CommunityEngagementController {
  static async awardPoints(req, res, next) {
    try {
      const payload = await awardPointsSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await CommunityEngagementService.awardPoints(
        req.params.communityId,
        req.user.id,
        payload
      );
      return success(res, {
        data: result,
        message: 'Member points updated',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async recordCheckIn(req, res, next) {
    try {
      const payload = await streakCheckInSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const streak = await CommunityEngagementService.recordCheckIn(
        req.params.communityId,
        req.user.id,
        payload
      );
      return success(res, {
        data: streak,
        message: 'Streak updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async getMyProgress(req, res, next) {
    try {
      const progress = await CommunityEngagementService.getMemberProgress(
        req.params.communityId,
        req.user.id
      );
      return success(res, {
        data: progress,
        message: 'Engagement profile fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async listLeaderboard(req, res, next) {
    try {
      const query = await leaderboardQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const leaderboard = await CommunityEngagementService.listLeaderboard(
        req.params.communityId,
        req.user.id,
        query
      );
      return success(res, {
        data: leaderboard,
        message: 'Leaderboard generated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async listEvents(req, res, next) {
    try {
      const query = await eventQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const events = await CommunityEngagementService.listEvents(
        req.params.communityId,
        req.user.id,
        query
      );
      return success(res, {
        data: events,
        message: 'Community events fetched'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async createEvent(req, res, next) {
    try {
      const payload = await createEventSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const event = await CommunityEngagementService.createEvent(
        req.params.communityId,
        req.user.id,
        payload
      );
      return success(res, {
        data: event,
        message: 'Event scheduled',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async rsvpEvent(req, res, next) {
    try {
      const payload = await rsvpSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const participant = await CommunityEngagementService.rsvpEvent(
        req.params.communityId,
        req.params.eventId,
        req.user.id,
        payload
      );
      return success(res, {
        data: participant,
        message: 'RSVP stored'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async scheduleReminder(req, res, next) {
    try {
      const payload = await reminderSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const reminder = await CommunityEngagementService.scheduleReminder(
        req.params.communityId,
        req.params.eventId,
        req.user.id,
        payload
      );
      return success(res, {
        data: reminder,
        message: 'Reminder scheduled',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async getCalendar(req, res, next) {
    try {
      const query = await calendarQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const calendar = await CommunityEngagementService.getCalendar(
        req.params.communityId,
        req.user.id,
        query
      );
      return success(res, {
        data: calendar,
        message: 'Community calendar compiled'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }
}
