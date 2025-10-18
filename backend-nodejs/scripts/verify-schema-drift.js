import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import db from '../src/config/database.js';
import { env } from '../src/config/env.js';
import logger from '../src/config/logger.js';
import {
  collectSchemaMetadata,
  diffSchemas,
  summariseDiffs,
  loadBaseline,
  writeBaseline
} from '../src/services/schemaGuardService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });

function parseArgs(argv) {
  const args = argv.slice(2);
  const config = {
    write: false,
    tables: null,
    baselinePath: null,
    includeIndexes: true,
    allowDrift: false
  };

  for (const arg of args) {
    if (arg === '--write' || arg === '-w') {
      config.write = true;
    } else if (arg.startsWith('--baseline=')) {
      config.baselinePath = arg.split('=')[1];
    } else if (arg.startsWith('--tables=')) {
      config.tables = arg
        .split('=')[1]
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    } else if (arg === '--no-indexes') {
      config.includeIndexes = false;
    } else if (arg === '--allow-drift') {
      config.allowDrift = true;
    }
  }

  return config;
}

function resolveBaselinePath(inputPath, fallbackPath) {
  if (inputPath) {
    return path.isAbsolute(inputPath) ? inputPath : path.resolve(projectRoot, inputPath);
  }
  return fallbackPath;
}

async function run() {
  const args = parseArgs(process.argv);
  const schemaGuard = env.dataGovernance?.schemaGuard ?? {};
  const baselinePath = resolveBaselinePath(args.baselinePath, schemaGuard.baselinePath);
  const tables = Array.isArray(args.tables) && args.tables.length > 0 ? args.tables : schemaGuard.monitoredTables;
  const includeIndexes = args.includeIndexes && schemaGuard.includeIndexes !== false;

  if (!baselinePath) {
    throw new Error('Schema baseline path could not be resolved. Provide DATA_GOVERNANCE_SCHEMA_BASELINE_PATH or --baseline.');
  }

  if (!tables || tables.length === 0) {
    throw new Error('No tables configured for schema verification.');
  }

  logger.info(
    { baselinePath, tables, includeIndexes, mode: args.write ? 'snapshot' : 'verify' },
    'Starting schema governance check'
  );

  const schemaSnapshot = await collectSchemaMetadata({
    knex: db,
    schemaName: env.database.name,
    tables,
    includeIndexes
  });

  if (args.write) {
    await writeBaseline(baselinePath, schemaSnapshot);
    logger.info({ baselinePath }, 'Schema baseline snapshot updated');
    return;
  }

  const baseline = await loadBaseline(baselinePath);
  const differences = diffSchemas(baseline, schemaSnapshot);

  if (differences.length === 0) {
    logger.info({ baselinePath }, 'Schema matches baseline definition');
    return;
  }

  const summary = summariseDiffs(differences);
  logger.error({ baselinePath, differences }, `Schema drift detected:\n${summary}`);

  if (!args.allowDrift && schemaGuard.failOnDrift !== false) {
    throw new Error('Schema drift detected');
  }
}

async function main() {
  try {
    await run();
  } catch (error) {
    logger.error({ err: error }, 'Schema governance check failed');
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

main();
