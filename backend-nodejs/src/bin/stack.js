import logger from '../config/logger.js';
import { bootstrapServices } from '../server.js';
import { resolveRuntimeToggles } from '../servers/runtimeToggles.js';

const toggles = resolveRuntimeToggles(process.env);
const hasCustomTargets = Boolean(process.env.SERVICE_TARGET);

if (!hasCustomTargets) {
  process.env.SERVICE_TARGET = 'web';
}

if (process.env.SERVICE_ENABLE_JOBS === undefined) {
  process.env.SERVICE_ENABLE_JOBS = String(toggles.enableJobs);
}

if (process.env.SERVICE_ENABLE_REALTIME === undefined) {
  process.env.SERVICE_ENABLE_REALTIME = String(toggles.enableRealtime);
}

if (process.env.SERVICE_JOB_GROUPS === undefined) {
  process.env.SERVICE_JOB_GROUPS = toggles.jobGroups;
}

bootstrapServices()
  .then(() => {
    logger.info({
      preset: toggles.preset,
      targets: process.env.SERVICE_TARGET,
      jobGroups: process.env.SERVICE_JOB_GROUPS,
      enableJobs: process.env.SERVICE_ENABLE_JOBS,
      enableRealtime: process.env.SERVICE_ENABLE_REALTIME
    }, 'Stack services bootstrapped');
  })
  .catch((error) => {
    logger.fatal({ err: error }, 'Failed to bootstrap stack services');
    process.exit(1);
  });
