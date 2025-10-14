import { startWebServer } from '../servers/webServer.js';
import logger from '../config/logger.js';

startWebServer()
  .then(() => {
    logger.info('Web service bootstrap complete');
  })
  .catch((error) => {
    logger.fatal({ err: error }, 'Web service failed to start');
    process.exit(1);
  });
