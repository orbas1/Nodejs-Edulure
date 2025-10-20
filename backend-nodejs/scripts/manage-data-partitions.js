#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import dotenv from 'dotenv';

import db from '../src/config/database.js';
import logger from '../src/config/logger.js';
import dataPartitionService from '../src/services/DataPartitionService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });

function printHelp() {
  console.log(`Usage: node scripts/manage-data-partitions.js [options]\n\n` +
    `Options:\n` +
    `  -d, --dry-run, --simulate   Evaluate partition policies without mutating data\n` +
    `      --commit, --apply      Force execution even if DATA_PARTITIONING_DRY_RUN=true\n` +
    `  -v, --verbose              Print per-policy summaries\n` +
    `      --json                 Print the rotation summary as JSON\n` +
    `  -h, --help                 Show this help message\n`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      'dry-run': { type: 'boolean' },
      simulate: { type: 'boolean' },
      commit: { type: 'boolean' },
      apply: { type: 'boolean' },
      verbose: { type: 'boolean', short: 'v', default: false },
      json: { type: 'boolean', default: false }
    }
  });

  if (values.help) {
    printHelp();
    return;
  }

  const explicitDryRun =
    values.commit || values.apply ? false : values['dry-run'] ?? values.simulate ?? null;
  const effectiveDryRun =
    explicitDryRun !== null ? explicitDryRun : dataPartitionService.config?.dryRun ?? false;

  try {
    const summary = await dataPartitionService.rotate({ dryRun: effectiveDryRun });
    const archived = summary.results
      .flatMap((result) => result.archived ?? [])
      .filter((entry) => entry.status === 'archived');

    const failedPolicies = summary.results.filter((result) => result.status === 'failed');

    logger.info(
      {
        runId: summary.runId,
        dryRun: summary.dryRun,
        policies: summary.results.length,
        archivedPartitions: archived.length,
        failedPolicies: failedPolicies.length
      },
      'Partition rotation completed'
    );

    if (values.verbose) {
      for (const result of summary.results) {
        logger.info({ policyId: result.policyId, ensured: result.ensured, archived: result.archived }, 'Partition policy outcome');
      }
    }

    if (values.json) {
      console.log(JSON.stringify(summary, null, 2));
    }

    if (failedPolicies.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to execute partition rotation');
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

main();
