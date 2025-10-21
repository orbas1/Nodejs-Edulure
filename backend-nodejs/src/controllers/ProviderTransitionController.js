import Joi from 'joi';

import ProviderTransitionService from '../services/ProviderTransitionService.js';
import { success } from '../utils/httpResponse.js';

const listQuerySchema = Joi.object({
  tenantId: Joi.string()
    .trim()
    .pattern(/^[a-z0-9-]{2,120}$/i)
    .allow(null, '')
    .messages({ 'string.pattern.base': 'tenantId may only include letters, numbers, or hyphens' }),
  includeDetails: Joi.boolean()
    .truthy('true', '1', 'yes', 'on')
    .falsy('false', '0', 'no', 'off')
    .default(false)
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

const slugSchema = Joi.object({
  slug: Joi.string()
    .trim()
    .pattern(/^[a-z0-9][a-z0-9-]{2,120}$/i)
    .required()
    .messages({ 'string.pattern.base': 'slug must include only url-safe characters' })
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
      const { value: params, error } = slugSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
        throw error;
      }

      const tenantScope = resolveTenantScope(req);
      const detail = await ProviderTransitionController.service.getAnnouncementDetail(params.slug, {
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
      const { value: params, error: paramError } = slugSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (paramError) {
        paramError.status = 422;
        paramError.details = paramError.details.map((detail) => detail.message);
        throw paramError;
      }
      const payload = await acknowledgementSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const tenantScope = resolveTenantScope(req);
      const acknowledgement = await ProviderTransitionController.service.recordAcknowledgement(
        params.slug,
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
      const { value: params, error: paramError } = slugSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (paramError) {
        paramError.status = 422;
        paramError.details = paramError.details.map((detail) => detail.message);
        throw paramError;
      }
      const payload = await statusUpdateSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const tenantScope = resolveTenantScope(req);
      const update = await ProviderTransitionController.service.recordStatusUpdate(
        params.slug,
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
