import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const makeWorkspaceTask = (workspace, script, label, extraArgs = []) => ({
  id: `${workspace}-${script}`,
  label,
  command: 'npm',
  args: ['--workspace', workspace, 'run', script, ...extraArgs],
  cwd: repoRoot
});

const makeRootTask = (script, label, extraArgs = []) => ({
  id: `root-${script}`,
  label,
  command: 'npm',
  args: ['run', script, ...extraArgs],
  cwd: repoRoot
});

const tasks = [
  makeRootTask('bootstrap', 'Workspace bootstrap install'),
  makeWorkspaceTask('backend-nodejs', 'lint', 'Backend lint'),
  makeWorkspaceTask('backend-nodejs', 'test', 'Backend unit tests'),
  makeWorkspaceTask('backend-nodejs', 'test:release', 'Backend release tests'),
  makeWorkspaceTask('backend-nodejs', 'migrate:latest', 'Database migrations'),
  makeWorkspaceTask('backend-nodejs', 'seed', 'Database seeders'),
  makeWorkspaceTask('backend-nodejs', 'runtime:config', 'Backend runtime configuration (.env)', ['--', '--strict', '--json']),
  makeWorkspaceTask('frontend-reactjs', 'lint', 'Frontend lint'),
  makeWorkspaceTask('frontend-reactjs', 'test', 'Frontend unit tests'),
  makeWorkspaceTask('frontend-reactjs', 'test:release', 'Frontend release tests'),
  makeWorkspaceTask('frontend-reactjs', 'test:accessibility', 'Frontend accessibility tests'),
  makeWorkspaceTask('frontend-reactjs', 'build', 'Frontend production build'),
  makeWorkspaceTask('sdk-typescript', 'check', 'SDK type checks'),
  makeWorkspaceTask('sdk-typescript', 'build', 'SDK build'),
  makeRootTask('test:repo', 'Repository vitest suite')
];

const interestingPatterns = [
  /\b(error|fail|failed|fatal|exception|rejected)\b/i,
  /^npm ERR!/i,
  /^Error:/i,
  /^TypeError:/i,
  /^ReferenceError:/i,
  /^SyntaxError:/i,
  /^RangeError:/i,
  /^EvalError:/i,
  /^URIError:/i,
  /^FAIL/i
];

const isInterestingLine = (line) => interestingPatterns.some((pattern) => pattern.test(line));

const report = [];

for (const task of tasks) {
  console.log(`\n=== Running ${task.label} (${task.id}) ===`);
  const start = Date.now();
  const result = spawnSync(task.command, task.args, {
    cwd: task.cwd,
    encoding: 'utf-8',
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      NO_COLOR: '1'
    }
  });
  const durationMs = Date.now() - start;

  const combinedOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const trimmedOutput = combinedOutput.trim();
  if (trimmedOutput.length > 0) {
    console.log(trimmedOutput);
  }

  const lines = combinedOutput
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const errors = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isInterestingLine(line)) {
      errors.add(line.replace(/\s+/g, ' '));

      // capture immediate stack trace context lines that start with "at "
      let lookahead = index + 1;
      while (lookahead < lines.length && lines[lookahead].startsWith('at ')) {
        errors.add(lines[lookahead].replace(/\s+/g, ' '));
        lookahead += 1;
      }
    }
  }

  if (result.status !== 0 && errors.size === 0) {
    const failureMessage = `${task.label} failed with exit code ${result.status}`;
    errors.add(failureMessage);
  }

  if (result.error) {
    const systemMessage = `${task.label} could not start: ${result.error.message}`;
    errors.add(systemMessage);
  }

  for (const message of errors) {
    report.push({
      task: task.label,
      command: `${task.command} ${task.args.join(' ')}`.trim(),
      status: result.status,
      durationMs,
      message
    });
  }
}

const timestamp = new Date().toISOString();
const output = {
  generatedAt: timestamp,
  totalFindings: report.length,
  findings: report
};

const outputPath = path.join(repoRoot, 'scripts', 'reports');
fs.mkdirSync(outputPath, { recursive: true });

const jsonPath = path.join(outputPath, 'error-audit.json');
fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));

console.log(`\nSummary: ${report.length} findings written to ${path.relative(repoRoot, jsonPath)}`);

if (report.length > 0) {
  let counter = 0;
  let groupIndex = 1;
  console.log(`\nGrouped Findings:`);
  for (const finding of report) {
    if (counter % 30 === 0) {
      console.log(`\nGroup ${groupIndex}`);
      groupIndex += 1;
    }
    counter += 1;
    console.log(`${counter}. [${finding.task}] ${finding.message}`);
  }
}
