import logger from '../config/logger.js';
import { bootstrapServices } from '../server.js';
import { applyServicePreset } from '../utils/servicePreset.js';

const { preset, target, jobGroups } = applyServicePreset(process.env);

bootstrapServices()
  .then(() => {
    logger.info({
      preset,
      targets: target,
      jobGroups
    }, 'Stack services bootstrapped');
  })
  .catch((error) => {
    logger.fatal({ err: error }, 'Failed to bootstrap stack services');
    process.exit(1);
  });
