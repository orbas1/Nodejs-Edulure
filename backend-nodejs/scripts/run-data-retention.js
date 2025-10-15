import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import db from '../src/config/database.js';
import logger from '../src/config/logger.js';
import { enforceRetentionPolicies } from '../src/services/dataRetentionService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });

function parseArgs(argv) {
  const args = argv.slice(2);
  const config = {
    mode: null,
    verbose: false,
    help: false,
    alertThreshold: undefined
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      config.help = true;
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg === '--dry-run' || arg === '-d' || arg === '--simulate') {
      config.mode = 'simulate';
    } else if (arg.startsWith('--mode=')) {
      config.mode = arg.split('=')[1];
    } else if (arg.startsWith('--alert-threshold=')) {
      const value = Number(arg.split('=')[1]);
      if (!Number.isNaN(value) && value > 0) {
        config.alertThreshold = value;
      }
    }
  }

  return config;
}

function printHelp() {
  console.log(`Usage: node scripts/run-data-retention.js [options]\n\n` +
    `Options:\n` +
    `  -d, --dry-run, --simulate   Evaluate policies without mutating data\n` +
    `      --mode=<mode>          Explicitly set execution mode (commit|simulate)\n` +
    `      --alert-threshold=<n>  Trigger alerts when a policy affects >= n rows\n` +
    `  -v, --verbose              Print per-policy summaries\n` +
    `  -h, --help                 Show this help message\n`);
}

async function main() {
  const { mode, verbose, help, alertThreshold } = parseArgs(process.argv);

  if (help) {
    printHelp();
    return;
  }

  try {
    const summary = await enforceRetentionPolicies({
      mode,
      dryRun: mode === 'simulate',
      alertThreshold,
      onAlert: ({ runId, policy, result, mode: runMode }) => {
        logger.warn(
          {
            runId,
            policyId: policy.id,
            entityName: policy.entityName,
            affectedRows: result.affectedRows,
            mode: runMode
          },
          'Retention policy exceeded alert threshold'
        );
      }
    });
    const executed = summary.results.filter((policy) => policy.status === 'executed');
    const failed = summary.results.filter((policy) => policy.status === 'failed');

    logger.info(
      {
        runId: summary.runId,
        mode: summary.mode,
        dryRun: summary.dryRun,
        executedPolicies: executed.length,
        failedPolicies: failed.length
      },
      'Data retention suite completed'
    );

    if (verbose) {
      for (const policy of summary.results) {
        logger.info({ runId: summary.runId, policy }, 'Retention policy outcome');
      }
    }

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to run data retention suite');
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

main();
