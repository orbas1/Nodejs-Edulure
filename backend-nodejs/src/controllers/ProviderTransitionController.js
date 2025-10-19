import Joi from 'joi';

import ProviderTransitionService from '../services/ProviderTransitionService.js';
import { success } from '../utils/httpResponse.js';

const listQuerySchema = Joi.object({
  tenantId: Joi.string().trim().max(120).allow(null, ''),
  includeDetails: Joi.boolean().default(false)
});

const acknowledgementSchema = Joi.object({
  organisationName: Joi.string().trim().min(2).max(200).required(),
  contactName: Joi.string().trim().min(2).max(160).required(),
  contactEmail: Joi.string().trim().email().required(),
  ackMethod: Joi.string().valid('portal', 'webinar', 'email', 'support').default('portal'),
  providerReference: Joi.string().trim().max(120).allow(null, ''),
  followUpRequired: Joi.boolean().default(false),
  followUpNotes: Joi.string().trim().max(500).allow(null, ''),
  metadata: Joi.object().unknown(true).default({}),
  acknowledgedAt: Joi.date().optional()
});

const statusUpdateSchema = Joi.object({
  providerReference: Joi.string().trim().max(120).allow(null, ''),
  statusCode: Joi.string()
    .valid('not-started', 'migration-in-progress', 'testing', 'blocked', 'completed', 'deferred')
    .required(),
  notes: Joi.string().trim().max(2000).allow(null, ''),
  recordedAt: Joi.date().optional()
});

function resolveTenantScope(req, fallback) {
  const queryTenant = req.query?.tenantId;
  const headerTenant = req.headers['x-tenant-id'];
  const userTenant = req.user?.tenantId;
  const candidate = queryTenant || headerTenant || userTenant || fallback;
  if (!candidate) {
    return 'global';
  }
  if (Array.isArray(candidate)) {
    return candidate;
  }
  const trimmed = candidate.toString().trim();
  if (!trimmed) {
    return 'global';
  }
  return trimmed;
}

export default class ProviderTransitionController {
  static service = new ProviderTransitionService({});

  static async list(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      const tenantScope = resolveTenantScope(req, query.tenantId);
      const announcements = await ProviderTransitionController.service.listActiveAnnouncements({
        tenantScope,
        includeDetails: query.includeDetails
      });
      return success(res, {
        data: announcements,
        message: 'Provider transition announcements fetched'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async show(req, res, next) {
    try {
      const tenantScope = resolveTenantScope(req);
      const detail = await ProviderTransitionController.service.getAnnouncementDetail(req.params.slug, {
        tenantScope
      });
      return success(res, {
        data: detail,
        message: 'Provider transition announcement detail fetched'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async acknowledge(req, res, next) {
    try {
      const payload = await acknowledgementSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const tenantScope = resolveTenantScope(req);
      const acknowledgement = await ProviderTransitionController.service.recordAcknowledgement(
        req.params.slug,
        payload,
        { tenantScope }
      );
      return success(res, {
        data: acknowledgement,
        message: 'Acknowledgement recorded',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async recordStatus(req, res, next) {
    try {
      const payload = await statusUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const tenantScope = resolveTenantScope(req);
      const update = await ProviderTransitionController.service.recordStatusUpdate(
        req.params.slug,
        payload,
        { tenantScope }
      );
      return success(res, {
        data: update,
        message: 'Status update recorded',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details?.map((d) => d.message);
      }
      return next(error);
    }
  }
}
