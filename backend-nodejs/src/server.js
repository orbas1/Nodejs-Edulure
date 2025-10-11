import app from './app.js';
import { env } from './config/env.js';
import logger from './config/logger.js';
import db from './config/database.js';
import assetIngestionService from './services/AssetIngestionService.js';
import dataRetentionJob from './jobs/dataRetentionJob.js';
import communityReminderJob from './jobs/communityReminderJob.js';
import { featureFlagService, runtimeConfigService } from './services/FeatureFlagService.js';

async function start() {
  try {
    await db.raw('select 1');
    await db.migrate.latest();
    logger.info('Database connected and migrations applied');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialise database');
    process.exit(1);
  }

  try {
    await Promise.all([featureFlagService.start(), runtimeConfigService.start()]);
  } catch (error) {
    logger.error({ err: error }, 'Failed to warm runtime configuration services');
    process.exit(1);
  }

  const port = env.app.port;
  app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
    assetIngestionService.start();
    dataRetentionJob.start();
    communityReminderJob.start();
  });

  const shutdown = () => {
    assetIngestionService.stop();
    dataRetentionJob.stop();
    communityReminderJob.stop();
    featureFlagService.stop();
    runtimeConfigService.stop();
    logger.info('Shutting down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start();
