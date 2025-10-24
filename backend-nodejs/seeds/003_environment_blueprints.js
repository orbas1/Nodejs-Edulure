import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import EnvironmentBlueprintModel from '../src/models/EnvironmentBlueprintModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const manifestPath = path.join(repoRoot, 'infrastructure', 'environment-manifest.json');

async function loadManifest() {
  const contents = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(contents);
}

function normaliseAlarmOutputs(entryLevel, blueprintLevel) {
  const fromEntry = Array.isArray(entryLevel) ? entryLevel : [];
  const fromBlueprint = Array.isArray(blueprintLevel) ? blueprintLevel : [];
  return Array.from(new Set([...fromBlueprint, ...fromEntry].map((value) => String(value).trim()).filter(Boolean))).sort();
}

function createRecord({
  blueprintKey,
  blueprintDef,
  environmentKey,
  environmentDescriptor,
  manifest
}) {
  const modulePath = blueprintDef.modulePath ?? blueprintDef.module?.path;
  const moduleHash = blueprintDef.moduleHash ?? blueprintDef.module?.hash;
  const blueprintHash = environmentDescriptor.blueprintHash ?? blueprintDef.hash;
  const grafanaDescriptor = blueprintDef.observability?.grafana ?? {};
  const observabilityDashboardPath = environmentDescriptor.observabilityDashboardPath ?? grafanaDescriptor.path;
  const observabilityDashboardHash = environmentDescriptor.observabilityDashboardHash ?? grafanaDescriptor.hash;

  if (!blueprintHash) {
    throw new Error(`Blueprint ${blueprintKey} is missing a hash for environment ${environmentKey}`);
  }
  if (!modulePath || !moduleHash) {
    throw new Error(`Module metadata missing for blueprint ${blueprintKey}`);
  }
  if (!observabilityDashboardPath || !observabilityDashboardHash) {
    throw new Error(`Observability dashboard metadata missing for blueprint ${blueprintKey}`);
  }

  const ssmParameterName = environmentDescriptor.ssmParameter ?? environmentDescriptor.ssmParameterName;
  const runtimeEndpoint = environmentDescriptor.runtimeEndpoint ?? environmentDescriptor.endpoint;
  if (!ssmParameterName) {
    throw new Error(`SSM parameter missing for ${blueprintKey} ${environmentKey}`);
  }
  if (!runtimeEndpoint) {
    throw new Error(`Runtime endpoint missing for ${blueprintKey} ${environmentKey}`);
  }

  const metadata = {
    manifestVersion: manifest.version ?? 1,
    manifestPath: 'infrastructure/environment-manifest.json',
    pipelineScript: manifest.pipelines?.deployment?.script ?? null,
    documentation: blueprintDef.observability?.documentation ?? 'infrastructure/observability/README.md',
    ...((blueprintDef.metadata && typeof blueprintDef.metadata === 'object' && !Array.isArray(blueprintDef.metadata))
      ? blueprintDef.metadata
      : {}),
    ...((environmentDescriptor.metadata
      && typeof environmentDescriptor.metadata === 'object'
      && !Array.isArray(environmentDescriptor.metadata))
      ? environmentDescriptor.metadata
      : {})
  };

  return {
    blueprintKey,
    environmentName: environmentDescriptor.environment ?? environmentKey,
    environmentProvider: environmentDescriptor.provider ?? blueprintDef.provider ?? 'aws',
    serviceName: environmentDescriptor.serviceName ?? blueprintDef.service ?? blueprintKey,
    blueprintVersion: environmentDescriptor.version ?? blueprintDef.version ?? '1.0',
    blueprintHash,
    modulePath,
    moduleHash,
    ssmParameterName,
    runtimeEndpoint,
    observabilityDashboardPath,
    observabilityDashboardHash,
    alarmOutputs: normaliseAlarmOutputs(environmentDescriptor.alarmOutputs, blueprintDef.alarmOutputs),
    metadata
  };
}

function deriveBlueprintRecords(manifest) {
  const records = [];
  const blueprints = manifest.blueprints ?? {};

  for (const [blueprintKey, blueprintDef] of Object.entries(blueprints)) {
    const registry = blueprintDef.registry ?? {};
    for (const [environmentKey, environmentDescriptor] of Object.entries(registry)) {
      if (!environmentDescriptor) {
        continue;
      }
      records.push(
        createRecord({
          blueprintKey,
          blueprintDef,
          environmentKey,
          environmentDescriptor,
          manifest
        })
      );
    }
  }

  return records;
}

export async function seed(knex) {
  const manifest = await loadManifest();
  const records = deriveBlueprintRecords(manifest);
  if (!records.length) {
    return;
  }

  await knex.transaction(async (trx) => {
    const grouped = new Map();

    for (const record of records) {
      await EnvironmentBlueprintModel.upsert(record, trx);
      if (!grouped.has(record.blueprintKey)) {
        grouped.set(record.blueprintKey, new Set());
      }
      grouped.get(record.blueprintKey).add(record.environmentName);
    }

    for (const [blueprintKey, environments] of grouped.entries()) {
      await EnvironmentBlueprintModel.deleteMissingEnvironments(blueprintKey, Array.from(environments), trx);
    }
  });
}
