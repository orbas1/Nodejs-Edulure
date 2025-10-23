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
      const counts = await searchClusterService.checkClusterHealth();
      logger.info({ counts }, 'Explorer search documents verified');
    } else {
      logger.warn('Skipping explorer search document health checks as requested');
    }

    if (values.snapshot) {
      const task = await searchClusterService.createSnapshot();
      logger.info({ taskUid: task?.taskUid }, 'Explorer search document snapshot generated');
    }

    logger.info('Explorer search provisioning completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to provision explorer search documents');
    process.exitCode = 1;
  } finally {
    searchClusterService.stop();
  }
}

run().catch((error) => {
  logger.error({ err: error }, 'Unexpected explorer search provisioning failure');
  process.exitCode = 1;
});
