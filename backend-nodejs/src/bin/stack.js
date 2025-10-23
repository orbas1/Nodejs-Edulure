import logger from '../config/logger.js';
import { bootstrapServices } from '../server.js';

const preset = process.env.SERVICE_PRESET ?? 'lite';
const hasCustomTargets = Boolean(process.env.SERVICE_TARGET);

if (!hasCustomTargets) {
  if (preset === 'full' || preset === 'analytics') {
    process.env.SERVICE_TARGET = 'web,worker,realtime';
  } else {
    process.env.SERVICE_TARGET = 'web';
  }
}

if (preset === 'lite') {
  process.env.SERVICE_JOB_GROUPS = process.env.SERVICE_JOB_GROUPS ?? 'core';
}

bootstrapServices()
  .then(() => {
    logger.info({
      preset,
      targets: process.env.SERVICE_TARGET,
      jobGroups: process.env.SERVICE_JOB_GROUPS
    }, 'Stack services bootstrapped');
  })
  .catch((error) => {
    logger.fatal({ err: error }, 'Failed to bootstrap stack services');
    process.exit(1);
  });
