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
}

