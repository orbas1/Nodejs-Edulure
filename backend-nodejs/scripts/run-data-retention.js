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
  const args = new Set(argv.slice(2));
  return {
    dryRun: args.has('--dry-run') || args.has('-d'),
    verbose: args.has('--verbose') || args.has('-v'),
    help: args.has('--help') || args.has('-h')
  };
}

function printHelp() {
  console.log(`Usage: node scripts/run-data-retention.js [options]\n\n` +
    `Options:\n` +
    `  -d, --dry-run     Evaluate policies without mutating data\n` +
    `  -v, --verbose    Print per-policy summaries\n` +
    `  -h, --help       Show this help message\n`);
}

async function main() {
  const { dryRun, verbose, help } = parseArgs(process.argv);

  if (help) {
    printHelp();
    return;
  }

  try {
    const summary = await enforceRetentionPolicies({ dryRun });
    const executed = summary.results.filter((policy) => policy.status === 'executed');
    const failed = summary.results.filter((policy) => policy.status === 'failed');

    logger.info(
      {
        dryRun,
        executedPolicies: executed.length,
        failedPolicies: failed.length
      },
      'Data retention suite completed'
    );

    if (verbose) {
      for (const policy of summary.results) {
        logger.info({ policy }, 'Retention policy outcome');
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
