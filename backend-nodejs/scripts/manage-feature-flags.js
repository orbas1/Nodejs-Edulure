#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'node:util';
import dotenv from 'dotenv';

import db from '../src/config/database.js';
import logger from '../src/config/logger.js';
import { env } from '../src/config/env.js';
import { featureFlagService } from '../src/services/FeatureFlagService.js';
import { featureFlagGovernanceService } from '../src/services/FeatureFlagGovernanceService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });

const HELP_MESSAGE = `Usage: node scripts/manage-feature-flags.js <command> [options]

Commands:
  sync [--dry-run] [--actor=<email>]                           Synchronise database definitions with the manifest.
  snapshot [--tenant=<id>] [--environment=<env>] [--include-inactive]   Print tenant snapshot as JSON.
  override --flag=<key> --tenant=<id> --state=<state> [--environment=<env>] [--variant=<key>] [--notes="..."]   Apply a tenant override.
  remove --flag=<key> --tenant=<id> [--environment=<env>]      Remove a tenant override.
  help                                                         Show this message.
`;

function parseCli(argv) {
  const { values, positionals } = parseArgs({
    args: argv.slice(2),
    allowPositionals: true,
    options: {
      actor: { type: 'string' },
      'dry-run': { type: 'boolean' },
      tenant: { type: 'string' },
      environment: { type: 'string' },
      'include-inactive': { type: 'boolean' },
      flag: { type: 'string' },
      state: { type: 'string' },
      variant: { type: 'string' },
      notes: { type: 'string' }
    }
  });

  const [command = 'help'] = positionals;
  return { command, options: values };
}

function assertEmail(value, label) {
  if (!value) {
    return;
  }
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(value)) {
    throw new Error(`${label} must be a valid email address.`);
  }
}

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

async function ensureBootstrap() {
  await db.migrate.latest();
  await featureFlagService.start();
}

async function shutdown() {
  featureFlagService.stop();
  await db.destroy();
}

async function handleSync(options) {
  const actor = options.actor ?? env.featureFlags.bootstrapActor;
  assertEmail(actor, 'actor');
  const dryRun = Boolean(options['dry-run']);
  const summary = await featureFlagGovernanceService.syncDefinitions({ actor, dryRun });
  logger.info({ summary }, dryRun ? 'Feature flag manifest dry-run' : 'Feature flag manifest synchronised');
  printResult(summary);
}

async function handleSnapshot(options) {
  const tenantId = options.tenant ?? null;
  const environment = options.environment ?? env.featureFlags.defaultEnvironment;
  const includeInactive = options['include-inactive'] !== false;
  const snapshot = await featureFlagGovernanceService.generateTenantSnapshot({
    tenantId,
    environment,
    includeInactive,
    userContext: { attributes: { source: 'cli' } }
  });
  printResult(snapshot);
}

async function handleOverride(options) {
  const flagKey = options.flag;
  const tenantId = options.tenant;
  const state = options.state;
  if (!flagKey || !tenantId || !state) {
    throw new Error('Override command requires --flag, --tenant, and --state options.');
  }

  const environment = options.environment ?? env.featureFlags.defaultEnvironment;
  const variantKey = options.variant ?? null;
  const notes = options.notes ?? null;
  const actor = options.actor ?? env.featureFlags.bootstrapActor;
  assertEmail(actor, 'actor');

  const result = await featureFlagGovernanceService.applyTenantOverride({
    flagKey,
    tenantId,
    environment,
    state,
    variantKey,
    notes,
    metadata: {},
    actor,
    userContext: { attributes: { source: 'cli' } }
  });

  printResult(result);
}

async function handleRemove(options) {
  const flagKey = options.flag;
  const tenantId = options.tenant;
  if (!flagKey || !tenantId) {
    throw new Error('Remove command requires --flag and --tenant options.');
  }

  const environment = options.environment ?? env.featureFlags.defaultEnvironment;
  const actor = options.actor ?? env.featureFlags.bootstrapActor;
  assertEmail(actor, 'actor');

  const result = await featureFlagGovernanceService.removeTenantOverride({
    flagKey,
    tenantId,
    environment,
    actor,
    userContext: { attributes: { source: 'cli' } }
  });

  printResult(result);
}

async function main() {
  const { command, options } = parseCli(process.argv);

  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP_MESSAGE);
    return;
  }

  try {
    await ensureBootstrap();

    switch (command) {
      case 'sync':
        await handleSync(options);
        break;
      case 'snapshot':
        await handleSnapshot(options);
        break;
      case 'override':
        await handleOverride(options);
        break;
      case 'remove':
        await handleRemove(options);
        break;
      default:
        console.log(HELP_MESSAGE);
        process.exitCode = 1;
        break;
    }
  } catch (error) {
    logger.error({ err: error, command }, 'Feature flag CLI command failed');
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await shutdown();
  }
}

main();
