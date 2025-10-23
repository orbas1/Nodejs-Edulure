import Joi from 'joi';

import adminAuditLogService from '../services/AdminAuditLogService.js';
import { success } from '../utils/httpResponse.js';

const listQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(25),
  since: Joi.date().iso().optional()
}).unknown(false);

function formatValidationError(error) {
  if (!error) {
    return null;
  }
  const validationError = new Error('Invalid audit log query parameters');
  validationError.status = 422;
  validationError.details = Array.isArray(error.details)
    ? error.details.map((detail) => detail.message)
    : error.message;
  return validationError;
}

export default class AdminAuditLogController {
  static async listRecent(req, res, next) {
    try {
      const { value, error } = listQuerySchema.validate(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });

      const validationError = formatValidationError(error);
      if (validationError) {
        return next(validationError);
      }

      const result = await adminAuditLogService.listRecent(value);
      return success(res, {
        data: result,
        message: 'Admin audit log feed generated'
      });
    } catch (err) {
      return next(err);
    }
  }
}
