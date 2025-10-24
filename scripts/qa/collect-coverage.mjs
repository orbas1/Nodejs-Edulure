#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectCoverageMatrix } from './lib/coverage.js';
import { coveragePolicies, coverageTargets } from '../../qa/policies/testing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function parseArgs(argv) {
  const options = {
    output: 'qa/reports/coverage-matrix.json',
    pretty: true,
    persist: false,
    commit: undefined,
    branch: undefined,
    environment: undefined,
    runIdentifier: undefined,
    triggeredBy: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--output' || token === '-o') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --output option');
      }
      options.output = value;
      index += 1;
    } else if (token === '--compact') {
      options.pretty = false;
    } else if (token === '--persist') {
      options.persist = true;
    } else if (token === '--commit') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --commit option');
      }
      options.commit = value;
      index += 1;
    } else if (token === '--branch') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --branch option');
      }
      options.branch = value;
      index += 1;
    } else if (token === '--environment') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --environment option');
      }
      options.environment = value;
      index += 1;
    } else if (token === '--run-id') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --run-id option');
      }
      options.runIdentifier = value;
      index += 1;
    } else if (token === '--triggered-by') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --triggered-by option');
      }
      options.triggeredBy = value;
      index += 1;
    } else if (token === '--help' || token === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument '${token}'. Use --help to see available options.`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/qa/collect-coverage.mjs [options]\n\n` +
    `Options:\n` +
    `  -o, --output <path>   Write the coverage matrix JSON to the provided path (default: qa/reports/coverage-matrix.json)\n` +
    `      --compact        Emit minified JSON instead of formatted output\n` +
    `      --persist        Persist the coverage snapshot into qa_test_suite_runs\n` +
    `      --commit <sha>   Commit SHA associated with the coverage run when persisting\n` +
    `      --branch <name>  Branch name associated with the coverage run when persisting\n` +
    `      --environment <env> Environment label for persisted runs (default staging)\n` +
    `      --run-id <id>    Custom run identifier when persisting coverage\n` +
    `      --triggered-by <email> Actor responsible for the run when persisting\n` +
    `  -h, --help           Display this help message`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const matrix = await collectCoverageMatrix({
    repoRoot,
    targets: coverageTargets,
    policies: coveragePolicies
  });

  const outputPath = path.resolve(repoRoot, options.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const json = options.pretty ? JSON.stringify(matrix, null, 2) : JSON.stringify(matrix);
  await writeFile(outputPath, json, 'utf8');
  console.log(`Coverage matrix written to ${path.relative(repoRoot, outputPath)}`);

  if (options.persist) {
    const { default: QaReadinessService } = await import('../../backend-nodejs/src/services/QaReadinessService.js');
    try {
      await QaReadinessService.recordCoverageMatrix(matrix, {
        runIdentifier: options.runIdentifier ?? null,
        gitCommit: options.commit ?? process.env.GIT_COMMIT_SHA ?? null,
        gitBranch: options.branch ?? process.env.GIT_BRANCH ?? null,
        environment: options.environment ?? process.env.QA_ENVIRONMENT ?? 'staging',
        triggeredBy: options.triggeredBy ?? process.env.GIT_AUTHOR_EMAIL ?? null
      });
      console.log('Coverage matrix persisted to QA readiness tables.');
    } finally {
      if (typeof QaReadinessService.closeConnections === 'function') {
        await QaReadinessService.closeConnections();
      }
    }
  }
}

main().catch((error) => {
  console.error(`Failed to generate coverage matrix: ${error.message}`);
  process.exit(1);
});
