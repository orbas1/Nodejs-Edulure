import fs from 'fs/promises';
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

const VALID_FORMATS = new Set(['text', 'json']);

function parseList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }

  return String(value)
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseVerifySchemaArgs(argv = process.argv) {
  const args = argv.slice(2);
  const config = {
    write: false,
    tables: null,
    baselinePath: null,
    includeIndexes: true,
    allowDrift: false,
    help: false,
    format: 'text',
    outputFile: null,
    schema: null
  };

  for (const arg of args) {
    if (arg === '--write' || arg === '-w') {
      config.write = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      config.help = true;
      continue;
    }

    if (arg === '--no-indexes') {
      config.includeIndexes = false;
      continue;
    }

    if (arg === '--allow-drift') {
      config.allowDrift = true;
      continue;
    }

    if (arg === '--json') {
      config.format = 'json';
      continue;
    }

    const [key, value] = arg.split('=');
    if (!value) {
      continue;
    }

    if (key === '--baseline') {
      config.baselinePath = value;
      continue;
    }

    if (key === '--tables') {
      config.tables = parseList(value);
      continue;
    }

    if (key === '--format' && VALID_FORMATS.has(value.toLowerCase())) {
      config.format = value.toLowerCase();
      continue;
    }

    if (key === '--output') {
      config.outputFile = value;
      continue;
    }

    if (key === '--schema') {
      config.schema = value;
      continue;
    }
  }

  return config;
}

export function printVerifySchemaHelp() {
  console.log(
    `Usage: node scripts/verify-schema-drift.js [options]\n\n` +
      `Options:\n` +
      `  -w, --write                 Refresh the baseline snapshot instead of verifying\n` +
      `      --baseline=<path>       Override the schema baseline file path\n` +
      `      --tables=a,b,c          Limit verification to specific tables\n` +
      `      --schema=<name>         Override the schema/database name\n` +
      `      --no-indexes            Skip index comparison during verification\n` +
      `      --allow-drift           Exit successfully even when drift is detected\n` +
      `      --format=<text|json>    Control CLI output format (default: text)\n` +
      `      --json                  Alias for --format=json\n` +
      `      --output=<path>         Write drift report to a file\n` +
      `  -h, --help                  Show this help message\n`
  );
}

function resolveBaselinePath(inputPath, fallbackPath) {
  if (inputPath) {
    return path.isAbsolute(inputPath) ? inputPath : path.resolve(projectRoot, inputPath);
  }
  return fallbackPath;
}

async function writeOutputFile(pathname, payload, { cwd = projectRoot, fileSystem = fs }) {
  if (!pathname) {
    return;
  }

  const resolved = path.isAbsolute(pathname) ? pathname : path.resolve(cwd, pathname);
  const serialised = `${JSON.stringify(payload, null, 2)}\n`;
  await fileSystem.mkdir(path.dirname(resolved), { recursive: true });
  await fileSystem.writeFile(resolved, serialised, 'utf8');
}

function renderTextResult({
  baselinePath,
  differences,
  summary,
  allowDrift,
  schema,
  tables,
  includeIndexes,
  loggerInstance,
  schemaGuard
}) {
  if (differences.length === 0) {
    loggerInstance.info({ baselinePath, schema, tables, includeIndexes }, 'Schema matches baseline definition');
    return;
  }

  loggerInstance.error(
    { baselinePath, schema, tables, includeIndexes, differences },
    `Schema drift detected:\n${summary}`
  );

  if (!allowDrift && (schemaGuard.failOnDrift ?? true)) {
    throw new Error('Schema drift detected');
  }
}

export async function executeVerifySchema(options, dependencies = {}) {
  const {
    dbClient = db,
    loggerInstance = logger,
    schemaEnv = env,
    fileSystem = fs,
    collect = collectSchemaMetadata,
    diff = diffSchemas,
    summarise = summariseDiffs,
    load = loadBaseline,
    write = writeBaseline
  } = dependencies;

  const schemaGuard = schemaEnv.dataGovernance?.schemaGuard ?? {};
  const baselinePath = resolveBaselinePath(options.baselinePath, schemaGuard.baselinePath);
  const tables = Array.isArray(options.tables) && options.tables.length > 0 ? options.tables : schemaGuard.monitoredTables;
  const includeIndexes = options.includeIndexes && schemaGuard.includeIndexes !== false;
  const schemaName = options.schema ?? schemaEnv.database.name;

  if (!baselinePath) {
    throw new Error('Schema baseline path could not be resolved. Provide DATA_GOVERNANCE_SCHEMA_BASELINE_PATH or --baseline.');
  }

  if (!tables || tables.length === 0) {
    throw new Error('No tables configured for schema verification.');
  }

  loggerInstance.info(
    { baselinePath, tables, includeIndexes, schema: schemaName, mode: options.write ? 'snapshot' : 'verify' },
    'Starting schema governance check'
  );

  const schemaSnapshot = await collect({
    knex: dbClient,
    schemaName,
    tables,
    includeIndexes
  });

  if (options.write) {
    await write(baselinePath, schemaSnapshot);
    loggerInstance.info({ baselinePath, schema: schemaName }, 'Schema baseline snapshot updated');
    if (options.outputFile) {
      await writeOutputFile(
        options.outputFile,
        {
          baselinePath,
          schema: schemaName,
          tables,
          includeIndexes,
          writtenAt: new Date().toISOString()
        },
        { fileSystem }
      );
    }
    return { baselinePath, tables, includeIndexes, schema: schemaName, differences: [] };
  }

  const baseline = await load(baselinePath);
  const differences = diff(baseline, schemaSnapshot);
  const summary = differences.length > 0 ? summarise(differences) : 'No differences';
  const format = VALID_FORMATS.has(options.format) ? options.format : 'text';

  const payload = {
    baselinePath,
    schema: schemaName,
    tables,
    includeIndexes,
    differences,
    summary,
    generatedAt: new Date().toISOString()
  };

  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    if (differences.length > 0 && !options.allowDrift && (schemaGuard.failOnDrift ?? true)) {
      throw new Error('Schema drift detected');
    }
  } else {
    renderTextResult({
      baselinePath,
      differences,
      summary,
      allowDrift: options.allowDrift,
      schema: schemaName,
      tables,
      includeIndexes,
      loggerInstance,
      schemaGuard
    });
  }

  if (options.outputFile) {
    await writeOutputFile(options.outputFile, payload, { fileSystem });
  }

  return payload;
}

async function main() {
  const options = parseVerifySchemaArgs(process.argv);

  if (options.help) {
    printVerifySchemaHelp();
    return;
  }

  try {
    await executeVerifySchema(options);
  } catch (error) {
    logger.error({ err: error }, 'Schema governance check failed');
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

const executedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executedDirectly) {
  main();
}

export default {
  parseVerifySchemaArgs,
  executeVerifySchema,
  printVerifySchemaHelp
};
