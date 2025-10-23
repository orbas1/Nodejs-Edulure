#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';

const spawnedProcesses = [];
let shuttingDown = false;

function runCommandOnce(label, command, args, options = {}) {
  const spawnOptions = {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  };

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, spawnOptions);

    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const reason = signal ? `${label} exited via signal ${signal}` : `${label} exited with code ${code}`;
      reject(new Error(reason));
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

function spawnPersistent(label, command, args, options = {}) {
  const spawnOptions = {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  };

  const child = spawn(command, args, spawnOptions);
  spawnedProcesses.push({ label, child });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    const reason = signal ? `${label} stopped via signal ${signal}` : `${label} exited with code ${code}`;
    console.error(`[dev-stack] ${reason}`);
    stopAll({ except: child }).finally(() => {
      process.exit(code ?? (signal ? 0 : 1));
    });
  });

  child.on('error', (error) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.error(`[dev-stack] ${label} failed to spawn`, error);
    stopAll({ except: child }).finally(() => {
      process.exit(1);
    });
  });
}

async function stopAll({ except } = {}) {
  const terminationPromises = spawnedProcesses.map(({ label, child }) => {
    if (child === except) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL');
        }
      }, 5000);

      child.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      child.kill('SIGINT');
    });
  });

  await Promise.allSettled(terminationPromises);
}

async function main() {
  const args = process.argv.slice(2);
  const skipDbInstall = args.includes('--skip-db-install');
  const skipFrontend = args.includes('--skip-frontend');

  const backendEnv = { ...process.env };

  const presetArg = args.find((arg) => arg.startsWith('--preset='));
  const preset = presetArg ? presetArg.split('=')[1] ?? 'lite' : 'lite';
  backendEnv.SERVICE_PRESET = preset;

  const serviceTargetArg = args.find((arg) => arg.startsWith('--service-target='));
  if (serviceTargetArg) {
    const [, value] = serviceTargetArg.split('=', 2);
    if (value) {
      backendEnv.SERVICE_TARGET = value;
    }
  }

  if (!backendEnv.SERVICE_TARGET) {
    if (preset === 'full') {
      backendEnv.SERVICE_TARGET = 'web,worker,realtime';
    } else if (preset === 'analytics') {
      backendEnv.SERVICE_TARGET = 'web,worker,realtime';
      backendEnv.SERVICE_JOB_GROUPS = backendEnv.SERVICE_JOB_GROUPS ?? 'core,analytics';
    } else {
      backendEnv.SERVICE_TARGET = 'web';
      backendEnv.SERVICE_JOB_GROUPS = backendEnv.SERVICE_JOB_GROUPS ?? 'core';
    }
  }

  try {
    if (!skipDbInstall) {
      console.log('[dev-stack] Installing and migrating database (backend-nodejs db:install)');
      await runCommandOnce(
        'database install',
        'npm',
        ['--workspace', 'backend-nodejs', 'run', 'db:install'],
        { env: process.env }
      );
    }
  } catch (error) {
    console.error('[dev-stack] Database preparation failed:', error.message ?? error);
    process.exit(1);
  }

  console.log(`[dev-stack] Launching backend preset "${preset}" with SERVICE_TARGET=${backendEnv.SERVICE_TARGET}`);

  spawnPersistent('backend stack', 'npm', ['--workspace', 'backend-nodejs', 'run', 'dev:stack'], { env: backendEnv });

  if (!skipFrontend) {
    spawnPersistent('frontend dev server', 'npm', ['--workspace', 'frontend-reactjs', 'run', 'dev']);
  }

  const handleSignal = (signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`[dev-stack] Received ${signal}, shutting down child processes...`);
    stopAll().finally(() => {
      process.exit(0);
    });
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => handleSignal(signal));
  });
}

main();
