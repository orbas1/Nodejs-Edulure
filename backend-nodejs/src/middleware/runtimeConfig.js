import { env } from '../config/env.js';
import { featureFlagService, runtimeConfigService } from '../services/FeatureFlagService.js';

function buildBaseContext(req) {
  return {
    environment: env.nodeEnv,
    traceId: req.traceId ?? null,
    userId: req.user?.id ?? req.user?.sub ?? null,
    role: req.user?.role ?? req.user?.roles?.[0] ?? null,
    tenantId: req.user?.tenantId ?? req.headers['x-tenant-id'] ?? null,
    attributes: {
      region: req.headers['x-geo-country'] ?? null,
      appVersion: req.headers['x-app-version'] ?? null,
      platform: req.headers['x-platform'] ?? null
    }
  };
}

export default function runtimeConfigMiddleware(req, _res, next) {
  req.getFeatureFlag = (key, overrides = {}, options = {}) =>
    featureFlagService.evaluate(key, { ...buildBaseContext(req), ...overrides }, options);

  req.listFeatureFlags = (overrides = {}, options = {}) =>
    featureFlagService.evaluateAll({ ...buildBaseContext(req), ...overrides }, options);

  req.getRuntimeConfig = (key, options = {}) =>
    runtimeConfigService.getValue(key, {
      environment: options.environment ?? env.nodeEnv,
      audience: options.audience ?? 'public',
      includeSensitive: options.includeSensitive ?? false,
      defaultValue: options.defaultValue ?? null
    });

  req.listRuntimeConfig = (options = {}) =>
    runtimeConfigService.listForAudience(options.environment ?? env.nodeEnv, {
      audience: options.audience ?? 'public',
      includeSensitive: options.includeSensitive ?? false
    });

  return next();
}
