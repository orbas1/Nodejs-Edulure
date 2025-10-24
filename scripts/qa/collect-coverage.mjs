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
    pretty: true
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
}

main().catch((error) => {
  console.error(`Failed to generate coverage matrix: ${error.message}`);
  process.exit(1);
});
