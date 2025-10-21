#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function logHeader(title) {
  const border = '='.repeat(title.length + 4);
  console.log(`\n${border}\n| ${title} |\n${border}\n`);
}

async function checkNodeVersion(packageJson) {
  const engines = packageJson.engines ?? {};
  const required = engines.node;
  if (!required) {
    return { success: true, message: 'No Node.js engine requirement declared.' };
  }

  const current = process.versions.node;
  const isSatisfied = compareNodeVersion(current, required);
  const message = `Required: ${required}, Current: ${current}`;

  return {
    success: isSatisfied,
    message: isSatisfied
      ? `Node.js version requirement satisfied. ${message}`
      : `Node.js version requirement NOT satisfied. ${message}`,
  };
}

function compareNodeVersion(current, requiredRange) {
  // Only handles simple range operators like ">=x.y.z" or "^" and "~" are treated conservatively.
  // For complex ranges users should still be alerted because this is a diagnostic script.
  const normalizedRange = requiredRange.trim();
  if (normalizedRange.startsWith('>=')) {
    const requiredVersion = normalizedRange.slice(2).trim();
    return compareSemver(current, requiredVersion) >= 0;
  }

  if (normalizedRange.startsWith('^') || normalizedRange.startsWith('~')) {
    const requiredVersion = normalizedRange.slice(1).trim();
    return compareSemver(current, requiredVersion) >= 0;
  }

  if (normalizedRange.includes('||') || normalizedRange.includes(' ')) {
    return normalizedRange.split(/\|\||\s+/).some((segment) => segment && compareNodeVersion(current, segment));
  }

  return compareSemver(current, normalizedRange) === 0;
}

function compareSemver(a, b) {
  const parse = (version) => version.split('.').map((part) => parseInt(part, 10));
  const [aMajor = 0, aMinor = 0, aPatch = 0] = parse(a);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = parse(b);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

async function ensureNodeModulesInstalled() {
  try {
    await access(path.join(projectRoot, 'node_modules'), constants.F_OK);
    return { success: true, message: 'node_modules directory found.' };
  } catch (error) {
    return {
      success: false,
      message: 'node_modules directory is missing. Run "npm install" inside backend-nodejs.',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runCommand(label, command, args = []) {
  logHeader(label);
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data;
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderr += data;
      process.stderr.write(data);
    });

    child.on('error', (error) => {
      resolve({
        success: false,
        message: `${label} failed to start: ${error.message}`,
        stdout,
        stderr,
      });
    });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        message: code === 0 ? `${label} completed successfully.` : `${label} failed with exit code ${code}.`,
        exitCode: code,
        stdout,
        stderr,
      });
    });
  });
}

async function main() {
  console.log('Backend Build Readiness Diagnostic Script');
  console.log('Project root:', projectRoot);

  const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));

  const checks = [];
  checks.push(await checkNodeVersion(packageJson));
  checks.push(await ensureNodeModulesInstalled());

  const tasks = [
    { label: 'Running lint checks', command: 'npm', args: ['run', 'lint'] },
    { label: 'Executing test suite', command: 'npm', args: ['run', 'test'] },
    { label: 'Validating dependency tree', command: 'npm', args: ['ls'] },
  ];

  const commandResults = [];
  for (const task of tasks) {
    commandResults.push(await runCommand(task.label, task.command, task.args));
  }

  logHeader('Summary');
  const summary = {
    timestamp: new Date().toISOString(),
    prerequisiteChecks: checks,
    commands: commandResults.map(({ success, message, exitCode }) => ({ success, message, exitCode })),
  };

  console.log(JSON.stringify(summary, null, 2));

  const overallSuccess = [...checks, ...commandResults].every((result) => result.success);
  process.exit(overallSuccess ? 0 : 1);
}

main().catch((error) => {
  console.error('Unexpected error while running diagnostics:', error);
  process.exit(1);
});
