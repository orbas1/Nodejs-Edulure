import logger from '../config/logger.js';
import { bootstrapServices } from '../server.js';
import { getJobFeatureSnapshot } from '../config/featureFlags.js';

import {
  derivePresetConfiguration,
  normalizeJobGroupInput,
  normalizeTargetInput,
  parsePresetCli
} from '../../../scripts/lib/processSupervisor.mjs';

const cliOptions = parsePresetCli(process.argv.slice(2));
const featureSnapshot = getJobFeatureSnapshot();

const explicitTargets = normalizeTargetInput(cliOptions.serviceTarget ?? process.env.SERVICE_TARGET);
const explicitJobGroups = normalizeJobGroupInput(cliOptions.serviceJobGroups ?? process.env.SERVICE_JOB_GROUPS);
const requestedPreset = process.env.SERVICE_PRESET ?? cliOptions.preset;

const configuration = derivePresetConfiguration(requestedPreset, {
  featureSnapshot,
  explicitTargets,
  explicitJobGroups
});

process.env.SERVICE_PRESET = configuration.preset;

if (!explicitTargets?.length) {
  process.env.SERVICE_TARGET = configuration.env.SERVICE_TARGET;
}

if (!explicitJobGroups?.length) {
  if (configuration.env.SERVICE_JOB_GROUPS) {
    process.env.SERVICE_JOB_GROUPS = configuration.env.SERVICE_JOB_GROUPS;
  } else {
    delete process.env.SERVICE_JOB_GROUPS;
  }
}

logger.info(
  {
    preset: configuration.preset,
    targets: process.env.SERVICE_TARGET,
    jobGroups: process.env.SERVICE_JOB_GROUPS,
    requestedJobGroups: configuration.requestedJobGroups,
    disabledJobGroups: configuration.disabledJobGroups,
    unknownJobGroups: configuration.unknownJobGroups,
    features: featureSnapshot
  },
  'Resolved stack bootstrap configuration'
);

bootstrapServices()
  .then(() => {
    logger.info({
      preset: configuration.preset,
      targets: process.env.SERVICE_TARGET,
      jobGroups: process.env.SERVICE_JOB_GROUPS,
      requestedJobGroups: configuration.requestedJobGroups,
      disabledJobGroups: configuration.disabledJobGroups,
      unknownJobGroups: configuration.unknownJobGroups
    }, 'Stack services bootstrapped');
  })
  .catch((error) => {
    logger.fatal({ err: error }, 'Failed to bootstrap stack services');
    process.exit(1);
  });
