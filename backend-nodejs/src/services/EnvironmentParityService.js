import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from '../config/env.js';
import { healthcheck as databaseHealthcheck } from '../config/database.js';
import logger from '../config/logger.js';
import { getRedisClient } from '../config/redisClient.js';
import EnvironmentParitySnapshotModel from '../models/EnvironmentParitySnapshotModel.js';

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

function computeManifestHash(manifest) {
  const serialized = JSON.stringify(manifest ?? {});
  return createHash()
    .update(serialized)
    .digest('hex');
}

function mapMismatch(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  return {
    component: entry.component ?? null,
    status: entry.status ?? null,
    expected: entry.expected ?? null,
    observed: entry.observed ?? null
  };
}

function normaliseMismatchList(list = []) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((entry) => mapMismatch(entry))
    .filter((entry) => entry && entry.component);
}

function diffMismatches(previous = [], current = []) {
  const prevMap = new Map();
  for (const entry of normaliseMismatchList(previous)) {
    prevMap.set(entry.component, entry);
  }

  const introduced = [];
  const changed = [];
  const currentMap = new Map();

  for (const entry of normaliseMismatchList(current)) {
    currentMap.set(entry.component, entry);
    const previousEntry = prevMap.get(entry.component);
    if (!previousEntry) {
      introduced.push(entry);
    } else if (previousEntry.status !== entry.status) {
      changed.push({
        component: entry.component,
        from: previousEntry.status,
        to: entry.status,
        expected: entry.expected,
        observed: entry.observed
      });
    }
  }

  const resolved = [];
  for (const entry of prevMap.values()) {
    if (!currentMap.has(entry.component)) {
      resolved.push(entry);
    }
  }

  const limitList = (items) => items.slice(0, 10);

  return {
    introduced: limitList(introduced),
    resolved: limitList(resolved),
    changed: limitList(changed)
  };
}

export class EnvironmentParityService {
  constructor({ envConfig = env, manifestResolver, cacheTtlMs, historyLimit } = {}) {
    this.env = envConfig;
    const manifestFilePath =
      envConfig.environment.manifestPath ?? path.join(infrastructureRoot, 'environment-manifest.json');
    this.manifestResolver =
      manifestResolver ?? (() => loadManifest(manifestFilePath));
    this.logger = logger.child({ module: 'environmentParity' });
    const configuredTtl = cacheTtlMs ?? Number(envConfig.environment?.parityCacheTtlMs ?? 120000);
    this.cacheTtlMs = Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 120000;
    const configuredHistoryLimit = historyLimit ?? Number(envConfig.environment?.parityHistoryLimit ?? 5);
    this.historyLimit = Number.isFinite(configuredHistoryLimit) && configuredHistoryLimit > 0
      ? Math.min(Math.max(Math.round(configuredHistoryLimit), 1), 50)
      : 5;
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

    const environmentDescriptor = {
      name: this.env.environment.name ?? 'unknown',
      provider: this.env.environment.provider ?? 'unspecified',
      region: this.env.environment.region ?? null,
      tier: this.env.environment.tier ?? null,
      deploymentStrategy: this.env.environment.deploymentStrategy ?? null,
      parityBudgetMinutes: this.env.environment.parityBudgetMinutes ?? null,
      infrastructureOwner: this.env.environment.infrastructureOwner ?? null,
      gitSha: this.env.environment.gitSha ?? null,
      releaseChannel: this.env.environment.releaseChannel ?? null,
      host: os.hostname()
    };

    const manifestVersion = manifest?.version ?? null;
    const manifestHash = computeManifestHash({ manifest, runtime });

    const previousSnapshot = await EnvironmentParitySnapshotModel.findLatestForEnvironment({
      environmentName: environmentDescriptor.name,
      environmentProvider: environmentDescriptor.provider
    });

    const snapshot = await EnvironmentParitySnapshotModel.recordSnapshot({
      environmentName: environmentDescriptor.name,
      environmentProvider: environmentDescriptor.provider,
      environmentTier: environmentDescriptor.tier,
      releaseChannel: environmentDescriptor.releaseChannel,
      gitSha: environmentDescriptor.gitSha,
      manifestVersion,
      manifestHash,
      status: parityStatus,
      mismatchesCount: mismatches.length,
      mismatches,
      dependencies,
      metadata: {
        runtimeHost: environmentDescriptor.host,
        runtimeRegion: environmentDescriptor.region,
        deploymentStrategy: environmentDescriptor.deploymentStrategy
      },
      generatedAt: new Date()
    });

    const delta = diffMismatches(previousSnapshot?.mismatches, mismatches);
    const historyEntries = await EnvironmentParitySnapshotModel.listRecent(
      {
        environmentName: environmentDescriptor.name,
        environmentProvider: environmentDescriptor.provider,
        limit: this.historyLimit,
        excludeIds: snapshot ? [snapshot.id] : []
      }
    );

    const report = {
      environment: {
        name: environmentDescriptor.name,
        provider: environmentDescriptor.provider,
        region: environmentDescriptor.region,
        tier: environmentDescriptor.tier,
        deploymentStrategy: environmentDescriptor.deploymentStrategy,
        parityBudgetMinutes: environmentDescriptor.parityBudgetMinutes,
        infrastructureOwner: environmentDescriptor.infrastructureOwner,
        gitSha: environmentDescriptor.gitSha,
        releaseChannel: environmentDescriptor.releaseChannel,
        host: environmentDescriptor.host,
        manifestVersion
      },
      dependencies,
      manifest: {
        expected: manifest,
        observed: runtime
      },
      mismatches,
      status: parityStatus,
      generatedAt: new Date().toISOString(),
      cached: false,
      snapshot: snapshot
        ? {
            id: snapshot.id,
            status: snapshot.status,
            mismatchCount: snapshot.mismatchesCount,
            manifestHash: snapshot.manifestHash,
            generatedAt: snapshot.generatedAt?.toISOString?.() ?? snapshot.generatedAt
          }
        : null,
      previousSnapshot: previousSnapshot
        ? {
            id: previousSnapshot.id,
            status: previousSnapshot.status,
            mismatchCount: previousSnapshot.mismatchesCount,
            manifestHash: previousSnapshot.manifestHash,
            generatedAt:
              previousSnapshot.generatedAt?.toISOString?.() ?? previousSnapshot.generatedAt
          }
        : null,
      delta: {
        summary: {
          introduced: delta.introduced.length,
          resolved: delta.resolved.length,
          changed: delta.changed.length
        },
        introduced: delta.introduced,
        resolved: delta.resolved,
        changed: delta.changed
      },
      history: historyEntries.map((entry) => ({
        id: entry.id,
        status: entry.status,
        mismatchCount: entry.mismatchesCount,
        manifestHash: entry.manifestHash,
        generatedAt: entry.generatedAt?.toISOString?.() ?? entry.generatedAt
      }))
    };

    this.cachedReport = report;
    this.cacheExpiresAt = now + this.cacheTtlMs;

    return report;
  }
}

const service = new EnvironmentParityService();
export default service;
