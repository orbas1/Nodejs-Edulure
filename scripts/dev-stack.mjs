#!/usr/bin/env node

import process from 'node:process';

import {
  applyPresetDefaults,
  createProcessSupervisor,
  parsePresetArgs
} from './lib/processSupervisor.mjs';

function resolveWebPort(env) {
  const candidates = [env.WEB_PORT, env.APP_PORT, env.PORT, env.SERVICE_WEB_PORT, env.VITE_BACKEND_PORT];
  for (const value of candidates) {
    if (!value) {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 3000;
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parsePresetArgs(args);

  const supervisor = createProcessSupervisor({
    scope: 'dev-stack',
    pretty: parsed.prettyLogsExplicit ? parsed.prettyLogs : process.stdout.isTTY,
    enableCommandInterface: true
  });

  if (parsed.unknownArguments.length) {
    supervisor.log('warn', 'Ignoring unknown arguments', {
      arguments: parsed.unknownArguments
    });
  }

  const backendEnv = { ...process.env };
  const { preset } = applyPresetDefaults({
    preset: parsed.preset,
    env: backendEnv,
    mutate: true,
    overrides: parsed.overrides
  });

  supervisor.log('info', 'Resolved backend preset', {
    preset,
    serviceTarget: backendEnv.SERVICE_TARGET,
    jobGroups: backendEnv.SERVICE_JOB_GROUPS,
    enableJobs: backendEnv.SERVICE_ENABLE_JOBS,
    enableRealtime: backendEnv.SERVICE_ENABLE_REALTIME,
    enableSearchRefresh: backendEnv.SERVICE_ENABLE_SEARCH_REFRESH
  });

  if (!parsed.skipDbInstall) {
    supervisor.log('info', 'Installing and migrating database');
    try {
      await supervisor.runOnce({
        label: 'database-install',
        command: 'npm',
        args: ['--workspace', 'backend-nodejs', 'run', 'db:install'],
        options: { env: backendEnv }
      });
    } catch (error) {
      supervisor.log('error', 'Database preparation failed', { error: error.message });
      await supervisor.stopAll({ reason: 'db-install-failure' });
      process.exit(1);
    }
  } else {
    supervisor.log('info', 'Skipping database install as requested');
  }

  const backendReadinessUrl = `http://localhost:${resolveWebPort(backendEnv)}/ready`;

  supervisor.startProcess({
    label: 'backend',
    command: 'npm',
    args: ['--workspace', 'backend-nodejs', 'run', 'dev:stack'],
    options: { env: backendEnv },
    exitOnFailure: true,
    readinessProbe: {
      type: 'http',
      url: backendReadinessUrl,
      timeoutMs: 30000,
      intervalMs: 1500
    }
  });

  if (!parsed.skipFrontend) {
    supervisor.startProcess({
      label: 'frontend',
      command: 'npm',
      args: ['--workspace', 'frontend-reactjs', 'run', 'dev'],
      options: { env: process.env }
    });
  } else {
    supervisor.log('info', 'Frontend dev server startup skipped');
  }

  supervisor.registerSignalHandlers();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
