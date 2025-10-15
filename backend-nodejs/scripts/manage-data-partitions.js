import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import db from '../src/config/database.js';
import logger from '../src/config/logger.js';
import dataPartitionService from '../src/services/DataPartitionService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });

function parseArgs(argv) {
  const args = argv.slice(2);
  const config = {
    dryRun: null,
    verbose: false,
    help: false
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      config.help = true;
    } else if (arg === '--dry-run' || arg === '--simulate' || arg === '-d') {
      config.dryRun = true;
    } else if (arg === '--commit' || arg === '--apply') {
      config.dryRun = false;
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    }
  }

  return config;
}

function printHelp() {
  console.log(`Usage: node scripts/manage-data-partitions.js [options]\n\n` +
    `Options:\n` +
    `  -d, --dry-run, --simulate   Evaluate partition policies without mutating data\n` +
    `      --commit, --apply      Force execution even if DATA_PARTITIONING_DRY_RUN=true\n` +
    `  -v, --verbose              Print per-policy summaries\n` +
    `  -h, --help                 Show this help message\n`);
}

async function main() {
  const { dryRun, verbose, help } = parseArgs(process.argv);

  if (help) {
    printHelp();
    return;
  }

  const effectiveDryRun = dryRun ?? dataPartitionService.config?.dryRun ?? false;

  try {
    const summary = await dataPartitionService.rotate({ dryRun: effectiveDryRun });
    const archived = summary.results
      .flatMap((result) => result.archived ?? [])
      .filter((entry) => entry.status === 'archived');

    logger.info(
      {
        runId: summary.runId,
        dryRun: summary.dryRun,
        policies: summary.results.length,
        archivedPartitions: archived.length
      },
      'Partition rotation completed'
    );

    if (verbose) {
      for (const result of summary.results) {
        logger.info({ policyId: result.policyId, ensured: result.ensured, archived: result.archived }, 'Partition policy outcome');
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to execute partition rotation');
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

main();
