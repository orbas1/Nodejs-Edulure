#!/usr/bin/env node
import { parseArgs } from 'node:util';

import logger from '../src/config/logger.js';
import { searchClusterService } from '../src/services/SearchClusterService.js';

async function run() {
  const { values } = parseArgs({
    options: {
      snapshot: { type: 'boolean', default: false },
      'skip-health': { type: 'boolean', default: false }
    }
  });

  try {
    await searchClusterService.bootstrap();

    if (!values['skip-health']) {
      await searchClusterService.checkClusterHealth();
      logger.info('Meilisearch explorer indexes verified and healthy');
    } else {
      logger.warn('Skipping Meilisearch health checks as requested');
    }

    if (values.snapshot) {
      const task = await searchClusterService.createSnapshot();
      logger.info({ taskUid: task?.taskUid }, 'Meilisearch snapshot request completed');
    }

    logger.info('Search cluster provisioning completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to provision Meilisearch cluster');
    process.exitCode = 1;
  } finally {
    searchClusterService.stop();
  }
}

run().catch((error) => {
  logger.error({ err: error }, 'Unexpected search cluster provisioning failure');
  process.exitCode = 1;
});
