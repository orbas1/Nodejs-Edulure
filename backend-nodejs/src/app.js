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
import { healthcheck } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import communityRoutes from './routes/community.routes.js';
import contentRoutes from './routes/content.routes.js';
import runtimeConfigRoutes from './routes/runtimeConfig.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import chatRoutes from './routes/chat.routes.js';
import socialRoutes from './routes/social.routes.js';
import explorerRoutes from './routes/explorer.routes.js';
import adsRoutes from './routes/ads.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import courseRoutes from './routes/course.routes.js';
import adminRoutes from './routes/admin.routes.js';
import verificationRoutes from './routes/verification.routes.js';
import ebookRoutes from './routes/ebook.routes.js';
import errorHandler from './middleware/errorHandler.js';
import { success } from './utils/httpResponse.js';
import requestContextMiddleware from './middleware/requestContext.js';
import runtimeConfigMiddleware from './middleware/runtimeConfig.js';
import { annotateLogContextFromRequest, httpMetricsMiddleware, metricsHandler } from './observability/metrics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openApiSpec = JSON.parse(readFileSync(path.join(__dirname, 'docs/openapi.json'), 'utf8'));

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const limiter = expressRateLimit({
  windowMs: env.security.rateLimitWindowMinutes * 60 * 1000,
  max: env.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
});

const corsOrigins = new Set(env.app.corsOrigins);

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
      if (!origin || corsOrigins.has(origin)) {
        return callback(null, true);
      }
      const error = new Error(`Origin ${origin} not allowed by CORS policy`);
      error.status = 403;
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
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/runtime', runtimeConfigRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/explorer', explorerRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/ebooks', ebookRoutes);

app.use(errorHandler);

export default app;
