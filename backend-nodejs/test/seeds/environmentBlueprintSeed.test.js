import { beforeAll, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';

const manifestPath = path.resolve('..', 'infrastructure/environment-manifest.json');

vi.mock('../../src/models/EnvironmentBlueprintModel.js', () => ({
  default: {
    upsert: vi.fn(),
    deleteMissingEnvironments: vi.fn()
  }
}));

describe('environment blueprint seed helpers', () => {
  let manifest;
  let seedModule;

  beforeAll(async () => {
    const contents = await fs.readFile(manifestPath, 'utf8');
    manifest = JSON.parse(contents);
    seedModule = await import('../../seeds/005_environment_blueprints.js');
  });

  it('derives blueprint records for each registry environment', () => {
    const records = seedModule.__test__.deriveBlueprintRecords(manifest);
    const registry = manifest.blueprints.backendService.registry;

    expect(records).toHaveLength(Object.keys(registry).length);
    const devRecord = records.find((record) => record.environmentName === 'dev');
    expect(devRecord).toMatchObject({
      blueprintKey: 'backendService',
      environmentName: 'dev',
      serviceName: 'backend-service',
      ssmParameterName: '/edulure/dev/api/environment-blueprint',
      observabilityDashboardHash: manifest.blueprints.backendService.observability.grafana.hash
    });
  });

  it('merges blueprint and environment metadata into registry records', () => {
    const blueprintDef = manifest.blueprints.backendService;
    const record = seedModule.__test__.createRecord({
      blueprintKey: 'backendService',
      blueprintDef,
      environmentKey: 'prod',
      environmentDescriptor: blueprintDef.registry.prod,
      manifest
    });

    expect(record.metadata).toMatchObject({
      manifestVersion: manifest.version,
      manifestPath: 'infrastructure/environment-manifest.json',
      pipelineScript: manifest.pipelines.deployment.script,
      tier: 'production',
      deploymentStrategy: blueprintDef.metadata.deploymentStrategy
    });
    expect(record.alarmOutputs).toEqual(['cpu_alarm_name', 'memory_alarm_name']);
  });
});
