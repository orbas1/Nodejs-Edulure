import { startRealtimeServer } from '../servers/realtimeServer.js';
import logger from '../config/logger.js';

startRealtimeServer()
  .then(() => {
    logger.info('Realtime service bootstrap complete');
  })
  .catch((error) => {
    logger.fatal({ err: error }, 'Realtime service failed to start');
    process.exit(1);
  });
