#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SEMVER_PARTS = 3;

const toVersionTuple = (version) => {
  if (!version) {
    return null;
  }
  const cleaned = version.trim().replace(/^v/, '');
  const parts = cleaned.split('.').slice(0, SEMVER_PARTS).map((segment) => Number.parseInt(segment, 10));
  if (parts.some(Number.isNaN)) {
    return null;
  }
  while (parts.length < SEMVER_PARTS) {
    parts.push(0);
  }
  return parts;
};

const satisfiesMinimum = (current, minimum) => {
  const currentTuple = toVersionTuple(current);
  const minimumTuple = toVersionTuple(minimum);
  if (!currentTuple || !minimumTuple) {
    return false;
  }
  for (let index = 0; index < SEMVER_PARTS; index += 1) {
    if (currentTuple[index] > minimumTuple[index]) {
      return true;
    }
    if (currentTuple[index] < minimumTuple[index]) {
      return false;
    }
  }
  return true;
};

const getRootDirectory = () => {
  const scriptPath = fileURLToPath(import.meta.url);
  return resolve(dirname(scriptPath), '..');
};

const loadPackageConfig = async (rootDir) => {
  const packagePath = resolve(rootDir, 'package.json');
  const packageContents = await readFile(packagePath, 'utf8');
  return JSON.parse(packageContents);
};

const extractNpmVersionFromAgent = () => {
  const agent = process.env.npm_config_user_agent;
  if (!agent) {
    return null;
  }
  const match = agent.match(/npm\/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
};

const readNpmVersion = () => {
  const fromAgent = extractNpmVersionFromAgent();
  if (fromAgent) {
    return fromAgent;
  }
  try {
    const output = execSync('npm --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const lines = output.split(/\r?\n/);
    return lines[lines.length - 1];
  } catch (error) {
    return null;
  }
};

const ensurePackageManager = () => {
  const execPath = process.env.npm_execpath || '';
  if (execPath.includes('pnpm') || execPath.includes('yarn')) {
    console.error('\u274c  Edulure workspaces require npm for dependency governance.');
    console.error('    Detected npm_execpath=%s', execPath);
    process.exit(1);
  }
};

const main = async () => {
  ensurePackageManager();
  const rootDir = getRootDirectory();
  const pkg = await loadPackageConfig(rootDir);
  const minimumNode = pkg?.config?.minimumNodeVersion;
  const minimumNpm = pkg?.config?.minimumNpmVersion;
  if (!minimumNode || !minimumNpm) {
    console.error('\u274c  Missing minimum version configuration in package.json config section.');
    process.exit(1);
  }

  const currentNode = process.version;
  const currentNpm = readNpmVersion();

  if (!satisfiesMinimum(currentNode, minimumNode)) {
    console.error('\u274c  Node.js %s does not meet the minimum required version %s.', currentNode, minimumNode);
    console.error('    Use `nvm use` or install the documented runtime before continuing.');
    process.exit(1);
  }

  if (!currentNpm) {
    console.error('\u274c  Unable to determine npm version. Confirm npm is installed and on PATH.');
    process.exit(1);
  }

  if (!satisfiesMinimum(currentNpm, minimumNpm)) {
    console.error('\u274c  npm %s does not meet the minimum required version %s.', currentNpm, minimumNpm);
    console.error('    Update npm with `npm install -g npm@%s`.', minimumNpm);
    process.exit(1);
  }

  console.log('\u2705  Workspace runtime check passed: Node %s, npm %s.', currentNode.replace(/^v/, ''), currentNpm);
};

main().catch((error) => {
  console.error('\u274c  Failed to verify runtime versions.');
  console.error(error);
  process.exit(1);
});
