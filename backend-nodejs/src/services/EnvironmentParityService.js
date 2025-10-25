import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from '../config/env.js';
import { healthcheck as databaseHealthcheck } from '../config/database.js';
import logger from '../config/logger.js';
import { getRedisClient } from '../config/redisClient.js';
import EnvironmentBlueprintModel from '../models/EnvironmentBlueprintModel.js';
import EnvironmentDescriptorModel from '../models/EnvironmentDescriptorModel.js';
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

function normaliseStringList(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique = new Set();
  for (const entry of values) {
    if (entry === null || entry === undefined) {
      continue;
    }
    const trimmed = String(entry).trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

function normaliseNoteList(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => (entry === null || entry === undefined ? '' : String(entry).trim()))
    .filter(Boolean);
}

async function loadDescriptorData(manifest, environmentKey) {
  const descriptorEntry = manifest.environments?.[environmentKey]?.descriptor ?? {};
  const relativePath = descriptorEntry.path
    ?? path.join('infrastructure', 'environments', `${environmentKey}.json`);
  const absolutePath = path.resolve(projectRoot, '..', relativePath);

  try {
    const contents = await fs.readFile(absolutePath, 'utf8');
    return {
      file: relativePath,
      hash: descriptorEntry.hash ?? null,
      payload: JSON.parse(contents)
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function deriveDescriptorExpectation({ manifest, environmentKey, descriptorData }) {
  if (!descriptorData) {
    return null;
  }

  const manifestEntry = manifest.environments?.[environmentKey] ?? {};
  const blueprintEntry = manifest.blueprints?.backendService ?? {};
  const registryRecord = blueprintEntry.registry?.[environmentKey] ?? {};
  const payload = descriptorData.payload ?? {};
  const aws = payload.aws ?? {};
  const dockerCompose = payload.dockerCompose ?? {};
  const observability = payload.observability ?? {};
  const contacts = payload.contacts ?? {};

  const parameter = payload.blueprint?.parameter
    ?? manifestEntry.descriptor?.blueprintParameter
    ?? registryRecord.ssmParameter
    ?? null;

  const runtimeEndpoint = payload.blueprint?.runtimeEndpoint
    ?? manifestEntry.descriptor?.runtimeEndpoint
    ?? registryRecord.runtimeEndpoint
    ?? (environmentKey === 'prod'
      ? 'https://edulure.com/ops/runtime-blueprint.json'
      : `https://${environmentKey}.edulure.com/ops/runtime-blueprint.json`);

  const serviceName = payload.blueprint?.service
    ?? registryRecord.serviceName
    ?? blueprintEntry.service
    ?? 'backend-service';

  return {
    environment: payload.environment ?? environmentKey,
    domain: payload.domain ?? null,
    awsAccountAlias: aws.accountAlias ?? null,
    awsRegion: aws.region ?? null,
    awsVpcId: aws.vpcId ?? null,
    awsPrivateSubnetTags: normaliseStringList(aws.privateSubnetTags),
    awsPublicSubnetTags: normaliseStringList(aws.publicSubnetTags),
    blueprintParameter: parameter,
    blueprintRuntimeEndpoint: runtimeEndpoint,
    blueprintServiceName: serviceName,
    terraformWorkspace: payload.terraformWorkspace ?? manifestEntry.path ?? null,
    dockerComposeFile: dockerCompose.file ?? 'docker-compose.yml',
    dockerComposeCommand: dockerCompose.command ?? null,
    dockerComposeProfiles: normaliseStringList(dockerCompose.profiles),
    observabilityDashboardPath: observability.dashboard
      ?? blueprintEntry.observability?.grafana?.path
      ?? null,
    observabilityCloudwatchDashboard: observability.cloudwatchDashboard ?? null,
    contactsPrimary: contacts.primary ?? null,
    contactsOnCall: contacts.onCall ?? null,
    contactsAdditional: normaliseStringList(contacts.additional),
    changeWindows: normaliseStringList(payload.changeWindows),
    notes: normaliseNoteList(payload.notes),
    metadata: {
      manifestVersion: manifest.version ?? 1,
      manifestEnvironmentPath: manifestEntry.path ?? null,
      descriptorFile: descriptorData.file,
      descriptorHash: descriptorData.hash,
      manifestEnvironmentHash: manifestEntry.hash ?? null
    }
  };
}

async function buildDescriptorExpectations(manifest) {
  const result = {};
  const environmentKeys = Object.keys(manifest.environments ?? {});

  for (const environmentKey of environmentKeys) {
    const descriptorData = await loadDescriptorData(manifest, environmentKey);
    const expectation = deriveDescriptorExpectation({
      manifest,
      environmentKey,
      descriptorData
    });

    if (expectation) {
      result[environmentKey] = expectation;
    }
  }

  return result;
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
    const logger = this.logger;

    const manifestSections = manifest ?? (await this.manifestResolver());

    async function safeHashPath(targetPath) {
      if (!targetPath) {
        return null;
      }

      try {
        return await hashPath(targetPath, { relativeTo: relativeBase });
      } catch (error) {
        if (logger && typeof logger.warn === 'function') {
          logger.warn({ err: error, target: targetPath }, 'Failed to hash manifest artefact');
        }
        return null;
      }
    }

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

    const blueprintRecords = await EnvironmentBlueprintModel.listAll();
    const descriptorRecords = await EnvironmentDescriptorModel.listAll();

    const recordsByBlueprint = blueprintRecords.reduce((acc, record) => {
      if (!acc.has(record.blueprintKey)) {
        acc.set(record.blueprintKey, new Map());
      }
      acc.get(record.blueprintKey).set(record.environmentName, record);
      return acc;
    }, new Map());

    const descriptorMap = descriptorRecords.reduce((acc, record) => {
      acc.set(record.environmentName, {
        environment: record.environmentName,
        domain: record.domain ?? null,
        awsAccountAlias: record.awsAccountAlias ?? null,
        awsRegion: record.awsRegion ?? null,
        awsVpcId: record.awsVpcId ?? null,
        awsPrivateSubnetTags: normaliseStringList(record.awsPrivateSubnetTags),
        awsPublicSubnetTags: normaliseStringList(record.awsPublicSubnetTags),
        blueprintParameter: record.blueprintParameter ?? null,
        blueprintRuntimeEndpoint: record.blueprintRuntimeEndpoint ?? null,
        blueprintServiceName: record.blueprintServiceName ?? null,
        terraformWorkspace: record.terraformWorkspace ?? null,
        dockerComposeFile: record.dockerComposeFile ?? null,
        dockerComposeCommand: record.dockerComposeCommand ?? null,
        dockerComposeProfiles: normaliseStringList(record.dockerComposeProfiles),
        observabilityDashboardPath: record.observabilityDashboardPath ?? null,
        observabilityCloudwatchDashboard: record.observabilityCloudwatchDashboard ?? null,
        contactsPrimary: record.contactsPrimary ?? null,
        contactsOnCall: record.contactsOnCall ?? null,
        contactsAdditional: normaliseStringList(record.contactsAdditional),
        changeWindows: normaliseStringList(record.changeWindows),
        notes: normaliseNoteList(record.notes),
        metadata: record.metadata ?? {}
      });
      return acc;
    }, new Map());

    async function computeBlueprintSections(entries) {
      const result = {};

      for (const [blueprintKey, descriptor] of Object.entries(entries ?? {})) {
        const runtimeEntry = {
          path: descriptor.path ?? null,
          hash: null,
          modulePath: descriptor.modulePath ?? descriptor.module?.path ?? null,
          moduleHash: null,
          observability: {},
          registry: {}
        };

        if (descriptor.path) {
          const absoluteBlueprintPath = path.resolve(relativeBase, descriptor.path);
          runtimeEntry.path = path.relative(relativeBase, absoluteBlueprintPath);
          runtimeEntry.hash = await safeHashPath(absoluteBlueprintPath);
        }

        if (runtimeEntry.modulePath) {
          const absoluteModulePath = path.resolve(relativeBase, runtimeEntry.modulePath);
          runtimeEntry.modulePath = path.relative(relativeBase, absoluteModulePath);
          runtimeEntry.moduleHash = await safeHashPath(absoluteModulePath);
        }

        const observabilityPath = descriptor.observability?.grafana?.path
          ?? descriptor.dashboard
          ?? null;
        if (observabilityPath) {
          const absoluteObservabilityPath = path.resolve(relativeBase, observabilityPath);
          runtimeEntry.observability.grafana = {
            path: path.relative(relativeBase, absoluteObservabilityPath),
            hash: await safeHashPath(absoluteObservabilityPath)
          };
        }

        const expectedRegistry = descriptor.registry ?? {};
        const recordMap = recordsByBlueprint.get(blueprintKey) ?? new Map();

        const toSanitisedRecord = (record) => ({
          environment: record.environmentName,
          provider: record.environmentProvider,
          serviceName: record.serviceName,
          blueprintVersion: record.blueprintVersion,
          blueprintHash: record.blueprintHash,
          moduleHash: record.moduleHash,
          ssmParameterName: record.ssmParameterName,
          runtimeEndpoint: record.runtimeEndpoint,
          observabilityDashboardHash: record.observabilityDashboardHash,
          alarmOutputs: Array.isArray(record.alarmOutputs) ? [...record.alarmOutputs] : [],
          metadata: record.metadata
        });

        for (const envKey of Object.keys(expectedRegistry)) {
          const record = recordMap.get(envKey);
          runtimeEntry.registry[envKey] = record ? toSanitisedRecord(record) : null;
        }

        for (const [envKey, record] of recordMap.entries()) {
          if (!Object.prototype.hasOwnProperty.call(expectedRegistry, envKey)) {
            runtimeEntry.registry[envKey] = toSanitisedRecord(record);
          }
        }

        result[blueprintKey] = runtimeEntry;
      }

      return result;
    }

    sections.blueprints = await computeBlueprintSections(manifestSections.blueprints);
    sections.descriptors = Object.fromEntries(descriptorMap.entries());

    return sections;
  }

  compareManifest(manifest, runtime, { descriptorExpectations = {} } = {}) {
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

    const normaliseAlarmList = normaliseStringList;

    function sanitizeBlueprintRecord(record) {
      if (!record) {
        return null;
      }
      return {
        environment: record.environment ?? record.environmentName ?? null,
        provider: record.provider ?? record.environmentProvider ?? null,
        serviceName: record.serviceName ?? null,
        blueprintVersion: record.blueprintVersion ?? record.version ?? null,
        blueprintHash: record.blueprintHash ?? null,
        moduleHash: record.moduleHash ?? null,
        ssmParameter: record.ssmParameter ?? record.ssmParameterName ?? null,
        runtimeEndpoint: record.runtimeEndpoint ?? null,
        observabilityDashboardHash: record.observabilityDashboardHash ?? null,
        alarmOutputs: normaliseAlarmList(record.alarmOutputs),
        metadata: record.metadata ?? null
      };
    }

    function compareBlueprintRegistry(blueprintKey, expectedDescriptor, actualDescriptor) {
      const expectedRegistry = expectedDescriptor?.registry ?? {};
      const actualRegistry = actualDescriptor?.registry ?? {};

      for (const [environmentKey, expectedRecord] of Object.entries(expectedRegistry)) {
        const actualRecord = actualRegistry[environmentKey];
        if (!actualRecord) {
          mismatches.push({
            component: `blueprints.${blueprintKey}.registry.${environmentKey}`,
            status: 'missing',
            expected: expectedRecord,
            observed: null
          });
          continue;
        }

        const expectedAlarms = normaliseAlarmList(expectedRecord?.alarmOutputs);
        const actualAlarms = normaliseAlarmList(actualRecord?.alarmOutputs);

        const issues = [];
        if (expectedRecord?.blueprintHash && expectedRecord.blueprintHash !== actualRecord.blueprintHash) {
          issues.push('blueprintHash');
        }
        if (expectedRecord?.moduleHash && expectedRecord.moduleHash !== actualRecord.moduleHash) {
          issues.push('moduleHash');
        }
        if (expectedRecord?.ssmParameter && expectedRecord.ssmParameter !== actualRecord.ssmParameterName) {
          issues.push('ssmParameter');
        }
        if (expectedRecord?.runtimeEndpoint && expectedRecord.runtimeEndpoint !== actualRecord.runtimeEndpoint) {
          issues.push('runtimeEndpoint');
        }
        if (
          expectedRecord?.observabilityDashboardHash
          && expectedRecord.observabilityDashboardHash !== actualRecord.observabilityDashboardHash
        ) {
          issues.push('observabilityDashboardHash');
        }
        if (expectedRecord?.serviceName && expectedRecord.serviceName !== actualRecord.serviceName) {
          issues.push('serviceName');
        }
        if (expectedRecord?.version && expectedRecord.version !== actualRecord.blueprintVersion) {
          issues.push('version');
        }
        if (expectedAlarms.length && expectedAlarms.join('|') !== actualAlarms.join('|')) {
          issues.push('alarmOutputs');
        }

        if (issues.length > 0) {
          mismatches.push({
            component: `blueprints.${blueprintKey}.registry.${environmentKey}`,
            status: 'mismatch',
            expected: { ...expectedRecord, alarmOutputs: expectedAlarms },
            observed: { ...sanitizeBlueprintRecord(actualRecord), alarmOutputs: actualAlarms },
            details: { fields: issues }
          });
        }
      }

      for (const environmentKey of Object.keys(actualRegistry)) {
        if (!Object.prototype.hasOwnProperty.call(expectedRegistry, environmentKey)) {
          mismatches.push({
            component: `blueprints.${blueprintKey}.registry.${environmentKey}`,
            status: 'unexpected',
            expected: null,
            observed: sanitizeBlueprintRecord(actualRegistry[environmentKey])
          });
        }
      }
    }

    function compareDescriptors(expectedDescriptors = {}, actualDescriptors = {}) {
      for (const [environmentKey, expectedRecord] of Object.entries(expectedDescriptors)) {
        const actualRecord = actualDescriptors[environmentKey];
        if (!actualRecord) {
          mismatches.push({
            component: `descriptors.${environmentKey}`,
            status: 'missing',
            expected: expectedRecord,
            observed: null
          });
          continue;
        }

        const fieldsToCompare = [
          'domain',
          'awsAccountAlias',
          'awsRegion',
          'awsVpcId',
          'blueprintParameter',
          'blueprintRuntimeEndpoint',
          'blueprintServiceName',
          'terraformWorkspace',
          'dockerComposeFile',
          'dockerComposeCommand',
          'observabilityDashboardPath',
          'observabilityCloudwatchDashboard',
          'contactsPrimary',
          'contactsOnCall'
        ];

        const arrayFields = [
          'awsPrivateSubnetTags',
          'awsPublicSubnetTags',
          'dockerComposeProfiles',
          'contactsAdditional',
          'changeWindows'
        ];

        const noteFields = ['notes'];

        const issues = [];

        for (const field of fieldsToCompare) {
          if ((expectedRecord?.[field] ?? null) !== (actualRecord?.[field] ?? null)) {
            issues.push(field);
          }
        }

        for (const field of arrayFields) {
          const expectedValues = normaliseStringList(expectedRecord?.[field]);
          const actualValues = normaliseStringList(actualRecord?.[field]);
          if (expectedValues.join('|') !== actualValues.join('|')) {
            issues.push(field);
          }
        }

        for (const field of noteFields) {
          const expectedValues = normaliseNoteList(expectedRecord?.[field]);
          const actualValues = normaliseNoteList(actualRecord?.[field]);
          if (expectedValues.join('|') !== actualValues.join('|')) {
            issues.push(field);
          }
        }

        if (issues.length > 0) {
          mismatches.push({
            component: `descriptors.${environmentKey}`,
            status: 'mismatch',
            expected: expectedRecord,
            observed: actualRecord,
            details: { fields: issues }
          });
        }
      }

      for (const environmentKey of Object.keys(actualDescriptors)) {
        if (!Object.prototype.hasOwnProperty.call(expectedDescriptors, environmentKey)) {
          mismatches.push({
            component: `descriptors.${environmentKey}`,
            status: 'unexpected',
            expected: null,
            observed: actualDescriptors[environmentKey]
          });
        }
      }
    }

    evaluate('modules', manifest.modules, runtime.modules);
    evaluate('environments', manifest.environments, runtime.environments);
    evaluate('docker', manifest.docker, runtime.docker);
    evaluate('scripts', manifest.scripts, runtime.scripts);
    evaluate('root', manifest.root, runtime.root);
    evaluate('blueprints', manifest.blueprints, runtime.blueprints);

    const expectedBlueprints = manifest.blueprints ?? {};
    const actualBlueprints = runtime.blueprints ?? {};
    for (const [blueprintKey, expectedDescriptor] of Object.entries(expectedBlueprints)) {
      const actualDescriptor = actualBlueprints[blueprintKey];
      if (actualDescriptor) {
        compareBlueprintRegistry(blueprintKey, expectedDescriptor, actualDescriptor);
      }
    }
    compareDescriptors(descriptorExpectations, runtime.descriptors ?? {});

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
    const descriptorExpectations = await buildDescriptorExpectations(manifest);
    const mismatches = this.compareManifest(manifest, runtime, { descriptorExpectations });
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
        observed: runtime,
        descriptors: descriptorExpectations
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
