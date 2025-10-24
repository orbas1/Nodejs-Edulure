import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/database.js', () => ({
  default: {},
  healthcheck: vi.fn()
}));

import EnvironmentBlueprintModel from '../../src/models/EnvironmentBlueprintModel.js';

describe('EnvironmentBlueprintModel', () => {
  it('serializes payloads into database columns with normalised values', () => {
    const payload = {
      blueprintKey: ' backendService ',
      environmentName: 'PROD',
      environmentProvider: ' AWS ',
      serviceName: ' backend-service ',
      blueprintVersion: '2024.06 ',
      blueprintHash: 'hash-value',
      modulePath: ' infrastructure/terraform/modules/backend_service ',
      moduleHash: 'module-hash',
      ssmParameterName: ' /edulure/prod/api/environment-blueprint ',
      runtimeEndpoint: ' https://edulure.com/ops/runtime-blueprint.json ',
      observabilityDashboardPath: ' infrastructure/observability/grafana/dashboards/environment-runtime.json ',
      observabilityDashboardHash: 'dashboard-hash',
      alarmOutputs: ['cpu_alarm_name', 'memory_alarm_name', 'cpu_alarm_name', ''],
      metadata: {
        manifestVersion: 1,
        extra: 'value'
      }
    };

    const serialized = EnvironmentBlueprintModel.serialize(payload);

    expect(serialized).toEqual({
      blueprint_key: 'backendService',
      environment_name: 'prod',
      environment_provider: 'aws',
      service_name: 'backend-service',
      blueprint_version: '2024.06',
      blueprint_hash: 'hash-value',
      module_path: 'infrastructure/terraform/modules/backend_service',
      module_hash: 'module-hash',
      ssm_parameter_name: '/edulure/prod/api/environment-blueprint',
      runtime_endpoint: 'https://edulure.com/ops/runtime-blueprint.json',
      observability_dashboard_path: 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
      observability_dashboard_hash: 'dashboard-hash',
      alarm_outputs: '["cpu_alarm_name","memory_alarm_name"]',
      metadata: '{"manifestVersion":1,"extra":"value"}'
    });
  });

  it('deserializes database rows into domain records', () => {
    const now = new Date('2024-03-01T12:34:56.000Z');
    const row = {
      id: 42,
      blueprint_key: 'backendService',
      environment_name: 'prod',
      environment_provider: 'aws',
      service_name: 'backend-service',
      blueprint_version: '2024.06',
      blueprint_hash: 'hash-value',
      module_path: 'infrastructure/terraform/modules/backend_service',
      module_hash: 'module-hash',
      ssm_parameter_name: '/edulure/prod/api/environment-blueprint',
      runtime_endpoint: 'https://edulure.com/ops/runtime-blueprint.json',
      observability_dashboard_path: 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
      observability_dashboard_hash: 'dashboard-hash',
      alarm_outputs: '["cpu_alarm_name","memory_alarm_name"]',
      metadata: '{"tier":"production"}',
      recorded_at: now.toISOString(),
      created_at: now,
      updated_at: now.toISOString()
    };

    const record = EnvironmentBlueprintModel.deserialize(row);

    expect(record).toEqual({
      id: 42,
      blueprintKey: 'backendService',
      environmentName: 'prod',
      environmentProvider: 'aws',
      serviceName: 'backend-service',
      blueprintVersion: '2024.06',
      blueprintHash: 'hash-value',
      modulePath: 'infrastructure/terraform/modules/backend_service',
      moduleHash: 'module-hash',
      ssmParameterName: '/edulure/prod/api/environment-blueprint',
      runtimeEndpoint: 'https://edulure.com/ops/runtime-blueprint.json',
      observabilityDashboardPath: 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
      observabilityDashboardHash: 'dashboard-hash',
      alarmOutputs: ['cpu_alarm_name', 'memory_alarm_name'],
      metadata: { tier: 'production' },
      recordedAt: new Date(now.toISOString()),
      createdAt: now,
      updatedAt: new Date(now.toISOString())
    });
  });
});
