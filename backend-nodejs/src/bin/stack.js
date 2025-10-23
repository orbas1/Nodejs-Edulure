import logger from '../config/logger.js';
import { bootstrapServices } from '../server.js';
import { resolveServiceTargets, resolveRuntimeOptions } from '../servers/runtimeOptions.js';

const { preset, targets } = resolveServiceTargets({ envSource: process.env });
const hasCustomTargets = Boolean(process.env.SERVICE_TARGET);

if (!hasCustomTargets) {
  process.env.SERVICE_TARGET = targets.join(',');
}

const runtimeOptions = resolveRuntimeOptions({ envSource: process.env });

if (!process.env.SERVICE_JOB_GROUPS) {
  process.env.SERVICE_JOB_GROUPS = Array.from(runtimeOptions.jobGroups).join(',');
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
