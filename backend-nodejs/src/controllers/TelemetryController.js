import Joi from 'joi';
import { ZodError, z } from 'zod';

import telemetryIngestionService from '../services/TelemetryIngestionService.js';
import telemetryWarehouseService from '../services/TelemetryWarehouseService.js';
import TelemetryFreshnessMonitorModel from '../models/TelemetryFreshnessMonitorModel.js';

const consentRequestSchema = z.object({
  consentScope: z.string().min(1, 'consentScope is required'),
  consentVersion: z.string().min(1).optional(),
  status: z.enum(['granted', 'revoked', 'expired']).default('granted'),
  tenantId: z.string().min(1).optional(),
  userId: z.coerce.number().int().positive().optional(),
  expiresAt: z.coerce.date().optional(),
  metadata: z.record(z.any()).optional(),
  evidence: z.record(z.any()).optional()
});

const freshnessQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50)
});

function resolveTenantId(req, explicitTenantId) {
  if (explicitTenantId) {
    return explicitTenantId;
  }
  if (req.user?.tenantId) {
    return req.user.tenantId;
  }
  const headerTenant = req.headers['x-tenant-id'];
  return typeof headerTenant === 'string' && headerTenant.trim() ? headerTenant.trim() : 'global';
}

function sanitiseEventResponse(event) {
  if (!event) {
    return null;
  }
  return {
    id: event.id,
    eventUuid: event.eventUuid,
    eventName: event.eventName,
    eventSource: event.eventSource,
    consentScope: event.consentScope,
    consentStatus: event.consentStatus,
    ingestionStatus: event.ingestionStatus,
    occurredAt: event.occurredAt,
    receivedAt: event.receivedAt,
    createdAt: event.createdAt
  };
}

export default class TelemetryController {
  static async ingestEvent(req, res, next) {
    try {
      const result = await telemetryIngestionService.ingestEvent(req.body, {
        actorId: req.user?.id ?? null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      const statusCode = result.duplicate ? 200 : 202;
      return res.status(statusCode).json({
        status: result.event.ingestionStatus,
        duplicate: result.duplicate,
        suppressed: result.suppressed,
        consentStatus: result.event.consentStatus,
        event: sanitiseEventResponse(result.event)
      });
    } catch (error) {
      if (error instanceof ZodError) {
        error.status = 422;
        error.details = error.errors.map((issue) => issue.message);
      }
      return next(error);
    }
  }

  static async recordConsentDecision(req, res, next) {
    try {
      const parsed = consentRequestSchema.parse(req.body ?? {});
      const tenantId = resolveTenantId(req, parsed.tenantId);
      const userId = parsed.userId ?? req.user?.id;

      if (!userId) {
        const error = new Error('userId is required to record telemetry consent');
        error.status = 400;
        throw error;
      }

      const record = await telemetryIngestionService.registerConsentDecision({
        userId,
        tenantId,
        consentScope: parsed.consentScope,
        consentVersion: parsed.consentVersion ?? telemetryIngestionService.config.consentDefaultVersion,
        status: parsed.status,
        recordedBy: req.user?.id ?? 'system',
        expiresAt: parsed.expiresAt,
        metadata: parsed.metadata ?? {},
        evidence: parsed.evidence ?? {}
      });

      return res.status(201).json({ consent: record });
    } catch (error) {
      if (error instanceof ZodError) {
        error.status = 422;
        error.details = error.errors.map((issue) => issue.message);
      }
      return next(error);
    }
  }

  static async listFreshness(req, res, next) {
    try {
      const { value, error } = freshnessQuerySchema.validate(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
        throw error;
      }

      const monitors = await TelemetryFreshnessMonitorModel.listSnapshots({ limit: value.limit });
      return res.json({ monitors });
    } catch (error) {
      return next(error);
    }
  }

  static async triggerExport(req, res, next) {
    try {
      const summary = await telemetryWarehouseService.exportPendingEvents({ trigger: 'api' });
      const statusCode = summary.status === 'exported' ? 202 : 200;
      return res.status(statusCode).json(summary);
    } catch (error) {
      return next(error);
    }
  }
}
