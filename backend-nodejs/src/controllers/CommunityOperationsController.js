import Joi from 'joi';

import CommunityOperationsService from '../services/CommunityOperationsService.js';
import { success } from '../utils/httpResponse.js';

const publishRunbookSchema = Joi.object({
  title: Joi.string().max(200).required(),
  summary: Joi.string().max(2000).allow('', null),
  owner: Joi.string().max(160).default('Operations team'),
  tags: Joi.array().items(Joi.string().trim().max(40)).max(12).default([]),
  automationReady: Joi.boolean().default(false),
  linkUrl: Joi.string().uri().allow('', null)
});

const acknowledgeEscalationSchema = Joi.object({
  note: Joi.string().max(500).allow('', null)
});

const scheduleEventSchema = Joi.object({
  title: Joi.string().max(200).required(),
  summary: Joi.string().max(1000).allow('', null),
  description: Joi.string().max(4000).allow('', null),
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().required(),
  timezone: Joi.string().max(60).allow('', null),
  attendanceLimit: Joi.number().integer().min(1).optional(),
  requiresRsvp: Joi.boolean().default(true),
  isOnline: Joi.boolean().default(false),
  meetingUrl: Joi.string().uri().allow('', null),
  locationName: Joi.string().max(200).allow('', null),
  locationAddress: Joi.string().max(500).allow('', null),
  locationLatitude: Joi.number().optional(),
  locationLongitude: Joi.number().optional(),
  coverImageUrl: Joi.string().uri().allow('', null),
  recurrenceRule: Joi.string().max(200).allow('', null),
  metadata: Joi.object().default({})
});

const manageTierSchema = Joi.object({
  name: Joi.string().max(150),
  description: Joi.string().max(1000).allow('', null),
  priceCents: Joi.number().integer().min(100).max(5_000_000),
  currency: Joi.string().length(3).uppercase(),
  billingInterval: Joi.string().valid('monthly', 'quarterly', 'annual', 'lifetime'),
  trialPeriodDays: Joi.number().integer().min(0).max(90),
  isActive: Joi.boolean(),
  benefits: Joi.array().items(Joi.string().max(180)).max(15),
  metadata: Joi.object(),
  slug: Joi.string().max(80)
}).min(1);

const resolveIncidentSchema = Joi.object({
  resolutionSummary: Joi.string().max(500).allow('', null),
  followUp: Joi.string().max(500).allow('', null)
});

const listIncidentsQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'in_review', 'escalated', 'suppressed', 'closed', 'resolved').optional(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  search: Joi.string().max(120).allow('', null),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(20)
});

export default class CommunityOperationsController {
  static async listIncidents(req, res, next) {
    try {
      const filters = await listIncidentsQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const incidents = await CommunityOperationsService.listIncidents(
        req.params.communityId,
        req.user.id,
        filters
      );
      return success(res, { data: incidents.items, meta: { pagination: incidents.pagination }, message: 'Safety incidents fetched' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async publishRunbook(req, res, next) {
    try {
      const payload = await publishRunbookSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const runbook = await CommunityOperationsService.publishRunbook(
        req.params.communityId,
        req.user.id,
        payload
      );
      return success(res, {
        data: runbook,
        message: 'Runbook published',
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

  static async acknowledgeEscalation(req, res, next) {
    try {
      const payload = await acknowledgeEscalationSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const escalation = await CommunityOperationsService.acknowledgeEscalation(
        req.params.communityId,
        req.user.id,
        req.params.caseId,
        payload
      );
      return success(res, {
        data: escalation,
        message: 'Escalation acknowledged'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async scheduleEvent(req, res, next) {
    try {
      const payload = await scheduleEventSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const event = await CommunityOperationsService.scheduleEvent(
        req.params.communityId,
        req.user.id,
        payload
      );
      return success(res, {
        data: event,
        message: 'Community event scheduled',
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

  static async manageTier(req, res, next) {
    try {
      const payload = await manageTierSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const tier = await CommunityOperationsService.manageTier(
        req.params.communityId,
        req.user.id,
        req.params.tierId,
        payload
      );
      return success(res, {
        data: tier,
        message: 'Paywall tier updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async resolveIncident(req, res, next) {
    try {
      const payload = await resolveIncidentSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const incident = await CommunityOperationsService.resolveIncident(
        req.params.communityId,
        req.user.id,
        req.params.caseId,
        payload
      );
      return success(res, {
        data: incident,
        message: 'Safety incident resolved'
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
