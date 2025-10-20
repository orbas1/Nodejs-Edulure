import { Router } from 'express';

import logger from '../config/logger.js';
import { createFeatureFlagGate } from '../middleware/featureFlagGate.js';
import { createRouteErrorBoundary } from '../middleware/routeErrorBoundary.js';
import { describeRouteRegistry } from './registryValidator.js';

const DEFAULT_API_VERSION = 'v1';
const DEFAULT_API_PREFIX = '/api';

export function mountVersionedApi(app, {
  version = DEFAULT_API_VERSION,
  prefix = DEFAULT_API_PREFIX,
  registry,
  loggerInstance = logger,
  exposeLegacyRedirect
} = {}) {
  if (!Array.isArray(registry) || registry.length === 0) {
    throw new Error('mountVersionedApi requires a non-empty registry of route descriptors.');
  }
  const versionRouter = Router({ mergeParams: true });
  const versionBasePath = `${prefix}/${version}`;
  const mountedRoutes = [];

  for (const entry of registry) {
    if (!entry?.router || !entry.basePath) {
      continue;
    }

    const routeLogger = loggerInstance.child({
      component: 'api-router',
      route: entry.name,
      capability: entry.capability,
      version
    });

    const gate = createFeatureFlagGate({
      featureFlag: entry.flagKey,
      defaultState: entry.defaultState ?? 'disabled',
      fallbackStatus: entry.fallbackStatus ?? 404,
      fallbackMessage: entry.disabledMessage,
      responseBody: entry.responseBody,
      contextResolver: entry.contextResolver,
      evaluationOptions: entry.evaluationOptions,
      loggerInstance: routeLogger,
      metricsLabels: {
        route: `${versionBasePath}${entry.basePath}`,
        audience: entry.audience ?? 'public'
      },
      evaluator: entry.evaluator
    });

    const routerWithBoundary = Router({ mergeParams: true });
    routerWithBoundary.use(entry.router);
    routerWithBoundary.use(
      createRouteErrorBoundary({
        loggerInstance: routeLogger,
        scope: `api:${version}:${entry.name}`
      })
    );

    versionRouter.use(entry.basePath, gate, routerWithBoundary);

    mountedRoutes.push({
      name: entry.name,
      basePath: entry.basePath,
      path: `${versionBasePath}${entry.basePath}`,
      capability: entry.capability,
      flagKey: entry.flagKey,
      defaultState: entry.defaultState ?? 'disabled',
      audience: entry.audience ?? 'public'
    });
  }

  if (mountedRoutes.length === 0) {
    throw new Error('No routes were mounted. Ensure the registry contains valid route descriptors.');
  }

  loggerInstance.info(
    {
      component: 'api-router',
      version,
      routes: describeRouteRegistry(mountedRoutes)
    },
    'Mounted versioned API routes'
  );

  versionRouter.use(
    createRouteErrorBoundary({
      loggerInstance: loggerInstance.child({ component: 'api-router', version, scope: 'fallback' }),
      scope: `api:${version}:fallback`
    })
  );

  app.use(versionBasePath, versionRouter);

  const legacyEnvToggle = process.env.API_EXPOSE_LEGACY_REDIRECTS;
  const shouldExposeLegacy =
    typeof exposeLegacyRedirect === 'boolean'
      ? exposeLegacyRedirect
      : typeof legacyEnvToggle === 'string'
        ? legacyEnvToggle !== 'false'
        : process.env.NODE_ENV !== 'test';

  if (shouldExposeLegacy) {
    app.use(prefix, (req, res, next) => {
      if (req.originalUrl.startsWith(`${prefix}/${version}/`)) {
        return next();
      }
      return res.redirect(308, `${versionBasePath}${req.url}`);
    });
  } else {
    app.use(prefix, (req, res, next) => {
      if (req.originalUrl.startsWith(`${prefix}/${version}/`)) {
        return next();
      }
      return versionRouter(req, res, next);
    });
  }

  return mountedRoutes;
}

export default mountVersionedApi;
