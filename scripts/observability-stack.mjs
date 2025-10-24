#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import { createLifecycleLogger } from './lib/processSupervisor.mjs';

function runCommand(command, args, { logger, cwd = process.cwd(), env = process.env, stdio = 'inherit' } = {}) {
  return new Promise((resolve, reject) => {
    logger?.log('debug', `Executing ${command} ${args.join(' ')}`);
    const child = spawn(command, args, { cwd, env, stdio, shell: false });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function ensureDocker({ logger }) {
  try {
    await runCommand('docker', ['--version'], { logger, stdio: 'ignore' });
    logger.log('info', 'Docker CLI detected');
  } catch (error) {
    logger.log('error', 'Docker CLI not available. Install Docker Desktop or Docker Engine.', {
      error: error.message
    });
    throw error;
  }

  try {
    await runCommand('docker', ['compose', 'version'], { logger, stdio: 'ignore' });
    logger.log('info', 'Docker Compose plugin detected');
  } catch (error) {
    logger.log('error', 'Docker Compose plugin missing. Install Docker Compose v2.', {
      error: error.message
    });
    throw error;
  }
}

async function waitForEndpoint(url, { logger, timeoutMs = 60000, intervalMs = 1500, expected = 'ok' } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        if (expected === 'json') {
          await response.json();
        }
        logger.log('info', `Ready: ${url}`);
        return;
      }
      logger.log('debug', `Waiting for ${url} – status ${response.status}`);
    } catch (error) {
      logger.log('debug', `Waiting for ${url} – ${error.message}`);
    }
    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const logger = createLifecycleLogger({
    scope: 'observability-stack',
    pretty: process.stdout.isTTY
  });

  await ensureDocker({ logger });

  logger.log('info', 'Starting observability services (Prometheus & Grafana)');
  await runCommand('docker', ['compose', '--profile', 'observability', 'up', '-d'], { logger });

  logger.log('info', 'Waiting for Prometheus readiness');
  await waitForEndpoint('http://localhost:9090/-/ready', { logger });

  logger.log('info', 'Waiting for Grafana readiness');
  await waitForEndpoint('http://localhost:3001/api/health', { logger, expected: 'json' });

  logger.log('success', 'Observability stack ready', {
    prometheus: 'http://localhost:9090',
    grafana: 'http://localhost:3001',
    grafanaCredentials: 'admin / admin'
  });
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
