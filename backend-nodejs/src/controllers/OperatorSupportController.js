import Joi from 'joi';

import { success } from '../utils/httpResponse.js';
import SupportOperationsService from '../services/SupportOperationsService.js';

let supportOperationsService;

function getSupportOperationsService() {
  if (!supportOperationsService) {
    supportOperationsService = new SupportOperationsService();
  }
  return supportOperationsService;
}

export function __setSupportOperationsService(instance) {
  supportOperationsService = instance;
}

const overviewQuerySchema = Joi.object({
  tenantId: Joi.string().max(64).optional()
});

const tenantTicketParamsSchema = Joi.object({
  tenantId: Joi.string().max(64).allow('default').optional(),
  ticketId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().max(64))
    .required()
});

const assignBodySchema = Joi.object({
  assigneeId: Joi.alternatives().try(Joi.string().max(160), Joi.number()).allow(null).optional()
});

const escalateBodySchema = Joi.object({
  reason: Joi.string().max(500).allow('', null).optional(),
  target: Joi.string().max(160).allow('', null).optional()
});

const resolveBodySchema = Joi.object({
  resolution: Joi.object({
    summary: Joi.string().max(500).allow('', null).optional(),
    resolvedBy: Joi.string().max(160).allow('', null).optional()
  })
    .default({})
    .optional()
});

const broadcastBodySchema = Joi.object({
  title: Joi.string().max(200).required(),
  message: Joi.string().max(2000).allow('', null).optional(),
  channel: Joi.string().valid('email', 'sms', 'push', 'in-app', 'in_app', 'inApp').default('in-app'),
  scheduledAt: Joi.date().iso().optional(),
  audienceSize: Joi.number().integer().min(0).allow(null).optional()
});

const updatePolicyParamsSchema = Joi.object({
  tenantId: Joi.string().max(64).allow('default').optional(),
  policyId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().max(64))
    .required()
});

const updatePolicyBodySchema = Joi.object({
  name: Joi.string().max(160).optional(),
  description: Joi.string().max(500).allow('', null).optional(),
  slaMinutes: Joi.number().integer().min(0).allow(null).optional(),
  channels: Joi.object().pattern(/.*/, Joi.boolean()).optional(),
  escalationTargets: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().max(160).required(),
        name: Joi.string().max(200).allow('', null).optional(),
        type: Joi.string().max(40).allow('', null).optional(),
        contact: Joi.string().max(200).allow('', null).optional()
      })
    )
    .optional()
});

function resolveTenantParam(reqTenantId, req) {
  if (!reqTenantId || reqTenantId === 'default') {
    return req.headers['x-tenant-id'] ?? req.user?.tenantId ?? null;
  }
  return reqTenantId;
}

function buildActorContext(user = {}) {
  const name = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    id: user.id ?? null,
    name: name.length ? name : user.name ?? null,
    email: user.email ?? null
  };
}

export default class OperatorSupportController {
  static async overview(req, res, next) {
    try {
      const params = await overviewQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const tenantId = params.tenantId ?? req.headers['x-tenant-id'] ?? req.user?.tenantId ?? null;
      const payload = await getSupportOperationsService().getOverview({ tenantId });

      return success(res, {
        data: payload,
        message: 'Support operations overview loaded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async listTenants(_req, res, next) {
    try {
      const tenants = await getSupportOperationsService().listTenants();
      return success(res, {
        data: tenants,
        message: 'Support operations tenants loaded'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async assignTicket(req, res, next) {
    try {
      const params = await tenantTicketParamsSchema.validateAsync(req.params ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const body = await assignBodySchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const payload = await getSupportOperationsService().assignTicket({
        tenantId: resolveTenantParam(params.tenantId, req),
        ticketId: params.ticketId,
        ...body,
        actor: buildActorContext(req.user)
      });

      return success(res, {
        data: payload,
        message: 'Support ticket assignment updated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async escalateTicket(req, res, next) {
    try {
      const params = await tenantTicketParamsSchema.validateAsync(req.params ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const body = await escalateBodySchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const payload = await getSupportOperationsService().escalateTicket({
        tenantId: resolveTenantParam(params.tenantId, req),
        ticketId: params.ticketId,
        ...body,
        actor: buildActorContext(req.user)
      });

      return success(res, {
        data: payload,
        message: 'Support ticket escalated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async resolveTicket(req, res, next) {
    try {
      const params = await tenantTicketParamsSchema.validateAsync(req.params ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const body = await resolveBodySchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const payload = await getSupportOperationsService().resolveTicket({
        tenantId: resolveTenantParam(params.tenantId, req),
        ticketId: params.ticketId,
        ...body,
        actor: buildActorContext(req.user)
      });

      return success(res, {
        data: payload,
        message: 'Support ticket resolved'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async scheduleBroadcast(req, res, next) {
    try {
      const params = await tenantTicketParamsSchema
        .fork('ticketId', (schema) => schema.optional())
        .validateAsync(req.params ?? {}, {
          abortEarly: false,
          stripUnknown: true
        });
      const body = await broadcastBodySchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const payload = await getSupportOperationsService().scheduleBroadcast({
        tenantId: resolveTenantParam(params.tenantId, req),
        payload: body,
        actor: buildActorContext(req.user)
      });

      return success(res, {
        data: { broadcast: payload },
        message: 'Support broadcast scheduled'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateNotificationPolicy(req, res, next) {
    try {
      const params = await updatePolicyParamsSchema.validateAsync(req.params ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const body = await updatePolicyBodySchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const payload = await getSupportOperationsService().updateNotificationPolicy({
        tenantId: resolveTenantParam(params.tenantId, req),
        policyId: params.policyId,
        updates: body,
        actor: buildActorContext(req.user)
      });

      return success(res, {
        data: payload,
        message: 'Support notification policy updated'
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

