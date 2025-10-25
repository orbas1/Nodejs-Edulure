#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseArgs } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

const { values } = parseArgs({
  options: {
    'skip-lint': { type: 'boolean', default: false },
    'skip-docs': { type: 'boolean', default: false },
    'skip-tests': { type: 'boolean', default: false },
    'skip-release': { type: 'boolean', default: false },
    'with-release': { type: 'boolean', default: false },
    'continue-on-error': { type: 'boolean', default: false }
  }
});

const tasks = [
  {
    id: 'lint',
    label: 'ESLint analysis',
    command: 'npm',
    args: ['run', 'lint'],
    skipKey: 'skip-lint'
  },
  {
    id: 'docs',
    label: 'OpenAPI documentation build',
    command: 'npm',
    args: ['run', 'docs:build'],
    skipKey: 'skip-docs'
  },
  {
    id: 'tests',
    label: 'Vitest unit suite',
    command: 'npm',
    args: ['test'],
    skipKey: 'skip-tests'
  }
];

if (values['with-release']) {
  tasks.push({
    id: 'release-tests',
    label: 'Release verification suite',
    command: 'npm',
    args: ['run', 'test:release'],
    skipKey: 'skip-release'
  });
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: backendRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        FORCE_COLOR: process.env.FORCE_COLOR ?? '0'
      }
    });

    child.on('error', (error) => {
      resolve({ exitCode: 1, error });
    });

    child.on('close', (exitCode, signal) => {
      resolve({ exitCode: exitCode ?? 1, signal: signal ?? null });
    });
  });
}

async function run() {
  const results = [];

  for (const task of tasks) {
    if (values[task.skipKey]) {
      results.push({ id: task.id, label: task.label, status: 'skipped' });
      continue;
    }

    process.stdout.write(`\n=== ${task.label} (${task.id}) ===\n`);
    const startedAt = Date.now();
    const { exitCode, signal, error } = await runCommand(task.command, task.args);
    const durationMs = Date.now() - startedAt;

    const result = {
      id: task.id,
      label: task.label,
      durationMs,
      exitCode,
      signal: signal ?? undefined,
      status: exitCode === 0 ? 'passed' : 'failed'
    };

    if (error) {
      result.status = 'failed';
      result.error = error;
    }

    results.push(result);

    if (result.status === 'failed' && !values['continue-on-error']) {
      console.error(`\n✖ ${task.label} failed. Halting remaining tasks.`);
      break;
    }
  }

  const summary = results.map((result) => {
    if (result.status === 'skipped') {
      return `- ${result.label}: skipped`;
    }

    const seconds = result.durationMs != null ? (result.durationMs / 1000).toFixed(2) : '0.00';
    if (result.status === 'passed') {
      return `- ${result.label}: passed (${seconds}s)`;
    }

    const failureReason = result.error
      ? result.error.message
      : result.signal
        ? `terminated by signal ${result.signal}`
        : `exit code ${result.exitCode}`;
    return `- ${result.label}: failed (${seconds}s) – ${failureReason}`;
  });

  process.stdout.write(`\nBackend build summary:\n${summary.join('\n')}\n`);

  if (results.some((result) => result.status === 'failed')) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[build] Unexpected error during backend build:', error);
  process.exitCode = 1;
});
