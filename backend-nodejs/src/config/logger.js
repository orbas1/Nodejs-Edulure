import pino from 'pino';

import { env } from './env.js';
import { getRequestContext } from '../observability/requestContext.js';

const defaultRedactions = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.token',
  'req.body.secret',
  'response.headers["set-cookie"]',
  'user.password',
  'payload.token',
  'payload.secret'
];

const redactionPaths = Array.from(new Set([...defaultRedactions, ...env.logging.redactedFields]));

const logger = pino({
  level: env.logging.level,
  base: {
    service: env.logging.serviceName,
    environment: env.nodeEnv
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: 'message',
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  redact: {
    paths: redactionPaths,
    censor: '***'
  },
  mixin() {
    const context = getRequestContext();
    if (!context) {
      return {};
    }

    return {
      traceId: context.traceId,
      spanId: context.spanId,
      userId: context.userId ?? undefined
    };
  },
  transport:
    env.isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard'
          }
        }
      : undefined
});

export default logger;
