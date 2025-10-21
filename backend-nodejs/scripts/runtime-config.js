import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import db from '../src/config/database.js';
import logger from '../src/config/logger.js';
import { env } from '../src/config/env.js';
import { featureFlagService, runtimeConfigService } from '../src/services/FeatureFlagService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });

const audienceOptions = new Set(['public', 'ops', 'internal']);
const VALID_FORMATS = new Set(['log', 'json']);

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

export function parseRuntimeConfigArgs(argv = process.argv, envVars = process.env) {
  const args = argv.slice(2);

  const defaults = {
    environment: envVars.RUNTIME_ENVIRONMENT ?? env.nodeEnv,
    audience: envVars.RUNTIME_AUDIENCE ?? 'ops',
    includeSensitive: envVars.RUNTIME_INCLUDE_SENSITIVE === 'true',
    includeFlags: envVars.RUNTIME_INCLUDE_FLAGS !== 'false',
    includeConfigs: envVars.RUNTIME_INCLUDE_CONFIGS !== 'false',
    format: (envVars.RUNTIME_OUTPUT_FORMAT ?? 'log').toLowerCase(),
    outputFile: envVars.RUNTIME_OUTPUT_PATH ?? null,
    flags: parseList(envVars.RUNTIME_FLAGS),
    configs: parseList(envVars.RUNTIME_CONFIGS),
    strict: envVars.RUNTIME_STRICT === 'true',
    maskSensitive: envVars.RUNTIME_MASK_SENSITIVE !== 'false'
  };

  const options = {
    environment: defaults.environment,
    audience: defaults.audience,
    includeSensitive: defaults.includeSensitive,
    includeFlags: defaults.includeFlags,
    includeConfigs: defaults.includeConfigs,
    format: VALID_FORMATS.has(defaults.format) ? defaults.format : 'log',
    outputFile: defaults.outputFile,
    flags: [...defaults.flags],
    configs: [...defaults.configs],
    strict: defaults.strict,
    maskSensitive: defaults.maskSensitive,
    help: false
  };

  for (const arg of args) {
    if (!arg.startsWith('--')) {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--json') {
      options.format = 'json';
      continue;
    }

    if (arg === '--no-flags') {
      options.includeFlags = false;
      continue;
    }

    if (arg === '--no-configs') {
      options.includeConfigs = false;
      continue;
    }

    if (arg === '--include-sensitive') {
      options.includeSensitive = true;
      continue;
    }

    if (arg === '--no-mask-sensitive') {
      options.maskSensitive = false;
      continue;
    }

    if (arg === '--mask-sensitive') {
      options.maskSensitive = true;
      continue;
    }

    if (arg === '--strict') {
      options.strict = true;
      continue;
    }

    const [key, value] = arg.split('=');
    if (!value) {
      continue;
    }

    if (key === '--environment') {
      options.environment = value;
      continue;
    }

    if (key === '--audience' && audienceOptions.has(value)) {
      options.audience = value;
      continue;
    }

    if (key === '--format' && VALID_FORMATS.has(value.toLowerCase())) {
      options.format = value.toLowerCase();
      continue;
    }

    if (key === '--output') {
      options.outputFile = value;
      continue;
    }

    if (key === '--flag') {
      options.flags.push(value);
      continue;
    }

    if (key === '--config') {
      options.configs.push(value);
      continue;
    }
  }

  return options;
}

export function printRuntimeConfigHelp() {
  console.log(
    `Usage: node scripts/runtime-config.js [options]\n\n` +
      `Options:\n` +
      `  --environment=<env>          Override the environment used for evaluation (default: current env)\n` +
      `  --audience=<public|ops|internal>  Exposure audience to evaluate (default: ops)\n` +
      `  --include-sensitive          Include sensitive/private values (requires internal audience)\n` +
      `  --mask-sensitive             Mask sensitive values in CLI output (default: enabled)\n` +
      `  --no-mask-sensitive          Show raw values when allowed\n` +
      `  --flag=<key>                 Filter to a specific feature flag (repeatable)\n` +
      `  --config=<key>               Filter to a specific runtime config entry (repeatable)\n` +
      `      --strict                 Fail if any requested keys are missing\n` +
      `      --format=<log|json>      Control CLI output format (default: log)\n` +
      `      --json                   Alias for --format=json\n` +
      `      --output=<path>          Write snapshot to a file\n` +
      `      --no-flags               Skip feature flag evaluation\n` +
      `      --no-configs             Skip runtime configuration entries\n` +
      `  -h, --help                   Show this help message\n`
  );
}

function maskSensitiveValues(runtimeConfig, maskEnabled) {
  if (!runtimeConfig || !maskEnabled) {
    return runtimeConfig;
  }

  const masked = {};
  for (const [key, entry] of Object.entries(runtimeConfig)) {
    if (!entry) {
      continue;
    }
    if (entry.sensitive) {
      masked[key] = { ...entry, value: '***', masked: true };
    } else {
      masked[key] = { ...entry };
    }
  }
  return masked;
}

function filterKeys(source, keys, { strict, loggerInstance = logger, type }) {
  if (!source) {
    return { filtered: undefined, missing: keys.length > 0 ? [...keys] : [] };
  }

  if (!keys || keys.length === 0) {
    return { filtered: source, missing: [] };
  }

  const lowerCaseKeys = new Map(keys.map((key) => [key.toLowerCase(), key]));
  const filtered = {};
  const found = new Set();

  for (const [key, value] of Object.entries(source)) {
    if (lowerCaseKeys.has(key.toLowerCase())) {
      filtered[key] = value;
      found.add(lowerCaseKeys.get(key.toLowerCase()));
    }
  }

  const missing = keys.filter((key) => !found.has(key));
  if (missing.length > 0) {
    const message = `${type} keys not found: ${missing.join(', ')}`;
    if (strict) {
      throw new Error(message);
    }
    loggerInstance.warn(message);
  }

  return { filtered, missing };
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

function buildSnapshotOutput(snapshot, stats, { maskSensitiveValues: maskFn, maskSensitive, format }) {
  const runtimeConfig = maskFn(snapshot.runtimeConfig, maskSensitive);
  return {
    ...snapshot,
    runtimeConfig,
    stats,
    outputFormat: format
  };
}

export async function executeRuntimeConfig(options, dependencies = {}) {
  const {
    dbClient = db,
    featureFlags = featureFlagService,
    runtimeConfigs = runtimeConfigService,
    loggerInstance = logger,
    fileSystem = fs
  } = dependencies;

  if (!audienceOptions.has(options.audience)) {
    throw new Error(`Unsupported audience "${options.audience}". Allowed values: ${Array.from(audienceOptions).join(', ')}`);
  }

  if (options.includeSensitive && options.audience !== 'internal') {
    throw new Error('Sensitive values can only be included for the internal audience.');
  }

  const format = VALID_FORMATS.has(options.format) ? options.format : 'log';

  await dbClient.migrate.latest();
  await Promise.all([featureFlags.start(), runtimeConfigs.start()]);

  try {
    const snapshot = {
      environment: options.environment,
      audience: options.audience,
      generatedAt: new Date().toISOString()
    };

    const context = { environment: options.environment };

    if (options.includeFlags) {
      const evaluations = featureFlags.evaluateAll(context, { includeDefinition: true });
      const { filtered, missing } = filterKeys(evaluations, options.flags, {
        strict: options.strict,
        loggerInstance,
        type: 'Feature flag'
      });
      snapshot.featureFlags = filtered ?? {};
      snapshot.missingFlags = missing;
    }

    if (options.includeConfigs) {
      const configs = runtimeConfigs.listForAudience(options.environment, {
        audience: options.audience,
        includeSensitive: options.includeSensitive
      });
      const { filtered, missing } = filterKeys(configs, options.configs, {
        strict: options.strict,
        loggerInstance,
        type: 'Runtime config'
      });
      snapshot.runtimeConfig = filtered ?? {};
      snapshot.missingConfigs = missing;
    }

    const stats = {
      featureFlagCount: Object.keys(snapshot.featureFlags ?? {}).length,
      runtimeConfigCount: Object.keys(snapshot.runtimeConfig ?? {}).length
    };

    const outputPayload = buildSnapshotOutput(snapshot, stats, {
      maskSensitiveValues,
      maskSensitive: options.maskSensitive,
      format
    });

    if (format === 'json') {
      console.log(JSON.stringify(outputPayload, null, 2));
    } else {
      loggerInstance.info(outputPayload, 'Runtime configuration snapshot generated');
    }

    if (options.outputFile) {
      await writeOutputFile(options.outputFile, outputPayload, { fileSystem });
    }

    return { snapshot, outputPayload, stats };
  } catch (error) {
    loggerInstance.error({ err: error }, 'Failed to generate runtime configuration snapshot');
    throw error;
  } finally {
    featureFlags.stop();
    runtimeConfigs.stop();
  }
}

async function main() {
  const options = parseRuntimeConfigArgs(process.argv);

  if (options.help) {
    printRuntimeConfigHelp();
    return;
  }

  try {
    await executeRuntimeConfig(options);
  } catch {
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
  parseRuntimeConfigArgs,
  executeRuntimeConfig,
  printRuntimeConfigHelp
};
