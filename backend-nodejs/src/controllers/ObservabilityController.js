import Joi from 'joi';

import logger from '../config/logger.js';
import { getSloSummaries, getSloSummary } from '../observability/sloRegistry.js';
import { success } from '../utils/httpResponse.js';

const log = logger.child({ controller: 'ObservabilityController' });

const INCLUDE_DEFINITION_DEFAULT = true;

const booleanQuery = Joi.boolean()
  .truthy(['true', '1', 'yes', 'on'])
  .falsy(['false', '0', 'no', 'off'])
  .default(INCLUDE_DEFINITION_DEFAULT);

const listQuerySchema = Joi.object({
  includeDefinition: booleanQuery,
  includeDefinitions: booleanQuery
}).unknown(true);

const detailParamsSchema = Joi.object({
  sloId: Joi.string()
    .trim()
    .pattern(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]?$/i)
    .required()
    .messages({
      'string.pattern.base': 'sloId must contain only letters, numbers, or hyphen separators'
    })
});

class ObservabilityController {
  static sloSnapshots(req, res, next) {
    try {
      const { value, error } = listQuerySchema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
        throw error;
      }

      const includeDefinition =
        value.includeDefinition ?? value.includeDefinitions ?? INCLUDE_DEFINITION_DEFAULT;
      const payload = getSloSummaries({ includeDefinition });
      log.debug({ includeDefinition, count: payload.slo.length }, 'Generated SLO snapshots');

      return success(res, {
        data: payload,
        message: 'Service level objective snapshots generated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static sloDetail(req, res, next) {
    try {
      const { value: query, error: queryError } = listQuerySchema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      if (queryError) {
        queryError.status = 422;
        queryError.details = queryError.details.map((detail) => detail.message);
        throw queryError;
      }

      const { value: params, error: paramsError } = detailParamsSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (paramsError) {
        paramsError.status = 422;
        paramsError.details = paramsError.details.map((detail) => detail.message);
        throw paramsError;
      }

      const includeDefinition =
        query.includeDefinition ?? query.includeDefinitions ?? INCLUDE_DEFINITION_DEFAULT;
      const sloId = params.sloId;
      const snapshot = getSloSummary(sloId, { includeDefinition });

      if (!snapshot) {
        log.warn({ sloId }, 'Requested SLO not found');
        return res.status(404).json({
          success: false,
          message: `No service level objective registered with id "${sloId}"`
        });
      }

      log.debug({ sloId, status: snapshot.status }, 'Generated SLO detail snapshot');

      return success(res, {
        data: snapshot,
        message: 'Service level objective snapshot generated'
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default ObservabilityController;
