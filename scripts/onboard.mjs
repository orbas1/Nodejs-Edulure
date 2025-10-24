#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function normaliseVersion(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^v/, '');
}

function parseVersion(raw) {
  return normaliseVersion(raw)
    .split('.')
    .map((segment) => Number.parseInt(segment, 10) || 0);
}

function compareVersions(a, b) {
  const aParts = parseVersion(a);
  const bParts = parseVersion(b);
  const length = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (aParts[index] || 0) - (bParts[index] || 0);
    if (diff > 0) return 1;
    if (diff < 0) return -1;
  }
  return 0;
}

async function readPackageMetadata() {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const raw = await readFile(pkgPath, 'utf8');
  return JSON.parse(raw);
}

async function getNpmVersion() {
  const { stdout } = await execFileAsync('npm', ['--version'], { encoding: 'utf8' });
  return normaliseVersion(stdout);
}

async function checkCommand(command, args = ['--version']) {
  try {
    const { stdout } = await execFileAsync(command, args, { encoding: 'utf8' });
    return { status: 'pass', detail: normaliseVersion(stdout) };
  } catch (error) {
    return { status: 'fail', detail: error.message || error.stderr?.toString() || 'unknown error' };
  }
}

async function runChecks() {
  const results = [];
  const packageJson = await readPackageMetadata();
  const minNodeVersion = packageJson.config?.minimumNodeVersion ?? packageJson.engines?.node ?? '0.0.0';
  const minNpmVersion = packageJson.config?.minimumNpmVersion ?? packageJson.engines?.npm ?? '0.0.0';

  const currentNode = normaliseVersion(process.versions.node);
  const nodeComparison = compareVersions(currentNode, minNodeVersion);
  results.push({
    title: 'Node.js runtime',
    status: nodeComparison >= 0 ? 'pass' : 'fail',
    detail: `current ${currentNode}, required >= ${minNodeVersion}`,
    suggestion: nodeComparison >= 0 ? undefined : 'Install an LTS build matching the required version.'
  });

  try {
    const npmVersion = await getNpmVersion();
    const npmComparison = compareVersions(npmVersion, minNpmVersion);
    results.push({
      title: 'npm CLI',
      status: npmComparison >= 0 ? 'pass' : 'fail',
      detail: `current ${npmVersion}, required >= ${minNpmVersion}`,
      suggestion: npmComparison >= 0 ? undefined : 'Upgrade npm via `npm install -g npm@latest`.'
    });
  } catch (error) {
    results.push({
      title: 'npm CLI',
      status: 'fail',
      detail: error.message ?? 'npm not available',
      suggestion: 'Install npm (bundled with Node.js 20.12+).'
    });
  }

  const dockerCheck = await checkCommand('docker');
  results.push({
    title: 'Docker engine',
    ...dockerCheck,
    suggestion:
      dockerCheck.status === 'pass'
        ? undefined
        : 'Install Docker Desktop or Docker Engine to enable local observability stack.'
  });

  const composeCheck = await checkCommand('docker', ['compose', 'version']);
  results.push({
    title: 'Docker Compose v2',
    ...composeCheck,
    suggestion:
      composeCheck.status === 'pass'
        ? undefined
        : 'Install the Docker Compose plugin (v2) so helper scripts can start Prometheus and Grafana.'
  });

  const backendEnvPath = path.resolve('backend-nodejs', '.env');
  results.push({
    title: 'backend-nodejs/.env configuration',
    status: existsSync(backendEnvPath) ? 'pass' : 'warn',
    detail: existsSync(backendEnvPath)
      ? 'Custom environment overrides detected.'
      : 'No .env file found. Using defaults from .env.example.',
    suggestion: existsSync(backendEnvPath)
      ? undefined
      : 'Copy backend-nodejs/.env.example to backend-nodejs/.env and tweak credentials as needed.'
  });

  const storagePath = path.resolve('storage', 'local');
  if (!existsSync(storagePath)) {
    mkdirSync(storagePath, { recursive: true });
    results.push({
      title: 'storage/local cache',
      status: 'warn',
      detail: `Created ${storagePath} for local asset storage.`,
      suggestion: 'Keep this directory for local uploads and asset previews.'
    });
  } else {
    results.push({
      title: 'storage/local cache',
      status: 'pass',
      detail: `${storagePath} ready for local asset storage.`
    });
  }

  const backendModules = path.resolve('backend-nodejs', 'node_modules');
  const frontendModules = path.resolve('frontend-reactjs', 'node_modules');
  results.push({
    title: 'Backend dependencies installed',
    status: existsSync(backendModules) ? 'pass' : 'warn',
    detail: existsSync(backendModules)
      ? 'backend-nodejs/node_modules present.'
      : 'Run `npm run bootstrap` to install workspace dependencies.'
  });
  results.push({
    title: 'Frontend dependencies installed',
    status: existsSync(frontendModules) ? 'pass' : 'warn',
    detail: existsSync(frontendModules)
      ? 'frontend-reactjs/node_modules present.'
      : 'Run `npm run bootstrap` to install workspace dependencies.'
  });

  const cpuCount = os.cpus()?.length ?? 0;
  results.push({
    title: 'System resources snapshot',
    status: cpuCount >= 4 ? 'pass' : 'warn',
    detail: `${cpuCount} CPU cores detected, ${Math.round(os.totalmem() / (1024 * 1024 * 1024))}GB RAM available.`,
    suggestion:
      cpuCount >= 4
        ? undefined
        : 'Allocate at least 4 cores when running Docker Desktop for smoother telemetry scrapes.'
  });

  return results;
}

function printResults(results) {
  const icons = { pass: '✅', fail: '❌', warn: '⚠️' };
  console.log('\nEdulure local environment check\n================================');
  for (const result of results) {
    const icon = icons[result.status] ?? icons.warn;
    console.log(`\n${icon} ${result.title}`);
    if (result.detail) {
      console.log(`   ${result.detail}`);
    }
    if (result.suggestion) {
      console.log(`   → ${result.suggestion}`);
    }
  }

  const failures = results.filter((entry) => entry.status === 'fail');
  if (failures.length) {
    console.log('\nResolve ❌ failures before continuing.');
  }

  console.log('\nNext steps');
  console.log('----------');
  console.log('1. Install dependencies with `npm run bootstrap`.');
  console.log('2. Launch the API + web stack via `npm run dev:stack`.');
  console.log('3. Start Prometheus and Grafana with `npm run dev:observability` (optional).');
}

runChecks()
  .then((results) => {
    printResults(results);
    const hasFailures = results.some((entry) => entry.status === 'fail');
    process.exit(hasFailures ? 1 : 0);
  })
  .catch((error) => {
    console.error('Onboarding script failed:', error.message ?? error);
    process.exit(1);
  });
