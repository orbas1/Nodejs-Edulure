import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import EnvironmentDescriptorModel from '../src/models/EnvironmentDescriptorModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const manifestPath = path.join(repoRoot, 'infrastructure', 'environment-manifest.json');

async function loadManifest() {
  const contents = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(contents);
}

function resolveDescriptorPath(repoBase, manifest, environmentKey) {
  const manifestEntry = manifest.environments?.[environmentKey];
  const descriptorEntry = manifestEntry?.descriptor;
  if (descriptorEntry?.path) {
    return path.join(repoBase, descriptorEntry.path);
  }
  return path.join(repoBase, 'infrastructure', 'environments', `${environmentKey}.json`);
}

async function loadDescriptor(repoBase, manifest, environmentKey) {
  const descriptorPath = resolveDescriptorPath(repoBase, manifest, environmentKey);
  try {
    const contents = await fs.readFile(descriptorPath, 'utf8');
    const payload = JSON.parse(contents);
    return {
      file: path.relative(repoBase, descriptorPath),
      hash: manifest.environments?.[environmentKey]?.descriptor?.hash ?? null,
      data: payload
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function normaliseArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) => (value === null || value === undefined ? '' : String(value).trim()))
    .filter(Boolean);
}

function selectDescriptorRecord({
  environmentKey,
  descriptor,
  manifest,
  manifestEntry
}) {
  if (!descriptor) {
    return null;
  }

  const blueprintRegistry = manifest.blueprints?.backendService?.registry ?? {};
  const registryRecord = blueprintRegistry[environmentKey] ?? {};
  const descriptorData = descriptor.data ?? {};

  const blueprintParameter = descriptorData.blueprint?.parameter
    ?? manifestEntry?.descriptor?.blueprintParameter
    ?? registryRecord?.ssmParameter
    ?? null;
  const runtimeEndpoint = descriptorData.blueprint?.runtimeEndpoint
    ?? manifestEntry?.descriptor?.runtimeEndpoint
    ?? registryRecord?.runtimeEndpoint
    ?? (environmentKey === 'prod'
      ? 'https://edulure.com/ops/runtime-blueprint.json'
      : `https://${environmentKey}.edulure.com/ops/runtime-blueprint.json`);
  const blueprintServiceName = descriptorData.blueprint?.service
    ?? registryRecord?.serviceName
    ?? manifest.blueprints?.backendService?.service
    ?? 'backend-service';

  const awsData = descriptorData.aws ?? {};
  const dockerCompose = descriptorData.dockerCompose ?? {};
  const observability = descriptorData.observability ?? {};
  const contacts = descriptorData.contacts ?? {};

  return {
    environmentName: descriptorData.environment ?? environmentKey,
    domain: descriptorData.domain ?? null,
    awsAccountAlias: awsData.accountAlias ?? null,
    awsRegion: awsData.region ?? null,
    awsVpcId: awsData.vpcId ?? null,
    awsPrivateSubnetTags: normaliseArray(awsData.privateSubnetTags),
    awsPublicSubnetTags: normaliseArray(awsData.publicSubnetTags),
    blueprintParameter,
    blueprintRuntimeEndpoint: runtimeEndpoint,
    blueprintServiceName,
    terraformWorkspace: descriptorData.terraformWorkspace ?? manifestEntry?.path ?? null,
    dockerComposeFile: dockerCompose.file ?? 'docker-compose.yml',
    dockerComposeCommand: dockerCompose.command ?? null,
    dockerComposeProfiles: normaliseArray(dockerCompose.profiles),
    observabilityDashboardPath: observability.dashboard
      ?? manifest.blueprints?.backendService?.observability?.grafana?.path
      ?? null,
    observabilityCloudwatchDashboard: observability.cloudwatchDashboard ?? null,
    contactsPrimary: contacts.primary ?? null,
    contactsOnCall: contacts.onCall ?? null,
    contactsAdditional: normaliseArray(contacts.additional),
    changeWindows: normaliseArray(descriptorData.changeWindows),
    notes: normaliseArray(descriptorData.notes),
    metadata: {
      manifestVersion: manifest.version ?? 1,
      manifestEnvironmentPath: manifestEntry?.path ?? null,
      descriptorFile: descriptor.file,
      descriptorHash: descriptor.hash,
      manifestEnvironmentHash: manifestEntry?.hash ?? null
    }
  };
}

export async function seed(knex) {
  const manifest = await loadManifest();
  const environments = Object.keys(manifest.environments ?? {});
  if (environments.length === 0) {
    return;
  }

  await knex.transaction(async (trx) => {
    const processedEnvironments = [];

    for (const environmentKey of environments) {
      const manifestEntry = manifest.environments[environmentKey];
      const descriptor = await loadDescriptor(repoRoot, manifest, environmentKey);
      const record = selectDescriptorRecord({
        environmentKey,
        descriptor,
        manifest,
        manifestEntry
      });

      if (!record) {
        continue;
      }

      await EnvironmentDescriptorModel.upsert(record, trx);
      processedEnvironments.push(record.environmentName);
    }

    await EnvironmentDescriptorModel.deleteMissingEnvironments(processedEnvironments, trx);
  });
}
