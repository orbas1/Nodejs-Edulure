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
import swaggerUi from 'swagger-ui-express';

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
import { mountVersionedApi } from './routes/registerApiRoutes.js';
import { apiRouteRegistry } from './routes/routeRegistry.js';
import { getServiceSpecDocument, getServiceSpecIndex } from './docs/serviceSpecRegistry.js';
import { createGraphQLRouter } from './graphql/router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openApiSpec = JSON.parse(readFileSync(path.join(__dirname, 'docs/openapi.json'), 'utf8'));
const serviceSpecIndex = getServiceSpecIndex();

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

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const limiter = expressRateLimit({
  windowMs: env.security.rateLimitWindowMinutes * 60 * 1000,
  max: env.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});

const corsPolicy = createCorsOriginValidator(env.app.corsOrigins);

app.use(requestContextMiddleware);
app.use(runtimeConfigMiddleware);
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
      if (req.originalUrl.startsWith('/api/payments/webhooks/stripe')) {
        req.rawBody = buf.toString();
      }
    }
  })
);
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

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
mountVersionedApi(app, { registry: apiRouteRegistry });
app.use('/api/v1/graphql', auth('user'), createGraphQLRouter());

app.get('/api/v1/docs/index.json', (_req, res) =>
  res.json({
    version: openApiSpec.info?.version,
    generatedAt: new Date().toISOString(),
    services: serviceSpecIndex
  })
);

app.get('/api/v1/docs/services', (_req, res) =>
  res.json({
    count: serviceSpecIndex.length,
    services: serviceSpecIndex
  })
);

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

app.get('/api/v1/docs/services/:service/ui', (req, res) => {
  const serviceParam = req.params.service;
  const serviceSpec = getServiceSpecDocument(serviceParam);
  if (!serviceSpec) {
    return res.status(404).json({
      success: false,
      message: `No OpenAPI document registered for service '${serviceParam}'.`
    });
  }

  const titleSuffix = serviceSpec.info?.title ? ` – ${serviceSpec.info.title}` : '';
  const html = swaggerUi.generateHTML(serviceSpec, {
    customSiteTitle: `Edulure API Docs${titleSuffix}`
  });
  return res.send(html);
});

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get('/api/docs', (_req, res) => res.redirect(308, '/api/v1/docs'));

app.use(errorHandler);

export default app;
