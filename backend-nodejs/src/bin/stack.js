import logger from '../config/logger.js';
import { bootstrapServices } from '../server.js';
import { resolveRuntimeToggles } from '../servers/runtimeToggles.js';
import {
  applyPresetDefaults,
  createLifecycleLogger,
  parsePresetArgs
} from '../../../scripts/lib/processSupervisor.mjs';

const parsed = parsePresetArgs(process.argv.slice(2));
const lifecycleLogger = createLifecycleLogger({
  scope: 'stack-bin',
  pretty: parsed.prettyLogsExplicit ? parsed.prettyLogs : process.stdout.isTTY
});

if (parsed.unknownArguments.length) {
  lifecycleLogger.log('warn', 'Ignoring unknown CLI arguments', {
    arguments: parsed.unknownArguments
  });
}

const { preset } = applyPresetDefaults({
  preset: parsed.preset,
  env: process.env,
  mutate: true,
  overrides: parsed.overrides
});

const toggles = resolveRuntimeToggles(process.env);

lifecycleLogger.log('info', 'Bootstrapping stack services', {
  preset: toggles.preset,
  resolvedPreset: preset,
  serviceTarget: process.env.SERVICE_TARGET,
  jobGroups: process.env.SERVICE_JOB_GROUPS,
  enableJobs: process.env.SERVICE_ENABLE_JOBS,
  enableRealtime: process.env.SERVICE_ENABLE_REALTIME,
  enableSearchRefresh: process.env.SERVICE_ENABLE_SEARCH_REFRESH
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
