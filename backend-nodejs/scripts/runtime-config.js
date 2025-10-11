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

function parseArgs(argv) {
  const result = {
    environment: process.env.RUNTIME_ENVIRONMENT ?? env.nodeEnv,
    audience: process.env.RUNTIME_AUDIENCE ?? 'ops',
    includeSensitive: false,
    includeFlags: true,
    includeConfigs: true,
    json: false,
    help: false
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }

    if (arg === '--json') {
      result.json = true;
      continue;
    }

    if (arg === '--no-flags') {
      result.includeFlags = false;
      continue;
    }

    if (arg === '--no-configs') {
      result.includeConfigs = false;
      continue;
    }

    if (arg === '--include-sensitive') {
      result.includeSensitive = true;
      continue;
    }

    const [key, value] = arg.split('=');
    if (!value) {
      continue;
    }

    if (key === '--environment') {
      result.environment = value;
    }

    if (key === '--audience' && audienceOptions.has(value)) {
      result.audience = value;
    }
  }

  return result;
}

function printHelp() {
  console.log(
    `Usage: node scripts/runtime-config.js [options]\n\n` +
      `Options:\n` +
      `  --environment=<env>       Override the environment used for evaluation (default: current env)\n` +
      `  --audience=<public|ops|internal>  Exposure audience to evaluate (default: ops)\n` +
      `  --include-sensitive       Include sensitive/private values (requires internal audience)\n` +
      `  --no-flags                Skip feature flag evaluation\n` +
      `  --no-configs              Skip runtime configuration entries\n` +
      `  --json                    Output snapshot as JSON\n` +
      `  -h, --help                Show this help message\n`
  );
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    return;
  }

  if (options.includeSensitive && options.audience === 'public') {
    logger.warn('Sensitive values cannot be exposed to the public audience; ignoring includeSensitive flag.');
    options.includeSensitive = false;
  }

  try {
    await db.migrate.latest();
    await Promise.all([featureFlagService.start(), runtimeConfigService.start()]);

    const snapshot = {
      environment: options.environment,
      audience: options.audience,
      generatedAt: new Date().toISOString()
    };

    const context = { environment: options.environment };

    if (options.includeFlags) {
      snapshot.featureFlags = featureFlagService.evaluateAll(context, { includeDefinition: true });
    }

    if (options.includeConfigs) {
      snapshot.runtimeConfig = runtimeConfigService.listForAudience(options.environment, {
        audience: options.audience,
        includeSensitive: options.includeSensitive && options.audience === 'internal'
      });
    }

    if (options.json) {
      console.log(JSON.stringify(snapshot, null, 2));
    } else {
      logger.info(snapshot, 'Runtime configuration snapshot generated');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate runtime configuration snapshot');
    process.exitCode = 1;
  } finally {
    featureFlagService.stop();
    runtimeConfigService.stop();
    await db.destroy();
  }
}

main();
