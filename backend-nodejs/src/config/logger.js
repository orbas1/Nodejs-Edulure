import pino from 'pino';

import { env } from './env.js';

const logger = pino({
  level: env.logging.level,
  transport:
    env.isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true
          }
        }
      : undefined
});

export default logger;
