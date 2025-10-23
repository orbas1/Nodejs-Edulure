#!/usr/bin/env node

import process from 'node:process';
import readline from 'node:readline';
import { parseArgs } from 'node:util';

import createProcessSupervisor from './lib/processSupervisor.mjs';
import { applyServicePreset, PRESET_DEFINITIONS } from '../backend-nodejs/src/utils/servicePreset.js';

const VALID_LOG_FORMATS = new Set(['pretty', 'ndjson']);

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      preset: { type: 'string', default: 'lite' },
      'service-target': { type: 'string' },
      'skip-db-install': { type: 'boolean', default: false },
      'skip-frontend': { type: 'boolean', default: false },
      'log-format': { type: 'string', default: 'pretty' }
    },
    allowPositionals: false
  });

  const logFormat = values['log-format'];
  if (!VALID_LOG_FORMATS.has(logFormat)) {
    console.error(`[dev-stack] Invalid --log-format "${logFormat}". Expected one of: ${[...VALID_LOG_FORMATS].join(', ')}`);
    process.exit(1);
  }

  const supervisor = createProcessSupervisor({ scope: 'dev-stack', format: logFormat });
  const backendEnv = { ...process.env };

  backendEnv.SERVICE_PRESET = values.preset ?? 'lite';
  if (values['service-target']) {
    backendEnv.SERVICE_TARGET = values['service-target'];
  }

  const { preset, target, jobGroups } = applyServicePreset(backendEnv);
  const presetDetails = PRESET_DEFINITIONS[preset] ?? null;
  const description = presetDetails?.description ? ` – ${presetDetails.description}` : '';
  const presetMessageParts = [`preset=${preset}`];
  if (target) {
    presetMessageParts.push(`targets=${target}`);
  }
  if (jobGroups) {
    presetMessageParts.push(`jobGroups=${jobGroups}`);
  }

  supervisor.log({
    type: 'preset',
    label: presetDetails?.label ?? preset,
    message: `${presetMessageParts.join(' ')}${description}`
  });

  if (!values['skip-db-install']) {
    try {
      await supervisor.runOnce({
        label: 'database install',
        command: 'npm',
        args: ['--workspace', 'backend-nodejs', 'run', 'db:install'],
        options: { env: process.env }
      });
    } catch (error) {
      supervisor.log({ type: 'task:fatal', label: 'database install', message: error.message ?? String(error) });
      process.exit(1);
    }
  } else {
    supervisor.log({ type: 'task:skip', label: 'database install', message: 'skipped (--skip-db-install)' });
  }

  supervisor.registerProcess({
    label: 'backend',
    command: 'npm',
    args: ['--workspace', 'backend-nodejs', 'run', 'dev:stack'],
    options: { env: backendEnv }
  });

  if (!values['skip-frontend']) {
    supervisor.registerProcess({
      label: 'frontend',
      command: 'npm',
      args: ['--workspace', 'frontend-reactjs', 'run', 'dev'],
      options: {},
      restartable: true
    });
  } else {
    supervisor.log({ type: 'task:skip', label: 'frontend', message: 'skipped (--skip-frontend)' });
  }

  supervisor.log({
    type: 'ready',
    message: `active processes: ${supervisor.listProcesses().join(', ')}`
  });
  supervisor.log({
    type: 'hint',
    message: 'commands available → :list, :restart <label>, :help, :quit'
  });

  let commandInterface;

  const handleShutdown = async (reason) => {
    if (supervisor.isShuttingDown) {
      return;
    }

    supervisor.log({ type: 'shutdown', message: `received ${reason}, shutting down child processes` });
    if (commandInterface) {
      commandInterface.close();
    }
    await supervisor.shutdown();
    process.exit(0);
  };

  if (process.stdin.isTTY) {
    commandInterface = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    commandInterface.setPrompt('');
    commandInterface.on('line', async (input) => {
      const value = input.trim();
      if (!value) {
        return;
      }

      if (value === ':help') {
        supervisor.log({ type: 'command:help', message: 'use :list, :restart <label>, :quit' });
        return;
      }

      if (value === ':list') {
        supervisor.log({ type: 'command:list', message: supervisor.listProcesses().join(', ') || 'no processes' });
        return;
      }

      if (value === ':quit' || value === ':exit') {
        await handleShutdown('command');
        return;
      }

      if (value.startsWith(':restart')) {
        const [, label] = value.split(' ', 2);
        if (!label || !label.trim()) {
          supervisor.log({ type: 'command:error', message: 'usage → :restart <label>' });
          return;
        }

        try {
          await supervisor.restart(label.trim());
        } catch (error) {
          supervisor.log({ type: 'command:error', label: label.trim(), message: error.message ?? String(error) });
        }
        return;
      }

      supervisor.log({ type: 'command:unknown', message: `unknown command "${value}"` });
    });

    commandInterface.on('SIGINT', async () => {
      await handleShutdown('SIGINT');
    });
  }

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, async () => {
      await handleShutdown(signal);
    });
  });
}

main();
