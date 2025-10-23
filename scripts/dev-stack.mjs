#!/usr/bin/env node

import process from 'node:process';

import {
  createProcessSupervisor,
  derivePresetConfiguration,
  normalizeJobGroupInput,
  normalizeTargetInput,
  parsePresetCli
} from './lib/processSupervisor.mjs';

import { getJobFeatureSnapshot } from '../backend-nodejs/src/config/featureFlags.js';

const DEFAULT_BACKEND_HEALTH_URL = process.env.DEV_STACK_BACKEND_HEALTH_URL ?? 'http://localhost:3000/health';
const DEFAULT_FRONTEND_HEALTH_URL = process.env.DEV_STACK_FRONTEND_HEALTH_URL ?? 'http://localhost:5173';

async function checkBackendReadiness(url = DEFAULT_BACKEND_HEALTH_URL) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    return {
      status: response.ok ? 'ready' : 'pending',
      ok: response.ok,
      message: payload?.message ?? payload?.status ?? `HTTP ${response.status}`
    };
  } catch (error) {
    return { status: 'pending', message: error.name === 'AbortError' ? 'Timed out waiting for health probe' : error.message };
  }
}

async function checkFrontendReadiness(url = DEFAULT_FRONTEND_HEALTH_URL) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
    return {
      status: response.ok ? 'ready' : 'pending',
      ok: response.ok,
      message: `HTTP ${response.status}`
    };
  } catch (error) {
    return { status: 'pending', message: error.name === 'AbortError' ? 'Timed out waiting for frontend dev server' : error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cliOptions = parsePresetCli(args);
  const supervisor = createProcessSupervisor({ name: 'dev-stack', logFormat: cliOptions.logFormat });

  const featureSnapshot = getJobFeatureSnapshot();
  const explicitTargets = normalizeTargetInput(cliOptions.serviceTarget ?? process.env.SERVICE_TARGET);
  const explicitJobGroups = normalizeJobGroupInput(cliOptions.serviceJobGroups ?? process.env.SERVICE_JOB_GROUPS);

  const presetConfiguration = derivePresetConfiguration(cliOptions.preset, {
    featureSnapshot,
    explicitTargets,
    explicitJobGroups
  });

  const backendEnv = { ...process.env, SERVICE_PRESET: presetConfiguration.preset };

  if (explicitTargets?.length) {
    backendEnv.SERVICE_TARGET = explicitTargets.join(',');
  } else {
    backendEnv.SERVICE_TARGET = presetConfiguration.env.SERVICE_TARGET;
  }

  if (explicitJobGroups?.length) {
    backendEnv.SERVICE_JOB_GROUPS = explicitJobGroups.join(',');
  } else if (presetConfiguration.env.SERVICE_JOB_GROUPS) {
    backendEnv.SERVICE_JOB_GROUPS = presetConfiguration.env.SERVICE_JOB_GROUPS;
  } else {
    delete backendEnv.SERVICE_JOB_GROUPS;
  }

  supervisor.logger.info('Resolved stack configuration', {
    preset: presetConfiguration.preset,
    targets: backendEnv.SERVICE_TARGET,
    jobGroups: backendEnv.SERVICE_JOB_GROUPS,
    features: featureSnapshot
  });

  try {
    if (!cliOptions.skipDbInstall) {
      await supervisor.runOnce('database install', 'npm', ['--workspace', 'backend-nodejs', 'run', 'db:install'], {
        env: process.env
      });
    }
  } catch (error) {
    supervisor.logger.error('Database preparation failed', { error: error.message });
    await supervisor.stopAll({ signal: 'SIGINT', code: 1 });
    process.exit(1);
  }

  supervisor.spawnPersistent(
    'backend',
    'npm',
    ['--workspace', 'backend-nodejs', 'run', 'dev:stack'],
    {
      spawnOptions: { env: backendEnv },
      readinessCheck: () => checkBackendReadiness(),
      readinessIntervalMs: 7000
    }
  );

  if (!cliOptions.skipFrontend) {
    supervisor.spawnPersistent(
      'frontend',
      'npm',
      ['--workspace', 'frontend-reactjs', 'run', 'dev'],
      {
        readinessCheck: () => checkFrontendReadiness(),
        readinessIntervalMs: 7000
      }
    );
  }

  supervisor.attachCommandInterface();
  supervisor.registerSignalHandlers();
}

main();
