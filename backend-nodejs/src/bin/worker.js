import { startWorkerService } from '../servers/workerService.js';
import logger from '../config/logger.js';

startWorkerService()
  .then(() => {
    logger.info('Worker service bootstrap complete');
  })
  .catch((error) => {
    logger.fatal({ err: error }, 'Worker service failed to start');
    process.exit(1);
  });
