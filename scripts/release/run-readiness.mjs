#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const defaultTimeoutMs = Number.parseInt(process.env.READINESS_CHECK_TIMEOUT_MS ?? '', 10);

function parseCliArgs(rawArgs) {
  const options = {
    include: new Set(),
    exclude: new Set(),
    formats: new Set(['json', 'markdown'])
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    switch (token) {
      case '--check':
      case '-c': {
        const value = rawArgs[index + 1];
        if (!value) {
          throw new Error('Missing value for --check option.');
        }
        options.include.add(value);
        index += 1;
        break;
      }
      case '--skip-check':
      case '-x': {
        const value = rawArgs[index + 1];
        if (!value) {
          throw new Error('Missing value for --skip-check option.');
        }
        options.exclude.add(value);
        index += 1;
        break;
      }
      case '--format':
      case '-f': {
        const value = rawArgs[index + 1];
        if (!value) {
          throw new Error('Missing value for --format option.');
        }
        const requested = value.split(',').map((entry) => entry.trim().toLowerCase());
        options.formats.clear();
        for (const entry of requested) {
          if (!['json', 'markdown', 'none'].includes(entry)) {
            throw new Error(`Unsupported format '${entry}'. Choose json, markdown, or none.`);
          }
          if (entry !== 'none') {
            options.formats.add(entry);
          }
        }
        if (options.formats.size === 0) {
          options.formats.add('json');
        }
        index += 1;
        break;
      }
      default:
        throw new Error(`Unknown argument '${token}'. Supported options: --check, --skip-check, --format.`);
    }
  }

  return options;
}

const cliOptions = (() => {
  try {
    return parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`\n❌  ${error.message}`);
    process.exit(1);
  }
})();

const checks = [
  {
    id: 'backend-release-suite',
    title: 'Backend release regression suite',
    category: 'unit+e2e+load',
    command: ['npm', '--workspace', 'backend-nodejs', 'run', 'test:release'],
    timeoutMs: 20 * 60 * 1000
  },
  {
    id: 'frontend-accessibility-suite',
    title: 'Frontend accessibility regression suite',
    category: 'accessibility',
    command: ['npm', '--workspace', 'frontend-reactjs', 'run', 'test:release'],
    timeoutMs: 15 * 60 * 1000
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
    ],
    timeoutMs: 5 * 60 * 1000
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
    ],
    timeoutMs: 5 * 60 * 1000
  },
  {
    id: 'supply-chain-audit',
    title: 'Supply-chain audit enforcement',
    category: 'security',
    command: ['npm', 'run', 'audit:ci'],
    timeoutMs: 10 * 60 * 1000
  }
];

function shouldRunCheck(checkId) {
  if (cliOptions.exclude.has(checkId)) {
    return false;
  }
  if (cliOptions.include.size === 0) {
    return true;
  }
  return cliOptions.include.has(checkId);
}

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
    if (child.error.code === 'ETIMEDOUT') {
      combinedMetadata.timedOut = true;
    }
  }

  combinedMetadata.requestedTimeoutMs = timeoutMs ?? (Number.isFinite(defaultTimeoutMs) ? defaultTimeoutMs : null);

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

function ensureReportsDir(reportsDir) {
  mkdirSync(reportsDir, { recursive: true });
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) {
    return '0.0s';
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function buildMarkdownSummary({ results, checklistMetadata }) {
  const lines = [];
  lines.push(`# Release Readiness Summary`);
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Checks executed: ${results.length}`);
  lines.push('');
  lines.push('| Status | Category | Check | Command | Duration |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const check of results) {
    const statusEmoji = check.status === 'passed' ? '✅' : '❌';
    lines.push(`| ${statusEmoji} | ${check.category} | ${check.title} | \`${check.command}\` | ${formatDuration(check.durationMs)} |`);
  }
  if (checklistMetadata?.incomplete?.length) {
    lines.push('');
    lines.push('## Pending Checklist Items');
    for (const item of checklistMetadata.incomplete) {
      lines.push(`- **${item.id}** — ${item.description}`);
    }
  }
  return lines.join('\n');
}

const checklistPath = path.join(repoRoot, 'qa', 'release', 'core_release_checklist.json');
const reportsDir = path.join(repoRoot, 'reports', 'release');
ensureReportsDir(reportsDir);

const results = [];
let allPassed = true;

const checksToRun = checks.filter((check) => shouldRunCheck(check.id));
if (checksToRun.length === 0) {
  console.error('\n❌  No readiness checks selected. Use --check to include specific checks or remove conflicting filters.');
  process.exit(1);
}

for (const check of checksToRun) {
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

const summary = {
  executedAt: new Date().toISOString(),
  filters: {
    included: Array.from(cliOptions.include),
    excluded: Array.from(cliOptions.exclude)
  },
  checks: results
};

const reportPath = path.join(reportsDir, 'readiness-summary.json');
writeFileSync(reportPath, JSON.stringify(summary, null, 2));

if (cliOptions.formats.has('markdown')) {
  const markdownPath = path.join(reportsDir, 'readiness-summary.md');
  writeFileSync(
    markdownPath,
    buildMarkdownSummary({ results, checklistMetadata: checklistResult })
  );
  console.log('\n📝 Markdown summary saved to', path.relative(repoRoot, markdownPath));
}

console.log('\n📋 Release readiness summary saved to', path.relative(repoRoot, reportPath));
for (const check of results) {
  const statusEmoji = check.status === 'passed' ? '✅' : '❌';
  const durationLabel = formatDuration(check.durationMs);
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
  if (check.metadata?.timedOut) {
    console.log('   Result timed out before completion.');
  }
  if (check.metadata?.signal) {
    console.log(`   Terminated by signal: ${check.metadata.signal}`);
  }
}

const failedChecks = results.filter((item) => item.status !== 'passed');
if (failedChecks.length) {
  console.error(`\n❌  ${failedChecks.length} readiness gate(s) failed.`);
}

process.exit(allPassed ? 0 : 1);
