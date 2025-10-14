import logger from './config/logger.js';
import { startWebServer } from './servers/webServer.js';

logger.warn(
  'src/server.js entrypoint is deprecated. Use package scripts start:web/start:worker/start:realtime for modular services.'
);

startWebServer()
  .then(() => {
    logger.info('Web service started via legacy entrypoint');
  })
  .catch((error) => {
    logger.fatal({ err: error }, 'Failed to start web service via legacy entrypoint');
    process.exit(1);
  });
