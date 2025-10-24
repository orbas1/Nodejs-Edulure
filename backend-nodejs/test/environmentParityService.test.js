import { describe, expect, it, beforeAll, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

const manifestPath = path.resolve('..', 'infrastructure/environment-manifest.json');

const blueprintRegistryMock = [
  {
    blueprintKey: 'backendService',
    environmentName: 'dev',
    environmentProvider: 'aws',
    serviceName: 'backend-service',
    blueprintVersion: '2024.06',
    blueprintHash: '6be3c60ffc9dcdf9624a376dc5da5fe74d535cfa94362916eac25859b2a5c381',
    modulePath: 'infrastructure/terraform/modules/backend_service',
    moduleHash: '7c5827dc2833b557edd7930bf54ea7098bea09d5987a147ba0b37a2bd6a2c0c9',
    ssmParameterName: '/edulure/dev/api/environment-blueprint',
    runtimeEndpoint: 'https://dev.edulure.com/ops/runtime-blueprint.json',
    observabilityDashboardPath: 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
    observabilityDashboardHash: 'ca765a54a76f9255d436ef3ffbbddf256fa8c13b5f7c9b0d3984ec810b04314a',
    alarmOutputs: ['cpu_alarm_name', 'memory_alarm_name'],
    metadata: { tier: 'nonprod' }
  },
  {
    blueprintKey: 'backendService',
    environmentName: 'staging',
    environmentProvider: 'aws',
    serviceName: 'backend-service',
    blueprintVersion: '2024.06',
    blueprintHash: '6be3c60ffc9dcdf9624a376dc5da5fe74d535cfa94362916eac25859b2a5c381',
    modulePath: 'infrastructure/terraform/modules/backend_service',
    moduleHash: '7c5827dc2833b557edd7930bf54ea7098bea09d5987a147ba0b37a2bd6a2c0c9',
    ssmParameterName: '/edulure/staging/api/environment-blueprint',
    runtimeEndpoint: 'https://staging.edulure.com/ops/runtime-blueprint.json',
    observabilityDashboardPath: 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
    observabilityDashboardHash: 'ca765a54a76f9255d436ef3ffbbddf256fa8c13b5f7c9b0d3984ec810b04314a',
    alarmOutputs: ['cpu_alarm_name', 'memory_alarm_name'],
    metadata: { tier: 'preprod' }
  },
  {
    blueprintKey: 'backendService',
    environmentName: 'prod',
    environmentProvider: 'aws',
    serviceName: 'backend-service',
    blueprintVersion: '2024.06',
    blueprintHash: '6be3c60ffc9dcdf9624a376dc5da5fe74d535cfa94362916eac25859b2a5c381',
    modulePath: 'infrastructure/terraform/modules/backend_service',
    moduleHash: '7c5827dc2833b557edd7930bf54ea7098bea09d5987a147ba0b37a2bd6a2c0c9',
    ssmParameterName: '/edulure/prod/api/environment-blueprint',
    runtimeEndpoint: 'https://edulure.com/ops/runtime-blueprint.json',
    observabilityDashboardPath: 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
    observabilityDashboardHash: 'ca765a54a76f9255d436ef3ffbbddf256fa8c13b5f7c9b0d3984ec810b04314a',
    alarmOutputs: ['cpu_alarm_name', 'memory_alarm_name'],
    metadata: { tier: 'production' }
  }
];

const descriptorRegistryMock = [
  {
    environmentName: 'dev',
    domain: 'dev.edulure.com',
    awsAccountAlias: 'edulure-dev',
    awsRegion: 'us-east-1',
    awsVpcId: 'vpc-dev-edulure',
    awsPrivateSubnetTags: ['tier:nonprod', 'app:edulure-api'],
    awsPublicSubnetTags: ['tier:edge', 'app:edulure-alb'],
    blueprintParameter: '/edulure/dev/api/environment-blueprint',
    blueprintRuntimeEndpoint: 'https://dev.edulure.com/ops/runtime-blueprint.json',
    blueprintServiceName: 'backend-service',
    terraformWorkspace: 'infrastructure/terraform/envs/dev',
    dockerComposeFile: 'docker-compose.yml',
    dockerComposeCommand: 'docker compose --profile dev up --build',
    dockerComposeProfiles: ['dev'],
    observabilityDashboardPath: 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
    observabilityCloudwatchDashboard: 'edulure-dev-api-observability',
    contactsPrimary: 'platform@edulure.com',
    contactsOnCall: 'platform-oncall@edulure.com',
    contactsAdditional: [],
    changeWindows: ['Weekdays 14:00-22:00 UTC'],
    notes: [
      'CI publishes ephemeral feature branches into dev for smoke testing.',
      'Blueprint payload stored in SSM for parity with staging and production.'
    ],
    metadata: {
      manifestVersion: 1,
      manifestEnvironmentPath: 'infrastructure/terraform/envs/dev',
      descriptorFile: 'infrastructure/environments/dev.json',
      descriptorHash: '204b41157e69413d66acbc7677647f1216f93e3a89fe77c81a105fb9149268e7',
      manifestEnvironmentHash: '56535a2195ec5ef93d89b41b29b140d9b8e1ee18dedb87a91495507fde4b2c92'
    }
  },
  {
    environmentName: 'staging',
    domain: 'staging.edulure.com',
    awsAccountAlias: 'edulure-staging',
    awsRegion: 'us-east-1',
    awsVpcId: 'vpc-staging-edulure',
    awsPrivateSubnetTags: ['tier:preprod', 'app:edulure-api'],
    awsPublicSubnetTags: ['tier:edge', 'app:edulure-alb'],
    blueprintParameter: '/edulure/staging/api/environment-blueprint',
    blueprintRuntimeEndpoint: 'https://staging.edulure.com/ops/runtime-blueprint.json',
    blueprintServiceName: 'backend-service',
    terraformWorkspace: 'infrastructure/terraform/envs/staging',
    dockerComposeFile: 'docker-compose.yml',
    dockerComposeCommand: 'docker compose --profile staging up --build',
    dockerComposeProfiles: ['staging'],
    observabilityDashboardPath: 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
    observabilityCloudwatchDashboard: 'edulure-staging-api-observability',
    contactsPrimary: 'release@edulure.com',
    contactsOnCall: 'release-oncall@edulure.com',
    contactsAdditional: [],
    changeWindows: ['Tuesday & Thursday 16:00-20:00 UTC'],
    notes: [
      'Release rehearsals reference this environment for CAB approvals.',
      'Smoke tests must validate blueprint endpoint prior to change freeze.'
    ],
    metadata: {
      manifestVersion: 1,
      manifestEnvironmentPath: 'infrastructure/terraform/envs/staging',
      descriptorFile: 'infrastructure/environments/staging.json',
      descriptorHash: '05382a3467d20fb8d57c598d61bc6e805dfed17a5badc62864e5c478ead4f302',
      manifestEnvironmentHash: 'f789d17ebd2277197b928e96115c9a308c3f6a4b960565b6eb373c60a3751594'
    }
  },
  {
    environmentName: 'prod',
    domain: 'edulure.com',
    awsAccountAlias: 'edulure-prod',
    awsRegion: 'us-east-1',
    awsVpcId: 'vpc-prod-edulure',
    awsPrivateSubnetTags: ['tier:production', 'app:edulure-api'],
    awsPublicSubnetTags: ['tier:edge', 'app:edulure-alb'],
    blueprintParameter: '/edulure/prod/api/environment-blueprint',
    blueprintRuntimeEndpoint: 'https://edulure.com/ops/runtime-blueprint.json',
    blueprintServiceName: 'backend-service',
    terraformWorkspace: 'infrastructure/terraform/envs/prod',
    dockerComposeFile: 'docker-compose.yml',
    dockerComposeCommand: 'docker compose --profile prod up --build',
    dockerComposeProfiles: ['prod'],
    observabilityDashboardPath: 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
    observabilityCloudwatchDashboard: 'edulure-prod-api-observability',
    contactsPrimary: 'operations@edulure.com',
    contactsOnCall: 'sre-oncall@edulure.com',
    contactsAdditional: [],
    changeWindows: [
      'Saturday 01:00-04:00 UTC (primary)',
      'Wednesday 23:00-01:00 UTC (contingency)'
    ],
    notes: [
      'Production deploys require CAB approval and blueprint validation evidence.',
      'Rollback plan references environment manifest module hashes for audit.'
    ],
    metadata: {
      manifestVersion: 1,
      manifestEnvironmentPath: 'infrastructure/terraform/envs/prod',
      descriptorFile: 'infrastructure/environments/prod.json',
      descriptorHash: '7037fce56b6ddfc72da6a5403378122c99711fcc15e681752b3097141f82e851',
      manifestEnvironmentHash: '0fafb6a506216823f68602eb71a8a4021e5dd88cc24587a635c7265251a575be'
    }
  }
];

vi.mock('../src/config/env.js', () => ({
  env: {
    nodeEnv: 'test',
    logging: {
      serviceName: 'edulure-api'
    },
    environment: {
      name: 'test',
      provider: 'aws',
      region: 'us-east-1',
      tier: 'nonprod',
      deploymentStrategy: 'rolling',
      parityBudgetMinutes: 15,
      infrastructureOwner: 'platform-team',
      requiredTags: ['environment', 'project'],
      dependencies: ['database', 'redis'],
      allowedVpcIds: [],
      allowedAccountIds: [],
      manifestPath,
      releaseChannel: 'rolling',
      gitSha: 'test-sha'
    },
    redis: {
      enabled: false
    },
    observability: {
      slo: {
        definitions: [],
        defaults: {
          targetAvailability: 0.999,
          windowMinutes: 60,
          bucketMinutes: 5,
          warningBurnRate: 2,
          criticalBurnRate: 4,
          minRequests: 1,
          treat4xxAsFailures: false
        }
      },
      metrics: {
        enabled: false,
        allowedIps: []
      }
    },
    runtimeConfig: {
      featureFlagCacheTtlMs: 30_000,
      featureFlagRefreshIntervalMs: 60_000,
      configCacheTtlMs: 30_000,
      configRefreshIntervalMs: 60_000
    },
    featureFlags: {
      syncOnBootstrap: false,
      bootstrapActor: 'test-suite',
      defaultEnvironment: 'production'
    },
    mail: {
      smtpHost: 'localhost',
      smtpPort: 2525,
      smtpSecure: false,
      smtpUser: 'user',
      smtpPassword: 'pass',
      fromEmail: 'ops@example.com',
      fromName: 'Ops Team',
      verificationUrl: 'https://example.com/verify'
    },
    security: {
      dataEncryption: {
        activeKeyId: 'v1',
        keys: {
          v1: 'test-data-key'
        },
        defaultClassification: 'general'
      },
      twoFactor: {
        encryptionKey: Buffer.from('0123456789abcdef0123456789abcdef'),
        issuer: 'test-suite',
        requiredRoles: [],
        digits: 6,
        stepSeconds: 30,
        window: 1
      },
      auditLog: {
        tenantId: 'test',
        defaultSeverity: 'info',
        allowedEventTypes: [],
        enableIpCapture: false,
        ipClassificationTag: 'internal',
        maxMetadataBytes: 1024,
        metadataRedactionKeys: [],
        includeRequestContext: false
      },
      jwtRefreshSecret: 'test-refresh',
      accessTokenTtlMinutes: 15,
      refreshTokenTtlDays: 7,
      rateLimitWindowMinutes: 1,
      rateLimitMax: 100,
      jwtKeyset: [
        {
          kid: 'test-key',
          secret: 'super-secret-key-value-super-secret-key-value',
          algorithm: 'HS256',
          status: 'active'
        }
      ],
      jwtActiveKeyId: 'test-key',
      jwtActiveKey: {
        kid: 'test-key',
        secret: 'super-secret-key-value-super-secret-key-value',
        algorithm: 'HS256',
        status: 'active'
      },
      jwtAudience: 'api.test.local',
      jwtIssuer: 'test-suite'
    }
  }
}));

vi.mock('../src/config/database.js', () => ({
  default: {
    raw: vi.fn()
  },
  healthcheck: vi.fn().mockResolvedValue()
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => ({
      error: vi.fn(),
      warn: vi.fn()
    })
  }
}));

vi.mock('../src/config/redisClient.js', () => ({
  getRedisClient: () => ({
    async ping() {
      return 'PONG';
    }
  })
}));

vi.mock('../src/models/EnvironmentBlueprintModel.js', () => ({
  default: {
    listAll: vi.fn().mockResolvedValue(blueprintRegistryMock)
  }
}));

vi.mock('../src/models/EnvironmentDescriptorModel.js', () => ({
  default: {
    listAll: vi.fn().mockResolvedValue(descriptorRegistryMock)
  }
}));

let EnvironmentParityService;
let defaultService;
let EnvironmentDescriptorModelMock;

beforeAll(async () => {
  const module = await import('../src/services/EnvironmentParityService.js');
  EnvironmentParityService = module.EnvironmentParityService;
  defaultService = module.default;
  EnvironmentDescriptorModelMock = (await import('../src/models/EnvironmentDescriptorModel.js')).default;
});

describe('EnvironmentParityService', () => {
  it('produces a healthy report when manifest matches runtime state', async () => {
    const report = await defaultService.generateReport();
    expect(report.status).toBe('healthy');
    expect(report.mismatches).toHaveLength(0);
    expect(report.manifest.descriptors).toEqual(
      expect.objectContaining({
        dev: expect.objectContaining({ domain: 'dev.edulure.com' }),
        staging: expect.objectContaining({ domain: 'staging.edulure.com' }),
        prod: expect.objectContaining({ domain: 'edulure.com' })
      })
    );
    expect(report.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ component: 'database', status: 'healthy' }),
        expect.objectContaining({ component: 'redis', status: 'skipped' })
      ])
    );
  });

  it('flags drifted artefacts when manifest hashes diverge', async () => {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    manifest.modules.backendService.hash = manifest.modules.backendService.hash.replace(/^./, '0');

    const customService = new EnvironmentParityService({
      manifestResolver: async () => manifest
    });

    const report = await customService.generateReport();
    expect(report.status).toBe('drifted');
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ component: 'modules.backendService', status: 'drifted' })
      ])
    );
  });

  it('detects descriptor registry mismatches', async () => {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const mutatedDescriptors = descriptorRegistryMock.map((record) =>
      record.environmentName === 'staging'
        ? { ...record, contactsPrimary: 'someone-else@edulure.com' }
        : record
    );

    EnvironmentDescriptorModelMock.listAll.mockResolvedValueOnce(mutatedDescriptors);

    const service = new EnvironmentParityService({
      manifestResolver: async () => manifest
    });

    const report = await service.generateReport({ forceRefresh: true });
    expect(report.status).toBe('drifted');
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          component: 'descriptors.staging',
          status: 'mismatch'
        })
      ])
    );
  });
});
