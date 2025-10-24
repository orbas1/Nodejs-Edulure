import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from '../config/env.js';
import { healthcheck as databaseHealthcheck } from '../config/database.js';
import logger from '../config/logger.js';
import { getRedisClient } from '../config/redisClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const infrastructureRoot = path.resolve(projectRoot, '..', 'infrastructure');

function createHash() {
  return crypto.createHash('sha256');
}

async function hashPath(targetPath, { relativeTo }) {
  const stats = await fs.lstat(targetPath);
  if (stats.isSymbolicLink()) {
    const linkTarget = await fs.readlink(targetPath);
    return createHash().update('link').update(linkTarget).digest('hex');
  }

  if (stats.isDirectory()) {
    const entries = (await fs.readdir(targetPath)).filter(
      (entry) => !['.terraform', '.terragrunt-cache', 'node_modules', '.DS_Store'].includes(entry)
    );
    entries.sort();
    const hash = createHash().update('dir');
    for (const entry of entries) {
      const entryPath = path.join(targetPath, entry);
      const entryHash = await hashPath(entryPath, { relativeTo });
      hash.update(entry).update(entryHash);
    }
    return hash.digest('hex');
  }

  const data = await fs.readFile(targetPath);
  return createHash().update(path.relative(relativeTo, targetPath)).update(data).digest('hex');
}

async function loadManifest(manifestFilePath) {
  const contents = await fs.readFile(manifestFilePath, 'utf8');
  return JSON.parse(contents);
}

export class EnvironmentParityService {
  constructor({ envConfig = env, manifestResolver, cacheTtlMs } = {}) {
    this.env = envConfig;
    const manifestFilePath =
      envConfig.environment.manifestPath ?? path.join(infrastructureRoot, 'environment-manifest.json');
    this.manifestResolver =
      manifestResolver ?? (() => loadManifest(manifestFilePath));
    this.logger = logger.child({ module: 'environmentParity' });
    const configuredTtl = cacheTtlMs ?? Number(envConfig.environment?.parityCacheTtlMs ?? 120000);
    this.cacheTtlMs = Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 120000;
    this.cachedReport = null;
    this.cacheExpiresAt = 0;
  }

  async describeRuntimeState({ manifest }) {
    const sections = {};
    const relativeBase = path.join(projectRoot, '..');

    const manifestSections = manifest ?? (await this.manifestResolver());

    async function computeSection(entries) {
      const hashes = {};
      for (const [key, descriptor] of Object.entries(entries ?? {})) {
        const { path: relativePath } =
          typeof descriptor === 'string' ? { path: descriptor } : descriptor;
        const targetPath = path.resolve(relativeBase, relativePath);
        hashes[key] = {
          path: path.relative(relativeBase, targetPath),
          hash: await hashPath(targetPath, { relativeTo: relativeBase })
        };
      }
      return hashes;
    }

    sections.modules = await computeSection(manifestSections.modules);
    sections.environments = await computeSection(manifestSections.environments);
    sections.docker = await computeSection(manifestSections.docker);
    sections.scripts = await computeSection(manifestSections.scripts);
    sections.root = {
      'docker-compose.yml': {
        path: path.relative(relativeBase, path.join(projectRoot, '..', 'docker-compose.yml')),
        hash: await hashPath(path.join(projectRoot, '..', 'docker-compose.yml'), {
          relativeTo: relativeBase
        })
      }
    };

    return sections;
  }

  compareManifest(manifest, runtime) {
    const mismatches = [];

    function evaluate(sectionName, expectedEntries = {}, actualEntries = {}) {
      for (const [key, expectedDescriptor] of Object.entries(expectedEntries)) {
        const actual = actualEntries[key];
        const expected =
          typeof expectedDescriptor === 'string'
            ? { hash: expectedDescriptor, path: expectedDescriptor }
            : expectedDescriptor;

        if (!actual) {
          mismatches.push({
            component: `${sectionName}.${key}`,
            status: 'missing',
            expected,
            observed: null
          });
        } else if (expected.hash && actual.hash !== expected.hash) {
          mismatches.push({
            component: `${sectionName}.${key}`,
            status: 'drifted',
            expected,
            observed: actual
          });
        } else if (expected.path && actual.path !== expected.path) {
          mismatches.push({
            component: `${sectionName}.${key}`,
            status: 'relocated',
            expected,
            observed: actual
          });
        }
      }

      for (const [key, actual] of Object.entries(actualEntries)) {
        if (!Object.prototype.hasOwnProperty.call(expectedEntries, key)) {
          mismatches.push({
            component: `${sectionName}.${key}`,
            status: 'unexpected',
            expected: null,
            observed: actual
          });
        }
      }
    }

    evaluate('modules', manifest.modules, runtime.modules);
    evaluate('environments', manifest.environments, runtime.environments);
    evaluate('docker', manifest.docker, runtime.docker);
    evaluate('scripts', manifest.scripts, runtime.scripts);
    evaluate('root', manifest.root, runtime.root);

    return mismatches;
  }

  async runDependencyChecks() {
    const results = [];

    try {
      await databaseHealthcheck();
      results.push({ component: 'database', status: 'healthy' });
    } catch (error) {
      this.logger.error({ err: error }, 'Database healthcheck failed');
      results.push({
        component: 'database',
        status: 'failed',
        message: error.message
      });
    }

    if (this.env.redis.enabled) {
      const client = getRedisClient();
      try {
        await client.ping();
        results.push({ component: 'redis', status: 'healthy' });
      } catch (error) {
        this.logger.error({ err: error }, 'Redis ping failed');
        results.push({ component: 'redis', status: 'failed', message: error.message });
      }
    } else {
      results.push({ component: 'redis', status: 'skipped', message: 'Redis disabled' });
    }

    return results;
  }

  deriveParitySummary({ mismatches, dependencies }) {
    const failedDependencies = dependencies.filter((check) => check.status === 'failed');
    const hasDrift = mismatches.length > 0;

    if (failedDependencies.length > 0) {
      return 'degraded';
    }

    if (hasDrift) {
      return 'drifted';
    }

    return 'healthy';
  }

  async generateReport({ forceRefresh = false } = {}) {
    const now = Date.now();
    if (!forceRefresh && this.cachedReport && now < this.cacheExpiresAt) {
      return { ...this.cachedReport, cached: true };
    }

    const manifest = await this.manifestResolver();
    const runtime = await this.describeRuntimeState({ manifest });
    const mismatches = this.compareManifest(manifest, runtime);
    const dependencies = await this.runDependencyChecks();

    const parityStatus = this.deriveParitySummary({ mismatches, dependencies });

    const report = {
      environment: {
        name: this.env.environment.name,
        provider: this.env.environment.provider,
        region: this.env.environment.region,
        tier: this.env.environment.tier,
        deploymentStrategy: this.env.environment.deploymentStrategy,
        parityBudgetMinutes: this.env.environment.parityBudgetMinutes,
        infrastructureOwner: this.env.environment.infrastructureOwner,
        gitSha: this.env.environment.gitSha,
        releaseChannel: this.env.environment.releaseChannel,
        host: os.hostname(),
        manifestVersion: manifest.version
      },
      dependencies,
      manifest: {
        expected: manifest,
        observed: runtime
      },
      mismatches,
      status: parityStatus,
      generatedAt: new Date().toISOString(),
      cached: false
    };

    this.cachedReport = report;
    this.cacheExpiresAt = now + this.cacheTtlMs;

    return report;
  }
}

const service = new EnvironmentParityService();
export default service;
