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
      logger.info('Edulure search documents verified and healthy');
    } else {
      logger.warn('Skipping search health checks as requested');
    }

    if (values.snapshot) {
      const snapshot = await searchClusterService.createSnapshot();
      logger.info({ documents: snapshot?.documents ?? 0 }, 'Search snapshot state captured');
    }

    logger.info('Search service provisioning completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to provision Edulure search service');
    process.exitCode = 1;
  } finally {
    searchClusterService.stop();
  }
}

run().catch((error) => {
  logger.error({ err: error }, 'Unexpected search cluster provisioning failure');
  process.exitCode = 1;
});
