import logger from '../config/logger.js';
import { bootstrapServices } from '../server.js';
import { resolveRuntimeToggles } from '../servers/runtimeToggles.js';
import { applyPresetDefaults, createLifecycleLogger } from '../../../scripts/lib/processSupervisor.mjs';

applyPresetDefaults({ env: process.env, mutate: true });

const toggles = resolveRuntimeToggles(process.env);
const lifecycleLogger = createLifecycleLogger({
  scope: 'stack-bin',
  pretty: process.stdout.isTTY
});

lifecycleLogger.log('info', 'Bootstrapping stack services', {
  preset: toggles.preset,
  serviceTarget: process.env.SERVICE_TARGET,
  jobGroups: process.env.SERVICE_JOB_GROUPS,
  enableJobs: process.env.SERVICE_ENABLE_JOBS,
  enableRealtime: process.env.SERVICE_ENABLE_REALTIME
});

bootstrapServices()
  .then(() => {
    logger.info({
      preset: toggles.preset,
      targets: process.env.SERVICE_TARGET,
      jobGroups: process.env.SERVICE_JOB_GROUPS,
      enableJobs: process.env.SERVICE_ENABLE_JOBS,
      enableRealtime: process.env.SERVICE_ENABLE_REALTIME
    }, 'Stack services bootstrapped');
    lifecycleLogger.log('success', 'Stack services bootstrapped', {
      preset: toggles.preset,
      serviceTarget: process.env.SERVICE_TARGET
    });
  })
  .catch((error) => {
    logger.fatal({ err: error }, 'Failed to bootstrap stack services');
    lifecycleLogger.log('error', 'Failed to bootstrap stack services', {
      error: error.message
    });
    process.exit(1);
  });
