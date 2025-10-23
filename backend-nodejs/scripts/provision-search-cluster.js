#!/usr/bin/env node
import '../src/config/env.js';

import logger from '../src/config/logger.js';
import { searchClusterService } from '../src/services/SearchClusterService.js';

async function run() {
  try {
    const start = Date.now();
    const status = await searchClusterService.start();
    if (status?.status === 'degraded') {
      throw new Error(status.message ?? 'Search provider initialisation failed');
    }
    await searchClusterService.refreshAll({ reason: 'provision-script' });
    const durationSeconds = (Date.now() - start) / 1000;
    logger.info({ durationSeconds }, 'Postgres search documents refreshed successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to prepare Postgres search provider');
    process.exitCode = 1;
  } finally {
    await searchClusterService.stop();
  }
}

run().catch((error) => {
  logger.error({ err: error }, 'Unexpected search provisioning failure');
  process.exitCode = 1;
});
