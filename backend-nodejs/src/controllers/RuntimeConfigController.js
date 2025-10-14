import Joi from 'joi';

import { featureFlagService, runtimeConfigService } from '../services/FeatureFlagService.js';
import CapabilityManifestService from '../services/CapabilityManifestService.js';
import { env } from '../config/env.js';
import { success } from '../utils/httpResponse.js';

const snapshotQuerySchema = Joi.object({
  environment: Joi.string().valid('development', 'staging', 'production').optional(),
  audience: Joi.string().valid('public', 'ops', 'internal').default('public'),
  includeFlags: Joi.boolean().default(true),
  includeConfigs: Joi.boolean().default(true),
  includeSensitive: Joi.boolean().default(false)
});

const capabilityManifestService = new CapabilityManifestService();

export default class RuntimeConfigController {
  static async publicSnapshot(req, res, next) {
    try {
      const environment = env.nodeEnv;
      const baseContext = {
        environment,
        traceId: req.traceId ?? null,
        attributes: {
          region: req.headers['x-geo-country'] ?? null,
          appVersion: req.headers['x-app-version'] ?? null
        }
      };

      const payload = {
        environment,
        audience: 'public',
        generatedAt: new Date().toISOString(),
        featureFlags: featureFlagService.evaluateAll(baseContext),
        runtimeConfig: runtimeConfigService.listForAudience(environment, { audience: 'public' })
      };

      return success(res, {
        data: payload,
        message: 'Public runtime configuration snapshot generated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async userSnapshot(req, res, next) {
    try {
      const environment = env.nodeEnv;
      const baseContext = {
        environment,
        userId: req.user?.id ?? null,
        role: req.user?.role ?? null,
        tenantId: req.user?.tenantId ?? req.headers['x-tenant-id'] ?? null,
        traceId: req.traceId ?? null,
        attributes: {
          region: req.headers['x-geo-country'] ?? null,
          appVersion: req.headers['x-app-version'] ?? null
        }
      };

      const payload = {
        environment,
        audience: 'public',
        generatedAt: new Date().toISOString(),
        featureFlags: featureFlagService.evaluateAll(baseContext),
        runtimeConfig: runtimeConfigService.listForAudience(environment, { audience: 'public' })
      };

      return success(res, {
        data: payload,
        message: 'User-scoped runtime configuration snapshot generated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async snapshot(req, res, next) {
    try {
      const params = await snapshotQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const environment = params.environment ?? env.nodeEnv;
      const audience = params.audience;
      const includeSensitive = params.includeSensitive && audience !== 'public';

      const baseContext = {
        environment,
        userId: req.user?.id ?? null,
        role: req.user?.role ?? null,
        tenantId: req.user?.tenantId ?? req.headers['x-tenant-id'] ?? null,
        traceId: req.traceId ?? null,
        attributes: {
          region: req.headers['x-geo-country'] ?? null,
          appVersion: req.headers['x-app-version'] ?? null
        }
      };

      const response = {
        environment,
        audience,
        generatedAt: new Date().toISOString()
      };

      if (params.includeFlags) {
        response.featureFlags = featureFlagService.evaluateAll(baseContext);
      }

      if (params.includeConfigs) {
        response.runtimeConfig = runtimeConfigService.listForAudience(environment, {
          audience,
          includeSensitive
        });
      }

      return success(res, {
        data: response,
        message: 'Runtime configuration snapshot generated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async capabilityManifest(req, res, next) {
    try {
      const audience = req.user ? 'ops' : 'public';
      const userContext = {
        userId: req.user?.id ?? null,
        role: req.user?.role ?? null,
        tenantId: req.user?.tenantId ?? req.headers['x-tenant-id'] ?? null,
        traceId: req.traceId ?? null,
        attributes: {
          region: req.headers['x-geo-country'] ?? null,
          appVersion: req.headers['x-app-version'] ?? null,
          ip: req.ip ?? null
        }
      };

      const manifest = await capabilityManifestService.buildManifest({ audience, userContext });

      return success(res, {
        data: manifest,
        message: 'Capability manifest generated'
      });
    } catch (error) {
      return next(error);
    }
  }
}
