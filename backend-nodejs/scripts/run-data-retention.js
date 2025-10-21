import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import db from '../src/config/database.js';
import logger from '../src/config/logger.js';
import {
  enforceRetentionPolicies,
  fetchActivePolicies
} from '../src/services/dataRetentionService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });

const VALID_MODES = new Set(['commit', 'simulate']);
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

function coercePositiveInteger(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }
  return Math.floor(numeric);
}

export function parseRunDataRetentionArgs(argv = process.argv, envVars = process.env) {
  const args = argv.slice(2);
  const defaults = {
    mode: envVars.DATA_RETENTION_MODE ?? null,
    verbose: envVars.DATA_RETENTION_VERBOSE === 'true',
    alertThreshold: coercePositiveInteger(envVars.DATA_RETENTION_ALERT_THRESHOLD),
    format: (envVars.DATA_RETENTION_OUTPUT_FORMAT ?? 'text').toLowerCase(),
    policyFile: envVars.DATA_RETENTION_POLICY_FILE ?? null,
    exitOnNoop: envVars.DATA_RETENTION_EXIT_ON_NOOP === 'true',
    policySelections: parseList(envVars.DATA_RETENTION_POLICIES)
  };

  const config = {
    mode: defaults.mode,
    verbose: defaults.verbose,
    help: false,
    alertThreshold: defaults.alertThreshold,
    format: VALID_FORMATS.has(defaults.format) ? defaults.format : 'text',
    outputFile: envVars.DATA_RETENTION_OUTPUT_PATH ?? null,
    policySelections: defaults.policySelections,
    policyFile: defaults.policyFile,
    exitOnNoop: defaults.exitOnNoop
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      config.help = true;
      continue;
    }

    if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
      continue;
    }

    if (arg === '--dry-run' || arg === '-d' || arg === '--simulate') {
      config.mode = 'simulate';
      continue;
    }

    if (arg === '--json') {
      config.format = 'json';
      continue;
    }

    if (arg === '--exit-on-noop') {
      config.exitOnNoop = true;
      continue;
    }

    if (arg === '--no-exit-on-noop') {
      config.exitOnNoop = false;
      continue;
    }

    const [key, rawValue] = arg.split('=');
    if (!rawValue) {
      continue;
    }

    if (key === '--mode') {
      config.mode = rawValue;
      continue;
    }

    if (key === '--alert-threshold') {
      const parsed = coercePositiveInteger(rawValue);
      if (parsed !== undefined) {
        config.alertThreshold = parsed;
      }
      continue;
    }

    if (key === '--format') {
      const normalised = rawValue.toLowerCase();
      if (VALID_FORMATS.has(normalised)) {
        config.format = normalised;
      }
      continue;
    }

    if (key === '--output') {
      config.outputFile = rawValue;
      continue;
    }

    if (key === '--policy-file') {
      config.policyFile = rawValue;
      continue;
    }

    if (key === '--policy') {
      config.policySelections = [...config.policySelections, rawValue];
      continue;
    }
  }

  return config;
}

export function printRunDataRetentionHelp() {
  console.log(
    `Usage: node scripts/run-data-retention.js [options]\n\n` +
      `Options:\n` +
      `  -d, --dry-run, --simulate      Evaluate policies without mutating data\n` +
      `      --mode=<mode>             Explicitly set execution mode (commit|simulate)\n` +
      `      --alert-threshold=<n>     Trigger alerts when a policy affects >= n rows\n` +
      `      --policy=<id|entity>      Execute a specific policy (repeatable)\n` +
      `      --policy-file=<path>      Load policy identifiers from a file (one per line)\n` +
      `      --format=<text|json>      Control CLI output format (default: text)\n` +
      `      --json                    Alias for --format=json\n` +
      `      --output=<path>           Write execution summary to a file\n` +
      `      --exit-on-noop            Exit with code 2 when no policies execute\n` +
      `      --no-exit-on-noop         Always exit with 0 when successful\n` +
      `  -v, --verbose                 Print per-policy summaries\n` +
      `  -h, --help                    Show this help message\n`
  );
}

async function readPolicyFile(policyFilePath, { cwd = projectRoot, fileSystem = fs } = {}) {
  if (!policyFilePath) {
    return [];
  }

  const resolved = path.isAbsolute(policyFilePath) ? policyFilePath : path.resolve(cwd, policyFilePath);
  try {
    const contents = await fileSystem.readFile(resolved, 'utf8');
    return contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
  } catch (error) {
    throw new Error(`Failed to read policy list from ${resolved}: ${error.message}`);
  }
}

function normalisePolicyIdentifier(value) {
  if (typeof value === 'number') {
    return String(value);
  }
  return String(value ?? '').trim();
}

async function resolvePolicySelection(policyIdentifiers, dependencies) {
  const identifiers = [...new Set(policyIdentifiers.map(normalisePolicyIdentifier).filter((entry) => entry.length > 0))];
  if (identifiers.length === 0) {
    return undefined;
  }

  const availablePolicies = await dependencies.fetchActivePolicies();
  const matches = [];
  const missing = new Set(identifiers);

  for (const policy of availablePolicies) {
    const id = normalisePolicyIdentifier(policy.id);
    const entity = normalisePolicyIdentifier(policy.entityName);
    if (missing.has(id) || missing.has(entity)) {
      matches.push(policy);
      missing.delete(id);
      missing.delete(entity);
    }
  }

  if (missing.size > 0) {
    throw new Error(`Unknown retention policies: ${Array.from(missing).join(', ')}`);
  }

  return matches;
}

function buildSummaryStatistics(summary) {
  const stats = {
    executed: 0,
    failed: 0,
    skipped: 0,
    total: summary.results.length,
    affectedRows: 0
  };

  for (const result of summary.results) {
    if (result.status === 'executed') {
      stats.executed += 1;
      stats.affectedRows += Number(result.affectedRows ?? 0);
    } else if (result.status === 'failed') {
      stats.failed += 1;
    } else {
      stats.skipped += 1;
    }
  }

  return stats;
}

function renderTextSummary(summary, stats, { verbose, log = logger }) {
  log.info(
    {
      runId: summary.runId,
      mode: summary.mode,
      dryRun: summary.dryRun,
      executedPolicies: stats.executed,
      failedPolicies: stats.failed,
      skippedPolicies: stats.skipped,
      affectedRows: stats.affectedRows
    },
    'Data retention suite completed'
  );

  if (verbose) {
    for (const policy of summary.results) {
      log.info({ runId: summary.runId, policy }, 'Retention policy outcome');
    }
  }
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

export async function executeRunDataRetention(options, dependencies = {}) {
  const {
    loggerInstance = logger,
    enforce = enforceRetentionPolicies,
    fetchPolicies = fetchActivePolicies,
    fileSystem = fs
  } = dependencies;

  const format = VALID_FORMATS.has(options.format) ? options.format : 'text';
  const mode = options.mode ? options.mode.toLowerCase() : null;

  if (mode && !VALID_MODES.has(mode)) {
    throw new Error(`Unsupported execution mode "${mode}". Allowed values: ${Array.from(VALID_MODES).join(', ')}`);
  }

  const policyIdentifiers = [...options.policySelections];
  if (options.policyFile) {
    const fromFile = await readPolicyFile(options.policyFile, { fileSystem });
    policyIdentifiers.push(...fromFile);
  }

  const policies = await resolvePolicySelection(policyIdentifiers, { fetchActivePolicies: fetchPolicies });

  const summary = await enforce({
    mode,
    dryRun: mode === 'simulate',
    alertThreshold: options.alertThreshold,
    policies,
    onAlert: ({ runId, policy, result, mode: runMode }) => {
      loggerInstance.warn(
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

  const stats = buildSummaryStatistics(summary);
  const payload = { ...summary, stats };

  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    renderTextSummary(summary, stats, { verbose: options.verbose, log: loggerInstance });
  }

  if (options.outputFile) {
    await writeOutputFile(options.outputFile, payload, { fileSystem });
  }

  return { summary, stats };
}

async function main() {
  const options = parseRunDataRetentionArgs(process.argv);

  if (options.help) {
    printRunDataRetentionHelp();
    return;
  }

  try {
    const { stats } = await executeRunDataRetention(options);
    if (stats.failed > 0) {
      process.exitCode = 1;
    } else if (options.exitOnNoop && stats.executed === 0) {
      process.exitCode = 2;
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to run data retention suite');
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
  parseRunDataRetentionArgs,
  executeRunDataRetention,
  printRunDataRetentionHelp
};
