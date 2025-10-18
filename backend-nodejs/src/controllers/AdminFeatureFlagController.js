import Joi from 'joi';

import { featureFlagGovernanceService } from '../services/FeatureFlagGovernanceService.js';
import { success, created } from '../utils/httpResponse.js';

const snapshotQuerySchema = Joi.object({
  tenantId: Joi.string().trim().allow(null, '').optional(),
  environment: Joi.string().trim().lowercase().valid('development', 'staging', 'production').optional(),
  includeInactive: Joi.boolean().default(true)
});

const overrideBodySchema = Joi.object({
  tenantId: Joi.string().trim().required(),
  environment: Joi.string().trim().lowercase().valid('development', 'staging', 'production').default('production'),
  state: Joi.string().trim().required(),
  variantKey: Joi.string().trim().allow(null, '').optional(),
  notes: Joi.string().trim().allow(null, '').optional(),
  metadata: Joi.object().unknown(true).default({})
});

export default class AdminFeatureFlagController {
  static async snapshot(req, res, next) {
    try {
      const params = await snapshotQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const result = await featureFlagGovernanceService.generateTenantSnapshot({
        tenantId: params.tenantId || null,
        environment: params.environment,
        includeInactive: params.includeInactive,
        userContext: {
          userId: req.user?.id ?? null,
          role: req.user?.role ?? null,
          attributes: { source: 'admin-api' }
        }
      });

      return success(res, {
        data: result,
        message: 'Feature flag snapshot generated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async syncManifest(req, res, next) {
    try {
      const result = await featureFlagGovernanceService.syncDefinitions({
        actor: req.user?.email ?? req.user?.id ?? 'admin-api'
      });

      return success(res, {
        data: result,
        message: 'Feature flag manifest synchronised'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async applyOverride(req, res, next) {
    try {
      const params = await overrideBodySchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      const { flagKey } = req.params;
      const result = await featureFlagGovernanceService.applyTenantOverride({
        flagKey,
        tenantId: params.tenantId,
        environment: params.environment,
        state: params.state,
        variantKey: params.variantKey || null,
        metadata: params.metadata,
        notes: params.notes,
        actor: req.user?.email ?? req.user?.id ?? 'admin-api',
        userContext: {
          userId: req.user?.id ?? null,
          role: req.user?.role ?? null,
          attributes: { source: 'admin-api' }
        }
      });

      return created(res, {
        data: result,
        message: 'Tenant override applied'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async removeOverride(req, res, next) {
    try {
      const params = await overrideBodySchema
        .fork(['state'], (schema) => schema.optional())
        .fork(['metadata', 'notes', 'variantKey'], (schema) => schema.optional())
        .keys({ tenantId: Joi.string().trim().required() })
        .validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true
        });

      const { flagKey } = req.params;
      const result = await featureFlagGovernanceService.removeTenantOverride({
        flagKey,
        tenantId: params.tenantId,
        environment: params.environment,
        actor: req.user?.email ?? req.user?.id ?? 'admin-api',
        userContext: {
          userId: req.user?.id ?? null,
          role: req.user?.role ?? null,
          attributes: { source: 'admin-api' }
        }
      });

      return success(res, {
        data: result,
        message: 'Tenant override removed'
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
