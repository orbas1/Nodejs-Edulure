import { describe, expect, it, beforeAll, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

const manifestPath = path.resolve('..', 'infrastructure/environment-manifest.json');

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

let EnvironmentParityService;
let defaultService;

beforeAll(async () => {
  const module = await import('../src/services/EnvironmentParityService.js');
  EnvironmentParityService = module.EnvironmentParityService;
  defaultService = module.default;
});

describe('EnvironmentParityService', () => {
  it('produces a healthy report when manifest matches runtime state', async () => {
    const report = await defaultService.generateReport();
    expect(report.status).toBe('healthy');
    expect(report.mismatches).toHaveLength(0);
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
});
