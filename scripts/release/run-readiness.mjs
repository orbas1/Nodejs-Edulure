#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const defaultTimeoutMs = Number.parseInt(process.env.READINESS_CHECK_TIMEOUT_MS ?? '', 10);

function runCheck({ id, title, command, cwd = repoRoot, category, timeoutMs, metadata = {} }) {
  if (!Array.isArray(command) || command.length === 0) {
    throw new Error(`Invalid readiness command definition for ${id}`);
  }

  const startedAt = Date.now();
  const [cmd, ...args] = command;
  const child = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: 'inherit',
    timeout: timeoutMs ?? (Number.isFinite(defaultTimeoutMs) ? defaultTimeoutMs : undefined)
  });

  const durationMs = Date.now() - startedAt;
  const exitCode = typeof child.status === 'number' ? child.status : child.error ? 1 : child.signal ? 1 : 0;
  const combinedMetadata = { ...metadata };

  if (child.signal) {
    combinedMetadata.signal = child.signal;
  }
  if (child.error) {
    combinedMetadata.spawnError = child.error.message;
  }

  return {
    id,
    title,
    category,
    command: [cmd, ...args].join(' '),
    exitCode,
    status: exitCode === 0 ? 'passed' : 'failed',
    durationMs,
    metadata: Object.keys(combinedMetadata).length ? combinedMetadata : undefined
  };
}

function validateChecklist(checklistPath) {
  const checklistRaw = readFileSync(checklistPath, 'utf8');
  const checklist = JSON.parse(checklistRaw);
  const incomplete = (checklist.items ?? []).filter(
    (item) => item.status !== 'complete' || !item.evidence || item.evidence.length === 0
  );

  return {
    checklist,
    incomplete
  };
}

const checks = [
  {
    id: 'backend-release-suite',
    title: 'Backend release regression suite',
    category: 'unit+e2e+load',
    command: ['npm', '--workspace', 'backend-nodejs', 'run', 'test:release']
  },
  {
    id: 'frontend-accessibility-suite',
    title: 'Frontend accessibility regression suite',
    category: 'accessibility',
    command: ['npm', '--workspace', 'frontend-reactjs', 'run', 'test:release']
  },
  {
    id: 'backend-release-lint',
    title: 'Backend release artefact lint',
    category: 'quality-gate',
    command: [
      'npm',
      '--workspace',
      'backend-nodejs',
      'exec',
      'eslint',
      '--no-ignore',
      'test/release/releaseReadiness.test.js',
      'src/app.js'
    ]
  },
  {
    id: 'frontend-release-lint',
    title: 'Frontend release artefact lint',
    category: 'quality-gate',
    command: [
      'npm',
      '--workspace',
      'frontend-reactjs',
      'exec',
      'eslint',
      '--no-ignore',
      'test/release/releaseAccessibility.test.jsx',
      'src/components/status/ServiceHealthBanner.jsx'
    ]
  },
  {
    id: 'supply-chain-audit',
    title: 'Supply-chain audit enforcement',
    category: 'security',
    command: ['npm', 'run', 'audit:ci']
  }
];

const checklistPath = path.join(repoRoot, 'qa', 'release', 'core_release_checklist.json');
const results = [];
let allPassed = true;

for (const check of checks) {
  console.log(`\n▶️  Running ${check.title} (${check.id})`);
  let result;
  try {
    result = runCheck(check);
  } catch (error) {
    result = {
      id: check.id,
      title: check.title,
      category: check.category,
      command: Array.isArray(check.command) ? check.command.join(' ') : String(check.command),
      exitCode: 1,
      status: 'failed',
      durationMs: 0,
      metadata: { error: error.message }
    };
    console.error(`❌  ${check.title} misconfigured:`, error.message);
  }
  results.push(result);
  if (result.status !== 'passed') {
    allPassed = false;
  }
}

let checklistResult;
try {
  checklistResult = validateChecklist(checklistPath);
  const checklistPassed = checklistResult.incomplete.length === 0;
  results.push({
    id: 'release-checklist',
    title: 'Release management checklist completeness',
    category: 'governance',
    command: `validate ${path.relative(repoRoot, checklistPath)}`,
    exitCode: checklistPassed ? 0 : 1,
    status: checklistPassed ? 'passed' : 'failed',
    durationMs: 0,
    metadata: {
      version: checklistResult.checklist.version,
      pendingItems: checklistResult.incomplete.map((item) => item.id)
    }
  });
  if (!checklistPassed) {
    allPassed = false;
  }
} catch (error) {
  console.error('\n❌  Failed to validate release checklist:', error.message);
  results.push({
    id: 'release-checklist',
    title: 'Release management checklist completeness',
    category: 'governance',
    command: `validate ${path.relative(repoRoot, checklistPath)}`,
    exitCode: 1,
    status: 'failed',
    durationMs: 0,
    metadata: {
      error: error.message
    }
  });
  allPassed = false;
}

const reportsDir = path.join(repoRoot, 'reports', 'release');
mkdirSync(reportsDir, { recursive: true });

const summary = {
  executedAt: new Date().toISOString(),
  checks: results
};

const reportPath = path.join(reportsDir, 'readiness-summary.json');
writeFileSync(reportPath, JSON.stringify(summary, null, 2));

console.log('\n📋 Release readiness summary saved to', path.relative(repoRoot, reportPath));
for (const check of results) {
  const statusEmoji = check.status === 'passed' ? '✅' : '❌';
  const durationLabel = `${(check.durationMs / 1000).toFixed(1)}s`;
  console.log(`${statusEmoji} [${check.category}] ${check.title} (${check.command}) — ${durationLabel}`);
  if (check.metadata?.pendingItems?.length) {
    console.log(`   Pending checklist items: ${check.metadata.pendingItems.join(', ')}`);
  }
  if (check.metadata?.error) {
    console.log(`   Error: ${check.metadata.error}`);
  }
  if (check.metadata?.spawnError) {
    console.log(`   Spawn error: ${check.metadata.spawnError}`);
  }
  if (check.metadata?.signal) {
    console.log(`   Terminated by signal: ${check.metadata.signal}`);
  }
}

process.exit(allPassed ? 0 : 1);
