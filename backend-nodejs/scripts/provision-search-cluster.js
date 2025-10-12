#!/usr/bin/env node
import logger from '../src/config/logger.js';
import { searchClusterService } from '../src/services/SearchClusterService.js';

async function run() {
  const shouldSnapshot = process.argv.includes('--snapshot');

  try {
    await searchClusterService.bootstrap();
    await searchClusterService.checkClusterHealth();

    logger.info('Meilisearch explorer indexes verified and healthy');

    if (shouldSnapshot) {
      const task = await searchClusterService.createSnapshot();
      logger.info({ taskUid: task?.taskUid }, 'Meilisearch snapshot request completed');
    }

    logger.info('Search cluster provisioning completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Failed to provision Meilisearch cluster');
    process.exit(1);
  }
}

run();
