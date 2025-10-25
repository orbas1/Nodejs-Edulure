import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import expressRateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';

import { env } from './config/env.js';
import logger from './config/logger.js';
import { createCorsOriginValidator } from './config/corsPolicy.js';
import { healthcheck } from './config/database.js';
import errorHandler from './middleware/errorHandler.js';
import { success } from './utils/httpResponse.js';
import auth from './middleware/auth.js';
import requestContextMiddleware from './middleware/requestContext.js';
import runtimeConfigMiddleware from './middleware/runtimeConfig.js';
import { annotateLogContextFromRequest, httpMetricsMiddleware, metricsHandler } from './observability/metrics.js';
import { getServiceSpecDocument, getServiceSpecIndex } from './docs/serviceSpecRegistry.js';
import { storageDescriptor, storageBuckets, localStorageConfig } from './config/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openApiSpecPath = path.join(__dirname, 'docs/openapi.json');
let cachedOpenApiSpec;

function getOpenApiSpec() {
  if (!cachedOpenApiSpec) {
    cachedOpenApiSpec = JSON.parse(readFileSync(openApiSpecPath, 'utf8'));
  }

  return cachedOpenApiSpec;
}
const isTestEnvironment = process.env.NODE_ENV === 'test';

let swaggerUiPromise;
let swaggerUiSetupMiddleware;

function loadSwaggerUi() {
  if (!swaggerUiPromise) {
    swaggerUiPromise = import('swagger-ui-express').then((mod) => mod.default ?? mod);
  }

  return swaggerUiPromise;
}

function createSwaggerServeMiddleware() {
  return (req, res, next) => {
    loadSwaggerUi()
      .then((swaggerUi) => swaggerUi.serve(req, res, next))
      .catch(next);
  };
}

function createSwaggerSetupMiddleware() {
  return (req, res, next) => {
    loadSwaggerUi()
      .then((swaggerUi) => {
        if (!swaggerUiSetupMiddleware) {
          swaggerUiSetupMiddleware = swaggerUi.setup(getOpenApiSpec());
        }

        return swaggerUiSetupMiddleware(req, res, next);
      })
      .catch(next);
  };
}

let readinessReporter = () => ({
  service: 'web-service',
  ready: false,
  status: 'not_ready',
  timestamp: new Date().toISOString(),
  message: 'Readiness probe not initialised'
});

export function registerReadinessProbe(getStatus) {
  if (typeof getStatus === 'function') {
    readinessReporter = getStatus;
  }
}

export function getCurrentReadinessReport() {
  try {
    const report = readinessReporter();
    if (report && typeof report === 'object') {
      return report;
    }
  } catch (_error) {
    // fall through to default payload below
  }

  return {
    service: 'web-service',
    ready: false,
    status: 'not_ready',
    timestamp: new Date().toISOString(),
    message: 'Readiness probe not initialised'
  };
}

// NOTE: keep the versioned base path in sync with mountVersionedApi defaults
// so Stripe webhook requests retain their raw body for signature verification.
const STRIPE_WEBHOOK_ROUTE_SUFFIX = '/payments/webhooks/stripe';
const VERSIONED_API_BASE_PATH = '/api/v1';
const STRIPE_WEBHOOK_VERSIONED_ROUTE = `${VERSIONED_API_BASE_PATH}${STRIPE_WEBHOOK_ROUTE_SUFFIX}`;

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const limiter = expressRateLimit({
  windowMs: env.security.rateLimitWindowMinutes * 60 * 1000,
  max: env.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});

const corsPolicy = createCorsOriginValidator(env.app.corsOrigins, {
  allowDevelopmentOrigins: !env.isProduction
});

app.use(requestContextMiddleware);
app.use(runtimeConfigMiddleware);
if (!isTestEnvironment) {
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id ?? randomUUID(),
      customLogLevel: (res, err) => {
        if (err || res.statusCode >= 500) {
          return 'error';
        }
        if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },
      customProps: (req) => {
        annotateLogContextFromRequest(req);
        return {
          traceId: req.traceId,
          spanId: req.spanId
        };
      },
      autoLogging: {
        ignorePaths: ['/health']
      }
    })
  );
  app.use(httpMetricsMiddleware);
  app.use(limiter);
}
app.use(hpp());
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (corsPolicy.isOriginAllowed(origin)) {
        return callback(null, true);
      }

      const error = new Error(`Origin ${origin ?? '<unknown>'} not allowed by CORS policy`);
      error.status = 403;
      logger.warn({
        origin,
        policy: corsPolicy.describe()
      }, 'Request blocked by CORS policy');
      return callback(error);
    },
    credentials: true,
    optionsSuccessStatus: 200
  })
);
app.use(compression());
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl.startsWith(STRIPE_WEBHOOK_VERSIONED_ROUTE)) {
        req.rawBody = buf.toString();
      }
    }
  })
);
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

if (storageDescriptor.driver === 'local' && localStorageConfig?.serveStatic) {
  const storageRoot = localStorageConfig.root;
  app.use(
    '/storage/public',
    express.static(path.join(storageRoot, storageBuckets.public), {
      fallthrough: false,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    })
  );
  app.use(
    '/storage/uploads',
    auth(),
    express.static(path.join(storageRoot, storageBuckets.uploads), { fallthrough: false })
  );
  app.use(
    '/storage/private',
    auth(),
    express.static(path.join(storageRoot, storageBuckets.private), { fallthrough: false })
  );
}

app.get('/live', (_req, res) => {
  const payload = {
    service: 'web-service',
    alive: true,
    status: 'alive',
    checkedAt: new Date().toISOString()
  };
  return res.status(200).json(payload);
});

app.get('/ready', (_req, res) => {
  const report = readinessReporter();
  const ready = Boolean(report?.ready);
  const payload = {
    service: 'web-service',
    status: ready ? 'ready' : 'not_ready',
    checkedAt: new Date().toISOString(),
    ...(report && typeof report === 'object' ? report : {})
  };
  return res.status(ready ? 200 : 503).json(payload);
});

app.get('/health', async (_req, res, next) => {
  try {
    await healthcheck();
    return success(res, {
      data: {
        status: 'ok',
        timestamp: new Date().toISOString()
      },
      message: 'Service healthy'
    });
  } catch (error) {
    error.status = 503;
    return next(error);
  }
});

app.get('/metrics', metricsHandler);
if (!isTestEnvironment) {
  const [{ mountVersionedApi }, { apiRouteRegistry }] = await Promise.all([
    import('./routes/registerApiRoutes.js'),
    import('./routes/routeRegistry.js')
  ]);
  mountVersionedApi(app, { registry: apiRouteRegistry });

  const { createGraphQLRouter } = await import('./graphql/router.js');
  app.use('/api/v1/graphql', auth('user'), createGraphQLRouter());
}

app.get('/api/v1/docs/index.json', (_req, res) => {
  const specIndex = getServiceSpecIndex();
  const spec = getOpenApiSpec();

  res.json({
    version: spec.info?.version,
    generatedAt: new Date().toISOString(),
    services: specIndex
  });
});

app.get('/api/v1/docs/services', (_req, res) => {
  const specIndex = getServiceSpecIndex();

  res.json({
    count: specIndex.length,
    services: specIndex
  });
});

app.get('/api/v1/docs/services/:service', (req, res) => {
  const serviceParam = req.params.service;
  const serviceSpec = getServiceSpecDocument(serviceParam);
  if (!serviceSpec) {
    return res.status(404).json({
      success: false,
      message: `No OpenAPI document registered for service '${serviceParam}'.`
    });
  }

  return res.json(serviceSpec);
});

app.get('/api/v1/docs/services/:service/ui', async (req, res, next) => {
  const serviceParam = req.params.service;
  const serviceSpec = getServiceSpecDocument(serviceParam);
  if (!serviceSpec) {
    return res.status(404).json({
      success: false,
      message: `No OpenAPI document registered for service '${serviceParam}'.`
    });
  }

  const titleSuffix = serviceSpec.info?.title ? ` – ${serviceSpec.info.title}` : '';
  try {
    const swaggerUi = await loadSwaggerUi();
    const html = swaggerUi.generateHTML(serviceSpec, {
      customSiteTitle: `Edulure API Docs${titleSuffix}`
    });
    return res.send(html);
  } catch (error) {
    return next(error);
  }
});

app.use('/api/v1/docs', createSwaggerServeMiddleware(), createSwaggerSetupMiddleware());
app.get('/api/docs', (_req, res) => res.redirect(308, '/api/v1/docs'));

app.use(errorHandler);

export default app;
